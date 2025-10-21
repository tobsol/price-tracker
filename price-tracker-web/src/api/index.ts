const API_BASE = "http://localhost:3001";

// preview a URL (already used)
export async function previewProduct(url: string) {
  const res = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return res.json() as Promise<{
    title?: string;
    price: number;
    currency?: string;
    url: string;
  }>;
}

// add a product to track (backend stores it in memory)
export async function addProduct(url: string) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Add product failed: ${res.status}`);
  return res.json() as Promise<{
    id: number;
    url: string;
    title?: string;
    currency?: string;
    lastPrice: number;
  }>;
}

// list tracked products
export async function listProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error(`List products failed: ${res.status}`);
  return res.json() as Promise<
    Array<{
      id: number;
      url: string;
      title?: string;
      currency?: string;
      lastPrice: number;
    }>
  >;
}

// manually re-check all products
export async function tickNow(token?: string) {
  const res = await fetch(`${API_BASE}/admin/tick`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Tick failed: ${res.status}`);
  return res.json() as Promise<{ checked: number; drops: number; totalTracked: number }>;
}
