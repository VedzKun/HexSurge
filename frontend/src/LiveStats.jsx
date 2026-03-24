import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

function AnimatedNumber({ value, suffix = "", decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 600;
    const initial = displayValue;
    const delta = value - initial;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(initial + delta * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted = useMemo(
    () => `${Number(displayValue).toFixed(decimals)}${suffix}`,
    [displayValue, decimals, suffix]
  );

  return <span>{formatted}</span>;
}

export default function LiveStats({ stats }) {
  const cards = [
    { title: "Total Live Points Today", value: stats.total_live_points_today ?? 0, suffix: "", decimals: 0 },
    { title: "Hot Zones Right Now", value: stats.hot_zones_right_now ?? 0, suffix: "", decimals: 0 },
    { title: "Average Surge Multiplier", value: stats.average_surge_multiplier ?? 1, suffix: "x", decimals: 2 },
    { title: "Riders Needed in Hot Zones", value: stats.riders_needed_hot_zones ?? 0, suffix: "", decimals: 0 },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <motion.article key={card.title} className="stat-card brutal-border" layout>
          <p className="stat-title">{card.title}</p>
          <h3 className="stat-value">
            <AnimatedNumber value={card.value} suffix={card.suffix} decimals={card.decimals} />
          </h3>
        </motion.article>
      ))}
    </section>
  );
}
