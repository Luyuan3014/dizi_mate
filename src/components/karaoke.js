import { NOTES, frequencyFor } from "../music.js";
import { PERFORMANCE_SONGS, SongPerformance, songTimeline } from "../song-performance.js";
import { icon } from "./icons.js";
import { noteMarkup } from "./shared.js";
import { performanceReport, exportPerformanceReport } from "./performance-report.js";

export const karaokeEntry = () => `<div class="companion-modes" role="group" aria-label="实时陪练模式"><button data-action="karaoke-free" aria-pressed="true">${icon("mic")} 自由练音</button><button data-action="karaoke-song" aria-pressed="false">${icon("music")} 跟曲演奏</button></div>`;

export class Karaoke {
  constructor(context, container) {
    this.context = context;
    this.container = container;
    this.mode = "free";
    this.song = PERFORMANCE_SONGS[0];
    this.bpm = this.song.bpm;
    this.sound = false;
    this.status = "idle";
    this.offset = 0;
    this.generation = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.trace = [];
    this.panel = container.querySelector("#karaoke-panel");
    this.stage = container.querySelector("#karaoke-stage");
    this.render();
  }

  get busy() { return ["requesting", "countdown", "running", "paused", "preview"].includes(this.status); }
  elapsed() { return this.status === "paused" ? this.offset : Math.max(this.resumeAt || 0, (this.context.audioService.engine.context.currentTime - this.startTime) * 1000); }

