import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { FLUTE_MODELS, clampZoom, createFluteViewer, cylinderVertices, normalizeAngle, rotationMatrix } from "../src/components/flute-viewer.js";
import { photoTube } from "../src/components/flute-controls.js";

test("angles wrap through a full turn without restricting either rotation axis", () => {
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(-360), 0);
  assert.equal(normalizeAngle(725), 5);
  assert.equal(normalizeAngle(-725), -5);
  assert.equal(normalizeAngle(190), -170);
});

test("zoom remains inside the usable range", () => {
  assert.equal(clampZoom(0.1), 0.65);
  assert.equal(clampZoom(4), 2.25);
  assert.equal(clampZoom(1.35), 1.35);
});

test("rotation is orthonormal and identity at the front-view preset", () => {
  const identity = rotationMatrix({ rotX: 0, rotY: 0, rotZ: 0 });
  identity.forEach((value, index) => assert.ok(Math.abs(value - (index % 4 === 0 ? 1 : 0)) < 1e-6));
  const matrix = rotationMatrix({ rotX: 74, rotY: -128, rotZ: 43 });
  for (let column = 0; column < 3; column++) {
    const vector = [...matrix.slice(column * 3, column * 3 + 3)];
    assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-6);
    for (let other = column + 1; other < 3; other++) {
      const dotProduct = vector.reduce((sum, value, row) => sum + value * matrix[other * 3 + row], 0);
      assert.ok(Math.abs(dotProduct) < 1e-6);
    }
  }
});

test("the model has real cylindrical thickness, end caps and a dark tail opening", () => {
  const vertices = cylinderVertices(32);
  assert.equal(vertices.length, 32 * 24 * 7);
  const materials = new Set();
  for (let index = 0; index < vertices.length; index += 7) {
    const vertex = vertices.slice(index, index + 7);
    assert.ok([...vertex].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(vertex[3], vertex[4], vertex[5]) - 1) < 1e-6);
    assert.ok(Math.abs(vertex[0]) <= 2.201);
    if (vertex[6] === 0) assert.ok(Math.abs(Math.hypot(vertex[1], vertex[2]) - 0.1) < 1e-6);
    materials.add(vertex[6]);
  }
  assert.deepEqual([...materials].sort(), [0, 1, 2]);
});

test("unsupported graphics fall back without requesting external assets", () => {
  let fallbackCount = 0;
  const canvas = { getContext: () => null };
  assert.equal(createFluteViewer(canvas, () => ({}), () => { fallbackCount++; }), null);
  assert.equal(fallbackCount, 1);
});

test("both cleaned photograph assets are local RGBA PNG files", () => {
  for (const model of Object.values(FLUTE_MODELS)) {
    const asset = new URL(`../public${model.photo}`, import.meta.url);
    assert.ok(existsSync(asset));
    const bytes = readFileSync(asset);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), 2170);
    assert.equal(bytes.readUInt32BE(20), 725);
    assert.equal(bytes[25], 6);
    assert.equal(model.holes.length, 8);
    assert.ok(model.holes.every((position, index) => index === 0 || position > model.holes[index - 1]));
  }
});

test("photo strips align the six photographed holes with teaching targets", () => {
  for (const modelName of Object.keys(FLUTE_MODELS)) {
    const markup = photoTube(modelName);
    for (const position of [312, 388, 468, 574, 650, 728]) {
      assert.ok(markup.includes(`x="${position}"`));
    }
    assert.equal((markup.match(/<image /g) || []).length, 9);
    assert.ok(markup.includes(FLUTE_MODELS[modelName].photo));
  }
});
