import { tunerPage } from "./views/tuner.js";
import { longTonePage, renderBreathChart, resultMarkup } from "./views/long-tone.js";
import { noteMarkup, holeRow } from "./components/shared.js";
import { noteLabel } from "./music.js";
import { ConfidenceBucket, LongToneChallenge } from "./practice.js";
import { Metronome } from "./metronome.js";
import { icon, logo } from "./components/icons.js";
import { practicePage } from "./views/practice.js";
import { fingeringPage } from "./views/fingering.js";
import { notationPage } from "./views/notation.js";
import { songsPage } from "./views/songs.js";
import { historyPage } from "./views/history.js";
import { dialogView } from "./views/settings.js";
import "./style.css";
import "./views.css";
import { AudioEngine } from "./audio.js";
import {
  NOTES,
  LESSONS,
  KEYS,
  frequencyFor,
  centsBetween,
  describePitch,
  nearestNote,
  readSaved,
  pitchNameFor,
  noteForHoles,
} from "./music.js";

let saved;
try {
  saved = readSaved(localStorage);
} catch {
  saved = readSaved({ getItem: () => null });
}
const state = {
  ...saved,
  page: "practice",
  lesson: LESSONS[0],
  index: 0,
  note: NOTES[0],
  customHoles: null,
  mic: "off",
  demo: false,
  passed: new Set(),
  sessionNotes: new Set(),
  sessionStarted: 0,
  metronome: { bpm: 60, beats: 4, open: false, running: false },
  longNote: NOTES[0],
  longArmed: false,
  challenge: null,
};
const engine = new AudioEngine();
const confidence = new ConfidenceBucket();
const metronome = new Metronome(engine, (beat, index) => {
  if (state.demo && metronome.sequence) {
    if (state.page === "practice") selectNote(index, false);
    document.querySelectorAll("[data-song-beat]").forEach((el) => el.classList.toggle("current", Number(el.dataset.songBeat) === index));
  }
  document.querySelectorAll("#metro-dots i").forEach((el, i) => el.classList.toggle("active", i === beat));
}, () => { stopDemo(); syncMetronomeUI(); });
let demoTimer;
let demoGeneration = 0;
let micGeneration = 0;
let toastTimer;
const app = document.querySelector("#app");

function save() {
  try {
    localStorage.setItem(
      "dizimate-v1",
      JSON.stringify({
        key: state.key,
        reference: state.reference,
        tolerance: state.tolerance,
        sessions: state.sessions,
      }),
    );
  } catch {
    toast("浏览器未能保存记录；你仍然可以继续练习。");
  }
}

function todayStats() {
  const today = new Date().toDateString();
  const sessions = state.sessions.filter(
    (session) => new Date(session.at).toDateString() === today,
  );
  return {
    seconds: sessions.reduce((sum, s) => sum + s.seconds, 0),
    notes: new Set(sessions.flatMap((s) => s.notes)).size,
  };
}

