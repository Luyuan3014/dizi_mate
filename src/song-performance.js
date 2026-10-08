import { NOTES, KEYS, frequencyFor, centsBetween } from "./music.js";

// Each pair is [note, beats]; these are complete melodies, separate from library excerpts.
const melody = (ids, lengths = {}) => ids.split(" ").map((id, i) => ({ id, beats: lengths[i] || 1 }));
export const PERFORMANCE_SONGS = [
  { id: "tigers-full", title: "两只老虎", subtitle: "完整旋律 · 32 拍", bpm: 72, beats: 4,
    notes: melody("1 2 3 1 1 2 3 1 3 4 5 3 4 5 5 6 5 4 3 1 5 6 5 4 3 1 1 low5 1 1 low5 1", {10:2,13:2,14:.5,15:.5,16:.5,17:.5,20:.5,21:.5,22:.5,23:.5,28:2,31:2}),
    phrases: ["两只老虎，两只老虎", "跑得快，跑得快", "一只没有耳朵，一只没有尾巴", "真奇怪，真奇怪"], boundaries: [0,8,14,26,32] },
  { id: "star-full", title: "小星星", subtitle: "完整旋律 · 48 拍", bpm: 68, beats: 4,
    notes: melody("1 1 5 5 6 6 5 4 4 3 3 2 2 1 5 5 4 4 3 3 2 5 5 4 4 3 3 2 1 1 5 5 6 6 5 4 4 3 3 2 2 1", {6:2,13:2,20:2,27:2,34:2,41:2}),
    phrases: ["一闪一闪亮晶晶", "满天都是小星星", "挂在天上放光明", "好像许多小眼睛", "一闪一闪亮晶晶", "满天都是小星星"], boundaries: [0,7,14,21,28,35,42] },
  { id: "joy-theme", title: "欢乐颂", subtitle: "完整主题 · 32 拍", bpm: 72, beats: 4,
    notes: melody("3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 3 3 4 5 5 4 3 2 1 1 2 3 2 1 1", {12:1.5,13:.5,14:2,27:1.5,28:.5,29:2}),
    phrases: ["欢乐女神，圣洁美丽", "灿烂光芒照大地", "我们怀着火焰般的热情", "来到你的圣殿里"], boundaries: [0,8,15,23,30] },
];

export function songTimeline(song, bpm = song.bpm) {
  let start = 0;
  const notes = song.notes.map(({ id, beats }, index) => {
    const duration = beats * 60000 / bpm;
    const result = { id, index, start, end: start + duration, duration, beats };
    start += duration;
    return result;
  });
  return { notes, duration: start };
}
const mean = (values) => values.length ? values.reduce((a,b) => a+b,0) / values.length : null;
const percent = (n, d) => d ? Math.round(100 * n / d) : 0;
const round = (n) => n === null ? null : Math.round(n);

export class SongPerformance {
  constructor(song, { bpm = song.bpm, key = "E", reference = 440, tolerance = 35 } = {}) {
    this.song = song;
    this.settings = { bpm, key, reference, tolerance };
    this.timeline = songTimeline(song, bpm);
    this.samples = [];
    this.attacks = new Map();
    this.lastFrequency = null;
    this.lastTime = -Infinity;
    this.lastSampleTime = -Infinity;
    this.result = null;
  }

  targetAt(time) { return this.timeline.notes.find((n) => time >= n.start && time < n.end) || null; }

  sample(time, frequency, rms = 0, masked = false) {
    if (this.result || time < 0 || time >= this.timeline.duration || time < this.lastSampleTime) return;
    this.lastSampleTime = time;
    const valid = Number.isFinite(frequency) && frequency > 0 && rms >= 0.008;
    const target = this.targetAt(time);
    const cents = valid ? centsBetween(frequency, frequencyFor(NOTES.find((n) => n.id === target.id), this.settings.key, this.settings.reference)) : null;
    this.samples.push({ time, rms, masked, frequency: valid ? frequency : null });
    if (masked) return;
    const onset = valid && (!this.lastFrequency || time - this.lastTime > 250 || Math.abs(centsBetween(frequency, this.lastFrequency)) > 80);
    if (onset) {
      const window = Math.min(300, 60000 / this.settings.bpm * .4);
      const candidate = this.timeline.notes
        .filter((n) => !this.attacks.has(n.index) && Math.abs(time - n.start) <= window &&
          Math.abs(centsBetween(frequency, frequencyFor(NOTES.find((note) => note.id === n.id), this.settings.key, this.settings.reference))) <= this.settings.tolerance)
        .sort((a,b) => Math.abs(time-a.start) - Math.abs(time-b.start))[0];
      if (candidate) this.attacks.set(candidate.index, time - candidate.start);
    }
    this.lastTime = time;
    this.lastFrequency = valid ? frequency : null;
    return { target, cents, good: cents !== null && Math.abs(cents) <= this.settings.tolerance };
  }

