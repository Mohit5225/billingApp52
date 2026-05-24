"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Hsn, ItemDetail, StockPositionRow, Uom } from "@/interfaces/inventory";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";

import { EmptyState, PageHero, SurfaceCard } from "../../shared/WorkspaceUi";
import { useFirmScope } from "../../shared/useFirmScope";

type SectionKey = "items" | "hsn" | "uom" | "stock-position";

type HsnForm = {
  hsn_code: string;
  description: string;
  code_type: "HSN" | "SAC";
  is_active: boolean;
};

type UomForm = {
  name: string;
  formal_name: string;
  uqc_code: string;
  decimal_places: number;
};

const GST_UQCS = [
  "Not Applicable", "BAG-BAGS", "BAL-BALE", "BDL-BUNDLES", "BKL-BUCKLES",
  "BOU-BILLION OF UNITS", "BOX-BOX", "BTL-BOTTLES", "BUN-BUNCHES", "CAN-CANS",
  "CBM-CUBIC METERS", "CCM-CUBIC CENTIMETERS", "CMS-CENTIMETERS", "CTN-CARTONS",
  "DOZ-DOZENS", "DRM-DRUMS", "GGK-GREAT GROSS", "GMS-GRAMMES", "GRS-GROSS",
  "GYD-GROSS YARDS", "KGS-KILOGRAMS", "KLR-KILOLITRE", "KME-KILOMETRE",
  "LTR-LITRES", "MLT-MILILITRE", "MTR-METERS", "MTS-METRIC TON", "NOS-NUMBERS",
  "OTH-OTHERS", "PAC-PACKS", "PCS-PIECES", "PRS-PAIRS", "QTL-QUINTAL",
  "ROL-ROLLS", "SET-SETS", "SQF-SQUARE FEET", "SQM-SQUARE METERS", 
  "SQY-SQUARE YARDS", "TBS-TABLETS", "TGM-TEN GROSS", "THD-THOUSANDS",
  "TON-TONNES", "TUB-TUBES", "UGS-US GALLONS", "YDS-YARDS"
];

type ItemForm = {
  name: string;
  alias: string;
  type: "Goods" | "Services";
  hsn_id: string;
  uom_id: string;
  default_price: number;
  is_gst_applicable: boolean;
  is_rcm: boolean;
  taxability: "Taxable" | "Nil Rated" | "Exempt" | "Zero Rated" | "Non-GST";
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  cess_type: "none" | "ad_valorem" | "specific" | "compound";
  cess_percent: number;
  cess_amount_per_unit: number;
  opening_quantity: number;
  opening_rate: number;
  opening_value: number;
  is_active: boolean;
};

const EMPTY_HSN: HsnForm = {
  hsn_code: "",
  description: "",
  code_type: "HSN",
  is_active: true,
};

const EMPTY_UOM: UomForm = {
  name: "",
  formal_name: "",
  uqc_code: "Not Applicable",
  decimal_places: 0,
};

const EMPTY_ITEM: ItemForm = {
  name: "",
  alias: "",
  type: "Goods",
  hsn_id: "",
  uom_id: "",
  default_price: 0,
  is_gst_applicable: true,
  is_rcm: false,
  taxability: "Taxable",
  igst_rate: 18,
  cgst_rate: 9,
  sgst_rate: 9,
  cess_type: "none",
  cess_percent: 0,
  cess_amount_per_unit: 0,
  opening_quantity: 0,
  opening_rate: 0,
  opening_value: 0,
  is_active: true,
};

