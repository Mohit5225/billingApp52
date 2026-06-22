import { useState, useCallback } from "react";

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      
      if (next.size === 0) {
        setIsSelectionMode(false);
      } else {
        setIsSelectionMode(true);
      }
      
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    if (ids.length > 0) {
      setIsSelectionMode(true);
    } else {
      setIsSelectionMode(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback((id?: string) => {
    setIsSelectionMode(true);
    if (id) {
      setSelectedIds(new Set([id]));
    }
  }, []);

  return {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
  };
}
