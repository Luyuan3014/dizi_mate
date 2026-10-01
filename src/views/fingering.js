import {
  NOTES,
  frequencyFor,
  pitchNameFor,
  noteLabel,
  noteForHoles,
  LESSONS,
} from "../music.js";
import { icon } from "../components/icons.js";
import { hero, noteMarkup } from "../components/shared.js";
import { fluteDiagram, getFluteClickTarget, mountFlute, unmountFlute } from "../components/flute.js";

export function fingeringPage(state) {
  return `${hero(
    "先用手指认识竹笛",
    "六个音孔，<span>慢慢熟悉。</span>",
    "低音 5 到高音 6，共 16 个音。点击音符查看指法与气息。实心表示盖住，空心表示松开。",
  )}
    <section class="card explorer-card">
      <div class="explorer-notes">${NOTES.map(
        (note) =>
          `<button class="explorer-note ${state.note.id === note.id ? "active" : ""}" data-action="explore" data-note="${note.id}" aria-label="${noteLabel(note)} · ${note.solfege}" aria-pressed="${state.note.id === note.id}">${noteMarkup(note)}<small>${note.solfege}</small></button>`,
      ).join("")}</div>
      <div class="explorer-target">
        <div>
          <h2>${state.note.title}</h2>
          <p class="target-hz-badge">${state.note.low ? "低音 " : state.note.high ? "高音 " : "中音 "}${state.note.number} (${state.note.solfege}) · 音名 <strong>${pitchNameFor(state.note, state.key)}</strong> · 准确频率 <strong>${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz</strong></p>
        </div>
        <button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听参考音"}</span></button>
      </div>
      ${fluteDiagram(state.note, state)}
      <div class="breath-tip">${icon("leaf")}<p>${state.note.tip}</p></div>
      <div class="explorer-footer">
        <p>当前：${state.key} 调 · 筒音作 5。孔号从笛尾向吹孔数；低音 5 和中音 5 指法相同，气流不同。</p>
        <button class="button button-primary" data-action="practice-note">练练这个音 ${icon("arrow")}</button>
      </div>
    </section>
    <div class="inline-note">${icon("help")} 高音 4、5、6 展示常用叉口／泄孔指法；不同笛子的开孔与吹角可能需要微调。半孔音 4 也需要校准。先从低音 5、6、7 和中音 1 练起就很好。</div>`;
}

