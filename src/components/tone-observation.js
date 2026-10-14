import { ToneTracker, toneFeedback } from "../tone-quality.js";
import { icon } from "./icons.js";

export function toneObservationMarkup({ compact = false } = {}) {
  return `<section class="tone-observation ${compact ? "tone-compact" : ""}" aria-labelledby="tone-heading">
    <div class="tone-heading"><h2 id="tone-heading">发音观察</h2><span>单音 · 试验性反馈</span></div>
    <button type="button" class="tone-mic-toggle button button-outline" data-action="mic" data-tone-toggle>${icon("mic")} <span>开始观察</span></button>
    <div class="tone-verdict" data-tone-kind="uncertain"><strong data-tone-title role="status" aria-live="polite">等待持续单音</strong><p data-tone-advice>均匀送气，保持设备位置。</p></div>
    <dl class="tone-metrics"><div><dt>发声连续性</dt><dd data-tone-continuity>—</dd></div><div><dt>音高波动</dt><dd data-tone-spread>—</dd></div><div><dt>声音主体</dt><dd data-tone-body>—</dd></div></dl>
    ${compact ? "" : `<div class="tone-trace-heading"><span>谐波集中趋势</span><small>最近 12 秒</small></div>
    <div class="tone-trace-wrap"><span>100%</span><svg class="tone-trace" viewBox="0 0 660 100" preserveAspectRatio="none" role="img" aria-label="谐波能量占比随时间变化，断开的线表示无法可靠判断">
      <path d="M0 12H660M0 80H660" stroke="#dce3e6" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/><path data-tone-path fill="none" stroke="#238397" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    </svg><span>0%</span></div><div class="tone-spectrum-labels"><span>12 秒前</span><span>现在</span></div><p class="tone-take" data-tone-take aria-live="polite">本口气观察将在收音后显示。</p>`}
    <details class="tone-details"><summary>${icon("chart")} 声谱与判断依据</summary>
      <div class="tone-spectrogram-wrap"><span>8 kHz</span><canvas data-tone-spectrum width="720" height="180" role="img" aria-label="最近十二秒的实时声谱图，横轴为时间，纵轴为频率，明亮处表示能量较强"></canvas><span>180 Hz</span></div>
      <div class="tone-spectrum-labels"><span>12 秒前</span><span class="tone-energy-legend">弱 <i></i> 强</span><span>现在</span></div>
      <p>泛音和笛膜声是正常音色的一部分。谐波集中趋势仅表示信号中的能量分布，不代表音色得分；反馈需结合听感，比较时保持音符、力度和拾音距离一致。</p>
    </details>
    <p class="tone-caveat">${compact ? "发音观察与音准分别判断。" : "此观察不计入长音评分或奖牌。"} 环境声音与设备会影响结果。</p>
    ${compact ? "" : `<div class="tone-reference"><div class="tone-heading"><h3>听音对照</h3><span>同一音符 · 同一音区</span></div>
      <div class="tone-reference-actions"><button type="button" class="button button-outline" data-action="long-listen">${icon("volume")} 合成音高参考</button><button type="button" class="button button-outline" data-tone-import>${icon("music")} 选择竹笛实录</button></div>
      <input type="file" data-tone-file accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" hidden>
      <p data-tone-file-status>暂无竹笛实录。可选择老师或自己的录音，仅在本机试听。</p>
      <audio data-tone-reference controls preload="metadata" hidden></audio>
    </div>`}
  </section>`;
}

const setText = (element, text) => { if (element && element.textContent !== text) element.textContent = text; };

export class ToneObservation {
  constructor(element, context) {
    this.element = element;
    this.context = context;
    this.tracker = new ToneTracker();
    this.history = [];
    this.elements = Object.fromEntries(["title", "advice", "continuity", "spread", "body", "path", "take", "spectrum", "file", "file-status", "reference", "import"].map((name) => [name, element.querySelector(`[data-tone-${name}]`)]));
    this.details = element.querySelector("details");
    this.verdict = element.querySelector(".tone-verdict");
    this.onToggle = () => this.drawSpectrum();
    this.onImport = () => this.elements.file.click();
    this.onFile = () => this.loadReference();
    this.onPlay = () => {
      this.startingReference = true;
      try { this.context.audioService.stopAll(); } finally { this.startingReference = false; }
    };
    this.onError = () => { setText(this.elements["file-status"], "录音无法播放，请选择浏览器支持的音频文件。"); };
    this.details.addEventListener("toggle", this.onToggle);
    this.elements.import?.addEventListener("click", this.onImport);
    this.elements.file?.addEventListener("change", this.onFile);
    this.elements.reference?.addEventListener("play", this.onPlay);
    this.elements.reference?.addEventListener("error", this.onError);
    this.drawSpectrum();
  }

