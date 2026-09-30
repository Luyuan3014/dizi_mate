import { LESSONS } from "../music.js";
import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { metronomeView } from "../components/metronome.js";

export function songsPage(state) {
  return `${hero("第一段旋律，从熟悉的开始", "小小曲谱，<span>大大开心。</span>", "不用一口气吹完整首，先把一句吹给自己听。", metronomeView(state))}
    <section class="card song-card"><div class="song-art"><span>♪</span><i>♪</i><small>FIRST MELODY</small></div><div class="song-content"><span class="level-tag">入门 · 只用 3 个音</span><h2>两只老虎</h2><p>开头两句 · 8 拍 · 建议 60 BPM</p><div class="song-preview">${LESSONS[2].sequence.map((id, i) => `<span data-song-beat="${i}">${id}</span>`).join(" ")}</div><p>左手三孔盖住吹 1，再依次松开无名指、中指吹 2 和 3。</p><button class="button button-outline" data-action="song-demo">${icon("play")} <span id="song-demo-label">节拍器同步打拍示范</span></button><button class="button button-primary" data-action="lesson" data-lesson="song">开始这段练习 ${icon("arrow")}</button></div></section><div class="inline-note">${icon("leaf")} 好听的旋律不需要很多音。先把这一小段吹稳，再慢慢走远。</div>`;
}
