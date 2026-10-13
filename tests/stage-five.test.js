import test from "node:test";
import assert from "node:assert/strict";
import { MOBILE_NAV, mobileNavGroup } from "../src/shell.js";

test("mobile navigation keeps four primary destinations while retaining secondary routes", () => {
  assert.deepEqual(MOBILE_NAV.map((item) => item.title), ["练习", "学习", "曲谱", "记录"]);
  assert.equal(MOBILE_NAV.length, 4);
  assert.equal(mobileNavGroup("tuner"), "practice");
  assert.equal(mobileNavGroup("long-tone"), "practice");
  assert.equal(mobileNavGroup("notation"), "fingering");
  assert.equal(mobileNavGroup("history"), "history");
  assert.equal(mobileNavGroup("unknown"), undefined);
});
