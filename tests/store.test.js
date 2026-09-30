import test from "node:test";
import assert from "node:assert/strict";
import { createStore, calculateTodayStats } from "../src/store.js";
import { NOTES, LESSONS } from "../src/music.js";

test("store initializes with default state and allows partial updates", () => {
  const store = createStore({
    key: "D",
    reference: 440,
    tolerance: 35,
    sessions: [],
    page: "practice",
    lesson: LESSONS[0],
    index: 0,
    note: NOTES[0],
  });

  const state = store.getState();
  assert.equal(state.key, "D");
  assert.equal(state.page, "practice");

  let notified = false;
  let receivedKeys = null;
  const unsubscribe = store.subscribe((newState, changedKeys) => {
    notified = true;
    receivedKeys = changedKeys;
  });

  store.setState({ page: "fingering", index: 2 });
  assert.equal(notified, true);
  assert.equal(receivedKeys.has("page"), true);
  assert.equal(receivedKeys.has("index"), true);
  assert.equal(receivedKeys.has("key"), false);
  assert.equal(store.getState().page, "fingering");
  assert.equal(store.getState().index, 2);

  unsubscribe();
  notified = false;
  store.setState({ page: "tuner" });
  assert.equal(notified, false);
});

test("calculateTodayStats accurately computes seconds and unique notes", () => {
  const today = Date.now();
  const yesterday = today - 24 * 60 * 60 * 1000;

  const sessions = [
    { at: today, seconds: 45, notes: ["1", "2"] },
    { at: today, seconds: 60, notes: ["2", "3"] },
    { at: yesterday, seconds: 120, notes: ["low5", "5"] },
  ];

  const stats = calculateTodayStats(sessions);
  assert.equal(stats.seconds, 105);
  assert.equal(stats.notes, 3); // "1", "2", "3"
});

test("addSession appends session, keeps max 100, and notifies subscribers", () => {
  const store = createStore({
    key: "E",
    reference: 440,
    tolerance: 35,
    sessions: Array.from({ length: 99 }, (_, i) => ({
      at: Date.now() - 1000 * i,
      seconds: 10,
      notes: ["1"],
    })),
  });

  store.addSession(15, ["2", "3"]);
  assert.equal(store.getState().sessions.length, 100);
  const last = store.getState().sessions.at(-1);
  assert.equal(last.seconds, 15);
  assert.deepEqual(last.notes, ["2", "3"]);

  // Adding one more caps at 100
  store.addSession(20, ["5"]);
  assert.equal(store.getState().sessions.length, 100);
});