function render() {
  const stats = todayStats();
  const titles = {
    practice: "今日陪练",
    fingering: "指法小抄",
    tuner: "实时调音器",
    "long-tone": "长音练习",
    notation: "简谱入门",
    songs: "我的曲谱",
    history: "练习记录",
  };
  app.innerHTML = `
    <aside class="sidebar">
      <a href="#practice" class="brand" aria-label="笛伴首页"><span class="brand-mark">${logo}</span><span><strong>笛伴<span class="brand-dot">.</span></strong><small>DIZIMATE</small></span></a>
      <div class="nav-label">我的音乐小天地</div>
      <nav aria-label="主导航">${Object.entries(titles)
        .map(
          ([id, title]) =>
            `<a href="#${id}" class="nav-link ${state.page === id ? "active" : ""}" ${state.page === id ? 'aria-current="page"' : ""}>${icon({ practice: "home", fingering: "hand", tuner: "mic", "long-tone": "leaf", notation: "book", songs: "music", history: "chart" }[id])}<span>${title}</span>${id === "practice" ? "<i></i>" : ""}</a>`,
        )
        .join("")}</nav>
      <div class="sidebar-note"><div class="plant-art" aria-hidden="true"><svg viewBox="0 0 150 115"><path d="M70 114c0-32 10-56 34-85M77 83C43 78 32 62 29 43c25 0 46 10 48 40Zm13-28c-3-28 8-44 25-51 7 25-3 41-25 51Zm-15 48c26-24 41-26 61-19-15 23-35 22-61 19Z" fill="#bdc6aa"/><path d="m75 96-30-35m50-15 13-25m-25 77 37-8" fill="none" stroke="#839176" stroke-width="1.3"/></svg></div><strong>不赶进度，只享受进步。</strong><p>每天一点点，让音乐自然发生。</p></div>
      <button class="sidebar-help" data-action="help">${icon("help")}<span>第一次吹笛子？</span>${icon("chevron")}</button>
      <div class="sidebar-bottom"><span class="avatar">${icon("leaf")}</span><span>初见，笛友<small>从零开始，也很好</small></span><span class="status-dot"></span></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb">我的练习 <span>/</span> <strong>${titles[state.page]}</strong></div><div class="topbar-actions"><span class="local-badge">${icon("shield")} 本地练习，安心吹奏</span><button class="instrument-select" data-action="settings">${icon("music")}<span>${state.key} 调竹笛</span><span class="select-divider"></span><span>筒音作 5</span>${icon("down")}</button></div></header>
      <main id="main-content">${state.page === "practice" ? practicePage(state, stats) : state.page === "fingering" ? fingeringPage(state) : state.page === "notation" ? notationPage(state) : state.page === "songs" ? songsPage(state) : state.page === "tuner" ? tunerPage(state) : state.page === "long-tone" ? longTonePage(state) : historyPage(state, stats)}</main>
      <footer class="page-footer"><span>${icon("leaf")} 每一次呼吸，都在靠近音乐。</span><span>笛伴 DiziMate <i>·</i> 陪你慢慢来</span></footer>
    </div>
    <dialog id="modal" aria-labelledby="dialog-title"></dialog>
    <div id="toast" class="toast" role="status"></div>`;
  updateMicUI();
  syncMetronomeUI();
  if (state.page === "long-tone") paintLongTone();
}

