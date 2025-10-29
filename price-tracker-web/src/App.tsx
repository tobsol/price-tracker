import AddProductForm from "./components/AddProductForm";
import TrackedProducts from "./components/TrackedProducts";
import { useState } from "react";

function App() {
  // simple key toggle to force the list to reload after adding a product
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>🏃‍♂️ Running Shoe Price Tracker</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>React + TypeScript + Vite</p>

      <AddProductForm onTracked={() => setReloadKey((k) => k + 1)} />
      {/* key forces TrackedProducts to remount and reload */}
      <div key={reloadKey}>
        <TrackedProducts />
      </div>
    </div>
  );
}

export default App;
