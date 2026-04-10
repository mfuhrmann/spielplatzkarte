//----------------------------------------------//
// Datenquellen — PostgREST API                 //
//----------------------------------------------//

import { transformExtent } from 'ol/proj';
import { osmRelationId, apiBaseUrl } from './config.js';

// Alle Spielplätze in der konfigurierten Region als Polygone laden (inkl. Geometrie und Tags)
export async function fetchPlaygrounds() {
    const res = await fetch(`${apiBaseUrl}/rpc/get_playgrounds?relation_id=${osmRelationId}`);
    if (res.ok) return res.json();
    throw new Error(`get_playgrounds failed: ${res.status}`);
}

// Spielgeräte und Ausstattung eines Spielplatzes laden (bbox in EPSG:3857)
export async function fetchPlaygroundEquipment(extentEPSG3857) {
    const [minLon, minLat, maxLon, maxLat] = transformExtent(extentEPSG3857, 'EPSG:3857', 'EPSG:4326');
    const params = new URLSearchParams({ min_lon: minLon, min_lat: minLat, max_lon: maxLon, max_lat: maxLat });
    const res = await fetch(`${apiBaseUrl}/rpc/get_equipment?${params}`);
    if (res.ok) return res.json();
    throw new Error(`get_equipment failed: ${res.status}`);
}

// Bäume innerhalb einer Bounding Box laden (natural=tree)
export async function fetchTrees(extentEPSG3857) {
    const [minLon, minLat, maxLon, maxLat] = transformExtent(extentEPSG3857, 'EPSG:3857', 'EPSG:4326');
    const params = new URLSearchParams({ min_lon: minLon, min_lat: minLat, max_lon: maxLon, max_lat: maxLat });
    const res = await fetch(`${apiBaseUrl}/rpc/get_trees?${params}`);
    if (res.ok) return res.json();
    return { type: 'FeatureCollection', features: [] };
}

// Nahegelegene POIs (Toiletten, Bushaltestellen, Eis, Notaufnahme) laden
export async function fetchNearbyPOIs(lat, lon, radiusM = 500) {
    const params = new URLSearchParams({ lat, lon, radius_m: radiusM });
    const res = await fetch(`${apiBaseUrl}/rpc/get_pois?${params}`);
    if (res.ok) return res.json();
    return [];
}