  noteResult(note) {
    let excluded = 0, observed = 0, good = 0;
    const voiced = [];
    const target = frequencyFor(NOTES.find((n) => n.id === note.id), this.settings.key, this.settings.reference);
    for (let i=0; i<this.samples.length; i++) {
      const sample = this.samples[i];
      // Time weighting is independent of frame rate. Gaps beyond 150 ms earn no credit.
      const end = Math.min(this.samples[i+1]?.time ?? sample.time+70, sample.time+150, this.evaluationEnd ?? this.timeline.duration);
      const duration = Math.max(0, Math.min(note.end,end)-Math.max(note.start,sample.time));
      if (!duration) continue;
      if (sample.masked) { excluded+=duration; continue; }
      if (!sample.frequency) continue;
      const cents = centsBetween(sample.frequency,target);
      const stableStart = note.start+Math.min(120,note.duration*.2);
      const stableEnd = note.end-Math.min(60,note.duration*.1);
      const stableDuration = Math.max(0,Math.min(stableEnd,end)-Math.max(stableStart,sample.time));
      voiced.push({ cents, duration, stableDuration });
      observed+=duration;
      if (Math.abs(cents)<=this.settings.tolerance) good+=duration;
    }
    const bias = observed ? voiced.reduce((sum,s) => sum+s.cents*s.duration,0)/observed : null;
    const sustained = voiced.filter((s) => s.stableDuration > 0);
    const stableTime = sustained.reduce((sum,s) => sum+s.stableDuration,0);
    const stableBias = stableTime ? sustained.reduce((sum,s) => sum+s.cents*s.stableDuration,0)/stableTime : null;
    const pitchSpread = sustained.length >= 3 ? Math.sqrt(sustained.reduce((sum,s) => sum+(s.cents-stableBias)**2*s.stableDuration,0)/stableTime) : null;
    const eligible = note.duration-excluded;
    return { index: note.index, id: note.id, start: note.start, duration: note.duration,
      accuracy: percent(good, eligible), coverage: percent(observed, eligible),
      bias: round(bias), spread: round(pitchSpread),
      onset: this.attacks.has(note.index) ? round(this.attacks.get(note.index)) : null,
      observed, eligible, good };
  }

