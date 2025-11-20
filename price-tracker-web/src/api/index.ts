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

// Helpful warnings if envs are missing (dev only)
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_API_URL) {
    console.warn(
      "[api] VITE_API_URL not set, falling back to http://localhost:3001"
    );
  }
  if (!ADMIN_TOKEN) {
    console.warn(
      "[api] VITE_ADMIN_TOKEN not set; tickNow() without token may fail"
    );
  }
}

console.debug("[api] API_BASE =", API_BASE);

// ----- Types that match the Mongo-backed API -----

export type PriceHistoryPoint = {
  price: number;
  checkedAt: string;
};

export type Tracked = {
  _id: string; // Mongo ObjectId
  url: string;
  title?: string;
  currency?: string;
  size?: string;

  lastPrice: number;
  initialPrice?: number;
  lowestPrice?: number;
  lowestPriceDate?: string;
  dropFromInitialPercent?: number;
  changeFromInitialPercent?: number; // signed +/-

  targetPrice?: number;
  targetDiscountPercent?: number;
  lastNotifiedPrice?: number;

  priceHistory?: PriceHistoryPoint[];

  updatedAt?: string; // from Mongoose timestamps
  createdAt?: string;
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
  emailed: number;
  at: string;
};

export type AddProductPayload = {
  url: string;
  size?: string;
  targetPrice?: number;
  targetDiscountPercent?: number;
};

// ----- API helpers -----

// preview a product without saving it
export async function previewProduct(url: string) {
  const res = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Preview failed: ${res.status} ${text || res.statusText}`);
  }

  return (await res.json()) as PreviewResponse;
}

// add a product to track (Mongo persistence)
export async function addProduct(payload: AddProductPayload) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Add product failed: ${res.status} ${text || res.statusText}`);
  }

  return (await res.json()) as Tracked;
}

// list tracked products
export async function listProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List products failed: ${res.status} ${text || res.statusText}`);
  }
  return (await res.json()) as Tracked[];
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

  return (await res.json()) as TickResponse;
}
