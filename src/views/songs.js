import { LESSONS, NOTES } from "../music.js";
import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { metronomeView } from "../components/metronome.js";

export function songsPage(state) {
  return `${hero(
    "第一段旋律，从熟悉的开始",
    "小小曲谱，<span>大大开心。</span>",
    "不用一口气吹完整首，先把一句吹给自己听。",
    metronomeView(state),
  )}
    <section class="card song-card">
      <div class="song-art"><span>♪</span><i>♪</i><small>FIRST MELODY</small></div>
      <div class="song-content">
        <span class="level-tag">入门 · 只用 3 个音</span>
        <h2>两只老虎</h2>
        <p>开头两句 · 8 拍 · 建议 60 BPM</p>
        <div class="song-preview">${LESSONS[2].sequence.map((id, i) => `<span data-song-beat="${i}">${id}</span>`).join(" ")}</div>
        <p>左手三孔盖住吹 1，再依次松开无名指、中指吹 2 和 3。</p>
        <button class="button button-outline" data-action="song-demo">${icon(state.demo ? "pause" : "play")} <span id="song-demo-label">${state.demo ? "停止示范" : "节拍器同步打拍示范"}</span></button>
        <button class="button button-primary" data-action="lesson" data-lesson="song">开始这段练习 ${icon("arrow")}</button>
      </div>
    </section>
    <div class="inline-note">${icon("leaf")} 好听的旋律不需要很多音。先把这一小段吹稳，再慢慢走远。</div>`;
}

export class SongsPage {
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
    this.container.innerHTML = songsPage(state);

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
    this.setText(
      this.metroSummary,
      `${m.bpm} BPM · ${m.beats}/4${m.running ? " · 运行中" : ""}`,
    );
    this.setText(this.metroToggle, m.running ? "停止" : "开始");
    if (!m.running) {
      this.container
        .querySelectorAll("#metro-dots i")
        .forEach((el) => el.classList.remove("active"));
    }
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
    this.container
      .querySelectorAll("#metro-dots i")
      .forEach((el, i) => el.classList.toggle("active", i === beat));

    this.songBeats?.forEach((el) => {
      el.classList.toggle("current", Number(el.dataset.songBeat) === index);
    });
  }

  onStopDemo() {
    this.updateDemoUI(this.context.store.getState());
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "song-demo") {
      this.context.audioService.startMetronome(LESSONS[2].sequence);
    } else if (action === "lesson") {
      const lesson = LESSONS[2];
      const note = NOTES.find((n) => n.id === lesson.sequence[0]);
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
