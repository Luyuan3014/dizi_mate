import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { LongTonePage } from "../src/views/long-tone.js";
import { LongToneChallenge } from "../src/practice.js";
import { performanceReport } from "../src/components/performance-report.js";
import { SongPerformance, PERFORMANCE_SONGS } from "../src/song-performance.js";

test("long-tone cleanup releases the microphone once and cancels late starts", async () => {
  const store = createStore();
  let stops = 0, resolveStart;
  const page = new LongTonePage({ store, audioService: {
    stopDemo() {}, engine: { smoother: { reset() {} } },
    stopMic() { stops++; page.onFinishLongTone(); store.setState({ mic: "off" }); },
    startMic() { return new Promise((resolve) => { resolveStart = resolve; }); },
  } });
  page.container = {};
  page.paint = () => {};
  const challenge = new LongToneChallenge();
  challenge.update(0, 0, .1);
  store.setState({ challenge, longArmed: true, mic: "on" });
  page.finish();
  assert.equal(stops, 1);
  assert.equal(store.getState().longArmed, false);
  const pending = page.start();
  page.finish();
  resolveStart();
  await pending;
  assert.equal(page.countdownTimer, null);
  assert.equal(store.getState().longArmed, false);
});

test("report comparisons distinguish different settings and missing scores", () => {
  const report = { ...new SongPerformance(PERFORMANCE_SONGS[0]).finish(), score: 80 };
  assert.match(performanceReport(report, false, { ...report, score: 70 }), /提高 10 分/);
  const changed = performanceReport(report, false, { ...report, bpm: 40, score: 70 });
  assert.match(changed, /相同条件再比较/);
  assert.doesNotMatch(changed, /提高 10 分/);
  assert.doesNotMatch(performanceReport(report, false, { ...report, score: null }), /report-comparison/);
});
