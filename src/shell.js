import { icon, logo } from "./components/icons.js";
import { dialogView } from "./views/settings.js";
import { KEYS } from "./music.js";

export const PAGE_TITLES = {
  practice: "今日陪练",
  fingering: "指法小抄",
  tuner: "实时调音器",
  "long-tone": "长音练习",
  notation: "简谱入门",
  songs: "我的曲谱",
  history: "练习记录",
};

export class AppShell {
  constructor(appEl, { onNavigate, onSettingsSaved, onModalOpen, onModalClose }) {
    this.appEl = appEl;
    this.onNavigate = onNavigate;
    this.onSettingsSaved = onSettingsSaved;
    this.onModalOpen = onModalOpen;
    this.onModalClose = onModalClose;
    this.toastTimer = null;
  }

  mount(state) {
    this.appEl.innerHTML = `
      <aside class="sidebar">
        <a href="#practice" class="brand" aria-label="笛伴首页"><span class="brand-mark">${logo}</span><span><strong>笛伴<span class="brand-dot">.</span></strong><small>DIZIMATE</small></span></a>
        <div class="nav-label">我的音乐小天地</div>
        <nav aria-label="主导航">${Object.entries(PAGE_TITLES)
          .map(
            ([id, title]) =>
              `<a href="#${id}" class="nav-link ${state.page === id ? "active" : ""}" ${state.page === id ? 'aria-current="page"' : ""}>${icon({ practice: "home", fingering: "hand", tuner: "mic", "long-tone": "leaf", notation: "book", songs: "music", history: "chart" }[id])}<span>${title}</span>${id === "practice" ? "<i></i>" : ""}</a>`,
          )
          .join("")}</nav>
        <div class="sidebar-note"><div class="plant-art" aria-hidden="true"><svg viewBox="0 0 150 115"><path d="M70 114c0-32 10-56 34-85M77 83C43 78 32 62 29 43c25 0 46 10 48 40Zm13-28c-3-28 8-44 25-51 7 25-3 41-25 51Zm-15 48c26-24 41-26 61-19-15 23-35 22-61 19Z" fill="#bdc6aa"/><path d="m75 96-30-35m50-15 13-25m-25 77 37-8" fill="none" stroke="#839176" stroke-width="1.3"/></svg></div><strong>不赶进度，只享受进步。</strong><p>每天一点点，让音乐自然发生。</p></div>
        <button class="sidebar-help" data-action="help">${icon("help")}<span>第一次吹笛子？</span>${icon("chevron")}</button>
        <div class="sidebar-bottom"><span class="avatar">${icon("leaf")}</span><span>初见，笛友<small>从零开始，也很好</small></span><span class="status-dot"></span></div>
      </aside>
      <div class="main-shell">
        <header class="topbar"><div class="breadcrumb">我的练习 <span>/</span> <strong id="topbar-title">${PAGE_TITLES[state.page] || PAGE_TITLES.practice}</strong></div><div class="topbar-actions"><span class="local-badge">${icon("shield")} 本地练习，安心吹奏</span><button class="instrument-select" data-action="settings">${icon("music")}<span id="topbar-instrument">${state.key} 调竹笛</span><span class="select-divider"></span><span>筒音作 5</span>${icon("down")}</button></div></header>
        <main id="main-content"></main>
        <footer class="page-footer"><span>${icon("leaf")} 每一次呼吸，都在靠近音乐。</span><span>笛伴 DiziMate <i>·</i> 陪你慢慢来</span></footer>
      </div>
      <dialog id="modal" aria-labelledby="dialog-title"></dialog>
      <div id="toast" class="toast" role="status"></div>`;

    this.mainContent = this.appEl.querySelector("#main-content");
    this.modal = this.appEl.querySelector("#modal");
    this.toastEl = this.appEl.querySelector("#toast");
    this.topbarTitle = this.appEl.querySelector("#topbar-title");
    this.topbarInstrument = this.appEl.querySelector("#topbar-instrument");
    this.navLinks = this.appEl.querySelectorAll(".nav-link");

    this.bindEvents();
    return this.mainContent;
  }

  bindEvents() {
    this.appEl.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (link) {
        event.preventDefault();
        const page = link.hash.slice(1);
        if (this.onNavigate) this.onNavigate(page);
        return;
      }
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      if (action === "settings" || action === "help") {
        if (this.onModalOpen) this.onModalOpen(action);
      } else if (action === "close") {
        this.closeModal();
      }
    });

    this.modal.addEventListener("submit", (event) => {
      if (event.target.id !== "settings-form") return;
      event.preventDefault();
      const form = new FormData(event.target);
      const key = form.get("key");
      const reference = Number(form.get("reference"));
      const tolerance = Number(form.get("tolerance"));
      if (
        !Object.hasOwn(KEYS, key) ||
        !Number.isFinite(reference) ||
        reference < 430 ||
        reference > 450 ||
        ![20, 35, 50].includes(tolerance)
      ) {
        return;
      }
      this.closeModal();
      if (this.onSettingsSaved) {
        this.onSettingsSaved({ key, reference, tolerance });
      }
    });

    this.modal.addEventListener("close", () => {
      if (this.onModalClose) this.onModalClose();
    });
  }

  updateNav(page) {
    this.navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${page}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (this.topbarTitle) {
      this.topbarTitle.textContent = PAGE_TITLES[page] || PAGE_TITLES.practice;
    }
  }

  updateInstrument(key) {
    if (this.topbarInstrument) {
      this.topbarInstrument.textContent = `${key} 调竹笛`;
    }
  }

  toast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl?.classList.remove("visible");
    }, 4500);
  }

  openModal(type, state) {
    if (!this.modal) return;
    this.modal.innerHTML = dialogView(type, state);
    this.modal.showModal();
  }

  closeModal() {
    if (this.modal && this.modal.open) {
      this.modal.close();
    }
  }
}
