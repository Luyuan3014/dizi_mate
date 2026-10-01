import { FLUTE_MODELS, clampZoom, createFluteViewer, normalizeAngle } from "./flute-viewer.js";

export const fluteState = {
  rotateMode: false,
  autoSpin: false,
  model: "double",
  viewMode: "fingering",
  rotX: -16,
  rotY: -24,
  rotZ: -6,
  zoom: 1,
};

const controllers = new WeakMap();
const stages = new WeakMap();

export function shouldSuppressFluteClick(event) {
  const stage = event.target.closest(".flute-stage");
  return !!stages.get(stage)?.dragged || !!(stage && fluteState.rotateMode && fluteState.viewMode === "full");
}

export function unmountFlute(root, preserveSpin = false) {
  controllers.get(root)?.dispose();
  controllers.delete(root);
  if (!preserveSpin) fluteState.autoSpin = false;
}

export function mountFlute(root) {
  unmountFlute(root, true);
  const container = root.querySelector(".flute-container");
  if (!container) return;
  const stage = container.querySelector(".flute-stage");
  const rotor = container.querySelector(".flute-3d-rotor");
  const canvas = container.querySelector(".flute-viewer-canvas");
  const abort = new AbortController();
  const pointers = new Map();
  const gesture = { dragged: false };
  stages.set(stage, gesture);
  let animationFrame = null;
  let resetTimer = null;
  let previousTime = null;
  let viewer = null;
  let unavailable = false;
  let disposed = false;
  const gallery = () => fluteState.rotateMode && fluteState.viewMode === "full";
  const stopAnimation = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousTime = null;
  };
  const draw = () => {
    if (disposed) return;
    container.querySelector(".flute-angle-indicator").textContent =
      `X ${Math.round(fluteState.rotX)}° · Y ${Math.round(fluteState.rotY)}° · Z ${Math.round(fluteState.rotZ)}° · ${Math.round(fluteState.zoom * 100)}%`;
    rotor.style.transform = gallery() && unavailable
      ? `rotateX(${fluteState.rotX}deg) rotateY(${fluteState.rotY}deg) rotateZ(${fluteState.rotZ}deg) scale(${fluteState.zoom})`
      : "none";
    viewer?.render();
  };
  const sync = () => {
    if (disposed) return;
    const isGallery = gallery();
    container.classList.toggle("mode-3d-active", fluteState.rotateMode);
    stage.classList.toggle("stage-3d", fluteState.rotateMode);
    stage.classList.toggle("gallery-mode", isGallery);
    stage.tabIndex = isGallery ? 0 : -1;
    container.querySelector(".flute-3d-panel").classList.toggle("show", fluteState.rotateMode);
    container.querySelector(".flute-full-showcase").classList.toggle("show", isGallery);
    container.querySelector(".flute-diagram").classList.toggle("hidden", isGallery);
    const toggle = container.querySelector('[data-flute-action="toggle-3d"]');
    toggle.classList.toggle("active", fluteState.rotateMode);
    toggle.setAttribute("aria-pressed", String(fluteState.rotateMode));
    toggle.innerHTML = `<span class="icon">↻</span><span>${fluteState.rotateMode ? "退出旋转" : "自由旋转展示"}</span>`;
    const spin = container.querySelector('[data-flute-action="toggle-spin"]');
    spin.classList.toggle("active", fluteState.autoSpin);
    spin.setAttribute("aria-pressed", String(fluteState.autoSpin));
    spin.textContent = fluteState.autoSpin ? "⏸ 暂停自转" : "▶ 自动巡航";
    spin.disabled = !isGallery;
    for (const button of container.querySelectorAll('[data-flute-action="zoom-in"], [data-flute-action="zoom-out"]')) {
      button.disabled = !isGallery;
    }
    const view = container.querySelector('[data-flute-action="toggle-view-mode"]');
    view.classList.toggle("active", isGallery);
    view.setAttribute("aria-pressed", String(isGallery));
    view.textContent = isGallery ? "🎯 切回指法对照" : "🔍 查看完整笛身";
    const model = FLUTE_MODELS[fluteState.model];
    container.querySelector(".flute-badge").textContent = model.name;
    container.querySelector(".flute-tip-hint").textContent = isGallery
      ? "拖动旋转 · 滚轮 / 双指缩放 · 双击复位" : "照片提取 · 保留竹纹与缠线质感";
    const photo = container.querySelector(".flute-full-photo");
    photo.setAttribute("viewBox", model.bounds.join(" "));
    photo.querySelector("image").setAttribute("href", model.photo);
    photo.setAttribute("aria-label", model.name);
    container.querySelector(".bamboo-flute-tube").innerHTML = photoTube(fluteState.model);
    if (isGallery && !viewer && !unavailable) {
      viewer = createFluteViewer(canvas, () => fluteState, () => {
        unavailable = true;
        stage.classList.remove("viewer-ready");
        stage.classList.add("viewer-unavailable");
        container.querySelector(".flute-viewer-note").textContent = "当前设备使用照片旋转展示；背面未实拍。";
        sync();
      });
    }
    draw();
  };
  const rotate = (horizontal, vertical, roll = false) => {
    fluteState.rotX = normalizeAngle(fluteState.rotX - vertical * 0.5);
    const axis = roll ? "rotZ" : "rotY";
    fluteState[axis] = normalizeAngle(fluteState[axis] + horizontal * 0.5);
  };
  const reset = () => {
    fluteState.rotX = fluteState.rotY = fluteState.rotZ = 0;
    fluteState.zoom = 1;
    fluteState.autoSpin = false;
    stopAnimation();
    sync();
  };
  const animate = (time) => {
    animationFrame = null;
    if (disposed || !stage.isConnected || !gallery() || !fluteState.autoSpin || document.hidden) return;
    if (previousTime !== null) {
      fluteState.rotX = normalizeAngle(fluteState.rotX + Math.min(time - previousTime, 64) * 0.018);
    }
    previousTime = time;
    draw();
    animationFrame = requestAnimationFrame(animate);
  };
  const resumeAnimation = () => {
    if (gallery() && fluteState.autoSpin && !document.hidden && animationFrame === null) {
      previousTime = null;
      animationFrame = requestAnimationFrame(animate);
    }
  };
  const on = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal: abort.signal });
  on(stage, "pointerdown", (event) => {
    if (!gallery() || event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    clearTimeout(resetTimer);
    if (!pointers.size) gesture.dragged = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-dragging");
    stage.focus({ preventScroll: true });
    fluteState.autoSpin = false;
    stopAnimation();
    sync();
  });
  on(stage, "pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous || !gallery()) return;
    if (Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 5) gesture.dragged = true;
    const next = { ...previous, x: event.clientX, y: event.clientY };
    if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([pointerId]) => pointerId !== event.pointerId)[1];
      const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
      if (oldDistance > 5) fluteState.zoom = clampZoom(fluteState.zoom * newDistance / oldDistance);
      const oldAngle = Math.atan2(previous.y - other.y, previous.x - other.x);
      const newAngle = Math.atan2(next.y - other.y, next.x - other.x);
      fluteState.rotZ = normalizeAngle(fluteState.rotZ + normalizeAngle((newAngle - oldAngle) * 180 / Math.PI));
      gesture.dragged = true;
    } else rotate(next.x - previous.x, next.y - previous.y, event.shiftKey);
    pointers.set(event.pointerId, next);
    draw();
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!pointers.size) {
      stage.classList.remove("is-dragging");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { gesture.dragged = false; }, 80);
    }
  };
  on(stage, "pointerup", release);
  on(stage, "pointercancel", release);
  on(stage, "lostpointercapture", release);
  on(stage, "wheel", (event) => {
    if (!gallery()) return;
    event.preventDefault();
    fluteState.zoom = clampZoom(fluteState.zoom * Math.exp(-event.deltaY * 0.001));
    draw();
  }, { passive: false });
  on(stage, "dblclick", () => { if (gallery()) reset(); });
  on(stage, "keydown", (event) => {
    if (!gallery() || event.target !== stage) return;
    const moves = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
    if (moves[event.key]) {
      event.preventDefault();
      fluteState.autoSpin = false;
      stopAnimation();
      rotate(...moves[event.key], event.shiftKey);
    } else if (["+", "=", "-"].includes(event.key)) {
      event.preventDefault();
      fluteState.zoom = clampZoom(fluteState.zoom + (event.key === "-" ? -0.1 : 0.1));
    } else if (event.key === "Home") {
      event.preventDefault();
      reset();
    } else return;
    sync();
  });
  on(container, "click", (event) => {
    const button = event.target.closest("[data-flute-action]");
    if (!button) return;
    const action = button.dataset.fluteAction;
    if (action === "toggle-3d") {
      fluteState.rotateMode = !fluteState.rotateMode;
      fluteState.viewMode = fluteState.rotateMode ? "full" : "fingering";
      if (!fluteState.rotateMode) { fluteState.autoSpin = false; stopAnimation(); }
    } else if (action === "toggle-spin" && gallery()) {
      fluteState.autoSpin = !fluteState.autoSpin;
      if (fluteState.autoSpin) resumeAnimation();
      else stopAnimation();
    } else if (action === "reset-view") reset();
    else if (action === "set-preset") {
      fluteState.viewMode = "full";
      fluteState.autoSpin = false;
      stopAnimation();
      const perspective = button.dataset.preset === "perspective";
      fluteState.rotX = perspective ? -22 : -12;
      fluteState.rotY = perspective ? -34 : 24;
      fluteState.rotZ = perspective ? -10 : -18;
      fluteState.zoom = 1;
    } else if (action === "toggle-model") {
      fluteState.model = fluteState.model === "double" ? "single" : "double";
    } else if (action === "toggle-view-mode") {
      fluteState.viewMode = fluteState.viewMode === "full" ? "fingering" : "full";
      fluteState.autoSpin = false;
      stopAnimation();
    } else if (action === "zoom-in" || action === "zoom-out") {
      fluteState.zoom = clampZoom(fluteState.zoom + (action === "zoom-in" ? 0.15 : -0.15));
    }
    sync();
  });
  on(document, "visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else resumeAnimation();
  });
  controllers.set(root, { dispose() {
    disposed = true;
    stopAnimation();
    clearTimeout(resetTimer);
    for (const pointerId of pointers.keys()) {
      if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
    }
    abort.abort();
    viewer?.dispose();
    stages.delete(stage);
  } });
  sync();
  resumeAnimation();
}

export function photoTube(modelName) {
  const model = FLUTE_MODELS[modelName];
  const [left, top, width, height] = model.bounds;
  const sources = [left, ...model.holes, left + width];
  const targets = [0, 76, 160, 284, 360, 440, 546, 622, 700, 802];
  return sources.slice(0, -1).map((source, index) => `<svg x="${28 + targets[index]}" y="45"
    width="${targets[index + 1] - targets[index]}" height="40" viewBox="${source} ${top} ${sources[index + 1] - source} ${height}"
    preserveAspectRatio="none" class="flute-photo-tube" aria-hidden="true">
    <image href="${model.photo}" width="2170" height="725" />
  </svg>`).join("");
}
