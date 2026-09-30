import { NOTES, frequencyFor, pitchNameFor, noteLabel } from "../music.js";
import { icon } from "../components/icons.js";
import { hero, noteMarkup } from "../components/shared.js";
import { fluteDiagram } from "../components/flute.js";

export function fingeringPage(state) {
  return `${hero("先用手指认识竹笛", "六个音孔，<span>慢慢熟悉。</span>", "低音 5 到高音 6，共 16 个音。点击音符查看指法与气息。实心表示盖住，空心表示松开。")}
    <section class="card explorer-card"><div class="explorer-notes">${NOTES.map((note) => `<button class="explorer-note ${state.note.id === note.id ? "active" : ""}" data-action="explore" data-note="${note.id}" aria-label="${noteLabel(note)} · ${note.solfege}" aria-pressed="${state.note.id === note.id}">${noteMarkup(note)}<small>${note.solfege}</small></button>`).join("")}</div><div class="explorer-target"><div><h2>${state.note.title}</h2><p class="target-hz-badge">${state.note.low ? "低音 " : state.note.high ? "高音 " : "中音 "}${state.note.number} (${state.note.solfege}) · 音名 <strong>${pitchNameFor(state.note, state.key)}</strong> · 准确频率 <strong>${Math.round(frequencyFor(state.note, state.key, state.reference))} Hz</strong></p></div><button class="button button-outline listen-button" data-action="listen">${icon(state.demo ? "pause" : "volume")}<span>${state.demo ? "停止示范" : "听参考音"}</span></button></div>${fluteDiagram(state.note, state)}<div class="breath-tip">${icon("leaf")}<p>${state.note.tip}</p></div><div class="explorer-footer"><p>当前：${state.key} 调 · 筒音作 5。孔号从笛尾向吹孔数；低音 5 和中音 5 指法相同，气流不同。</p><button class="button button-primary" data-action="practice-note">练练这个音 ${icon("arrow")}</button></div></section>
    <div class="inline-note">${icon("help")} 高音 4、5、6 展示常用叉口／泄孔指法；不同笛子的开孔与吹角可能需要微调。半孔音 4 也需要校准。先从低音 5、6、7 和中音 1 练起就很好。</div>`;
}
