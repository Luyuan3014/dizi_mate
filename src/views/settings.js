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
    return `${close}<span class="dialog-icon">${icon("leaf")}</span><h2 id="dialog-title">第一声，不用很用力。</h2><p class="dialog-description">先检查笛膜已正确贴好，再给自己一点耐心。</p><div class="help-steps"><div><b>01</b><span><strong>笛子横着，手指放松</strong><p>左手靠近吹孔，右手靠近笛尾。用指肚盖孔，不用指尖；图里吹孔在左。</p></span></div><div><b>02</b><span><strong>像轻轻吹一个瓶口</strong><p>把吹孔靠近下唇，嘴唇留细缝。气流掠过吹孔边缘，轻轻转动笛身找角度。</p></span></div><div><b>03</b><span><strong>先吹响，再吹稳</strong><p>先试全按的低音 5。没响就微调角度；响了再保持平稳气息。头晕时立即停下休息。</p></span></div></div><div class="settings-note">${icon("mic")} 麦克风能判断音高是否接近目标，不能检查持笛姿势、指法或音色。环境嘈杂时，请靠近一些再试。</div><button class="button button-primary" data-action="close">好，试试看 ${icon("arrow")}</button>`;
  }
}
