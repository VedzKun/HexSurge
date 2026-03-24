# app.py
import streamlit as st
import folium
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
from streamlit_folium import st_folium
import h3

st.set_page_config(page_title="PulseDrop", layout="wide")
st.title("🚀 PulseDrop — Chennai Last-Mile Optimizer")

# Load data
forecasts = pd.read_csv('forecasts.csv')

# Aggregate per cell (mean predicted yhat across forecast horizon)
grouped = forecasts.groupby('h3_cell', dropna=True)['yhat'].mean().reset_index()
grouped['h3_cell'] = grouped['h3_cell'].astype(str)

# Convert H3 to polygons for map (handle missing/invalid cells)
def cell_to_polygon(cell):
    try:
        if cell is None or cell == '' or cell.lower() == 'nan':
            return None
    except Exception:
        pass
    try:
        boundary = h3.cell_to_boundary(cell)
        return Polygon([(lng, lat) for lat, lng in boundary])
    except Exception:
        return None

geometry = grouped['h3_cell'].apply(cell_to_polygon)
hex_gdf = gpd.GeoDataFrame(grouped, geometry=geometry)

# Interactive map
m = folium.Map(location=[13.08, 80.27], zoom_start=12, tiles="CartoDB positron")
choropleth = folium.Choropleth(
    geo_data=hex_gdf.__geo_interface__,
    data=hex_gdf,
    columns=['h3_cell', 'yhat'],
    key_on='feature.properties.h3_cell',
    fill_color='RdYlGn_r',
    fill_opacity=0.7,
    legend_name='Predicted Demand (next 24h)'
).add_to(m)

st_folium(m, width=1200, height=700)

# Dynamic pricing table
st.subheader("Hot Zones & Suggested Surge Pricing")
hot_zones = forecasts.groupby('h3_cell')['yhat'].mean().nlargest(8)
pricing = pd.DataFrame({
    'Hex Cell': hot_zones.index,
    'Predicted Orders': hot_zones.round(1),
    'Recommended Surge': ['+18%' if x > 12 else '+12%' for x in hot_zones]
})
st.dataframe(pricing, use_container_width=True)

st.caption("Built with H3 + Prophet • Chennai March 2026 demo")