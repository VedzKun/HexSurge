import streamlit as st
import pandas as pd
import h3
import folium
from streamlit_folium import st_folium
import datetime
import random
import plotly.express as px
import math

# --- CONFIGURATION ---
st.set_page_config(page_title="HexSurge Optimizer", page_icon="🚀", layout="wide")

CHENNAI_AREAS = [
    {"name": "Anna Nagar", "lat": 13.0850, "lng": 80.2101},
    {"name": "Velachery", "lat": 12.9815, "lng": 80.2180},
    {"name": "OMR", "lat": 12.9675, "lng": 80.2480},
    {"name": "Tambaram", "lat": 12.9249, "lng": 80.1000},
    {"name": "Guindy", "lat": 13.0067, "lng": 80.2206},
    {"name": "T Nagar", "lat": 13.0418, "lng": 80.2341},
    {"name": "Adyar", "lat": 13.0012, "lng": 80.2565},
    {"name": "Chengalpattu", "lat": 12.6819, "lng": 79.9779},
]

H3_RES = 9


def get_area_name(lat: float, lng: float) -> str:
    """Map coordinate to nearest known Chennai area."""
    closest = "Unknown"
    min_dist = float("inf")
    for area in CHENNAI_AREAS:
        dist = math.hypot(area["lat"] - lat, area["lng"] - lng)
        if dist < min_dist:
            min_dist = dist
            closest = area["name"]
    return closest


def latlng_to_cell(lat: float, lng: float, res: int) -> str:
    """Support both h3 API versions."""
    try:
        return h3.geo_to_h3(lat, lng, res)
    except AttributeError:
        return h3.latlng_to_cell(lat, lng, res)


def cell_to_boundary(cell: str):
    """Support both h3 API versions."""
    try:
        return h3.h3_to_geo_boundary(cell, geo_json=False)
    except AttributeError:
        return h3.cell_to_boundary(cell)


def init_state() -> None:
    """Create an in-app table to store live points."""
    if "points" not in st.session_state:
        st.session_state.points = pd.DataFrame(
            columns=["lat", "lng", "company_id", "timestamp", "cell", "area"]
        )


def add_point(lat: float, lng: float, company_id: int = 1, ts=None) -> None:
    """Append one live GPS point."""
    if ts is None:
        ts = datetime.datetime.now()

    cell = latlng_to_cell(float(lat), float(lng), H3_RES)
    area = get_area_name(float(lat), float(lng))

    row = pd.DataFrame([
        {
            "lat": float(lat),
            "lng": float(lng),
            "company_id": int(company_id),
            "timestamp": pd.to_datetime(ts),
            "cell": cell,
            "area": area,
        }
    ])

    st.session_state.points = pd.concat([st.session_state.points, row], ignore_index=True)


def simulate_next_10_minutes() -> None:
    """Generate realistic demand spikes around Chennai hubs."""
    hubs = random.sample(CHENNAI_AREAS, k=random.randint(2, 4))
    now = datetime.datetime.now()

    for hub in hubs:
        for _ in range(random.randint(5, 12)):
            lat = hub["lat"] + random.uniform(-0.012, 0.012)
            lng = hub["lng"] + random.uniform(-0.012, 0.012)
            ts = now - datetime.timedelta(minutes=random.randint(0, 10))
            add_point(lat, lng, 1, ts)


init_state()

df = st.session_state.points

st.title("HexSurge - Smart Delivery Zone Optimizer")
st.write(
    "Enter live delivery locations and watch real-time demand zones appear on the map. "
    "Get automatic surge pricing and hot zone alerts."
)
st.caption("Tip: Hover over a hexagon to see area name and H3 cell details.")
st.divider()

left, right = st.columns([1, 2])