function toast(message) {
  const element = document.querySelector("#toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 4500);
}

function stopDemo() {
  if (metronome.sequence) stopMetronome();
  confidence.reset();
  engine.smoother.reset();
  demoGeneration++;
  clearTimeout(demoTimer);
  state.demo = false;
  engine.stopTones();
  document.querySelectorAll(".listen-button").forEach((el) => {
    el.innerHTML = `${icon("volume")}<span>${state.page === "fingering" ? "听参考音" : "听听这个音"}</span>`;
  });
  document.querySelector(".flute-diagram")?.classList.remove("flute-playing");
  const play = document.querySelector(".score-play");
  if (play) play.innerHTML = icon("play");
  setText("#song-demo-label", "节拍器同步打拍示范");
  document.querySelectorAll("[data-song-beat]").forEach((el) => el.classList.remove("current"));
}

async function listen() {
  if (state.page === "long-tone") finishLongTone();
  if (state.demo) {
    stopDemo();
    return;
  }
  stopDemo();
  state.demo = true;
  const generation = demoGeneration;
  const note = state.page === "long-tone" ? state.longNote : state.note;
  try {
    await engine.tone(frequencyFor(note, state.key, state.reference));
    if (generation !== demoGeneration) {
      engine.stopTones();
      return;
    }
    document.querySelectorAll(".listen-button").forEach((el) => {
      el.innerHTML = `${icon("pause")}<span>停止示范</span>`;
    });
    document.querySelector(".flute-diagram")?.classList.add("flute-playing");
    toast(
      `正在播放 ${noteLabel(state.note)} (${pitchNameFor(state.note, state.key)}) · ${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz 竹笛参考音`,
    );
    demoTimer = setTimeout(stopDemo, 1600);
  } catch (error) {
    stopDemo();
    toast(error.message);
  }
}

async function playSequence(sequence, interval = 1000, follow = false) {
  if (state.demo) {
    stopDemo();
    return;
  }
  stopDemo();
  const generation = demoGeneration;
  state.demo = true;
  let index = 0;
  const step = async () => {
    if (generation !== demoGeneration) return;
    if (index >= sequence.length) {
      stopDemo();
      toast("听完了，换你试试看。");
      return;
    }
    if (follow) {
      selectNote(index, false);
      state.demo = true;
    }
    const current = sequence[index++];
    try {
      if (current)
        await engine.tone(
          frequencyFor(
            NOTES.find((n) => n.id === current),
            state.key,
            state.reference,
          ),
          (interval / 1000) * 0.82,
        );
      if (generation !== demoGeneration) {
        engine.stopTones();
        return;
      }
      const play = document.querySelector(".score-play");
      if (play) play.innerHTML = icon("pause");
      document.querySelector(".flute-diagram")?.classList.add("flute-playing");
      demoTimer = setTimeout(step, interval);
    } catch (error) {
      stopDemo();
      toast(error.message);
    }
  };
  step();
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el && el.textContent !== text) el.textContent = text;
}

function updateMicUI() {
  const active = state.mic === "on";
  const requesting = state.mic === "requesting";
  const button = document.querySelector("#mic-button");
  if (!button) return;
  button.innerHTML = `${icon(active || requesting ? "pause" : "mic")} ${active ? "暂停陪练，歇一会儿" : requesting ? "等待授权 · 点击可取消" : "开启麦克风，试着吹"}`;
  document
    .querySelector("#listening-orb")
    ?.classList.toggle("listening", active);
  document.querySelector("#mic-state").innerHTML =
    `<i></i>${active ? "正在聆听" : requesting ? "等待授权" : "等待开启"}`;
  document.querySelector("#mic-state").classList.toggle("connected", active);
  if (!active) {
    document.querySelector("#waveform")?.classList.remove("active");
    document.querySelector(".flute-diagram")?.classList.remove("in-tune");
    const indicator = document.querySelector("#pitch-indicator");
    if (indicator) indicator.hidden = true;
    setText("#actual-pitch", "—");
    setText(
      "#feedback-title",
      requesting ? "允许麦克风，一起试试" : "我在这里，听你吹奏",
    );
    setText(
      "#feedback-copy",
      requesting
        ? "在浏览器的权限提示中选择“允许”。"
        : "不怕吹错，每一声都是进步。",
    );
    setText("#live-progress", "");
  }
}

function stopMic() {
  finishLongTone();
  micGeneration++;
  engine.stop();
  if (state.sessionStarted) {
    const seconds = Math.round(
      (performance.now() - state.sessionStarted) / 1000,
    );
    if (seconds >= 1) {
      state.sessions.push({
        at: Date.now(),
        seconds,
        notes: [...state.sessionNotes],
      });
      state.sessions = state.sessions.slice(-100);
      save();
    }
  }
  state.sessionStarted = 0;
  confidence.reset();
  engine.smoother.reset();
  state.mic = "off";
  state.sessionNotes.clear();
  updateMicUI();
  if (state.page === "tuner") paintTuner(null);
}

