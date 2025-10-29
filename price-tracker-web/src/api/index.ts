// src/api/index.ts

// ---- Base URL + token (with normalization) ----
function normalizeBase(base?: string) {
  const b = (base || "").trim();
  if (!b) return "http://localhost:3001";
  // must start with http/https
  if (!/^https?:\/\//i.test(b)) return "http://localhost:3001";
  // strip trailing slashes
  return b.replace(/\/+$/, "");
}

const API_BASE = normalizeBase(import.meta.env.VITE_API_URL as string | undefined);
const ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) || "";

// Helpful warnings if envs are missing
if (!import.meta.env.VITE_API_URL) {
  console.warn("[api] VITE_API_URL is not set; using default:", API_BASE);
}
if (!ADMIN_TOKEN) {
  console.warn(
    "[api] VITE_ADMIN_TOKEN is not set; /admin/tick will 401 unless you pass a token explicitly."
  );
}

console.debug("[api] API_BASE =", API_BASE);

// ----- Types that match the Mongo-backed API -----
export type Tracked = {
  _id: string; // Mongo ObjectId
  url: string;
  title?: string;
  currency?: string;
  lastPrice: number;
  updatedAt?: string; // from Mongoose timestamps
  createdAt?: string;
  // priceHistory?: { price: number; checkedAt: string }[]; // optional if you surface it
};

export type PreviewResponse = {
  title?: string;
  price: number;
  currency?: string;
  url: string;
};

export type TickResponse = {
  ok: boolean;
  reason: string;
  checked: number;
  drops: number;
  totalTracked: number;
  emailed?: number;
  at: string; // ISO string
};

// ----- API functions -----

// preview a URL (no persistence)
export async function previewProduct(url: string) {
  const res = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Preview failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<PreviewResponse>;
}

// add a product to track (Mongo persistence)
export async function addProduct(url: string) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Add product failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<Tracked>;
}

// list tracked products
export async function listProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error(`List products failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<Tracked[]>;
}

// manually re-check all products (Authorization + tiny JSON body)
export async function tickNow(reason: string = "manual", token?: string) {
  const auth = token ?? ADMIN_TOKEN;

  const res = await fetch(`${API_BASE}/admin/tick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tick failed: ${res.status} ${text || res.statusText}`);
  }

  return res.json() as Promise<TickResponse>;
}
