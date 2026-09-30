import { icon } from "./icons.js";

export function metronomeView(state) {
  const metro = state.metronome;
  return `<details class="metronome" id="metronome" ${metro.open ? "open" : ""}>
    <summary>${icon("clock")} 节拍器 <span id="metro-summary">${metro.bpm} BPM · ${metro.beats}/4${metro.running ? " · 运行中" : ""}</span></summary>
    <div class="metro-controls">
      <label>速度 <input id="metro-bpm" type="number" min="40" max="180" step="1" value="${metro.bpm}" aria-label="节拍器速度 BPM"> <span>BPM</span></label>
      <label>拍号 <select id="metro-beats" aria-label="节拍器拍号">${[2, 3, 4].map((b) => `<option value="${b}" ${b === metro.beats ? "selected" : ""}>${b}/4</option>`).join("")}</select></label>
      <button class="button button-outline" data-action="metronome" id="metro-toggle">${metro.running ? "停止" : "开始"}</button>
    </div><div class="metro-beats" id="metro-dots" aria-label="当前节拍">${Array.from({length: metro.beats}, (_, b) => `<i class="${b === 0 ? "accent" : ""}">${b + 1}</i>`).join("")}</div>
    <p>40–180 BPM · 第一拍重音</p>
  </details>`;
}