  configure(signature) {
    if (signature === this.signature) return;
    this.signature = signature;
    this.reset();
  }

  updateMicState(state) {
    const toggle = this.element.querySelector("[data-tone-toggle]");
    const active = state.mic !== "off";
    toggle.innerHTML = `${icon(active ? "pause" : "mic")} <span>${state.micStatus === "requesting" || state.micStatus === "testing" ? "取消测试" : active ? "停止观察" : "开始观察"}</span>`;
  }

  reset({ keepPrevious = false } = {}) {
    this.tracker.reset({ keepPrevious });
    this.history = [];
    this.lastPaint = null;
    this.lastSummary = null;
    setText(this.elements.title, "等待持续单音");
    setText(this.elements.advice, "均匀送气，保持设备位置。");
    for (const name of ["continuity", "spread", "body"]) setText(this.elements[name], "—");
    this.verdict.dataset.toneKind = "uncertain";
    setText(this.elements.take, "本口气观察将在收音后显示。");
    this.elements.path?.setAttribute("d", "");
    this.drawSpectrum();
  }

  update(now, frame, environment) {
    if (frame.inputDevice && this.inputDevice && frame.inputDevice !== this.inputDevice) this.reset();
    if (frame.inputDevice) this.inputDevice = frame.inputDevice;
    const result = this.tracker.update(now, frame, environment);
    if (result.gap) this.history = [];
    let bins = null;
    if (frame.spectrum && frame.binWidth) {
      bins = new Float32Array(128).fill(-100);
      for (let i = Math.ceil(180 / frame.binWidth); i < frame.spectrum.length && i * frame.binWidth <= 8000; i++) {
        const y = Math.min(127, Math.floor(Math.log(i * frame.binWidth / 180) / Math.log(8000 / 180) * 128));
        bins[y] = Math.max(bins[y], frame.spectrum[i]);
      }
    }
    const last = this.tracker.points.at(-1);
    this.history.push({ time: now, ratio: last.valid ? last.harmonicRatio : null, bins });
    this.history = this.history.filter((p) => now - p.time <= 12000);
    if (this.lastPaint !== null && now - this.lastPaint < 140 && result.summary === this.lastSummary) return;
    this.lastPaint = now;
    this.lastSummary = result.summary;
    const feedback = toneFeedback(result);
    this.verdict.dataset.toneKind = feedback.kind;
    setText(this.elements.title, feedback.title);
    setText(this.elements.advice, feedback.advice);
    setText(this.elements.continuity, result.enough && !result.reason ? result.breaks ? `断音 ${result.breaks} 次` : "较连续" : "—");
    setText(this.elements.spread, result.enough && !result.reason ? `${result.spread.toFixed(1)} 音分` : "—");
    setText(this.elements.body, result.enough && !result.reason ? result.harmonicRatio >= 0.72 && result.periodicity >= 0.85 ? "较明显" : "背景较多" : "—");
    this.paintSummary(result.summary);
    this.drawTrend(now);
    this.drawSpectrum();
  }

  exclude(now) {
    this.tracker.exclude(now);
    this.history.push({ time: now, ratio: null, bins: null });
    this.history = this.history.filter((p) => now - p.time <= 12000);
  }

  referencePlaying() {
    this.reset();
    setText(this.elements.title, "参考音播放中");
    setText(this.elements.advice, "试听结束后，再吹一个持续单音。");
  }

  finish() {
    const summary = this.tracker.finish();
    this.paintSummary(summary, true);
    if (summary) {
      setText(this.elements.continuity, summary.breaks ? `断音 ${summary.breaks} 次` : "较连续");
      setText(this.elements.spread, `${summary.spread.toFixed(1)} 音分`);
      setText(this.elements.body, summary.harmonicRatio >= 0.72 && summary.periodicity >= 0.85 ? "较明显" : "背景较多");
    } else {
      for (const name of ["continuity", "spread", "body"]) setText(this.elements[name], "—");
    }
    setText(this.elements.title, summary ? "本口气观察已结束" : "有效持续段不足");
    setText(this.elements.advice, summary ? "休息一下，再保持同一音符比较。" : "下一次保持一个持续单音，避开直吹气流。");
    this.verdict.dataset.toneKind = "uncertain";
    return summary;
  }

