import { icon } from "./icons.js";
import { noteLabel } from "../music.js";
export function noteMarkup(note, className = "") {
  return `<span class="notation ${note.low ? "low-note" : note.high ? "high-note" : ""} ${className}" aria-label="${noteLabel(note)}">${note.number}${note.low || note.high ? '<span class="note-dot"></span>' : ""}</span>`;
}

export function micControls() {
  return `<div class="live-controls"><span class="mic-state" id="mic-state"><i></i>等待开启</span>
    <button class="button button-primary" id="mic-button" data-action="mic">${icon("mic")} 开启麦克风，试着吹</button>
    <h3 id="feedback-title" aria-live="polite">准备好了，轻轻吹一声</h3><p id="feedback-copy">让麦克风离笛子约 30–50 厘米，避开直吹气流。</p>
    <small>${icon("shield")} 声音只在本机处理，不录音、不上传</small></div>`;
}

export function holeRow(note) {
  return `<div class="hole-row" aria-label="${noteLabel(note)}指法，从吹孔向笛尾：${note.holes.map((h, i) => `第${6-i}孔${h === 1 ? "盖住" : h === 0.5 ? "半孔" : "打开"}`).join("，")}">
    <span>吹孔侧</span>${note.holes.map((h, i) => `<div><i class="${h === 1 ? "closed" : h === 0.5 ? "half" : ""}"></i><small>${6-i}</small></div>`).join("")}<span>笛尾</span></div>`;
}

export function hero(eyebrow, title, description, right = "") {
  return `<section class="page-heading"><div><div class="eyebrow">${icon("sun")} ${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${right}</section>`;
}
