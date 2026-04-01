//----------------------------------------------//
// Overpass API — Spielplatzdaten aus OSM laden //
//----------------------------------------------//

import { osmRelationId } from './config.js';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Alle Spielplätze in der konfigurierten Region als Polygone laden (inkl. Geometrie und Tags)
export async function fetchPlaygrounds() {
    const query = `[out:json][timeout:60];
area(${3600000000 + osmRelationId})->.a;
way[leisure=playground](area.a);
out geom tags;`;
    const data = await overpassPost(query);
    return {
        type: 'FeatureCollection',
        features: data.elements
            .filter(el => el.geometry && el.geometry.length > 1)
            .map(el => ({
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [el.geometry.map(p => [p.lon, p.lat])]
                },
                properties: {
                    osm_id: el.id,
                    osm_type: 'W',
                    ...el.tags
                }
            }))
    };
}

async function overpassPost(query) {
    const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query)
    });
    if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
    return response.json();
}
