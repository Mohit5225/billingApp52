"use client";

import { useState, useRef, useEffect } from "react";
import { useDateFilter } from "@/context/DateFilterContext";
import { useFirmScope } from "../shared/useFirmScope";
import { useToast } from "@/context/ToastContext";
import { getApiBaseUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { ReconciliationResult, ReconciliationRow, PartiallyMatchedRow, UnmatchedRow } from "@/interfaces/reconciliation";

const COLUMNS = [
  "GSTIN of supplier",
  "Trade/Legal name",
  "Invoice number",
  "Invoice type",
  "Invoice Date",
  "Place of supply",
  "Invoice Value(₹)",
  "Taxable Value (₹)",
  "Integrated Tax(₹)",
  "Central Tax(₹)",
  "State/UT Tax(₹)"
] as const;

export default function ReconciliationPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { fromDate, toDate } = useDateFilter();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [matchType, setMatchType] = useState<"purchases" | "debit_notes">("purchases");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"matched" | "partially" | "unmatched">("matched");

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const params = new URLSearchParams({
        firm_id: activeFirmId,
        from_date: localFromDate,
        to_date: localToDate,
        match_type: matchType
      });

      const response = await fetch(`${getApiBaseUrl()}/api/reconciliation/export-software-data?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

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
      showToast(err instanceof Error ? err.message : "Export failed", "error");
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
      showToast("Please ensure file is uploaded and date range is selected", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("firm_id", activeFirmId);
      formData.append("from_date", localFromDate);
      formData.append("to_date", localToDate);
      formData.append("match_type", matchType);
      formData.append("file", selectedFile);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${getApiBaseUrl()}/api/reconciliation/gstr2a`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Reconciliation failed");
      }

      const data: ReconciliationResult = await response.json();
      setResult(data);
      setStep(3);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Reconciliation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedFile || !activeFirmId || !localFromDate || !localToDate) return;
    setIsDownloading(true);
    try {
      const formData = new FormData();
      formData.append("firm_id", activeFirmId);
      formData.append("from_date", localFromDate);
      formData.append("to_date", localToDate);
      formData.append("match_type", matchType);
      formData.append("file", selectedFile);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${getApiBaseUrl()}/api/reconciliation/gstr2a/download`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });

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
      showToast(err instanceof Error ? err.message : "Download failed", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderCell = (row: any, col: string, isDeviation = false) => {
    const val = row[col];
    const isCurrency = col.includes("(₹)");
    let displayVal = val;
    if (isCurrency && typeof val === "number") {
      displayVal = formatCurrency(val);
    }

    return (
      <td key={col} className={`whitespace-nowrap px-3 py-3.5 text-sm ${isDeviation ? 'bg-red-50 text-red-700 font-semibold border-x border-red-200' : 'text-slate-600'}`}>
        {displayVal || "-"}
      </td>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">GSTR-2A Reconciliation</h1>
          <p className="mt-1 text-slate-500">Match your software purchase/debit note records against GST portal data.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
            <li className="md:flex-1">
              <div className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${step >= 1 ? 'border-tally-600' : 'border-slate-200'}`}>
                <span className={`text-sm font-medium ${step >= 1 ? 'text-tally-600' : 'text-slate-500'}`}>Step 1</span>
                <span className="text-sm font-medium text-slate-900">Period & Export</span>
              </div>
            </li>
            <li className="md:flex-1">
              <div className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${step >= 2 ? 'border-tally-600' : 'border-slate-200'}`}>
                <span className={`text-sm font-medium ${step >= 2 ? 'text-tally-600' : 'text-slate-500'}`}>Step 2</span>
                <span className="text-sm font-medium text-slate-900">Upload GSTR-2A</span>
              </div>
            </li>
            <li className="md:flex-1">
              <div className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${step === 3 ? 'border-tally-600' : 'border-slate-200'}`}>
                <span className={`text-sm font-medium ${step === 3 ? 'text-tally-600' : 'text-slate-500'}`}>Step 3</span>
                <span className="text-sm font-medium text-slate-900">Results</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium leading-6 text-slate-900">Select Period</h3>
          <p className="mt-1 text-sm text-slate-500 mb-6">Choose the date range for your reconciliation.</p>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
             <div className="flex flex-col space-y-2">
               <label className="text-sm font-medium text-slate-700">From Date</label>
               <input 
                 type="date" 
                 value={localFromDate} 
                 onChange={(e) => setLocalFromDate(e.target.value)}
                 className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-tally-500 focus:outline-none focus:ring-1 focus:ring-tally-500"
               />
             </div>
             <div className="flex flex-col space-y-2">
               <label className="text-sm font-medium text-slate-700">To Date</label>
               <input 
                 type="date" 
                 value={localToDate} 
                 onChange={(e) => setLocalToDate(e.target.value)}
                 className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-tally-500 focus:outline-none focus:ring-1 focus:ring-tally-500"
               />
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
             <div className="flex flex-col space-y-2">
               <label className="text-sm font-medium text-slate-700">Voucher Type to Reconcile</label>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 text-sm text-slate-700">
                   <input 
                     type="radio" 
                     name="match_type" 
                     value="purchases" 
                     checked={matchType === "purchases"} 
                     onChange={() => setMatchType("purchases")}
                     className="h-4 w-4 text-tally-600 focus:ring-tally-600"
                   />
                   Match Purchases
                 </label>
                 <label className="flex items-center gap-2 text-sm text-slate-700">
                   <input 
                     type="radio" 
                     name="match_type" 
                     value="debit_notes" 
                     checked={matchType === "debit_notes"} 
                     onChange={() => setMatchType("debit_notes")}
                     className="h-4 w-4 text-tally-600 focus:ring-tally-600"
                   />
                   Match Debit Notes
                 </label>
               </div>
             </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={handleExportMyData}
              disabled={isDownloading}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <svg className="mr-2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium leading-6 text-slate-900">Upload GSTR-2A Portal Data</h3>
          <p className="mt-1 text-sm text-slate-500 mb-6">Upload the downloaded Excel file from the GST portal containing your 2A data.</p>
          
          <div className="mt-2 flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-tally-500 focus-within:ring-offset-2"
            >
              <span>Choose Excel File</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx,.xls" onChange={handleFileChange} ref={fileInputRef} />
            </label>
            <span className="text-sm text-slate-500">
              {selectedFile ? (
                <span className="flex items-center text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  {selectedFile.name} 
                  <button onClick={(e) => { e.preventDefault(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = "";}} className="ml-2 text-emerald-700 hover:text-emerald-900">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ) : "No file chosen"}
            </span>
          </div>

          <div className="mt-8 flex gap-4">
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
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

      {step === 3 && result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 shadow-sm sm:p-6">
              <dt className="truncate text-sm font-medium text-emerald-700">Fully Matched</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-emerald-900">{result.summary.matched}</dd>
            </div>
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 shadow-sm sm:p-6">
              <dt className="truncate text-sm font-medium text-amber-700">Partially Matched (Deviations)</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-amber-900">{result.summary.partially_matched}</dd>
            </div>
            <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 shadow-sm sm:p-6">
              <dt className="truncate text-sm font-medium text-rose-700">Unmatched</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-rose-900">{result.summary.unmatched}</dd>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("matched")}
                  className={`${activeTab === "matched" ? "border-tally-500 text-tally-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  Matched
                </button>
                <button
                  onClick={() => setActiveTab("partially")}
                  className={`${activeTab === "partially" ? "border-tally-500 text-tally-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  Partially Matched
                </button>
                <button
                  onClick={() => setActiveTab("unmatched")}
                  className={`${activeTab === "unmatched" ? "border-tally-500 text-tally-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  Unmatched
                </button>
              </nav>
            </div>
            
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? "Downloading..." : "Download Excel Report"}
            </button>
          </div>

          {/* Tables Container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col} scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    {activeTab === "partially" && (
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider whitespace-nowrap">
                        Deviations Note
                      </th>
                    )}
                    {activeTab === "unmatched" && (
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                        Remark
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeTab === "matched" && result.matched.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {COLUMNS.map(col => renderCell(row, col))}
                    </tr>
                  ))}

                  {activeTab === "partially" && result.partially_matched.map((pMatch, idx) => {
                    const row = pMatch.software_row;
                    const deviations = pMatch.deviations;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        {COLUMNS.map(col => renderCell(row, col, deviations.includes(col)))}
                        <td className="whitespace-pre-line px-3 py-3.5 text-xs text-amber-800">
                          {deviations.map(d => (
                            <div key={d} className="mb-1 bg-amber-50 rounded px-2 py-1 border border-amber-100">
                              <span className="font-semibold">{d}:</span><br/>
                              Ours: {row[d] || "0"} | Portal: {pMatch.portal_row[d] || "0"}
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "unmatched" && result.unmatched.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {COLUMNS.map(col => renderCell(row, col))}
                      <td className="whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-rose-600">
                        {row.Remark}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Empty States */}
              {activeTab === "matched" && result.matched.length === 0 && (
                <div className="p-12 text-center text-slate-500">No fully matched records found.</div>
              )}
              {activeTab === "partially" && result.partially_matched.length === 0 && (
                <div className="p-12 text-center text-slate-500">No partially matched records found.</div>
              )}
              {activeTab === "unmatched" && result.unmatched.length === 0 && (
                <div className="p-12 text-center text-slate-500">No unmatched records found.</div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
             <button
                onClick={() => { setStep(2); setResult(null); }}
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
