"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActiveFirm } from "./FirmProvider";

export type ComboboxOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** If true, the input takes full width with no label column */
  inline?: boolean;
  /** If provided, renders a small "+" icon link to open the create page */
  createHref?: string;
  /** If provided, renders a "+" icon link ONLY when the user's typed input does not match any options, after a debounce delay */
  dynamicCreateHref?: string;
  disabled?: boolean;
  dataItemField?: boolean;
  mandatory?: boolean;
  compact?: boolean;
  leftIcon?: React.ReactNode;
  chevron?: boolean;
};

export function ComboboxField({ label, value, onChange, options, placeholder = "Type to search…", inline = false, createHref, dynamicCreateHref, disabled, dataItemField, mandatory, compact = false, leftIcon, chevron }: Props) {
  const { activeFirmId } = useActiveFirm();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const createBtnRef = useRef<HTMLAnchorElement>(null);

  /* Keep the display text in sync when the external value changes */
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const displayValue = open ? query : (value ? selectedLabel : query);

  const filtered = query.trim() === ""
    ? options
    : options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false),
      );

  const [showDynamicCreate, setShowDynamicCreate] = useState(false);

  /* Reset highlight whenever the filtered list changes */
  useEffect(() => {
    setHighlighted(-1);
  }, [query]);

  /* Handle dynamic create button visibility */
  useEffect(() => {
    setShowDynamicCreate(false);
    if (!dynamicCreateHref || query.trim() === "") return;

    const t = setTimeout(() => {
      if (filtered.length === 0) {
        setShowDynamicCreate(true);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [query, filtered.length, dynamicCreateHref]);

  /* Scroll highlighted item into view */
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  /* Close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    /* If the user starts typing, clear the selection so they can pick a new one */
    if (value) onChange("");
  }

  function handleSelect(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    
    // Use setTimeout to guarantee React has committed the DOM updates,
    // and explicitly pass the input element as the origin to prevent focus loss issues.
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.dispatchEvent(
          new CustomEvent("tally-focus-next", { 
            bubbles: true, 
            detail: { origin: inputRef.current } 
          })
        );
      }
    }, 10);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // If Enter on closed combobox with no value selected: open dropdown to force user to pick
      if (e.key === "Enter" && !value) {
        e.preventDefault();
        e.stopPropagation(); // Prevent useFocusTraversal from calling focusNext
        setOpen(true);
        return;
      }
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h === -1 ? 0 : h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, -1));
        break;
      case "Enter":
        if (open) {
          if (highlighted !== -1 && filtered[highlighted]) {
            e.preventDefault();
            handleSelect(filtered[highlighted]);
          } else {
            e.preventDefault();
            
            if (filtered.length === 0 && dynamicCreateHref) {
              setShowDynamicCreate(true);
              setTimeout(() => {
                createBtnRef.current?.focus();
              }, 10);
            } else {
              setOpen(false);
              // If they didn't select anything, just pass through/skip
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.dispatchEvent(
                    new CustomEvent("tally-focus-next", { 
                      bubbles: true, 
                      detail: { origin: inputRef.current } 
                    })
                  );
                }
              }, 10);
            }
          }
          return;
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        break;
      case "Tab":
        if (open) {
          e.preventDefault();
          if (highlighted !== -1 && filtered[highlighted]) {
            handleSelect(filtered[highlighted]);
          } else {
            setOpen(false);
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.dispatchEvent(
                  new CustomEvent("tally-focus-next", { 
                    bubbles: true, 
                    detail: { origin: inputRef.current } 
                  })
                );
              }
            }, 10);
          }
        }
        break;
    }
  }

  let inputClasses = compact
    ? "h-10 w-full rounded-md border border-slate-400 bg-white px-2.5 text-[15px] font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.15]"
    : "h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-[16px] font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.15]";

  if (leftIcon) inputClasses += " pl-9";
  if (chevron) inputClasses += " pr-9";

  const getHrefWithFirm = (href: string) => {
    if (!href || !activeFirmId) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}firm_id=${activeFirmId}`;
  };

  const renderCreateBtn = () => {
    if (disabled) return null;
    if (createHref) {
      return (
        <Link
          href={getHrefWithFirm(createHref)}
          title="Create new"
          data-skip-enter="true"
          className={`flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 ${compact ? "h-10 w-10" : "h-11 w-11"}`}
        >
          <svg className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      );
    }
    if (dynamicCreateHref && showDynamicCreate && open) {
      const baseHref = getHrefWithFirm(dynamicCreateHref);
      const finalHref = `${baseHref}${baseHref.includes('?') ? '&' : '?'}search=${encodeURIComponent(query)}`;
      return (
        <Link
          ref={createBtnRef}
          href={finalHref}
          title="Create new item"
          data-skip-enter="true"
          className={`flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${compact ? "h-10 w-10" : "h-11 w-11"}`}
        >
          <svg className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      );
    }
    return null;
  };

  if (inline) {
    return (
      <div ref={containerRef} data-dropdown-open={open} className="relative flex w-full items-center gap-1">
        <div className="relative flex-1">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={inputClasses}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            data-item-field={dataItemField ? "true" : undefined}
            data-mandatory={mandatory || query.trim() !== "" ? "true" : undefined}
            data-empty={!value ? "true" : undefined}
          />
          {chevron && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          )}
          {open && filtered.length > 0 && !disabled && (
            <Dropdown listRef={listRef} filtered={filtered} highlighted={highlighted} onSelect={handleSelect} onHighlight={setHighlighted} />
          )}
          {open && query && filtered.length === 0 && !disabled && <EmptyState />}
        </div>
        {renderCreateBtn()}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-dropdown-open={open} className="relative flex flex-col sm:flex-row sm:items-center">
      {label && (
        <label className="mb-1 shrink-0 text-[13px] font-bold text-slate-700 sm:mb-0 sm:w-1/3">{label}</label>
      )}
      <div className="relative flex w-full items-center gap-1 sm:w-2/3">
        <div className="relative flex-1">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={inputClasses}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            data-item-field={dataItemField ? "true" : undefined}
            data-mandatory={mandatory || query.trim() !== "" ? "true" : undefined}
            data-empty={!value ? "true" : undefined}
          />
          {chevron && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          )}
          {open && filtered.length > 0 && !disabled && (
            <Dropdown listRef={listRef} filtered={filtered} highlighted={highlighted} onSelect={handleSelect} onHighlight={setHighlighted} />
          )}
          {open && query && filtered.length === 0 && !disabled && <EmptyState />}
        </div>
        {renderCreateBtn()}
      </div>
    </div>
  );
}

function Dropdown({
  listRef,
  filtered,
  highlighted,
  onSelect,
  onHighlight,
}: {
  listRef: React.RefObject<HTMLUListElement | null>;
  filtered: ComboboxOption[];
  highlighted: number;
  onSelect: (o: ComboboxOption) => void;
  onHighlight: (i: number) => void;
}) {
  return (
    <ul
      ref={listRef}
      className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[400px] lg:max-h-[500px] overflow-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl"
    >
      {filtered.map((option, i) => (
        <li
          key={option.value}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(option);
          }}
          onMouseEnter={() => onHighlight(i)}
          className={`cursor-pointer select-none px-3 py-2 text-sm transition-colors ${
            i === highlighted
              ? "border-l-2 border-tally-500 bg-tally-50 pl-2.5 text-tally-900 font-medium"
              : "border-l-2 border-transparent text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="font-medium">{option.label}</span>
          {option.sublabel && (
            <span className="ml-2 text-xs text-slate-400">{option.sublabel}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-slate-100 bg-white px-3 py-4 text-center text-sm text-slate-400 shadow-xl">
      No matches found
    </div>
  );
}
