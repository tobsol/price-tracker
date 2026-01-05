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

// ----- API helpers -----

// Preview a product without saving it
export async function previewProduct(url: string) {
  const res = await fetch(`${API_BASE_URL}/preview`, {
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

// Add a product to track (Mongo persistence)
export async function addProduct(payload: AddProductPayload) {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

// List tracked products
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
