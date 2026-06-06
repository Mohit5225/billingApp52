"use client";

import { useEffect, useCallback } from "react";

const FOCUSABLE_SELECTOR = [
  "input:not([disabled]):not([readonly])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])[data-entry-action]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(", ");

export function useFocusTraversal(containerRef: React.RefObject<HTMLElement | null>) {
  const focusElement = useCallback((element: HTMLElement | undefined) => {
    if (!element) return;
    element.focus();

    // Scroll the element into view within ALL scrollable ancestors.
    // We walk the entire ancestor chain so that both the inner items scroll
    // container AND the outer voucher-container are scrolled as needed.
    requestAnimationFrame(() => {
      let node: HTMLElement | null = element.parentElement;
      while (node) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
          const parentRect = node.getBoundingClientRect();
          const elRect = element.getBoundingClientRect();
          const elTop = elRect.top - parentRect.top + node.scrollTop;
          const elBottom = elTop + elRect.height;
          const visTop = node.scrollTop;
          const visBottom = visTop + node.clientHeight;

          if (elTop < visTop) {
            // Element is above the visible area — scroll up with a small buffer
            node.scrollTop = elTop - 8;
          } else if (elBottom > visBottom) {
            // Element is below the visible area — scroll down
            node.scrollTop = elBottom - node.clientHeight + 8;
          }
          // Do NOT break — continue walking up to scroll all ancestors
        }
        node = node.parentElement;
      }
    });

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      try {
        (element as HTMLInputElement | HTMLTextAreaElement).select();
      } catch {
        // Some input types like date do not support select().
      }
    }
  }, []);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    const elements = Array.from(
      containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
    ) as HTMLElement[];
    
    // Filter out skipped elements and invisible elements
    return elements.filter((el) => {
      // Check if it's explicitly skipped or inside a skipped container
      if (el.closest("[data-skip-enter]")) return false;
      // offsetWidth/offsetHeight is a more robust visibility check than offsetParent
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
      return true;
    });
  }, [containerRef]);

  const focusPrevious = useCallback(() => {
    const focusable = getFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    
    if (!activeElement || !focusable.includes(activeElement)) {
      return;
    }

    const currentIndex = focusable.indexOf(activeElement);
    const prevElement = focusable[currentIndex - 1];
    
    if (prevElement) {
      focusElement(prevElement);
    }
  }, [focusElement, getFocusableElements]);

  const focusNext = useCallback((originElement?: HTMLElement) => {
    const focusable = getFocusableElements();
    const activeElement = originElement || (document.activeElement as HTMLElement);
    
    if (!activeElement || !focusable.includes(activeElement)) {
      return;
    }

    if (activeElement.hasAttribute("data-mandatory")) {
      let isEmpty = false;
      if (activeElement.hasAttribute("data-empty")) {
        isEmpty = activeElement.getAttribute("data-empty") === "true";
      } else if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        isEmpty = (activeElement as HTMLInputElement).value.trim() === "";
      }
      if (isEmpty) {
        // Visual feedback
        activeElement.classList.remove("animate-shake");
        void activeElement.offsetWidth;
        activeElement.classList.add("animate-shake");
        // Block moving forward
        return;
      }
    }

    // Tally Escaping: If moving forward from an empty Item field, break out of grid to Narration
    if (activeElement.hasAttribute("data-item-field")) {
      let isEmpty = false;
      if (activeElement.hasAttribute("data-empty")) {
        isEmpty = activeElement.getAttribute("data-empty") === "true";
      } else if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        isEmpty = (activeElement as HTMLInputElement).value.trim() === "";
      }
      if (isEmpty) {
        const escapeTarget = containerRef.current?.querySelector("[data-escape-target=\"true\"]") as HTMLElement;
        if (escapeTarget) {
          focusElement(escapeTarget);
          return;
        }
      }
    }

    const currentIndex = focusable.indexOf(activeElement);
    const nextElement = focusable[currentIndex + 1];
    
    if (nextElement) {
      focusElement(nextElement);
    }
  }, [focusElement, getFocusableElements]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement || !container?.contains(activeElement)) return;

      // Explicit < and > shortcuts for forced sideways navigation (useful for number inputs)
      if (
        (e.key === ">" || e.key === "<") &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const isComboboxOpen = Boolean(activeElement.closest("[data-dropdown-open=\"true\"]"));
        if (!isComboboxOpen && activeElement.tagName !== "TEXTAREA") {
          e.preventDefault();
          if (e.key === ">") focusNext();
          else focusPrevious();
          return;
        }
      }

      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const isComboboxOpen = Boolean(activeElement.closest("[data-dropdown-open=\"true\"]"));
        if (!isComboboxOpen) {
          if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
            const inputEl = activeElement as HTMLInputElement;
            const inputType = "type" in inputEl ? inputEl.type : "";
            if (inputType === "number" || inputType === "date") {
              e.preventDefault();
              if (e.key === "ArrowLeft") focusPrevious();
              if (e.key === "ArrowRight") focusNext();
              return;
            }

            try {

              const isAllSelected = inputEl.value.length > 0 && inputEl.selectionStart === 0 && inputEl.selectionEnd === inputEl.value.length;
              if (isAllSelected) {
                e.preventDefault();
                if (e.key === "ArrowLeft") focusPrevious();
                if (e.key === "ArrowRight") focusNext();
                return;
              }

              if (e.key === "ArrowLeft" && inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
                e.preventDefault();
                focusPrevious();
                return;
              }
              if (e.key === "ArrowRight" && inputEl.selectionStart === inputEl.value.length && inputEl.selectionEnd === inputEl.value.length) {
                e.preventDefault();
                focusNext();
                return;
              }
            } catch {
              // Fallback for inputs that throw on selectionStart
              e.preventDefault();
              if (e.key === "ArrowLeft") focusPrevious();
              if (e.key === "ArrowRight") focusNext();
              return;
            }
          }
        }
      }

      if (e.key === "Backspace") {
        if (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA"
        ) {
          const inputEl = activeElement as HTMLInputElement | HTMLTextAreaElement;
          if (inputEl.tagName === "TEXTAREA") {
            if (inputEl.value === "") {
              e.preventDefault();
              focusPrevious();
            }
            return;
          }

          const isCombobox = activeElement.closest("[data-dropdown-open]");
          const isOpenCombobox = activeElement.closest("[data-dropdown-open=\"true\"]");
          const inputType = "type" in inputEl ? inputEl.type : "";
          
          // Remove closed combobox immediate jump logic so backspace can erase text natively.

          let atStart = false;
          let deleteThenMoveBack = false;
          try {
            const selectionStart = inputEl.selectionStart ?? 0;
            const selectionEnd = inputEl.selectionEnd ?? 0;
            const isAllSelected =
              inputEl.value.length > 0 &&
              selectionStart === 0 &&
              selectionEnd === inputEl.value.length;

            if (inputEl.value === "") {
              atStart = true;
            } else if (selectionStart === 0 && selectionEnd === 0) {
              atStart = true;
            } else if (
              (isAllSelected || (selectionStart === inputEl.value.length && selectionEnd === inputEl.value.length)) &&
              inputEl.value.length <= 1
            ) {
              deleteThenMoveBack = true;
            }
          } catch {
            atStart = inputEl.value === "";
          }

          if (isOpenCombobox && inputEl.value !== "") {
            atStart = false; // Actively typing in open combobox, don't jump back
          }

          if (deleteThenMoveBack) {
            requestAnimationFrame(() => {
              if (document.activeElement === inputEl && inputEl.value === "") {
                focusPrevious();
              }
            });
            return;
          }

          if (!atStart) {
            return; // Let native backspace delete text
          }
        }

        e.preventDefault();
        focusPrevious();
      }

      if (e.key === "Tab") {
        const isComboboxOpen = Boolean(activeElement.closest("[data-dropdown-open=\"true\"]"));
        if (isComboboxOpen) {
          // Handled by ComboboxField React onKeyDown
          return;
        }

        e.preventDefault();
        if (e.shiftKey) {
          focusPrevious();
        } else {
          // For item-field comboboxes: check mandatory + empty before moving forward
          if (activeElement.hasAttribute("data-item-field")) {
            const isEmpty = activeElement.getAttribute("data-empty") === "true" ||
                            (activeElement as HTMLInputElement).value.trim() === "";
            if (isEmpty) {
              if (activeElement.hasAttribute("data-mandatory")) {
                activeElement.classList.remove("animate-shake");
                void activeElement.offsetWidth;
                activeElement.classList.add("animate-shake");
                return;
              } else {
                const escapeTarget = container.querySelector("[data-escape-target=\"true\"]") as HTMLElement;
                if (escapeTarget) {
                  focusElement(escapeTarget);
                  return;
                }
              }
            }
          }
          focusNext();
        }
        return;
      }

      if (e.key === "Enter") {
        if (activeElement.tagName === "TEXTAREA") {
          if (e.shiftKey) {
            return; // let native shift+enter add new line
          }
          // Otherwise fall through and let Enter go to the next field (e.g., Save)
        }

        // If we're inside a combobox that is open, let the combobox handle Enter
        const comboboxContainer = activeElement.closest("[data-dropdown-open=\"true\"]");
        if (comboboxContainer) {
          return;
        }

        // For item-field comboboxes (whether open or closed): check mandatory + empty
        if (activeElement.hasAttribute("data-item-field")) {
          // A combobox is empty when data-empty="true" OR when no value label is displayed
          const isEmpty = activeElement.getAttribute("data-empty") === "true" ||
                          (activeElement as HTMLInputElement).value.trim() === "";
          if (isEmpty) {
            e.preventDefault();
            if (activeElement.hasAttribute("data-mandatory")) {
              // Mandatory — block and shake
              activeElement.classList.remove("animate-shake");
              void activeElement.offsetWidth;
              activeElement.classList.add("animate-shake");
            } else {
              // Non-mandatory empty item field — escape to narration
              const escapeTarget = container.querySelector("[data-escape-target=\"true\"]") as HTMLElement;
              if (escapeTarget) {
                focusElement(escapeTarget);
              }
            }
            return;
          }
        }

        if (activeElement.tagName === "BUTTON" && activeElement.hasAttribute("data-entry-action")) {
          // For buttons like "Save", Enter should trigger them naturally.
          return;
        }

        e.preventDefault();
        focusNext();
      }
    }

    function handleCustomNext(e: Event) {
      const customEvent = e as CustomEvent;
      const origin = customEvent.detail?.origin as HTMLElement | undefined;
      focusNext(origin);
    }

    // Use capturing phase so we can intercept before React synthetic events if needed, 
    // though bubbling is usually fine.
    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("tally-focus-next", handleCustomNext);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("tally-focus-next", handleCustomNext);
    };
  }, [containerRef, focusNext]);

  const initFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || (container.offsetWidth === 0 && container.offsetHeight === 0)) return;
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    });
  }, [containerRef, getFocusableElements]);

  return { initFocus, focusNext, focusPrevious };
}
