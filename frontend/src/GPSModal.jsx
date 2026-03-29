// Added for HexSurge feature: Add Live GPS Point Modal
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function GPSModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ lat: "13.0104", lng: "80.2206", company_id: "fleet-a" });
  const [localError, setLocalError] = useState("");

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setLocalError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setLocalError("Longitude must be between -180 and 180.");
      return;
    }
    setLocalError("");
    await onSubmit({ lat, lng, company_id: form.company_id || "fleet-a" });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="modal-panel brutal-border"
            role="dialog"
            aria-modal="true"
            aria-label="Add Live GPS Point"
            initial={{ opacity: 0, scale: 0.9, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -20 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="modal-header">
              <h2>Add Live GPS Point</h2>
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close"
                disabled={busy}
              >
                ✕
              </button>
            </div>

            <p className="muted modal-sub">
              Ingest a real-time GPS coordinate into the HexSurge pipeline.
            </p>

            <div className="modal-form">
              <label className="modal-label">
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="13.0827"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  disabled={busy}
                />
              </label>
              <label className="modal-label">
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="80.2707"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  disabled={busy}
                />
              </label>
              <label className="modal-label">
                <span>Company ID</span>
                <input
                  type="text"
                  placeholder="fleet-a"
                  value={form.company_id}
                  onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}
                  disabled={busy}
                />
              </label>
            </div>

            {localError && <p className="status-line error">{localError}</p>}

            <div className="modal-actions">
              <motion.button
                className="btn-orange"
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy ? "Ingesting…" : "Ingest GPS Point"}
              </motion.button>
              <motion.button
                className="btn-white"
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