  setMode(mode) {
    if (mode === this.mode) return;
    this.context.audioService.stopAll();
    if (this.busy) this.finish("interrupted");
    this.mode = mode;
    if (mode === "song") {
      const state = this.context.store.getState();
      this.freeLesson = { lesson: state.lesson, note: state.note, index: state.index };
      this.syncLesson();
    } else if (this.freeLesson) this.context.store.setState(this.freeLesson);
    this.container.querySelector("#free-companion").hidden = mode !== "free";
    this.panel.hidden = mode !== "song";
    this.stage.hidden = mode !== "song";
    this.container.querySelectorAll(".companion-modes button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.action === `karaoke-${mode}`)));
    this.render();
  }

  syncLesson() {
    this.context.store.setState({ lesson: { id: this.song.id, name: this.song.title, sequence: this.song.notes.map((n) => n.id),
      instruction: "完整旋律跟曲演奏。跟随下方起拍线换音，指法会同步显示。", stage: "跟曲演奏" },
      note: NOTES.find((n) => n.id === this.song.notes[0].id), index: 0, customHoles: null });
  }

  render() {
    if (!this.panel || !this.stage) return;
    this.displayIndex = null;
    const next = this.container.querySelector("#practice-next-btn");
    if (next) next.hidden = this.mode === "song";
    const duration = songTimeline(this.song, this.bpm).duration;
    const playing = ["countdown", "running"].includes(this.status);
    const locked = this.busy;
    this.panel.innerHTML = `<div class="karaoke-intro"><span class="karaoke-badge">${icon("sparkle")} 像 K 歌一样，吹完整首</span><h2>让旋律，看得见</h2><p>跟着音符吹，听见每一拍的进步。</p></div>
      <label class="karaoke-field">选择曲目<select id="karaoke-song-select" ${locked ? "disabled" : ""}>${PERFORMANCE_SONGS.map((s) => `<option value="${s.id}" ${s.id === this.song.id ? "selected" : ""}>${s.title} · ${s.subtitle}</option>`).join("")}</select></label>
      <label class="karaoke-field">演奏速度 <span><b id="karaoke-bpm-label">${this.bpm}</b> BPM</span><input type="range" id="karaoke-bpm" min="40" max="120" step="1" value="${this.bpm}" ${locked ? "disabled" : ""}></label>
      <div class="karaoke-speed-presets"><button data-action="karaoke-slow" ${locked ? "disabled" : ""}>慢速练习</button><button data-action="karaoke-original" ${locked ? "disabled" : ""}>原速 ${this.song.bpm}</button><span>${Math.round(duration/1000)} 秒 · ${this.song.notes.length} 个音</span></div>
      <label class="karaoke-sound"><input type="checkbox" id="karaoke-sound" ${this.sound ? "checked" : ""} ${locked ? "disabled" : ""}> 节拍伴奏 <small>建议戴耳机，避免外放串音</small></label>
      <div class="karaoke-start-actions"><button class="button mic-button" data-action="karaoke-start" ${playing || this.status === "preview" ? "disabled" : ""}>${icon(this.status === "requesting" ? "pause" : "play")} ${this.status === "requesting" ? "等待授权 · 点击取消" : this.status === "paused" ? "倒数后继续演奏" : this.status === "finished" ? "再吹一遍" : "开始跟曲演奏"}</button>
      ${playing || this.status === "paused" ? `<div class="karaoke-secondary-actions">${playing ? `<button class="button button-outline" data-action="karaoke-pause">${icon("pause")} 暂停</button>` : ""}<button class="button button-outline" data-action="karaoke-end">结束并生成报告</button></div>` : `<button class="button button-outline" data-action="karaoke-preview" ${this.status === "requesting" ? "disabled" : ""}>${icon(this.status === "preview" ? "pause" : "headphone")} ${this.status === "preview" ? "停止试听" : "先听完整旋律"}</button>`}</div>
      <p class="karaoke-status" id="karaoke-status" role="status">${this.status === "paused" ? "已暂停，麦克风已释放。继续时会重新倒数。" : this.status === "finished" ? "演奏已结束，向下查看报告。" : this.status === "requesting" ? "请在浏览器提示中允许使用麦克风。" : this.status === "preview" ? "正在试听合成参考旋律，不计演奏成绩。" : "4 拍倒数后开始 · 吹完自动出报告"}</p>
      <div class="privacy-note">${icon("shield")} 声音仅在本机分析，不录音、不上传</div>`;
    this.stage.innerHTML = `<section class="karaoke-stage card" aria-label="跟曲演奏台"><div class="karaoke-stage-heading"><div><span class="section-kicker">FOLLOW THE MELODY · 跟着旋律</span><h2>${this.song.title}<small>完整旋律</small></h2></div><div class="karaoke-live-stats"><span>当前连击 <b id="karaoke-combo">${this.combo}</b></span><span>最高连击 <b id="karaoke-best">${this.bestCombo}</b></span><span>时间 <b id="karaoke-time">0:00 / ${this.formatTime(duration)}</b></span></div></div>
      <div class="karaoke-transport">${playing || this.status === "paused" ? `<button class="button button-outline" data-action="${playing ? "karaoke-pause" : "karaoke-start"}">${icon(playing ? "pause" : "play")} ${playing ? "暂停演奏" : "继续演奏"}</button><button class="button button-outline" data-action="karaoke-end">结束并生成报告</button>` : ""}</div>
      <div class="karaoke-current"><div id="karaoke-target">准备吹奏 ${noteMarkup(NOTES.find((n) => n.id === this.song.notes[0].id))}</div><span id="karaoke-live-feedback" role="status">先试听，再跟着起拍线吹</span><div class="karaoke-pitch-readout">实际 <b id="karaoke-frequency">—</b><small id="karaoke-cents">等待声音</small></div></div>
      <div class="karaoke-roll" role="img" aria-label="滚动音高谱：绿色为目标音符，橙色为实际吹奏轨迹，竖线为当前起拍位置"><svg id="karaoke-roll-svg" viewBox="0 0 1000 270" aria-hidden="true"></svg><div class="karaoke-countdown" id="karaoke-countdown" hidden></div></div>
      <div class="karaoke-chart-key"><span><i class="target-key"></i>目标音符</span><span><i class="trace-key"></i>我的音高</span><span>竖线到达音符左端时起音</span></div>
      <div class="karaoke-progress" role="progressbar" aria-label="演奏进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="karaoke-progress-fill"></i></div>
      <div id="karaoke-phrase" class="karaoke-phrase">${this.song.phrases[0]}</div><div class="karaoke-note-strip" id="karaoke-notes">${this.song.notes.map((n,i) => `<span data-karaoke-index="${i}">${noteMarkup(NOTES.find((note) => note.id === n.id))}<small>${n.beats === 1 ? "♩" : `${n.beats} 拍`}</small></span>`).join("")}</div>
    </section><div id="karaoke-report">${this.report ? performanceReport(this.report) : ""}</div>`;
    this.drawRoll(this.status === "paused" ? this.offset : 0);
    if (this.status === "paused") this.updateProgress(this.offset);
    if (playing) this.tick();
  }

  formatTime(ms) { const s = Math.floor(ms/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

  async start() {
    if (this.status === "requesting") { this.cancel(); return; }
    if (["running", "countdown", "preview"].includes(this.status)) return;
    const resuming = this.status === "paused";
    this.status = "idle";
    this.context.audioService.stopAll();
    if (!resuming) {
      this.offset = 0;
      this.performance = new SongPerformance(this.song, { ...this.context.store.getState(), bpm: this.bpm });
      this.combo = 0;
      this.bestCombo = 0;
      this.lastScored = -1;
      this.displayIndex = null;
      this.trace = [];
      this.report = null;
    }
    this.status = "requesting";
    const generation = ++this.generation;
    this.render();
    await this.context.audioService.startMic();
    if (generation !== this.generation || this.mode !== "song") return;
    if (this.context.store.getState().mic !== "on") { this.status = resuming ? "paused" : "idle"; this.render(); return; }
    const audioTime = this.context.audioService.engine.context.currentTime;
    this.startTime = audioTime + 4*60/this.bpm - this.offset/1000;
    this.resumeAt = this.offset;
    this.performance.lastFrequency = null;
    this.performance.lastTime = -Infinity;
    this.nextClick = audioTime + .1;
    this.status = "countdown";
    this.render();
    this.timer = setInterval(() => this.tick(), 50);
    this.stage.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  tick() {
    if (!["countdown", "running", "preview"].includes(this.status)) return;
    const engine = this.context.audioService.engine;
    const audioTime = engine.context.currentTime;
    if (this.status === "preview") {
      const elapsed = Math.max(0, (audioTime-this.previewStart)*1000);
      const timeline = songTimeline(this.song, this.bpm);
      this.drawRoll(elapsed);
      this.updateProgress(elapsed);
      if (elapsed >= timeline.duration) { this.stopPreview(); return; }
      // Schedule with the audio clock; the display is never used as the sound clock.
      while (this.previewIndex < timeline.notes.length && this.previewStart+timeline.notes[this.previewIndex].start/1000 <= audioTime+.15) {
        const n = timeline.notes[this.previewIndex++];
        engine.scheduleTone(frequencyFor(NOTES.find((note) => note.id === n.id), this.context.store.getState().key, this.context.store.getState().reference), n.duration/1000*.85, this.previewStart+n.start/1000);
      }
      return;
    }
    const raw = (audioTime-this.startTime)*1000;
    const elapsed = Math.max(this.resumeAt, raw);
    const countdown = this.stage.querySelector("#karaoke-countdown");
    if (raw < this.resumeAt) {
      countdown.hidden = false;
      countdown.textContent = String(Math.ceil((this.resumeAt-raw)/(60000/this.bpm)));
      const status = this.panel.querySelector("#karaoke-status");
      if (status.textContent !== "跟着 4 拍倒数，准备起音…") status.textContent = "跟着 4 拍倒数，准备起音…";
    } else {
      if (this.status === "countdown") this.nextClick = Math.max(audioTime, this.startTime + Math.ceil(this.resumeAt/(60000/this.bpm))*60/this.bpm);
      this.status = "running";
      countdown.hidden = true;
      const status = this.panel.querySelector("#karaoke-status");
      if (status.textContent !== "正在演奏 · 跟着起拍线换音") status.textContent = "正在演奏 · 跟着起拍线换音";
    }
    if (this.sound || this.status === "countdown") {
      while (this.nextClick <= audioTime+.12) {
        if (this.nextClick >= audioTime) engine.click(this.nextClick, Math.round((this.nextClick-this.startTime)/(60/this.bpm)) % 4 === 0);
        this.nextClick += 60/this.bpm;
      }
    }
    const duration = this.performance.timeline.duration;
    this.scoreCompletedNotes(Math.min(elapsed, duration));
    this.drawRoll(elapsed);
    this.updateProgress(elapsed);
    if (raw >= duration) this.finish("completed");
  }

  updateProgress(elapsed) {
    const timeline = this.performance?.timeline || songTimeline(this.song, this.bpm);
    const progress = Math.min(100, Math.round(elapsed/timeline.duration*100));
    this.stage.querySelector("#karaoke-progress-fill").style.width = `${progress}%`;
    this.stage.querySelector(".karaoke-progress").setAttribute("aria-valuenow",progress);
    this.stage.querySelector("#karaoke-time").textContent = `${this.formatTime(elapsed)} / ${this.formatTime(timeline.duration)}`;
    const target = timeline.notes.find((n) => elapsed >= n.start && elapsed < n.end);
    if (target && this.displayIndex !== target.index) {
      this.displayIndex = target.index;
      const note = NOTES.find((n) => n.id === target.id);
      if (this.mode === "song") this.context.store.setState({ index: target.index, note, customHoles: null });
      this.stage.querySelector("#karaoke-target").innerHTML = `现在吹 ${noteMarkup(note)}<small>${note.solfege} · ${target.beats} 拍</small>`;
      const current = this.stage.querySelector(`[data-karaoke-index="${target.index}"]`);
      this.stage.querySelectorAll("[data-karaoke-index]").forEach((el) => el.classList.toggle("current", el === current));
      const strip = this.stage.querySelector("#karaoke-notes");
      strip.scrollLeft = Math.max(0, current.offsetLeft-strip.offsetLeft-strip.clientWidth/2);
      const phrase = this.song.boundaries.findIndex((v,i) => target.index >= v && target.index < this.song.boundaries[i+1]);
      this.stage.querySelector("#karaoke-phrase").textContent = this.song.phrases[phrase] || "";
    }
  }

  scoreCompletedNotes(elapsed) {
    for (const note of this.performance.timeline.notes) {
      if (note.index <= this.lastScored || note.end > elapsed) continue;
      const result = this.performance.noteResult(note);
      const good = result.accuracy >= 70;
      this.combo = good ? this.combo+1 : 0;
      this.bestCombo = Math.max(this.bestCombo,this.combo);
      this.lastScored = note.index;
      this.stage.querySelector(`[data-karaoke-index="${note.index}"]`)?.classList.add(good ? "hit" : "miss");
      if (good) this.context.store.getState().sessionNotes.add(note.id);
    }
    this.stage.querySelector("#karaoke-combo").textContent = this.combo;
    this.stage.querySelector("#karaoke-best").textContent = this.bestCombo;
  }

  onAudioFrame({ frequency, rms, metronomeBeat = false, referencePlaying = false }) {
    if (this.mode !== "song") return false;
    if (!["running", "countdown"].includes(this.status)) return true;
    const elapsed = (this.context.audioService.engine.context.currentTime-this.startTime)*1000;
    if (elapsed < this.resumeAt || elapsed >= this.performance.timeline.duration) return true;
    const result = this.performance.sample(elapsed, frequency, rms, metronomeBeat || referencePlaying);
    if (!result) return true;
    const note = NOTES.find((n) => n.id === result.target.id);
    this.stage.querySelector("#karaoke-frequency").textContent = result.cents === null ? "—" : `${frequency.toFixed(1)} Hz`;
    this.stage.querySelector("#karaoke-cents").textContent = result.cents === null ? "等待声音" : `${result.cents > 0 ? "+" : ""}${Math.round(result.cents)} 音分`;
    const feedback = this.stage.querySelector("#karaoke-live-feedback");
    const text = result.cents === null ? "还没听到稳定音高" : result.good ? "音准命中 · 保持住" : Math.abs(result.cents) > 950 ? "注意音区，检查急吹力度" : result.cents > 0 ? "偏高，放松一点气速" : "偏低，检查漏孔与气流";
    if (feedback.textContent !== text) feedback.textContent = text;
    feedback.classList.toggle("good", result.good);
    this.trace.push({ time: elapsed, offset: result.cents === null ? null : note.offset+result.cents/100 });
    this.trace = this.trace.filter((p) => p.time >= elapsed-8000);
    return true;
  }

  drawRoll(elapsed) {
    const timeline = this.performance?.timeline || songTimeline(this.song,this.bpm);
    const low = Math.min(...this.song.notes.map((n) => NOTES.find((note) => note.id === n.id).offset))-2;
    const high = Math.max(...this.song.notes.map((n) => NOTES.find((note) => note.id === n.id).offset))+2;
    const y = (offset) => 215-(offset-low)/(high-low)*165;
    const x = (time) => 210+(time-elapsed)/1000*110;
    const grid = NOTES.filter((n) => n.offset >= low && n.offset <= high).map((n) => `<line x1="54" y1="${y(n.offset)}" x2="1000" y2="${y(n.offset)}" stroke="#dfe8d9"/><text x="20" y="${y(n.offset)+5}" fill="#788c6c" font-size="13">${n.number}${n.low ? "̣" : n.high ? "̇" : ""}</text>`).join("");
    const bars = timeline.notes.filter((n) => x(n.end)>55 && x(n.start)<1000).map((n) => {
      const current = elapsed>=n.start && elapsed<n.end;
      const note = NOTES.find((note) => note.id === n.id);
      return `<rect x="${Math.max(55,x(n.start))}" y="${y(note.offset)-11}" width="${Math.max(1,x(n.end)-Math.max(55,x(n.start))-5)}" height="22" rx="7" fill="${current ? "#527943" : n.end<=elapsed ? "#c6d7b8" : "#e0ebd6"}"/><text x="${Math.max(65,x(n.start)+10)}" y="${y(note.offset)+5}" fill="${current ? "white" : "#527943"}" font-size="13">${note.number}</text>`;
    }).join("");
    let path = "";
    let previous = null;
    for (const p of this.trace) {
      if (p.offset === null || x(p.time)<55) { previous=null; continue; }
      path += `${previous !== null && p.time-previous < 250 ? "L" : "M"}${x(p.time).toFixed(1)},${Math.max(20,Math.min(240,y(p.offset))).toFixed(1)} `;
      previous = p.time;
    }
    const beat = 60000/this.bpm;
    const beats = Array.from({length:12},(_,i) => Math.floor(Math.max(0,elapsed-1400)/beat)+i).map((b) => `<line x1="${x(b*beat)}" x2="${x(b*beat)}" y1="28" y2="236" stroke="#e4eade" stroke-dasharray="3 6"/><text x="${x(b*beat)+4}" y="258" fill="#89957f" font-size="11">${b%4+1}</text>`).join("");
    this.stage.querySelector("#karaoke-roll-svg").innerHTML = `${grid}${beats}${bars}<path d="${path}" fill="none" stroke="#e99355" stroke-width="3" stroke-linecap="round"/><line x1="210" x2="210" y1="18" y2="236" stroke="#e99355" stroke-width="2"/><text x="210" y="13" text-anchor="middle" fill="#9a713e" font-size="10">起拍线</text>`;
  }

  pause() {
    if (!["running", "countdown"].includes(this.status)) return;
    this.offset = this.elapsed();
    this.status = "paused";
    clearInterval(this.timer);
    this.context.audioService.stopMic();
    this.context.audioService.engine.stopClicks();
    this.displayIndex = null;
    this.render();
  }

  onMicStopped() {
    if (this.status === "preview") this.stopPreview();
    else if (["running", "countdown"].includes(this.status)) this.finish("interrupted", false);
    else if (this.status === "requesting") { this.generation++; this.status = this.offset ? "paused" : "idle"; this.render(); }
  }

  finish(reason = "interrupted", release = true) {
    if (!["running", "countdown", "paused"].includes(this.status)) return;
    const elapsed = this.elapsed();
    this.status = "finished";
    this.generation++;
    clearInterval(this.timer);
    this.context.audioService.engine.stopClicks();
    this.report = this.performance.finish(reason === "completed" ? this.performance.timeline.duration : elapsed, reason);
    const saved = this.context.store.addReport(this.report);
    if (release) this.context.audioService.stopMic();
    this.render();
    this.updateProgress(this.report.elapsed);
    this.drawRoll(this.report.elapsed);
    if (!saved) this.stage.querySelector("[data-save-status]").textContent = "本机存储不可用，请导出报告保存";
    if (reason === "completed" || reason === "ended") this.stage.querySelector("#karaoke-report").scrollIntoView({behavior:"smooth", block:"start"});
  }

  cancel() {
    this.generation++;
    this.status = this.offset ? "paused" : "idle";
    this.context.audioService.stopMic();
    this.render();
  }

  async preview() {
    if (this.status === "preview") { this.stopPreview(); return; }
    if (this.busy) return;
    this.context.audioService.stopAll();
    this.status = "preview";
    const generation = ++this.generation;
    try {
      await this.context.audioService.engine.ready();
      if (generation !== this.generation) return;
      this.performance = null;
      this.trace = [];
      this.displayIndex = null;
      this.previewIndex = 0;
      this.previewStart = this.context.audioService.engine.context.currentTime+.15;
      this.render();
      this.timer = setInterval(() => this.tick(),50);
    } catch (error) { this.stopPreview(); this.context.shell.toast(error.message); }
  }

  stopPreview() {
    this.generation++;
    clearInterval(this.timer);
    this.status = this.report ? "finished" : "idle";
    this.context.audioService.engine.stopTones();
    this.render();
  }

  handleClick(action, button) {
    if (!action?.startsWith("karaoke-")) return false;
    if (action === "karaoke-song") this.setMode("song");
    else if (action === "karaoke-free") this.setMode("free");
    else if (action === "karaoke-start") this.start();
    else if (action === "karaoke-preview") this.preview();
    else if (action === "karaoke-pause") this.pause();
    else if (action === "karaoke-end") this.finish("ended");
    else if (action === "karaoke-export") {
      const report = this.report?.id === button.dataset.report ? this.report : this.context.store.getState().reports?.find((r) => r.id === button.dataset.report);
      if (report) exportPerformanceReport(report);
    } else if (!this.busy && ["karaoke-slow", "karaoke-original"].includes(action)) { this.bpm = action === "karaoke-slow" ? Math.max(40,Math.round(this.song.bpm*.75)) : this.song.bpm; this.performance=null; this.render(); }
    return true;
  }

  handleChange(field) {
    if (!field.id.startsWith("karaoke-")) return false;
    if (this.busy) return true;
    if (field.id === "karaoke-song-select") {
      this.song = PERFORMANCE_SONGS.find((s) => s.id === field.value) || PERFORMANCE_SONGS[0];
      this.bpm = this.song.bpm;
      this.performance=null;
      this.report=null;
      this.status="idle";
      this.trace=[];
      this.combo=0;
      this.bestCombo=0;
      this.displayIndex=null;
      this.syncLesson();
      this.render();
    } else if (field.id === "karaoke-bpm") {
      this.bpm = Math.max(40,Math.min(120,Number(field.value)||this.song.bpm));
      this.performance=null;
      this.render();
    } else if (field.id === "karaoke-sound") this.sound = field.checked;
    return true;
  }

  interrupt() {
    if (this.status === "preview") this.stopPreview();
    else if (this.status === "requesting") this.cancel();
    else if (this.busy) this.finish("interrupted");
  }

  unmount() {
    this.interrupt();
    this.generation++;
    clearInterval(this.timer);
    if (this.mode === "song" && this.freeLesson) this.context.store.setState(this.freeLesson);
    this.panel=null;
    this.stage=null;
  }
}
