import { updateMicControls } from "../components/microphone.js";
import {
  NOTES,
  frequencyFor,
  nearestNote,
  centsBetween,
  describePitch,
  noteLabel,
  pitchNameFor,
} from "../music.js";
import { hero, noteMarkup, micControls, holeRow } from "../components/shared.js";
import { icon } from "../components/icons.js";

export function tunerPage(state) {
  const groups = [
    ["低音", NOTES.filter((note) => note.low)],
    ["中音", NOTES.filter((note) => !note.low && !note.high)],
    ["高音", NOTES.filter((note) => note.high)],
  ];
  return `${hero(
    "听见音高，也看见指法",
    "实时<span>调音器。</span>",
    `${state.key} 调 · 筒音作 5 · A4 = ${state.reference} Hz · 绿色范围 ±${state.tolerance} 音分`,
  )}
    <section class="card tuner-card">
      <div class="tuner-mode" role="group" aria-label="调音模式">
        <button class="filter-tab active" type="button" data-tuner-mode="free" aria-pressed="true">自由调音</button>
        <button class="filter-tab" type="button" data-tuner-mode="target" aria-pressed="false">目标音模式</button>
        <label class="tuner-target-select" hidden for="tuner-target-note">目标音<select id="tuner-target-note">${NOTES.map((n) => `<option value="${n.id}" ${n.id === "2" ? "selected" : ""}>${noteLabel(n)} · ${pitchNameFor(n, state.key)}</option>`).join("")}</select></label>
      </div>
      <div class="tuner-dial" id="tuner-dial"><span class="section-kicker">最近的简谱音符</span>
        <div id="tuner-note" class="tuner-note">—</div><strong id="tuner-name">等待声音</strong>
        <div class="tuner-readings"><span id="tuner-hz">— Hz</span><span id="tuner-delta">— Hz 偏差</span><span id="tuner-cents">— 音分</span></div>
        <div class="tuner-scale"><span class="pitch-safe-zone" style="left:${50 - state.tolerance / 2}%;width:${state.tolerance}%"></span><span class="pitch-center"></span><i id="tuner-needle" hidden></i></div>
        <div class="pitch-scale-labels"><span>−100 音分</span><span>准确</span><span>+100 音分</span></div>
        <p id="tuner-target">吹响后显示最近音符的目标频率</p>
      </div>
      <div class="tuner-notes">${groups.map(([label, notes]) => `<section class="tuner-note-group"><h3>${label}</h3><div>${notes.map((n) => `<span data-tuner-note="${n.id}">${noteMarkup(n)}</span>`).join("")}</div></section>`).join("")}</div>
      <div class="tuner-fingering" id="tuner-fingering"><p>识别到音符后，这里同步显示对应孔位和气息要领。</p></div>
      <div class="hole-legend"><span><i class="legend-hole closed"></i>盖住</span><span><i class="legend-hole"></i>打开</span><span><i class="legend-hole half"></i>半孔</span></div>
      ${micControls()}
    </section>`;
}

