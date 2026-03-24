import { motion } from "framer-motion";

function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(mins % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
}

export default function AdvancedControls({
  h3Res,
  setH3Res,
  mode,
  setMode,
  timeTravel,
  setTimeTravel,
  travelDay,
  setTravelDay,
  travelMinutes,
  setTravelMinutes,
  onApplyTimeTravel,
}) {
  return (
    <section className="toggles">
      <article className="toggle-card brutal-border">
        <p className="toggle-title">H3 Resolution</p>
        <div className="range-row">
          <input
            type="range"
            min={8}
            max={10}
            step={1}
            value={h3Res}
            onChange={(e) => setH3Res(Number(e.target.value))}
          />
          <span className="pill">Res {h3Res}</span>
        </div>
        <p className="muted">8 = neighborhood, 9 = street, 10 = block</p>
      </article>

      <article className="toggle-card brutal-border">
        <p className="toggle-title">Heatmap Mode</p>
        <div className="button-row">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className={mode === "now" ? "btn-orange" : "btn-white"}
            onClick={() => setMode("now")}
          >
            Now
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className={mode === "next_hour" ? "btn-orange" : "btn-white"}
            onClick={() => setMode("next_hour")}
          >
            Next Hour
          </motion.button>
        </div>
        <p className="muted">Next Hour uses the model for forecasted intensity.</p>
      </article>

      <article className="toggle-card brutal-border">
        <p className="toggle-title">Time Travel</p>
        <div className="button-row">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className={timeTravel ? "btn-orange" : "btn-white"}
            onClick={() => setTimeTravel((v) => !v)}
          >
            {timeTravel ? "On" : "Off"}
          </motion.button>
          <select value={travelDay} onChange={(e) => setTravelDay(e.target.value)} disabled={!timeTravel}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
        </div>
        <div className="range-row">
          <input
            type="range"
            min={0}
            max={1439}
            step={1}
            value={travelMinutes}
            onChange={(e) => setTravelMinutes(Number(e.target.value))}
            disabled={!timeTravel}
          />
          <span className="pill">{minutesToHHMM(travelMinutes)}</span>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} className="btn-white" onClick={onApplyTimeTravel} disabled={!timeTravel}>
          Apply Replay
        </motion.button>
        <p className="muted">Replays demand using the previous 15 minutes window.</p>
      </article>
    </section>
  );
}