export class FingeringPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = fingeringPage(state);
    mountFlute(this.container);

    this.cacheElements();
    this.container.addEventListener("click", this.boundClickHandler);

    this.unsubscribe = this.context.store.subscribe((state, changedKeys) => {
      this.update(state, changedKeys);
    });
  }

  unmount() {
    unmountFlute(this.container);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  cacheElements() {
    if (!this.container) return;
    this.explorerTargetH2 = this.container.querySelector(".explorer-target h2");
    this.targetHzBadge = this.container.querySelector(".target-hz-badge");
    this.breathTipP = this.container.querySelector(".breath-tip p");
    this.listenButton = this.container.querySelector(".listen-button");
    this.explorerFooterP = this.container.querySelector(".explorer-footer p");
  }

  update(state, changedKeys) {
    if (
      changedKeys.has("note") ||
      changedKeys.has("customHoles") ||
      changedKeys.has("key") ||
      changedKeys.has("reference")
    ) {
      this.updateFingeringView(state);
    }
    if (changedKeys.has("demo")) {
      this.updateDemoUI(state);
    }
  }

  updateFingeringView(state) {
    if (!this.container) return;
    const note = state.note;

    // 1. Update active note button
    this.container.querySelectorAll(".explorer-note").forEach((btn) => {
      const isActive = btn.dataset.note === note.id;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    // 2. Update target header & badge
    if (this.explorerTargetH2) {
      this.explorerTargetH2.textContent = note.title;
    }
    if (this.targetHzBadge) {
      this.targetHzBadge.innerHTML = `${note.low ? "低音 " : note.high ? "高音 " : "中音 "}${note.number} (${note.solfege}) · 音名 <strong>${pitchNameFor(note, state.key)}</strong> · 准确频率 <strong>${Math.round(frequencyFor(note, state.key, state.reference))} Hz</strong>`;
    }

    // 3. Replace flute diagram
    const oldDiagram = this.container.querySelector(".flute-container, .flute-diagram");
    if (oldDiagram) {
      const temp = document.createElement("div");
      temp.innerHTML = fluteDiagram(note, state);
      const newDiagram = temp.firstElementChild;
      oldDiagram.replaceWith(newDiagram);
      mountFlute(this.container);
    }

    // 4. Update breath tip
    if (this.breathTipP) {
      this.breathTipP.textContent = note.tip;
    }

    // 5. Update footer text
    if (this.explorerFooterP) {
      this.explorerFooterP.textContent = `当前：${state.key} 调 · 筒音作 5。孔号从笛尾向吹孔数；低音 5 和中音 5 指法相同，气流不同。`;
    }
  }

  updateDemoUI(state) {
    if (!this.container) return;
    const demo = state.demo;
    if (this.listenButton) {
      this.listenButton.innerHTML = `${icon(demo ? "pause" : "volume")}<span>${demo ? "停止示范" : "听参考音"}</span>`;
    }
    const fluteDiag = this.container.querySelector(".flute-diagram");
    if (fluteDiag) fluteDiag.classList.toggle("flute-playing", demo);
  }

  onStopDemo() {
    this.updateDemoUI(this.context.store.getState());
  }

  handleHoleToggle(holeIndex) {
    if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= 6) return;
    this.context.audioService.stopDemo();
    const state = this.context.store.getState();
    const currentHoles = [...(state.customHoles || state.note.holes)];

    if (holeIndex === 0) {
      currentHoles[0] =
        currentHoles[0] === 1 ? 0.5 : currentHoles[0] === 0.5 ? 0 : 1;
    } else {
      currentHoles[holeIndex] = currentHoles[holeIndex] === 1 ? 0 : 1;
    }

    const matched = noteForHoles(
      currentHoles,
      state.note.overblow,
      state.note.high,
    );

    if (matched) {
      this.context.store.setState({
        customHoles: null,
        note: matched,
      });
      this.context.audioService.engine.stopTones();
      this.context.audioService.engine.tone(
        frequencyFor(matched, state.key, state.reference),
        1.5,
      );
      this.context.shell.toast(
        `切换指法：${noteLabel(matched)} (${matched.solfege}) · ${pitchNameFor(matched, state.key)} · ${Math.round(frequencyFor(matched, state.key, state.reference))} Hz`,
      );
    } else {
      this.context.store.setState({
        customHoles: currentHoles,
      });
      this.context.shell.toast("特殊按孔组合 · 点击上方音符可切回标准指法");
    }
  }

  handleClick(event) {
    const fluteTarget = getFluteClickTarget(event);
    if (fluteTarget) {
      if (fluteTarget.type === "blow") {
        this.context.audioService.listen();
        return;
      }
      if (fluteTarget.type === "hole") {
        this.handleHoleToggle(fluteTarget.index);
        return;
      }
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "explore") {
      this.context.audioService.stopDemo();
      this.context.audioService.engine.stopTones();
      const note = NOTES.find((n) => n.id === button.dataset.note) || NOTES[0];
      const state = this.context.store.getState();
      this.context.store.setState({
        customHoles: null,
        note,
      });
      this.context.audioService.engine.tone(
        frequencyFor(note, state.key, state.reference),
        1.5,
      );
    } else if (action === "practice-note") {
      const state = this.context.store.getState();
      const note = state.note;
      this.context.store.setState({
        passed: new Set(),
        lesson: {
          ...LESSONS[0],
          sequence: [note.id],
          name: `练习${noteLabel(note)}`,
          instruction: "看指法、听参考音，然后用平稳的气息试着吹。",
        },
        index: 0,
        customHoles: null,
      });
      this.context.router.navigate("practice");
    } else if (action === "listen" || action === "blow-flute") {
      this.context.audioService.listen();
    }
  }
}
