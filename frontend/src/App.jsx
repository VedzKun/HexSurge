import { useCallback, useEffect, useMemo, useState } from "react";

import { addGpsPoint, fetchRiderSuggestions, fetchStatsAdvanced, fetchZonesAdvanced, simulateDinnerRush } from "./api";
import AdvancedControls from "./AdvancedControls";
import Controls from "./Controls";
import LiveStats from "./LiveStats";
import MapView from "./Map";
import ZoneList from "./ZoneList";

export default function App() {
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Live updates every 4 seconds.");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [simulateCount, setSimulateCount] = useState(10);
  const [h3Res, setH3Res] = useState(9);
  const [mode, setMode] = useState("now"); // now | next_hour
  const [timeTravel, setTimeTravel] = useState(false);
  const [travelDay, setTravelDay] = useState("yesterday");
  const [travelMinutes, setTravelMinutes] = useState(19 * 60 + 30); // 7:30 PM
  const [atTs, setAtTs] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [hoverZone, setHoverZone] = useState(null);
  const [form, setForm] = useState({ lat: "13.0104", lng: "80.2206", company_id: "fleet-a" });

  const computeAtTs = useCallback(() => {
    const now = new Date();
    const base = new Date(now);
    if (travelDay === "yesterday") base.setDate(base.getDate() - 1);
    base.setHours(0, 0, 0, 0);
    const target = new Date(base.getTime() + travelMinutes * 60 * 1000);
    return Math.floor(target.getTime() / 1000);
  }, [travelDay, travelMinutes]);

  const reload = useCallback(async () => {
    try {
      const effectiveAt = timeTravel ? atTs ?? computeAtTs() : null;
      const params = { res: h3Res, at: effectiveAt, window_minutes: 15, mode };
      const [zonesRes, statsRes, suggRes] = await Promise.all([
        fetchZonesAdvanced(params),
        fetchStatsAdvanced(params),
        fetchRiderSuggestions({ res: h3Res, at: effectiveAt, window_minutes: 15 }),
      ]);
      setZones(zonesRes.zones ?? []);
      setStats(statsRes ?? {});
      setSuggestions(suggRes.moves ?? []);
      setError(false);
      const stamp = new Date().toLocaleTimeString();
      setLastUpdatedAt(stamp);
      setStatusMessage(`Dashboard synced at ${stamp}`);
    } catch {
      setError(true);
      setStatusMessage("Connection issue: could not refresh data.");
    }
  }, [h3Res, mode, timeTravel, atTs, computeAtTs]);

  useEffect(() => {
    reload().catch(() => {});
    if (timeTravel) return undefined;
    const timer = setInterval(() => reload().catch(() => {}), 4000);
    return () => clearInterval(timer);
  }, [reload]);

  const onApplyTimeTravel = async () => {
    const ts = computeAtTs();
    setAtTs(ts);
    await reload();
    setStatusMessage(`Replaying ${travelDay} at ${Math.floor(travelMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(travelMinutes % 60).toString().padStart(2, "0")}`);
  };

  const onAddPoint = async () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError(true);
      setStatusMessage("Enter valid latitude/longitude before adding a point.");
      return;
    }

    try {
      setBusy(true);
      await addGpsPoint({ lat, lng, company_id: form.company_id || "fleet-a" });
      await reload();
      setStatusMessage("Point added successfully.");
      setError(false);
    } catch {
      setError(true);
      setStatusMessage("Failed to add point. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const onSimulate = async () => {
    try {
      setBusy(true);
      await simulateDinnerRush(simulateCount);
      await reload();
      setStatusMessage(`Simulated ${simulateCount} Chennai points.`);
      setError(false);
    } catch {
      setError(true);
      setStatusMessage("Simulation failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const heroMeta = useMemo(() => {
    if (!hoverZone) return "Hover or click a zone to inspect Chennai demand.";
    return `${hoverZone.area_name} | ${hoverZone.demand_count} active points | ${hoverZone.surge_multiplier}x surge`;
  }, [hoverZone]);

  return (
    <main className="app">
      <header className="hero brutal-border">
        <h1>HexSurge</h1>
        <p>{heroMeta}</p>
        {lastUpdatedAt ? <p>Last updated: {lastUpdatedAt}</p> : null}
      </header>

      <LiveStats stats={stats} />

      <AdvancedControls
        h3Res={h3Res}
        setH3Res={setH3Res}
        mode={mode}
        setMode={setMode}
        timeTravel={timeTravel}
        setTimeTravel={setTimeTravel}
        travelDay={travelDay}
        setTravelDay={setTravelDay}
        travelMinutes={travelMinutes}
        setTravelMinutes={setTravelMinutes}
        onApplyTimeTravel={onApplyTimeTravel}
      />

      <section className="layout-grid">
        <MapView zones={zones} onHoverZone={setHoverZone} />
        <ZoneList zones={zones} />
      </section>

      <section className="suggestions brutal-border">
        <h2>Rider Assignment Suggestion</h2>
        {suggestions.length === 0 ? (
          <p className="muted">No moves needed right now.</p>
        ) : (
          suggestions.slice(0, 5).map((m, idx) => (
            <div key={`${m.from_area}-${m.to_area}-${idx}`} className="move-row brutal-border">
              <span>
                Move <strong>{m.riders}</strong> riders from <strong>{m.from_area}</strong> → <strong>{m.to_area}</strong>
              </span>
              <span className="muted">{m.reason}</span>
            </div>
          ))
        )}
      </section>

      <Controls
        onAddPoint={onAddPoint}
        onSimulate={onSimulate}
        onRefresh={reload}
        busy={busy}
        form={form}
        setForm={setForm}
        simulateCount={simulateCount}
        setSimulateCount={setSimulateCount}
        statusMessage={statusMessage}
        error={error}
      />
    </main>
  );
}
