import { icon } from "./icons.js";

export const MIC_STATES = {
  idle: ["未开启麦克风", "测试麦克风并开始", "先查看用途和距离说明，再点击测试。"],
  requesting: ["等待系统授权", "取消授权等待", "请在浏览器权限提示中选择允许；若被拦截，请检查地址栏权限。"],
  testing: ["正在测试麦克风", "取消测试", "请先保持安静约 1 秒，正在检查输入和环境声音。"],
  ready: ["麦克风已准备好", "暂停陪练，歇一会儿", "可以吹奏了，输入电平会随声音变化。"],
  denied: ["麦克风权限已拒绝", "重新检查权限", "在地址栏或系统隐私设置中允许麦克风后，重新检查。"],
  missing: ["没有找到麦克风", "重新检查设备", "连接麦克风或启用设备后，重新检查。"],
  busy: ["麦克风无法读取", "重新检查设备", "关闭占用麦克风的应用，并检查系统权限；也可以切换兼容模式后重试。"],
  interrupted: ["麦克风连接中断", "重新连接麦克风", "检查设备连接，再重新检查。"],
  insecure: ["当前地址不能使用麦克风", "重新检查权限", "请使用 localhost 或 HTTPS 地址打开应用。"],
  unsupported: ["浏览器暂不支持麦克风分析", "重新检查权限", "请更新 Chrome、Edge 或 Safari 后重试。"],
  error: ["麦克风启动失败", "重新检查权限", "检查设备和权限，或切换兼容模式后重试。"],
};

export function micPreflight() {
  return `<div class="mic-preflight" aria-labelledby="mic-heading"><strong id="mic-heading">开始前，先确认麦克风</strong><p>只用于实时分析音高；声音在本机处理，不录音、不上传。设备距笛子约 30–50 厘米，避开直吹气流。</p><label for="mic-mode">拾音模式 <select id="mic-mode"><option value="precise">高精度 · 保留原始声音</option><option value="compatible">兼容 · 使用设备默认处理</option></select></label><small>若设备启动失败，可切换兼容模式；设备降噪可能影响音高判断。</small></div>`;
}

export function micMeter() {
  return `<div class="mic-meter" role="meter" aria-label="输入音量（相对电平）" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="mic-meter-fill"></span></div><p class="mic-noise" id="mic-noise" role="status" aria-live="polite">尚未开始测试环境声音。</p>`;
}

export function updateMicControls(container, state, { statusChanged = true } = {}) {
  if (!container) return;
  const status = state.micStatus || (state.mic === "on" ? "ready" : state.mic === "requesting" ? "requesting" : "idle");
  const [label, action, detail] = MIC_STATES[status] || MIC_STATES.error;
  const setText = (selector, text) => {
    const el = container.querySelector(selector);
    if (el && el.textContent !== text) el.textContent = text;
  };
  if (statusChanged) {
    const badge = container.querySelector("#mic-state");
    if (badge) { badge.textContent = label; badge.classList.toggle("connected", status === "ready"); }
    const button = container.querySelector("#mic-button");
    if (button) button.innerHTML = `${icon(state.mic === "off" ? "mic" : "pause")} ${action}`;
    setText("#feedback-title", label);
    setText("#feedback-copy", detail);
    const mode = container.querySelector("#mic-mode");
    if (mode) { mode.value = state.micMode || "precise"; mode.disabled = state.mic !== "off"; }
  }
  const level = Math.round((state.micLevel || 0) * 100);
  const meter = container.querySelector(".mic-meter");
  meter?.setAttribute("aria-valuenow", String(level));
  const fill = container.querySelector("#mic-meter-fill");
  if (fill) fill.style.width = `${level}%`;
  setText("#mic-noise", status === "testing" ? "测试中，请先保持安静。" : state.mic === "on" ? state.micNoise === "noisy" ? "环境声音较大：请到安静处，避免风扇和直吹气流。" : "环境检查完成；吹奏时电平变化表示已收到声音。" : "尚未开始测试环境声音。");
}
