// src/components/TrackedProducts.tsx
import { useEffect, useState } from "react";
import { listProducts, type Tracked } from "../api";
import PriceHistoryChart from "./PriceHistoryChart";

export default function TrackedProducts() {
  const [items, setItems] = useState<Tracked[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    try {
      setLoading(true);

      const data = await listProducts();

      // Sort newest first (helps keep the most recently tracked items visible).
      data.sort((a, b) => {
        const tA = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tB = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tB - tA;
      });

      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load tracked products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Tracked products</h2>
      </div>

      {error && (
        <div style={{ marginBottom: 12, color: "#b00020" }}>{error}</div>
      )}

      {loading ? (
        <div>Loading tracked products...</div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No products tracked yet.</div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 12,
            maxWidth: 800,
          }}
        >
          {items.map((p) => {
            const createdDate = p.createdAt
              ? new Date(p.createdAt).toLocaleString()
              : null;

            const lowestDate = p.lowestPriceDate
              ? new Date(p.lowestPriceDate).toLocaleDateString()
              : null;

            return (
              <li
                key={p._id}
                style={{
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {p.title ?? "Product"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {p.size ? `Size: ${p.size}` : "Size: not set"}
                    </div>
                  </div>

                  {/* Current price / analytics */}
                  <div style={{ textAlign: "right", minWidth: 180 }}>
                    <div style={{ fontWeight: 600 }}>
                      {p.lastPrice} {p.currency ?? ""}
                    </div>

                    {p.initialPrice != null && (
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                        Initial: {p.initialPrice} {p.currency ?? ""}
                      </div>
                    )}

                    {p.changeFromInitialPercent != null && (
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                        Change:&nbsp;
                        <span
                          style={{
                            color:
                              p.changeFromInitialPercent > 0
                                ? "#b00020" // more expensive = red
                                : p.changeFromInitialPercent < 0
                                ? "#0b8b34" // cheaper = green
                                : "#555",
                          }}
                        >
                          {p.changeFromInitialPercent > 0 ? "+" : ""}
                          {p.changeFromInitialPercent}%
                        </span>
                      </div>
                    )}

                    {p.dropFromInitialPercent != null &&
                      p.dropFromInitialPercent > 0 && (
                        <div style={{ fontSize: 13, opacity: 0.8 }}>
                          Discount vs initial: {p.dropFromInitialPercent}%
                        </div>
                      )}
                  </div>
                </div>

                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {p.lowestPrice != null && (
                    <span>
                      Lowest: {p.lowestPrice} {p.currency ?? ""}{" "}
                      {lowestDate && `on ${lowestDate}`}
                    </span>
                  )}
                </div>

                {(p.targetPrice != null || p.targetDiscountPercent != null) && (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Alerts:&nbsp;
                    {p.targetPrice != null && (
                      <span>
                        price ≤ {p.targetPrice}
                        {p.currency ? ` ${p.currency}` : ""}
                      </span>
                    )}
                    {p.targetPrice != null &&
                      p.targetDiscountPercent != null && <span> · </span>}
                    {p.targetDiscountPercent != null && (
                      <span>discount ≥ {p.targetDiscountPercent}%</span>
                    )}
                  </div>
                )}

                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginTop: 4, fontSize: 13 }}
                >
                  {p.url}
                </a>

                {p.priceHistory && p.priceHistory.length > 0 && (
                  <PriceHistoryChart
                    history={p.priceHistory}
                    currency={p.currency}
                  />
                )}

                {createdDate && (
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    Tracking since {createdDate}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
