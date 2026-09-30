import { NOTES, noteLabel } from "../music.js";
import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { calculateTodayStats } from "../store.js";

export function historyPage(state, stats) {
  const total = state.sessions.reduce(
    (sum, session) => sum + session.seconds,
    0,
  );
  return `${hero(
    "每一小步，都算数",
    "听见自己的<span>进步。</span>",
    "保留最近 100 次麦克风练习；吹准表示多数时间在绿区，积累了足够的音准信心。",
  )}
    <div class="history-stats">
      <div class="card"><span>今日练习</span><strong id="history-today-time">${Math.floor(stats.seconds / 60)}<small>分 ${Math.floor(stats.seconds % 60)} 秒</small></strong></div>
      <div class="card"><span>今日吹准</span><strong id="history-today-notes">${stats.notes}<small>个不同的音</small></strong></div>
      <div class="card"><span>近期练习</span><strong id="history-total-time">${Math.floor(total / 60)}<small>分 ${Math.floor(total % 60)} 秒</small></strong></div>
    </div>
    <section class="card history-list">
      <div class="section-heading"><h2>练习足迹</h2><span>最近 20 次 · 仅存本机</span></div>
      <div id="history-sessions-container">${renderSessionList(state.sessions)}</div>
    </section>`;
}

export function renderSessionList(sessions) {
  if (!sessions.length) {
    return `<div class="empty-state">${icon("leaf")}<h3>第一声，会从这里开始。</h3><p>开启麦克风练习后，你的小小进步会留在这里。</p><button class="button button-primary" data-action="practice">去试着吹一吹 ${icon("arrow")}</button></div>`;
  }
  return sessions
    .slice()
    .reverse()
    .slice(0, 20)
    .map(
      (session) =>
        `<div class="session-row"><span class="session-icon">${icon("music")}</span><div><strong>${new Date(session.at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} · ${new Date(session.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</strong><p>${session.notes.length ? `吹准了 ${session.notes.map((id) => noteLabel(NOTES.find((note) => note.id === id))).join("、")}` : "一次声音的探索，继续慢慢来"}</p></div><span>${Math.floor(session.seconds / 60)} 分 ${Math.floor(session.seconds % 60)} 秒</span></div>`,
    )
    .join("");
}

export class HistoryPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    const stats = calculateTodayStats(state.sessions);
    this.container.innerHTML = historyPage(state, stats);

    this.container.addEventListener("click", this.boundClickHandler);

    this.unsubscribe = this.context.store.subscribe((state, changedKeys) => {
      this.update(state, changedKeys);
    });
  }

  unmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.container) {
      this.container.removeEventListener("click", this.boundClickHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  update(state, changedKeys) {
    if (changedKeys.has("sessions")) {
      const stats = calculateTodayStats(state.sessions);
      const total = state.sessions.reduce((sum, s) => sum + s.seconds, 0);

      const todayTime = this.container?.querySelector("#history-today-time");
      if (todayTime) {
        todayTime.innerHTML = `${Math.floor(stats.seconds / 60)}<small>分 ${Math.floor(stats.seconds % 60)} 秒</small>`;
      }
      const todayNotes = this.container?.querySelector("#history-today-notes");
      if (todayNotes) {
        todayNotes.innerHTML = `${stats.notes}<small>个不同的音</small>`;
      }
      const totalTime = this.container?.querySelector("#history-total-time");
      if (totalTime) {
        totalTime.innerHTML = `${Math.floor(total / 60)}<small>分 ${Math.floor(total % 60)} 秒</small>`;
      }

      const sessionsContainer = this.container?.querySelector(
        "#history-sessions-container",
      );
      if (sessionsContainer) {
        sessionsContainer.innerHTML = renderSessionList(state.sessions);
      }
    }
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "practice") {
      this.context.router.navigate("practice");
    }
  }
}
