// Updated for HexSurge feature: Controls now triggers GPS Modal instead of inline form
import { motion } from "framer-motion";

export default function Controls({
  onOpenModal,
  onSimulate,
  onRefresh,
  busy,
  simulateCount,
  setSimulateCount,
  statusMessage,
  error,
  showSupply,
  setShowSupply,
  showDemand,
  setShowDemand,
}) {
  return (
    <section className="controls brutal-border">
      <div className="controls-head">
        <h2>Control Panel</h2>
        <select value={simulateCount} onChange={(e) => setSimulateCount(Number(e.target.value))} disabled={busy}>
          <option value={10}>Simulate 10</option>
          <option value={15}>Simulate 15</option>
          <option value={20}>Simulate 20</option>
          <option value={25}>Simulate 25</option>
          <option value={30}>Simulate 30</option>
        </select>
      </div>

      {/* Added for HexSurge feature: Supply & Demand Layer Toggles */}
      <div className="layer-toggles">
        <span className="toggle-title">Map Layers:</span>
        <label className="layer-check">
          <input type="checkbox" checked={showSupply} onChange={(e) => setShowSupply(e.target.checked)} />
          <span className="supply-dot" />
          Supply (Riders)
        </label>
        <label className="layer-check">
          <input type="checkbox" checked={showDemand} onChange={(e) => setShowDemand(e.target.checked)} />
          <span className="demand-dot" />
          Demand (Orders)
        </label>
      </div>

      <div className="button-row">
        {/* Added for HexSurge feature: Opens GPS Modal instead of inline form */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ borderColor: "#ff6600" }}
          className="btn-orange"
          onClick={onOpenModal}
          disabled={busy}
        >
          + Add Live GPS Point
        </motion.button>

        {/* Simulate Dinner Rush — triggers bulk Chennai-area simulation */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="btn-white"
          onClick={onSimulate}
          disabled={busy}
          title="Adds realistic Chennai-area GPS points to simulate dinner rush"
        >
          🍛 Dinner Rush ({simulateCount} pts)
        </motion.button>

        <motion.button whileTap={{ scale: 0.96 }} className="btn-white" onClick={onRefresh} disabled={busy}>
          ↺ Refresh Now
        </motion.button>
      </div>

      <p className={`status-line ${error ? "error" : ""}`}>{statusMessage}</p>
    </section>
  );
}
