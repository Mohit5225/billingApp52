import { RefObject, Dispatch, SetStateAction } from "react";
import { JournalLineState, EMPTY_JOURNAL_LINE } from "../types";
import { ComboboxField } from "../../ComboboxField";

type JournalLinesTableProps = {
  journalLines: JournalLineState[];
  setJournalLines: Dispatch<SetStateAction<JournalLineState[]>>;
  allLedgerOptions: { value: string; label: string }[];
  readOnly: boolean;
  itemsScrollRef: RefObject<HTMLDivElement | null>;
};

export function JournalLinesTable({
  journalLines,
  setJournalLines,
  allLedgerOptions,
  readOnly,
  itemsScrollRef,
}: JournalLinesTableProps) {
  return (
    <div className="flex-1 flex flex-col min-h-[250px] border-b border-slate-100 bg-white">
      <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
        <div className="min-w-full md:min-w-[800px] flex flex-col flex-1">
          <div className="shrink-0 hidden grid-cols-[2fr_1fr_1fr_40px] gap-4 border-b border-slate-300 pl-4 pr-4 md:pl-5 md:pr-[calc(1.25rem+8px)] py-2.5 text-[17px] font-extrabold uppercase tracking-wider text-slate-800 bg-slate-50/50 backdrop-blur-sm md:grid">
            <div>Ledger</div>
            <div>Debit (Dr)</div>
            <div>Credit (Cr)</div>
            <div className="w-10" />
          </div>
          <div className="flex-1 custom-scrollbar" ref={itemsScrollRef}>
            <div className="divide-y divide-slate-100">
              {journalLines.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-4 p-4 transition-colors duration-100 md:grid-cols-[2fr_1fr_1fr_40px] md:items-center md:gap-4 md:p-5 md:py-2.5 scroll-mt-14"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--voucher-row-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  <div className="col-span-2 md:col-span-1 flex flex-col md:block">
                    <span className="mb-1 text-[17px] font-extrabold uppercase tracking-wider text-slate-600 md:hidden">
                      Ledger
                    </span>
                    <ComboboxField
                      inline
                      value={line.ledger_id}
                      onChange={(id) => {
                        setJournalLines((prev) => {
                          const newLines = prev.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, ledger_id: id } : entry
                          );
                          if (index === prev.length - 1 && id) {
                            newLines.push({ ...EMPTY_JOURNAL_LINE });
                          }
                          return newLines;
                        });
                      }}
                      options={allLedgerOptions}
                      placeholder="Type to search ledger…"
                      createHref="/dashboard/create/ledger"
                      disabled={readOnly}
                      dataItemField={true}
                      mandatory={index < 2 || !!line.ledger_id}
                    />
                  </div>
                  <div className="flex flex-col md:block">
                    <span className="mb-1 text-[17px] font-extrabold uppercase tracking-wider text-slate-600 md:hidden">
                      Debit
                    </span>
                    <input
                      disabled={readOnly || !line.ledger_id}
                      type="number"
                      step="0.01"
                      value={line.debit_amount || ""}
                      onChange={(e) =>
                        setJournalLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, debit_amount: Number(e.target.value), credit_amount: 0 }
                              : entry
                          )
                        )
                      }
                      placeholder="0.00"
                      className="mono-num h-12 w-full rounded-lg border border-transparent bg-transparent px-2 text-[17px] font-bold text-slate-900 outline-none transition-all hover:border-slate-500 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-12"
                    />
                  </div>
                  <div className="flex flex-col md:block">
                    <span className="mb-1 text-[17px] font-extrabold uppercase tracking-wider text-slate-600 md:hidden">
                      Credit
                    </span>
                    <input
                      disabled={readOnly || !line.ledger_id}
                      type="number"
                      step="0.01"
                      value={line.credit_amount || ""}
                      onChange={(e) =>
                        setJournalLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, credit_amount: Number(e.target.value), debit_amount: 0 }
                              : entry
                          )
                        )
                      }
                      placeholder="0.00"
                      className="mono-num h-12 w-full rounded-lg border border-transparent bg-transparent px-2 text-[17px] font-bold text-slate-900 outline-none transition-all hover:border-slate-500 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-12"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center">
                    {!readOnly && (
                      <button
                        data-skip-enter="true"
                        onClick={() =>
                          setJournalLines((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
                        }
                        title="Remove line"
                        className="flex h-12 w-11 md:h-7 md:w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                      >
                        <svg
                          className="h-5 w-5 md:h-4 md:w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="shrink-0 border-t border-slate-100 px-5 py-3">
              {!readOnly && (
                <button
                  data-skip-enter="true"
                  onClick={() => setJournalLines((prev) => [...prev, { ...EMPTY_JOURNAL_LINE }])}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[17px] font-bold text-tally-600 transition-colors hover:bg-tally-50 hover:text-tally-700"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Accounting Line
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
