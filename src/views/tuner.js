import { NOTES } from "../music.js";
import { hero, noteMarkup, micControls } from "../components/shared.js";

export function tunerPage(state) {
  return `${hero("听见音高，也看见指法", "实时<span>调音器。</span>", `${state.key} 调 · 筒音作 5 · A4 = ${state.reference} Hz · 绿色范围 ±${state.tolerance} 音分`)}
    <section class="card tuner-card">
      <div class="tuner-dial" id="tuner-dial"><span class="section-kicker">最近的简谱音符</span>
        <div id="tuner-note" class="tuner-note">—</div><strong id="tuner-name">等待声音</strong>
        <div class="tuner-readings"><span id="tuner-hz">— Hz</span><span id="tuner-delta">— Hz 偏差</span><span id="tuner-cents">— 音分</span></div>
        <div class="tuner-scale"><span class="pitch-safe-zone" style="left:${50-state.tolerance/2}%;width:${state.tolerance}%"></span><span class="pitch-center"></span><i id="tuner-needle" hidden></i></div>
        <div class="pitch-scale-labels"><span>−100 音分</span><span>准确</span><span>+100 音分</span></div>
        <p id="tuner-target">吹响后显示最近音符的目标频率</p>
      </div>
      <div class="tuner-notes">${NOTES.map((n) => `<span data-tuner-note="${n.id}">${noteMarkup(n)}</span>`).join("")}</div>
      <div class="tuner-fingering" id="tuner-fingering"><p>识别到音符后，这里同步显示对应孔位和气息要领。</p></div>
      <div class="hole-legend"><span><i class="legend-hole closed"></i>盖住</span><span><i class="legend-hole"></i>打开</span><span><i class="legend-hole half"></i>半孔</span></div>
      ${micControls()}
    </section>`;
}
