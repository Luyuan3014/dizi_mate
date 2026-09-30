import test from "node:test";
import assert from "node:assert/strict";
import { detectPitch, AudioEngine } from "../src/audio.js";
import {
  NOTES,
  KEYS,
  frequencyFor,
  centsBetween,
  describePitch,
  readSaved,
  pitchNameFor,
  noteForHoles,
  SONGS,
} from "../src/music.js";

function signal(frequency, sampleRate = 48000, harmonics = false) {
  return Float32Array.from({ length: 4096 }, (_, i) => {
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    return (
      0.2 * Math.sin(phase) +
      (harmonics ? 0.35 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase) : 0)
    );
  });
}

test("E flute: closed low 5 is B4; middle do is E5; overblown 5 is B5", () => {
  assert.ok(Math.abs(frequencyFor(NOTES[0]) - 493.883) < 0.01);
  assert.ok(Math.abs(frequencyFor(NOTES[3], "E") - 659.255) < 0.01);
  assert.ok(Math.abs(frequencyFor(NOTES[7], "E") - 987.767) < 0.01);
  assert.equal(frequencyFor(NOTES[0], "D"), 440);
  assert.equal(frequencyFor(NOTES[0], "D", 442), 442);
});

test("pitch detection finds every supported note in every key at common sample rates", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const key of Object.keys(KEYS)) {
      for (const note of NOTES) {
        const expected = frequencyFor(note, key);
        const actual = detectPitch(
          signal(expected, sampleRate),
          sampleRate,
        ).frequency;
        assert.ok(
          actual && Math.abs(centsBetween(actual, expected)) < 5,
          `${key} ${note.id} at ${sampleRate}: ${actual}`,
        );
      }
    }
  }
});

test("strong harmonics do not turn a low note into a false octave", () => {
  const target = frequencyFor(NOTES[0]);
  const { frequency } = detectPitch(signal(target, 48000, true), 48000);
  assert.ok(Math.abs(centsBetween(frequency, target)) < 5);
});

test("silence, quiet input, DC, and deterministic noise do not pass as a pitch", () => {
  assert.equal(detectPitch(new Float32Array(4096), 48000).frequency, null);
  assert.equal(
    detectPitch(
      signal(440).map((x) => x / 100),
      48000,
    ).frequency,
    null,
  );
  assert.equal(
    detectPitch(new Float32Array(4096).fill(0.2), 48000).frequency,
    null,
  );
  let seed = 13;
  const noise = Float32Array.from({ length: 4096 }, () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.4;
  });
  assert.equal(detectPitch(noise, 48000).frequency, null);
});

test("feedback preserves octave errors and respects the selected tolerance", () => {
  assert.equal(describePitch(20, 20).kind, "good");
  assert.equal(describePitch(21, 20).kind, "high");
  assert.equal(describePitch(-36).kind, "low");
  assert.equal(describePitch(300).kind, "far");
  assert.match(describePitch(1200).detail, /减缓/);
  assert.match(describePitch(-1200).detail, /集中/);
  assert.equal(centsBetween(880, 440), 1200);
});

test("persisted settings are validated and broken storage keeps practice available", () => {
  const read = (data) => readSaved({ getItem: () => data });
  assert.equal(read(null).key, "E");
  assert.equal(read("{broken").key, "E");
  assert.equal(
    readSaved({
      getItem: () => {
        throw new Error("denied");
      },
    }).reference,
    440,
  );
  assert.deepEqual(
    read(
      JSON.stringify({
        key: "toString",
        reference: 600,
        tolerance: 0,
        sessions: [{ at: "oops" }],
      }),
    ),
    { key: "E", reference: 440, tolerance: 35, sessions: [] },
  );
  assert.deepEqual(
    read(
      JSON.stringify({
        key: "C",
        reference: 442,
        tolerance: 20,
        sessions: [{ at: 10, seconds: 7, notes: ["1", "<script>", null] }],
      }),
    ),
    {
      key: "C",
      reference: 442,
      tolerance: 20,
      sessions: [{ at: 10, seconds: 7, notes: ["1"] }],
    },
  );
});

test("cancelled microphone request releases a device that arrives late", async () => {
  const originalWindow = globalThis.window;
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalCancel = globalThis.cancelAnimationFrame;
  let resolveStream;
  let stopped = 0;
  globalThis.window = { isSecureContext: true };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((resolve) => {
            resolveStream = resolve;
          }),
      },
    },
  });
  globalThis.cancelAnimationFrame = () => {};
  try {
    const engine = new AudioEngine();
    engine.ready = async () => {};
    const request = engine.start(
      () => {},
      () => {},
    );
    await Promise.resolve();
    engine.stop();
    resolveStream({
      getTracks: () => [
        {
          stop: () => {
            stopped++;
          },
        },
      ],
    });
    assert.equal(await request, false);
    assert.equal(stopped, 1);
    assert.equal(engine.stream, null);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
    if (originalCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = originalCancel;
  }
});

test("pitchNameFor and noteForHoles identify notes correctly", () => {
  assert.equal(pitchNameFor(NOTES[0], "E"), "B4");
  assert.equal(pitchNameFor(NOTES[3], "E"), "E5");
  assert.equal(pitchNameFor(NOTES[7], "E"), "B5");
  assert.equal(pitchNameFor(NOTES[0], "D"), "A4");
  assert.equal(noteForHoles([1, 1, 1, 1, 1, 1])?.id, "low5");
  assert.equal(noteForHoles([1, 1, 1, 1, 1, 1], true)?.id, "5");
  assert.equal(noteForHoles([1, 1, 1, 0, 0, 0])?.id, "1");
  assert.equal(noteForHoles([0.5, 0, 0, 0, 0, 0])?.id, "4");
  assert.equal(noteForHoles([0, 0, 0, 0, 0, 0]), null);
});

test("beginner SONGS collection defines valid notes, tempo, and sequence", () => {
  assert.ok(SONGS.length >= 6);
  for (const song of SONGS) {
    assert.ok(song.id && song.title);
    assert.ok(song.bpm >= 40 && song.bpm <= 180);
    assert.ok(song.sequence.length > 0);
    for (const noteId of song.sequence) {
      assert.ok(
        NOTES.some((n) => n.id === noteId),
        `Note ${noteId} in ${song.id} must exist in NOTES`,
      );
    }
  }
});
