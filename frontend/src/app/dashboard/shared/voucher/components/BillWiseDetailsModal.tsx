"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BillRefType } from "@/interfaces/voucher";
import { DrCrType } from "@/interfaces/ledger";
import { BillAllocationState } from "../types";
import { apiRequest } from "@/lib/http";
import { SupabaseClient } from "@supabase/supabase-js";
import { DatePicker } from "../../../components/DatePicker";

type OutstandingBill = {
  ref_name: string;
  ref_type: string;
  bill_date: string;
  due_date: string;
  balance: number;
  balance_type: DrCrType;
};

type BillWiseDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (allocations: BillAllocationState[]) => void;
  partyName: string;
  totalAmount: number;
  /** "Dr" for Receipt (party is credited), "Cr" for Payment (party is debited) */
  allocationAmountType: DrCrType;
  firmId: string;
  partyLedgerId: string;
  supabase: SupabaseClient;
  existingAllocations: BillAllocationState[];
  voucherDate: string;
};

const REF_TYPE_OPTIONS: BillRefType[] = ["Agst Ref", "New Ref", "Advance", "On Account"];

type AllocationRow = {
  ref_type: BillRefType;
  ref_name: string;
  amount: number;
  due_date: string;
};

const EMPTY_ROW: AllocationRow = {
  ref_type: "Agst Ref",
  ref_name: "",
  amount: 0,
  due_date: "",
};

