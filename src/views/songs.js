import { SONGS, NOTES } from "../music.js";
import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import {
  metronomeView,
  updateMetronomeUI,
  onMetronomeBeat,
  handleMetronomePresetClick,
  setMetronomeBpm,
} from "../components/metronome.js";

export function songsPage(state, activeSongId = "two-tigers") {
  const activeSong = SONGS.find((s) => s.id === activeSongId) || SONGS[0];

  return `${hero(
    "第一段旋律，从熟悉的开始",
    "小小曲谱，<span>大大开心。</span>",
    "不用一口气吹完整首，先把一句吹给自己听。全按作 5，初学无忧。",
    metronomeView(state),
  )}
    <section class="card song-card" id="featured-song-card">
      <div class="song-art">
        <span>♪</span>
        <i>♫</i>
        <small>${activeSong.id.toUpperCase().replace("-", " ")}</small>
      </div>
      <div class="song-content">
        <div class="song-tags-row">
          <span class="level-tag">${activeSong.tag}</span>
          <span class="song-difficulty-badge">难度 ${activeSong.difficulty}</span>
          <span class="song-meta-badge">建议 ${activeSong.bpm} BPM</span>
        </div>
        <h2>${activeSong.title}</h2>
        <p>${activeSong.subtitle} · ${activeSong.sequence.length} 拍 · 建议 ${activeSong.bpm} BPM · ${activeSong.duration}</p>
        <div class="song-preview" id="song-preview-container">${activeSong.sequence
          .map(
            (id, i) =>
              `<span data-song-beat="${i}"><ruby>${id}<rt>${activeSong.lyrics?.[i] || ""}</rt></ruby></span>`,
          )
          .join(" ")}</div>
        <p class="song-tip">💡 ${activeSong.tip}</p>
        <div class="song-actions-row">
          <button class="button button-outline" data-action="song-demo">${icon(state.demo ? "pause" : "play")} <span id="song-demo-label">${state.demo ? "停止示范" : "节拍器同步打拍示范"}</span></button>
          <button class="button button-outline" data-action="apply-bpm" data-bpm="${activeSong.bpm}">${icon("clock")} 应用建议速度 (${activeSong.bpm} BPM)</button>
          <button class="button button-primary" data-action="lesson" data-song-id="${activeSong.id}">开始这段练习 ${icon("arrow")}</button>
        </div>
      </div>
    </section>

    <section class="songs-shelf">
      <div class="shelf-header">
        <div>
          <h3>初学者曲谱选集</h3>
          <p>从简到难精选 6 首适合起步的经典短旋律，后续进阶曲目将持续添加。</p>
        </div>
        <span class="shelf-count">共 ${SONGS.length} 首</span>
      </div>
      <div class="songs-grid">
        ${SONGS.map(
          (song) => `
          <article class="card song-item-card ${song.id === activeSong.id ? "active" : ""}" data-song-id="${song.id}">
            <div class="song-item-top">
              <span class="level-tag">${song.tag}</span>
              <span class="song-difficulty">${song.difficulty}</span>
            </div>
            <h4>${song.title}</h4>
            <p class="song-item-sub">${song.subtitle}</p>
            <div class="song-item-preview">${song.sequence.slice(0, 8).join(" ")}${song.sequence.length > 8 ? " …" : ""}</div>
            <div class="song-item-meta">
              <span>${icon("clock")} ${song.bpm} BPM</span>
              <span>${song.sequence.length} 拍</span>
            </div>
            <div class="song-item-actions">
              <button class="button ${song.id === activeSong.id ? "button-primary" : "button-outline"}" data-action="select-song" data-song-id="${song.id}">
                ${song.id === activeSong.id ? "正在查看" : "切换这首"}
              </button>
            </div>
          </article>
        `,
        ).join("")}
      </div>
    </section>

    <div class="inline-note">${icon("leaf")} 好听的旋律不需要很多音。先把这一小段吹稳，再慢慢走远。</div>`;
}

export class SongsPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.activeSongId = "two-tigers";
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundInputHandler = this.handleInput.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
    this.boundToggleHandler = this.handleToggle.bind(this);
  }

  getActiveSong() {
    return SONGS.find((s) => s.id === this.activeSongId) || SONGS[0];
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = songsPage(state, this.activeSongId);

    this.cacheElements();
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
    this.metroSummary = this.container.querySelector("#metro-summary");
    this.metroToggle = this.container.querySelector("#metro-toggle");
    this.songDemoLabel = this.container.querySelector("#song-demo-label");
    this.songDemoButton = this.container.querySelector("[data-action='song-demo']");
    this.songBeats = this.container.querySelectorAll("[data-song-beat]");
  }

  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  update(state, changedKeys) {
    if (changedKeys.has("metronome")) {
      this.updateMetronomeUI();
    }
    if (changedKeys.has("demo")) {
      this.updateDemoUI(state);
    }
  }

  updateMetronomeUI() {
    if (!this.container) return;
    const m = this.context.store.getState().metronome;
    updateMetronomeUI(this.container, m);
  }

  updateDemoUI(state) {
    if (!this.container) return;
    const demo = state.demo && this.context.audioService.metronome.sequence;
    if (this.songDemoButton) {
      this.songDemoButton.innerHTML = `${icon(demo ? "pause" : "play")} <span id="song-demo-label">${demo ? "停止示范" : "节拍器同步打拍示范"}</span>`;
    }
    if (!state.demo) {
      this.songBeats?.forEach((el) => el.classList.remove("current"));
    }
  }

  onBeat(beat, index) {
    if (!this.container) return;
    const m = this.context.store.getState().metronome;
    onMetronomeBeat(this.container, beat, index, m.bpm);

    this.songBeats?.forEach((el) => {
      el.classList.toggle("current", Number(el.dataset.songBeat) === index);
    });
  }

  onStopDemo() {
    this.updateDemoUI(this.context.store.getState());
  }

  switchSong(songId) {
    if (songId === this.activeSongId) return;
    this.context.audioService.stopDemo();
    this.activeSongId = songId;
    const state = this.context.store.getState();
    this.container.innerHTML = songsPage(state, this.activeSongId);
    this.cacheElements();
    this.updateMetronomeUI();
  }

  handleClick(event) {
    if (handleMetronomePresetClick(event, this.context)) {
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "select-song") {
      this.switchSong(button.dataset.songId);
    } else if (action === "apply-bpm") {
      const bpm = Number(button.dataset.bpm);
      if (Number.isFinite(bpm)) {
        setMetronomeBpm(this.context, bpm);
        this.context.shell.toast(`节拍器已设置为推荐速度 ${bpm} BPM`);
      }
    } else if (action === "song-demo") {
      const song = this.getActiveSong();
      this.context.audioService.startMetronome(song.sequence);
    } else if (action === "lesson") {
      const songId = button.dataset.songId || this.activeSongId;
      const song = SONGS.find((s) => s.id === songId) || SONGS[0];
      const lesson = {
        id: song.id,
        name: song.title,
        subtitle: song.subtitle,
        sequence: song.sequence,
        lyrics: song.lyrics,
        instruction: song.tip,
        stage: "曲谱练习",
      };
      const note = NOTES.find((n) => n.id === song.sequence[0]);
      this.context.audioService.stopMic();
      this.context.audioService.stopDemo();
      this.context.store.setState({
        passed: new Set(),
        lesson,
        index: 0,
        note,
        customHoles: null,
      });
      this.context.router.navigate("practice");
    } else if (action === "metronome") {
      this.context.audioService.startMetronome();
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
