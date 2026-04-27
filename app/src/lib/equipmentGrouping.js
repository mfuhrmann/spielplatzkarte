function representativePoint(geometry) {
  if (!geometry) return null;
  switch (geometry.type) {
    case 'Point': return geometry.coordinates;
    case 'MultiPoint':
    case 'LineString': return geometry.coordinates[0] ?? null;
    case 'MultiLineString': return geometry.coordinates[0]?.[0] ?? null;
    case 'Polygon': {
      const ring = geometry.coordinates[0];
      return [
        ring.reduce((s, c) => s + c[0], 0) / ring.length,
        ring.reduce((s, c) => s + c[1], 0) / ring.length,
      ];
    }
    case 'MultiPolygon': {
      const ring = geometry.coordinates[0]?.[0];
      if (!ring?.length) return null;
      return [
        ring.reduce((s, c) => s + c[0], 0) / ring.length,
        ring.reduce((s, c) => s + c[1], 0) / ring.length,
      ];
    }
    default: return null;
  }
}

function pointInPolygon([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function structureRing(feature) {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return coordinates[0];
  if (type === 'MultiPolygon') return coordinates[0]?.[0] ?? null;
  return null;
}

/**
 * Groups playground equipment features by playground=structure polygon containers.
 *
 * @param {Array} features GeoJSON Feature array from get_equipment
 * @returns {{ groups: Array<{structure: Feature, children: Feature[]}>, standalone: Feature[] }}
 */
export function groupEquipment(features) {
  const structures = features.filter(
    f => f.properties?.playground === 'structure' &&
         (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  );

  if (structures.length === 0) return { groups: [], standalone: features };

  const nonStructures = features.filter(f => !structures.includes(f));
  const childrenMap = new Map(structures.map(s => [s.properties.osm_id, []]));
  const standalone = [];

  for (const feature of nonStructures) {
    const pt = representativePoint(feature.geometry);
    if (!pt) { standalone.push(feature); continue; }

    let assigned = false;
    for (const structure of structures) {
      const ring = structureRing(structure);
      if (ring && pointInPolygon(pt, ring)) {
        childrenMap.get(structure.properties.osm_id).push(feature);
        assigned = true;
        break;
      }
    }
    if (!assigned) standalone.push(feature);
  }

  const groups = [];
  for (const structure of structures) {
    const children = childrenMap.get(structure.properties.osm_id);
    if (children.length > 0) {
      groups.push({ structure, children });
    } else {
      standalone.push(structure);
    }
  }

  return { groups, standalone };
}
