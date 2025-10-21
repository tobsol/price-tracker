import { useState } from "react";
import { previewProduct, addProduct } from "../api";

type Preview = {
  title?: string;
  price: number;
  currency?: string;
  url: string;
};

export default function AddProductForm({ onTracked }: { onTracked?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const data = await previewProduct(url.trim());
      setPreview(data);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await addProduct(url.trim());
      setUrl("");
      setPreview(null);
      onTracked?.(); // parent can refresh list
    } catch (err: any) {
      setError(err?.message ?? "Could not add product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <form onSubmit={handlePreview}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste product URL (e.g. https://www.loepeshop.no/...)"
          style={{
            width: 480,
            maxWidth: "100%",
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 10,
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            marginLeft: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            opacity: loading || !url.trim() ? 0.6 : 1,
            cursor: loading || !url.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Checking..." : "Preview"}
        </button>
        <button
          type="button"
          onClick={handleTrack}
          disabled={loading || !url.trim()}
          style={{
            marginLeft: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #0a7",
            background: "#0a7",
            color: "white",
            opacity: loading || !url.trim() ? 0.6 : 1,
            cursor: loading || !url.trim() ? "not-allowed" : "pointer",
          }}
        >
          Start tracking
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div>
      )}

      {preview && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #e5e5e5",
            borderRadius: 10,
          }}
        >
          <div style={{ fontWeight: 600 }}>{preview.title ?? "Product"}</div>
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
