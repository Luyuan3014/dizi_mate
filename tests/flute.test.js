import test from "node:test";
import assert from "node:assert/strict";
import { fluteDiagram, fluteState, getFluteClickTarget } from "../src/components/flute.js";
import { NOTES } from "../src/music.js";

test("fluteDiagram renders extracted real flute images and interactive elements", () => {
  const note = NOTES[0]; // low 5
  const markup = fluteDiagram(note, { demo: false });

  // Outer container and action bar
  assert.ok(markup.includes("flute-container"));
  assert.ok(markup.includes("flute-action-bar"));
  assert.ok(markup.includes("老料双节白铜演奏笛"));

  // Extracted real flute photo tube
  assert.ok(markup.includes("flute-double-cutout.png"));
  assert.ok(markup.includes('class="flute-viewer-canvas"'));
  assert.ok(markup.includes('viewBox="0 310 2170 108"'));

  // 3D rotation controls
  assert.ok(markup.includes('data-flute-action="toggle-3d"'));
  assert.ok(markup.includes('data-flute-action="toggle-spin"'));
  assert.ok(markup.includes('data-flute-action="reset-view"'));
  assert.ok(markup.includes('data-flute-action="set-preset"'));
  assert.ok(markup.includes('data-flute-action="toggle-model"'));

  // 6 finger hole buttons and blow hole button
  assert.ok(markup.includes('data-action="blow-flute"'));
  for (let i = 0; i < 6; i++) {
    assert.ok(markup.includes(`data-index="${i}"`));
  }
});

test("fluteDiagram switches to single-joint flute model correctly", () => {
  fluteState.model = "single";
  const note = NOTES[0];
  const markup = fluteDiagram(note, { demo: false });

  assert.ok(markup.includes("flute-single-cutout.png"));
  assert.ok(!markup.includes("flute-double-cutout.png"));
  assert.ok(markup.includes("老料单节特制竹笛"));

  // Restore default
  fluteState.model = "double";
});

test("flute controls expose zoom, keyboard instructions and reconstruction disclosure", () => {
  const markup = fluteDiagram(NOTES[0]);
  assert.ok(markup.includes('data-flute-action="zoom-in"'));
  assert.ok(markup.includes('data-flute-action="zoom-out"'));
  assert.ok(markup.includes('aria-pressed="false"'));
  assert.ok(markup.includes("Home 键复位"));
  assert.ok(markup.includes("背面与端面为结构重建"));
  assert.equal((markup.match(/class="flute-hole-btn /g) || []).length, 6);
});

test("custom fingering retains half-hole states with the photographic tube", () => {
  const markup = fluteDiagram(NOTES[0], { page: "fingering", customHoles: [0.5, 0, 1, 0, 1, 1] });
  assert.ok(markup.includes('class="flute-hole-btn half"'));
  assert.ok(markup.includes("第6孔 · 当前半孔"));
  assert.equal((markup.match(/class="flute-hole-btn covered"/g) || []).length, 3);
});

test("getFluteClickTarget parses button actions correctly", () => {
  const fakeBlowEvent = {
    target: {
      closest: (sel) => (sel === "[data-action]" ? { getAttribute: () => "blow-flute" } : null),
    },
  };
  assert.deepEqual(getFluteClickTarget(fakeBlowEvent), { type: "blow" });

  const fakeHoleEvent = {
    target: {
      closest: (sel) => (sel === "[data-action]" ? {
        getAttribute: (attr) => (attr === "data-action" ? "toggle-hole" : attr === "data-index" ? "3" : null),
        dataset: { index: "3" },
      } : null),
    },
  };
  assert.deepEqual(getFluteClickTarget(fakeHoleEvent), { type: "hole", index: 3 });
});
