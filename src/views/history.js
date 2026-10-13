import { NOTES, noteLabel } from "../music.js";
import { icon } from "../components/icons.js";
import { hero } from "../components/shared.js";
import { calculateTodayStats } from "../store.js";
import { performanceReport, exportPerformanceReport, escapeHTML } from "../components/performance-report.js";

export function renderReports(reports = []) {
  if (!reports.length) return `<div class="report-history-empty">还没有演奏报告。在今日陪练顶部选择「跟曲演奏」吹一首，报告就会保存在这里。</div>`;
  const ordered = reports.slice().reverse();
  return ordered.map((r, index) => {
    const previous = ordered.slice(index + 1).find((candidate) => candidate.songId === r.songId) || null;
    return `<details class="report-history-item"><summary><span>${icon("chart")}<b>${escapeHTML(r.title)}</b><small>${new Date(r.at).toLocaleString("zh-CN")} · ${r.bpm} BPM · ${r.completed ? "完整演奏" : "提前结束"}</small></span><strong>${r.score === null ? "数据不足" : `${r.score} 分`}</strong></summary>${performanceReport(r, true, previous)}</details>`;
  }).join("");
}

export function historyPage(state, stats) {
  const total = state.sessions.reduce(
    (sum, session) => sum + session.seconds,
    0,
  );
  const insights = practiceInsights(state.sessions);
  const noteText = (id) => id ? noteLabel(NOTES.find((note) => note.id === id) || NOTES[0]) : "暂无数据";
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
    <section class="card history-insights"><div class="section-heading"><h2>练习趋势</h2><span>连续练习 ${insights.streak} 天 · ${insights.totalDays} 个练习日</span></div><div class="history-trends">${renderTrend(insights.week, "最近 7 天")}${renderTrend(insights.month, "最近 30 天")}</div><div class="history-insight-grid"><div><span>最常练音</span><strong>${noteText(insights.topNote)}</strong></div><div><span>最容易偏低</span><strong>${noteText(insights.lowNote)}</strong></div><div><span>最容易偏高</span><strong>${noteText(insights.highNote)}</strong></div></div></section>
    <section class="card history-data-tools"><div><h2>本机数据管理</h2><p>练习时长、进度和报告仅保存在这台设备，不录音、不上传。可导出 JSON 备份或换设备导入。</p></div><div class="history-data-actions"><button class="button button-outline" data-action="export-data">${icon("down")} 导出数据</button><button class="button button-outline" data-action="import-data">${icon("book")} 导入数据</button><button class="button button-outline danger-action" data-action="clear-data">清空练习记录</button><input id="history-import-input" type="file" accept="application/json,.json" hidden></div></section>
    <section class="card report-history"><div class="section-heading"><h2>演奏报告</h2><span>最近 20 份 · 仅存本机</span></div><div id="history-reports-container">${renderReports(state.reports)}</div></section>
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

export function practiceInsights(sessions = [], now = Date.now()) {
  const keyOf = (at) => { const date = new Date(at); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  const byDay = new Map(), notes = new Map(), low = new Map(), high = new Map();
  sessions.forEach((session) => {
    byDay.set(keyOf(session.at), (byDay.get(keyOf(session.at)) || 0) + session.seconds);
    (session.notes || []).forEach((id) => notes.set(id, (notes.get(id) || 0) + 1));
    (session.lowNotes || []).forEach((id) => low.set(id, (low.get(id) || 0) + 1));
    (session.highNotes || []).forEach((id) => high.set(id, (high.get(id) || 0) + 1));
  });
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const cursor = new Date(now); cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 366 && byDay.has(keyOf(cursor)); i += 1) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  const trend = (count) => Array.from({ length: count }, (_, i) => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (count - i - 1)); return { label: `${date.getMonth() + 1}/${date.getDate()}`, seconds: byDay.get(keyOf(date)) || 0 }; });
  return { streak, totalDays: byDay.size, topNote: top(notes), lowNote: top(low), highNote: top(high), week: trend(7), month: trend(30) };
}

export function renderTrend(trend, label) {
  const max = Math.max(60, ...trend.map((item) => item.seconds));
  return `<div class="history-trend"><div class="trend-header"><strong>${label}</strong><span>练习时长</span></div><div class="trend-bars" aria-label="${label}练习时长趋势">${trend.map((item) => `<div class="trend-bar" title="${item.label}：${Math.floor(item.seconds / 60)} 分钟"><i style="height:${Math.max(3, Math.round(item.seconds / max * 100))}%"></i><small>${item.label}</small></div>`).join("")}</div></div>`;
}

export class HistoryPage {
  constructor(context) {
    this.context = context;
    this.container = null;
    this.unsubscribe = null;
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
  }

  mount(container) {
    this.container = container;
    const state = this.context.store.getState();
    const stats = calculateTodayStats(state.sessions);
    this.container.innerHTML = historyPage(state, stats);

    this.container.addEventListener("click", this.boundClickHandler);
    this.container.addEventListener("change", this.boundChangeHandler);

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
      this.container.removeEventListener("change", this.boundChangeHandler);
      this.container.innerHTML = "";
      this.container = null;
    }
  }

  update(state, changedKeys) {
    if (changedKeys.has("reports")) {
      const reports = this.container?.querySelector("#history-reports-container");
      if (reports) reports.innerHTML = renderReports(state.reports);
    }
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
      const insights = this.container?.querySelector(".history-insights");
      if (insights) {
        const next = document.createElement("div");
        next.innerHTML = historyPage(state, calculateTodayStats(state.sessions));
        insights.replaceWith(next.querySelector(".history-insights"));
      }
    }
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "karaoke-export") {
      const report = this.context.store.getState().reports.find((r) => r.id === button.dataset.report);
      if (report) exportPerformanceReport(report);
      return;
    }
    if (action === "practice") {
      this.context.router.navigate("practice");
    } else if (action === "export-data") {
      const data = JSON.stringify(this.context.store.exportData(), null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `dizimate-data-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
      this.context.shell.toast("数据已导出到本机");
    } else if (action === "import-data") {
      this.container.querySelector("#history-import-input")?.click();
    } else if (action === "clear-data") {
      if (window.confirm("确定清空练习记录和演奏报告吗？此操作无法撤销。")) { this.context.store.clearPracticeData(); this.context.shell.toast("练习记录已清空"); }
    }
  }

  handleChange(event) {
    if (event.target.id !== "history-import-input" || !event.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const result = this.context.store.importData(JSON.parse(reader.result)); this.context.shell.toast(result.ok ? "数据已导入" : result.error); }
      catch { this.context.shell.toast("导入失败：请选择笛伴导出的 JSON 文件"); }
      event.target.value = "";
    };
    reader.readAsText(event.target.files[0]);
  }
}
