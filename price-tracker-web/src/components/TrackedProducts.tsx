// src/components/TrackedProducts.tsx
import { useEffect, useState } from "react";
import { listProducts, tickNow } from "../api";

export type Tracked = {
  _id: string;          // <-- Mongo ObjectId
  url: string;
  title?: string;
  currency?: string;
  lastPrice: number;
  updatedAt?: string;   // (optional) from Mongoose timestamps
};

export default function TrackedProducts() {
  const [items, setItems] = useState<Tracked[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickMsg, setTickMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await listProducts();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load products");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleTick() {
    setLoading(true);
    setTickMsg(null);
    setError(null);
    try {
      const res = await tickNow("manual");
      setTickMsg(`Checked ${res.checked} items — ${res.drops} price drop(s) detected`);
      await load(); // refresh list after tick
    } catch (e: any) {
      setError(e?.message ?? "Tick failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Tracked products</h2>
        <button
          onClick={handleTick}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#333",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Re-checking…" : "Re-check now"}
        </button>
      </div>

      {tickMsg && <div style={{ marginTop: 8, color: "#0a7" }}>{tickMsg}</div>}
      {error && <div style={{ marginTop: 8, color: "#b00020" }}>{error}</div>}

      {items.length === 0 ? (
        <div style={{ marginTop: 12, opacity: 0.7 }}>
          No products yet — add one above to start tracking.
        </div>
      ) : (
        <ul style={{ marginTop: 12, paddingLeft: 16 }}>
          {items.map((p) => (
            <li key={p._id || p.url} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{p.title ?? "Product"}</div>
              <div style={{ opacity: 0.85 }}>
                Current price: {p.lastPrice} {p.currency ?? ""}
              </div>
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
