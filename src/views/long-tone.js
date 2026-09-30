import { NOTES, noteLabel, frequencyFor, pitchNameFor } from "../music.js";
import { hero, holeRow, micControls } from "../components/shared.js";

export function longTonePage(state) {
  const note = state.longNote;
  return `${hero("把一口气，吹得更平稳", "长音<span>练习专区。</span>", "保持音高在绿色带内，看看这一次，你能稳稳走多远。")}
    <section class="card long-tone-card">
      <div class="long-tone-toolbar"><label for="long-note">练习音符 <select id="long-note">${NOTES.map((n) => `<option value="${n.id}" ${n.id === note.id ? "selected" : ""}>${noteLabel(n)} · ${pitchNameFor(n, state.key)}</option>`).join("")}</select></label>
        <span>${pitchNameFor(note, state.key)} · ${frequencyFor(note, state.key, state.reference).toFixed(1)} Hz · ±${state.tolerance} 音分</span>
      </div>
      ${holeRow(note)}<p class="long-tip">${note.tip}</p>
      <div class="challenge-milestones">${[[3,"青铜"],[5,"白银"],[8,"黄金"]].map(([s,m]) => `<div data-medal="${s}"><b>${s}<small>秒</small></b><span>${m}</span></div>`).join("")}</div>
      <div class="hold-readout"><strong id="hold-seconds">0.0<small>秒</small></strong><span id="hold-status">点击开始挑战，吹响后自动计时</span></div>
      <div class="hold-progress"><span id="hold-progress"></span></div>
      <div class="trace-heading"><span><i class="trace-key pitch"></i>音高走势</span><span><i class="trace-key volume"></i>音量走势</span><small>最近 12 秒 · 音量为相对 dBFS</small></div>
      <svg class="breath-chart" id="breath-chart" viewBox="0 0 800 260" role="img" aria-label="气息平稳度波形：音高与音量随时间变化"></svg>
      <p class="challenge-rule">连续绿区 3 秒获青铜，5 秒获白银，8 秒获黄金。偏离或断音会重新计时，已获成绩保留；停吹后自动结算，单次最长 30 秒。</p>
      <div class="challenge-actions"><button class="button button-primary" data-action="long-start" id="long-start">开始挑战</button><button class="button button-outline" data-action="long-finish" id="long-finish" disabled>结束并评分</button></div>
      <div id="long-result" class="long-result" aria-live="polite" hidden></div>
      ${micControls()}
    </section>`;
}

export function renderBreathChart(challenge, tolerance) {
  const samples = challenge?.samples || [];
  const end = Math.max(12, samples.at(-1)?.time || 0);
  const start = end - 12;
  const points = samples.filter((s) => s.time >= start);
  const x = (s) => 58 + (s.time - start) / 12 * 722;
  const pitchY = (s) => 90 - Math.max(-100, Math.min(100, s.cents)) * 0.62;
  const volumeY = (s) => 238 - Math.max(0, Math.min(60, 20 * Math.log10(Math.max(s.rms, 0.001)) + 60));
  const path = (getY, valid) => {
    let connected = false;
    let last = null;
    return points.map((s) => {
      if (!valid(s)) { connected = false; return ""; }
      if (last !== null && s.time - last > 0.25) connected = false;
      const command = connected ? "L" : "M";
      connected = true;
      last = s.time;
      return `${command}${x(s).toFixed(1)},${getY(s).toFixed(1)}`;
    }).join(" ");
  };
  return `<rect x="58" y="${90-tolerance*0.62}" width="722" height="${tolerance*1.24}" rx="6" fill="#e1efd9"/>
    <g fill="#748168" font-size="12"><text x="0" y="31">+100¢</text><text x="8" y="94">0¢</text><text x="0" y="155">−100¢</text><text x="0" y="190">−10 dB</text><text x="0" y="239">−60 dB</text><text x="58" y="257">${start.toFixed(0)}s</text><text x="750" y="257">${end.toFixed(0)}s</text></g>
    <path d="M58,90 H780 M58,165 H780 M58,238 H780" stroke="#d4dccb" stroke-dasharray="4 4"/>
    <path d="${path(pitchY, (s) => s.cents !== null)}" fill="none" stroke="#527943" stroke-width="2.5"/>
    <path d="${path(volumeY, () => true)}" fill="none" stroke="#bb9353" stroke-width="2"/>`;
}

export function resultMarkup(result) {
  return `<span class="section-kicker">本次长音 · ${result.medal}</span><h2>${result.score}<small> / 100 分</small></h2>
    <p>最长连续绿区 <b>${result.best.toFixed(1)} 秒</b> · 本次时长 ${result.duration.toFixed(1)} 秒</p>
    <div class="result-metrics"><span>音准命中率 <b>${Math.round(result.accuracy*100)}%</b></span><span>音高波动 <b>${result.pitchSpread.toFixed(1)} 音分</b></span><span>音量波动 <b>${result.volumeSpread.toFixed(1)} dB</b></span></div>
    <small>评分：音准 60% + 音高稳定 25% + 音量稳定 15%；波动越小越稳定。音量趋势受麦克风距离影响，练习时尽量保持位置不变。</small>`;
}
