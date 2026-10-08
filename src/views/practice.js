import {
  metronomeView,
  updateMetronomeUI,
  onMetronomeBeat,
  handleMetronomePresetClick,
} from "../components/metronome.js";
import {
  NOTES,
  LESSONS,
  SONGS,
  frequencyFor,
  pitchNameFor,
  noteLabel,
  centsBetween,
  describePitch,
  nearestNote,
} from "../music.js";
import { icon } from "../components/icons.js";
import { hero, noteMarkup } from "../components/shared.js";
import { fluteDiagram, getFluteClickTarget, mountFlute, unmountFlute } from "../components/flute.js";
import { calculateTodayStats } from "../store.js";
import { Karaoke, karaokeEntry } from "../components/karaoke.js";

export function practicePage(state, stats) {
  return `${hero(
    "你好，今天也一起吹笛子吧",
    "从第一个音，<span>慢慢来。</span>",
    "不用先懂乐理。看一眼指法，听一听，再试着吹出你的声音。",
    `<div class="heading-tools">${metronomeView(state)}<div class="daily-stats"><div><strong>${Math.floor(stats.seconds / 60)}<small>分钟</small></strong><span>今日练习</span></div><div class="stats-line"></div><div><strong>${stats.notes}<small>个音</small></strong><span>今日吹准</span></div><span class="stats-sprout">${icon("leaf")}</span></div></div>`,
  )}
    <div class="practice-grid">
      <section class="practice-card card" aria-label="指法练习">
        <div class="card-top"><span class="section-kicker"><span class="tiny-dot"></span> 今日的小练习</span><span class="level-tag">零基础 · 第 ${LESSONS.findIndex((lesson) => lesson.id === state.lesson.id) + 1} 步</span></div>
        <div class="lesson-heading"><div><h2>${state.lesson.name}</h2><p>${state.lesson.instruction}</p></div><button class="round-help" data-action="help" aria-label="查看吹奏方法">${icon("help")}</button></div>
        <div class="practice-tabs" aria-label="练习方式"><span class="selected">${icon("hand")} 看指法，跟着吹</span><button data-action="notation">${icon("book")} 简谱怎么看？${icon("chevron")}</button></div>
        <div class="target-note-row"><div class="target-note">${noteMarkup(state.note)}<div><strong>${state.note.solfege} <span>${state.note.low ? "低音" : state.note.high ? "高音" : "中音"} · ${pitchNameFor(state.note, state.key)}</span></strong><p>${state.note.title}</p></div></div><button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听听这个音"}</span></button></div>
        ${fluteDiagram(state.note, state)}
        <div class="fingering-caption"><span><i class="legend-hole closed"></i>按住（润玉指触）</span><span><i class="legend-hole"></i>松开（通透内膛）</span>${state.note.holes.includes(0.5) ? '<span><i class="legend-hole half"></i>半孔</span>' : ""}<span class="caption-tip">💡 点击吹孔试听，点击音孔可试按</span><button data-action="fingering">查看全部指法 ${icon("arrow")}</button></div>
        <div class="breath-tip"><span class="tip-icon">${icon("leaf")}</span><div><strong>${state.note.overblow ? "试着集中气流" : "给你一个小提示"}</strong><p>${state.note.tip}</p></div></div>
        <div class="score-strip"><div class="score-label"><span>${state.lesson.name || "这次练习的音"}</span><small>${state.lesson.sequence.length > 3 ? "一个数字，就是一拍" : "点击数字，看看指法"}</small></div><div class="score-notes">${state.lesson.sequence.map((id, index) => {
          const noteObj = NOTES.find((n) => n.id === id);
          const lyric = state.lesson.lyrics?.[index] || noteObj?.solfege || id;
          return `<button class="score-note ${index === state.index ? "current" : ""} ${state.passed.has(`${state.lesson.id}:${index}:${id}`) ? "passed" : ""}" data-action="select-note" data-index="${index}" aria-label="练习第 ${index + 1} 个音 ${noteLabel(noteObj)}" ${index === state.index ? 'aria-current="step"' : ""}>${noteMarkup(noteObj)}<span>${lyric}</span></button>`;
        }).join("")}</div><button class="score-play" data-action="demo" aria-label="节拍器同步打拍示范" title="节拍器同步打拍示范">${icon(state.demo ? "pause" : "play")}</button></div>
        <div class="practice-card-footer"><span>${icon("headphone")} 参考音为合成音，帮你找到音高</span><button data-action="next" id="practice-next-btn">${state.index < state.lesson.sequence.length - 1 ? "下一个音" : LESSONS.indexOf(state.lesson) < 2 ? "下一小步" : "再练一次"} ${icon("arrow")}</button></div>
      </section>
      <aside class="companion-column">
        <section class="companion-card" aria-label="实时音高陪练"><div class="companion-top"><span>${icon("sparkle")} 实时陪练</span><span class="mic-state" id="mic-state"><i></i>等待开启</span></div>
          ${karaokeEntry()}<div id="karaoke-panel" hidden></div><div id="free-companion">
          <div class="listening-orb" id="listening-orb"><div class="orb-ring"></div><div class="orb-ring second"></div><span>${icon("mic")}</span><i class="orb-spark spark-one"></i><i class="orb-spark spark-two"></i></div>
          <h2 id="feedback-title" aria-live="polite" aria-atomic="true">我在这里，听你吹奏</h2><p class="feedback-copy" id="feedback-copy">不怕吹错，每一声都是进步。</p>
          <div class="waveform" id="waveform" aria-hidden="true">${Array.from({ length: 35 }, (_, i) => `<i style="--wave:${8 + Math.sin(i * 1.1) ** 2 * (13 + Math.sin(i / 6) ** 2 * 21)}px;--delay:${i * -0.075}s"></i>`).join("")}</div>
          <div class="pitch-panel"><div class="pitch-values"><span>当前音高 <strong id="actual-pitch">—</strong></span><span>目标 <strong id="target-pitch">${noteLabel(state.note)} (${pitchNameFor(state.note, state.key)}) · ${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz</strong></span></div><div class="pitch-scale"><span class="pitch-safe-zone" style="left:${50 - state.tolerance * 0.46}%;width:${state.tolerance * 0.92}%"></span><i id="pitch-indicator" hidden></i><span class="pitch-center"></span></div><div class="pitch-scale-labels"><span>偏低</span><span>刚刚好</span><span>偏高</span></div></div>
          <button class="button mic-button" id="mic-button" data-action="mic">${icon("mic")} 开启麦克风，试着吹</button><div class="privacy-note">${icon("shield")} 声音只在本机处理，不录音、不上传</div>
          <div class="live-progress" id="live-progress"></div></div>
        </section>
        <button class="small-help-card" data-action="help"><span class="help-card-icon">${icon("help")}</span><span><strong>怎么还吹不响？</strong><small>先别急，试试这 3 个小动作</small></span>${icon("arrow")}</button>
      </aside>
    </div>
    <div id="karaoke-stage" hidden></div>
    <div class="long-tone-entry"><span>把一个音吹稳，再走向下一段旋律。</span><button class="button button-outline" data-action="long-tone">进入长音练习 · 3 / 5 / 8 秒挑战 ${icon("arrow")}</button></div><section class="journey-section"><div class="section-heading"><h2>你的入门小路<span>一步一步，就会了</span></h2><span>跟着自己的节奏来 ${icon("leaf")}</span></div><div class="journey-grid">${LESSONS.map((lesson, index) => `<button class="journey-card ${state.lesson.id === lesson.id ? "current" : ""}" data-action="lesson" data-lesson="${lesson.id}"><span class="journey-illustration illustration-${index}">${index === 0 ? "<i></i><i></i><i></i><i></i><i></i>" : index === 1 ? "<b>5</b><b>6</b><b>7</b>" : icon("music")}</span><span class="journey-content"><span class="journey-eyebrow">STEP 0${index + 1}${state.lesson.id === lesson.id ? "<em>正在练习</em>" : ""}</span><strong>${lesson.name}</strong><small>${lesson.subtitle}</small><span class="journey-duration">${icon("clock")} ${lesson.duration}</span></span>${icon("chevron")}</button>`).join("")}</div></section>`;
}

