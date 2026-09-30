import { icon } from "./icons.js";

export const METRO_PRESETS = [
  { bpm: 50, label: "50 慢板" },
  { bpm: 60, label: "60 原速" },
  { bpm: 72, label: "72 舒缓" },
  { bpm: 90, label: "90 中速" },
  { bpm: 120, label: "120 快板" },
];

export function metronomeView(state) {
  const metro = state.metronome;
  const weightBottom = (18 + ((180 - metro.bpm) / 140) * 50).toFixed(1);

  return `<details class="metronome" id="metronome" ${metro.open ? "open" : ""}>
    <summary>${icon("clock")} 节拍器 <span id="metro-summary">${metro.bpm} BPM · ${metro.beats}/4${metro.running ? " · 运行中" : ""}</span></summary>
    <div class="metro-panel">
      <div class="metro-visual" aria-hidden="true">
        <div class="metro-dial">
          <div class="metro-arc-track"></div>
          <div class="metro-arc-scale">
            <span class="scale-tick">40</span>
            <span class="scale-tick">60</span>
            <span class="scale-tick tick-center">·</span>
            <span class="scale-tick">90</span>
            <span class="scale-tick">180</span>
          </div>
          <div class="metro-pendulum-arm" id="metro-needle">
            <div class="metro-needle-tip"></div>
            <div class="metro-weight" id="metro-weight" style="bottom: ${weightBottom}%"></div>
          </div>
          <div class="metro-pivot" id="metro-pivot"></div>
        </div>
      </div>

      <div class="metro-presets">
        <span class="presets-caption">常用速度:</span>
        <div class="preset-chips">
          ${METRO_PRESETS.map(
            (p) =>
              `<button type="button" class="preset-chip ${p.bpm === metro.bpm ? "active" : ""}" data-action="metro-preset" data-bpm="${p.bpm}">${p.label}</button>`,
          ).join("")}
        </div>
      </div>

      <div class="metro-controls">
        <label>速度 <input id="metro-bpm" type="number" min="40" max="180" step="1" value="${metro.bpm}" aria-label="节拍器速度 BPM"> <span>BPM</span></label>
        <label>拍号 <select id="metro-beats" aria-label="节拍器拍号">${[2, 3, 4]
          .map(
            (b) =>
              `<option value="${b}" ${b === metro.beats ? "selected" : ""}>${b}/4</option>`,
          )
          .join("")}</select></label>
        <button class="button button-outline metro-toggle-btn ${metro.running ? "is-running" : ""}" data-action="metronome" id="metro-toggle">${metro.running ? "停止" : "开始"}</button>
      </div>

      <div class="metro-beats" id="metro-dots" aria-label="当前节拍">
        ${Array.from(
          { length: metro.beats },
          (_, b) => `<i class="${b === 0 ? "accent" : ""}">${b + 1}</i>`,
        ).join("")}
      </div>
      <p>40–180 BPM · 第一拍重音 · 左右摆动指针</p>
    </div>
  </details>`;
}

export function updateMetronomeUI(container, metro) {
  if (!container) return;
  const summary = container.querySelector("#metro-summary");
  if (summary) {
    const text = `${metro.bpm} BPM · ${metro.beats}/4${metro.running ? " · 运行中" : ""}`;
    if (summary.textContent !== text) summary.textContent = text;
  }

  const toggle = container.querySelector("#metro-toggle");
  if (toggle) {
    const text = metro.running ? "停止" : "开始";
    if (toggle.textContent !== text) toggle.textContent = text;
    toggle.classList.toggle("is-running", !!metro.running);
  }

  const bpmInput = container.querySelector("#metro-bpm");
  if (bpmInput && document.activeElement !== bpmInput) {
    bpmInput.value = metro.bpm;
  }

  const beatsSelect = container.querySelector("#metro-beats");
  if (beatsSelect && document.activeElement !== beatsSelect) {
    beatsSelect.value = metro.beats;
  }

  container.querySelectorAll(".preset-chip").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.bpm) === metro.bpm);
  });

  const weight = container.querySelector("#metro-weight");
  if (weight) {
    weight.style.bottom = `${(18 + ((180 - metro.bpm) / 140) * 50).toFixed(1)}%`;
  }

  const needle = container.querySelector("#metro-needle");
  if (needle && !metro.running) {
    needle.style.transition = "transform 0.35s ease-out";
    needle.style.transform = "rotate(0deg)";
  }

  if (!metro.running) {
    container
      .querySelectorAll("#metro-dots i")
      .forEach((el) => el.classList.remove("active"));
  }
}

export function onMetronomeBeat(container, beat, index, bpm = 60) {
  if (!container) return;

  container
    .querySelectorAll("#metro-dots i")
    .forEach((el, i) => el.classList.toggle("active", i === beat));

  const needle = container.querySelector("#metro-needle");
  if (needle) {
    const angle = index % 2 === 0 ? -18 : 18;
    const duration = Math.max(0.2, (60 / bpm) * 0.94);
    needle.style.transition = `transform ${duration.toFixed(3)}s cubic-bezier(0.4, 0, 0.2, 1)`;
    needle.style.transform = `rotate(${angle}deg)`;
  }

  const pivot = container.querySelector("#metro-pivot");
  if (pivot) {
    pivot.classList.remove("pulse-accent");
    if (beat === 0) {
      void pivot.offsetWidth;
      pivot.classList.add("pulse-accent");
    }
  }
}

export function setMetronomeBpm(context, bpm) {
  const value = Math.max(40, Math.min(180, Math.round(bpm)));
  const m = context.store.getState().metronome;
  if (value === m.bpm) return;

  const wasRunning = context.audioService.metronome.running;
  const sequence = context.audioService.metronome.sequence;

  context.audioService.stopDemo();
  context.audioService.stopMetronome();
  context.store.setState({
    metronome: { ...m, bpm: value },
  });

  if (wasRunning) {
    context.audioService.startMetronome(sequence);
  }
}

export function handleMetronomePresetClick(event, context) {
  const button = event.target.closest("[data-action='metro-preset']");
  if (!button) return false;
  const bpm = Number(button.dataset.bpm);
  if (Number.isFinite(bpm)) {
    setMetronomeBpm(context, bpm);
    return true;
  }
  return false;
}