async function startMic() {
  if (state.mic !== "off") {
    stopMic();
    render();
    return;
  }
  stopDemo();
  state.mic = "requesting";
  const generation = ++micGeneration;
  updateMicUI();
  try {
    const started = await engine.start(handleAudio, () => {
      stopMic();
      setText("#feedback-title", "麦克风连接中断了");
      setText("#feedback-copy", "重新连接麦克风后，再点击下方按钮。");
    });
    if (!started || generation !== micGeneration) return;
    state.mic = "on";
    state.sessionStarted = performance.now();
    updateMicUI();
    setText("#feedback-title", "准备好了，轻轻吹一声");
    setText("#feedback-copy", "让麦克风离笛子约 30–50 厘米，避开直吹气流。");
  } catch (error) {
    if (generation !== micGeneration) return;
    stopMic();
    const messages = {
      NotAllowedError:
        "麦克风未获授权。请在地址栏的权限设置里允许麦克风，再重试。",
      NotFoundError: "没有找到麦克风。连接设备后，再试一次。",
      NotReadableError:
        "麦克风可能正被其他应用占用。关闭占用的应用后，再试一次。",
      AbortError: "麦克风启动中断了，请重新尝试。",
    };
    setText("#feedback-title", "还没有听到你的声音");
    setText(
      "#feedback-copy",
      messages[error.name] || error.message || "麦克风暂时不可用，请稍后重试。",
    );
  }
}

function handleAudio({ frequency, rms, referencePlaying, metronomeBeat }) {
  if (state.mic !== "on") return;
  const now = performance.now();
  if (referencePlaying) {
    confidence.reset();
    const indicator = document.querySelector("#pitch-indicator");
    if (indicator) indicator.hidden = true;
    setText("#actual-pitch", "—");
    if (state.page === "tuner") paintTuner(null);
    document.querySelector(".flute-diagram")?.classList.remove("in-tune");
    setText("#feedback-title", "先听一听，再试着吹");
    setText("#feedback-copy", "播放参考音时暂停判断，避免把示范当成练习。");
    return;
  }
  if (metronomeBeat) { confidence.pause(now); return; }
  if (state.page === "tuner") {
    paintTuner(frequency);
    return;
  }
  if (state.page === "long-tone") {
    if (state.longArmed) {
      const cents = frequency ? centsBetween(frequency, frequencyFor(state.longNote, state.key, state.reference)) : null;
      state.challenge.update(now, cents, rms);
      const feedback = frequency ? describePitch(cents, state.tolerance) : null;
      setText("#feedback-title", feedback?.title || "轻轻吹，我在听");
      setText("#feedback-copy", feedback?.detail || "吹响后自动计时，尽量保持在绿色音准带内。");
      if (state.challenge.status === "finished") {
        state.longArmed = false;
        if (state.challenge.best >= 3) state.sessionNotes.add(state.longNote.id);
        setText("#feedback-title", "本次挑战已完成");
        setText("#feedback-copy", "看看本次成绩，休息一下再挑战。");
      }
      paintLongTone();
    }
    return;
  }
  if (state.page !== "practice") return;
  const wave = document.querySelector("#waveform");
  wave.classList.toggle("active", rms > 0.008);
  wave.style.setProperty("--intensity", Math.max(0.2, Math.min(1.5, rms * 9)));
  const indicator = document.querySelector("#pitch-indicator");
  const cents = frequency ? centsBetween(frequency, frequencyFor(state.note, state.key, state.reference)) : null;
  const good = frequency ? Math.abs(cents) <= state.tolerance : null;
  const bucket = confidence.update(now, good);
  const mark = `${state.lesson.id}:${state.index}:${state.note.id}`;
  setText("#live-progress", state.passed.has(mark)
    ? `✓ ${noteLabel(state.note)} 本轮已吹准 · 按自己的节奏继续`
    : `音准信心 ${Math.round(bucket.progress*100)}% · 多数时间保持绿区即可，轻微抖动没关系`);
  if (!frequency) {
    indicator.hidden = true;
    document.querySelector(".flute-diagram")?.classList.remove("in-tune");
    setText("#actual-pitch", "—");
    setText("#feedback-title", rms > 0.015 ? "听到声音了，再稳一点" : "轻轻吹，我在听");
    setText("#feedback-copy", rms > 0.015 ? "还没识别出稳定音高，试着对准吹孔、减少周围杂音。" : "盖严音孔，平稳送气。不需要大声。");
    return;
  }
  const feedback = describePitch(cents, state.tolerance);
  setText("#actual-pitch", `${frequency.toFixed(1)} Hz`);
  setText("#feedback-title", feedback.title);
  setText("#feedback-copy", feedback.detail);
  indicator.hidden = false;
  indicator.style.left = `${50 + Math.max(-46, Math.min(46, cents * 0.46))}%`;
  indicator.classList.toggle("in-tune", good);
  document.querySelector(".flute-diagram")?.classList.toggle("in-tune", good);
  indicator.setAttribute("aria-label", `偏差 ${Math.round(cents)} 音分`);
  if (bucket.passed) {
    state.passed.add(mark);
    state.sessionNotes.add(state.note.id);
    document.querySelectorAll(".score-note")[state.index]?.classList.add("passed");
    setText("#feedback-title", "吹对啦，这一声很棒！");
    setText("#feedback-copy", "想再巩固一次，或者点下一步，都很好。");
  } else if (Math.abs(cents) > 150 && Math.abs(cents) < 950) {
    setText("#feedback-copy", `现在更接近${noteLabel(nearestNote(frequency, state.key, state.reference))}。检查音孔是否盖严，再试一次。`);
  }
}