export class PracticePage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundInputHandler = this.handleInput.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
    this.boundToggleHandler = this.handleToggle.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    const stats = calculateTodayStats(state.sessions);
    this.container.innerHTML = practicePage(state, stats);
    mountFlute(this.container);

    this.cacheElements();
    this.karaoke = new Karaoke(this.context, this.container);
    this.updateMicUI();
    this.updateMetronomeUI();

    this.container.addEventListener("click", this.boundClickHandler);
    this.container.addEventListener("input", this.boundInputHandler);
    this.container.addEventListener("change", this.boundChangeHandler);
    this.container.addEventListener("toggle", this.boundToggleHandler, true);

    this.unsubscribe = this.context.store.subscribe((state, changedKeys) => {
      this.update(state, changedKeys);
    });
  }

  unmount() {
    this.karaoke?.unmount();
    unmountFlute(this.container);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.removeEventListener("input", this.boundInputHandler);
      this.container.removeEventListener("change", this.boundChangeHandler);
      this.container.removeEventListener("toggle", this.boundToggleHandler, true);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  cacheElements() {
    if (!this.container) return;
    this.actualPitch = this.container.querySelector("#actual-pitch");
    this.targetPitch = this.container.querySelector("#target-pitch");
    this.pitchIndicator = this.container.querySelector("#pitch-indicator");
    this.pitchSafeZone = this.container.querySelector(".pitch-safe-zone");
    this.feedbackTitle = this.container.querySelector("#feedback-title");
    this.feedbackCopy = this.container.querySelector("#feedback-copy");
    this.liveProgress = this.container.querySelector("#live-progress");
    this.waveform = this.container.querySelector("#waveform");
    this.micButton = this.container.querySelector("#mic-button");
    this.micState = this.container.querySelector("#mic-state");
    this.listeningOrb = this.container.querySelector("#listening-orb");
    this.targetNoteContainer = this.container.querySelector(".target-note-row");
    this.breathTipContainer = this.container.querySelector(".breath-tip");
    this.nextButton = this.container.querySelector("#practice-next-btn");
    this.metroSummary = this.container.querySelector("#metro-summary");
    this.metroToggle = this.container.querySelector("#metro-toggle");
  }

  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  setFeedback(title, copy) {
    this.setText(this.feedbackTitle, title);
    this.setText(this.feedbackCopy, copy);
    if (this.karaoke?.mode === "song" && !["countdown", "running"].includes(this.karaoke.status)) {
      this.setText(this.container?.querySelector("#karaoke-status"), `${title} · ${copy}`);
    }
  }

  consumeAudioFrame(data) { return this.karaoke?.onAudioFrame(data) || false; }
  onMicStopped() { this.karaoke?.onMicStopped(); }
  onStopAll() { this.karaoke?.interrupt(); }

  selectNote(index, stopAudio = true) {
    if (stopAudio) this.context.audioService.stopDemo();
    const state = this.context.store.getState();
    const noteId = state.lesson.sequence[index];
    const note = NOTES.find((n) => n.id === noteId);
    if (!note) return;

    this.context.audioService.confidence.reset();
    this.context.audioService.engine.smoother.reset();

    this.context.store.setState({
      index,
      customHoles: null,
      note,
    });
  }

  chooseLesson(lessonId) {
    this.context.audioService.stopMic();
    this.context.audioService.stopDemo();
    let lesson = LESSONS.find((l) => l.id === lessonId);
    if (!lesson) {
      const song = SONGS.find((s) => s.id === lessonId);
      if (song) {
        lesson = {
          id: song.id,
          name: song.title,
          subtitle: song.subtitle,
          sequence: song.sequence,
          lyrics: song.lyrics,
          instruction: song.tip,
          stage: "曲谱练习",
        };
      }
    }
    if (!lesson) lesson = LESSONS[0];
    const note = NOTES.find((n) => n.id === lesson.sequence[0]);

    this.context.store.setState({
      passed: new Set(),
      lesson,
      index: 0,
      note,
      customHoles: null,
    });
    this.context.router.navigate("practice");
  }

  update(state, changedKeys) {
    if (changedKeys.has("lesson")) {
      const notes = this.container?.querySelector(".score-notes");
      if (notes) notes.innerHTML = state.lesson.sequence.map((id, index) => {
        const note = NOTES.find((n) => n.id === id);
        return `<button class="score-note" data-action="select-note" data-index="${index}" aria-label="练习第 ${index+1} 个音 ${noteLabel(note)}">${noteMarkup(note)}<span>${state.lesson.lyrics?.[index] || note.solfege}</span></button>`;
      }).join("");
      this.setText(this.container?.querySelector(".score-label > span"), state.lesson.name);
      this.setText(this.container?.querySelector(".score-label > small"), state.lesson.stage === "跟曲演奏" ? "跟随下方音高谱的时值" : "点击数字，看看指法");
    }
    if (
      changedKeys.has("note") ||
      changedKeys.has("lesson") ||
      changedKeys.has("index") ||
      changedKeys.has("key") ||
      changedKeys.has("reference") ||
      changedKeys.has("tolerance")
    ) {
      this.updateNoteView(state);
    }
    if (changedKeys.has("passed")) {
      this.updatePassedNotes(state);
    }
    if (changedKeys.has("mic")) {
      this.updateMicUI();
    }
    if (changedKeys.has("metronome")) {
      this.updateMetronomeUI();
    }
    if (changedKeys.has("demo")) {
      this.updateDemoUI();
    }
    if (changedKeys.has("sessions")) {
      this.updateStatsUI();
    }
  }

  updateNoteView(state) {
    if (!this.container) return;
    const note = state.note;

    // 1. Update target-note-row
    if (this.targetNoteContainer) {
      this.targetNoteContainer.innerHTML = `
        <div class="target-note">${noteMarkup(note)}<div><strong>${note.solfege} <span>${note.low ? "低音" : note.high ? "高音" : "中音"} · ${pitchNameFor(note, state.key)}</span></strong><p>${note.title}</p></div></div>
        <button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听听这个音"}</span></button>`;
    }

    // 2. Replace flute diagram
    const oldDiagram = this.container.querySelector(".flute-container, .flute-diagram");
    if (oldDiagram) {
      const temp = document.createElement("div");
      temp.innerHTML = fluteDiagram(note, state);
      const newDiagram = temp.firstElementChild;
      oldDiagram.replaceWith(newDiagram);
      mountFlute(this.container);
    }

    // 3. Fingering caption half-hole indicator
    const captionTip = this.container.querySelector(".fingering-caption");
    if (captionTip) {
      captionTip.innerHTML = `<span><i class="legend-hole closed"></i>按住（润玉指触）</span><span><i class="legend-hole"></i>松开（通透内膛）</span>${note.holes.includes(0.5) ? '<span><i class="legend-hole half"></i>半孔</span>' : ""}<span class="caption-tip">💡 点击吹孔试听，点击音孔可试按</span><button data-action="fingering">查看全部指法 ${icon("arrow")}</button>`;
    }

    // 4. Update breath tip
    if (this.breathTipContainer) {
      this.breathTipContainer.innerHTML = `<span class="tip-icon">${icon("leaf")}</span><div><strong>${note.overblow ? "试着集中气流" : "给你一个小提示"}</strong><p>${note.tip}</p></div>`;
    }

    // 5. Update score notes highlight
    const scoreNotes = this.container.querySelectorAll(".score-notes .score-note");
    scoreNotes.forEach((el, idx) => {
      el.classList.toggle("current", idx === state.index);
      if (idx === state.index) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });

    // 6. Update next button
    if (this.nextButton) {
      this.nextButton.innerHTML = `${state.index < state.lesson.sequence.length - 1 ? "下一个音" : LESSONS.indexOf(state.lesson) < 2 ? "下一小步" : "再练一次"} ${icon("arrow")}`;
    }

    // 7. Update target pitch
    if (this.targetPitch) {
      this.setText(
        this.targetPitch,
        `${noteLabel(note)} (${pitchNameFor(note, state.key)}) · ${Math.round(frequencyFor(note, state.key, state.reference))} Hz`,
      );
    }

    // 8. Update pitch safe zone width & position
    if (this.pitchSafeZone) {
      this.pitchSafeZone.style.left = `${50 - state.tolerance * 0.46}%`;
      this.pitchSafeZone.style.width = `${state.tolerance * 0.92}%`;
    }

    // 9. Update live progress
    const mark = `${state.lesson.id}:${state.index}:${state.note.id}`;
    if (this.liveProgress) {
      this.setText(
        this.liveProgress,
        state.passed.has(mark)
          ? `✓ ${noteLabel(state.note)} 本轮已吹准 · 按自己的节奏继续`
          : "",
      );
    }

    // 10. Update lesson header if lesson changed
    const cardTopLevel = this.container.querySelector(".card-top .level-tag");
    if (cardTopLevel) {
      this.setText(
        cardTopLevel,
        state.lesson.stage === "跟曲演奏" ? "跟曲演奏 · 完整旋律" : LESSONS.some((l) => l.id === state.lesson.id) ? `零基础 · 第 ${LESSONS.findIndex((l) => l.id === state.lesson.id) + 1} 步` : "曲谱练习",
      );
    }
    const lessonTitle = this.container.querySelector(".lesson-heading h2");
    if (lessonTitle) this.setText(lessonTitle, state.lesson.name);
    const lessonInstruction = this.container.querySelector(".lesson-heading p");
    if (lessonInstruction) this.setText(lessonInstruction, state.lesson.instruction);

    // Update journey grid active card
    this.container.querySelectorAll(".journey-card").forEach((card) => {
      const isCurrent = card.dataset.lesson === state.lesson.id;
      card.classList.toggle("current", isCurrent);
      const eyebrow = card.querySelector(".journey-eyebrow");
      if (eyebrow) {
        const stepNum = String(LESSONS.findIndex((l) => l.id === card.dataset.lesson)+1).padStart(2,"0");
        eyebrow.innerHTML = `STEP ${stepNum}${isCurrent ? "<em>正在练习</em>" : ""}`;
      }
    });
  }

  updatePassedNotes(state) {
    const scoreNotes = this.container?.querySelectorAll(".score-notes .score-note");
    if (!scoreNotes) return;
    scoreNotes.forEach((el, idx) => {
      const id = state.lesson.sequence[idx];
      const mark = `${state.lesson.id}:${idx}:${id}`;
      el.classList.toggle("passed", state.passed.has(mark));
    });
  }

  updateMicUI() {
    if (!this.container) return;
    const state = this.context.store.getState();
    const active = state.mic === "on";
    const requesting = state.mic === "requesting";

    if (this.micButton) {
      this.micButton.innerHTML = `${icon(active || requesting ? "pause" : "mic")} ${active ? "暂停陪练，歇一会儿" : requesting ? "等待授权 · 点击可取消" : "开启麦克风，试着吹"}`;
    }
    if (this.listeningOrb) {
      this.listeningOrb.classList.toggle("listening", active);
    }
    if (this.micState) {
      this.micState.innerHTML = `<i></i>${active ? "正在聆听" : requesting ? "等待授权" : "等待开启"}`;
      this.micState.classList.toggle("connected", active);
    }

    if (!active) {
      this.waveform?.classList.remove("active");
      this.container.querySelector(".flute-diagram")?.classList.remove("in-tune");
      if (this.pitchIndicator) this.pitchIndicator.hidden = true;
      this.setText(this.actualPitch, "—");
      this.setFeedback(
        requesting ? "允许麦克风，一起试试" : "我在这里，听你吹奏",
        requesting
          ? "在浏览器的权限提示中选择“允许”。"
          : "不怕吹错，每一声都是进步。",
      );
      this.setText(this.liveProgress, "");
    }
  }

  updateMetronomeUI() {
    if (!this.container) return;
    updateMetronomeUI(this.container, this.context.store.getState().metronome);
  }

  updateDemoUI() {
    if (!this.container) return;
    const demo = this.context.store.getState().demo;
    const listenButtons = this.container.querySelectorAll(".listen-button");
    listenButtons.forEach((el) => {
      el.innerHTML = `${icon(demo ? "pause" : "volume")}<span>${demo ? "停止示范" : "听听这个音"}</span>`;
    });

    const fluteDiag = this.container.querySelector(".flute-diagram");
    if (fluteDiag) fluteDiag.classList.toggle("flute-playing", demo);

    const scorePlay = this.container.querySelector(".score-play");
    if (scorePlay) scorePlay.innerHTML = icon(demo ? "pause" : "play");
  }

  updateStatsUI() {
    if (!this.container) return;
    const stats = calculateTodayStats(this.context.store.getState().sessions);
    const statsContainer = this.container.querySelector(".daily-stats");
    if (statsContainer) {
      statsContainer.innerHTML = `<div><strong>${Math.floor(stats.seconds / 60)}<small>分钟</small></strong><span>今日练习</span></div><div class="stats-line"></div><div><strong>${stats.notes}<small>个音</small></strong><span>今日吹准</span></div><span class="stats-sprout">${icon("leaf")}</span>`;
    }
  }

  onAudioFrame({ frequency, rms }, { confidence }) {
    if (!this.container) return;
    const state = this.context.store.getState();
    const now = performance.now();

    if (this.waveform) {
      this.waveform.classList.toggle("active", rms > 0.008);
      this.waveform.style.setProperty(
        "--intensity",
        Math.max(0.2, Math.min(1.5, rms * 9)),
      );
    }

    const cents = frequency
      ? centsBetween(
          frequency,
          frequencyFor(state.note, state.key, state.reference),
        )
      : null;
    const good = frequency ? Math.abs(cents) <= state.tolerance : null;
    const bucket = confidence.update(now, good);
    const mark = `${state.lesson.id}:${state.index}:${state.note.id}`;

    this.setText(
      this.liveProgress,
      state.passed.has(mark)
        ? `✓ ${noteLabel(state.note)} 本轮已吹准 · 按自己的节奏继续`
        : `音准信心 ${Math.round(bucket.progress * 100)}% · 多数时间保持绿区即可，轻微抖动没关系`,
    );

    const fluteDiag = this.container.querySelector(".flute-diagram");

    if (!frequency) {
      if (this.pitchIndicator) this.pitchIndicator.hidden = true;
      fluteDiag?.classList.remove("in-tune");
      this.setText(this.actualPitch, "—");
      this.setFeedback(
        rms > 0.015 ? "听到声音了，再稳一点" : "轻轻吹，我在听",
        rms > 0.015
          ? "还没识别出稳定音高，试着对准吹孔、减少周围杂音。"
          : "盖严音孔，平稳送气。不需要大声。",
      );
      return;
    }

    const feedback = describePitch(cents, state.tolerance);
    this.setText(this.actualPitch, `${frequency.toFixed(1)} Hz`);

    if (this.pitchIndicator) {
      this.pitchIndicator.hidden = false;
      this.pitchIndicator.style.left = `${50 + Math.max(-46, Math.min(46, cents * 0.46))}%`;
      this.pitchIndicator.classList.toggle("in-tune", good);
      this.pitchIndicator.setAttribute(
        "aria-label",
        `偏差 ${Math.round(cents)} 音分`,
      );
    }

    fluteDiag?.classList.toggle("in-tune", good);

    if (bucket.passed) {
      state.passed.add(mark);
      state.sessionNotes.add(state.note.id);
      this.container
        .querySelectorAll(".score-notes .score-note")
        [state.index]?.classList.add("passed");
      this.setFeedback("吹对啦，这一声很棒！", "想再巩固一次，或者点下一步，都很好。");
    } else if (Math.abs(cents) > 150 && Math.abs(cents) < 950) {
      this.setText(
        this.feedbackCopy,
        `现在更接近${noteLabel(nearestNote(frequency, state.key, state.reference))}。检查音孔是否盖严，再试一次。`,
      );
      this.setText(this.feedbackTitle, feedback.title);
    } else {
      this.setText(this.feedbackTitle, feedback.title);
      this.setText(this.feedbackCopy, feedback.detail);
    }
  }

  onReferencePlaying() {
    if (!this.container) return;
    if (this.pitchIndicator) this.pitchIndicator.hidden = true;
    this.setText(this.actualPitch, "—");
    this.container.querySelector(".flute-diagram")?.classList.remove("in-tune");
    this.setFeedback(
      "先听一听，再试着吹",
      "播放参考音时暂停判断，避免把示范当成练习。",
    );
  }

  onBeat(beat, index) {
    if (!this.container) return;
    const bpm = this.context.store.getState().metronome.bpm;
    onMetronomeBeat(this.container, beat, index, bpm);
  }

  onStopDemo() {
    this.updateDemoUI();
  }

  handleClick(event) {
    const karaokeButton = event.target.closest("[data-action]");
    if (this.karaoke?.handleClick(karaokeButton?.dataset.action, karaokeButton)) return;
    if (this.karaoke?.mode === "song" && karaokeButton?.dataset.action === "lesson") this.karaoke.setMode("free");
    if (this.karaoke?.busy && (karaokeButton || getFluteClickTarget(event))) this.karaoke.interrupt();
    if (handleMetronomePresetClick(event, this.context)) {
      return;
    }

    const fluteTarget = getFluteClickTarget(event);
    if (fluteTarget) {
      if (fluteTarget.type === "blow") {
        this.context.audioService.listen();
        return;
      }
      if (fluteTarget.type === "hole") {
        const state = this.context.store.getState();
        const holeIndex = fluteTarget.index;
        this.context.audioService.engine.tone(
          frequencyFor(state.note, state.key, state.reference),
          0.6,
        );
        this.context.shell.toast(
          `第 ${6 - holeIndex} 孔 · 当前${state.note.holes[holeIndex] === 1 ? "盖严" : state.note.holes[holeIndex] === 0.5 ? "半孔" : "松开"}`,
        );
        return;
      }
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "select-note") {
      this.selectNote(Number(button.dataset.index));
    } else if (action === "lesson") {
      this.chooseLesson(button.dataset.lesson);
    } else if (action === "next") {
      const state = this.context.store.getState();
      if (state.index < state.lesson.sequence.length - 1) {
        this.selectNote(state.index + 1);
      } else {
        const nextLessonIdx = Math.min(
          2,
          LESSONS.findIndex((l) => l.id === state.lesson.id) + 1,
        );
        this.chooseLesson(LESSONS[nextLessonIdx].id);
      }
    } else if (action === "listen" || action === "blow-flute") {
      this.context.audioService.listen();
    } else if (action === "mic") {
      this.context.audioService.startMic();
    } else if (action === "metronome") {
      this.context.audioService.startMetronome();
    } else if (action === "demo") {
      const state = this.context.store.getState();
      this.context.audioService.startMetronome(state.lesson.sequence);
    } else if (action === "notation") {
      this.context.router.navigate("notation");
    } else if (action === "fingering") {
      this.context.router.navigate("fingering");
    } else if (action === "long-tone") {
      this.context.router.navigate("long-tone");
    } else if (action === "help") {
      this.context.shell.openModal("help");
    }
  }

  handleToggle(event) {
    if (event.target.id === "metronome") {
      const m = this.context.store.getState().metronome;
      this.context.store.setState({
        metronome: { ...m, open: event.target.open },
      });
    }
  }

  handleInput(event) {
    if (event.target.id === "karaoke-bpm" && !this.karaoke.busy) {
      this.container.querySelector("#karaoke-bpm-label").textContent = event.target.value;
      return;
    }
    if (event.target.id !== "metro-bpm") return;
    const value = Number(event.target.value);
    const m = this.context.store.getState().metronome;
    if (
      !Number.isInteger(value) ||
      value < 40 ||
      value > 180 ||
      value === m.bpm
    ) {
      return;
    }
    this.context.store.setState({
      metronome: { ...m, bpm: value },
    });
    if (this.context.audioService.metronome.running) {
      const sequence = this.context.audioService.metronome.sequence;
      this.context.audioService.stopDemo();
      this.context.audioService.stopMetronome();
      this.context.audioService.startMetronome(sequence);
    } else {
      this.updateMetronomeUI();
    }
  }

  handleChange(event) {
    const field = event.target;
    if (this.karaoke?.handleChange(field)) return;
    if (field.id === "metro-bpm" || field.id === "metro-beats") {
      const m = this.context.store.getState().metronome;
      const wasRunning = this.context.audioService.metronome.running;
      const sequence = this.context.audioService.metronome.sequence;
      const value = Number(field.value);

      if (field.id === "metro-bpm" && value === m.bpm) return;

      const bpm =
        field.id === "metro-bpm"
          ? Number.isFinite(value)
            ? Math.max(40, Math.min(180, Math.round(value)))
            : 60
          : m.bpm;
      const beats =
        field.id === "metro-beats"
          ? [2, 3, 4].includes(value)
            ? value
            : 4
          : m.beats;

      this.context.audioService.stopDemo();
      this.context.audioService.stopMetronome();
      this.context.store.setState({
        metronome: { ...m, bpm, beats },
      });
      this.updateMetronomeUI();
      if (wasRunning) {
        this.context.audioService.startMetronome(sequence);
      }
    }
  }
}
