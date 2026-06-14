"use client";

import { useState, useRef, useEffect } from "react";
import { useDateFilter } from "@/context/DateFilterContext";
import { useFirmScope } from "../shared/useFirmScope";
import { useToast } from "@/context/ToastContext";
import { getApiBaseUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import {
  ReconciliationResult,
  ReconciliationRow,
  PartiallyMatchedRow,
} from "@/interfaces/reconciliation";

// Columns in display order — must match backend COLUMNS list
const DATA_COLS = [
  "GSTN",
  "Recipient Name",
  "Invoice Num",
  "date",
  "Invoice Value",
  "Taxable Value",
  "IGST",
  "CGST",
  "SGST",
] as const;

type DataCol = (typeof DATA_COLS)[number];

const CURRENCY_COLS = new Set<string>([
  "Invoice Value",
  "Taxable Value",
  "IGST",
  "CGST",
  "SGST",
]);

type ActiveTab = "matched" | "partially" | "not_at_site" | "not_in_software";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCell(row: ReconciliationRow, col: DataCol): string {
  const val = row[col];
  if (CURRENCY_COLS.has(col) && typeof val === "number") {
    return formatCurrency(val as number);
  }
  return val != null && val !== "" ? String(val) : "—";
}

function partyLabel(gstin: string, rows: ReconciliationRow[], count: number) {
  if (!gstin || gstin === "__MISSING__") {
    return { name: "MISSING GST NUM", gstin: "", count };
  }
  const name = rows[0]?.["Recipient Name"] || "Unknown Party";
  return { name, gstin, count };
}

function partialPartyLabel(
  gstin: string,
  pairs: PartiallyMatchedRow[],
) {
  const devCount = pairs.reduce((s, p) => s + p.deviations.length, 0);
  if (!gstin || gstin === "__MISSING__") {
    return { name: "MISSING GST NUM", gstin: "", invoiceCount: pairs.length, devCount };
  }
  const name = pairs[0]?.software_row["Recipient Name"] || "Unknown Party";
  return { name, gstin, invoiceCount: pairs.length, devCount };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ColHeader({ children }: { children?: React.ReactNode }) {
  return (
    <tr>
      {DATA_COLS.map((col) => (
        <th
          key={col}
          scope="col"
          className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap bg-slate-50"
        >
          {col}
        </th>
      ))}
      {children}
    </tr>
  );
}

function PartyHeaderRow({
  name,
  gstin,
  count,
  extra,
  colSpan,
  open,
  onToggle,
}: {
  name: string;
  gstin: string;
  count: number;
  extra?: string;
  colSpan: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <tr
      className="cursor-pointer select-none bg-slate-800 hover:bg-slate-700 transition-colors"
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            {name}
            <span className="ml-2 font-normal text-slate-300 text-xs">
              {gstin}
            </span>
          </span>
          <div className="flex items-center gap-3">
            {extra && (
              <span className="text-xs text-amber-300 font-medium">{extra}</span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              {count} invoice{count !== 1 ? "s" : ""}
            </span>
            <svg
              className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Matched tab ──────────────────────────────────────────────────────────────
function MatchedTable({
  grouped,
}: {
  grouped: Record<string, ReconciliationRow[]>;
}) {
  const gstins = Object.keys(grouped);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(gstins.map((g) => [g, true]))
  );
  const toggle = (g: string) =>
    setOpen((prev) => ({ ...prev, [g]: !prev[g] }));

  if (gstins.length === 0)
    return (
      <div className="p-12 text-center text-slate-400">
        No fully matched records found.
      </div>
    );

  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead>
        <ColHeader>
          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap bg-slate-50">
            Status
          </th>
        </ColHeader>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {gstins.map((gstin) => {
          const rows = grouped[gstin];
          const { name, count } = partyLabel(gstin, rows, rows.length);
          return (
            <>
              <PartyHeaderRow
                key={`h-${gstin}`}
                name={name}
                gstin={gstin}
                count={count}
                colSpan={DATA_COLS.length + 1}
                open={open[gstin] ?? true}
                onToggle={() => toggle(gstin)}
              />
              {(open[gstin] ?? true) &&
                rows.map((row, idx) => (
                  <tr key={`${gstin}-${idx}`} className="hover:bg-emerald-50">
                    {DATA_COLS.map((col) => (
                      <td
                        key={col}
                        className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600"
                      >
                        {fmtCell(row, col)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Auto Matched
                      </span>
                    </td>
                  </tr>
                ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Partially Matched tab ────────────────────────────────────────────────────
function PartialTable({
  grouped,
}: {
  grouped: Record<string, PartiallyMatchedRow[]>;
}) {
  const gstins = Object.keys(grouped);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(gstins.map((g) => [g, true]))
  );
  const toggle = (g: string) =>
    setOpen((prev) => ({ ...prev, [g]: !prev[g] }));

  if (gstins.length === 0)
    return (
      <div className="p-12 text-center text-slate-400">
        No partially matched records found.
      </div>
    );

  const headerCols = DATA_COLS.length + 1; // +1 for "Source" label col

  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead>
        <tr>
          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase bg-slate-50 whitespace-nowrap">
            Source
          </th>
          {DATA_COLS.map((col) => (
            <th
              key={col}
              className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 whitespace-nowrap"
            >
              {col}
            </th>
          ))}
          <th className="px-3 py-3 text-left text-xs font-semibold text-amber-700 uppercase bg-slate-50 whitespace-nowrap">
            Deviations
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {gstins.map((gstin) => {
          const pairs = grouped[gstin];
          const { name, invoiceCount, devCount } = partialPartyLabel(
            gstin,
            pairs
          );
          return (
            <>
              <PartyHeaderRow
                key={`h-${gstin}`}
                name={name}
                gstin={gstin}
                count={invoiceCount}
                extra={`${devCount} deviation${devCount !== 1 ? "s" : ""}`}
                colSpan={DATA_COLS.length + 2}
                open={open[gstin] ?? true}
                onToggle={() => toggle(gstin)}
              />
              {(open[gstin] ?? true) &&
                pairs.map((pair, pIdx) => {
                  const devSet = new Set(pair.deviations);
                  const devText = pair.deviations
                    .map(
                      (d) =>
                        `${d}: Books ${(pair.software_row as Record<string,unknown>)[d] ?? "—"} / Portal ${(pair.portal_row as Record<string,unknown>)[d] ?? "—"}`
                    )
                    .join("\n");
                  return (
                    <>
                      {/* Books row */}
                      <tr
                        key={`${gstin}-${pIdx}-b`}
                        className="bg-blue-50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
                          Books
                        </td>
                        {DATA_COLS.map((col) => (
                          <td
                            key={col}
                            className={`whitespace-nowrap px-3 py-2 text-sm ${
                              devSet.has(col)
                                ? "bg-red-100 text-red-700 font-semibold border-x border-red-200"
                                : "text-slate-600"
                            }`}
                          >
                            {fmtCell(pair.software_row, col)}
                          </td>
                        ))}
                        <td
                          rowSpan={2}
                          className="align-top px-3 py-2 text-xs text-amber-800 whitespace-pre-line max-w-xs bg-amber-50 border-l border-amber-200"
                        >
                          {devText}
                        </td>
                      </tr>
                      {/* Portal row */}
                      <tr
                        key={`${gstin}-${pIdx}-p`}
                        className="bg-yellow-50 border-b-2 border-slate-200"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-bold text-yellow-700 uppercase tracking-wide">
                          Portal
                        </td>
                        {DATA_COLS.map((col) => (
                          <td
                            key={col}
                            className={`whitespace-nowrap px-3 py-2 text-sm ${
                              devSet.has(col)
                                ? "bg-red-100 text-red-700 font-semibold border-x border-red-200"
                                : "text-slate-500"
                            }`}
                          >
                            {fmtCell(pair.portal_row, col)}
                          </td>
                        ))}
                      </tr>
                    </>
                  );
                })}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Simple grouped tab (Not at Site / Not in Software) ───────────────────────
function SimpleGroupedTable({
  grouped,
  emptyMessage,
  remarkColor,
  sourceTab,
}: {
  grouped: Record<string, ReconciliationRow[]>;
  emptyMessage: string;
  remarkColor: string;
  sourceTab: "not_at_site" | "not_in_software";
}) {
  const gstins = Object.keys(grouped);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(gstins.map((g) => [g, true]))
  );
  const toggle = (g: string) =>
    setOpen((prev) => ({ ...prev, [g]: !prev[g] }));

  if (gstins.length === 0)
    return (
      <div className="p-12 text-center text-slate-400">{emptyMessage}</div>
    );

  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead>
        <ColHeader />
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {gstins.map((gstin) => {
          const rows = grouped[gstin];
          const { name, count } = partyLabel(gstin, rows, rows.length);
          return (
            <>
              <PartyHeaderRow
                key={`h-${gstin}`}
                name={name}
                gstin={gstin}
                count={count}
                colSpan={DATA_COLS.length}
                open={open[gstin] ?? true}
                onToggle={() => toggle(gstin)}
              />
              {(open[gstin] ?? true) &&
                rows.map((row, idx) => (
                  <tr key={`${gstin}-${idx}`} className="hover:bg-rose-50">
                    {DATA_COLS.map((col) => (
                      <td
                        key={col}
                        className={`whitespace-nowrap px-3 py-2.5 text-sm ${
                          col === "Invoice Num"
                            ? `font-semibold ${remarkColor}`
                            : "text-slate-600"
                        }`}
                      >
                        {fmtCell(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReconciliationPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { fromDate, toDate } = useDateFilter();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [matchType, setMatchType] = useState<"purchases" | "debit_notes">(
    "purchases"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("matched");
  const [warningsDismissed, setWarningsDismissed] = useState(false);

  const [tolerance, setTolerance] = useState<number>(1.0);

  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
  }, [fromDate, toDate]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportMyData = async () => {
    if (!activeFirmId || !localFromDate || !localToDate) return;
    setIsDownloading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const params = new URLSearchParams({
        firm_id: activeFirmId,
        from_date: localFromDate,
        to_date: localToDate,
        match_type: matchType,
      });

      const response = await fetch(
        `${getApiBaseUrl()}/api/reconciliation/export-software-data?${params.toString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `software_${matchType}_${localFromDate}_to_${localToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Export failed",
        "error"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRunReconciliation = async () => {
    if (!selectedFile || !activeFirmId || !localFromDate || !localToDate) {
      showToast(
        "Please ensure file is uploaded and date range is selected",
        "error"
      );
      return;
    }
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("firm_id", activeFirmId);
      formData.append("from_date", localFromDate);
      formData.append("to_date", localToDate);
      formData.append("match_type", matchType);
      formData.append("tolerance", tolerance.toString());
      formData.append("file", selectedFile);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${getApiBaseUrl()}/api/reconciliation/gstr2a`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Reconciliation failed");
      }

      const data: ReconciliationResult = await response.json();
      setResult(data);
      setWarningsDismissed(false);
      setActiveTab("matched");
      setStep(3);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Reconciliation failed",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedFile || !activeFirmId || !localFromDate || !localToDate)
      return;
    setIsDownloading(true);
    try {
      const formData = new FormData();
      formData.append("firm_id", activeFirmId);
      formData.append("from_date", localFromDate);
      formData.append("to_date", localToDate);
      formData.append("match_type", matchType);
      formData.append("tolerance", tolerance.toString());
      formData.append("file", selectedFile);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${getApiBaseUrl()}/api/reconciliation/gstr2a/download`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );
      if (!response.ok) throw new Error("Failed to download report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reconciliation_report_${localFromDate}_to_${localToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Download failed",
        "error"
      );
    } finally {
      setIsDownloading(false);
    }
  };


  const tabConfig: {
    id: ActiveTab;
    label: string;
    count: number;
  }[] = result
    ? [
        { id: "matched", label: "Matched", count: result.summary.matched },
        {
          id: "partially",
          label: "Partially Matched",
          count: result.summary.partially_matched,
        },
        {
          id: "not_at_site",
          label: "Not at Site",
          count: result.summary.not_at_site,
        },
        {
          id: "not_in_software",
          label: "Not in Software",
          count: result.summary.not_in_software,
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            GSTR-2A Reconciliation
          </h1>
          <p className="mt-1 text-slate-500">
            Match your software purchase/debit note records against GST portal
            data.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol
            role="list"
            className="space-y-4 md:flex md:space-x-8 md:space-y-0"
          >
            {[
              { n: 1, label: "Period & Export" },
              { n: 2, label: "Upload GSTR-2A" },
              { n: 3, label: "Results" },
            ].map(({ n, label }) => (
              <li key={n} className="md:flex-1">
                <div
                  className={`flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${
                    step >= n ? "border-tally-600" : "border-slate-200"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      step >= n ? "text-tally-600" : "text-slate-500"
                    }`}
                  >
                    Step {n}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {label}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium leading-6 text-slate-900">
            Select Period
          </h3>
          <p className="mt-1 text-sm text-slate-500 mb-6">
            Choose the date range for your reconciliation.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-slate-700">
                From Date
              </label>
              <input
                type="date"
                value={localFromDate}
                onChange={(e) => setLocalFromDate(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-tally-500 focus:outline-none focus:ring-1 focus:ring-tally-500"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-slate-700">
                To Date
              </label>
              <input
                type="date"
                value={localToDate}
                onChange={(e) => setLocalToDate(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-tally-500 focus:outline-none focus:ring-1 focus:ring-tally-500"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2 mb-8">
            <label className="text-sm font-medium text-slate-700">
              Voucher Type to Reconcile
            </label>
            <div className="flex gap-4">
              {(
                [
                  { v: "purchases", l: "Match Purchases" },
                  { v: "debit_notes", l: "Match Debit Notes" },
                ] as const
              ).map(({ v, l }) => (
                <label
                  key={v}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="match_type"
                    value={v}
                    checked={matchType === v}
                    onChange={() => setMatchType(v)}
                    className="h-4 w-4 text-tally-600 focus:ring-tally-600"
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportMyData}
              disabled={isDownloading}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <svg
                className="mr-2 h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {isDownloading ? "Exporting..." : "Download My Software Data"}
            </button>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center rounded-lg bg-tally-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tally-500"
            >
              Continue to Upload
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium leading-6 text-slate-900">
            Upload GSTR-2A Portal Data
          </h3>
          <p className="mt-1 text-sm text-slate-500 mb-6">
            Upload the downloaded Excel file from the GST portal containing
            your 2A data.
          </p>

          <div className="mt-2 flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-tally-500 focus-within:ring-offset-2"
            >
              <span>Choose Excel File</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </label>
            <span className="text-sm text-slate-500">
              {selectedFile ? (
                <span className="flex items-center text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  {selectedFile.name}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-2 text-emerald-700 hover:text-emerald-900"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ) : (
                "No file chosen"
              )}
            </span>
          </div>

          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Match Tolerance (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-tally-500 focus:outline-none focus:ring-1 focus:ring-tally-500"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleRunReconciliation}
              disabled={isProcessing || !selectedFile}
              className="inline-flex items-center rounded-lg bg-tally-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tally-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                "Run Reconciliation"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && result && (
        <div className="space-y-6">
          {/* Warning banner */}
          {result.warnings.length > 0 && !warningsDismissed && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {result.warnings.length} duplicate invoice
                  {result.warnings.length !== 1 ? "s" : ""} found in books
                  (ignored during reconciliation)
                </p>
                <ul className="mt-1 list-disc list-inside text-xs text-amber-700 space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setWarningsDismissed(true)}
                className="text-amber-500 hover:text-amber-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Fully Matched",
                count: result.summary.matched,
                border: "border-emerald-200",
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                val: "text-emerald-900",
                tab: "matched" as ActiveTab,
              },
              {
                label: "Partially Matched",
                count: result.summary.partially_matched,
                border: "border-amber-200",
                bg: "bg-amber-50",
                text: "text-amber-700",
                val: "text-amber-900",
                tab: "partially" as ActiveTab,
              },
              {
                label: "Not at Site",
                count: result.summary.not_at_site,
                border: "border-rose-200",
                bg: "bg-rose-50",
                text: "text-rose-700",
                val: "text-rose-900",
                tab: "not_at_site" as ActiveTab,
              },
              {
                label: "Not in Software",
                count: result.summary.not_in_software,
                border: "border-rose-200",
                bg: "bg-rose-50",
                text: "text-rose-700",
                val: "text-rose-900",
                tab: "not_in_software" as ActiveTab,
              },
            ].map(({ label, count, border, bg, text, val, tab }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left overflow-hidden rounded-2xl border ${border} ${bg} px-4 py-5 shadow-sm sm:p-6 transition-all ${
                  activeTab === tab ? "ring-2 ring-tally-500 ring-offset-2" : ""
                }`}
              >
                <dt className={`truncate text-sm font-medium ${text}`}>
                  {label}
                </dt>
                <dd
                  className={`mt-1 text-3xl font-semibold tracking-tight ${val}`}
                >
                  {count}
                </dd>
              </button>
            ))}
          </div>

          {/* Tab bar + download */}
          <div className="flex items-center justify-between">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabConfig.map(({ id, label, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`${
                      activeTab === id
                        ? "border-tally-500 text-tally-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                  >
                    {label}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        activeTab === id
                          ? "bg-tally-100 text-tally-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {isDownloading ? "Downloading..." : "Download Excel Report"}
            </button>
          </div>

          {/* Table container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === "matched" && (
                <MatchedTable grouped={result.matched_grouped} />
              )}
              {activeTab === "partially" && (
                <PartialTable grouped={result.partial_grouped} />
              )}
              {activeTab === "not_at_site" && (
                <SimpleGroupedTable
                  grouped={result.not_at_site_grouped}
                  emptyMessage="No 'Not at Site' records found."
                  remarkColor="text-rose-600"
                  sourceTab="not_at_site"
                />
              )}
              {activeTab === "not_in_software" && (
                <SimpleGroupedTable
                  grouped={result.not_in_software_grouped}
                  emptyMessage="No 'Not in Software' records found."
                  remarkColor="text-rose-600"
                  sourceTab="not_in_software"
                />
              )}
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => {
                setStep(2);
                setResult(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 underline"
            >
              Start Over
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
