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
    <div
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #ddd",
        maxWidth: 640,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Add a product to track</h2>
      <p style={{ marginTop: 4, marginBottom: 16, opacity: 0.8 }}>
        Paste a product URL, optionally set your size and alert thresholds.
      </p>

      <form onSubmit={handlePreview}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontWeight: 500 }}>
            Product URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.loepeshop.no/..."
              style={{
                marginTop: 4,
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 10,
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <label style={{ flex: "1 1 120px", minWidth: 120 }}>
              Size (optional)
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. EU 42"
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </label>

            <label style={{ flex: "1 1 140px", minWidth: 140 }}>
              Target price (optional)
              <input
                type="number"
                inputMode="decimal"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 1200"
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </label>

            <label style={{ flex: "1 1 160px", minWidth: 160 }}>
              Target discount % (optional)
              <input
                type="number"
                inputMode="decimal"
                value={targetDiscountPercent}
                onChange={(e) => setTargetDiscountPercent(e.target.value)}
                placeholder="e.g. 25"
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "white",
                opacity: loading || !url.trim() ? 0.6 : 1,
                cursor: loading || !url.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Working..." : "Preview"}
            </button>
            <button
              type="button"
              onClick={handleTrack}
              disabled={loading || !url.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "white",
                color: "#111",
                opacity: loading || !url.trim() ? 0.6 : 1,
                cursor: loading || !url.trim() ? "not-allowed" : "pointer",
              }}
            >
              Start tracking
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: 12, color: "#b00020" }}>
          {error}
        </div>
      )}

      {preview && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px dashed #ddd",
          }}
        >
          <div style={{ fontWeight: 600 }}>{preview.title ?? "Preview"}</div>
          <div style={{ marginTop: 4 }}>
            Current price: {preview.price} {preview.currency ?? ""}
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 8, display: "inline-block" }}
          >
            View product
          </a>
        </div>
      )}
    </div>
  );
}
