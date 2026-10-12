import { KEYS } from "../music.js";
import { icon } from "../components/icons.js";

export function dialogView(type, state) {
  const close = `<button class="dialog-close" data-action="close" aria-label="关闭">${icon("close")}</button>`;
  if (type === "settings") {
    return `${close}<span class="dialog-icon">${icon("music")}</span><h2 id="dialog-title">先认识你的竹笛</h2><p class="dialog-description">看看笛身上的字母，我们会匹配它的音高。</p><form id="settings-form"><label for="flute-key">竹笛调性</label><select name="key" id="flute-key">${Object.keys(
      KEYS,
    )
      .map(
        (key) =>
          `<option value="${key}" ${state.key === key ? "selected" : ""}>${key} 调竹笛</option>`,
      )
      .join(
        "",
      )}</select><p class="field-hint">常见竹笛刻有 C / D / E / F / G。找不到时，请先确认包装或询问老师；选错调性会影响判断。</p><label for="tolerance">练习宽容度</label><select name="tolerance" id="tolerance"><option value="50" ${state.tolerance === 50 ? "selected" : ""}>轻松起步 · ±50 音分</option><option value="35" ${state.tolerance === 35 ? "selected" : ""}>日常练习 · ±35 音分</option><option value="20" ${state.tolerance === 20 ? "selected" : ""}>更精确一点 · ±20 音分</option></select><details><summary>音高校准（通常不用改）</summary><label for="reference">标准 A4 频率（430–450 Hz）</label><input id="reference" name="reference" type="number" min="430" max="450" step="0.1" value="${state.reference}" required/><p class="field-hint">默认 440 Hz。仅在调音器或老师明确指定时调整。</p></details><div class="settings-note">${icon("help")} 当前使用「筒音作 5」指法：六孔全按是低音 5。调性不同，数字指法相同，实际音高不同。</div><button class="button button-primary" type="submit">保存，继续练习 ${icon("check")}</button></form>`;
  } else {
    return `${close}<span class="dialog-icon">${icon("leaf")}</span><h2 id="dialog-title">第一声，不用很用力。</h2><p class="dialog-description">科学入门法则：气息与指法先分开排查，再结合吹奏。</p><div class="help-steps"><div><b>01</b><span><strong>对准吹孔与风门（单练嘴）</strong><p>吹孔轻贴下唇中央，像吹空啤酒瓶口。嘴唇微抿留小细缝，气流往前下方切过吹孔外沿，先不用使劲。</p></span></div><div><b>02</b><span><strong>气指分开：先不按孔试发音</strong><p>吹不响时，先完全松开双手或只按左手两个孔（中音 2）。专心排查嘴型风门与转笛角度，直到吹出清亮声音。</p></span></div><div><b>03</b><span><strong>加上手指：指腹盖严防漏气</strong><p>吹响后再逐步加手指。若放上手指突然不响，往往是指孔漏气而非嘴型不对；按紧 3 秒抬起检查指腹印痕是否完整居中。</p></span></div></div><div class="settings-note">${icon("help")} <strong>排查小口诀</strong>：吹不响先查嘴（单吹空音找风门），吹得响加手发虚先查手指缝（看指印排漏气）。</div><button class="button button-primary" data-action="close">好，试试看 ${icon("arrow")}</button>`;
  }
}
