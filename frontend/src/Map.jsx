// Added for HexSurge feature: Supply & Demand Layers (ScatterplotLayer)
import { ScatterplotLayer } from "@deck.gl/layers";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { DeckGL } from "@deck.gl/react";
import Map from "react-map-gl/maplibre";

const INITIAL_VIEW_STATE = {
  latitude: 13.08,
  longitude: 80.27,
  zoom: 10.2,
  pitch: 35,
  bearing: 0,
};

function colorFromHeat(color, demand) {
  if (color === "red") {
    return [255, 60 + (demand % 4) * 20, 0, 220];
  }
  if (color === "orange") {
    return [255, 102, 0, 210];
  }
  return [72, 199, 116, 180];
}

function glowColor(zone) {
  if (!zone.influenced_by_neighbors) return [0, 0, 0, 0];
  if (zone.heatmap_color === "green") return [255, 102, 0, 140];
  if (zone.heatmap_color === "orange") return [255, 34, 0, 160];
  return [255, 34, 0, 200];
}

export default function MapView({
  zones,
  onHoverZone,
  supplyPoints,
  demandPoints,
  showSupply,
  showDemand,
}) {
  const mainLayer = new H3HexagonLayer({
    id: "h3-zones",
    data: zones,
    pickable: true,
    filled: true,
    stroked: true,
    wireframe: false,
    getHexagon: (d) => d.cell,
    getFillColor: (d) => colorFromHeat(d.heatmap_color, d.demand_count),
    getLineColor: [255, 255, 255, 220],
    lineWidthMinPixels: 2,
    onHover: (info) => onHoverZone(info.object ?? null),
    transitions: {
      getFillColor: 500,
    },
  });

  const neighborGlowLayer = new H3HexagonLayer({
    id: "h3-neighbor-glow",
    data: zones,
    pickable: false,
    filled: false,
    stroked: true,
    getHexagon: (d) => d.cell,
    getLineColor: (d) => glowColor(d),
    lineWidthMinPixels: 6,
    lineWidthMaxPixels: 10,
    transitions: {
      getLineColor: 400,
    },
  });

  // Added for HexSurge feature: Supply Layer — green dots for available riders
  const supplyLayer = new ScatterplotLayer({
    id: "supply-dots",
    data: showSupply ? supplyPoints : [],
    pickable: false,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: 35,
    getFillColor: [72, 199, 116, 210],
    getLineColor: [255, 255, 255, 180],
    stroked: true,
    lineWidthMinPixels: 1.5,
    radiusUnits: "meters",
    radiusMinPixels: 5,
    radiusMaxPixels: 16,
  });

  // Added for HexSurge feature: Demand Layer — purple pins for pending orders
  const demandLayer = new ScatterplotLayer({
    id: "demand-pins",
    data: showDemand ? demandPoints : [],
    pickable: false,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: 28,
    getFillColor: [160, 80, 240, 220],
    getLineColor: [255, 255, 255, 180],
    stroked: true,
    lineWidthMinPixels: 1.5,
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
  });

  return (
    <div className="map-shell brutal-border">
      <DeckGL
        style={{ position: "relative", width: "100%", height: "100%" }}
        initialViewState={INITIAL_VIEW_STATE}
        controller
        layers={[neighborGlowLayer, mainLayer, supplyLayer, demandLayer]}
        getTooltip={({ object }) =>
          object
            ? {
                text: `${object.area_name}\nDemand: ${object.demand_count}\nSurge: ${object.surge_multiplier}x\nNeighbor pressure: ${object.neighbor_pressure ?? 0}`,
              }
            : null
        }
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          attributionControl={false}
        />
      </DeckGL>
    </div>
  );
}
