// src/config.ts
// Centralized frontend configuration (resolved at build time by Vite).

function normalizeBaseUrl(value?: string): string {
  const base = (value ?? "").trim();

  // Default to local API for development if env is not provided.
  if (!base) return "http://localhost:3001";

  // Only allow explicit http/https URLs (avoid accidental relative values).
  if (!/^https?:\/\//i.test(base)) return "http://localhost:3001";

  // Strip trailing slashes to avoid double-slash URLs.
  return base.replace(/\/+$/, "");
}

/**
 * Base URL for the backend API (e.g. https://price-tracker-api-xxxx.onrender.com).
 * Set via VITE_API_URL in Vite/Render.
 */
export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_URL as string | undefined
);

/**
 * Optional admin token for manual admin calls from the frontend.
 * Recommendation: DO NOT set this in production, because client-side env vars are public.
 */
export const ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) ?? "";

// Dev-only visibility to catch misconfiguration early.
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_API_URL) {
    console.warn("[config] VITE_API_URL not set; defaulting to http://localhost:3001");
  }
  if (!ADMIN_TOKEN) {
    console.warn("[config] VITE_ADMIN_TOKEN not set; admin calls may fail");
  }
  console.debug("[config] API_BASE_URL =", API_BASE_URL);
}
