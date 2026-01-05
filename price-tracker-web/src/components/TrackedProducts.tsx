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

  function formatCurrency(value: number | null | undefined, currency?: string) {
    if (value == null) return null;
    return `${value} ${currency ?? ""}`.trim();
  }

  function percentColor(v: number) {
    if (v > 0) return "#b00020"; // more expensive = red
    if (v < 0) return "#0b8b34"; // cheaper = green
    return "#555";
  }

  const styles: Record<string, React.CSSProperties> = {
    section: { marginTop: 18 },
    headerRow: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10,
    },
    title: { margin: 0 },
    sub: { margin: 0, opacity: 0.7, fontSize: "0.95rem" },

    error: { marginBottom: 12, color: "#b00020", fontWeight: 650 },

    grid: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: 12,
    },

    card: {
      borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "#fff",
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },

    topRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },

    name: { fontWeight: 750, lineHeight: 1.25 },
    meta: { fontSize: 13, opacity: 0.75, marginTop: 4 },

    badges: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    badge: {
      fontSize: "0.85rem",
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "rgba(0,0,0,0.03)",
      opacity: 0.9,
      whiteSpace: "nowrap",
    },

    kpiBox: {
      minWidth: 230,
      textAlign: "right",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12,
      padding: "10px 10px",
      background: "rgba(0,0,0,0.02)",
    },
    kpiMain: { fontWeight: 800, fontSize: "1.05rem" },
    kpiLine: { fontSize: 13, opacity: 0.85, marginTop: 3 },

    divider: { height: 1, background: "rgba(0,0,0,0.08)" },

    urlRow: {
      fontSize: 13,
      opacity: 0.85,
      display: "flex",
      gap: 8,
      alignItems: "baseline",
      flexWrap: "wrap",
    },
    urlLabel: { fontWeight: 700, opacity: 0.85 },
    urlLink: {
      fontSize: 13,
      textDecoration: "none",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: 760,
    },

    chartWrap: {
      marginTop: 2,
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12,
      padding: 10,
      background: "rgba(0,0,0,0.02)",
    },

    footerLine: { fontSize: 11.5, opacity: 0.65 },
    empty: {
      border: "1px dashed rgba(0,0,0,0.18)",
      borderRadius: 14,
      padding: 14,
      background: "rgba(0,0,0,0.02)",
      opacity: 0.9,
    },
    emptyTitle: { fontWeight: 750, marginBottom: 6 },
    emptyBody: { margin: 0, lineHeight: 1.5, opacity: 0.85 },
  };

  return (
    <div style={styles.section}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Tracked products</h2>
        <p style={styles.sub}>
          {items.length > 0 ? `${items.length} active` : ""}
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={{ opacity: 0.85 }}>Loading tracked products…</div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>Nothing tracked yet</div>
          <p style={styles.emptyBody}>
            Add a product URL above and set your alert. We’ll monitor it
            automatically on a schedule and email you when the price hits.
          </p>
        </div>
      ) : (
        <ul style={{ ...styles.grid, maxWidth: 900 }}>
          {items.map((p) => {
            const createdDate = p.createdAt
              ? new Date(p.createdAt).toLocaleString()
              : null;

            const lowestDate = p.lowestPriceDate
              ? new Date(p.lowestPriceDate).toLocaleDateString()
              : null;

            const current = formatCurrency(p.lastPrice, p.currency);
            const initial = formatCurrency(p.initialPrice, p.currency);
            const lowest = formatCurrency(p.lowestPrice, p.currency);

            return (
              <li key={p._id} style={styles.card}>
                <div style={styles.topRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.name}>{p.title ?? "Product"}</div>
                    <div style={styles.meta}>
                      {p.size ? `Size: ${p.size}` : "Size: not set"}
                    </div>

                    <div style={styles.badges}>
                      {p.targetPrice != null && (
                        <span style={styles.badge}>
                          Alert: price ≤{" "}
                          {formatCurrency(p.targetPrice, p.currency)}
                        </span>
                      )}
                      {p.targetDiscountPercent != null && (
                        <span style={styles.badge}>
                          Alert: discount ≥ {p.targetDiscountPercent}%
                        </span>
                      )}
                      {p.targetPrice == null && p.targetDiscountPercent == null && (
                        <span style={styles.badge}>No alerts set</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.kpiBox}>
                    <div style={styles.kpiMain}>{current ?? "—"}</div>

                    {initial && (
                      <div style={styles.kpiLine}>Initial: {initial}</div>
                    )}

                    {p.changeFromInitialPercent != null && (
                      <div style={styles.kpiLine}>
                        Change:{" "}
                        <span
                          style={{
                            color: percentColor(p.changeFromInitialPercent),
                            fontWeight: 750,
                          }}
                        >
                          {p.changeFromInitialPercent > 0 ? "+" : ""}
                          {p.changeFromInitialPercent}%
                        </span>
                      </div>
                    )}

                    {p.dropFromInitialPercent != null &&
                      p.dropFromInitialPercent > 0 && (
                        <div style={styles.kpiLine}>
                          Discount vs initial:{" "}
                          <span style={{ fontWeight: 750 }}>
                            {p.dropFromInitialPercent}%
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {(p.lowestPrice != null || p.lowestPriceDate != null) && (
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    <strong>Lowest:</strong>{" "}
                    {lowest ?? "—"}
                    {lowestDate ? ` (on ${lowestDate})` : ""}
                  </div>
                )}

                <div style={styles.urlRow}>
                  <span style={styles.urlLabel}>Link:</span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.urlLink}
                    title={p.url}
                  >
                    {p.url}
                  </a>
                </div>

                {p.priceHistory && p.priceHistory.length > 0 && (
                  <div style={styles.chartWrap}>
                    <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 6 }}>
                      Price history
                    </div>
                    <PriceHistoryChart history={p.priceHistory} currency={p.currency} />
                  </div>
                )}

                {createdDate && (
                  <div style={styles.footerLine}>
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
