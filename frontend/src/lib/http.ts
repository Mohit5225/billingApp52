import type { SupabaseClient } from "@supabase/supabase-js";

import { getApiBaseUrl } from "./api";

type QueryValue = string | number | boolean | null | undefined;

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${getApiBaseUrl()}${path}`);
  if (!query) return url.toString();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiRequest<T>(
  supabase: SupabaseClient,
  path: string,
  options: ApiRequestOptions = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("No active session");
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        message = String(parsed.detail);
      }
    } catch {
      // Keep raw text if not JSON
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
