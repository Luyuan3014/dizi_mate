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
    <section class="card silent-drill-card" aria-label="静音指法操与手感自查">
      <div class="silent-drill-header">
        <div>
          <span class="section-kicker"><span class="tiny-dot"></span> 零基础专项 · 肌肉触感</span>
          <h2>静音指法操：触感与闭孔自查</h2>
          <p>不吹气、无杂音干扰。双手横握竹笛，专注手指在音孔上的平稳起落，单独建立指腹密闭手感。</p>
        </div>
        <button class="button button-outline" data-action="toggle-drill-metro">
          ${icon("clock")} <span id="drill-metro-label">开启节拍静音动指</span>
        </button>
      </div>

      <div class="drill-routines-grid">
        <div class="drill-routine-item">
          <div class="routine-title">
            <strong>1. 基础三音起落操</strong>
            <small>左手 3 ➔ 2 ➔ 1 依次下落</small>
          </div>
          <p>从只按第 6 孔的 3，依次落下中指(2)与无名指(1)。体会指节自然弧度与无声起落。</p>
          <div class="routine-actions">
            <button class="button ${state.note.id === "3" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="3">按 3</button>
            <button class="button ${state.note.id === "2" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="2">按 2</button>
            <button class="button ${state.note.id === "1" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="1">按 1</button>
          </div>
        </div>

        <div class="drill-routine-item">
          <div class="routine-title">
            <strong>2. 左右手交接操</strong>
            <small>左手 1 ➔ 右手低音 7</small>
          </div>
          <p>左手三孔盖严，落下右手食指（盖第 3 孔）。初学最易在此漏气，注意右手手指不可翘起紧绷。</p>
          <div class="routine-actions">
            <button class="button ${state.note.id === "1" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="1">中音 1</button>
            <button class="button ${state.note.id === "low7" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="low7">低音 7</button>
          </div>
        </div>

        <div class="drill-routine-item">
          <div class="routine-title">
            <strong>3. 六孔全按耐力操</strong>
            <small>六孔全盖严 · 攻克全按低音 5</small>
          </div>
          <p>双手六指同时平贴孔面，适度施压 3 秒后抬起看印痕。找到最舒适自然的持笛手型。</p>
          <div class="routine-actions">
            <button class="button ${state.note.id === "low5" ? "button-primary" : "button-outline"} mini-cta" data-action="drill-note" data-note="low5">全按低音 5</button>
          </div>
        </div>
      </div>

      <div class="seal-check-guide">
        <div class="seal-check-title">${icon("shield")} <strong>指腹盖严自检 3 要诀</strong></div>
        <div class="seal-check-steps">
          <div>
            <b>01</b>
            <span><strong>肉厚处平盖</strong><p>用手指第一节肉最饱满的地方平平盖住音孔，绝不要用指尖抠孔或指关节硬骨压孔。</p></span>
          </div>
          <div>
            <b>02</b>
            <span><strong>压痕排查法</strong><p>适度按紧 3 秒后抬起手指对着光线看指腹：若留下完整封闭的圆印说明密闭极佳；若有缺口说明有缝隙漏气。</p></span>
          </div>
          <div>
            <b>03</b>
            <span><strong>手指放松呈拱形</strong><p>手腕下沉，虎口放松，手指像轻握一颗鸡蛋自然微曲。按孔不可僵硬死抠，以触感密闭为准。</p></span>
          </div>
        </div>
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
    if (changedKeys.has("metronome")) {
      const running = state.metronome.running;
      const label = this.container?.querySelector("#drill-metro-label");
      if (label) label.textContent = running ? "停止节拍器" : "开启节拍静音动指";
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

    // 6. Update drill buttons active state
    this.container.querySelectorAll("[data-action='drill-note']").forEach((btn) => {
      const isActive = btn.dataset.note === note.id;
      btn.classList.toggle("button-primary", isActive);
      btn.classList.toggle("button-outline", !isActive);
    });
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
    } else if (action === "drill-note") {
      const noteId = button.dataset.note;
      const note = NOTES.find((n) => n.id === noteId);
      if (note) {
        this.context.audioService.stopDemo();
        this.context.audioService.engine.stopTones();
        const state = this.context.store.getState();
        this.context.store.setState({ customHoles: null, note });
        this.context.audioService.engine.tone(frequencyFor(note, state.key, state.reference), 0.8);
        this.context.shell.toast(`静音指法对照：${noteLabel(note)} · ${note.title}`);
      }
    } else if (action === "toggle-drill-metro") {
      this.context.audioService.startMetronome();
      const running = this.context.audioService.metronome.running;
      const label = this.container?.querySelector("#drill-metro-label");
      if (label) label.textContent = running ? "停止节拍器" : "开启节拍静音动指";
      this.context.shell.toast(running ? "节拍器已开启，请跟着滴答声静音练习手指抬落！" : "节拍器已停止");
    }
  }
}
