import type { TemplateProps } from "./types";
import type { ChunkOptions, ColumnDef, PageChunk, PreparedInvoice } from "./engineTypes";
import {
  prepareInvoice,
  formatCell,
  getCellValue,
  DEFAULT_CHUNK_OPTIONS,
} from "./InvoiceEngine";

/**
 * Classic Invoice Template
 *
 * A pure visual skin. All intelligence (column detection, page chunking,
 * width calculation) is provided by the shared InvoiceEngine.
 *
 * This template defines:
 *  - Its own ChunkOptions (pixel budgets for its specific font/padding sizes)
 *  - Full letterhead header for page 1
 *  - Compact strip header for pages 2+
 *  - Footer sections (tax breakdown, bank, signature, terms) on last page only
 *  - Print-safe page-break CSS
 */

/* ─── Template-specific chunk options ──────────── */
const CLASSIC_CHUNK_OPTIONS: ChunkOptions = {
  ...DEFAULT_CHUNK_OPTIONS,
  // Safely reduced to account for Chrome's default print margins (~0.4 inches)
  page1Budget: 620,
  pageNBudget: 860,
  lastPageReserve: 505,
  rowHeight: (item) => {
    const nameLen = (item.name || "").length;
    if (nameLen > 150) return 85;
    if (nameLen > 90) return 68;
    if (nameLen > 45) return 48;
    return 33;
  },
};

/* ─── Style constants ─────────────────────────────── */
const BORDER = "1px solid #333";
const CELL_PAD = "6px 8px";
const FONT_SIZE = "12.5px";
const HEADER_BG = "#f0f4f8";
const FONT_FAMILY = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/* ─── Main Component ──────────────────────────────── */

