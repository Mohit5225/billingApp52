from collections import defaultdict
from datetime import date
from decimal import Decimal
from io import BytesIO
import re
from typing import Any, Optional
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, Request

from postgrest.exceptions import APIError

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.ledger import (
    AccountGroup,
    Ledger,
    LedgerCreate,
    LedgerDetail,
    LedgerStatement,
    LedgerStatementRow,
    LedgerUpdate,
)
from core.limiter import limiter
from core.rate_limits import LIMIT_EXPORTS

router = APIRouter()


GROUP_TEMPLATE_MAP: dict[str, str] = {
    "Bank Accounts": "bank",
    "Bank OD A/c": "bank",
    "Sundry Debtors": "party",
    "Sundry Creditors": "party",
    "Duties & Taxes": "tax",
    "Loans & Advances (Asset)": "party",
    "Loans (Liability)": "party",
    "Secured Loans": "party",
    "Unsecured Loans": "party",
}


def _get_groups_by_id() -> dict[str, dict[str, Any]]:
    groups = (
        supabase.table("account_groups")
        .select("id, firm_id, name, parent_id, nature, affects_gross_profit, is_control_account, is_system, sort_order, alias, is_primary, created_at, updated_at")
        .execute()
    ).data or []
    return {str(group["id"]): group for group in groups}


def _resolve_template_type(group: Optional[dict[str, Any]], groups_by_id: dict[str, dict[str, Any]]) -> str:
    if not group:
        return "default"

    direct_template = GROUP_TEMPLATE_MAP.get(group["name"])
    if direct_template:
        return direct_template

    parent_id = group.get("parent_id")
    parent_group = groups_by_id.get(str(parent_id)) if parent_id else None
    if parent_group:
        return GROUP_TEMPLATE_MAP.get(parent_group["name"], "default")

    return "default"


