import test from "node:test";
import assert from "node:assert/strict";
import { analyseTone, ToneTracker, toneFeedback } from "../src/tone-quality.js";

function samples(frequency = 500, { noise = 0, harmonics = false, amplitude = 0.2 } = {}) {
  let seed = 13;
  return Float32Array.from({ length: 4096 }, (_, i) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const phase = 2 * Math.PI * frequency * i / 48000;
    return amplitude * Math.sin(phase) + (harmonics ? 0.3 * Math.sin(phase * 2) + 0.1 * Math.sin(phase * 3) : 0) + noise * (seed / 2 ** 32 - 0.5);
  });
}

function spectrum(frequency, { background = -100, harmonics = false } = {}) {
  const result = new Float32Array(2048).fill(background);
  for (let h = 1; h <= (harmonics ? 6 : 1); h++) result[Math.round(h * frequency / (48000 / 4096))] = -20;
  return result;
}

function frame(frequency = 500, changes = {}) {
  return { frequency, rawFrequency: frequency, tone: { rms: 0.1, periodicity: 0.98, harmonicRatio: 0.94, processing: false, clipped: false, ...changes } };
}

function hold(tracker, from, to, makeFrame = () => frame(), environment) {
  let result;
  for (let now = from; now <= to; now += 70) result = tracker.update(now, makeFrame(now), environment);
  return result;
}

test("normal rich harmonics remain periodic and count as harmonic energy", () => {
  for (const frequency of [220, 500, 2637]) {
    const result = analyseTone(samples(frequency, { harmonics: true }), spectrum(frequency, { harmonics: true }), 48000, frequency);
    assert.ok(result.periodicity > 0.9, `${frequency}: ${result.periodicity}`);
    assert.ok(result.harmonicRatio > 0.98);
    assert.equal(result.clipped, false);
  }
});

test("broadband noise lowers structure metrics while silence and missing pitch remain unknown", () => {
  const clear = analyseTone(samples(), spectrum(500), 48000, 500);
  const noisy = analyseTone(samples(500, { noise: 0.6 }), spectrum(500, { background: -35 }), 48000, 500);
  assert.ok(noisy.periodicity < clear.periodicity - 0.3);
  assert.ok(noisy.harmonicRatio < clear.harmonicRatio - 0.5);
  const silent = analyseTone(new Float32Array(4096), new Float32Array(2048).fill(-Infinity), 48000, null);
  assert.equal(silent.rms, 0);
  assert.equal(silent.periodicity, null);
  assert.equal(silent.harmonicRatio, null);
  assert.equal(analyseTone(samples(), spectrum(500), 48000, null).harmonicRatio, null);
});

test("clipping is detected on unfiltered samples", () => {
  assert.equal(analyseTone(samples(500, { amplitude: 1.4 }), spectrum(500), 48000, 500).clipped, true);
});

test("attack and short notes do not produce a clear verdict or a comparison", () => {
  const tracker = new ToneTracker();
  const result = hold(tracker, 0, 560);
  assert.equal(result.enough, false);
  assert.equal(toneFeedback(result).kind, "uncertain");
  assert.equal(tracker.finish(), null);
});

test("clear wrong-pitch notes can be observed without receiving any pitch score", () => {
  const tracker = new ToneTracker();
  const result = hold(tracker, 0, 1400, () => frame(550));
  assert.equal(toneFeedback(result).kind, "observed");
  assert.ok(result.spread < 1e-8);
  assert.equal("score" in tracker.finish(), false);
});

test("processing, noise floor, clipping and unresolved tones cannot give clear verdicts", () => {
  for (const [changes, environment, reason] of [
    [{ processing: true }, {}, "processing"], [{}, { compatible: true }, "processing"],
    [{ clipped: true }, {}, "clipped"], [{}, { noisy: true }, "environment"],
    [{ rms: 0.03 }, { noiseFloor: 0.02 }, "environment"],
  ]) {
    const tracker = new ToneTracker();
    const result = hold(tracker, 0, 1400, () => frame(500, changes), environment);
    assert.equal(result.reason, reason);
    assert.equal(toneFeedback(result).kind, "uncertain");
    assert.equal(tracker.finish(), null);
  }
  const result = new ToneTracker().update(0, frame(null));
  assert.equal(result.reason, "unresolved");
});

test("octave jumps and raw pitch wobble remain visible despite smoothed display pitch", () => {
  const tracker = new ToneTracker();
  const result = hold(tracker, 0, 1400, (now) => ({ ...frame(), rawFrequency: now < 700 ? 500 : 1000 }));
  assert.equal(result.octaves, 1);
  assert.equal(toneFeedback(result).kind, "attention");
  const wobble = hold(new ToneTracker(), 0, 2100, (now) => ({ ...frame(), rawFrequency: 500 * 2 ** ((now % 280 < 140 ? -50 : 50) / 1200) }));
  assert.ok(wobble.spread > 25);
  assert.match(toneFeedback(wobble).title, /起伏/);
});

test("brief interruptions count once and trailing silence ends a breath without lowering its summary", () => {
  const tracker = new ToneTracker();
  hold(tracker, 0, 1400);
  hold(tracker, 1470, 1680, () => frame(null, { rms: 0 }));
  hold(tracker, 1750, 2800);
  assert.equal(tracker.breaks, 1);
  const result = hold(tracker, 2870, 3570, () => frame(null, { rms: 0 }));
  assert.ok(result.summary);
  assert.ok(result.summary.continuity < 1);
  assert.equal(result.summary.breaks, 1);
  assert.ok(Math.abs(result.summary.harmonicRatio - 0.94) < 1e-8);
  hold(tracker, 3640, 5040);
  assert.ok(tracker.finish().previous);
});

test("sample gaps do not credit unobserved time or compare across unreliable gaps", () => {
  const tracker = new ToneTracker();
  hold(tracker, 0, 1400);
  const result = tracker.update(2000, frame());
  assert.equal(result.gap, true);
  assert.equal(result.enough, false);
  assert.equal(tracker.previous, null);
  assert.equal(tracker.finish(), null);
});

test("restarting preserves a finished comparison only when explicitly requested", () => {
  const tracker = new ToneTracker();
  hold(tracker, 0, 1400);
  const first = tracker.finish();
  tracker.reset({ keepPrevious: true });
  hold(tracker, 2000, 3400);
  assert.equal(tracker.finish().previous.harmonicRatio, first.harmonicRatio);
  assert.equal("previous" in tracker.finish().previous, false);
  tracker.reset();
  assert.equal(tracker.previous, null);
});

test("metronome exclusions do not count as silent interruptions or receive observation credit", () => {
  const tracker = new ToneTracker();
  hold(tracker, 0, 1400);
  const before = tracker.points.filter((p) => p.valid).reduce((sum, p) => sum + p.dt, 0);
  for (const now of [1470, 1540, 1610]) tracker.exclude(now);
  const after = tracker.update(1680, frame());
  assert.equal(after.breaks, 0);
  assert.equal(after.enough, true);
  assert.equal(tracker.points.filter((p) => p.valid).reduce((sum, p) => sum + p.dt, 0), before);
});

test("an unresolved but audible signal is not misreported as a silent interruption", () => {
  const tracker = new ToneTracker();
  hold(tracker, 0, 1400);
  hold(tracker, 1470, 1680, () => frame(null));
  const result = tracker.update(1750, frame());
  assert.equal(result.breaks, 0);
});