export class TunerPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.tunerNoteId = null;
    this.mode = "free";
    this.targetNoteId = "2";
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = tunerPage(state);

    this.cacheElements();
    this.updateMicUI();

    this.container.addEventListener("click", this.boundClickHandler);
    this.container.addEventListener("change", this.boundChangeHandler);

    this.unsubscribe = this.context.store.subscribe((state, changedKeys) => {
      this.update(state, changedKeys);
    });
  }

  unmount() {
    this.tunerNoteId = null;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.removeEventListener("change", this.boundChangeHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  cacheElements() {
    if (!this.container) return;
    this.needle = this.container.querySelector("#tuner-needle");
    this.dial = this.container.querySelector("#tuner-dial");
    this.tunerNote = this.container.querySelector("#tuner-note");
    this.tunerName = this.container.querySelector("#tuner-name");
    this.tunerHz = this.container.querySelector("#tuner-hz");
    this.tunerDelta = this.container.querySelector("#tuner-delta");
    this.tunerCents = this.container.querySelector("#tuner-cents");
    this.tunerTarget = this.container.querySelector("#tuner-target");
    this.tunerFingering = this.container.querySelector("#tuner-fingering");
    this.feedbackTitle = this.container.querySelector("#feedback-title");
    this.feedbackCopy = this.container.querySelector("#feedback-copy");
    this.micButton = this.container.querySelector("#mic-button");
    this.micState = this.container.querySelector("#mic-state");
  }

  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  setFeedback(title, copy) {
    this.setText(this.feedbackTitle, title);
    this.setText(this.feedbackCopy, copy);
  }

  setMode(mode) {
    this.mode = mode === "target" ? "target" : "free";
    this.container?.querySelectorAll("[data-tuner-mode]").forEach((button) => {
      const active = button.dataset.tunerMode === this.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const select = this.container?.querySelector(".tuner-target-select");
    if (select) select.hidden = this.mode !== "target";
    this.paint(null);
  }

  update(state, changedKeys) {
    if (changedKeys.has("micLevel") || changedKeys.has("micNoise")) updateMicControls(this.container, state, { statusChanged: false });
    if (changedKeys.has("mic") || changedKeys.has("micStatus")) {
      this.updateMicUI();
    }
    if (changedKeys.has("key") || changedKeys.has("reference")) {
      const select = this.container?.querySelector("#tuner-target-note");
      if (select) select.querySelectorAll("option").forEach((option) => {
        const note = NOTES.find((n) => n.id === option.value);
        option.textContent = `${noteLabel(note)} · ${pitchNameFor(note, state.key)}`;
      });
    }
    if (changedKeys.has("tolerance")) {
      const safeZone = this.container?.querySelector(".pitch-safe-zone");
      if (safeZone) {
        safeZone.style.left = `${50 - state.tolerance / 2}%`;
        safeZone.style.width = `${state.tolerance}%`;
      }
    }
  }

  updateMicUI() {
    if (!this.container) return;
    const state = this.context.store.getState();
    updateMicControls(this.container, state);
    if (state.mic !== "on") this.paint(null);
  }

  paint(frequency) {
    if (!this.needle) return;
    const state = this.context.store.getState();

    if (!frequency) {
      this.needle.hidden = true;
      this.tunerNoteId = null;
      this.container
        ?.querySelectorAll("[data-tuner-note]")
        .forEach((el) => el.classList.remove("active"));
      this.setText(this.tunerNote, "—");
      this.setText(this.tunerName, "等待声音");
      this.setText(this.tunerHz, "— Hz");
      this.setText(this.tunerDelta, "— Hz 偏差");
      this.setText(this.tunerCents, "— 音分");
      this.setText(this.tunerTarget, "吹响后显示最近音符的目标频率");
      this.setText(
        this.tunerFingering,
        "识别到音符后，这里同步显示对应孔位和气息要领。",
      );
      this.dial?.classList.remove("in-tune");
      return;
    }

    const note = nearestNote(frequency, state.key, state.reference);
    const targetNote = this.mode === "target" ? NOTES.find((n) => n.id === this.targetNoteId) || note : note;
    const target = frequencyFor(targetNote, state.key, state.reference);
    const cents = centsBetween(frequency, target);
    const signed = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;

    this.needle.hidden = false;

    this.container
      ?.querySelectorAll("[data-tuner-note]")
      .forEach((el) => el.classList.toggle("active", el.dataset.tunerNote === note.id));

    if (note.id !== this.tunerNoteId) {
      if (this.tunerNote) this.tunerNote.innerHTML = noteMarkup(note);
      if (this.tunerFingering) {
        this.tunerFingering.innerHTML = `<h3>${noteLabel(note)} · ${note.title}</h3>${holeRow(note)}<p>${note.tip}</p>`;
      }
      this.tunerNoteId = note.id;
      this.container?.querySelector(`[data-tuner-note="${note.id}"]`)?.scrollIntoView?.({ block: "nearest", inline: "center" });
    }

    this.setText(
      this.tunerName,
      `${noteLabel(note)} · ${pitchNameFor(note, state.key)}`,
    );
    this.setText(this.tunerHz, `${frequency.toFixed(1)} Hz`);
    this.setText(this.tunerDelta, `${signed(frequency - target)} Hz 偏差`);
    this.setText(this.tunerCents, `${signed(cents)} 音分`);
    this.setText(
      this.tunerTarget,
      `${this.mode === "target" ? `目标 ${noteLabel(targetNote)} · ` : "目标 "}${target.toFixed(1)} Hz${Math.abs(cents) > 100 ? " · 超出该音附近范围" : ""}`,
    );

    this.dial?.classList.toggle("in-tune", Math.abs(cents) <= state.tolerance);
    this.dial?.classList.toggle("pitch-low", cents < -state.tolerance);
    this.dial?.classList.toggle("pitch-high", cents > state.tolerance);
    this.needle.style.left = `${50 + Math.max(-49, Math.min(49, cents / 2))}%`;

    const feedback = describePitch(cents, state.tolerance);
    this.setFeedback(feedback.title, feedback.detail);
  }

  onAudioFrame({ frequency }) {
    this.paint(frequency);
  }

  onReferencePlaying() {
    this.paint(null);
    this.setFeedback(
      "先听一听，再试着吹",
      "播放参考音时暂停判断，避免把示范当成练习。",
    );
  }

  handleClick(event) {
    const button = event.target.closest("[data-action], [data-tuner-mode]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "mic") {
      this.context.audioService.startMic();
    } else if (button.dataset.tunerMode) {
      this.setMode(button.dataset.tunerMode);
    }
  }

  handleChange(event) {
    if (event.target.id === "mic-mode") {
      this.context.store.setState({ micMode: event.target.value === "compatible" ? "compatible" : "precise" });
    } else if (event.target.id === "tuner-target-note") {
      this.targetNoteId = event.target.value;
      this.paint(null);
    }
  }
}