with left:
    st.subheader("Add Live GPS Point")
    lat = st.number_input("Latitude", value=13.082700, format="%.6f")
    lng = st.number_input("Longitude", value=80.270700, format="%.6f")
    company_id = st.number_input("Company ID", value=1, step=1)
    timestamp = st.text_input("Timestamp", value=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    if st.button("Add This Point", use_container_width=True, type="primary"):
        add_point(lat, lng, int(company_id), timestamp)
        st.success(f"Point added near {get_area_name(lat, lng)}")
        st.rerun()

    uploaded = st.file_uploader("Upload CSV (lat,lng,timestamp)", type=["csv"])
    if uploaded is not None:
        upload_df = pd.read_csv(uploaded)
        needed_cols = {"lat", "lng", "timestamp"}
        if not needed_cols.issubset(set(upload_df.columns)):
            st.error("CSV must contain: lat, lng, timestamp")
        else:
            for _, row in upload_df.iterrows():
                add_point(row["lat"], row["lng"], int(company_id), row["timestamp"])
            st.success(f"Uploaded {len(upload_df)} points")
            st.rerun()

    st.markdown("---")
    if st.button("Simulate Next 10 Minutes", use_container_width=True):
        simulate_next_10_minutes()
        st.success("Simulation completed")
        st.rerun()

    if st.button("Clear All Data", use_container_width=True):
        st.session_state.points = pd.DataFrame(
            columns=["lat", "lng", "company_id", "timestamp", "cell", "area"]
        )
        st.rerun()

with right:
    st.subheader("Real-Time Demand Zones")
    m = folium.Map(location=[13.03, 80.21], zoom_start=11, tiles="CartoDB positron")

    hot_zone_names = []
    avg_surge = 1.0

    if not df.empty:
        zone_df = df.groupby("cell", as_index=False).agg(
            count=("lat", "count"),
            area=("area", "first"),
        )

        peak = zone_df["count"].max()

        for _, row in zone_df.iterrows():
            count = int(row["count"])
            area = row["area"]
            cell = row["cell"]
            boundary = cell_to_boundary(cell)

            if count >= max(6, int(0.6 * peak)):
                color = "#d62828"
                label = "Hot Surge"
                surge = "+18%"
                hot_zone_names.append(area)
            elif count >= 3:
                color = "#f77f00"
                label = "Busy"
                surge = "+8%"
            else:
                color = "#2a9d8f"
                label = "Normal"
                surge = "0%"

            tooltip = (
                f"<b>{area}</b><br>"
                f"Demand: {label}<br>"
                f"Suggested Surge: {surge}<br>"
                f"Orders: {count}<br>"
                f"<small>H3: {cell}</small>"
            )

            folium.Polygon(
                locations=boundary,
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.45,
                weight=2,
                tooltip=tooltip,
            ).add_to(m)

        avg_surge = 1.0 + min(len(set(hot_zone_names)) * 0.18, 2.0)

    st_folium(m, width=None, height=500, returned_objects=[])

# --- Metrics ---
st.divider()

total_today = 0 if df.empty else len(df)
hot_zone_names = sorted(list(set(hot_zone_names))) if "hot_zone_names" in locals() else []
riders_needed = len(hot_zone_names) * 4

m1, m2, m3, m4 = st.columns(4)
m1.metric("Total Live Points Today", f"{total_today}")
m2.metric("Hot Zones Right Now", ", ".join(hot_zone_names) if hot_zone_names else "None")
m3.metric("Average Surge Multiplier", f"{avg_surge:.2f}x")
m4.metric("Recommended Riders Needed", riders_needed)

if hot_zone_names:
    for area in hot_zone_names:
        st.error(f"🚨 Hot zone in {area} - suggest +18% surge!")

# --- Last 20 points table ---
st.subheader("Latest Points (Last 20)")
if df.empty:
    st.info("No points yet. Add a live point or run simulation.")
else:
    preview = df.tail(20).copy()
    preview["timestamp"] = pd.to_datetime(preview["timestamp"], errors="coerce")
    preview = preview.sort_values("timestamp", ascending=False)
    st.dataframe(preview[["timestamp", "lat", "lng", "area", "cell"]], use_container_width=True, hide_index=True)

# --- Demand trend (last 2 hours) ---
st.subheader("Demand Over Last 2 Hours")
if df.empty:
    st.info("Chart appears once data is available.")
else:
    ts_df = df.copy()
    ts_df["timestamp"] = pd.to_datetime(ts_df["timestamp"], errors="coerce")
    ts_df = ts_df.dropna(subset=["timestamp"])

    cutoff = datetime.datetime.now() - datetime.timedelta(hours=2)
    ts_df = ts_df[ts_df["timestamp"] >= cutoff]

    if ts_df.empty:
        st.info("No points in the last 2 hours yet.")
    else:
        ts_df["minute"] = ts_df["timestamp"].dt.floor("min")
        demand = ts_df.groupby("minute").size().reset_index(name="requests")
        demand["moving_avg"] = demand["requests"].rolling(window=3, min_periods=1).mean()

        fig = px.line(
            demand,
            x="minute",
            y=["requests", "moving_avg"],
            markers=True,
            labels={"minute": "Time", "value": "Demand", "variable": "Series"},
            color_discrete_sequence=["#f77f00", "#1d3557"],
        )
        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)

st.caption("Dashboard auto-updates as you add points. For periodic refresh, rerun or use simulation.")