import h3
from shapely.geometry import Polygon


def cell_to_polygon_coords(cell):
    """Return polygon coordinates (lon, lat) for an H3 cell. Returns None on failure."""
    try:
        boundary = h3.cell_to_boundary(cell)
        return [(lng, lat) for lat, lng in boundary]
    except Exception:
        return None


def get_neighbors(cell, k=1):
    """Return a set of neighbor cell ids (including self)."""
    try:
        return set(h3.grid_disk(cell, k=k))
    except Exception:
        return set()
