const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

function qs(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function fetchZones() {
  const res = await fetch(`${API_BASE}/live/zones`);
  if (!res.ok) throw new Error("Failed to fetch zones");
  return res.json();
}

export async function fetchZonesAdvanced({ res: h3Res, at, window_minutes, mode }) {
  const res = await fetch(
    `${API_BASE}/live/zones${qs({ res: h3Res, at, window_minutes, mode })}`
  );
  if (!res.ok) throw new Error("Failed to fetch zones");
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/live/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchStatsAdvanced({ res: h3Res, at, window_minutes, mode }) {
  const res = await fetch(
    `${API_BASE}/live/stats${qs({ res: h3Res, at, window_minutes, mode })}`
  );
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function addGpsPoint(payload) {
  const res = await fetch(`${API_BASE}/gps/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add GPS point");
  return res.json();
}

export async function simulateDinnerRush(points = 20) {
  const res = await fetch(`${API_BASE}/gps/simulate-dinner-rush?count=${points}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to simulate rush");
  return res.json();
}

export async function fetchRiderSuggestions({ res: h3Res, at, window_minutes }) {
  const res = await fetch(
    `${API_BASE}/live/rider-suggestions${qs({ res: h3Res, at, window_minutes })}`
  );
  if (!res.ok) throw new Error("Failed to fetch rider suggestions");
  return res.json();
}

// Added for Driver View: fetch live driver positions from backend
export async function fetchDrivers() {
  const res = await fetch(`${API_BASE}/gps/drivers`);
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}
