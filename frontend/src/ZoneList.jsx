import { motion } from "framer-motion";

export default function ZoneList({ zones }) {
  return (
    <aside className="zones-panel brutal-border">
      <h2>Live Zone Board</h2>
      <div className="zones-scroll">
        {zones.length === 0 ? (
          <p className="muted">No live data yet. Add a GPS point or run dinner rush.</p>
        ) : (
          zones.map((zone) => (
            <motion.div
              key={zone.cell}
              className={`zone-row ${zone.heatmap_color} brutal-border`}
              animate={zone.heatmap_color === "red" ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
              transition={zone.heatmap_color === "red" ? { repeat: Infinity, duration: 1.2 } : { duration: 0.2 }}
            >
              <span>{zone.area_name}</span>
              <span>{Math.round((zone.surge_multiplier - 1) * 100)}%</span>
            </motion.div>
          ))
        )}
      </div>
    </aside>
  );
}
