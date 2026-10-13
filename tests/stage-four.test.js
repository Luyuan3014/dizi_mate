import test from "node:test";
import assert from "node:assert/strict";
import { createStore, validateImportedData } from "../src/store.js";
import { fingeringPage } from "../src/views/fingering.js";
import { notationPage } from "../src/views/notation.js";
import { songsPage } from "../src/views/songs.js";
import { practiceInsights } from "../src/views/history.js";

test("stage four data tools validate and round-trip learning state", () => {
  assert.equal(validateImportedData({}).ok, false);
  const store = createStore({ sessions: [], notationProgress: [], favoriteSongs: [], songProgress: {}, recentSongs: [] });
  store.toggleNotationProgress("notation-0");
  store.toggleFavoriteSong("two-tigers");
  store.updateSongProgress("two-tigers", { index: 2, completion: 25, score: 81 });
  const imported = store.exportData();
  const other = createStore({ sessions: [] });
  assert.equal(other.importData(imported).ok, true);
  assert.deepEqual(other.getState().notationProgress, ["notation-0"]);
  assert.equal(other.getState().songProgress["two-tigers"].score, 81);
});

test("learning pages expose completion, filters, practice modes, and plain-language fingering help", () => {
  const state = createStore({ sessions: [], notationProgress: ["notation-0"], favoriteSongs: ["two-tigers"], songProgress: { "two-tigers": { index: 1, completion: 12, score: 72 } }, recentSongs: ["two-tigers"] }).getState();
  assert.match(notationPage(state), /已学过/);
  assert.match(notationPage(state), /去练习/);
  assert.match(songsPage(state, "two-tigers", "favorites"), /跟曲演奏/);
  assert.match(songsPage(state, "two-tigers", "favorites"), /从上次位置继续/);
  const fingering = fingeringPage(state);
  for (const term of ["半孔", "急吹", "叉口", "泄孔", "风门"]) assert.match(fingering, new RegExp(term));
  assert.match(fingering, /适合初学/);
  assert.match(fingering, /需要进阶/);
});

test("practice insights calculate streaks and pitch-direction leaders", () => {
  const now = Date.now();
  const day = 86400000;
  const insights = practiceInsights([
    { at: now - day, seconds: 60, notes: ["1", "2"], lowNotes: ["2", "2"], highNotes: ["1"] },
    { at: now, seconds: 120, notes: ["2"], lowNotes: ["2"], highNotes: ["3"] },
  ], now);
  assert.equal(insights.streak, 2);
  assert.equal(insights.topNote, "2");
  assert.equal(insights.lowNote, "2");
  assert.equal(insights.week.length, 7);
  assert.equal(insights.month.length, 30);
});