const SECTION_COPY: Record<SectionKey, { title: string; description: string }> = {
  items: {
    title: "Item masters",
    description: "Create and maintain billing-ready items with GST defaults, opening balances, and unit mapping.",
  },
  hsn: {
    title: "HSN / SAC masters",
    description: "Keep classification codes tight so invoice entry doesn’t drift later.",
  },
  uom: {
    title: "Units of measure",
    description: "Define quantity units once and reuse them cleanly across vouchers and stock views.",
  },
  "stock-position": {
    title: "Stock position",
    description: "Read live inward, outward, and closing stock computed from the backend.",
  },
};

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 ${props.className || ""}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${props.className || ""}`}
    />
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200"
    >
      <span>{label}</span>
      <span className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "bg-emerald-500" : "bg-slate-200"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

export default function InventorySectionPage() {
  const params = useParams<{ section: string }>();
  const section = (params.section || "items") as SectionKey;
  const { activeFirmId, supabase } = useFirmScope();

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ItemDetail[]>([]);
  const [hsn, setHsn] = useState<Hsn[]>([]);
  const [uom, setUom] = useState<Uom[]>([]);
  const [stockRows, setStockRows] = useState<StockPositionRow[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [hsnForm, setHsnForm] = useState<HsnForm>(EMPTY_HSN);
  const [uomForm, setUomForm] = useState<UomForm>(EMPTY_UOM);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);

  const copy = SECTION_COPY[section];

  async function loadSection() {
    if (!activeFirmId) return;
    setIsLoading(true);
    setError(null);

    try {
      if (section === "items") {
        const [itemData, hsnData, uomData, stockData] = await Promise.all([
          apiRequest<ItemDetail[]>(supabase, "/api/items", {
            query: { firm_id: activeFirmId, active_only: false, search },
          }),
          apiRequest<Hsn[]>(supabase, "/api/hsn", {
            query: { firm_id: activeFirmId, search: "" },
          }),
          apiRequest<Uom[]>(supabase, "/api/uom", {
            query: { firm_id: activeFirmId },
          }),
          apiRequest<StockPositionRow[]>(supabase, "/api/workspace/stock-position", {
            query: { firm_id: activeFirmId },
          }),
        ]);
        setItems(itemData);
        setHsn(hsnData);
        setUom(uomData);
        setStockRows(stockData);
      } else if (section === "hsn") {
        const data = await apiRequest<Hsn[]>(supabase, "/api/hsn", {
          query: { firm_id: activeFirmId, search },
        });
        setHsn(data);
      } else if (section === "uom") {
        const data = await apiRequest<Uom[]>(supabase, "/api/uom", {
          query: { firm_id: activeFirmId },
        });
        setUom((data || []).filter((row) => row.name.toLowerCase().includes(search.toLowerCase())));
      } else {
        const data = await apiRequest<StockPositionRow[]>(supabase, "/api/workspace/stock-position", {
          query: { firm_id: activeFirmId, search },
        });
        setStockRows(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this section");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSection();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFirmId, section, search]);

  const stockByItemId = useMemo(
    () => Object.fromEntries(stockRows.map((row) => [row.item_id, row])),
    [stockRows],
  );

  function resetForms() {
    setEditingId(null);
    setHsnForm(EMPTY_HSN);
    setUomForm(EMPTY_UOM);
    setItemForm(EMPTY_ITEM);
  }

  async function saveHsn() {
    if (!activeFirmId) return;
    if (!hsnForm.hsn_code.trim()) {
      setError("Please provide an HSN / SAC code.");
      return;
    }
    const body = { ...hsnForm, firm_id: activeFirmId };
    try {
      if (editingId) {
        await apiRequest<Hsn>(supabase, `/api/hsn/${editingId}`, { method: "PATCH", body });
      } else {
        await apiRequest<Hsn>(supabase, "/api/hsn/", { method: "POST", body });
      }
      resetForms();
      setError(null);
      await loadSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save HSN");
    }
  }

  async function saveUom() {
    if (!activeFirmId) return;
    if (!uomForm.name.trim() || !uomForm.uqc_code.trim()) {
      setError("Please provide a UOM name and UQC code.");
      return;
    }
    const body = { ...uomForm, firm_id: activeFirmId };
    try {
      if (editingId) {
        await apiRequest<Uom>(supabase, `/api/uom/${editingId}`, { method: "PATCH", body });
      } else {
        await apiRequest<Uom>(supabase, "/api/uom/", { method: "POST", body });
      }
      resetForms();
      setError(null);
      await loadSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UOM");
    }
  }

  async function saveItem() {
    if (!activeFirmId) return;
    if (!itemForm.name.trim() || !itemForm.hsn_id || !itemForm.uom_id) {
      setError("Please provide an item name, HSN code, and Unit of Measure.");
      return;
    }
    const body = { ...itemForm, firm_id: activeFirmId };
    try {
      if (editingId) {
        await apiRequest<ItemDetail>(supabase, `/api/items/${editingId}`, { method: "PATCH", body });
      } else {
        await apiRequest<ItemDetail>(supabase, "/api/items/", { method: "POST", body });
      }
      resetForms();
      setError(null);
      await loadSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    }
  }

  async function removeCurrent(id: string) {
    const path = section === "hsn" ? `/api/hsn/${id}` : section === "uom" ? `/api/uom/${id}` : `/api/items/${id}`;
    await apiRequest<void>(supabase, path, { method: "DELETE" });
    if (editingId === id) resetForms();
    await loadSection();
  }

  const editor = section === "hsn"
    ? (
      <SurfaceCard
        title={editingId ? "Edit HSN / SAC" : "Add HSN / SAC"}
        description="Statutory classification lives here so item and voucher entry stay clean."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            placeholder="HSN / SAC code"
            value={hsnForm.hsn_code}
            onChange={(event) => setHsnForm((prev) => ({ ...prev, hsn_code: event.target.value }))}
          />
          <SelectInput
            value={hsnForm.code_type}
            onChange={(event) => setHsnForm((prev) => ({ ...prev, code_type: event.target.value as "HSN" | "SAC" }))}
          >
            <option value="HSN">HSN</option>
            <option value="SAC">SAC</option>
          </SelectInput>
          <div className="md:col-span-2">
            <TextInput
              placeholder="Description"
              value={hsnForm.description}
              onChange={(event) => setHsnForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Toggle checked={hsnForm.is_active} label="Keep this code active for selection" onChange={(next) => setHsnForm((prev) => ({ ...prev, is_active: next }))} />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => void saveHsn()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            {editingId ? "Save changes" : "Create code"}
          </button>
          <button onClick={resetForms} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
            Reset
          </button>
        </div>
      </SurfaceCard>
    )
    : section === "uom"
      ? (
        <SurfaceCard
          title={editingId ? "Edit UOM" : "Add UOM"}
          description="Define the GST-ready unit once and keep quantity entry consistent everywhere."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              placeholder="Type"
              value="Simple"
              disabled
              readOnly
            />
            <TextInput
              placeholder="Symbol (e.g. pcs)"
              value={uomForm.name}
              onChange={(event) => setUomForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <div className="md:col-span-2">
              <TextInput
                placeholder="Formal name (e.g. Pieces)"
                value={uomForm.formal_name}
                onChange={(event) => setUomForm((prev) => ({ ...prev, formal_name: event.target.value }))}
              />
            </div>
            <div className="relative md:col-span-2">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={uomForm.uqc_code}
                onChange={(event) => setUomForm((prev) => ({ ...prev, uqc_code: event.target.value }))}
              >
                <option value="" disabled>Select Unit Quantity Code (UQC)</option>
                {GST_UQCS.map((uqc) => (
                  <option key={uqc} value={uqc}>{uqc}</option>
                ))}
              </select>
            </div>
            <TextInput
              type="number"
              placeholder="Number of decimal places"
              value={uomForm.decimal_places}
              onChange={(event) => setUomForm((prev) => ({ ...prev, decimal_places: Number(event.target.value) }))}
            />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => void saveUom()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              {editingId ? "Save changes" : "Create UOM"}
            </button>
            <button onClick={resetForms} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
              Reset
            </button>
          </div>
        </SurfaceCard>
      )
      : section === "items"
        ? (
          <SurfaceCard
            title={editingId ? "Edit item" : "Add item"}
            description="Items are stock-aware and voucher-ready here, with GST defaults and opening position in one dense but clean form."
            action={
              <div className="text-right text-xs text-slate-500">
                <Link href="/dashboard/inventory/hsn" className="font-semibold text-tally-700">Manage HSN</Link>
                <span className="mx-2 text-slate-300">/</span>
                <Link href="/dashboard/inventory/uom" className="font-semibold text-tally-700">Manage UOM</Link>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextInput placeholder="Item name" value={itemForm.name} onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))} />
              <TextInput placeholder="Alias" value={itemForm.alias} onChange={(event) => setItemForm((prev) => ({ ...prev, alias: event.target.value }))} />
              <SelectInput value={itemForm.type} onChange={(event) => setItemForm((prev) => ({ ...prev, type: event.target.value as "Goods" | "Services" }))}>
                <option value="Goods">Goods</option>
                <option value="Services">Services</option>
              </SelectInput>
              <TextInput type="number" step="0.01" placeholder="Default price" value={itemForm.default_price} onChange={(event) => setItemForm((prev) => ({ ...prev, default_price: Number(event.target.value) }))} />
              <SelectInput value={itemForm.hsn_id} onChange={(event) => setItemForm((prev) => ({ ...prev, hsn_id: event.target.value }))}>
                <option value="">Select HSN / SAC</option>
                {hsn.map((row) => <option key={row.id} value={row.id}>{row.hsn_code} {row.description ? `- ${row.description}` : ""}</option>)}
              </SelectInput>
              <SelectInput value={itemForm.uom_id} onChange={(event) => setItemForm((prev) => ({ ...prev, uom_id: event.target.value }))}>
                <option value="">Select UOM</option>
                {uom.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.uqc_code})</option>)}
              </SelectInput>
              <SelectInput value={itemForm.taxability} onChange={(event) => setItemForm((prev) => ({ ...prev, taxability: event.target.value as ItemForm["taxability"] }))}>
                <option value="Taxable">Taxable</option>
                <option value="Nil Rated">Nil Rated</option>
                <option value="Exempt">Exempt</option>
                <option value="Zero Rated">Zero Rated</option>
                <option value="Non-GST">Non-GST</option>
              </SelectInput>
              <SelectInput value={itemForm.cess_type} onChange={(event) => setItemForm((prev) => ({ ...prev, cess_type: event.target.value as ItemForm["cess_type"] }))}>
                <option value="none">No cess</option>
                <option value="ad_valorem">Ad valorem</option>
                <option value="specific">Specific</option>
                <option value="compound">Compound</option>
              </SelectInput>
              <TextInput type="number" step="0.01" placeholder="IGST %" value={itemForm.igst_rate} onChange={(event) => setItemForm((prev) => ({ ...prev, igst_rate: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="CGST %" value={itemForm.cgst_rate} onChange={(event) => setItemForm((prev) => ({ ...prev, cgst_rate: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="SGST %" value={itemForm.sgst_rate} onChange={(event) => setItemForm((prev) => ({ ...prev, sgst_rate: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="Cess %" value={itemForm.cess_percent} onChange={(event) => setItemForm((prev) => ({ ...prev, cess_percent: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="Cess amount / unit" value={itemForm.cess_amount_per_unit} onChange={(event) => setItemForm((prev) => ({ ...prev, cess_amount_per_unit: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="Opening quantity" value={itemForm.opening_quantity} onChange={(event) => setItemForm((prev) => ({ ...prev, opening_quantity: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="Opening rate" value={itemForm.opening_rate} onChange={(event) => setItemForm((prev) => ({ ...prev, opening_rate: Number(event.target.value) }))} />
              <TextInput type="number" step="0.01" placeholder="Opening value" value={itemForm.opening_value} onChange={(event) => setItemForm((prev) => ({ ...prev, opening_value: Number(event.target.value) }))} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Toggle checked={itemForm.is_gst_applicable} label="GST applicable" onChange={(next) => setItemForm((prev) => ({ ...prev, is_gst_applicable: next }))} />
              <Toggle checked={itemForm.is_rcm} label="Reverse charge applicable" onChange={(next) => setItemForm((prev) => ({ ...prev, is_rcm: next }))} />
              <Toggle checked={itemForm.is_active} label="Keep item active" onChange={(next) => setItemForm((prev) => ({ ...prev, is_active: next }))} />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => void saveItem()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                {editingId ? "Save item" : "Create item"}
              </button>
              <button onClick={resetForms} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
                Reset
              </button>
            </div>
          </SurfaceCard>
        )
        : null;

  const content = section === "items"
    ? (
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState title="No items yet" description="Create the first item so vouchers can pick inventory lines from a real master." />
        ) : items.map((item) => {
          const stock = stockByItemId[item.id];
          return (
            <div key={item.id} className="rounded-[26px] border border-slate-100 bg-white/92 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">{item.name}</p>
                    {!item.is_active ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inactive</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.hsn_code || "No HSN"} • {item.uom_name || "No UOM"} • {item.type}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Default price: {formatCurrency(item.default_price)}</span>
                    <span>Taxability: {item.taxability}</span>
                    <span>Stock: {formatNumber(stock?.closing_quantity ?? 0)}</span>
                    <span>Stock value: {formatCurrency(stock?.closing_value ?? 0)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setItemForm({
                        name: item.name,
                        alias: item.alias || "",
                        type: item.type,
                        hsn_id: item.hsn_id,
                        uom_id: item.uom_id,
                        default_price: item.default_price,
                        is_gst_applicable: item.is_gst_applicable,
                        is_rcm: item.is_rcm,
                        taxability: item.taxability,
                        igst_rate: item.igst_rate,
                        cgst_rate: item.cgst_rate,
                        sgst_rate: item.sgst_rate,
                        cess_type: item.cess_type,
                        cess_percent: item.cess_percent,
                        cess_amount_per_unit: item.cess_amount_per_unit,
                        opening_quantity: item.opening_quantity,
                        opening_rate: item.opening_rate,
                        opening_value: item.opening_value,
                        is_active: item.is_active,
                      });
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Edit
                  </button>
                  <button onClick={() => void removeCurrent(item.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )
    : section === "hsn"
      ? (
        <div className="space-y-3">
          {hsn.length === 0 ? <EmptyState title="No HSN / SAC codes yet" description="Add the statutory codes your item masters will reference." /> : hsn.map((row) => (
            <div key={row.id} className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-white/92 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-950">{row.hsn_code}</p>
                <p className="mt-2 text-sm text-slate-500">{row.description || "No description"} • {row.code_type}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setEditingId(row.id); setHsnForm({ hsn_code: row.hsn_code, description: row.description || "", code_type: row.code_type, is_active: row.is_active }); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Edit</button>
                <button onClick={() => void removeCurrent(row.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )
      : section === "uom"
        ? (
          <div className="space-y-3">
            {uom.length === 0 ? <EmptyState title="No UOM defined yet" description="Add the units that items and voucher quantity fields will use." /> : uom.map((row) => (
              <div key={row.id} className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-white/92 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-lg font-bold text-slate-950">{row.name}</p>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{row.uqc_code}</span>
                  </div>
                  <p className="text-sm text-slate-600">{row.formal_name || "No formal name defined"}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-500">{row.decimal_places} decimal places</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setEditingId(row.id); setUomForm({ name: row.name, formal_name: row.formal_name || "", uqc_code: row.uqc_code, decimal_places: row.decimal_places }); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 transition-colors">Edit</button>
                  <button onClick={() => void removeCurrent(row.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-100 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
        : (
          <div className="space-y-3">
            {stockRows.length === 0 ? <EmptyState title="No stock movements yet" description="Opening balances and inventory vouchers will start populating this register." /> : stockRows.map((row) => (
              <div key={row.item_id} className="rounded-[24px] border border-slate-100 bg-white/92 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{row.item_name}</p>
                    <p className="mt-2 text-sm text-slate-500">{row.hsn_code || "No HSN"} • {row.uom_name || "No UOM"}</p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-5">
                    <span>Opening: {formatNumber(row.opening_quantity)}</span>
                    <span>Inward: {formatNumber(row.inward_quantity)}</span>
                    <span>Outward: {formatNumber(row.outward_quantity)}</span>
                    <span>Closing: {formatNumber(row.closing_quantity)}</span>
                    <span>Value: {formatCurrency(row.closing_value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Inventory Detail"
        title={copy.title}
        description={copy.description}
      />

      <SurfaceCard title="Find records" description="Search stays local to this working view so you can move quickly without jumping screens.">
        <TextInput placeholder={`Search ${section.replace("-", " ")}`} value={search} onChange={(event) => setSearch(event.target.value)} />
      </SurfaceCard>

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
      {editor}

      <SurfaceCard
        title={copy.title}
        description={isLoading ? "Loading..." : "Live records from the backend."}
      >
        {content}
      </SurfaceCard>
    </div>
  );
}
