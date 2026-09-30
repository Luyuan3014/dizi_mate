import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { LESSONS, NOTES } from "../music.js";

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

export function notationPage(state) {
  return `${hero(
    "不背乐理，也能开始",
    "简谱，其实<span>很好懂。</span>",
    "先认识这四件小事，就能读懂你的第一段旋律。",
  )}
    <div class="notation-grid">${notationLessons.map((item, i) => `<article class="card notation-card"><span class="section-kicker">0${i + 1} / ${item.label}</span><div class="notation-example">${item.symbol}</div><h2>${item.title}</h2><p>${item.content}</p><button data-action="notation-demo" data-demo="${i}">${icon("volume")} 听听这个例子 ${icon("arrow")}</button></article>`).join("")}</div><div class="notation-cta"><div><h2>看懂一点，就试着吹一点。</h2><p>从《两只老虎》的前两句开始，只用 1、2、3 三个音。</p></div><button class="button button-primary" data-action="lesson" data-lesson="song">去吹一段旋律 ${icon("arrow")}</button></div>`;
}

export class NotationPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    this.container.innerHTML = notationPage(state);
    this.container.addEventListener("click", this.boundClickHandler);
  }

  unmount() {
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  update() {
    // Static guide content, no live state bindings needed
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");

    if (action === "notation-demo") {
      const examples = [
        ["1", "2", "3"],
        ["low5", "5"],
        ["1", "2"],
        ["1", null, "2", null],
      ];
      const demoIndex = Number(button.dataset.demo);
      this.context.shell.toast("合成参考音正在播放，再次点击可停止。");
      this.context.audioService.playSequence(
        examples[demoIndex],
        demoIndex === 2 ? 2000 : 1000,
      );
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
    }
  }
}