let tunerNoteId = null;
function paintTuner(frequency) {
  const needle = document.querySelector("#tuner-needle");
  if (!needle) return;
  needle.hidden = !frequency;
  document.querySelectorAll("[data-tuner-note]").forEach((el) => el.classList.remove("active"));
  const dial = document.querySelector("#tuner-dial");
  if (!frequency) {
    tunerNoteId = null;
    setText("#tuner-note", "—");
    setText("#tuner-name", "等待声音");
    setText("#tuner-hz", "— Hz");
    setText("#tuner-delta", "— Hz 偏差");
    setText("#tuner-cents", "— 音分");
    setText("#tuner-target", "吹响后显示最近音符的目标频率");
    setText("#tuner-fingering", "识别到音符后，这里同步显示对应孔位和气息要领。");
    dial.classList.remove("in-tune");
    return;
  }
  const note = nearestNote(frequency, state.key, state.reference);
  const target = frequencyFor(note, state.key, state.reference);
  const cents = centsBetween(frequency, target);
  const signed = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
  document.querySelector(`[data-tuner-note="${note.id}"]`)?.classList.add("active");
  if (note.id !== tunerNoteId) {
    document.querySelector("#tuner-note").innerHTML = noteMarkup(note);
    document.querySelector("#tuner-fingering").innerHTML = `<h3>${noteLabel(note)} · ${note.title}</h3>${holeRow(note)}<p>${note.tip}</p>`;
    tunerNoteId = note.id;
  }
  setText("#tuner-name", `${noteLabel(note)} · ${pitchNameFor(note, state.key)}`);
  setText("#tuner-hz", `${frequency.toFixed(1)} Hz`);
  setText("#tuner-delta", `${signed(frequency-target)} Hz 偏差`);
  setText("#tuner-cents", `${signed(cents)} 音分`);
  setText("#tuner-target", `目标 ${target.toFixed(1)} Hz${Math.abs(cents) > 100 ? " · 超出该音附近范围" : ""}`);
  dial.classList.toggle("in-tune", Math.abs(cents) <= state.tolerance);
  needle.style.left = `${50+Math.max(-49, Math.min(49, cents/2))}%`;
  const feedback = describePitch(cents, state.tolerance);
  setText("#feedback-title", feedback.title);
  setText("#feedback-copy", feedback.detail);
}

