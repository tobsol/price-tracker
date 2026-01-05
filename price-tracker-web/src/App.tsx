import { useState } from "react";
import AddProductForm from "./components/AddProductForm";
import TrackedProducts from "./components/TrackedProducts";

function App() {
  // Forces TrackedProducts to refetch after a successful "add product" action.
  const [reloadKey, setReloadKey] = useState(0);

  // Public Render build will NOT have this; your local dev will (via .env.local).
  const isAdmin = Boolean((import.meta.env.VITE_ADMIN_TOKEN as string | undefined)?.trim());

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      padding: "48px 20px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      background: "linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0))",
      color: "#111",
    },
    container: {
      maxWidth: 920,
      margin: "0 auto",
    },
    card: {
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      padding: 22,
    },
    header: {
      marginBottom: 18,
    },
    titleRow: {
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      flexWrap: "wrap",
    },
    title: {
      margin: 0,
      fontSize: "1.75rem",
      letterSpacing: "-0.02em",
    },
    subtitle: {
      margin: "10px 0 0",
      fontSize: "1.05rem",
      lineHeight: 1.5,
    },
    muted: {
      margin: "10px 0 0",
      opacity: 0.82,
      lineHeight: 1.55,
      maxWidth: 760,
    },
    divider: {
      height: 1,
      background: "rgba(0,0,0,0.08)",
      margin: "18px 0",
    },
    sectionTitle: {
      margin: "0 0 10px",
      fontSize: "0.95rem",
      fontWeight: 650,
      letterSpacing: "0.01em",
      textTransform: "uppercase",
      opacity: 0.75,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 10,
    },
    gridItem: {
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12,
      padding: 12,
      background: "rgba(0,0,0,0.02)",
    },
    gridItemTitle: {
      fontSize: "0.95rem",
      fontWeight: 650,
      margin: 0,
    },
    gridItemBody: {
      margin: "6px 0 0",
      opacity: 0.85,
      fontSize: "0.95rem",
      lineHeight: 1.45,
    },
    callout: {
      marginTop: 12,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(0,0,0,0.03)",
      borderRadius: 12,
      padding: "12px 14px",
    },
    calloutTitle: {
      fontWeight: 700,
      marginBottom: 6,
    },
    calloutBody: {
      margin: 0,
      opacity: 0.9,
      lineHeight: 1.5,
    },
    contentBlock: {
      marginTop: 14,
    },
    footer: {
      marginTop: 18,
      opacity: 0.65,
      fontSize: "0.95rem",
      textAlign: "center",
    },
    smallNote: {
      marginTop: 10,
      opacity: 0.75,
      fontSize: "0.95rem",
    },
    readOnlyBanner: {
      marginTop: 10,
      border: "1px solid rgba(0,0,0,0.10)",
      background: "rgba(0,0,0,0.03)",
      borderRadius: 12,
      padding: "10px 12px",
      opacity: 0.95,
      lineHeight: 1.5,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <header style={styles.header}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>👟 Running Shoe Price Tracker</h1>
            </div>

            <p style={styles.subtitle}>
              <strong>
                From endless refreshing to one timely alert — your size, your
                price, the moment it drops.
              </strong>
            </p>

            <p style={styles.muted}>
              Add a product link, set your target, and we’ll monitor it
              automatically in the background. When your condition is met,
              you’ll get an email — no manual checking, no noise.
            </p>

            {!isAdmin && (
              <div style={styles.readOnlyBanner}>
                <strong>Public demo is read-only.</strong> Product adds and
                previews are disabled on this hosted version to protect the
                database. For a full walkthrough, I can demo the admin flow
                locally.
              </div>
            )}
          </header>

          <div style={styles.divider} />

          <section>
            <div style={styles.sectionTitle}>How it works</div>

            <div
              style={{
                ...styles.grid,
                // Responsive fallback without CSS media queries:
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div style={styles.gridItem}>
                <p style={styles.gridItemTitle}>1) Paste a product URL</p>
                <p style={styles.gridItemBody}>
                  Add the running shoes you’re watching.
                </p>
              </div>

              <div style={styles.gridItem}>
                <p style={styles.gridItemTitle}>2) Set your alert</p>
                <p style={styles.gridItemBody}>
                  Choose a target price or a drop threshold.
                </p>
              </div>

              <div style={styles.gridItem}>
                <p style={styles.gridItemTitle}>3) Get notified</p>
                <p style={styles.gridItemBody}>
                  Scheduled checks run automatically. We email you when it hits.
                </p>
              </div>
            </div>

            <div style={styles.callout}>
              <div style={styles.calloutTitle}>No fake discounts</div>
              <p style={styles.calloutBody}>
                Most “–20%” banners compare against a short-lived, inflated high
                price. This tracker compares everything against the price when
                you started caring, so you don’t get tricked by fake discounts.
              </p>
            </div>
          </section>

          <div style={styles.contentBlock}>
            <div style={styles.sectionTitle}>Add a product</div>

            {isAdmin ? (
              <>
                <AddProductForm onTracked={() => setReloadKey((k) => k + 1)} />
                <div style={styles.smallNote}>
                  Tip: After you add a product, checks run automatically on a
                  schedule. You’ll receive an email when your alert triggers.
                </div>
              </>
            ) : (
              <div style={styles.smallNote}>
                Adding products is disabled in the hosted demo. Run locally with{" "}
                <code>VITE_ADMIN_TOKEN</code> to enable admin actions.
              </div>
            )}
          </div>

          <div style={styles.contentBlock}>
            <div style={styles.sectionTitle}>Tracked products</div>

            {/* Remount to refresh the list after adding a product */}
            <div key={reloadKey}>
              <TrackedProducts />
            </div>
          </div>

          <footer style={styles.footer}>
            Happy tracking — and may your next run be cheaper.
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
