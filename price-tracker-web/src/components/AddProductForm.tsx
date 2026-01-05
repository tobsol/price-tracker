import { useState } from "react";
import {
  previewProduct,
  addProduct,
  type PreviewResponse,
  type AddProductPayload,
} from "../api";

export default function AddProductForm({ onTracked }: { onTracked?: () => void }) {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetDiscountPercent, setTargetDiscountPercent] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const canSubmit = !loading && !!url.trim();

  const styles: Record<string, React.CSSProperties> = {
    card: {
      marginTop: 14,
      padding: 16,
      borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(0,0,0,0.02)",
    },
    title: {
      marginTop: 0,
      marginBottom: 6,
      fontSize: "1.1rem",
      letterSpacing: "-0.01em",
    },
    subtitle: {
      marginTop: 0,
      marginBottom: 14,
      opacity: 0.8,
      lineHeight: 1.5,
      maxWidth: 700,
    },
    formGrid: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    label: {
      fontWeight: 600,
      fontSize: "0.92rem",
      display: "block",
    },
    hint: {
      marginTop: 6,
      opacity: 0.75,
      fontSize: "0.92rem",
      lineHeight: 1.45,
    },
    input: {
      marginTop: 6,
      width: "100%",
      padding: "10px 12px",
      border: "1px solid rgba(0,0,0,0.18)",
      borderRadius: 12,
      background: "#fff",
      outline: "none",
    },
    inputSmall: {
      marginTop: 6,
      width: "100%",
      padding: "9px 10px",
      border: "1px solid rgba(0,0,0,0.18)",
      borderRadius: 12,
      background: "#fff",
      outline: "none",
    },
    row: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 2,
    },
    field: {
      flex: "1 1 180px",
      minWidth: 180,
    },
    actions: {
      marginTop: 12,
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
    },
    primaryBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #111",
      background: "#111",
      color: "#fff",
      fontWeight: 650,
      cursor: "pointer",
    },
    secondaryBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.25)",
      background: "#fff",
      color: "#111",
      fontWeight: 600,
      cursor: "pointer",
    },
    disabled: {
      opacity: 0.55,
      cursor: "not-allowed",
    },
    error: {
      marginTop: 12,
      color: "#b00020",
      fontWeight: 600,
    },
    previewBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "#fff",
    },
    previewTitle: {
      fontWeight: 750,
      marginBottom: 6,
      lineHeight: 1.35,
    },
    previewMeta: {
      opacity: 0.85,
      lineHeight: 1.5,
    },
    previewLink: {
      marginTop: 10,
      display: "inline-block",
      fontWeight: 650,
      textDecoration: "none",
    },
    note: {
      marginTop: 10,
      opacity: 0.72,
      fontSize: "0.92rem",
      lineHeight: 1.45,
    },
    badgeRow: {
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
    },
  };

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);
    setPreview(null);

    try {
      setLoading(true);
      const p = await previewProduct(trimmed);
      setPreview(p);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to preview product");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);

    const payload: AddProductPayload = {
      url: trimmed,
    };

    const sizeTrimmed = size.trim();
    if (sizeTrimmed) payload.size = sizeTrimmed;

    const tp = Number(targetPrice);
    if (!Number.isNaN(tp) && tp > 0) {
      payload.targetPrice = tp;
    }

    const td = Number(targetDiscountPercent);
    if (!Number.isNaN(td) && td > 0) {
      payload.targetDiscountPercent = td;
    }

    try {
      setLoading(true);
      await addProduct(payload);

      // reset form
      setUrl("");
      setSize("");
      setTargetPrice("");
      setTargetDiscountPercent("");
      setPreview(null);

      onTracked?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to add product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Add a product</h2>
      <p style={styles.subtitle}>
        Paste a product URL and (optionally) set your size and alert thresholds.
        We’ll monitor it automatically and email you when your condition is met.
      </p>

      <form onSubmit={handlePreview}>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Product URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.store.com/product/..."
              style={styles.input}
            />
          </label>

          <div style={styles.row}>
            <label style={{ ...styles.label, ...styles.field, fontWeight: 600 }}>
              Size (optional)
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. EU 42"
                style={styles.inputSmall}
              />
            </label>

            <label style={{ ...styles.label, ...styles.field, fontWeight: 600 }}>
              Target price (optional)
              <input
                type="number"
                inputMode="decimal"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 1200"
                style={styles.inputSmall}
              />
            </label>

            <label style={{ ...styles.label, ...styles.field, fontWeight: 600 }}>
              Target discount % (optional)
              <input
                type="number"
                inputMode="decimal"
                value={targetDiscountPercent}
                onChange={(e) => setTargetDiscountPercent(e.target.value)}
                placeholder="e.g. 25"
                style={styles.inputSmall}
              />
            </label>
          </div>

          <div style={styles.actions}>
            {/* Primary action */}
            <button
              type="button"
              onClick={handleTrack}
              disabled={!canSubmit}
              style={{
                ...styles.primaryBtn,
                ...(canSubmit ? {} : styles.disabled),
              }}
            >
              {loading ? "Working..." : "Start tracking"}
            </button>

            {/* Secondary action */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...styles.secondaryBtn,
                ...(canSubmit ? {} : styles.disabled),
              }}
            >
              {loading ? "Working..." : "Preview"}
            </button>
          </div>

          <div style={styles.note}>
            Scheduled checks run in the background. You do not need to refresh or re-check manually.
          </div>
        </div>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {preview && (
        <div style={styles.previewBox}>
          <div style={styles.previewTitle}>{preview.title ?? "Preview"}</div>

          <div style={styles.previewMeta}>
            <div>
              <strong>Current price:</strong> {preview.price} {preview.currency ?? ""}
            </div>
          </div>

          <div style={styles.badgeRow}>
            {size.trim() ? <span style={styles.badge}>Size: {size.trim()}</span> : null}
            {targetPrice.trim() ? (
              <span style={styles.badge}>Target price: {targetPrice.trim()}</span>
            ) : null}
            {targetDiscountPercent.trim() ? (
              <span style={styles.badge}>
                Target discount: {targetDiscountPercent.trim()}%
              </span>
            ) : null}
          </div>

          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            style={styles.previewLink}
          >
            View product →
          </a>

          <div style={styles.hint}>
            If everything looks correct, click <strong>Start tracking</strong>.
          </div>
        </div>
      )}
    </div>
  );
}
