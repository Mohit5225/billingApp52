"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getTemplateById } from "@/components/templates/TemplateRegistry";
import type { InvoiceData } from "@/components/templates/types";

/* ─────────────────────────────────────────────────
   Invoice Preview Overlay — renders live form data
   through the firm's default template
───────────────────────────────────────────────── */
export function InvoicePreviewOverlay({
  buildPreviewData,
  onClose,
}: {
  buildPreviewData: () => InvoiceData | null;
  onClose: () => void;
}) {
  const previewData = buildPreviewData();
  const templateId = typeof window !== "undefined" ? localStorage.getItem("billingApp_defaultTemplate") || "classic" : "classic";
  const template = getTemplateById(templateId);
  const TemplateComp = template.component;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    function calcScale() {
      const container = containerRef.current;
      if (!container) return;
      // Subtract padding: p-4 (32px) on mobile, p-8 (64px) on sm+
      const padding = window.innerWidth >= 640 ? 64 : 32;
      const availableWidth = container.clientWidth - padding;
      // 794px is A4 width in pixels at 96dpi
      setScale(Math.min(1, availableWidth / 794));
    }
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, []);

  if (!previewData) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-slate-600">Unable to generate preview. Make sure a firm is selected.</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-200">
            Close
          </button>
        </div>
      </div>
    );
  }

  const overlayContent = (
    <div id="invoice-preview-root" className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/90 backdrop-blur-sm print:static print:bg-white print:backdrop-blur-none">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body > *:not(#invoice-preview-root) {
            display: none !important;
          }
          html, body {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background-color: white !important;
          }
          #invoice-preview-root {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
          .print-reset {
            --preview-scale: 1 !important;
            transform: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            height: auto !important;
          }
          .print-scroll-reset {
            display: block !important;
            padding: 0 !important;
            overflow: visible !important;
            align-items: unset !important;
            flex-direction: unset !important;
          }
          .page-gap {
            display: none !important;
          }
          .page-wrapper {
            margin: 0 !important;
            box-shadow: none !important;
            min-height: auto !important;
            page-break-after: always;
          }
          .page-wrapper:last-child {
            page-break-after: avoid;
          }
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        @media screen {
          .page-wrapper {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          .page-gap {
            height: 32px;
            background: transparent;
          }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print print:hidden flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-3 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-base font-semibold text-white transition hover:bg-white/20 active:scale-[0.97] whitespace-nowrap sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span><span className="hidden sm:inline">Back to </span>Edit</span>
          </button>
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <h2 className="hidden text-base font-semibold text-white sm:block">
            Invoice Preview
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-base font-semibold text-white transition hover:bg-white/20 active:scale-[0.97] whitespace-nowrap sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span><span className="hidden sm:inline">Download </span>PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-tally-600 px-3 py-2 text-base font-semibold text-white shadow-md transition hover:bg-tally-500 active:scale-[0.97] whitespace-nowrap sm:gap-2 sm:px-6 sm:py-2.5 sm:text-base"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Scrollable preview — template renders its own page-wrapper divs */}
      <div ref={containerRef} className="print-scroll-reset flex-1 overflow-auto flex flex-col items-center p-4 sm:p-8">
        <div
          className="shrink-0 print-reset"
          style={{
            "--preview-scale": scale,
            width: "794px",
            transform: "scale(var(--preview-scale))",
            transformOrigin: "top left",
            marginRight: scale < 1 ? `${-(794 * (1 - scale))}px` : undefined,
          } as React.CSSProperties}
        >
          <TemplateComp data={previewData} />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlayContent, document.body);
}
