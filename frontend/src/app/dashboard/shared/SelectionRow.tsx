import React from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "./useLongPress";

interface SelectionRowProps {
  id: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: (id: string) => void;
  onLongPress: (id: string) => void;
  onClickHref?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SelectionRow({
  id,
  isSelected,
  isSelectionMode,
  onToggle,
  onLongPress,
  onClickHref,
  children,
  className = "",
}: SelectionRowProps) {
  const router = useRouter();

  const handleLongPress = () => {
    onLongPress(id);
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    // If the click originated from a button or anchor (other than our row itself),
    // we should probably let it propagate or not toggle selection.
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a:not(.selection-row-link)')) {
        return;
    }

    if (isSelectionMode) {
      e.preventDefault();
      onToggle(id);
    } else if (onClickHref) {
      router.push(onClickHref);
    }
  };

  const pressEvents = useLongPress(handleLongPress, handleClick);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      onToggle(id);
    } else if (e.key === "Enter" && !isSelectionMode && onClickHref) {
      router.push(onClickHref);
    }
  };

  return (
    <div
      {...pressEvents}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative flex items-center gap-4 rounded-3xl border p-5 shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
        isSelected
          ? "bg-emerald-50/50 border-emerald-300"
          : "bg-white/92 border-slate-100 hover:border-emerald-200"
      } ${className}`}
    >
      {isSelectionMode && (
        <div className="shrink-0 pl-1">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
              isSelected
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 bg-white"
            }`}
          >
            {isSelected && (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
