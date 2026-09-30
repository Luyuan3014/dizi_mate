import {
  NOTES,
  noteLabel,
  frequencyFor,
  pitchNameFor,
  centsBetween,
  describePitch,
} from "../music.js";
import { hero, holeRow, micControls } from "../components/shared.js";
import { LongToneChallenge } from "../practice.js";
import { icon } from "../components/icons.js";

export function longTonePage(state) {
  const note = state.longNote;
  return `${hero(
    "把一口气，吹得更平稳",
    "长音<span>练习专区。</span>",
    "保持音高在绿色带内，看看这一次，你能稳稳走多远。",
  )}
    <section class="card long-tone-card">
      <div class="long-tone-toolbar"><label for="long-note">练习音符 <select id="long-note">${NOTES.map((n) => `<option value="${n.id}" ${n.id === note.id ? "selected" : ""}>${noteLabel(n)} · ${pitchNameFor(n, state.key)}</option>`).join("")}</select></label>
        <span id="long-hz-span">${pitchNameFor(note, state.key)} · ${frequencyFor(note, state.key, state.reference).toFixed(1)} Hz · ±${state.tolerance} 音分</span>
      </div>
      <div id="long-hole-container">${holeRow(note)}</div><p class="long-tip" id="long-tip">${note.tip}</p>
      <div class="challenge-milestones">${[[3, "青铜"], [5, "白银"], [8, "黄金"]].map(([s, m]) => `<div data-medal="${s}"><b>${s}<small>秒</small></b><span>${m}</span></div>`).join("")}</div>
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
  const x = (s) => 58 + ((s.time - start) / 12) * 722;
  const pitchY = (s) =>
    90 - Math.max(-100, Math.min(100, s.cents)) * 0.62;
  const volumeY = (s) =>
    238 -
    Math.max(
      0,
      Math.min(60, 20 * Math.log10(Math.max(s.rms, 0.001)) + 60),
    );
  const path = (getY, valid) => {
    let connected = false;
    let last = null;
    return points
      .map((s) => {
        if (!valid(s)) {
          connected = false;
          return "";
        }
        if (last !== null && s.time - last > 0.25) connected = false;
        const command = connected ? "L" : "M";
        connected = true;
        last = s.time;
        return `${command}${x(s).toFixed(1)},${getY(s).toFixed(1)}`;
      })
      .join(" ");
  };
  return `<rect x="58" y="${90 - tolerance * 0.62}" width="722" height="${tolerance * 1.24}" rx="6" fill="#e1efd9"/>
    <g fill="#748168" font-size="12"><text x="0" y="31">+100¢</text><text x="8" y="94">0¢</text><text x="0" y="155">−100¢</text><text x="0" y="190">−10 dB</text><text x="0" y="239">−60 dB</text><text x="58" y="257">${start.toFixed(0)}s</text><text x="750" y="257">${end.toFixed(0)}s</text></g>
    <path d="M58,90 H780 M58,165 H780 M58,238 H780" stroke="#d4dccb" stroke-dasharray="4 4"/>
    <path d="${path(pitchY, (s) => s.cents !== null)}" fill="none" stroke="#527943" stroke-width="2.5"/>
    <path d="${path(volumeY, () => true)}" fill="none" stroke="#bb9353" stroke-width="2"/>`;
}

export function resultMarkup(result) {
  return `<span class="section-kicker">本次长音 · ${result.medal}</span><h2>${result.score}<small> / 100 分</small></h2>
    <p>最长连续绿区 <b>${result.best.toFixed(1)} 秒</b> · 本次时长 ${result.duration.toFixed(1)} 秒</p>
    <div class="result-metrics"><span>音准命中率 <b>${Math.round(result.accuracy * 100)}%</b></span><span>音高波动 <b>${result.pitchSpread.toFixed(1)} 音分</b></span><span>音量波动 <b>${result.volumeSpread.toFixed(1)} dB</b></span></div>
    <small>评分：音准 60% + 音高稳定 25% + 音量稳定 15%；波动越小越稳定。音量趋势受麦克风距离影响，练习时尽量保持位置不变。</small>`;
}

export class LongTonePage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = longTonePage(state);

    this.cacheElements();
    this.updateMicUI();
    this.paint();

    this.container.addEventListener("click", this.boundClickHandler);
    this.container.addEventListener("change", this.boundChangeHandler);

    this.unsubscribe = this.context.store.subscribe((state, changedKeys) => {
      this.update(state, changedKeys);
    });
  }

  unmount() {
    this.finish();
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
    this.chart = this.container.querySelector("#breath-chart");
    this.holdSeconds = this.container.querySelector("#hold-seconds");
    this.holdProgress = this.container.querySelector("#hold-progress");
    this.holdStatus = this.container.querySelector("#hold-status");
    this.longStartBtn = this.container.querySelector("#long-start");
    this.longFinishBtn = this.container.querySelector("#long-finish");
    this.longResult = this.container.querySelector("#long-result");
    this.feedbackTitle = this.container.querySelector("#feedback-title");
    this.feedbackCopy = this.container.querySelector("#feedback-copy");
    this.micButton = this.container.querySelector("#mic-button");
    this.micState = this.container.querySelector("#mic-state");
    this.longHzSpan = this.container.querySelector("#long-hz-span");
    this.longHoleContainer = this.container.querySelector("#long-hole-container");
    this.longTip = this.container.querySelector("#long-tip");
  }

  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  setFeedback(title, copy) {
    this.setText(this.feedbackTitle, title);
    this.setText(this.feedbackCopy, copy);
  }

  update(state, changedKeys) {
    if (changedKeys.has("mic")) {
      this.updateMicUI();
    }
    if (
      changedKeys.has("longNote") ||
      changedKeys.has("key") ||
      changedKeys.has("reference") ||
      changedKeys.has("tolerance")
    ) {
      this.updateNoteDetails(state);
    }
  }

  updateMicUI() {
    if (!this.container) return;
    const state = this.context.store.getState();
    const active = state.mic === "on";
    const requesting = state.mic === "requesting";

    if (this.micButton) {
      this.micButton.innerHTML = `${icon(active || requesting ? "pause" : "mic")} ${active ? "暂停陪练，歇一会儿" : requesting ? "等待授权 · 点击可取消" : "开启麦克风，试着吹"}`;
    }
    if (this.micState) {
      this.micState.innerHTML = `<i></i>${active ? "正在聆听" : requesting ? "等待授权" : "等待开启"}`;
      this.micState.classList.toggle("connected", active);
    }
  }

  updateNoteDetails(state) {
    const note = state.longNote;
    if (this.longHzSpan) {
      this.longHzSpan.textContent = `${pitchNameFor(note, state.key)} · ${frequencyFor(note, state.key, state.reference).toFixed(1)} Hz · ±${state.tolerance} 音分`;
    }
    if (this.longHoleContainer) {
      this.longHoleContainer.innerHTML = holeRow(note);
    }
    if (this.longTip) {
      this.longTip.textContent = note.tip;
    }
  }

  paint() {
    if (!this.chart) return;
    const state = this.context.store.getState();
    const challenge = state.challenge;

    this.chart.innerHTML = renderBreathChart(challenge, state.tolerance);
    if (this.holdSeconds) {
      this.holdSeconds.innerHTML = `${(challenge?.streak || 0).toFixed(1)}<small>秒</small>`;
    }
    if (this.holdProgress) {
      this.holdProgress.style.width = `${Math.min(100, ((challenge?.streak || 0) / 8) * 100)}%`;
    }

    this.container?.querySelectorAll("[data-medal]").forEach((el) => {
      el.classList.toggle(
        "achieved",
        (challenge?.best || 0) >= Number(el.dataset.medal),
      );
    });

    this.setText(
      this.holdStatus,
      challenge?.status === "finished"
        ? `本次完成 · ${challenge.result.medal}`
        : state.longArmed
          ? challenge?.status === "running"
            ? `最长连续 ${challenge.best.toFixed(1)} 秒 · 保持在绿色带内`
            : "已就绪，吹响后自动计时"
          : "点击开始挑战，吹响后自动计时",
    );

    this.setText(
      this.longStartBtn,
      state.longArmed
        ? "重新开始"
        : challenge?.result
          ? "再挑战一次"
          : "开始挑战",
    );

    if (this.longFinishBtn) {
      this.longFinishBtn.disabled = !state.longArmed;
    }

    if (this.longResult) {
      this.longResult.hidden = !challenge?.result;
      if (challenge?.result) {
        this.longResult.innerHTML = resultMarkup(challenge.result);
      }
    }
  }

  async start() {
    this.context.audioService.stopDemo();
    const state = this.context.store.getState();
    const challenge = new LongToneChallenge(state.tolerance);
    this.context.audioService.engine.smoother.reset();

    this.context.store.setState({
      challenge,
      longArmed: true,
    });
    this.paint();

    if (state.mic === "off") {
      await this.context.audioService.startMic();
    }
  }

  finish() {
    const state = this.context.store.getState();
    if (!state.longArmed) return;

    state.challenge?.finish();
    if (state.challenge?.best >= 3) {
      state.sessionNotes.add(state.longNote.id);
    }

    this.context.store.setState({ longArmed: false });
    this.paint();

    if (state.challenge?.result) {
      this.setFeedback("本次挑战已完成", "看看本次成绩，休息一下再挑战。");
    }
  }

  onFinishLongTone() {
    this.finish();
  }

  onAudioFrame({ frequency, rms }) {
    const state = this.context.store.getState();
    if (!state.longArmed || !state.challenge) return;

    const now = performance.now();
    const cents = frequency
      ? centsBetween(
          frequency,
          frequencyFor(state.longNote, state.key, state.reference),
        )
      : null;

    state.challenge.update(now, cents, rms);

    const feedback = frequency
      ? describePitch(cents, state.tolerance)
      : null;

    this.setFeedback(
      feedback?.title || "轻轻吹，我在听",
      feedback?.detail || "吹响后自动计时，尽量保持在绿色音准带内。",
    );

    if (state.challenge.status === "finished") {
      this.context.store.setState({ longArmed: false });
      if (state.challenge.best >= 3) {
        state.sessionNotes.add(state.longNote.id);
      }
      this.setFeedback("本次挑战已完成", "看看本次成绩，休息一下再挑战。");
    }
    this.paint();
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "long-start") {
      this.start();
    } else if (action === "long-finish") {
      this.finish();
    } else if (action === "mic") {
      this.context.audioService.startMic();
    }
  }

  handleChange(event) {
    if (event.target.id === "long-note") {
      this.finish();
      const note =
        NOTES.find((n) => n.id === event.target.value) || NOTES[0];
      this.context.audioService.engine.smoother.reset();
      this.context.store.setState({
        longNote: note,
        challenge: null,
      });
      this.paint();
    }
  }
}