def _build_ledger_detail_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []

    groups_by_id = _get_groups_by_id()
    ledger_ids = [str(row["id"]) for row in rows]

    bank_rows = (
        supabase.table("ledger_bank_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []
    party_rows = (
        supabase.table("ledger_party_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []
    tax_rows = (
        supabase.table("ledger_tax_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []

    bank_by_ledger = {str(row["ledger_id"]): row for row in bank_rows}
    party_by_ledger = {str(row["ledger_id"]): row for row in party_rows}
    tax_by_ledger = {str(row["ledger_id"]): row for row in tax_rows}

    details: list[dict[str, Any]] = []
    for row in rows:
        group = groups_by_id.get(str(row["group_id"]))
        parent_group = groups_by_id.get(str(group.get("parent_id"))) if group and group.get("parent_id") else None
        ledger_id = str(row["id"])
        details.append({
            **row,
            "group_name": group["name"] if group else None,
            "group_parent_name": parent_group["name"] if parent_group else None,
            "group_nature": group["nature"] if group else None,
            "template_type": _resolve_template_type(group, groups_by_id),
            "bank_details": bank_by_ledger.get(ledger_id),
            "party_details": party_by_ledger.get(ledger_id),
            "tax_details": tax_by_ledger.get(ledger_id),
        })

    return details


def _get_ledger_or_404(ledger_id: str) -> dict[str, Any]:
    response = (
        supabase.table("ledgers")
        .select("*")
        .eq("id", ledger_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ledger not found")
    return response.data


def _validate_group_access(group_id: str, target_firm_id: str) -> None:
    group = (
        supabase.table("account_groups")
        .select("id, firm_id")
        .eq("id", group_id)
        .single()
        .execute()
    ).data
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected account group was not found")

    group_firm_id = group.get("firm_id")
    if group_firm_id is not None and str(group_firm_id) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Selected account group is not available for this firm",
        )


def _replace_detail_row(table_name: str, ledger_id: str, detail_model: Any) -> None:
    supabase.table(table_name).delete().eq("ledger_id", ledger_id).execute()

    if detail_model is None:
        return

    payload = detail_model.model_dump(mode="json", exclude_none=True)
    if not payload:
        return

    payload["ledger_id"] = ledger_id
    supabase.table(table_name).insert(payload).execute()


def _statement_side(amount: Decimal) -> str:
    return "Dr" if amount >= 0 else "Cr"


def _statement_amount(amount: Decimal) -> float:
    return float(abs(amount))


def _parse_statement_date(value: Any) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _safe_filename_component(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return cleaned.strip("._-") or "ledger"


def _column_name(index: int) -> str:
    name = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _xml_cell(reference: str, value: Any) -> str:
    if value is None:
        value = ""

    if isinstance(value, bool):
        value = int(value)

    if isinstance(value, (int, float, Decimal)):
        return f'<c r="{reference}"><v>{value}</v></c>'

    if isinstance(value, date):
        value = value.isoformat()

    text = escape(str(value)).replace("\n", "&#10;")
    return f'<c r="{reference}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def _build_xlsx(sheet_name: str, rows: list[list[Any]]) -> bytes:
    sheet_name = _safe_filename_component(sheet_name or "Sheet1")[:31] or "Sheet1"

    sheet_rows: list[str] = []
    for row_index, row in enumerate(rows, start=1):
        cells = "".join(
            _xml_cell(f"{_column_name(column_index)}{row_index}", value)
            for column_index, value in enumerate(row, start=1)
        )
        sheet_rows.append(f'<row r="{row_index}">{cells}</row>')

    sheet_dimension = f"A1:{_column_name(max(len(row) for row in rows) if rows else 1)}{len(rows) or 1}"
    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="{sheet_dimension}"/>'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        '</worksheet>'
    )

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets>'
        f'<sheet name="{escape(sheet_name)}" sheetId="1" r:id="rId1"/>'
        '</sheets>'
        '</workbook>'
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '</Types>'
    )

    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>'
    )

    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '</Relationships>'
    )

    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return buffer.getvalue()


def _build_statement_rows(statement: dict[str, Any]) -> list[list[Any]]:
    ledger = statement["ledger"]
    rows: list[list[Any]] = [
        ["Ledger Statement Export"],
        [ledger["name"]],
        [
            "Group",
            ledger.get("group_name") or "Ungrouped",
            "Template",
            ledger.get("template_type") or "default",
        ],
        [
            "Opening Balance",
            f'{statement["opening_balance_type"]} {statement["opening_balance"]}',
            "Closing Balance",
            f'{statement["closing_balance_type"]} {statement["closing_balance"]}',
        ],
        [
            "Totals",
            f'Dr {statement["total_debit"]}',
            f'Cr {statement["total_credit"]}',
        ],
        [],
        ["Date", "Voucher No", "Category", "Particulars", "Narration", "Dr", "Cr", "Balance", "Balance Type"],
        [
            "Opening",
            "-",
            "-",
            "Opening balance",
            "",
            "",
            "",
            f'{statement["opening_balance_type"]} {statement["opening_balance"]}',
            statement["opening_balance_type"],
        ],
    ]

    for row in statement["rows"]:
        rows.append([
            row["voucher_date"],
            row["voucher_number"],
            row["category"],
            row["particulars"],
            row.get("narration") or "",
            row["debit_amount"] or "",
            row["credit_amount"] or "",
            f'{row["balance_type"]} {row["balance_amount"]}',
            row["balance_type"],
        ])

    return rows


def _get_ledger_statement(ledger_id: str, from_date: Optional[date], to_date: Optional[date], jwt: str) -> dict[str, Any]:
    profile = get_profile_context(jwt)
    ledger = _get_ledger_or_404(ledger_id)
    target_firm_id = resolve_target_firm_id(profile, str(ledger["firm_id"]))
    ledger_id_str = str(ledger_id)

    ledger_detail = _build_ledger_detail_rows([ledger])[0]

    vouchers_query = (
        supabase.table("vouchers")
        .select("id, category, voucher_number, voucher_date, narration, created_at")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
    )
    if to_date:
        vouchers_query = vouchers_query.lte("voucher_date", str(to_date))

    vouchers = vouchers_query.order("voucher_date").execute().data or []

    voucher_ids = [str(voucher["id"]) for voucher in vouchers]
    if not voucher_ids:
        opening_balance = float(ledger.get("opening_balance") or 0)
        return {
            "ledger": ledger_detail,
            "opening_balance": opening_balance,
            "opening_balance_type": ledger["opening_balance_type"],
            "rows": [],
            "total_debit": 0.0,
            "total_credit": 0.0,
            "closing_balance": opening_balance,
            "closing_balance_type": ledger["opening_balance_type"],
        }

    accounting_lines = (
        supabase.table("voucher_accounting_lines")
        .select("voucher_id, ledger_id, line_number, debit_amount, credit_amount")
        .eq("firm_id", target_firm_id)
        .in_("voucher_id", voucher_ids)
        .execute()
    ).data or []

    lines_by_voucher: dict[str, list[dict[str, Any]]] = defaultdict(list)
    counterparty_ledger_ids: set[str] = set()
    for line in accounting_lines:
        lines_by_voucher[str(line["voucher_id"])].append(line)
        line_ledger_id = str(line["ledger_id"])
        if line_ledger_id != ledger_id_str:
            counterparty_ledger_ids.add(line_ledger_id)

    ledger_name_by_id: dict[str, str] = {}
    if counterparty_ledger_ids:
        ledger_name_rows = (
            supabase.table("ledgers")
            .select("id, name")
            .in_("id", list(counterparty_ledger_ids))
            .execute()
        ).data or []
        ledger_name_by_id = {str(row["id"]): row["name"] for row in ledger_name_rows}

    ledger_opening = Decimal(str(ledger.get("opening_balance") or 0))
    running_balance = ledger_opening if ledger["opening_balance_type"] == "Dr" else -ledger_opening
    report_opening_balance = running_balance
    total_debit = Decimal("0")
    total_credit = Decimal("0")
    rows: list[dict[str, Any]] = []
    has_visible_rows = False

    vouchers.sort(key=lambda voucher: (
        _parse_statement_date(voucher.get("voucher_date") or "1970-01-01"),
        str(voucher.get("created_at") or ""),
        str(voucher.get("voucher_number") or ""),
    ))

    for voucher in vouchers:
        voucher_date = _parse_statement_date(voucher.get("voucher_date") or "1970-01-01")
        if from_date and voucher_date < from_date:
            voucher_id = str(voucher["id"])
            prior_lines = lines_by_voucher.get(voucher_id, [])
            debit_amount = sum(
                Decimal(str(line.get("debit_amount") or 0))
                for line in prior_lines
                if str(line.get("ledger_id")) == ledger_id_str
            )
            credit_amount = sum(
                Decimal(str(line.get("credit_amount") or 0))
                for line in prior_lines
                if str(line.get("ledger_id")) == ledger_id_str
            )
            running_balance += debit_amount - credit_amount
            report_opening_balance = running_balance
            continue

        if to_date and voucher_date > to_date:
            break

        voucher_id = str(voucher["id"])
        matching_lines = lines_by_voucher.get(voucher_id, [])
        if not matching_lines:
            continue

        debit_amount = sum(
            Decimal(str(line.get("debit_amount") or 0))
            for line in matching_lines
            if str(line.get("ledger_id")) == ledger_id_str
        )
        credit_amount = sum(
            Decimal(str(line.get("credit_amount") or 0))
            for line in matching_lines
            if str(line.get("ledger_id")) == ledger_id_str
        )
        if debit_amount == 0 and credit_amount == 0:
            continue

        if not has_visible_rows:
            report_opening_balance = running_balance
            has_visible_rows = True

        total_debit += debit_amount
        total_credit += credit_amount
        running_balance += debit_amount - credit_amount

        counterparty_names: list[str] = []
        for line in matching_lines:
            line_ledger_id = str(line.get("ledger_id"))
            if line_ledger_id == ledger_id_str:
                continue
            counterparty_name = ledger_name_by_id.get(line_ledger_id)
            if counterparty_name and counterparty_name not in counterparty_names:
                counterparty_names.append(counterparty_name)

        particulars = ", ".join(counterparty_names) if counterparty_names else str(voucher.get("narration") or "Voucher entry")

        category_label = voucher["category"]
        if category_label == "Contra":
            if debit_amount > credit_amount:
                category_label = "Contra (Receipt)"
            elif credit_amount > debit_amount:
                category_label = "Contra (Payment)"

        rows.append({
            "voucher_id": voucher["id"],
            "voucher_number": voucher["voucher_number"],
            "voucher_date": voucher["voucher_date"],
            "category": category_label,
            "particulars": particulars,
            "narration": voucher.get("narration"),
            "debit_amount": float(debit_amount),
            "credit_amount": float(credit_amount),
            "balance_amount": _statement_amount(running_balance),
            "balance_type": _statement_side(running_balance),
        })

    closing_type = _statement_side(running_balance)
    closing_amount = _statement_amount(running_balance)
    opening_type = _statement_side(report_opening_balance)

    return {
        "ledger": ledger_detail,
        "opening_balance": _statement_amount(report_opening_balance),
        "opening_balance_type": opening_type,
        "rows": rows,
        "total_debit": float(total_debit),
        "total_credit": float(total_credit),
        "closing_balance": closing_amount,
        "closing_balance_type": closing_type,
    }


@router.get("/account-groups", response_model=list[AccountGroup])
async def list_account_groups(
    firm_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    response = (
        supabase.table("account_groups")
        .select("id, firm_id, name, alias, nature, is_primary, parent_id, affects_gross_profit, is_control_account, is_system, sort_order, created_at, updated_at")
        .execute()
    )

    all_groups = response.data or []
    group_name_by_id = {
        str(group["id"]): group["name"]
        for group in all_groups
        if group.get("id") is not None and group.get("name") is not None
    }

    groups = [
        group
        for group in all_groups
        if group.get("firm_id") is None or str(group.get("firm_id")) == target_firm_id
    ]

    for group in groups:
        parent_id = group.get("parent_id")
        group["parent_name"] = group_name_by_id.get(str(parent_id)) if parent_id is not None else None

    groups.sort(key=lambda group: (
        group.get("nature") or "",
        group.get("sort_order") or 999,
        (group.get("name") or "").lower(),
    ))
    return groups


@router.get("/", response_model=list[LedgerDetail])
async def list_ledgers(
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    group_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    query = supabase.table("ledgers").select("*").eq("firm_id", target_firm_id)
    if group_id:
        query = query.eq("group_id", group_id)
    if search:
        query = query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")

    response = query.order("name").execute()
    return _build_ledger_detail_rows(response.data or [])


@router.get("/{ledger_id}", response_model=LedgerDetail)
async def get_ledger(
    ledger_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    ledger = _get_ledger_or_404(ledger_id)
    resolve_target_firm_id(profile, str(ledger["firm_id"]))
    return _build_ledger_detail_rows([ledger])[0]


@router.get("/{ledger_id}/statement", response_model=LedgerStatement)
async def get_ledger_statement(
    ledger_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    return _get_ledger_statement(ledger_id, from_date, to_date, jwt)


@router.get("/{ledger_id}/statement/export")
@limiter.limit(LIMIT_EXPORTS)
async def export_ledger_statement(
    request: Request,
    ledger_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    jwt: str = Depends(get_verified_jwt),
) -> Response:
    statement = _get_ledger_statement(ledger_id, from_date, to_date, jwt)
    ledger_name = statement["ledger"]["name"]
    file_label = _safe_filename_component(ledger_name)
    xlsx_bytes = _build_xlsx(f"{ledger_name} Statement", _build_statement_rows(statement))

    filename_bits = [file_label, "statement"]
    if from_date:
        filename_bits.append(from_date.isoformat())
    if to_date:
        filename_bits.append(to_date.isoformat())

    headers = {
        "Content-Disposition": f'attachment; filename="{"_".join(filename_bits)}.xlsx"',
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.post("/", response_model=LedgerDetail, status_code=status.HTTP_201_CREATED)
async def create_ledger(ledger_in: LedgerCreate, jwt: str = Depends(get_verified_jwt)) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, str(ledger_in.firm_id))

    _validate_group_access(str(ledger_in.group_id), target_firm_id)

    # Pre-insertion uniqueness checks
    clean_name = ledger_in.name.strip()
    name_check = supabase.table("ledgers").select("id").eq("firm_id", target_firm_id).ilike("name", clean_name).execute()
    if name_check.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A ledger with the name '{clean_name}' already exists.")

    if ledger_in.party_details:
        gstin = (ledger_in.party_details.gstin or "").strip()
        pan = (ledger_in.party_details.pan_number or "").strip()
        gst_type = ledger_in.party_details.gst_registration_type
        
        if gstin:
            if gst_type not in ("Regular", "Composition"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A GSTIN is provided, so the Registration Type must be Regular or Composition.")
            gstin_check = supabase.table("ledger_party_details").select("ledger_id, ledgers!inner(firm_id)").ilike("gstin", gstin).eq("ledgers.firm_id", target_firm_id).execute()
            if gstin_check.data:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this GSTIN already exists.")
                
        if pan:
            pan_check = supabase.table("ledger_party_details").select("ledger_id, ledgers!inner(firm_id)").ilike("pan_number", pan).eq("ledgers.firm_id", target_firm_id).execute()
            if pan_check.data:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this PAN number already exists.")
        
        if not gstin and gst_type in ("Regular", "Composition"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A GSTIN is required for Regular or Composition registration types.")

    payload = ledger_in.model_dump(
        mode="json",
        exclude_none=True,
        exclude={"bank_details", "party_details", "tax_details"},
    )
    payload["firm_id"] = target_firm_id

    try:
        response = supabase.table("ledgers").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create ledger")

        ledger_id = response.data[0]["id"]
        _replace_detail_row("ledger_bank_details", ledger_id, ledger_in.bank_details)
        _replace_detail_row("ledger_party_details", ledger_id, ledger_in.party_details)
        _replace_detail_row("ledger_tax_details", ledger_id, ledger_in.tax_details)
    except APIError as e:
        error_message = e.message or str(e)
        if "A party with this GSTIN already exists" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this GSTIN already exists.")
        if "A party with this PAN number already exists" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this PAN number already exists.")
        if "uq_ledger_name_trim_lower_firm" in error_message or "uq_ledger_name_per_firm" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A ledger with the name '{clean_name}' already exists.")
        raise

    return _build_ledger_detail_rows([_get_ledger_or_404(ledger_id)])[0]


@router.patch("/{ledger_id}", response_model=LedgerDetail)
async def update_ledger(
    ledger_id: str,
    ledger_in: LedgerUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    existing = _get_ledger_or_404(ledger_id)
    target_firm_id = resolve_target_firm_id(profile, str(existing["firm_id"]))

    if ledger_in.group_id:
        _validate_group_access(str(ledger_in.group_id), target_firm_id)

    # Pre-update uniqueness checks
    clean_name = ledger_in.name.strip() if ledger_in.name else existing["name"]
    if ledger_in.name:
        name_check = supabase.table("ledgers").select("id").eq("firm_id", target_firm_id).ilike("name", clean_name).neq("id", ledger_id).execute()
        if name_check.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A ledger with the name '{clean_name}' already exists.")

    if ledger_in.party_details:
        gstin = (ledger_in.party_details.gstin or "").strip()
        pan = (ledger_in.party_details.pan_number or "").strip()
        gst_type = ledger_in.party_details.gst_registration_type
        
        if gstin:
            if gst_type not in ("Regular", "Composition"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A GSTIN is provided, so the Registration Type must be Regular or Composition.")
            gstin_check = supabase.table("ledger_party_details").select("ledger_id, ledgers!inner(firm_id)").ilike("gstin", gstin).eq("ledgers.firm_id", target_firm_id).neq("ledger_id", ledger_id).execute()
            if gstin_check.data:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this GSTIN already exists.")
                
        if pan:
            pan_check = supabase.table("ledger_party_details").select("ledger_id, ledgers!inner(firm_id)").ilike("pan_number", pan).eq("ledgers.firm_id", target_firm_id).neq("ledger_id", ledger_id).execute()
            if pan_check.data:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this PAN number already exists.")

        if not gstin and gst_type in ("Regular", "Composition"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A GSTIN is required for Regular or Composition registration types.")

    payload = ledger_in.model_dump(
        mode="json",
        exclude_none=True,
        exclude={"bank_details", "party_details", "tax_details"},
    )
    
    try:
        if payload:
            response = supabase.table("ledgers").update(payload).eq("id", ledger_id).execute()
            if not response.data:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update ledger")

        if "bank_details" in ledger_in.model_fields_set:
            _replace_detail_row("ledger_bank_details", ledger_id, ledger_in.bank_details)
        if "party_details" in ledger_in.model_fields_set:
            _replace_detail_row("ledger_party_details", ledger_id, ledger_in.party_details)
        if "tax_details" in ledger_in.model_fields_set:
            _replace_detail_row("ledger_tax_details", ledger_id, ledger_in.tax_details)
    except APIError as e:
        error_message = e.message or str(e)
        if "A party with this GSTIN already exists" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this GSTIN already exists.")
        if "A party with this PAN number already exists" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A party with this PAN number already exists.")
        if "uq_ledger_name_trim_lower_firm" in error_message or "uq_ledger_name_per_firm" in error_message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A ledger with the name '{clean_name}' already exists.")
        raise

    return _build_ledger_detail_rows([_get_ledger_or_404(ledger_id)])[0]


@router.delete("/{ledger_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ledger(
    ledger_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    profile = get_profile_context(jwt)
    existing = _get_ledger_or_404(ledger_id)
    resolve_target_firm_id(profile, str(existing["firm_id"]))

    supabase.table("ledgers").delete().eq("id", ledger_id).execute()
