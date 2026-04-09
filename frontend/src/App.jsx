// Updated for HexSurge: Added GPS Modal, Surge Sidebar, Supply/Demand layers, layer toggles
// Added for Driver View: Routes for /admin (default) and /driver, live driver dots on map
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Routes, Route } from "react-router-dom";

import { addGpsPoint, fetchDrivers, fetchRiderSuggestions, fetchStatsAdvanced, fetchZonesAdvanced, simulateDinnerRush } from "./api";
import AdvancedControls from "./AdvancedControls";
import Controls from "./Controls";
import DriversPanel from "./DriversPanel";
import DriverView from "./DriverView";
import GPSModal from "./GPSModal";
import LiveStats from "./LiveStats";
import MapView from "./Map";
import SurgeSidebar from "./SurgeSidebar";
import ZoneList from "./ZoneList";

// Added for HexSurge feature: Named Zones — H3-centroid-based lat/lng lookup for Chennai localities
const CHENNAI_AREA_COORDS = {
  "Tambaram":     { lat: 12.9249, lng: 80.1000 },
  "Chengalpattu": { lat: 12.6921, lng: 79.9754 },
  "Velachery":    { lat: 12.9815, lng: 80.2209 },
  "OMR":          { lat: 12.9010, lng: 80.2279 },
  "Guindy":       { lat: 13.0067, lng: 80.2206 },
  "Anna Nagar":   { lat: 13.0850, lng: 80.2101 },
  "Adyar":        { lat: 13.0063, lng: 80.2574 },
  "T-Nagar":      { lat: 13.0418, lng: 80.2341 },
  "Porur":        { lat: 13.0350, lng: 80.1570 },
  "Perambur":     { lat: 13.1175, lng: 80.2387 },
  "Sholinganallur": { lat: 12.9010, lng: 80.2279 },
  "Pallavaram":   { lat: 12.9675, lng: 80.1491 },
  "Chromepet":    { lat: 12.9516, lng: 80.1462 },
  "Kolathur":     { lat: 13.1175, lng: 80.2230 },
  "Ambattur":     { lat: 13.1143, lng: 80.1548 },
};

// Scatter points derived from zone H3 cell centroids approximation
function deriveScatterPoints(zones, filterFn, jitterSeed = 0) {
  return zones
    .filter(filterFn)
    .flatMap((zone) => {
      const coords = CHENNAI_AREA_COORDS[zone.area_name];
      const baseLat = coords ? coords.lat : 13.08 + (Math.sin(zone.cell?.length ?? 0) * 0.08);
      const baseLng = coords ? coords.lng : 80.27 + (Math.cos(zone.cell?.length ?? 0) * 0.08);
      const count = Math.min(zone.demand_count ?? 1, 6);
      return Array.from({ length: count }, (_, i) => {
        const ang = (i / count) * 2 * Math.PI + jitterSeed;
        const r = 0.003 + (i % 3) * 0.001;
        return {
          lat: baseLat + Math.sin(ang) * r,
          lng: baseLng + Math.cos(ang) * r,
          cell: zone.cell,
        };
      });
    });
}

// ── Admin Dashboard ──
function AdminDashboard() {
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Live updates every 4 seconds.");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [simulateCount, setSimulateCount] = useState(10);
  const [h3Res, setH3Res] = useState(9);
  const [mode, setMode] = useState("now");
  const [timeTravel, setTimeTravel] = useState(false);
  const [travelDay, setTravelDay] = useState("yesterday");
  const [travelMinutes, setTravelMinutes] = useState(19 * 60 + 30);
  const [atTs, setAtTs] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [hoverZone, setHoverZone] = useState(null);

  // Added for HexSurge feature: GPS Modal state
  const [showGPSModal, setShowGPSModal] = useState(false);

  // Added for HexSurge feature: Supply & Demand layer toggle states
  const [showSupply, setShowSupply] = useState(true);
  const [showDemand, setShowDemand] = useState(true);

  // Added for Driver View: live driver positions
  const [drivers, setDrivers] = useState([]);

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
      const [zonesRes, statsRes, suggRes, driversRes] = await Promise.all([
        fetchZonesAdvanced(params),
        fetchStatsAdvanced(params),
        fetchRiderSuggestions({ res: h3Res, at: effectiveAt, window_minutes: 15 }),
        fetchDrivers(),
      ]);
      setZones(zonesRes.zones ?? []);
      setStats(statsRes ?? {});
      setSuggestions(suggRes.moves ?? []);
      setDrivers(driversRes.drivers ?? []);
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
    setStatusMessage(
      `Replaying ${travelDay} at ${Math.floor(travelMinutes / 60).toString().padStart(2, "0")}:${(travelMinutes % 60).toString().padStart(2, "0")}`
    );
  };

  // Added for HexSurge feature: GPS Modal submit handler
  const onAddPoint = async ({ lat, lng, company_id }) => {
    try {
      setBusy(true);
      await addGpsPoint({ lat, lng, company_id });
      await reload();
      setStatusMessage("Point added successfully.");
      setError(false);
      setShowGPSModal(false);
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

  // Added for HexSurge feature: Supply & Demand scatter point derivation
  const supplyPoints = useMemo(
    () => deriveScatterPoints(zones, (z) => z.heatmap_color === "green", 0),
    [zones]
  );
  const demandPoints = useMemo(
    () => deriveScatterPoints(zones, (z) => z.heatmap_color === "red" || z.heatmap_color === "orange", Math.PI),
    [zones]
  );

  // Added for Driver View: merge stats with driver count
  const enrichedStats = useMemo(() => ({
    ...stats,
    drivers_online: drivers.length,
  }), [stats, drivers]);

  return (
    <main className="app">
      <header className="hero brutal-border">
        <h1>HexSurge</h1>
        <p>{heroMeta}</p>
        {lastUpdatedAt ? <p>Last updated: {lastUpdatedAt}</p> : null}
      </header>

      <LiveStats stats={enrichedStats} />

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
        {/* Map with Supply & Demand ScatterplotLayers + live driver dots */}
        <MapView
          zones={zones}
          onHoverZone={setHoverZone}
          supplyPoints={supplyPoints}
          demandPoints={demandPoints}
          showSupply={showSupply}
          showDemand={showDemand}
          driverPoints={drivers}
        />

        {/* Right column: zone list + drivers panel */}
        <div className="right-col">
          <ZoneList zones={zones} />
          <DriversPanel drivers={drivers} />
        </div>
      </section>

      {/* Added for HexSurge feature: Surge Recommendation Sidebar */}
      <SurgeSidebar zones={zones} suggestions={suggestions} />

      <Controls
        onOpenModal={() => setShowGPSModal(true)}
        onSimulate={onSimulate}
        onRefresh={reload}
        busy={busy}
        simulateCount={simulateCount}
        setSimulateCount={setSimulateCount}
        statusMessage={statusMessage}
        error={error}
        showSupply={showSupply}
        setShowSupply={setShowSupply}
        showDemand={showDemand}
        setShowDemand={setShowDemand}
      />

      {/* Added for HexSurge feature: GPS Point Modal with AnimatePresence */}
      <AnimatePresence>
        {showGPSModal && (
          <GPSModal
            open={showGPSModal}
            onClose={() => setShowGPSModal(false)}
            onSubmit={onAddPoint}
            busy={busy}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/driver" element={<DriverView />} />
      <Route path="*" element={<AdminDashboard />} />
    </Routes>
  );
}
