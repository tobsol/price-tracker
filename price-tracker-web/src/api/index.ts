// src/api/index.ts
import { API_BASE_URL } from "../config";

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
  changeFromInitialPercent?: number; // signed +/- (can be negative)

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

export type AddProductPayload = {
  url: string;
  size?: string;
  targetPrice?: number;
  targetDiscountPercent?: number;
};

// ----- Admin token helper (LOCAL ONLY) -----

const ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined)?.trim();

function adminHeaders() {
  return ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {};
}

function assertAdminToken(action: string) {
  if (!ADMIN_TOKEN) {
    throw new Error(
      `${action} is disabled in the public demo. Set VITE_ADMIN_TOKEN in price-tracker-web/.env.local to enable admin actions locally.`
    );
  }
}

// ----- API helpers -----

// Preview a product without saving it (ADMIN ONLY)
export async function previewProduct(url: string) {
  assertAdminToken("Preview");

  const res = await fetch(`${API_BASE_URL}/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders(),
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Preview failed: ${res.status} ${text || res.statusText}`);
  }

  return (await res.json()) as PreviewResponse;
}

// Add a product to track (Mongo persistence) (ADMIN ONLY)
export async function addProduct(payload: AddProductPayload) {
  assertAdminToken("Add product");

  const res = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Add product failed: ${res.status} ${text || res.statusText}`
    );
  }

  return (await res.json()) as Tracked;
}

// List tracked products (PUBLIC)
export async function listProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `List products failed: ${res.status} ${text || res.statusText}`
    );
  }

  return (await res.json()) as Tracked[];
}
