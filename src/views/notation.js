import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { LESSONS, SONGS, NOTES, frequencyFor, noteLabel, pitchNameFor } from "../music.js";

export const notationLessons = [
  {
    category: "basics",
    label: "数字就是音",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="2">2</span> <span class="interactive-note" data-note="3">3</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="6">6</span>`,
    title: "像念名字一样认识音符",
    content: "简谱用 1 到 7 代表音高。竹笛入门最常用的五声是 1(do)、2(re)、3(mi)、5(sol)、6(la)，数字越高声音越清脆。点击任意音符可即时试听。",
    sequence: ["1", "2", "3", "5", "6"],
    durationMs: 700,
  },
  {
    category: "basics",
    label: "小点改变高低",
    symbol: `<span class="interactive-note notation low-note" data-note="low5">5<span class="note-dot"></span></span> <span class="arrow-sym">→</span> <span class="interactive-note notation" data-note="5">5</span> <span class="arrow-sym">→</span> <span class="interactive-note notation high-note" data-note="high1">1<span class="note-dot"></span></span>`,
    title: "上下小点，区分八度音区",
    content: "数字下方有小圆点表示低音（气流平缓宽厚），没有点是中音，上方有小圆点表示高音（收小气口、急吹超吹）。",
    sequence: ["low5", "5", "high1"],
    durationMs: 800,
  },
  {
    category: "basics",
    label: "笛子五声音阶",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="2">2</span> <span class="interactive-note" data-note="3">3</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="6">6</span> <span class="interactive-note notation high-note" data-note="high1">1<span class="note-dot"></span></span>`,
    title: "宫商角徵羽，国乐风骨",
    content: "竹笛全按作 5 时，1 2 3 5 6 无需半孔即可顺畅吹响，是绝大部分中国传统笛曲最纯正的骨架音调。",
    sequence: ["1", "2", "3", "5", "6", "high1"],
    durationMs: 650,
  },
  {
    category: "rhythm",
    label: "一拍有多长",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="dash-sym">－</span> <span class="interactive-note" data-note="2">2</span> <span class="dash-sym">－</span>`,
    title: "跟着心里的“哒、哒”",
    content: "一个独立数字唱一拍；后面每多一条短横线（增时线），就延长一拍。“1 －”就是连吹两拍，中间气息保持均匀平稳，不用重新吐气。",
    sequence: ["1", "1", "2", "2"],
    durationMs: 750,
  },
  {
    category: "rhythm",
    label: "空一拍也很好",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="rest-sym">0</span> <span class="interactive-note" data-note="2">2</span> <span class="rest-sym">0</span>`,
    title: "遇见 0，让声音休息",
    content: "0 是休止符。遇见 0 停一拍，收住气息保持安静。在音乐里懂得留白和呼吸，吹出的笛声才会生动而有灵气。",
    sequence: ["1", null, "2", null],
    durationMs: 750,
  },
  {
    category: "rhythm",
    label: "半拍减时线",
    symbol: `<span class="note-pair"><span class="interactive-note sub-beat" data-note="1">1̲</span><span class="interactive-note sub-beat" data-note="2">2̲</span></span> <span class="interactive-note" data-note="3">3</span> <span class="dash-sym">－</span>`,
    title: "下方短线，速度加快一倍",
    content: "数字下方的短横线是减时线。单条短横线表示半拍，两个半拍连起来唱一拍，节奏轻快跳跃，赋予旋律活泼律动。",
    sequence: ["1", "2", "3", "3"],
    durationMs: 600,
  },
  {
    category: "phrases",
    label: "启蒙短句 · 两只老虎",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="2">2</span> <span class="interactive-note" data-note="3">3</span> <span class="interactive-note" data-note="1">1</span> <span class="bar-line">|</span> <span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="2">2</span> <span class="interactive-note" data-note="3">3</span> <span class="interactive-note" data-note="1">1</span>`,
    title: "你的第一段 8 拍旋律",
    content: "“两只老虎，两只老虎”。仅用 1、2、3 三个音，每拍吹一个音，手指依次抬起，最轻松稳妥的启蒙练习。",
    sequence: ["1", "2", "3", "1", "1", "2", "3", "1"],
    songId: "two-tigers",
    durationMs: 600,
  },
  {
    category: "phrases",
    label: "经典童谣 · 闪烁的小星",
    symbol: `<span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="1">1</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="5">5</span> <span class="bar-line">|</span> <span class="interactive-note" data-note="6">6</span> <span class="interactive-note" data-note="6">6</span> <span class="interactive-note" data-note="5">5</span> <span class="dash-sym">－</span>`,
    title: "一闪一闪亮晶晶",
    content: "从 1 跳到 5 再到 6，练习左手开孔与全按高急吹的转换，音阶跨度适中，旋律清新自然。",
    sequence: ["1", "1", "5", "5", "6", "6", "5", "5"],
    songId: "twinkle-star",
    durationMs: 650,
  },
  {
    category: "phrases",
    label: "国风名句 · 沧海一声笑",
    symbol: `<span class="interactive-note" data-note="6">6</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="3">3</span> <span class="interactive-note" data-note="2">2</span> <span class="bar-line">|</span> <span class="interactive-note" data-note="1">1</span> <span class="dash-sym">－</span> <span class="dash-sym">－</span> <span class="dash-sym">－</span>`,
    title: "五声自然下行起手式",
    content: "羽、徵、角、商、宫五音由高向低缓缓舒展。气流平稳饱满，纯正中国竹笛韵味，深受初学者喜爱。",
    sequence: ["6", "5", "3", "2", "1", "1", "1", "1"],
    songId: "canghai",
    durationMs: 700,
  },
  {
    category: "phrases",
    label: "欢快小调 · 找朋友",
    symbol: `<span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="6">6</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="6">6</span> <span class="bar-line">|</span> <span class="interactive-note" data-note="5">5</span> <span class="interactive-note" data-note="6">6</span> <span class="interactive-note" data-note="1">1</span> <span class="dash-sym">－</span>`,
    title: "手指灵巧弹性练习",
    content: "在中音 5、6 与 1 之间跳跃，吐气轻巧有弹性，锻炼手指相邻与跨孔动作的顺畅度。",
    sequence: ["5", "6", "5", "6", "5", "6", "1", "1"],
    songId: "find-friends",
    durationMs: 550,
  },
];

export function notationPage(state, currentFilter = "all") {
  const filteredLessons =
    currentFilter === "all"
      ? notationLessons
      : notationLessons.filter((item) => item.category === currentFilter);

  const counts = {
    all: notationLessons.length,
    basics: notationLessons.filter((l) => l.category === "basics").length,
    rhythm: notationLessons.filter((l) => l.category === "rhythm").length,
    phrases: notationLessons.filter((l) => l.category === "phrases").length,
  };

  return `${hero(
    "不背乐理，也能轻松开始",
    "简谱入门，<span>其实很好懂。</span>",
    "先认识音符符号，再试读几句简单旋律。点击音符直接试听，跟随动效看懂乐谱。",
  )}
    <div class="notation-nav-bar">
      <div class="notation-filter-tabs" role="tablist" aria-label="简谱分类">
        <button class="filter-tab ${currentFilter === "all" ? "active" : ""}" data-action="filter" data-filter="all" role="tab" aria-selected="${currentFilter === "all"}">
          全部 <span class="filter-badge">${counts.all}</span>
        </button>
        <button class="filter-tab ${currentFilter === "basics" ? "active" : ""}" data-action="filter" data-filter="basics" role="tab" aria-selected="${currentFilter === "basics"}">
          基础符号 <span class="filter-badge">${counts.basics}</span>
        </button>
        <button class="filter-tab ${currentFilter === "rhythm" ? "active" : ""}" data-action="filter" data-filter="rhythm" role="tab" aria-selected="${currentFilter === "rhythm"}">
          时值节奏 <span class="filter-badge">${counts.rhythm}</span>
        </button>
        <button class="filter-tab ${currentFilter === "phrases" ? "active" : ""}" data-action="filter" data-filter="phrases" role="tab" aria-selected="${currentFilter === "phrases"}">
          入门短句谱 <span class="filter-badge">${counts.phrases}</span>
        </button>
      </div>
      <div class="notation-hint">${icon("sparkle")} 点击谱中任意音符可单独试听</div>
    </div>

    <div class="notation-grid">
      ${filteredLessons
        .map((item) => {
          const originalIndex = notationLessons.indexOf(item);
          return `<article class="card notation-card" data-card-index="${originalIndex}">
            <div class="notation-card-header">
              <span class="section-kicker">0${originalIndex + 1} / ${item.label}</span>
              <span class="playing-indicator" aria-hidden="true"><span></span><span></span><span></span></span>
            </div>
            <div class="notation-example" aria-label="${item.label} 示例">${item.symbol}</div>
            <h2>${item.title}</h2>
            <p>${item.content}</p>
            <div class="notation-card-actions">
              <button class="button-link" data-action="notation-demo" data-demo="${originalIndex}">
                ${icon("volume")} 听听这个例子 ${icon("arrow")}
              </button>
              ${
                item.songId
                  ? `<button class="button button-outline mini-cta" data-action="practice-song" data-song-id="${item.songId}">
                      去吹这段 ${icon("arrow")}
                    </button>`
                  : ""
              }
            </div>
          </article>`;
        })
        .join("")}
    </div>

    <div class="notation-cta">
      <div>
        <h2>看懂一点，就试着吹一小句。</h2>
        <p>从最简单的《两只老虎》或《闪烁的小星》开始，零基础也能享受笛音乐趣。</p>
      </div>
      <button class="button button-primary" data-action="lesson" data-lesson="song">去吹一段旋律 ${icon("arrow")}</button>
    </div>`;
}

export class NotationPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.currentFilter = "all";
    this.playingCardIndex = null;
    this.demoTimer = null;
    this.demoGeneration = 0;
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = notationPage(state, this.currentFilter);
    this.container.addEventListener("click", this.boundClickHandler);
  }

  unmount() {
    this.stopNotationDemo();
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  update() {
    // Keep filter selection consistent if state updates
  }

  stopNotationDemo() {
    this.demoGeneration++;
    clearTimeout(this.demoTimer);
    if (this.playingCardIndex !== null && this.container) {
      const card = this.container.querySelector(
        `[data-card-index="${this.playingCardIndex}"]`,
      );
      if (card) {
        card.classList.remove("is-playing");
        const playBtn = card.querySelector("[data-action='notation-demo']");
        if (playBtn) {
          playBtn.innerHTML = `${icon("volume")} 听听这个例子 ${icon("arrow")}`;
        }
        card
          .querySelectorAll(".interactive-note")
          .forEach((el) => el.classList.remove("current-playing"));
      }
    }
    this.playingCardIndex = null;
    this.context.audioService.engine.stopTones();
  }

  playNotationDemo(cardIndex) {
    const item = notationLessons[cardIndex];
    if (!item) return;

    if (this.playingCardIndex === cardIndex) {
      this.stopNotationDemo();
      return;
    }
    this.stopNotationDemo();

    const card = this.container?.querySelector(
      `[data-card-index="${cardIndex}"]`,
    );
    if (!card) return;

    this.playingCardIndex = cardIndex;
    card.classList.add("is-playing");
    const playBtn = card.querySelector("[data-action='notation-demo']");
    if (playBtn) {
      playBtn.innerHTML = `${icon("pause")} 停止示范`;
    }

    const notes = card.querySelectorAll(".interactive-note");
    const state = this.context.store.getState();
    const interval = item.durationMs || 650;
    const generation = ++this.demoGeneration;

    let step = 0;
    const playNext = async () => {
      if (generation !== this.demoGeneration) return;
      if (step >= item.sequence.length) {
        this.stopNotationDemo();
        this.context.shell.toast("听完了，换你试试看。");
        return;
      }

      notes.forEach((el, i) =>
        el.classList.toggle("current-playing", i === step),
      );

      const noteId = item.sequence[step++];
      if (noteId) {
        const note = NOTES.find((n) => n.id === noteId);
        if (note) {
          try {
            await this.context.audioService.engine.tone(
              frequencyFor(note, state.key, state.reference),
              (interval / 1000) * 0.85,
            );
          } catch (e) {}
        }
      }

      if (generation !== this.demoGeneration) return;
      this.demoTimer = setTimeout(playNext, interval);
    };

    this.context.shell.toast(`正在播放「${item.label}」示范参考音`);
    playNext();
  }

  handleClick(event) {
    // 1. Check if an interactive note was clicked
    const noteEl = event.target.closest(".interactive-note");
    if (noteEl && noteEl.dataset.note) {
      const noteId = noteEl.dataset.note;
      const note = NOTES.find((n) => n.id === noteId);
      if (note) {
        const state = this.context.store.getState();
        this.context.audioService.engine.tone(
          frequencyFor(note, state.key, state.reference),
          0.6,
        );
        noteEl.classList.remove("note-tapped");
        void noteEl.offsetWidth;
        noteEl.classList.add("note-tapped");
        this.context.shell.toast(
          `试听：${noteLabel(note)} (${pitchNameFor(note, state.key)}) · ${Math.round(frequencyFor(note, state.key, state.reference))} Hz`,
        );
        return;
      }
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "filter") {
      const filter = button.dataset.filter;
      if (filter && filter !== this.currentFilter) {
        this.stopNotationDemo();
        this.currentFilter = filter;
        const state = this.context.store.getState();
        this.container.innerHTML = notationPage(state, this.currentFilter);
      }
    } else if (action === "notation-demo") {
      const demoIndex = Number(button.dataset.demo);
      this.playNotationDemo(demoIndex);
    } else if (action === "practice-song") {
      const songId = button.dataset.songId;
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
      this.stopNotationDemo();
      this.context.audioService.stopMic();
      this.context.store.setState({
        passed: new Set(),
        lesson,
        index: 0,
        note,
        customHoles: null,
      });
      this.context.router.navigate("practice");
    } else if (action === "lesson") {
      const lesson = LESSONS[2];
      const note = NOTES.find((n) => n.id === lesson.sequence[0]);
      this.stopNotationDemo();
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
    }
  }
}
