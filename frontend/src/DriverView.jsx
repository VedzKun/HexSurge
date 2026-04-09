// DriverView.jsx — Mobile-first driver interface for HexSurge
// Light theme, big buttons, one-thumb operation
import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// Reverse-geocode lat/lng to closest named Chennai area
const CHENNAI_AREA_COORDS = {
  "Tambaram":       { lat: 12.9249, lng: 80.1000 },
  "Chengalpattu":   { lat: 12.6921, lng: 79.9754 },
  "Velachery":      { lat: 12.9815, lng: 80.2209 },
  "OMR":            { lat: 12.9010, lng: 80.2279 },
  "Guindy":         { lat: 13.0067, lng: 80.2206 },
  "Anna Nagar":     { lat: 13.0850, lng: 80.2101 },
  "Adyar":          { lat: 13.0063, lng: 80.2574 },
  "T-Nagar":        { lat: 13.0418, lng: 80.2341 },
  "Porur":          { lat: 13.0350, lng: 80.1570 },
  "Perambur":       { lat: 13.1175, lng: 80.2387 },
  "Sholinganallur": { lat: 12.9010, lng: 80.2279 },
  "Pallavaram":     { lat: 12.9675, lng: 80.1491 },
  "Chromepet":      { lat: 12.9516, lng: 80.1462 },
  "Kolathur":       { lat: 13.1175, lng: 80.2230 },
  "Ambattur":       { lat: 13.1143, lng: 80.1548 },
};

