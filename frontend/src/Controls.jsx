import { motion } from "framer-motion";

export default function Controls({
  onAddPoint,
  onSimulate,
  onRefresh,
  busy,
  form,
  setForm,
  simulateCount,
  setSimulateCount,
  statusMessage,
  error,
}) {
  return (
    <section className="controls brutal-border">
      <div className="controls-head">
        <h2>Add Live GPS Point</h2>
        <select value={simulateCount} onChange={(e) => setSimulateCount(Number(e.target.value))} disabled={busy}>
          <option value={10}>Simulate 10</option>
          <option value={15}>Simulate 15</option>
          <option value={20}>Simulate 20</option>
        </select>
      </div>
      <div className="form-grid">
        <input
          type="number"
          step="0.000001"
          placeholder="Latitude"
          value={form.lat}
          onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
        />
        <input
          type="number"
          step="0.000001"
          placeholder="Longitude"
          value={form.lng}
          onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Company ID"
          value={form.company_id}
          onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}
        />
      </div>
      <div className="button-row">
        <motion.button whileTap={{ scale: 0.96 }} className="btn-orange" onClick={onAddPoint} disabled={busy}>
          Add Live GPS Point
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} className="btn-white" onClick={onSimulate} disabled={busy}>
          Simulate {simulateCount} Points
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} className="btn-white" onClick={onRefresh} disabled={busy}>
          Refresh Now
        </motion.button>
      </div>
      <p className={`status-line ${error ? "error" : ""}`}>{statusMessage}</p>
    </section>
  );
}
