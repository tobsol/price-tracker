import { useState } from "react";
import AddProductForm from "./components/AddProductForm";
import TrackedProducts from "./components/TrackedProducts";

function App() {
  // Forces TrackedProducts to refetch after a successful "add product" action.
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Running Shoe Price Tracker</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>React + TypeScript + Vite</p>

      <AddProductForm onTracked={() => setReloadKey((k) => k + 1)} />

      {/* Remount to refresh the list after adding a product */}
      <div key={reloadKey}>
        <TrackedProducts />
      </div>
    </div>
  );
}

export default App;
