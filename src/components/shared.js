import { icon } from "./icons.js";
import { noteLabel } from "../music.js";
import { micPreflight, micMeter } from "./microphone.js";

export const PRACTICE_FEEDBACK = Object.freeze({
  idle: { title: "准备好后，吹一声", reason: "参考音会先告诉你目标。", action: "先听参考音，再试着吹。", direction: "等待声音" },
  "no-signal": { title: "还没有检测到稳定音", reason: "把笛头移近一些，距离约 30–50 厘米。", action: "对准吹孔，轻轻吹一声。", direction: "没有稳定音高" },
  "low-volume": { title: "声音太轻了", reason: "麦克风只收到很弱的气息。", action: "吹气更集中一些，保持嘴型。", direction: "音量偏低" },
  "low-pitch": { title: "声音偏低", reason: "音孔可能没有完全盖严，或气流太松。", action: "检查漏孔，再把气流集中一点。", direction: "音高偏低" },
  "high-pitch": { title: "声音偏高", reason: "气流可能过快，风门收得太紧。", action: "放松一点，减缓气流。", direction: "音高偏高" },
  near: { title: "很接近了", reason: "音高已经靠近目标。", action: "再保持 0.6 秒。", direction: "接近目标" },
  stable: { title: "稳住了", reason: "目标音已经连续稳定。", action: "继续保持，准备进入下一音。", direction: "音高稳定" },
  error: { title: "暂时没有听清", reason: "麦克风或环境可能影响了识别。", action: "检查权限、设备和环境，再试一次。", direction: "设备异常" },
});

export function practiceFeedback({ frequency = null, cents = null, rms = 0, tolerance = 35, stable = false } = {}) {
  if (stable) return { state: "stable", ...PRACTICE_FEEDBACK.stable };
  if (!frequency || !Number.isFinite(cents)) {
    const state = rms > 0.008 ? "low-volume" : "no-signal";
    return { state, ...PRACTICE_FEEDBACK[state] };
  }
  if (Math.abs(cents) <= tolerance * 0.55) return { state: "near", ...PRACTICE_FEEDBACK.near };
  const state = cents < 0 ? "low-pitch" : "high-pitch";
  return { state, ...PRACTICE_FEEDBACK[state] };
}
export function noteMarkup(note, className = "") {
  return `<span class="notation ${note.low ? "low-note" : note.high ? "high-note" : ""} ${className}" aria-label="${noteLabel(note)}">${note.number}${note.low || note.high ? '<span class="note-dot"></span>' : ""}</span>`;
}

export function micControls() {
  return `<div class="live-controls" aria-labelledby="mic-heading">
    ${micPreflight()}
    <span class="mic-state" id="mic-state" role="status" aria-live="polite"><i></i>等待开启</span>
    <button class="button button-primary" id="mic-button" data-action="mic">${icon("mic")} 测试麦克风并开始</button>
    ${micMeter()}
    <h3 id="feedback-title" aria-live="polite" aria-atomic="true">准备好了，吹一声试试</h3><p id="feedback-copy" aria-live="polite">允许权限后，我们会告诉你声音是否足够清楚。</p>
    <small>${icon("shield")} 声音只在本机处理，不录音、不上传</small></div>`;
}

export function holeRow(note) {
  return `<div class="hole-row" aria-label="${noteLabel(note)}指法，从吹孔向笛尾：${note.holes.map((h, i) => `第${6-i}孔${h === 1 ? "盖住" : h === 0.5 ? "半孔" : "打开"}`).join("，")}">
    <span>吹孔侧</span>${note.holes.map((h, i) => `<div><i class="${h === 1 ? "closed" : h === 0.5 ? "half" : ""}"></i><small>${6-i}</small></div>`).join("")}<span>笛尾</span></div>`;
}

export function hero(eyebrow, title, description, right = "") {
  return `<section class="page-heading" aria-labelledby="page-title"><div><div class="eyebrow">${icon("sun")} ${eyebrow}</div><h1 id="page-title" data-page-title tabindex="-1">${title}</h1><p>${description}</p></div>${right}</section>`;
}