function paintLongTone() {
  const chart = document.querySelector("#breath-chart");
  if (!chart) return;
  const challenge = state.challenge;
  chart.innerHTML = renderBreathChart(challenge, state.tolerance);
  document.querySelector("#hold-seconds").innerHTML = `${(challenge?.streak || 0).toFixed(1)}<small>秒</small>`;
  document.querySelector("#hold-progress").style.width = `${Math.min(100, (challenge?.streak || 0)/8*100)}%`;
  document.querySelectorAll("[data-medal]").forEach((el) => el.classList.toggle("achieved", (challenge?.best || 0) >= Number(el.dataset.medal)));
  setText("#hold-status", challenge?.status === "finished" ? `本次完成 · ${challenge.result.medal}` : state.longArmed ? challenge?.status === "running" ? `最长连续 ${(challenge.best).toFixed(1)} 秒 · 保持在绿色带内` : "已就绪，吹响后自动计时" : "点击开始挑战，吹响后自动计时");
  setText("#long-start", state.longArmed ? "重新开始" : challenge?.result ? "再挑战一次" : "开始挑战");
  document.querySelector("#long-finish").disabled = !state.longArmed;
  const result = document.querySelector("#long-result");
  result.hidden = !challenge?.result;
  if (challenge?.result) result.innerHTML = resultMarkup(challenge.result);
}

function finishLongTone() {
  if (!state.longArmed) return;
  state.challenge?.finish();
  if (state.challenge?.best >= 3) state.sessionNotes.add(state.longNote.id);
  state.longArmed = false;
  paintLongTone();
  if (state.challenge?.result) {
    setText("#feedback-title", "本次挑战已完成");
    setText("#feedback-copy", "看看本次成绩，休息一下再挑战。");
  }
}

async function startLongTone() {
  stopDemo();
  state.challenge = new LongToneChallenge(state.tolerance);
  state.longArmed = true;
  engine.smoother.reset();
  paintLongTone();
  if (state.mic === "off") await startMic();
}

function syncMetronomeUI() {
  state.metronome.running = metronome.running;
  const m = state.metronome;
  setText("#metro-summary", `${m.bpm} BPM · ${m.beats}/4${m.running ? " · 运行中" : ""}`);
  setText("#metro-toggle", m.running ? "停止" : "开始");
  if (!m.running) document.querySelectorAll("#metro-dots i").forEach((el) => el.classList.remove("active"));
  setText("#song-demo-label", state.demo && metronome.sequence ? "停止示范" : "节拍器同步打拍示范");
}

function stopMetronome() {
  metronome.stop();
  syncMetronomeUI();
}

async function startMetronome(sequence = null) {
  if (sequence && state.demo || !sequence && (metronome.running || state.metronome.running)) {
    stopDemo(); stopMetronome(); return;
  }
  stopDemo();
  stopMetronome();
  state.demo = !!sequence;
  state.metronome.running = true;
  try {
    await metronome.start({ ...state.metronome, sequence,
      frequencyForNote: (id) => frequencyFor(NOTES.find((n) => n.id === id), state.key, state.reference),
    });
    syncMetronomeUI();
  } catch (error) {
    stopDemo(); stopMetronome(); toast(error.message);
  }
}

function selectNote(index, stopAudio = true) {
  if (stopAudio) stopDemo();
  state.index = index;
  state.customHoles = null;
  state.note = NOTES.find((n) => n.id === state.lesson.sequence[index]);
  confidence.reset();
  engine.smoother.reset();
  render();
  updateMicUI();
}

function chooseLesson(id) {
  stopMic();
  stopDemo();
  state.passed.clear();
  state.lesson = LESSONS.find((lesson) => lesson.id === id) || LESSONS[0];
  state.index = 0;
  state.note = NOTES.find((note) => note.id === state.lesson.sequence[0]);
  navigate("practice");
}