  paintSummary(summary, ended = false) {
    if (!summary) {
      if (ended) setText(this.elements.take, "本口气有效数据不足，暂不比较。");
      return;
    }
    let comparison = "下一口气可在相同条件下比较。";
    if (summary.previous) {
      const change = summary.harmonicRatio - summary.previous.harmonicRatio;
      const frequencyChange = Math.abs(1200 * Math.log2(summary.centerFrequency / summary.previous.centerFrequency));
      comparison = frequencyChange > 100 || summary.octaves || summary.previous.octaves
        ? "音高或音区发生变化，先保持同一音符再比较。"
        : change > 0.04 ? "谐波集中程度比上次有效观察提高。" : change < -0.04 ? "谐波集中程度比上次有效观察降低。" : "谐波集中程度与上次有效观察接近。";
    }
    setText(this.elements.take, `本口气：有效观察 ${summary.duration.toFixed(1)} 秒 · 断音 ${summary.breaks} 次 · 八度跳动 ${summary.octaves} 次。${comparison}`);
  }

  drawTrend(now) {
    if (!this.elements.path) return;
    let connected = false, last = null;
    const path = this.history.map((p) => {
      if (p.ratio === null) { connected = false; return ""; }
      if (last !== null && p.time - last > 250) connected = false;
      const command = connected ? "L" : "M";
      connected = true;
      last = p.time;
      return `${command}${((p.time - now + 12000) / 12000 * 660).toFixed(1)},${(80 - p.ratio * 68).toFixed(1)}`;
    }).join(" ");
    this.elements.path.setAttribute("d", path);
  }

  drawSpectrum() {
    if (!this.details.open) return;
    const canvas = this.elements.spectrum;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#182526";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const now = this.history.at(-1)?.time;
    for (let i = 0; i < this.history.length; i++) {
      const p = this.history[i];
      if (!p.bins) continue;
      const x = (p.time - now + 12000) / 12000 * canvas.width;
      const next = this.history[i + 1]?.time ?? p.time + 70;
      const width = Math.max(1, Math.min(150, next - p.time) / 12000 * canvas.width);
      for (let bin = 0; bin < p.bins.length; bin++) {
        const intensity = Math.max(0, Math.min(1, (p.bins[bin] + 95) / 65));
        ctx.fillStyle = `rgb(${Math.round(24 + intensity * 217)},${Math.round(37 + intensity * 181)},${Math.round(38 + intensity * 63)})`;
        ctx.fillRect(x, canvas.height * (1 - (bin + 1) / 128), width, canvas.height / 128 + 0.5);
      }
    }
    if (!this.history.some((p) => p.bins)) {
      ctx.fillStyle = "#b8cdca";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("等待麦克风输入", canvas.width / 2, canvas.height / 2);
    }
  }

  async loadReference() {
    const file = this.elements.file.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || !(/\.(wav|mp3|m4a|ogg|flac|aac|webm)$/i.test(file.name) || file.type.startsWith("audio/"))) {
      setText(this.elements["file-status"], "请选择 20 MB 以内的音频文件。");
      this.elements.file.value = "";
      return;
    }
    this.stopReference();
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.referenceUrl = URL.createObjectURL(file);
    this.elements.reference.src = this.referenceUrl;
    this.elements.reference.hidden = false;
    setText(this.elements["file-status"], `本地实录：${file.name}。请确认音符与音区；此录音不作为评分标准。`);
  }

  stopReference() { if (!this.startingReference) this.elements.reference?.pause(); }

  destroy() {
    this.stopReference();
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.details.removeEventListener("toggle", this.onToggle);
    this.elements.import?.removeEventListener("click", this.onImport);
    this.elements.file?.removeEventListener("change", this.onFile);
    this.elements.reference?.removeEventListener("play", this.onPlay);
    this.elements.reference?.removeEventListener("error", this.onError);
    this.history = [];
  }
}