export default function ClassicTemplate({ data }: TemplateProps) {
  const prepared = prepareInvoice(data, CLASSIC_CHUNK_OPTIONS);

  return (
    <>
      {prepared.pages.map((page, idx) => (
        <div key={idx}>
          <div
            className="page-wrapper"
            style={{
              width: "100%",
              minHeight: prepared.pages.length > 1 ? "1123px" : "auto",
              boxSizing: "border-box",
              padding: "6mm 10mm 4mm 10mm",
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZE,
              color: "#1a1a1a",
              background: "#fff",
              lineHeight: 1.45,
              position: "relative",
            }}
          >
            {/* ═══ HEADER ═══ */}
            {page.isFirstPage ? (
              <FullHeader data={prepared.original} />
            ) : (
              <CompactHeader data={prepared.original} pageLabel={page.pageLabel} />
            )}

            {/* ═══ CUSTOMER + META (page 1 only) ═══ */}
            {page.isFirstPage && <CustomerMetaBlock data={prepared.original} />}

            {/* ═══ LINE ITEMS TABLE ═══ */}
            <ItemsTable
              columns={prepared.columns}
              page={page}
              data={prepared.original}
              isLastPage={page.isLastPage}
            />

            {/* ═══ FOOTER SECTIONS (last page only) ═══ */}
            {page.isLastPage && <FooterSections data={prepared.original} />}
          </div>

          {/* Visual gap between pages on screen, hidden in print */}
          {!page.isLastPage && (
            <div className="page-gap" style={{ height: "32px" }} />
          )}
        </div>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS — visual layout only
   ═══════════════════════════════════════════════════ */

/* ─── Full Header (Page 1) ─────────────────────── */
function FullHeader({ data }: { data: PreparedInvoice["original"] }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "0.5px",
              color: "#111",
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {data.company.name.toUpperCase()}
          </h1>
          {data.company.tagline && (
            <div
              style={{
                display: "inline-block",
                marginTop: "4px",
                padding: "3px 10px",
                background: "#173728",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.3px",
              }}
            >
              {data.company.tagline}
            </div>
          )}
        </div>
        {data.company.logoUrl ? (
          <img
            src={data.company.logoUrl}
            alt="Company Logo"
            style={{ maxHeight: "55px", maxWidth: "120px", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: "90px",
              height: "50px",
              border: "1px dashed #bbb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              color: "#999",
              borderRadius: "4px",
            }}
          >
            LOGO
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          fontSize: "10px",
          color: "#444",
        }}
      >
        <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{data.company.address}</div>
        <div style={{ textAlign: "right", lineHeight: 1.5 }}>
          {data.company.phone && <div>Tel : {data.company.phone}</div>}
          {data.company.website && <div>Web : {data.company.website}</div>}
          {data.company.email && <div>Email : {data.company.email}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Compact Header (Pages 2+) ────────────────── */
function CompactHeader({
  data,
  pageLabel,
}: {
  data: PreparedInvoice["original"];
  pageLabel: string;
}) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: BORDER,
        marginBottom: "0",
        tableLayout: "fixed",
      }}
    >
      <tbody>
        <tr style={{ background: HEADER_BG }}>
          <td
            style={{
              border: BORDER,
              padding: CELL_PAD,
              fontWeight: 800,
              fontSize: "13px",
              width: "40%",
            }}
          >
            {data.company.name.toUpperCase()}
          </td>
          <td
            style={{
              border: BORDER,
              padding: CELL_PAD,
              textAlign: "center",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            {data.type} — #{data.invoiceNumber}
          </td>
          <td
            style={{
              border: BORDER,
              padding: CELL_PAD,
              textAlign: "right",
              fontSize: "10px",
              fontWeight: 600,
              color: "#555",
            }}
          >
            {pageLabel}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ─── Customer + Invoice Meta Block ────────────── */
function CustomerMetaBlock({ data }: { data: PreparedInvoice["original"] }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: BORDER,
        marginTop: "8px",
        tableLayout: "fixed",
      }}
    >
      <tbody>
        {/* PAN + TYPE + COPY LABEL */}
        <tr>
          <td style={{ border: BORDER, padding: CELL_PAD, width: "33%", fontWeight: 700 }}>
            <span style={{ fontWeight: 700 }}>PAN : </span>
            {data.company.pan}
          </td>
          <td
            style={{
              border: BORDER,
              padding: CELL_PAD,
              width: "34%",
              textAlign: "center",
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "0.5px",
            }}
          >
            {data.type}
          </td>
          <td
            style={{
              border: BORDER,
              padding: CELL_PAD,
              width: "33%",
              textAlign: "right",
              fontSize: "9px",
              fontWeight: 700,
              color: "#555",
              letterSpacing: "0.3px",
            }}
          >
            {data.copyLabel}
          </td>
        </tr>

        {/* CUSTOMER + INVOICE META */}
        <tr>
          <td style={{ border: BORDER, padding: CELL_PAD, verticalAlign: "top" }}>
            <div
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "#666",
                marginBottom: "4px",
                letterSpacing: "0.3px",
              }}
            >
              Customer Detail
            </div>
            <table style={{ width: "100%", fontSize: "10px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "2px 0", fontWeight: 700, width: "85px", verticalAlign: "top" }}>M/S</td>
                  <td style={{ padding: "2px 0" }}>{data.party.name}</td>
                </tr>
                {data.party.address && (
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: 700, verticalAlign: "top" }}>Address</td>
                    <td style={{ padding: "2px 0" }}>{data.party.address}</td>
                  </tr>
                )}
                {data.party.phone && (
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: 700 }}>Phone</td>
                    <td style={{ padding: "2px 0" }}>{data.party.phone}</td>
                  </tr>
                )}
                {data.party.gstin && (
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: 700 }}>GSTIN</td>
                    <td style={{ padding: "2px 0" }}>{data.party.gstin}</td>
                  </tr>
                )}
                {data.party.placeOfSupply && (
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: 700, whiteSpace: "nowrap" }}>Place of Supply</td>
                    <td style={{ padding: "2px 0" }}>{data.party.placeOfSupply}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>

          <td colSpan={2} style={{ border: BORDER, padding: CELL_PAD, verticalAlign: "top" }}>
            <table style={{ width: "100%", fontSize: "10px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "2px 4px", fontWeight: 700, width: "35%" }}>Invoice No.</td>
                  <td style={{ padding: "2px 4px", width: "30%" }}>{data.invoiceNumber}</td>
                  <td style={{ padding: "2px 4px", fontWeight: 700, width: "15%" }}>Invoice Date</td>
                  <td style={{ padding: "2px 4px" }}>{data.invoiceDate}</td>
                </tr>
                {data.challanNumber && (
                  <tr>
                    <td style={{ padding: "2px 4px", fontWeight: 700 }}>Challan No</td>
                    <td style={{ padding: "2px 4px" }}>{data.challanNumber}</td>
                    <td style={{ padding: "2px 4px", fontWeight: 700 }}>Challan Date</td>
                    <td style={{ padding: "2px 4px" }}>{data.challanDate}</td>
                  </tr>
                )}
                {data.eWayBillNo && (
                  <tr>
                    <td style={{ padding: "2px 4px", fontWeight: 700 }}>E-Way Bill No.</td>
                    <td colSpan={3} style={{ padding: "2px 4px" }}>{data.eWayBillNo}</td>
                  </tr>
                )}
                {data.transportName && (
                  <tr>
                    <td style={{ padding: "2px 4px", fontWeight: 700 }}>Transport</td>
                    <td colSpan={3} style={{ padding: "2px 4px" }}>{data.transportName}</td>
                  </tr>
                )}
                {data.transportId && (
                  <tr>
                    <td style={{ padding: "2px 4px", fontWeight: 700 }}>Transport ID</td>
                    <td colSpan={3} style={{ padding: "2px 4px" }}>{data.transportId}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ─── Dynamic Items Table ──────────────────────── */
function ItemsTable({
  columns,
  page,
  data,
  isLastPage,
}: {
  columns: ColumnDef[];
  page: PageChunk;
  data: PreparedInvoice["original"];
  isLastPage: boolean;
}) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: BORDER,
        borderTop: page.isFirstPage ? "none" : undefined,
        tableLayout: "fixed",
        marginTop: page.isFirstPage ? "0" : "0",
      }}
    >
      {/* Dynamic column headers */}
      <thead>
        <tr style={{ background: HEADER_BG }}>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                border: BORDER,
                padding: CELL_PAD,
                width: col.width,
                textAlign: col.align,
                fontWeight: 700,
                fontSize: "10px",
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {/* Dynamic data rows */}
        {page.items.map((item, idx) => (
          <tr key={idx}>
            {columns.map((col) => {
              const raw = getCellValue(item, col);
              const display = formatCell(raw, col.format);
              return (
                <td
                  key={col.key}
                  style={{
                    border: BORDER,
                    padding: CELL_PAD,
                    textAlign: col.align,
                    fontWeight: col.key === "name" ? 600 : undefined,
                    fontVariantNumeric:
                      col.format === "currency" || col.format === "decimal"
                        ? "tabular-nums"
                        : undefined,
                  }}
                >
                  {display}
                </td>
              );
            })}
          </tr>
        ))}

        {/* Spacer rows for short invoices (page 1 only, single-page only) */}
        {page.isFirstPage &&
          page.isLastPage &&
          page.items.length < 8 &&
          Array.from({ length: Math.max(0, 3 - page.items.length) }).map((_, i) => (
            <tr key={`spacer-${i}`}>
              {columns.map((col) => (
                <td key={col.key} style={{ border: BORDER, padding: CELL_PAD }}>
                  {col.key === "srNo" ? "\u00A0" : ""}
                </td>
              ))}
            </tr>
          ))}

        {/* ─── Subtotal + Tax rows (last page only) ─── */}
        {isLastPage && (
          <>
            {/* Subtotal */}
            <tr style={{ background: HEADER_BG }}>
              {columns.map((col, ci) => {
                let content = "";
                let colSpan = 1;

                if (ci === 0) {
                  // The first column can span until the taxableAmount or lineTotal
                  const targetIdx = columns.findIndex(c => c.key === "taxableAmount" || c.key === "lineTotal");
                  if (targetIdx > 0) {
                    colSpan = targetIdx;
                    content = "Sub Total";
                  }
                } else {
                  const targetIdx = columns.findIndex(c => c.key === "taxableAmount" || c.key === "lineTotal");
                  if (ci < targetIdx) {
                    return null; // Skip because it's spanned by the first column
                  }
                  if (col.key === "taxableAmount" || (col.key === "lineTotal" && !columns.some(c => c.key === "taxableAmount"))) {
                    content = formatCell(data.subtotal, "currency");
                  }
                }

                if (colSpan === 0) return null; // Defensive

                return (
                  <td
                    key={col.key}
                    colSpan={colSpan}
                    style={{
                      border: BORDER,
                      padding: CELL_PAD,
                      textAlign: colSpan > 1 ? "right" : col.align,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>

            {/* Tax rows */}
            {data.igstTotal != null && data.igstTotal > 0 && (
              <tr>
                <td
                  colSpan={columns.length - 1}
                  style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700 }}
                >
                  IGST
                </td>
                <td
                  style={{
                    border: BORDER,
                    padding: CELL_PAD,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCell(data.igstTotal, "currency")}
                </td>
              </tr>
            )}
            {data.cgstTotal != null && data.cgstTotal > 0 && (
              <tr>
                <td
                  colSpan={columns.length - 1}
                  style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700 }}
                >
                  CGST
                </td>
                <td
                  style={{
                    border: BORDER,
                    padding: CELL_PAD,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCell(data.cgstTotal, "currency")}
                </td>
              </tr>
            )}
            {data.sgstTotal != null && data.sgstTotal > 0 && (
              <tr>
                <td
                  colSpan={columns.length - 1}
                  style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700 }}
                >
                  SGST
                </td>
                <td
                  style={{
                    border: BORDER,
                    padding: CELL_PAD,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCell(data.sgstTotal, "currency")}
                </td>
              </tr>
            )}
            {data.cessTotal != null && data.cessTotal > 0 && (
              <tr>
                <td
                  colSpan={columns.length - 1}
                  style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700 }}
                >
                  CESS
                </td>
                <td
                  style={{
                    border: BORDER,
                    padding: CELL_PAD,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCell(data.cessTotal, "currency")}
                </td>
              </tr>
            )}

            {/* Grand Total */}
            <tr style={{ background: "#e8f0e8", fontWeight: 800 }}>
              <td
                colSpan={columns.findIndex((c) => c.key === "quantity")}
                style={{ border: BORDER, padding: CELL_PAD, textAlign: "right" }}
              >
                Total
              </td>
              <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "center" }}>
                {data.items.reduce((s, i) => s + i.quantity, 0)} {data.items[0]?.uom}
              </td>
              {(() => {
                const emptyColSpan = columns.length - columns.findIndex((c) => c.key === "quantity") - 2;
                if (emptyColSpan > 0) {
                  return <td colSpan={emptyColSpan} style={{ border: BORDER, padding: CELL_PAD }} />;
                }
                return null;
              })()}
              <td
                style={{
                  border: BORDER,
                  padding: CELL_PAD,
                  textAlign: "right",
                  fontSize: "13px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ₹ {formatCell(data.grandTotal, "currency")}
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

/* ─── Footer Sections (Last Page Only) ─────────── */
function FooterSections({ data }: { data: PreparedInvoice["original"] }) {
  return (
    <>
      {/* Total in words */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: BORDER,
          borderTop: "none",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td style={{ border: BORDER, padding: CELL_PAD }}>
              <div style={{ fontSize: "9px", color: "#666" }}>Total in words</div>
              <div style={{ fontWeight: 700, fontSize: "10px", marginTop: "2px" }}>
                {data.totalInWords}
              </div>
            </td>
            <td
              style={{
                border: BORDER,
                padding: CELL_PAD,
                textAlign: "right",
                fontSize: "9px",
                color: "#666",
                width: "15%",
              }}
            >
              (E &amp; O.E.)
            </td>
          </tr>
        </tbody>
      </table>

      {/* HSN Tax Breakdown */}
      {data.taxBreakdown.length > 0 && (
        <HsnBreakdownTable data={data} />
      )}

      {/* Tax in words */}
      {data.totalTaxInWords && (
        <div style={{ border: BORDER, borderTop: "none", padding: CELL_PAD, fontSize: "9px" }}>
          Total Tax in words: <strong>{data.totalTaxInWords}</strong>
        </div>
      )}

      {/* Bank + Signature */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: BORDER,
          borderTop: "none",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td style={{ border: BORDER, padding: CELL_PAD, width: "50%", verticalAlign: "top" }}>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "10px",
                  marginBottom: "6px",
                  borderBottom: BORDER,
                  paddingBottom: "4px",
                }}
              >
                Bank Details
              </div>
              {data.bankDetails && (
                <table style={{ width: "100%", fontSize: "10px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700, width: "90px" }}>Name</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.bankName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>Branch</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.branch}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>Acc. Number</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.accountNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>IFSC</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.ifsc}</td>
                    </tr>
                    {data.bankDetails.upiId && (
                      <tr>
                        <td style={{ padding: "2px 0", fontWeight: 700 }}>UPI ID</td>
                        <td style={{ padding: "2px 0" }}>{data.bankDetails.upiId}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </td>
            <td style={{ border: BORDER, padding: CELL_PAD, width: "50%", verticalAlign: "top" }}>
              <div style={{ fontSize: "9px", color: "#666", marginBottom: "4px" }}>
                Certified that the particulars given above are true and correct.
              </div>
              <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>
                For {data.company.name}
              </div>
              <div style={{ height: "45px" }} />
              <div style={{ fontSize: "9px", color: "#666", fontStyle: "italic", marginBottom: "6px" }}>
                This is a computer generated invoice, no signature required.
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: "10px",
                  fontWeight: 700,
                  borderTop: BORDER,
                  paddingTop: "4px",
                }}
              >
                Authorised Signatory
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms & Conditions */}
      {data.termsAndConditions && data.termsAndConditions.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: BORDER,
            borderTop: "none",
            tableLayout: "fixed",
          }}
        >
          <tbody>
            <tr>
              <td style={{ border: BORDER, padding: CELL_PAD, verticalAlign: "top" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "10px",
                    textAlign: "center",
                    marginBottom: "4px",
                    borderBottom: BORDER,
                    paddingBottom: "3px",
                  }}
                >
                  Terms and Conditions
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "14px",
                    fontSize: "9px",
                    color: "#555",
                    lineHeight: 1.6,
                  }}
                >
                  {data.termsAndConditions.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ul>
              </td>
              <td style={{ border: BORDER, padding: CELL_PAD, width: "50%" }}>
                <div style={{ fontWeight: 700, fontSize: "10px", marginBottom: "4px" }}>
                  Customer Signature
                </div>
                <div style={{ height: "30px" }} />
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#888" }}>
        Thank you for shopping with us!
      </div>
    </>
  );
}

/* ─── HSN Tax Breakdown Table ──────────────────── */
function HsnBreakdownTable({ data }: { data: PreparedInvoice["original"] }) {
  const hasIGST = data.igstTotal != null && data.igstTotal > 0;
  const hasCGST = data.cgstTotal != null && data.cgstTotal > 0;
  const hasSGST = data.sgstTotal != null && data.sgstTotal > 0;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: BORDER,
        borderTop: "none",
        tableLayout: "fixed",
      }}
    >
      <thead>
        <tr style={{ background: HEADER_BG }}>
          <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "left", fontWeight: 700, fontSize: "10px" }}>
            HSN / SAC
          </th>
          <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>
            Taxable Value
          </th>
          {hasIGST && (
            <>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>IGST %</th>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>IGST Amt</th>
            </>
          )}
          {hasCGST && (
            <>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>CGST %</th>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>CGST Amt</th>
            </>
          )}
          {hasSGST && (
            <>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>SGST %</th>
              <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>SGST Amt</th>
            </>
          )}
          <th style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {data.taxBreakdown.map((row, idx) => (
          <tr key={idx}>
            <td style={{ border: BORDER, padding: CELL_PAD }}>{row.hsnSac}</td>
            <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {formatCell(row.taxableValue, "currency")}
            </td>
            {hasIGST && (
              <>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "center" }}>{row.igstRate}</td>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCell(row.igstAmount ?? 0, "currency")}
                </td>
              </>
            )}
            {hasCGST && (
              <>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "center" }}>{row.cgstRate}</td>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCell(row.cgstAmount ?? 0, "currency")}
                </td>
              </>
            )}
            {hasSGST && (
              <>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "center" }}>{row.sgstRate}</td>
                <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCell(row.sgstAmount ?? 0, "currency")}
                </td>
              </>
            )}
            <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatCell(row.totalTax, "currency")}
            </td>
          </tr>
        ))}
        {/* Totals row */}
        <tr style={{ fontWeight: 700, background: HEADER_BG }}>
          <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right" }}>Total</td>
          <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {formatCell(data.taxBreakdown.reduce((s, r) => s + r.taxableValue, 0), "currency")}
          </td>
          {hasIGST && (
            <>
              <td style={{ border: BORDER, padding: CELL_PAD }} />
              <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatCell(data.igstTotal, "currency")}
              </td>
            </>
          )}
          {hasCGST && (
            <>
              <td style={{ border: BORDER, padding: CELL_PAD }} />
              <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatCell(data.cgstTotal, "currency")}
              </td>
            </>
          )}
          {hasSGST && (
            <>
              <td style={{ border: BORDER, padding: CELL_PAD }} />
              <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatCell(data.sgstTotal, "currency")}
              </td>
            </>
          )}
          <td style={{ border: BORDER, padding: CELL_PAD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {formatCell(data.taxBreakdown.reduce((s, r) => s + r.totalTax, 0), "currency")}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