export function BillWiseDetailsModal({
  open,
  onClose,
  onSave,
  partyName,
  totalAmount,
  allocationAmountType,
  firmId,
  partyLedgerId,
  supabase,
  existingAllocations,
  voucherDate,
}: BillWiseDetailsModalProps) {
  const [rows, setRows] = useState<AllocationRow[]>([{ ...EMPTY_ROW }]);
  const [pendingBills, setPendingBills] = useState<OutstandingBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPendingFor, setShowPendingFor] = useState<number | null>(null);

  // Fetch outstanding bills when modal opens
  useEffect(() => {
    if (!open || !partyLedgerId || !firmId) return;

    let cancelled = false;
    const fetchBills = async () => {
      setLoading(true);
      try {
        const bills = await apiRequest<OutstandingBill[]>(
          supabase,
          "/api/vouchers/outstanding-bills",
          { query: { firm_id: firmId, party_ledger_id: partyLedgerId } },
        );
        if (!cancelled) setPendingBills(bills);
      } catch (err) {
        if (!cancelled) setPendingBills([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchBills();
    return () => { cancelled = true; };
  }, [open, firmId, partyLedgerId, supabase]);

  // Hydrate from existing allocations
  useEffect(() => {
    if (!open) return;
    if (existingAllocations.length > 0) {
      setRows(
        existingAllocations.map((a) => ({
          ref_type: a.ref_type,
          ref_name: a.ref_name,
          amount: a.amount,
          due_date: a.due_date || "",
        })),
      );
    } else {
      setRows([{ ...EMPTY_ROW }]);
    }
  }, [open, existingAllocations]);

  const allocatedTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.amount || 0), 0),
    [rows],
  );
  const remaining = Math.round((totalAmount - allocatedTotal) * 100) / 100;

  const updateRow = useCallback(
    (index: number, patch: Partial<AllocationRow>) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    },
    [],
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return [{ ...EMPTY_ROW }];
      return prev.filter((_, i) => i !== index);
    });
    setShowPendingFor(null);
  }, []);

  const selectPendingBill = useCallback(
    (rowIndex: number, bill: OutstandingBill) => {
      updateRow(rowIndex, {
        ref_type: "Agst Ref",
        ref_name: bill.ref_name,
        amount: Math.min(bill.balance, remaining + (rows[rowIndex]?.amount || 0)),
        due_date: bill.due_date,
      });
      setShowPendingFor(null);
    },
    [updateRow, remaining, rows],
  );

  const handleSave = () => {
    const validRows = rows.filter((r) => r.ref_name && r.amount > 0);
    if (validRows.length === 0) {
      onSave([]);
      onClose();
      return;
    }

    const allocations: BillAllocationState[] = validRows.map((r) => ({
      ref_type: r.ref_type,
      ref_name: r.ref_name,
      amount: r.amount,
      amount_type: allocationAmountType,
      due_date: r.due_date || voucherDate,
    }));
    onSave(allocations);
    onClose();
  };

  // Filter out bills already picked in other rows
  const usedRefNames = useMemo(
    () => new Set(rows.map((r) => r.ref_name).filter(Boolean)),
    [rows],
  );

  const getAvailableBills = useCallback(
    (currentRowName: string) =>
      pendingBills.filter(
        (b) => !usedRefNames.has(b.ref_name) || b.ref_name === currentRowName,
      ),
    [pendingBills, usedRefNames],
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/40 backdrop-blur-sm transition-opacity">
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bill-wise Details</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-2 text-indigo-600 font-medium border border-indigo-100/50 text-base">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {partyName}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700 font-medium border border-emerald-100/50 text-base">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Up to: <span className="font-bold">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 flex flex-col gap-6">
          
          {/* Allocations Rows Area */}
          <div className="flex flex-col gap-6">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Type of Ref */}
                <div className="w-full sm:w-[240px] shrink-0">
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Type of Ref</label>
                  <div className="relative">
                    <select
                      className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-lg font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={row.ref_type}
                      onChange={(e) => {
                        const newType = e.target.value as BillRefType;
                        updateRow(index, {
                          ref_type: newType,
                          ref_name: newType === "On Account" ? `On Account` : newType === "Advance" ? `ADV-${index + 1}` : "",
                        });
                        if (newType === "Agst Ref") {
                          setShowPendingFor(index);
                        } else {
                          setShowPendingFor(null);
                        }
                      }}
                    >
                      {REF_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </div>
                </div>

                {/* Reference Name */}
                <div className="w-full sm:flex-1 relative">
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Reference Name</label>
                  {row.ref_type === "Agst Ref" ? (
                    <button
                      type="button"
                      className="flex h-14 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 text-lg outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      onClick={() => setShowPendingFor(showPendingFor === index ? null : index)}
                    >
                      <span className={row.ref_name ? "text-slate-800 font-medium" : "text-slate-400"}>
                        {row.ref_name || "Select pending bill..."}
                      </span>
                      <svg className={`h-6 w-6 transition-transform duration-200 ${showPendingFor === index ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  ) : (
                    <input
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-lg text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={row.ref_name}
                      onChange={(e) => updateRow(index, { ref_name: e.target.value })}
                      placeholder={
                        row.ref_type === "New Ref" ? "Enter reference name..."
                        : row.ref_type === "Advance" ? "Advance reference..."
                        : "On Account"
                      }
                      readOnly={row.ref_type === "On Account"}
                    />
                  )}
                </div>

                {/* Amount */}
                <div className="w-full sm:w-[200px] shrink-0">
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Amount</label>
                  <input
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-lg text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    type="number"
                    step="0.01"
                    value={row.amount || ""}
                    onChange={(e) => updateRow(index, { amount: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>

                {/* Due Date */}
                <div className="w-full sm:w-[200px] shrink-0">
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Due Date</label>
                  <DatePicker
                    value={row.due_date}
                    onChange={(val) => updateRow(index, { due_date: val })}
                  />
                </div>

                {/* Delete */}
                <div className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100"
                    onClick={() => removeRow(index)}
                  >
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Add Row Button */}
            <button
              type="button"
              className="mt-2 flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-white p-5 text-lg font-medium text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50"
              onClick={addRow}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              Add Allocation Row
            </button>
          </div>

          {/* Pending Bills Block */}
          {showPendingFor !== null && rows[showPendingFor] && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border-b border-slate-100 px-8 py-5 flex items-center gap-3 text-orange-600 font-bold text-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Pending Bills
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-sm font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-8 py-5 font-bold">#</th>
                      <th className="px-8 py-5 font-bold">Reference Name</th>
                      <th className="px-8 py-5 font-bold">Bill Date</th>
                      <th className="px-8 py-5 font-bold">Due Date</th>
                      <th className="px-8 py-5 font-bold text-right">Balance</th>
                      <th className="px-8 py-5 font-bold">Type</th>
                      <th className="px-5 py-5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-10 text-center text-slate-400 text-lg">
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                            Loading pending bills...
                          </div>
                        </td>
                      </tr>
                    ) : getAvailableBills(rows[showPendingFor].ref_name).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-10 text-center text-slate-400 text-lg">
                          No pending bills found.
                        </td>
                      </tr>
                    ) : (
                      getAvailableBills(rows[showPendingFor].ref_name).map((bill, idx) => (
                        <tr 
                          key={bill.ref_name} 
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => selectPendingBill(showPendingFor, bill)}
                        >
                          <td className="px-8 py-5">
                            <div className="inline-flex h-9 px-5 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700">
                              {(idx + 1).toString().padStart(2, '0')}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-lg font-medium text-slate-800">{bill.ref_name}</td>
                          <td className="px-8 py-5 text-lg text-slate-500">
                            {new Date(bill.bill_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-8 py-5 text-lg text-slate-500">
                            {new Date(bill.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-8 py-5 text-right text-lg font-bold text-slate-900">
                            ₹{bill.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`font-bold text-sm tracking-wider ${bill.balance_type === "Dr" ? "text-rose-500" : "text-orange-500"}`}>
                              {bill.balance_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-right">
                            <button className="text-slate-400 hover:text-slate-600">
                              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Summary Card */}
            <div className="flex items-center gap-10 px-8 py-5 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-slate-500 text-lg font-medium mb-1">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" /> Allocated
                </div>
                <div className="font-bold text-slate-900 text-3xl">
                  ₹{allocatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-px h-14 bg-slate-200" />
              <div>
                <div className="flex items-center gap-2 text-slate-500 text-lg font-medium mb-1">
                  <div className={`w-3 h-3 rounded-full ${remaining === 0 ? "bg-emerald-500" : remaining > 0 ? "bg-orange-500" : "bg-rose-500"}`} /> Remaining
                </div>
                <div className={`font-bold text-3xl ${remaining === 0 ? "text-emerald-600" : remaining > 0 ? "text-orange-500" : "text-rose-600"}`}>
                  ₹{Math.abs(remaining).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 sm:flex-none h-14 px-8 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-14 px-8 rounded-xl bg-[#2563eb] text-lg font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSave}
                disabled={remaining < 0}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Allocations
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
