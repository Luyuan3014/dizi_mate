import "./style.css";
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

const paths = {
  leaf: '<path d="M19 4C9 3 3 8 5 15c2 7 14 6 14-11Z"/><path d="m5 20 9-10M9 15l-1-4m4 1 4 1"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>',
  hand: '<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
  music:
    '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  book: '<path d="M12 5v16M12 5C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 1Z"/>',
  chart: '<path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  mic: '<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield:
    '<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1 1m14 14 1 1M4 20l1-1M19 5l1-1"/>',
  sparkle:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  headphone:
    '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.music}</svg>`;
const logo =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 30V12m9 19V7m9 21V14M7 19h8m1-5h8m1 8h8M7 26h8m1-3h8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

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
  stableSince: 0,
  latestGood: 0,
};
const engine = new AudioEngine();
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

function noteMarkup(note, className = "") {
  return `<span class="notation ${note.low ? "low-note" : ""} ${className}" aria-label="${note.low ? "低音" : ""}${note.number}">${note.number}${note.low ? '<span class="note-dot"></span>' : ""}</span>`;
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
            `<a href="#${id}" class="nav-link ${state.page === id ? "active" : ""}" ${state.page === id ? 'aria-current="page"' : ""}>${icon({ practice: "home", fingering: "hand", notation: "book", songs: "music", history: "chart" }[id])}<span>${title}</span>${id === "practice" ? "<i></i>" : ""}</a>`,
        )
        .join("")}</nav>
      <div class="sidebar-note"><div class="plant-art" aria-hidden="true"><svg viewBox="0 0 150 115"><path d="M70 114c0-32 10-56 34-85M77 83C43 78 32 62 29 43c25 0 46 10 48 40Zm13-28c-3-28 8-44 25-51 7 25-3 41-25 51Zm-15 48c26-24 41-26 61-19-15 23-35 22-61 19Z" fill="#bdc6aa"/><path d="m75 96-30-35m50-15 13-25m-25 77 37-8" fill="none" stroke="#839176" stroke-width="1.3"/></svg></div><strong>不赶进度，只享受进步。</strong><p>每天一点点，让音乐自然发生。</p></div>
      <button class="sidebar-help" data-action="help">${icon("help")}<span>第一次吹笛子？</span>${icon("chevron")}</button>
      <div class="sidebar-bottom"><span class="avatar">${icon("leaf")}</span><span>初见，笛友<small>从零开始，也很好</small></span><span class="status-dot"></span></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb">我的练习 <span>/</span> <strong>${titles[state.page]}</strong></div><div class="topbar-actions"><span class="local-badge">${icon("shield")} 本地练习，安心吹奏</span><button class="instrument-select" data-action="settings">${icon("music")}<span>${state.key} 调竹笛</span><span class="select-divider"></span><span>筒音作 5</span>${icon("down")}</button></div></header>
      <main id="main-content">${state.page === "practice" ? practicePage(stats) : state.page === "fingering" ? fingeringPage() : state.page === "notation" ? notationPage() : state.page === "songs" ? songsPage() : historyPage(stats)}</main>
      <footer class="page-footer"><span>${icon("leaf")} 每一次呼吸，都在靠近音乐。</span><span>笛伴 DiziMate <i>·</i> 陪你慢慢来</span></footer>
    </div>
    <dialog id="modal" aria-labelledby="dialog-title"></dialog>
    <div id="toast" class="toast" role="status"></div>`;
}

function hero(eyebrow, title, description, right = "") {
  return `<section class="page-heading"><div><div class="eyebrow">${icon("sun")} ${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${right}</section>`;
}

function practicePage(stats) {
  return `${hero("你好，今天也一起吹笛子吧", "从第一个音，<span>慢慢来。</span>", "不用先懂乐理。看一眼指法，听一听，再试着吹出你的声音。", `<div class="daily-stats"><div><strong>${Math.floor(stats.seconds / 60)}<small>分钟</small></strong><span>今日练习</span></div><div class="stats-line"></div><div><strong>${stats.notes}<small>个音</small></strong><span>今日吹准</span></div><span class="stats-sprout">${icon("leaf")}</span></div>`)}
    <div class="practice-grid">
      <section class="practice-card card" aria-label="指法练习">
        <div class="card-top"><span class="section-kicker"><span class="tiny-dot"></span> 今日的小练习</span><span class="level-tag">零基础 · 第 ${LESSONS.findIndex((lesson) => lesson.id === state.lesson.id) + 1} 步</span></div>
        <div class="lesson-heading"><div><h2>${state.lesson.name}</h2><p>${state.lesson.instruction}</p></div><button class="round-help" data-action="help" aria-label="查看吹奏方法">${icon("help")}</button></div>
        <div class="practice-tabs" aria-label="练习方式"><span class="selected">${icon("hand")} 看指法，跟着吹</span><button data-action="notation">${icon("book")} 简谱怎么看？${icon("chevron")}</button></div>
        <div class="target-note-row"><div class="target-note">${noteMarkup(state.note)}<div><strong>${state.note.solfege} <span>${state.note.low ? "低音" : state.note.overblow ? "超吹音" : "中音"} · ${pitchNameFor(state.note, state.key)}</span></strong><p>${state.note.title}</p></div></div><button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听听这个音"}</span></button></div>
        ${fluteDiagram(state.note)}
        <div class="fingering-caption"><span><i class="legend-hole closed"></i>按住（润玉指触）</span><span><i class="legend-hole"></i>松开（通透内膛）</span>${state.note.holes.includes(0.5) ? '<span><i class="legend-hole half"></i>半孔</span>' : ""}<span class="caption-tip">💡 点击吹孔试听，点击音孔可试按</span><button data-action="fingering">查看全部指法 ${icon("arrow")}</button></div>
        <div class="breath-tip"><span class="tip-icon">${icon("leaf")}</span><div><strong>${state.note.overblow ? "试着集中气流" : "给你一个小提示"}</strong><p>${state.note.tip}</p></div></div>
        <div class="score-strip"><div class="score-label"><span>${state.lesson.id === "song" ? "两只老虎 · 开头两句" : "这次练习的音"}</span><small>${state.lesson.id === "song" ? "一个数字，就是一拍" : "点击数字，看看指法"}</small></div><div class="score-notes">${state.lesson.sequence.map((id, index) => `<button class="score-note ${index === state.index ? "current" : ""} ${state.passed.has(`${state.lesson.id}:${index}:${id}`) ? "passed" : ""}" data-action="select-note" data-index="${index}" aria-label="练习第 ${index + 1} 个音 ${id.startsWith("low") ? "低音" : ""}${NOTES.find((n) => n.id === id).number}" ${index === state.index ? 'aria-current="step"' : ""}>${noteMarkup(NOTES.find((n) => n.id === id))}<span>${state.lesson.id === "song" ? ["两", "只", "老", "虎", "两", "只", "老", "虎"][index] : NOTES.find((n) => n.id === id).solfege}</span></button>`).join("")}</div><button class="score-play" data-action="demo" aria-label="播放整段参考旋律">${icon(state.demo ? "pause" : "play")}</button></div>
        <div class="practice-card-footer"><span>${icon("headphone")} 参考音为合成音，帮你找到音高</span><button data-action="next">${state.index < state.lesson.sequence.length - 1 ? "下一个音" : LESSONS.indexOf(state.lesson) < 2 ? "下一小步" : "再练一次"} ${icon("arrow")}</button></div>
      </section>
      <aside class="companion-column">
        <section class="companion-card" aria-label="实时音高陪练"><div class="companion-top"><span>${icon("sparkle")} 实时陪练</span><span class="mic-state" id="mic-state"><i></i>等待开启</span></div>
          <div class="listening-orb" id="listening-orb"><div class="orb-ring"></div><div class="orb-ring second"></div><span>${icon("mic")}</span><i class="orb-spark spark-one"></i><i class="orb-spark spark-two"></i></div>
          <h2 id="feedback-title" aria-live="polite" aria-atomic="true">我在这里，听你吹奏</h2><p class="feedback-copy" id="feedback-copy">不怕吹错，每一声都是进步。</p>
          <div class="waveform" id="waveform" aria-hidden="true">${Array.from({ length: 35 }, (_, i) => `<i style="--wave:${8 + Math.sin(i * 1.1) ** 2 * (13 + Math.sin(i / 6) ** 2 * 21)}px;--delay:${i * -0.075}s"></i>`).join("")}</div>
          <div class="pitch-panel"><div class="pitch-values"><span>当前音高 <strong id="actual-pitch">—</strong></span><span>目标 <strong id="target-pitch">${state.note.low ? "低音 " : ""}${state.note.number} (${pitchNameFor(state.note, state.key)}) · ${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz</strong></span></div><div class="pitch-scale"><span class="pitch-safe-zone" style="left:${50 - state.tolerance * 0.46}%;width:${state.tolerance * 0.92}%"></span><i id="pitch-indicator" hidden></i><span class="pitch-center"></span></div><div class="pitch-scale-labels"><span>偏低</span><span>刚刚好</span><span>偏高</span></div></div>
          <button class="button mic-button" id="mic-button" data-action="mic">${icon("mic")} 开启麦克风，试着吹</button><div class="privacy-note">${icon("shield")} 声音只在本机处理，不录音、不上传</div>
          <div class="live-progress" id="live-progress"></div>
        </section>
        <button class="small-help-card" data-action="help"><span class="help-card-icon">${icon("help")}</span><span><strong>怎么还吹不响？</strong><small>先别急，试试这 3 个小动作</small></span>${icon("arrow")}</button>
      </aside>
    </div>
    <section class="journey-section"><div class="section-heading"><h2>你的入门小路<span>一步一步，就会了</span></h2><span>跟着自己的节奏来 ${icon("leaf")}</span></div><div class="journey-grid">${LESSONS.map((lesson, index) => `<button class="journey-card ${state.lesson.id === lesson.id ? "current" : ""}" data-action="lesson" data-lesson="${lesson.id}"><span class="journey-illustration illustration-${index}">${index === 0 ? "<i></i><i></i><i></i><i></i><i></i>" : index === 1 ? "<b>5</b><b>6</b><b>7</b>" : icon("music")}</span><span class="journey-content"><span class="journey-eyebrow">STEP 0${index + 1}${state.lesson.id === lesson.id ? "<em>正在练习</em>" : ""}</span><strong>${lesson.name}</strong><small>${lesson.subtitle}</small><span class="journey-duration">${icon("clock")} ${lesson.duration}</span></span>${icon("chevron")}</button>`).join("")}</div></section>`;
}

function fluteDiagram(note) {
  const isPlaying = state.demo;
  const activeHoles = (state.page === "fingering" && state.customHoles) ? state.customHoles : note.holes;
  const holePositions = [36.28, 45.12, 54.42, 66.74, 75.58, 84.65];

  return `<div class="flute-diagram ${isPlaying ? "flute-playing" : ""}" role="region" aria-label="吹孔在左。从左到右，第六至第一音孔：${activeHoles.map((hole, i) => `第${6 - i}孔${hole === 1 ? "按住" : hole === 0.5 ? "半孔" : "松开"}`).join("，")}">
    <svg class="flute-svg" viewBox="0 0 860 144" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="bamboo-cylinder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b47f37" />
          <stop offset="8%" stop-color="#d6ab62" />
          <stop offset="28%" stop-color="#f5dc99" />
          <stop offset="50%" stop-color="#fef3c7" />
          <stop offset="72%" stop-color="#ddba77" />
          <stop offset="90%" stop-color="#b78944" />
          <stop offset="100%" stop-color="#956729" />
        </linearGradient>

        <pattern id="bamboo-grain" width="50" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1" x2="50" y2="1" stroke="#875b22" stroke-width="0.5" opacity="0.18" />
          <line x1="0" y1="3" x2="50" y2="3" stroke="#fff8d6" stroke-width="0.5" opacity="0.25" />
        </pattern>

        <pattern id="cord-pattern" width="3" height="38" patternUnits="userSpaceOnUse">
          <line x1="0.6" y1="0" x2="0.6" y2="38" stroke="#1c110a" stroke-width="0.9" />
          <line x1="1.8" y1="0" x2="1.8" y2="38" stroke="#5a341f" stroke-width="1.2" />
          <line x1="2.8" y1="0" x2="2.8" y2="38" stroke="#140b06" stroke-width="0.9" />
        </pattern>

        <radialGradient id="hole-interior" cx="48%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#0a0604" />
          <stop offset="65%" stop-color="#1c120b" />
          <stop offset="100%" stop-color="#2d1c10" />
        </radialGradient>

        <linearGradient id="blow-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#faecc0" />
          <stop offset="100%" stop-color="#b6843c" />
        </linearGradient>

        <linearGradient id="membrane-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fdfbf0" />
          <stop offset="50%" stop-color="#f5edd0" />
          <stop offset="100%" stop-color="#e8dcba" />
        </linearGradient>

        <linearGradient id="horn-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#161210" />
          <stop offset="30%" stop-color="#3d322b" />
          <stop offset="70%" stop-color="#29201a" />
          <stop offset="100%" stop-color="#120e0c" />
        </linearGradient>

        <linearGradient id="brass-joint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cbb584" />
          <stop offset="25%" stop-color="#fcedcc" />
          <stop offset="60%" stop-color="#e6cf9c" />
          <stop offset="90%" stop-color="#a48446" />
          <stop offset="100%" stop-color="#80622d" />
        </linearGradient>
      </defs>

      <!-- Top Guides: Mouth guide and Hand guides -->
      <g class="mouth-guide-svg">
        <text x="104" y="19" text-anchor="middle" class="guide-text guide-mouth">吹孔在这边</text>
        <path d="M104 24 v7 M101 28 l3 3 l3 -3" fill="none" stroke="#9ba88d" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <g class="hand-guide-svg left-hand-guide">
        <text x="390" y="15" text-anchor="middle" class="guide-text guide-hand-title">左手</text>
        <text x="390" y="27" text-anchor="middle" class="guide-subtext">食指 · 中指 · 无名指</text>
        <path d="M312 32 h156 M312 32 v4 M388 32 v4 M468 32 v4" fill="none" stroke="#d5dec7" stroke-width="1.1" stroke-linecap="round" />
      </g>

      <g class="hand-guide-svg right-hand-guide">
        <text x="651" y="15" text-anchor="middle" class="guide-text guide-hand-title">右手</text>
        <text x="651" y="27" text-anchor="middle" class="guide-subtext">食指 · 中指 · 无名指</text>
        <path d="M574 32 h154 M574 32 v4 M650 32 v4 M728 32 v4" fill="none" stroke="#d5dec7" stroke-width="1.1" stroke-linecap="round" />
      </g>

      <!-- Flute Tube Body Layer -->
      <g class="bamboo-flute-tube">
        <rect x="28" y="48" width="802" height="34" rx="2" fill="url(#bamboo-cylinder)" />
        <rect x="28" y="48" width="802" height="34" rx="2" fill="url(#bamboo-grain)" opacity="0.32" />
        <line x1="28" y1="56" x2="830" y2="56" stroke="#fffce8" stroke-width="1.2" opacity="0.45" />
        <line x1="28" y1="81" x2="830" y2="81" stroke="#754e1e" stroke-width="1.1" opacity="0.5" />

        <!-- Bamboo Nodes -->
        <g class="bamboo-node" transform="translate(265, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(428, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(524, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(688, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>

        <!-- Silk Bindings -->
        <rect x="54" y="46" width="16" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="142" y="46" width="12" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="226" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="508" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="762" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="802" y="46" width="16" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />

        <!-- Head Cap & Brass Joint -->
        <path d="M42 47.5 H35 A17 17 0 0 0 35 82.5 H42 Z" fill="url(#horn-gradient)" stroke="#181310" stroke-width="0.8" />
        <line x1="38" y1="48" x2="38" y2="82" stroke="#ebd6b0" stroke-width="0.8" opacity="0.6" />
        <rect x="42" y="47" width="10" height="36" fill="url(#brass-joint)" stroke="#80622d" stroke-width="0.7" />
        <line x1="47" y1="47" x2="47" y2="83" stroke="#fff5d9" stroke-width="0.7" opacity="0.8" />

        <!-- Tail Piece & Auxiliary holes -->
        <rect x="820" y="47.5" width="10" height="35" rx="1.5" fill="url(#horn-gradient)" stroke="#181310" stroke-width="0.8" />
        <ellipse cx="830" cy="65" rx="2.5" ry="11" fill="#0f0905" stroke="#4a3726" stroke-width="0.6" />
        <ellipse cx="786" cy="65" rx="5" ry="4" fill="#18100a" stroke="#8c642e" stroke-width="0.8" />

        <!-- Tassel -->
        <g class="flute-tassel" transform="translate(830, 65)">
          <path d="M0 0 C6 3, 10 10, 10 22 C10 32, 13 38, 14 46" fill="none" stroke="#a43d2c" stroke-width="1.2" stroke-linecap="round" />
          <ellipse cx="10" cy="22" rx="2.2" ry="2.2" fill="#d2964d" />
          <path d="M14 46 L12 60 M14 46 L14 62 M14 46 L16 60" stroke="#a43d2c" stroke-width="1.1" stroke-linecap="round" />
        </g>
      </g>

      <!-- Embouchure / Blow Hole base rendering -->
      <g class="flute-blow-hole-base" transform="translate(104, 65)">
        <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="url(#blow-bevel)" stroke="#9c7031" stroke-width="0.9" />
        <ellipse cx="0" cy="0.4" rx="10" ry="6.8" fill="url(#hole-interior)" />
        <path d="M-8 -2.5 A9 6 0 0 1 8 -2.5" fill="none" stroke="#fff0be" stroke-width="0.8" opacity="0.6" />
        <ellipse class="breath-wave" cx="0" cy="0" rx="12" ry="8.5" fill="none" stroke="#e8984a" stroke-width="1.6" opacity="0" />
      </g>

      <!-- Membrane Hole -->
      <g class="flute-membrane-hole" transform="translate(188, 65)">
        <ellipse cx="0" cy="0" rx="10" ry="7" fill="#d6ba82" stroke="#875e29" stroke-width="0.8" />
        <ellipse class="membrane-skin" cx="0" cy="0" rx="9" ry="6.2" fill="url(#membrane-grad)" stroke="#b59a68" stroke-width="0.6" />
        <path d="M-6 -2 Q-2 -1.2 6 -2.4 M-7 0 Q-1 0.6 7 -0.2 M-6 2 Q-2 2.6 6 1.8" fill="none" stroke="#caa66b" stroke-width="0.45" opacity="0.75" />
        <ellipse cx="0" cy="0" rx="7" ry="4" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.35" />
      </g>

      <!-- Under-Hole Drilled Rims -->
      ${holePositions.map((p, i) => {
        const cx = [312, 388, 468, 574, 650, 728][i];
        return `<g transform="translate(${cx}, 65)">
          <circle cx="0" cy="0" r="16" fill="#cda35e" stroke="#875b25" stroke-width="1.1" />
          <circle cx="0" cy="0" r="13.5" fill="url(#hole-interior)" />
          <path d="M-10 -7 A13 13 0 0 1 10 -7" fill="none" stroke="#ffebbe" stroke-width="0.8" opacity="0.5" />
        </g>`;
      }).join("")}

      <!-- Bottom Number Labels -->
      <g class="flute-hole-numbers">
        ${[312, 388, 468, 574, 650, 728]
          .map(
            (x, i) =>
              `<text x="${x}" y="106" text-anchor="middle" class="hole-num-text ${activeHoles[i] === 1 ? "num-covered" : ""}">${6 - i}</text>`,
          )
          .join("")}
      </g>

      <!-- Bottom Direction Axis Line -->
      <g class="flute-axis-line">
        <text x="36" y="129" text-anchor="start" class="axis-label">靠近吹孔</text>
        <line x1="95" y1="126" x2="755" y2="126" stroke="#e3e7d8" stroke-width="1" stroke-dasharray="2 3" />
        <text x="824" y="129" text-anchor="end" class="axis-label">靠近笛尾</text>
      </g>
    </svg>

    <!-- Interactive HTML Buttons Layer -->
    <button class="flute-blow-btn" onclick="window.listen()" data-action="blow-flute" aria-label="吹孔 · 点击试听竹笛参考音" title="点击吹孔试听">
      </button>
      ${activeHoles.map((hole, i) => {
        const leftPercent = holePositions[i];
        const holeNum = 6 - i;
        const stateText = hole === 1 ? "按住" : hole === 0.5 ? "半孔" : "松开";
        return `<button class="flute-hole-btn ${hole === 1 ? "covered" : hole === 0.5 ? "half" : "open"}"
                        style="left: ${leftPercent}%"
                        onclick="window.handleHoleToggle(${i})"
                        data-action="toggle-hole"
                        data-index="${i}"
                        data-hole="${holeNum}"
                        aria-label="第${holeNum}孔 · 当前${stateText} · 点击切换"
                        title="第${holeNum}孔 · 点击切换指法">
                  <span class="hole-disc"></span>
                </button>`;
      }).join("")}
  </div>`;
}

function fingeringPage() {
  return `${hero("先用手指认识竹笛", "六个音孔，<span>慢慢熟悉。</span>", "点击一个音，看手指怎么放。实心表示盖住，空心表示松开。")}
    <section class="card explorer-card"><div class="explorer-notes">${NOTES.map((note) => `<button class="explorer-note ${state.note.id === note.id ? "active" : ""}" data-action="explore" data-note="${note.id}" aria-pressed="${state.note.id === note.id}">${noteMarkup(note)}<small>${note.solfege}</small></button>`).join("")}</div><div class="explorer-target"><div><h2>${state.note.title}</h2><p class="target-hz-badge">${state.note.low ? "低音 " : ""}${state.note.number} (${state.note.solfege}) · 音名 <strong>${pitchNameFor(state.note, state.key)}</strong> · 准确频率 <strong>${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz</strong></p></div><button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听参考音"}</span></button></div>${fluteDiagram(state.note)}<div class="breath-tip">${icon("leaf")}<p>${state.note.tip}</p></div><div class="explorer-footer"><p>当前：${state.key} 调 · 筒音作 5。孔号从笛尾向吹孔数；低音 5 和中音 5 指法相同，气流不同。</p><button class="button button-primary" data-action="practice-note">练练这个音 ${icon("arrow")}</button></div></section>
    <div class="inline-note">${icon("help")} 半孔音 4 需要微调，不同笛子的指法可能略有差异。先从低音 5、6、7 和中音 1 练起就很好。</div>`;
}

const notationLessons = [
  {
    label: "数字就是音",
    symbol: "1 2 3",
    title: "像念名字一样认识音符",
    content:
      "1 读 do，2 读 re，3 读 mi；接着是 4 fa、5 sol、6 la、7 si。数字越往后，同一音区里的声音越高。",
  },
  {
    label: "小点改变高低",
    symbol:
      '<span class="notation low-note">5<span class="note-dot"></span></span> → 5',
    title: "下面有点，声音低八度",
    content:
      "数字下面有一个点，表示低八度；上面有一个点，表示高八度。没有点就是中音。入门第一课的 5，下面就有一个小点。",
  },
  {
    label: "一拍有多长",
    symbol: "1 － 2 －",
    title: "跟着心里的“哒、哒”",
    content:
      "这段练习中，一个数字吹一拍；后面每多一条横线，就再延长一拍。两拍就是“吹——”，中间不要重新吐气。",
  },
  {
    label: "空一拍也很好",
    symbol: "1 0 2 0",
    title: "遇见 0，让声音休息",
    content:
      "0 是休止符。这段练习里，每个 0 停一拍。数字下方的短横线表示更短的时值，之后再慢慢学。",
  },
];

function notationPage() {
  return `${hero("不背乐理，也能开始", "简谱，其实<span>很好懂。</span>", "先认识这四件小事，就能读懂你的第一段旋律。")}
    <div class="notation-grid">${notationLessons.map((item, i) => `<article class="card notation-card"><span class="section-kicker">0${i + 1} / ${item.label}</span><div class="notation-example">${item.symbol}</div><h2>${item.title}</h2><p>${item.content}</p><button data-action="notation-demo" data-demo="${i}">${icon("volume")} 听听这个例子 ${icon("arrow")}</button></article>`).join("")}</div><div class="notation-cta"><div><h2>看懂一点，就试着吹一点。</h2><p>从《两只老虎》的前两句开始，只用 1、2、3 三个音。</p></div><button class="button button-primary" data-action="lesson" data-lesson="song">去吹一段旋律 ${icon("arrow")}</button></div>`;
}

function songsPage() {
  return `${hero("第一段旋律，从熟悉的开始", "小小曲谱，<span>大大开心。</span>", "不用一口气吹完整首，先把一句吹给自己听。")}
    <section class="card song-card"><div class="song-art"><span>♪</span><i>♪</i><small>FIRST MELODY</small></div><div class="song-content"><span class="level-tag">入门 · 只用 3 个音</span><h2>两只老虎</h2><p>开头两句 · 8 拍 · 建议 60 BPM</p><div class="song-preview">1 2 3 1 <span>│</span> 1 2 3 1</div><p>左手三孔盖住吹 1，再依次松开无名指、中指吹 2 和 3。</p><button class="button button-primary" data-action="lesson" data-lesson="song">开始这段练习 ${icon("arrow")}</button></div></section><div class="inline-note">${icon("leaf")} 好听的旋律不需要很多音。先把这一小段吹稳，再慢慢走远。</div>`;
}

function historyPage(stats) {
  const total = state.sessions.reduce(
    (sum, session) => sum + session.seconds,
    0,
  );
  return `${hero("每一小步，都算数", "听见自己的<span>进步。</span>", "保留最近 100 次麦克风练习；吹准表示目标音高持续稳定至少 1.2 秒。")}
    <div class="history-stats"><div class="card"><span>今日练习</span><strong>${Math.floor(stats.seconds / 60)}<small>分 ${Math.floor(stats.seconds % 60)} 秒</small></strong></div><div class="card"><span>今日吹准</span><strong>${stats.notes}<small>个不同的音</small></strong></div><div class="card"><span>近期练习</span><strong>${Math.floor(total / 60)}<small>分 ${Math.floor(total % 60)} 秒</small></strong></div></div>
    <section class="card history-list"><div class="section-heading"><h2>练习足迹</h2><span>最近 20 次 · 仅存本机</span></div>${
      state.sessions.length
        ? state.sessions
            .slice()
            .reverse()
            .slice(0, 20)
            .map(
              (session) =>
                `<div class="session-row"><span class="session-icon">${icon("music")}</span><div><strong>${new Date(session.at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} · ${new Date(session.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</strong><p>${session.notes.length ? `吹准了 ${session.notes.map((id) => (id.startsWith("low") ? `低音 ${id.slice(3)}` : id)).join("、")}` : "一次声音的探索，继续慢慢来"}</p></div><span>${Math.floor(session.seconds / 60)} 分 ${Math.floor(session.seconds % 60)} 秒</span></div>`,
            )
            .join("")
        : `<div class="empty-state">${icon("leaf")}<h3>第一声，会从这里开始。</h3><p>开启麦克风练习后，你的小小进步会留在这里。</p><button class="button button-primary" data-action="practice">去试着吹一吹 ${icon("arrow")}</button></div>`
    }</section>`;
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
}

async function listen() {
  if (state.demo) {
    stopDemo();
    return;
  }
  stopDemo();
  state.demo = true;
  const generation = demoGeneration;
  try {
    await engine.tone(frequencyFor(state.note, state.key, state.reference));
    if (generation !== demoGeneration) {
      engine.stopTones();
      return;
    }
    document.querySelectorAll(".listen-button").forEach((el) => {
      el.innerHTML = `${icon("pause")}<span>停止示范</span>`;
    });
    document.querySelector(".flute-diagram")?.classList.add("flute-playing");
    toast(
      `正在播放 ${state.note.low ? "低音 " : ""}${state.note.number} (${pitchNameFor(state.note, state.key)}) · ${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz 竹笛参考音`,
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
    .classList.toggle("listening", active);
  document.querySelector("#mic-state").innerHTML =
    `<i></i>${active ? "正在聆听" : requesting ? "等待授权" : "等待开启"}`;
  document.querySelector("#mic-state").classList.toggle("connected", active);
  if (!active) {
    document.querySelector("#waveform").classList.remove("active");
    document.querySelector("#pitch-indicator").hidden = true;
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
  state.stableSince = 0;
  state.latestGood = 0;
  state.mic = "off";
  state.sessionNotes.clear();
  updateMicUI();
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

function handleAudio({ frequency, rms, referencePlaying }) {
  if (state.mic !== "on" || state.page !== "practice") return;
  const wave = document.querySelector("#waveform");
  wave.classList.toggle("active", rms > 0.008);
  wave.style.setProperty("--intensity", Math.max(0.2, Math.min(1.5, rms * 9)));
  const indicator = document.querySelector("#pitch-indicator");
  const elapsed = Math.floor((performance.now() - state.sessionStarted) / 1000);
  setText(
    "#live-progress",
    state.passed.has(`${state.lesson.id}:${state.index}:${state.note.id}`)
      ? `✓ ${state.note.low ? "低音 " : ""}${state.note.number} 本轮已吹准 · 按自己的节奏继续`
      : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} · 持续吹准 1.2 秒，就记下一次小进步`,
  );
  if (!frequency) {
    state.stableSince = 0;
    state.latestGood = 0;
    indicator.hidden = true;
    document.querySelector(".flute-diagram")?.classList.remove("in-tune");
    setText("#actual-pitch", "—");
    setText(
      "#feedback-title",
      referencePlaying
        ? "先听一听，再试着吹"
        : rms > 0.015
          ? "听到声音了，再稳一点"
          : "轻轻吹，我在听",
    );
    setText(
      "#feedback-copy",
      referencePlaying
        ? "播放参考音时暂停判断，避免把示范当成练习。"
        : rms > 0.015
          ? "还没识别出稳定音高，试着对准吹孔、减少周围杂音。"
          : "盖严音孔，平稳送气。不需要大声。",
    );
    return;
  }
  const cents = centsBetween(
    frequency,
    frequencyFor(state.note, state.key, state.reference),
  );
  const feedback = describePitch(cents, state.tolerance);
  const nearest = nearestNote(frequency, state.key, state.reference);
  setText("#actual-pitch", `${Math.round(frequency)} Hz`);
  setText("#feedback-title", feedback.title);
  setText("#feedback-copy", feedback.detail);
  indicator.hidden = false;
  indicator.style.left = `${50 + Math.max(-46, Math.min(46, (cents / 100) * 46))}%`;
  indicator.classList.toggle("in-tune", feedback.kind === "good");
  document.querySelector(".flute-diagram")?.classList.toggle("in-tune", feedback.kind === "good");
  indicator.setAttribute("aria-label", `偏差 ${Math.round(cents)} 音分`);
  if (feedback.kind === "good") {
    const now = performance.now();
    if (now - state.latestGood > 220) state.stableSince = 0;
    state.latestGood = now;
    state.stableSince ||= now;
    if (now - state.stableSince >= 1200) {
      const mark = `${state.lesson.id}:${state.index}:${state.note.id}`;
      state.passed.add(mark);
      state.sessionNotes.add(state.note.id);
      document
        .querySelectorAll(".score-note")
        [state.index]?.classList.add("passed");
      setText("#feedback-title", "吹对啦，这一声很棒！");
      setText("#feedback-copy", "想再巩固一次，或者点“下一小步”，都很好。");
    }
  } else {
    state.stableSince = 0;
    state.latestGood = 0;
    if (Math.abs(cents) < 950 && Math.abs(cents) > 150)
      setText(
        "#feedback-copy",
        `现在更接近${nearest.low ? "低音 " : ""}${nearest.number}。检查音孔是否盖严，再试一次。`,
      );
  }
}

function selectNote(index, stopAudio = true) {
  if (stopAudio) stopDemo();
  state.index = index;
  state.customHoles = null;
  state.note = NOTES.find((n) => n.id === state.lesson.sequence[index]);
  state.stableSince = 0;
  state.latestGood = 0;
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
  stopMic();
  stopDemo();
  state.page = [
    "practice",
    "fingering",
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
  stopMic();
  stopDemo();
  const modal = document.querySelector("#modal");
  const close = `<button class="dialog-close" data-action="close" aria-label="关闭">${icon("close")}</button>`;
  if (type === "settings") {
    modal.innerHTML = `${close}<span class="dialog-icon">${icon("music")}</span><h2 id="dialog-title">先认识你的竹笛</h2><p class="dialog-description">看看笛身上的字母，我们会匹配它的音高。</p><form id="settings-form"><label for="flute-key">竹笛调性</label><select name="key" id="flute-key">${Object.keys(
      KEYS,
    )
      .map(
        (key) =>
          `<option value="${key}" ${state.key === key ? "selected" : ""}>${key} 调竹笛</option>`,
      )
      .join(
        "",
      )}</select><p class="field-hint">常见竹笛刻有 C / D / E / F / G。找不到时，请先确认包装或询问老师；选错调性会影响判断。</p><label for="tolerance">练习宽容度</label><select name="tolerance" id="tolerance"><option value="50" ${state.tolerance === 50 ? "selected" : ""}>轻松起步 · ±50 音分</option><option value="35" ${state.tolerance === 35 ? "selected" : ""}>日常练习 · ±35 音分</option><option value="20" ${state.tolerance === 20 ? "selected" : ""}>更精确一点 · ±20 音分</option></select><details><summary>音高校准（通常不用改）</summary><label for="reference">标准 A4 频率（430–450 Hz）</label><input id="reference" name="reference" type="number" min="430" max="450" step="0.1" value="${state.reference}" required/><p class="field-hint">默认 440 Hz。仅在调音器或老师明确指定时调整。</p></details><div class="settings-note">${icon("help")} 当前使用「筒音作 5」指法：六孔全按是低音 5。调性不同，数字指法相同，实际音高不同。</div><button class="button button-primary" type="submit">保存，继续练习 ${icon("check")}</button></form>`;
  } else {
    modal.innerHTML = `${close}<span class="dialog-icon">${icon("leaf")}</span><h2 id="dialog-title">第一声，不用很用力。</h2><p class="dialog-description">先检查笛膜已正确贴好，再给自己一点耐心。</p><div class="help-steps"><div><b>01</b><span><strong>笛子横着，手指放松</strong><p>左手靠近吹孔，右手靠近笛尾。用指肚盖孔，不用指尖；图里吹孔在左。</p></span></div><div><b>02</b><span><strong>像轻轻吹一个瓶口</strong><p>把吹孔靠近下唇，嘴唇留细缝。气流掠过吹孔边缘，轻轻转动笛身找角度。</p></span></div><div><b>03</b><span><strong>先吹响，再吹稳</strong><p>先试全按的低音 5。没响就微调角度；响了再保持平稳气息。头晕时立即停下休息。</p></span></div></div><div class="settings-note">${icon("mic")} 麦克风能判断音高是否接近目标，不能检查持笛姿势、指法或音色。环境嘈杂时，请靠近一些再试。</div><button class="button button-primary" data-action="close">好，试试看 ${icon("arrow")}</button>`;
  }
  modal.showModal();
}


window.handleHoleToggle = handleHoleToggle;
window.listen = listen;
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
    const matched = noteForHoles(currentHoles, state.note.overblow);
    if (matched) {
      state.customHoles = null;
      state.note = matched;
      render();
      engine.tone(frequencyFor(matched, state.key, state.reference), 1.0);
      toast(`切换指法：${matched.low ? "低音 " : ""}${matched.number} (${matched.solfege}) · ${pitchNameFor(matched, state.key)} · ${Math.round(frequencyFor(matched, state.key, state.reference))} Hz`);
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
  if (["practice", "notation", "fingering"].includes(action)) navigate(action);
  else if (action === "settings" || action === "help") showDialog(action);
  else if (action === "close") document.querySelector("#modal").close();
  else if (action === "listen" || action === "blow-flute") listen();
  else if (action === "toggle-hole") {
    const holeIndex = Number(button.getAttribute("data-index") ?? button.dataset?.index);
    handleHoleToggle(holeIndex);
  }
  else if (action === "mic") startMic();
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
      name: `练习${note.low ? "低音 " : ""}${note.number}`,
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
    toast("合成音示范 · 每个音一拍，速度 60 BPM");
    playSequence(state.lesson.sequence, 1000, true);
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
  save();
  render();
  toast(`已切换为 ${state.key} 调竹笛，继续慢慢练。`);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMic();
    stopDemo();
  }
});
window.addEventListener("pagehide", () => {
  stopMic();
  stopDemo();
});
window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));
state.page = ["practice", "fingering", "notation", "songs", "history"].includes(
  location.hash.slice(1),
)
  ? location.hash.slice(1)
  : "practice";
render();

