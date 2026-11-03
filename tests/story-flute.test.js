import test from "node:test";
import assert from "node:assert/strict";
import { SONGS, NOTES, STORY_FLUTE_MELODY } from "../src/music.js";
import { PERFORMANCE_SONGS, songTimeline } from "../src/song-performance.js";
import { songsPage } from "../src/views/songs.js";
import { Metronome } from "../src/metronome.js";
import { createStore } from "../src/store.js";

test("故事前奏笛子曲谱使用库内指法并保留原曲节奏", () => {
  const song = SONGS.find((s) => s.id === "story-flute");
  assert.ok(song, "story-flute song must exist");
  assert.equal(song.title, "这是谁的故事");
  assert.equal(song.key, "D");
  assert.equal(song.audio, "/audio/story-flute-intro.mp3");
  assert.equal(song.bpm, 72);
  assert.ok(song.sequence.length > 20);
  assert.equal(song.sequence.length, STORY_FLUTE_MELODY.length);
  assert.equal(song.durations.length, STORY_FLUTE_MELODY.length);
  for (const id of song.sequence) {
    assert.ok(NOTES.some((note) => note.id === id), `unknown note id ${id}`);
  }
  const beats = song.durations.reduce((sum, value) => sum + value, 0);
  assert.equal(beats, 20);
});

test("故事前奏笛子跟曲演奏时间线与逐音练习一致", () => {
  const song = SONGS.find((s) => s.id === "story-flute");
  const performance = PERFORMANCE_SONGS.find((s) => s.id === "story-flute-full");
  assert.ok(performance, "matching performance song must exist");
  assert.deepEqual(performance.notes.map((n) => n.id), song.sequence);
  assert.deepEqual(performance.notes.map((n) => n.beats), song.durations);
  assert.equal(performance.boundaries.at(-1), performance.notes.length);
  const timeline = songTimeline(performance, 72);
  assert.ok(Math.abs(timeline.duration - 20 * 60000 / 72) < 1e-6);
});

test("故事前奏笛子曲卡显示原调与简谱高低点", () => {
  const state = createStore({ sessions: [], favoriteSongs: [], songProgress: {}, recentSongs: [], reports: [] }).getState();
  const html = songsPage(state, "story-flute", "all");
  assert.match(html, /这是谁的故事/);
  assert.match(html, /原调 D/);
  assert.match(html, /试听原声/);
  assert.match(html, /<sup>·<\/sup>/);
  assert.doesNotMatch(html, /high1/);
});

test("试听示范按曲谱时值推进，而不是每个音都占一拍", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const context = { currentTime: 0 };
  const clicks = [];
  const tones = [];
  const engine = {
    ready: async () => context,
    click: (time) => clicks.push(time),
    scheduleTone: (frequency, duration, time) => tones.push({ frequency, duration, time }),
    stopClicks() {},
    stopTones() {},
  };
  const metro = new Metronome(engine);
  await metro.start({ bpm: 60, beats: 4, sequence: ["1", "2", "3"], durations: [2, 0.5, 1], frequencyForNote: (id) => Number(id) * 440 });
  for (let ms = 0; ms < 5000; ms += 25) {
    context.currentTime += 0.025;
    t.mock.timers.tick(25);
  }
  assert.equal(clicks.length, 3);
  assert.ok(Math.abs(clicks[1] - clicks[0] - 2) < 1e-9);
  assert.ok(Math.abs(clicks[2] - clicks[1] - 0.5) < 1e-9);
  assert.ok(Math.abs(tones[0].duration - 2 * 0.95) < 1e-9);
  assert.equal(metro.running, false);
  t.mock.timers.reset();
});
