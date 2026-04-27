import assert from 'node:assert/strict';
import { groupEquipment } from './equipmentGrouping.js';

function poly(ring, osm_id = 1) {
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { playground: 'structure', osm_id } };
}
function point(coord, playground = 'slide', osm_id = 99) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: { playground, osm_id } };
}

const ring = [[0,0],[10,0],[10,10],[0,10],[0,0]];

// Device inside polygon → grouped
{
  const structure = poly(ring, 1);
  const inside = point([5, 5], 'slide', 2);
  const { groups, standalone } = groupEquipment([structure, inside]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].children.length, 1);
  assert.equal(groups[0].children[0], inside);
  assert.equal(standalone.length, 0);
}

// Device outside polygon → standalone
{
  const structure = poly(ring, 1);
  const outside = point([15, 15], 'swing', 3);
  const { groups, standalone } = groupEquipment([structure, outside]);
  assert.equal(groups.length, 0, 'structure with no children goes to standalone');
  assert.equal(standalone.length, 2);
  assert.ok(standalone.includes(outside));
  assert.ok(standalone.includes(structure));
}

// No structure polygons → all standalone, unchanged
{
  const f1 = point([1, 1], 'slide', 10);
  const f2 = point([2, 2], 'swing', 11);
  const { groups, standalone } = groupEquipment([f1, f2]);
  assert.equal(groups.length, 0);
  assert.deepEqual(standalone, [f1, f2]);
}

// Structure with zero contained devices → standalone (no grouping UI)
{
  const structure = poly(ring, 1);
  const { groups, standalone } = groupEquipment([structure]);
  assert.equal(groups.length, 0);
  assert.equal(standalone.length, 1);
  assert.equal(standalone[0], structure);
}

// Empty input
{
  const { groups, standalone } = groupEquipment([]);
  assert.equal(groups.length, 0);
  assert.equal(standalone.length, 0);
}

console.log('All groupEquipment tests passed.');