function nearestAreaName(lat, lng) {
  let best = "Chennai";
  let bestDist = Infinity;
  for (const [name, coord] of Object.entries(CHENNAI_AREA_COORDS)) {
    const d = Math.hypot(coord.lat - lat, coord.lng - lng);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// STATUS types
const STATUS = {
  IDLE: "idle",
  LOCATING: "locating",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  DELIVERED: "delivered",
  ERROR: "error",
};

export default function DriverView() {
  const [driverId, setDriverId] = useState(() => localStorage.getItem("hs_driver_id") || "");
  const [setupDone, setSetupDone] = useState(() => !!localStorage.getItem("hs_driver_id"));

  const [status, setStatus] = useState(STATUS.IDLE);
  const [message, setMessage] = useState("");
  const [coords, setCoords] = useState(null);      // { lat, lng }
  const [zoneName, setZoneName] = useState("—");
  const [lastH3, setLastH3] = useState(null);
  const [deliveryActive, setDeliveryActive] = useState(false);
  const [idInput, setIdInput] = useState("");
  const mapRef = useRef(null);

  // Inject OSM tile map into the map container
  useEffect(() => {
    if (!coords || !mapRef.current) return;
    const { lat, lng } = coords;
    const z = 14;
    // Use a static OSM tiles iframe-style embed via openstreetmap
    mapRef.current.style.backgroundImage = `url("https://tile.openstreetmap.org/${z}/${lon2tile(lng, z)}/${lat2tile(lat, z)}.png")`;
  }, [coords]);

  function lat2tile(lat, zoom) {
    return Math.floor(((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, zoom));
  }
  function lon2tile(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  const handleSetup = () => {
    const id = idInput.trim();
    if (!id) return;
    localStorage.setItem("hs_driver_id", id);
    setDriverId(id);
    setSetupDone(true);
  };

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const handleImHere = async () => {
    setStatus(STATUS.LOCATING);
    setMessage("Getting your location…");
    try {
      const { lat, lng } = await getLocation();
      setCoords({ lat, lng });
      const area = nearestAreaName(lat, lng);
      setZoneName(area);

      setStatus(STATUS.SUBMITTING);
      setMessage("Logging your position…");

      const res = await fetch(`${API_BASE}/gps/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, company_id: driverId, driver_id: driverId }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      setLastH3(data.h3_cell);
      setZoneName(data.area_name || area);
      setDeliveryActive(true);
      setStatus(STATUS.SUCCESS);
      setMessage("Logged successfully ✓");
    } catch (err) {
      setStatus(STATUS.ERROR);
      setMessage(err.message.includes("denied")
        ? "Location access denied. Please enable GPS."
        : "Could not log location. Try again.");
    }
  };

  const handleDelivered = async () => {
    setStatus(STATUS.LOCATING);
    setMessage("Confirming delivery location…");
    try {
      const { lat, lng } = await getLocation();
      setCoords({ lat, lng });
      const area = nearestAreaName(lat, lng);

      await fetch(`${API_BASE}/gps/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, company_id: driverId, driver_id: driverId, event: "delivered" }),
      });

      setZoneName(area);
      setDeliveryActive(false);
      setStatus(STATUS.DELIVERED);
      setMessage("Delivery confirmed! Great work 🎉");
    } catch {
      setStatus(STATUS.ERROR);
      setMessage("Could not confirm. Check your connection.");
    }
  };

  const resetStatus = () => {
    setStatus(STATUS.IDLE);
    setMessage("");
  };

  // ── Setup Screen ──
  if (!setupDone) {
    return (
      <div className="dv-root">
        <div className="dv-setup-card">
          <div className="dv-logo">⬡</div>
          <h1 className="dv-brand">HexSurge</h1>
          <p className="dv-setup-sub">Enter your Driver ID to get started</p>
          <input
            className="dv-id-input"
            type="text"
            placeholder="e.g. driver-001"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSetup()}
            autoFocus
            autoComplete="off"
          />
          <motion.button
            className="dv-btn dv-btn-primary"
            whileTap={{ scale: 0.97 }}
            onClick={handleSetup}
            disabled={!idInput.trim()}
          >
            START SHIFT
          </motion.button>
        </div>
      </div>
    );
  }

  const isLoading = status === STATUS.LOCATING || status === STATUS.SUBMITTING;

  return (
    <div className="dv-root">
      {/* Top bar */}
      <header className="dv-header">
        <span className="dv-logo-sm">⬡ HexSurge</span>
        <span className="dv-driver-chip">🪪 {driverId}</span>
      </header>

      {/* Zone badge */}
      <div className="dv-zone-banner">
        <span className="dv-zone-label">CURRENT ZONE</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={zoneName}
            className="dv-zone-name"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {zoneName}
          </motion.span>
        </AnimatePresence>
        {lastH3 && <span className="dv-h3-chip">{lastH3.slice(0, 10)}…</span>}
      </div>

      {/* Map */}
      <div className="dv-map-wrap" ref={mapRef}>
        {coords ? (
          <iframe
            className="dv-map-frame"
            title="Your Location"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.01},${coords.lng + 0.01},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
            style={{ border: 0, width: "100%", height: "100%" }}
            loading="lazy"
          />
        ) : (
          <div className="dv-map-placeholder">
            <span style={{ fontSize: "3rem" }}>📍</span>
            <p>Tap "I'm Here" to pin your location</p>
          </div>
        )}
      </div>

      {/* Status pill */}
      <AnimatePresence>
        {message && (
          <motion.div
            className={`dv-status-pill ${status === STATUS.ERROR ? "dv-status-error" : status === STATUS.DELIVERED ? "dv-status-delivered" : "dv-status-ok"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onClick={resetStatus}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="dv-actions">
        <motion.button
          id="btn-im-here"
          className="dv-btn dv-btn-primary"
          whileTap={{ scale: 0.96 }}
          onClick={handleImHere}
          disabled={isLoading}
        >
          {isLoading && status !== STATUS.SUBMITTING
            ? "📡 Finding Location…"
            : status === STATUS.SUBMITTING
            ? "⏳ Logging…"
            : "📍 I'm Here / Start Delivery"}
        </motion.button>

        <motion.button
          id="btn-delivered"
          className={`dv-btn dv-btn-delivered ${!deliveryActive ? "dv-btn-dim" : ""}`}
          whileTap={deliveryActive ? { scale: 0.96 } : {}}
          onClick={deliveryActive ? handleDelivered : undefined}
          disabled={!deliveryActive || isLoading}
        >
          ✅ Delivery Completed
        </motion.button>
      </div>

      {/* Footer hint */}
      <p className="dv-footer-hint">
        Tap once. No typing needed. 🛵
      </p>

      <button
        className="dv-logout"
        onClick={() => {
          localStorage.removeItem("hs_driver_id");
          setSetupDone(false);
          setDriverId("");
          setIdInput("");
          setStatus(STATUS.IDLE);
          setDeliveryActive(false);
          setMessage("");
        }}
      >
        Change Driver
      </button>
    </div>
  );
}
