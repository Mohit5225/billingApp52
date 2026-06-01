"use client";

import { useState, useEffect, useCallback } from "react";
import { TEMPLATE_REGISTRY, getTemplateById } from "@/components/templates/TemplateRegistry";
import { MOCK_INVOICE_DATA } from "@/components/templates/mockData";
import type { TemplateRegistryEntry } from "@/components/templates/types";

const STORAGE_KEY = "billingApp_defaultTemplate";

function getStoredDefault(): string {
  if (typeof window === "undefined") return TEMPLATE_REGISTRY[0].id;
  return localStorage.getItem(STORAGE_KEY) ?? TEMPLATE_REGISTRY[0].id;
}

export default function BillTemplatePage() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRegistryEntry | null>(null);

  useEffect(() => {
    setSelectedId(getStoredDefault());
  }, []);

  const setAsDefault = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const openPreview = (template: TemplateRegistryEntry) => {
    setPreviewTemplate(template);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">Configure Bill Template</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a default invoice template for your firm. Click a template to preview it with sample data.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_REGISTRY.map((template) => {
          const isDefault = template.id === selectedId;
          const TemplateComp = template.component;

          return (
            <div
              key={template.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all duration-200 hover:shadow-xl ${
                isDefault
                  ? "border-tally-500 ring-2 ring-tally-500/20 shadow-lg"
                  : "border-slate-200 hover:border-tally-300"
              }`}
            >
              {/* Default badge */}
              {isDefault && (
                <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-tally-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  DEFAULT
                </div>
              )}

              {/* Live Thumbnail — CSS-scaled actual template render */}
              <button
                onClick={() => openPreview(template)}
                className="relative w-full cursor-pointer overflow-hidden bg-slate-50 transition-transform duration-200"
                style={{ height: "280px" }}
                title={`Preview ${template.name} template`}
              >
                <div
                  style={{
                    transform: "scale(0.32)",
                    transformOrigin: "top left",
                    width: "210mm",
                    minHeight: "297mm",
                    pointerEvents: "none",
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                  }}
                >
                  <TemplateComp data={MOCK_INVOICE_DATA} />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/40">
                  <span className="scale-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition-transform duration-200 group-hover:scale-100">
                    <svg className="mr-1.5 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Preview
                  </span>
                </div>
              </button>

              {/* Info + Action */}
              <div className="flex flex-col gap-3 p-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{template.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{template.description}</p>
                </div>
                {!isDefault && (
                  <button
                    onClick={() => setAsDefault(template.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tally-50 px-4 py-2.5 text-sm font-semibold text-tally-700 transition-all hover:bg-tally-100 hover:text-tally-800 active:scale-[0.98]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Set as Default
                  </button>
                )}
                {isDefault && (
                  <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tally-500/10 px-4 py-2.5 text-sm font-semibold text-tally-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Currently Active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════ FULL-SCREEN PREVIEW MODAL ═══════════ */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          isDefault={previewTemplate.id === selectedId}
          onSetDefault={() => {
            setAsDefault(previewTemplate.id);
          }}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Full-screen preview modal with Print button
───────────────────────────────────────────────── */
function PreviewModal({
  template,
  isDefault,
  onSetDefault,
  onClose,
}: {
  template: TemplateRegistryEntry;
  isDefault: boolean;
  onSetDefault: () => void;
  onClose: () => void;
}) {
  const TemplateComp = template.component;

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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/80 backdrop-blur-sm">
      {/* Top bar — no-print so it doesn't appear on printed page */}
      <div className="no-print flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white sm:text-base">
            Preview: {template.name}
          </h2>
          {isDefault && (
            <span className="rounded-full bg-tally-500/20 px-2.5 py-0.5 text-[11px] font-bold text-tally-300 ring-1 ring-tally-500/30">
              DEFAULT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <button
              onClick={onSetDefault}
              className="flex items-center gap-1.5 rounded-lg bg-tally-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-tally-500 active:scale-[0.97]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Set as Default
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable preview area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: "210mm" }}>
          <TemplateComp data={MOCK_INVOICE_DATA} />
        </div>
      </div>
    </div>
  );
}
