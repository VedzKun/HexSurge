// DriversPanel.jsx — Admin panel: live drivers online + zone list
// Added for HexSurge Driver View feature
import { AnimatePresence, motion } from "framer-motion";

export default function DriversPanel({ drivers }) {
  const online = drivers.length;

  return (
    <section className="drivers-panel brutal-border">
      <div className="dp-header">
        <h2 className="dp-title">Drivers Online</h2>
        <motion.span
          key={online}
          className="dp-count"
          initial={{ scale: 1.4, color: "#48c774" }}
          animate={{ scale: 1, color: "#ffffff" }}
          transition={{ duration: 0.4 }}
        >
          {online}
        </motion.span>
      </div>

      <div className="dp-list">
        {online === 0 ? (
          <p className="muted" style={{ padding: "10px 0" }}>No drivers active right now.</p>
        ) : (
          <AnimatePresence mode="popLayout">
            {drivers.map((d, idx) => (
              <motion.div
                key={d.driver_id}
                className="dp-row brutal-border"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                layout
              >
                <span className="dp-dot" />
                <div className="dp-info">
                  <span className="dp-name">{d.driver_id}</span>
                  <span className="dp-zone muted">{d.area_name ?? "—"}</span>
                </div>
                <span className="dp-time muted">
                  {d.last_seen ? relativeTime(d.last_seen) : ""}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function relativeTime(isoOrEpoch) {
  try {
    const ts = typeof isoOrEpoch === "number"
      ? isoOrEpoch * 1000
      : new Date(isoOrEpoch).getTime();
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  } catch {
    return "";
  }
}
