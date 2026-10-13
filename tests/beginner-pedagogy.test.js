import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../src/store.js";
import { LESSONS, NOTES } from "../src/music.js";
import { practicePage } from "../src/views/practice.js";
import { fingeringPage } from "../src/views/fingering.js";
import { longTonePage } from "../src/views/long-tone.js";
import { dialogView } from "../src/views/settings.js";
import { practiceFeedback } from "../src/components/shared.js";

test("initial state initializes to breath focus and low-resistance note", () => {
  const state = createInitialState();
  assert.equal(state.lesson.id, "breath");
  assert.equal(state.lesson.sequence[0], "2");
  assert.equal(state.note.id, "2");
  assert.equal(state.longNote.id, "2");
});

test("practicePage renders progressive lesson details and journey grid", () => {
  const store = createStore();
  const state = store.getState();
  const markup = practicePage(state, { seconds: 120, notes: 3 });

  // Level tag and instruction
  assert.ok(markup.includes("第 1 阶段 · 纯练气息"));
  assert.ok(markup.includes("吹响第一声：单练气息"));
  assert.ok(markup.includes("只盖左手两个孔"));

  // Journey grid contains all 5 steps
  assert.ok(markup.includes("STEP 01"));
  assert.ok(markup.includes("STEP 02"));
  assert.ok(markup.includes("STEP 03"));
  assert.ok(markup.includes("STEP 04"));
  assert.ok(markup.includes("STEP 05"));
  assert.ok(markup.includes("静音指法：感受指腹盖严"));
  assert.ok(markup.includes("指气初合：轻松吹出三个音"));
  assert.ok(markup.includes("向下延展：攻克全按低音"));
  assert.ok(markup.includes("两只老虎"));
  assert.ok(markup.includes("开始陪练"));
  assert.ok(markup.includes("第 1 / 1 步"));
  assert.ok(markup.includes("3 分钟"));
  assert.ok(practicePage({ ...state, practiceTargetMinutes: 0 }, { seconds: 0, notes: 0 }).includes("自由练习"));
});

test("first-practice feedback always explains direction, reason, and next action", () => {
  assert.deepEqual(practiceFeedback({ rms: 0 }).state, "no-signal");
  assert.equal(practiceFeedback({ rms: 0 }).action.length > 0, true);
  assert.equal(practiceFeedback({ frequency: 500, cents: -60, tolerance: 35 }).state, "low-pitch");
  assert.equal(practiceFeedback({ frequency: 500, cents: 0, tolerance: 35, stable: true }).state, "stable");
});

test("fingeringPage renders silent fingering drill and seal check guide", () => {
  const store = createStore();
  const state = store.getState();
  const markup = fingeringPage(state);

  assert.ok(markup.includes("silent-drill-card"));
  assert.ok(markup.includes("静音指法操：触感与闭孔自查"));
  assert.ok(markup.includes("开启节拍静音动指"));
  assert.ok(markup.includes("基础三音起落操"));
  assert.ok(markup.includes("左右手交接操"));
  assert.ok(markup.includes("六孔全按耐力操"));
  assert.ok(markup.includes("指腹盖严自检 3 要诀"));
  assert.ok(markup.includes("压痕排查法"));
});

test("longTonePage renders beginner recommendations and banners", () => {
  const store = createStore();
  const state = store.getState();
  const markup = longTonePage(state);

  assert.ok(markup.includes("⭐ [新手首选]"));
  assert.ok(markup.includes("⚠️ [全按挑战]"));
  assert.ok(markup.includes("long-beginner-banner"));
  assert.ok(markup.includes("新手发音首选音"));
});

test("dialogView renders beginner guide separating breath and fingers", () => {
  const store = createStore();
  const state = store.getState();
  const markup = dialogView("help", state);

  assert.ok(markup.includes("科学入门法则：气息与指法先分开排查"));
  assert.ok(markup.includes("气指分开：先不按孔试发音"));
  assert.ok(markup.includes("加上手指：指腹盖严防漏气"));
  assert.ok(markup.includes("吹不响先查嘴"));
});
