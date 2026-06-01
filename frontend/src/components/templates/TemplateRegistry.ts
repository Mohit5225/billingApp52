import type { TemplateRegistryEntry } from "./types";
import ClassicTemplate from "./ClassicTemplate";

/**
 * Central registry of all available invoice templates.
 * Add new templates here — the settings page and preview system
 * will automatically pick them up.
 */
export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional bordered layout with HSN breakdown, bank details, and signature block. Clean, professional, and print-optimized.",
    component: ClassicTemplate,
  },
];

/** Get a template by its ID. Falls back to the first template. */
export function getTemplateById(id: string): TemplateRegistryEntry {
  return TEMPLATE_REGISTRY.find((t) => t.id === id) ?? TEMPLATE_REGISTRY[0];
}