  finish(elapsed = this.timeline.duration, reason = "completed") {
    if (this.result) return this.result;
    this.evaluationEnd = Math.max(0,Math.min(elapsed,this.timeline.duration));
    const rows = this.timeline.notes.map((n) => this.noteResult(n));
    const eligible = rows.reduce((n,r) => n+r.eligible,0);
    const observed = rows.reduce((n,r) => n+r.observed,0);
    const accuracy = percent(rows.reduce((n,r) => n+r.good,0), eligible);
    const coverage = percent(observed, eligible);
    const rhythm = percent(rows.filter((r) => r.onset !== null).length, rows.length);
    const stableRows = rows.filter((r) => r.spread !== null);
    const stability = observed ? round(mean(stableRows.map((r) => Math.max(0, 100 * (1-r.spread / (this.settings.tolerance*2)))))) : null;
    const completed = reason === "completed" && elapsed >= this.timeline.duration;
    const score = observed ? Math.round(.5*accuracy + .2*rhythm + .2*coverage + .1*(stability || 0)*accuracy/100) : null;
    const phrases = this.song.phrases.map((label, i) => {
      const part = rows.slice(this.song.boundaries[i], this.song.boundaries[i+1]);
      return { label, from: this.song.boundaries[i]+1, to: this.song.boundaries[i+1], accuracy: round(mean(part.map((r) => r.accuracy))) };
    });
    const bias = observed ? round(rows.reduce((sum,r) => sum+(r.bias || 0)*r.observed,0)/observed) : null;
    this.result = { version: 1, id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`, at: Date.now(),
      songId: this.song.id, title: this.song.title, ...this.settings, duration: this.timeline.duration,
      elapsed: Math.max(0, Math.min(elapsed, this.timeline.duration)), completed, reason, score, accuracy, coverage, rhythm, stability, bias,
      missed: rows.filter((r) => r.coverage === 0).length, rows, phrases };
    return this.result;
  }
}

export function reportAdvice(report) {
  if (report.score === null) return ["本次未识别到有效音高，无法评估演奏。检查麦克风权限、调性和拾音距离，再试一次。"];
  const advice = [];
  if (!report.completed) advice.push("本次提前结束，未吹奏部分计入未完成。建议下次连贯吹完后再比较总分。");
  if (report.coverage < 70) advice.push(`有效吹奏覆盖 ${report.coverage}%。先用慢速吹全每一句，长音保持到音符结束，句末再换气。`);
  if (report.accuracy < 80) {
    const worst = report.rows.filter((r) => r.coverage > 0).sort((a,b) => a.accuracy-b.accuracy)[0];
    if (worst) advice.push(`重点练第 ${worst.index+1} 个音（${NOTES.find((n) => n.id === worst.id).solfege}）：${Math.abs(worst.bias || 0) > 950 ? "注意音区与急吹力度" : (worst.bias || 0) > 0 ? "音高偏高，适当放松气速" : "检查漏孔，并集中气流"}。先单音稳定 3 秒，再接回旋律。`);
  }
  if (report.rhythm < 80) advice.push("放慢速度，对着起拍线换音；同音重复时轻吐一次，让每个音的起音清楚。起音识别会受设备延迟和音高平滑影响。");
  if (report.stability !== null && report.stability < 75) advice.push("长音中音高波动较大。保持均匀送气，练习 3 / 5 秒长音，再逐步恢复原速。");
  if (!advice.length) advice.push("本次音准、起音和连贯度都较稳。保持目前速度，下一遍关注乐句收尾和自然换气。");
  return advice;
}

export function readReports(storage) {
  try {
    const value = JSON.parse(storage.getItem("dizimate-reports-v1"));
    return Array.isArray(value) ? value.filter((r) => r?.version === 1 && typeof r.id === "string" &&
      PERFORMANCE_SONGS.some((s) => s.id === r.songId) && typeof r.title === "string" && Number.isFinite(r.at) &&
      Object.hasOwn(KEYS, r.key) && Number.isFinite(r.bpm) && r.bpm >= 40 && r.bpm <= 120 &&
      Number.isFinite(r.reference) && r.reference >= 430 && r.reference <= 450 && [20,35,50].includes(r.tolerance) &&
      Number.isFinite(r.duration) && r.duration > 0 && Number.isFinite(r.elapsed) && r.elapsed >= 0 && r.elapsed <= r.duration &&
      typeof r.completed === "boolean" && typeof r.reason === "string" &&
      [r.score,r.stability].every((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100)) &&
      [r.accuracy,r.coverage,r.rhythm].every((v) => Number.isFinite(v) && v >= 0 && v <= 100) &&
      (r.bias === null || Number.isFinite(r.bias)) && Number.isInteger(r.missed) &&
      Array.isArray(r.rows) && r.rows.length === PERFORMANCE_SONGS.find((s) => s.id === r.songId).notes.length && r.rows.every((n) =>
        NOTES.some((note) => note.id === n.id) && Number.isInteger(n.index) && Number.isFinite(n.accuracy) && Number.isFinite(n.coverage) &&
        [n.bias,n.spread,n.onset].every((v) => v === null || Number.isFinite(v))) &&
      Array.isArray(r.phrases) && r.phrases.length <= 10 && r.phrases.every((p) => typeof p.label === "string" && Number.isFinite(p.accuracy) && Number.isFinite(p.from) && Number.isFinite(p.to)))
      .slice(-20) : [];
  } catch { return []; }
}
