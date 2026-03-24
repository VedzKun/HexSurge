from math import radians, sin, cos, sqrt, atan2

CHENNAI_AREAS = [
    {"name": "Tambaram", "lat": 12.9249, "lng": 80.1000},
    {"name": "Chengalpattu", "lat": 12.6819, "lng": 79.9888},
    {"name": "Velachery", "lat": 12.9815, "lng": 80.2180},
    {"name": "OMR", "lat": 12.9170, "lng": 80.2300},
    {"name": "Guindy", "lat": 13.0104, "lng": 80.2206},
    {"name": "Anna Nagar", "lat": 13.0850, "lng": 80.2101},
    {"name": "T Nagar", "lat": 13.0418, "lng": 80.2341},
    {"name": "Adyar", "lat": 13.0012, "lng": 80.2565},
    {"name": "Perungudi", "lat": 12.9635, "lng": 80.2411},
    {"name": "Porur", "lat": 13.0359, "lng": 80.1565},
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def resolve_area_name(lat: float, lng: float) -> str:
    closest_name = "Greater Chennai"
    closest_dist = 1e9
    for area in CHENNAI_AREAS:
        dist = _haversine_km(lat, lng, area["lat"], area["lng"])
        if dist < closest_dist:
            closest_dist = dist
            closest_name = area["name"]
    return closest_name


def surge_and_color(count: int) -> tuple[float, str, int]:
    if count >= 8:
        return round(1.0 + (count - 7) * 0.15, 2), "red", 2
    if count >= 4:
        return round(1.0 + (count - 3) * 0.08, 2), "orange", 1
    return 1.0, "green", 0
