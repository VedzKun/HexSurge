// Added for HexSurge feature: Surge Recommendation Sidebar
import { AnimatePresence, motion } from "framer-motion";

const COLOR_MAP = {
  red: { dot: "#ff2200", label: "HOT" },
  orange: { dot: "#ff6600", label: "WARM" },
  green: { dot: "#48c774", label: "COOL" },
};

// Derive a human-readable reason from zone data
function getReason(zone) {
  if (zone.influenced_by_neighbors) return "Spillover from adjacent zones";
  if (zone.demand_count >= 10) return "High order concentration";
  if (zone.demand_count >= 5) return "Moderate demand pressure";
  return "Elevated activity detected";
}

export default function SurgeSidebar({ zones, suggestions }) {
  // Top 5 zones by surge multiplier descending
  const hotZones = [...zones]
    .filter((z) => z.heatmap_color === "red" || z.heatmap_color === "orange")
    .sort((a, b) => b.surge_multiplier - a.surge_multiplier)
    .slice(0, 5);

  return (
    <section className="surge-sidebar brutal-border">
      <h2 className="sidebar-title">Surge Zones</h2>

      {/* Top 5 Hot Zones */}
      <div className="surge-list">
        {hotZones.length === 0 ? (
          <p className="muted">No surge zones active right now.</p>
        ) : (
          <AnimatePresence mode="popLayout">
            {hotZones.map((zone, idx) => {
              const meta = COLOR_MAP[zone.heatmap_color] ?? COLOR_MAP.orange;
              return (
                <motion.div
                  key={zone.cell}
                  className="surge-row brutal-border"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, delay: idx * 0.05 }}
                  layout
                >
                  <span
                    className="surge-dot"
                    style={{ background: meta.dot }}
                    title={meta.label}
                  />
                  <div className="surge-info">
                    <span className="surge-area">{zone.area_name}</span>
                    <span className="surge-reason">{getReason(zone)}</span>
                  </div>
                  <span className="surge-mult" style={{ color: meta.dot }}>
                    {zone.surge_multiplier.toFixed(2)}x
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Rider Moves */}
      {suggestions.length > 0 && (
        <>
          <h2 className="sidebar-title" style={{ marginTop: "14px" }}>
            Rider Moves
          </h2>
          <div className="move-list">
            <AnimatePresence mode="popLayout">
              {suggestions.slice(0, 5).map((m, idx) => (
                <motion.div
                  key={`${m.from_area}-${m.to_area}-${idx}`}
                  className="move-row brutal-border"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, delay: idx * 0.05 }}
                  layout
                >
                  <span>
                    Move <strong>{m.riders}</strong>{" "}
                    <span className="muted">
                      {m.from_area} → {m.to_area}
                    </span>
                  </span>
                  <span className="muted move-reason">{m.reason}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  );
}