function navigate(page) {
  stopMetronome();
  tunerNoteId = null;
  stopMic();
  stopDemo();
  state.page = [
    "practice",
    "fingering",
    "tuner",
    "long-tone",
    "notation",
    "songs",
    "history",
  ].includes(page)
    ? page
    : "practice";
  if (state.page === "practice")
    state.note = NOTES.find(
      (note) => note.id === state.lesson.sequence[state.index],
    );
  history.replaceState(null, "", `#${state.page}`);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showDialog(type) {
  stopMetronome();
  stopMic();
  stopDemo();
  const modal = document.querySelector("#modal");
  modal.innerHTML = dialogView(type, state);
  modal.showModal();
}


function handleHoleToggle(holeIndex) {
  if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= 6) return;
  if (state.page === "fingering") {
    stopDemo();
    const currentHoles = [...(state.customHoles || state.note.holes)];
    if (holeIndex === 0) {
      currentHoles[0] = currentHoles[0] === 1 ? 0.5 : currentHoles[0] === 0.5 ? 0 : 1;
    } else {
      currentHoles[holeIndex] = currentHoles[holeIndex] === 1 ? 0 : 1;
    }
    const matched = noteForHoles(currentHoles, state.note.overblow, state.note.high);
    if (matched) {
      state.customHoles = null;
      state.note = matched;
      render();
      engine.tone(frequencyFor(matched, state.key, state.reference), 1.0);
      toast(`切换指法：${noteLabel(matched)} (${matched.solfege}) · ${pitchNameFor(matched, state.key)} · ${Math.round(frequencyFor(matched, state.key, state.reference))} Hz`);
    } else {
      state.customHoles = currentHoles;
      render();
      toast("特殊按孔组合 · 点击上方音符可切回标准指法");
    }
  } else {
    engine.tone(frequencyFor(state.note, state.key, state.reference), 0.6);
    toast(`第 ${6 - holeIndex} 孔 · 当前${state.note.holes[holeIndex] === 1 ? "盖严" : state.note.holes[holeIndex] === 0.5 ? "半孔" : "松开"}`);
  }
}

app.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (link) {
    event.preventDefault();
    navigate(link.hash.slice(1));
    return;
  }
  let button = event.target.closest("[data-action]");
  if (!button) {
    const svg = event.target.closest("svg.flute-svg");
    if (svg && typeof svg.createSVGPoint === "function") {
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const svgPt = pt.matrixTransform(ctm.inverse());
        // Blow hole at (104, 65)
        if (Math.hypot(svgPt.x - 104, svgPt.y - 65) <= 25) {
          listen();
          return;
        }
        // Holes 6..1 at [312, 388, 468, 574, 650, 728], y = 65
        const holeCenters = [312, 388, 468, 574, 650, 728];
        for (let i = 0; i < 6; i++) {
          if (Math.hypot(svgPt.x - holeCenters[i], svgPt.y - 65) <= 24) {
            handleHoleToggle(i);
            return;
          }
        }
      }
    }
    return;
  }
  const action = button.getAttribute("data-action") || button.dataset?.action;
  if (["practice", "notation", "fingering", "tuner", "long-tone"].includes(action)) navigate(action);
  else if (action === "settings" || action === "help") showDialog(action);
  else if (action === "close") document.querySelector("#modal").close();
  else if (action === "listen" || action === "blow-flute") listen();
  else if (action === "toggle-hole") {
    const holeIndex = Number(button.getAttribute("data-index") ?? button.dataset?.index);
    handleHoleToggle(holeIndex);
  }
  else if (action === "mic") startMic();
  else if (action === "metronome") startMetronome();
  else if (action === "song-demo") startMetronome(LESSONS[2].sequence);
  else if (action === "long-start") startLongTone();
  else if (action === "long-finish") finishLongTone();
  else if (action === "lesson") chooseLesson(button.dataset.lesson);
  else if (action === "select-note") selectNote(Number(button.dataset.index));
  else if (action === "explore") {
    stopDemo();
    state.customHoles = null;
    state.note = NOTES.find((n) => n.id === button.dataset.note) || NOTES[0];
    render();
    engine.tone(frequencyFor(state.note, state.key, state.reference), 0.9);
  } else if (action === "practice-note") {
    const note = state.note;
    state.passed.clear();
    state.lesson = {
      ...LESSONS[0],
      sequence: [note.id],
      name: `练习${noteLabel(note)}`,
      instruction: "看指法、听参考音，然后用平稳的气息试着吹。",
    };
    state.index = 0;
    navigate("practice");
  } else if (action === "next") {
    if (state.index < state.lesson.sequence.length - 1)
      selectNote(state.index + 1);
    else
      chooseLesson(
        LESSONS[
          Math.min(
            2,
            LESSONS.findIndex((lesson) => lesson.id === state.lesson.id) + 1,
          )
        ].id,
      );
  } else if (action === "demo") {
    startMetronome(state.lesson.sequence);
  } else if (action === "notation-demo") {
    const examples = [
      ["1", "2", "3"],
      ["low5", "5"],
      ["1", "2"],
      ["1", null, "2", null],
    ];
    toast("合成参考音正在播放，再次点击可停止。");
    playSequence(
      examples[Number(button.dataset.demo)],
      button.dataset.demo === "2" ? 2000 : 1000,
    );
  }
});

