import { FLUTE_MODELS } from "./flute-viewer.js";
import { fluteState, photoTube, shouldSuppressFluteClick } from "./flute-controls.js";
export { fluteState, mountFlute, unmountFlute } from "./flute-controls.js";

export function fluteDiagram(note, state = {}) {
  const isPlaying = state.demo;
  const activeHoles = (state.page === "fingering" && state.customHoles) ? state.customHoles : note.holes;
  const holePositions = [36.28, 45.12, 54.42, 66.74, 75.58, 84.65];
  const model = fluteState.model;
  const is3D = fluteState.rotateMode;
  const modelInfo = FLUTE_MODELS[model];
  const realTexture = modelInfo.photo;
  const modelName = modelInfo.name;

  return `<div class="flute-container ${is3D ? "mode-3d-active" : ""}">
    <!-- Flute Top Action Bar -->
    <div class="flute-action-bar">
      <div class="flute-model-info">
        <span class="flute-badge" id="flute-badge-label">${modelName}</span>
        <span class="flute-tip-hint">${is3D ? "拖动旋转 · 双指缩放" : "照片提取 · 真实竹纹"}</span>
      </div>
      <div class="flute-toolbar-btns">
        <button type="button" class="flute-tool-btn ${is3D ? "active" : ""}" data-flute-action="toggle-3d" aria-pressed="${is3D}" title="开启/退出3D自由旋转">
          <span class="icon">🔄</span><span>${is3D ? "退出旋转" : "自由旋转展示"}</span>
        </button>
        <button type="button" class="flute-tool-btn" data-flute-action="toggle-model" title="切换笛身款式">
          <span class="icon">🪵</span><span>切换笛身</span>
        </button>
      </div>
    </div>

    <!-- 3D Controls Floating Bar -->
    <div class="flute-3d-panel ${is3D ? "show" : ""}">
      <div class="flute-3d-controls">
        <button type="button" class="flute-ctrl-btn ${fluteState.autoSpin ? "active" : ""}" data-flute-action="toggle-spin" id="flute-spin-btn">
          ${fluteState.autoSpin ? "⏸ 暂停自转" : "▶ 自动巡航"}
        </button>
        <button type="button" class="flute-ctrl-btn" data-flute-action="reset-view">↺ 正视还原</button>
        <button type="button" class="flute-ctrl-btn" data-flute-action="set-preset" data-preset="perspective">📐 45°立体</button>
        <button type="button" class="flute-ctrl-btn" data-flute-action="set-preset" data-preset="playing">🎵 演奏姿态</button>
        <button type="button" class="flute-ctrl-btn ${fluteState.viewMode === "full" ? "active" : ""}" data-flute-action="toggle-view-mode" id="flute-view-btn">
          ${fluteState.viewMode === "full" ? "🎯 切回指法对照" : "🔍 查看完整笛身"}
        </button>
        <button type="button" class="flute-ctrl-btn" data-flute-action="zoom-out" aria-label="缩小笛子">−</button>
        <button type="button" class="flute-ctrl-btn" data-flute-action="zoom-in" aria-label="放大笛子">＋</button>
      </div>
      <div class="flute-angle-indicator" id="flute-angle-text">X: ${Math.round(fluteState.rotX)}° · Y: ${Math.round(fluteState.rotY)}°</div>
    </div>

    <!-- Main Flute Diagram Stage -->
    <div class="flute-stage ${is3D ? "stage-3d" : ""}" id="flute-interactive-stage"
      role="region" tabindex="${is3D ? "0" : "-1"}" aria-label="竹笛展示区。拖动或方向键旋转，Shift 加左右键转动笛身，双指或加减键缩放，Home 键复位。">
      <canvas class="flute-viewer-canvas" aria-hidden="true"></canvas>
      <div class="flute-3d-rotor" id="flute-rotor">

        <!-- Clean Realistic Full Flute Showcase Layer (when full view mode is on) -->
        <div class="flute-full-showcase ${fluteState.viewMode === "full" ? "show" : ""}">
          <svg viewBox="${modelInfo.bounds.join(" ")}" class="flute-full-photo" role="img" aria-label="${modelName}">
            <image href="${realTexture}" width="2170" height="725" />
          </svg>
        </div>

        <!-- Standard Interactive Diagram Layer -->
        <div class="flute-diagram ${isPlaying ? "flute-playing" : ""} ${fluteState.viewMode === "full" ? "hidden" : ""}" role="region" aria-label="吹孔在左。从左到右，第六至第一音孔：${activeHoles.map((hole, i) => `第${6 - i}孔${hole === 1 ? "按住" : hole === 0.5 ? "半孔" : "松开"}`).join("，")}">
          <svg class="flute-svg" viewBox="0 0 860 144" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <linearGradient id="flute-shine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
                <stop offset="25%" stop-color="#ffffff" stop-opacity="0.08" />
                <stop offset="70%" stop-color="#000000" stop-opacity="0.05" />
                <stop offset="100%" stop-color="#000000" stop-opacity="0.25" />
              </linearGradient>

              <radialGradient id="hole-interior" cx="48%" cy="45%" r="55%">
                <stop offset="0%" stop-color="#0a0604" />
                <stop offset="65%" stop-color="#1c120b" />
                <stop offset="100%" stop-color="#2d1c10" />
              </radialGradient>

              <linearGradient id="blow-bevel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#faecc0" />
                <stop offset="100%" stop-color="#b6843c" />
              </linearGradient>

              <linearGradient id="membrane-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fdfbf0" />
                <stop offset="50%" stop-color="#f5edd0" />
                <stop offset="100%" stop-color="#e8dcba" />
              </linearGradient>
            </defs>

            <!-- Top Guides: Mouth guide and Hand guides -->
            <g class="mouth-guide-svg">
              <text x="104" y="19" text-anchor="middle" class="guide-text guide-mouth">吹孔在这边</text>
              <path d="M104 24 v7 M101 28 l3 3 l3 -3" fill="none" stroke="#9ba88d" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
            </g>

            <g class="hand-guide-svg left-hand-guide">
              <text x="390" y="15" text-anchor="middle" class="guide-text guide-hand-title">左手</text>
              <text x="390" y="27" text-anchor="middle" class="guide-subtext">食指 · 中指 · 无名指</text>
              <path d="M312 32 h156 M312 32 v4 M388 32 v4 M468 32 v4" fill="none" stroke="#d5dec7" stroke-width="1.1" stroke-linecap="round" />
            </g>

            <g class="hand-guide-svg right-hand-guide">
              <text x="651" y="15" text-anchor="middle" class="guide-text guide-hand-title">右手</text>
              <text x="651" y="27" text-anchor="middle" class="guide-subtext">食指 · 中指 · 无名指</text>
              <path d="M574 32 h154 M574 32 v4 M650 32 v4 M728 32 v4" fill="none" stroke="#d5dec7" stroke-width="1.1" stroke-linecap="round" />
            </g>

            <!-- Extracted Real Flute Tube Body Layer -->
            <g class="bamboo-flute-tube">
              ${photoTube(model)}
              <rect x="28" y="45" width="802" height="40" rx="3" fill="url(#flute-shine)" opacity="0.45" pointer-events="none" />
              <line x1="28" y1="49" x2="830" y2="49" stroke="#fffce8" stroke-width="1" opacity="0.35" pointer-events="none" />

              <!-- Tassel -->
              <g class="flute-tassel" transform="translate(830, 65)">
                <path d="M0 0 C6 3, 10 10, 10 22 C10 32, 13 38, 14 46" fill="none" stroke="#a43d2c" stroke-width="1.2" stroke-linecap="round" />
                <ellipse cx="10" cy="22" rx="2.2" ry="2.2" fill="#d2964d" />
                <path d="M14 46 L12 60 M14 46 L14 62 M14 46 L16 60" stroke="#a43d2c" stroke-width="1.1" stroke-linecap="round" />
              </g>
            </g>

            <!-- Embouchure / Blow Hole base rendering -->
            <g class="flute-blow-hole-base" transform="translate(104, 65)">
              <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="url(#blow-bevel)" stroke="#9c7031" stroke-width="0.9" opacity="0.4" />
              <ellipse class="breath-wave" cx="0" cy="0" rx="12" ry="8.5" fill="none" stroke="#e8984a" stroke-width="1.6" opacity="0" />
            </g>

            <!-- Membrane Hole -->
            <g class="flute-membrane-hole" transform="translate(188, 65)">
              <ellipse cx="0" cy="0" rx="9" ry="6.2" fill="url(#membrane-grad)" stroke="#b59a68" stroke-width="0.6" opacity="0.6" class="membrane-skin" />
            </g>

            <!-- Under-Hole Drilled Rims Framing -->
            ${holePositions.map((p, i) => {
              const cx = [312, 388, 468, 574, 650, 728][i];
              return `<g transform="translate(${cx}, 65)">
                <circle cx="0" cy="0" r="14.5" fill="none" stroke="#784e1e" stroke-width="0.75" opacity="0.45" />
              </g>`;
            }).join("")}

            <!-- Bottom Number Labels -->
            <g class="flute-hole-numbers">
              ${[312, 388, 468, 574, 650, 728]
                .map(
                  (x, i) =>
                    `<text x="${x}" y="106" text-anchor="middle" class="hole-num-text ${activeHoles[i] === 1 ? "num-covered" : ""}">${6 - i}</text>`,
                )
                .join("")}
            </g>

            <!-- Bottom Direction Axis Line -->
            <g class="flute-axis-line">
              <text x="36" y="129" text-anchor="start" class="axis-label">靠近吹孔</text>
              <line x1="95" y1="126" x2="755" y2="126" stroke="#e3e7d8" stroke-width="1" stroke-dasharray="2 3" />
              <text x="824" y="129" text-anchor="end" class="axis-label">靠近笛尾</text>
            </g>
          </svg>

          <!-- Interactive HTML Buttons Layer -->
          <button class="flute-blow-btn" data-action="blow-flute" aria-label="吹孔 · 点击试听竹笛参考音" title="点击吹孔试听"></button>
          ${activeHoles.map((hole, i) => {
            const leftPercent = holePositions[i];
            const holeNum = 6 - i;
            const stateText = hole === 1 ? "按住" : hole === 0.5 ? "半孔" : "松开";
            return `<button class="flute-hole-btn ${hole === 1 ? "covered" : hole === 0.5 ? "half" : "open"}"
                            style="left: ${leftPercent}%"
                            data-action="toggle-hole"
                            data-index="${i}"
                            data-hole="${holeNum}"
                            aria-label="第${holeNum}孔 · 当前${stateText} · 点击切换"
                            title="第${holeNum}孔 · 点击切换指法">
                      <span class="hole-disc"></span>
                    </button>`;
          }).join("")}
        </div>
      </div>
      <!-- Realistic 3D Ground Shadow -->
      <div class="flute-3d-shadow" id="flute-shadow"></div>
    </div>
    <p class="flute-viewer-note">照片提取笛身 · 背面与端面为结构重建。指法对照适当调整孔距，方便试按。</p>
  </div>`;
}

export function getFluteClickTarget(event) {
  // If user just dragged to rotate, suppress click actions
  if (shouldSuppressFluteClick(event)) {
    return null;
  }
  const button = event.target.closest("[data-action]");
  if (button) {
    const action = button.getAttribute("data-action");
    if (action === "blow-flute" || action === "listen") {
      return { type: "blow" };
    }
    if (action === "toggle-hole") {
      const index = Number(button.getAttribute("data-index") ?? button.dataset?.index);
      return { type: "hole", index };
    }
  }
  const svg = event.target.closest("svg.flute-svg");
  if (svg && typeof svg.createSVGPoint === "function") {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPt = pt.matrixTransform(ctm.inverse());
      if (Math.hypot(svgPt.x - 104, svgPt.y - 65) <= 25) {
        return { type: "blow" };
      }
      const holeCenters = [312, 388, 468, 574, 650, 728];
      for (let i = 0; i < 6; i++) {
        if (Math.hypot(svgPt.x - holeCenters[i], svgPt.y - 65) <= 24) {
          return { type: "hole", index: i };
        }
      }
    }
  }
  return null;
}
