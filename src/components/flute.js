export function fluteDiagram(note, state = {}) {
  const isPlaying = state.demo;
  const activeHoles = (state.page === "fingering" && state.customHoles) ? state.customHoles : note.holes;
  const holePositions = [36.28, 45.12, 54.42, 66.74, 75.58, 84.65];

  return `<div class="flute-diagram ${isPlaying ? "flute-playing" : ""}" role="region" aria-label="吹孔在左。从左到右，第六至第一音孔：${activeHoles.map((hole, i) => `第${6 - i}孔${hole === 1 ? "按住" : hole === 0.5 ? "半孔" : "松开"}`).join("，")}">
    <svg class="flute-svg" viewBox="0 0 860 144" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="bamboo-cylinder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b47f37" />
          <stop offset="8%" stop-color="#d6ab62" />
          <stop offset="28%" stop-color="#f5dc99" />
          <stop offset="50%" stop-color="#fef3c7" />
          <stop offset="72%" stop-color="#ddba77" />
          <stop offset="90%" stop-color="#b78944" />
          <stop offset="100%" stop-color="#956729" />
        </linearGradient>

        <pattern id="bamboo-grain" width="50" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1" x2="50" y2="1" stroke="#875b22" stroke-width="0.5" opacity="0.18" />
          <line x1="0" y1="3" x2="50" y2="3" stroke="#fff8d6" stroke-width="0.5" opacity="0.25" />
        </pattern>

        <pattern id="cord-pattern" width="3" height="38" patternUnits="userSpaceOnUse">
          <line x1="0.6" y1="0" x2="0.6" y2="38" stroke="#1c110a" stroke-width="0.9" />
          <line x1="1.8" y1="0" x2="1.8" y2="38" stroke="#5a341f" stroke-width="1.2" />
          <line x1="2.8" y1="0" x2="2.8" y2="38" stroke="#140b06" stroke-width="0.9" />
        </pattern>

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

        <linearGradient id="horn-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#161210" />
          <stop offset="30%" stop-color="#3d322b" />
          <stop offset="70%" stop-color="#29201a" />
          <stop offset="100%" stop-color="#120e0c" />
        </linearGradient>

        <linearGradient id="brass-joint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cbb584" />
          <stop offset="25%" stop-color="#fcedcc" />
          <stop offset="60%" stop-color="#e6cf9c" />
          <stop offset="90%" stop-color="#a48446" />
          <stop offset="100%" stop-color="#80622d" />
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

      <!-- Flute Tube Body Layer -->
      <g class="bamboo-flute-tube">
        <rect x="28" y="48" width="802" height="34" rx="2" fill="url(#bamboo-cylinder)" />
        <rect x="28" y="48" width="802" height="34" rx="2" fill="url(#bamboo-grain)" opacity="0.32" />
        <line x1="28" y1="56" x2="830" y2="56" stroke="#fffce8" stroke-width="1.2" opacity="0.45" />
        <line x1="28" y1="81" x2="830" y2="81" stroke="#754e1e" stroke-width="1.1" opacity="0.5" />

        <!-- Bamboo Nodes -->
        <g class="bamboo-node" transform="translate(265, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(428, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(524, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>
        <g class="bamboo-node" transform="translate(688, 0)">
          <rect x="-3" y="46" width="6" height="38" rx="2" fill="url(#bamboo-cylinder)" opacity="0.85" />
          <line x1="0" y1="46" x2="0" y2="84" stroke="#784f22" stroke-width="1.4" />
          <line x1="1" y1="46" x2="1" y2="84" stroke="#ffebc2" stroke-width="0.9" opacity="0.85" />
        </g>

        <!-- Silk Bindings -->
        <rect x="54" y="46" width="16" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="142" y="46" width="12" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="226" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="508" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="762" y="46" width="14" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />
        <rect x="802" y="46" width="16" height="38" rx="1.5" fill="url(#cord-pattern)" stroke="#1a100a" stroke-width="0.7" />

        <!-- Head Cap & Brass Joint -->
        <path d="M42 47.5 H35 A17 17 0 0 0 35 82.5 H42 Z" fill="url(#horn-gradient)" stroke="#181310" stroke-width="0.8" />
        <line x1="38" y1="48" x2="38" y2="82" stroke="#ebd6b0" stroke-width="0.8" opacity="0.6" />
        <rect x="42" y="47" width="10" height="36" fill="url(#brass-joint)" stroke="#80622d" stroke-width="0.7" />
        <line x1="47" y1="47" x2="47" y2="83" stroke="#fff5d9" stroke-width="0.7" opacity="0.8" />

        <!-- Tail Piece & Auxiliary holes -->
        <rect x="820" y="47.5" width="10" height="35" rx="1.5" fill="url(#horn-gradient)" stroke="#181310" stroke-width="0.8" />
        <ellipse cx="830" cy="65" rx="2.5" ry="11" fill="#0f0905" stroke="#4a3726" stroke-width="0.6" />
        <ellipse cx="786" cy="65" rx="5" ry="4" fill="#18100a" stroke="#8c642e" stroke-width="0.8" />

        <!-- Tassel -->
        <g class="flute-tassel" transform="translate(830, 65)">
          <path d="M0 0 C6 3, 10 10, 10 22 C10 32, 13 38, 14 46" fill="none" stroke="#a43d2c" stroke-width="1.2" stroke-linecap="round" />
          <ellipse cx="10" cy="22" rx="2.2" ry="2.2" fill="#d2964d" />
          <path d="M14 46 L12 60 M14 46 L14 62 M14 46 L16 60" stroke="#a43d2c" stroke-width="1.1" stroke-linecap="round" />
        </g>
      </g>

      <!-- Embouchure / Blow Hole base rendering -->
      <g class="flute-blow-hole-base" transform="translate(104, 65)">
        <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="url(#blow-bevel)" stroke="#9c7031" stroke-width="0.9" />
        <ellipse cx="0" cy="0.4" rx="10" ry="6.8" fill="url(#hole-interior)" />
        <path d="M-8 -2.5 A9 6 0 0 1 8 -2.5" fill="none" stroke="#fff0be" stroke-width="0.8" opacity="0.6" />
        <ellipse class="breath-wave" cx="0" cy="0" rx="12" ry="8.5" fill="none" stroke="#e8984a" stroke-width="1.6" opacity="0" />
      </g>

      <!-- Membrane Hole -->
      <g class="flute-membrane-hole" transform="translate(188, 65)">
        <ellipse cx="0" cy="0" rx="10" ry="7" fill="#d6ba82" stroke="#875e29" stroke-width="0.8" />
        <ellipse class="membrane-skin" cx="0" cy="0" rx="9" ry="6.2" fill="url(#membrane-grad)" stroke="#b59a68" stroke-width="0.6" />
        <path d="M-6 -2 Q-2 -1.2 6 -2.4 M-7 0 Q-1 0.6 7 -0.2 M-6 2 Q-2 2.6 6 1.8" fill="none" stroke="#caa66b" stroke-width="0.45" opacity="0.75" />
        <ellipse cx="0" cy="0" rx="7" ry="4" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.35" />
      </g>

      <!-- Under-Hole Drilled Rims -->
      ${holePositions.map((p, i) => {
        const cx = [312, 388, 468, 574, 650, 728][i];
        return `<g transform="translate(${cx}, 65)">
          <circle cx="0" cy="0" r="16" fill="#cda35e" stroke="#875b25" stroke-width="1.1" />
          <circle cx="0" cy="0" r="13.5" fill="url(#hole-interior)" />
          <path d="M-10 -7 A13 13 0 0 1 10 -7" fill="none" stroke="#ffebbe" stroke-width="0.8" opacity="0.5" />
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
    <button class="flute-blow-btn" data-action="blow-flute" aria-label="吹孔 · 点击试听竹笛参考音" title="点击吹孔试听">
      </button>
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
  </div>`;
}

export function getFluteClickTarget(event) {
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
