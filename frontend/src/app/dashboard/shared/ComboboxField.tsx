"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  disabled?: boolean;
};

export function ComboboxField({ label, value, onChange, options, placeholder = "Type to search…", inline = false, createHref, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* Keep the display text in sync when the external value changes */
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const displayValue = open ? query : selectedLabel;

  const filtered = query.trim() === ""
    ? options
    : options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false),
      );

  /* Reset highlight whenever the filtered list changes */
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

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
        setQuery("");
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
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        return;
      }
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlighted]) handleSelect(filtered[highlighted]);
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        break;
      case "Tab":
        if (open && filtered[highlighted]) handleSelect(filtered[highlighted]);
        setOpen(false);
        break;
    }
  }

  const inputClasses =
    "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.15]";

  if (inline) {
    return (
      <div ref={containerRef} className="relative flex w-full items-center gap-1">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={inputClasses}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {open && filtered.length > 0 && !disabled && (
            <Dropdown listRef={listRef} filtered={filtered} highlighted={highlighted} onSelect={handleSelect} onHighlight={setHighlighted} />
          )}
          {open && query && filtered.length === 0 && !disabled && <EmptyState />}
        </div>
        {createHref && !disabled && (
          <Link
            href={createHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Create new"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col sm:flex-row sm:items-center">
      {label && (
        <label className="mb-1 shrink-0 text-sm font-medium text-slate-600 sm:mb-0 sm:w-1/3">{label}</label>
      )}
      <div className="relative flex w-full items-center gap-1 sm:w-2/3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={inputClasses}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {open && filtered.length > 0 && !disabled && (
            <Dropdown listRef={listRef} filtered={filtered} highlighted={highlighted} onSelect={handleSelect} onHighlight={setHighlighted} />
          )}
          {open && query && filtered.length === 0 && !disabled && <EmptyState />}
        </div>
        {createHref && !disabled && (
          <Link
            href={createHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Create new"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        )}
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
      className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl"
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