app.addEventListener("toggle", (event) => {
  if (event.target.id === "metronome") state.metronome.open = event.target.open;
}, true);

app.addEventListener("input", (event) => {
  if (event.target.id !== "metro-bpm") return;
  const value = Number(event.target.value);
  if (!Number.isInteger(value) || value < 40 || value > 180 || value === state.metronome.bpm) return;
  state.metronome.bpm = value;
  const wasRunning = metronome.running;
  const sequence = metronome.sequence;
  if (wasRunning) {
    stopDemo(); stopMetronome(); startMetronome(sequence);
  } else syncMetronomeUI();
});

app.addEventListener("change", (event) => {
  const field = event.target;
  if (field.id === "long-note") {
    finishLongTone();
    state.longNote = NOTES.find((n) => n.id === field.value) || NOTES[0];
    state.challenge = null;
    engine.smoother.reset();
    render();
  }
  if (field.id === "metro-bpm" || field.id === "metro-beats") {
    const wasRunning = metronome.running;
    const sequence = metronome.sequence;
    const value = Number(field.value);
    if (field.id === "metro-bpm" && value === state.metronome.bpm) return;
    if (field.id === "metro-bpm") state.metronome.bpm = Number.isFinite(value) ? Math.max(40, Math.min(180, Math.round(value))) : 60;
    else state.metronome.beats = [2,3,4].includes(value) ? value : 4;
    stopDemo(); stopMetronome();
    render();
    if (wasRunning) startMetronome(sequence);
  }
});

app.addEventListener("submit", (event) => {
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const key = form.get("key");
  const reference = Number(form.get("reference"));
  const tolerance = Number(form.get("tolerance"));
  if (
    !Object.hasOwn(KEYS, key) ||
    !Number.isFinite(reference) ||
    reference < 430 ||
    reference > 450 ||
    ![20, 35, 50].includes(tolerance)
  )
    return;
  state.key = key;
  state.reference = reference;
  state.tolerance = tolerance;
  state.passed.clear();
  state.challenge = null;
  state.longArmed = false;
  save();
  render();
  toast(`已切换为 ${state.key} 调竹笛，继续慢慢练。`);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMetronome();
    stopMic();
    stopDemo();
  }
});
window.addEventListener("pagehide", () => {
  stopMetronome();
  stopMic();
  stopDemo();
});
window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));
state.page = ["practice", "fingering", "notation", "songs", "history", "tuner", "long-tone"].includes(
  location.hash.slice(1),
)
  ? location.hash.slice(1)
  : "practice";
render();

