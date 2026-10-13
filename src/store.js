import { NOTES, LESSONS, readSaved } from "./music.js";
import { readReports } from "./song-performance.js";

export const USER_DATA_VERSION = 2;

export function exportUserData(state) {
  return { version: USER_DATA_VERSION, exportedAt: new Date().toISOString(), settings: { key: state.key, reference: state.reference, tolerance: state.tolerance, practiceTargetMinutes: state.practiceTargetMinutes }, sessions: state.sessions || [], reports: state.reports || [], notationProgress: state.notationProgress || [], favoriteSongs: state.favoriteSongs || [], recentSongs: state.recentSongs || [], songProgress: state.songProgress || {} };
}

export function validateImportedData(payload) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "文件内容不是 JSON 对象" };
  if (![1, 2].includes(payload.version)) return { ok: false, error: "数据版本不受支持，请重新导出文件" };
  if (payload.sessions !== undefined && !Array.isArray(payload.sessions)) return { ok: false, error: "练习记录格式不正确" };
  if (payload.reports !== undefined && !Array.isArray(payload.reports)) return { ok: false, error: "演奏报告格式不正确" };
  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
  return { ok: true, data: {
    key: ["C", "D", "E", "F", "G"].includes(settings.key) ? settings.key : "E",
    reference: Number.isFinite(settings.reference) ? Math.max(430, Math.min(450, settings.reference)) : 440,
    tolerance: [20, 35, 50].includes(settings.tolerance) ? settings.tolerance : 35,
    practiceTargetMinutes: [0, 3, 5].includes(settings.practiceTargetMinutes) ? settings.practiceTargetMinutes : 3,
    sessions: Array.isArray(payload.sessions) ? payload.sessions.filter((s) => s && Number.isFinite(s.at) && Number.isFinite(s.seconds) && s.seconds >= 0 && Array.isArray(s.notes)).slice(-100).map((s) => ({ ...s, seconds: Math.min(s.seconds, 86400), notes: s.notes.filter((id) => typeof id === "string"), lowNotes: Array.isArray(s.lowNotes) ? s.lowNotes.filter((id) => typeof id === "string") : [], highNotes: Array.isArray(s.highNotes) ? s.highNotes.filter((id) => typeof id === "string") : [] })) : [],
    reports: Array.isArray(payload.reports) ? payload.reports.slice(-20) : [],
    notationProgress: Array.isArray(payload.notationProgress) ? payload.notationProgress.filter((id) => typeof id === "string").slice(0, 100) : [],
    favoriteSongs: Array.isArray(payload.favoriteSongs) ? payload.favoriteSongs.filter((id) => typeof id === "string").slice(0, 100) : [],
    recentSongs: Array.isArray(payload.recentSongs) ? payload.recentSongs.filter((id) => typeof id === "string").slice(0, 20) : [],
    songProgress: payload.songProgress && typeof payload.songProgress === "object" && !Array.isArray(payload.songProgress) ? payload.songProgress : {},
  }};
}

export function createInitialState() {
  let saved;
  try {
    saved =
      typeof localStorage !== "undefined"
        ? readSaved(localStorage)
        : readSaved({ getItem: () => null });
  } catch {
    saved = readSaved({ getItem: () => null });
  }

  const savedLesson = saved.practiceResume && LESSONS.find((lesson) => lesson.id === saved.practiceResume.lessonId);
  const initialLesson = savedLesson || LESSONS[0];
  const initialIndex = savedLesson ? Math.min(saved.practiceResume.index, initialLesson.sequence.length - 1) : 0;
  const initialNote = NOTES.find((n) => n.id === initialLesson.sequence[initialIndex]) || NOTES[0];
  const today = new Date().toDateString();

  return {
    ...saved,
    reports: (() => { try { return typeof localStorage !== "undefined" ? readReports(localStorage) : []; } catch { return []; } })(),
    page: "practice",
    lesson: initialLesson,
    index: initialIndex,
    note: initialNote,
    customHoles: null,
    mic: "off",
    micStatus: "idle",
    micMode: "precise",
    micLevel: 0,
    micNoise: "unknown",
    demo: false,
    passed: new Set(),
    sessionNotes: new Set(),
    sessionDirections: { low: {}, high: {} },
    sessionStarted: 0,
    metronome: { bpm: 60, beats: 4, open: false, running: false },
    practiceTargetMinutes: saved.practiceTargetMinutes ?? 3,
    practiceElapsedSeconds: saved.practiceElapsedDate === today ? (saved.practiceElapsedSeconds ?? 0) : 0,
    practiceElapsedDate: today,
    practiceResume: saved.practiceResume || null,
    notationProgress: saved.notationProgress || [],
    favoriteSongs: saved.favoriteSongs || [],
    songProgress: saved.songProgress || {},
    recentSongs: saved.recentSongs || [],
    longNote: initialNote,
    longArmed: false,
    challenge: null,
  };
}

export function saveSettings(state) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "dizimate-v1",
        JSON.stringify({
          key: state.key,
          reference: state.reference,
          tolerance: state.tolerance,
          sessions: state.sessions,
          practiceTargetMinutes: state.practiceTargetMinutes,
          practiceElapsedSeconds: state.practiceElapsedSeconds,
          practiceElapsedDate: state.practiceElapsedDate,
          practiceResume: state.practiceResume,
          notationProgress: state.notationProgress,
          favoriteSongs: state.favoriteSongs,
          songProgress: state.songProgress,
          recentSongs: state.recentSongs,
        }),
      );
      localStorage.setItem("dizimate-reports-v1", JSON.stringify(state.reports || []));
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Storage save failed:", error);
    return false;
  }
}

export function calculateTodayStats(sessions = []) {
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(
    (session) => new Date(session.at).toDateString() === today,
  );
  return {
    seconds: todaySessions.reduce((sum, s) => sum + s.seconds, 0),
    notes: new Set(todaySessions.flatMap((s) => s.notes)).size,
  };
}

export function createStore(initialState = createInitialState()) {
  let state = { reports: [], ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(patch) {
      const prev = state;
      const updates = typeof patch === "function" ? patch(state) : patch;
      const next = { ...state, ...updates };
      const changedKeys = new Set();
      for (const k in next) {
        if (next[k] !== prev[k]) changedKeys.add(k);
      }
      if (changedKeys.size === 0) return;
      state = next;
      for (const listener of listeners) {
        try {
          listener(state, changedKeys, prev);
        } catch (err) {
          console.error("Store listener error:", err);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save() {
      return saveSettings(state);
    },
    addReport(report) {
      if (state.reports.some((r) => r.id === report.id)) return true;
      this.setState({ reports: [...state.reports, report].slice(-20) });
      return this.save();
    },
    addSession(seconds, notes = [], meta = {}) {
      if (seconds < 1) return;
      const sessions = [
        ...state.sessions,
        {
          at: Date.now(),
          seconds,
          notes: [...notes],
          lowNotes: Array.isArray(meta.lowNotes) ? [...meta.lowNotes] : [],
          highNotes: Array.isArray(meta.highNotes) ? [...meta.highNotes] : [],
        },
      ].slice(-100);
      this.setState({ sessions });
      this.save();
    },
    toggleNotationProgress(id) {
      if (typeof id !== "string") return;
      const progress = new Set(state.notationProgress || []);
      progress.has(id) ? progress.delete(id) : progress.add(id);
      this.setState({ notationProgress: [...progress] });
      this.save();
    },
    toggleFavoriteSong(id) {
      if (typeof id !== "string") return;
      const favorites = new Set(state.favoriteSongs || []);
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      this.setState({ favoriteSongs: [...favorites] });
      this.save();
    },
    updateSongProgress(id, patch = {}) {
      if (typeof id !== "string") return;
      const current = state.songProgress || {};
      this.setState({ songProgress: { ...current, [id]: { ...(current[id] || {}), ...patch, lastAt: patch.lastAt || Date.now() } }, recentSongs: [id, ...(state.recentSongs || []).filter((item) => item !== id)].slice(0, 20) });
      this.save();
    },
    exportData() {
      return exportUserData(state);
    },
    importData(payload) {
      const result = validateImportedData(payload);
      if (!result.ok) return result;
      this.setState({ ...result.data, practiceElapsedSeconds: 0, practiceElapsedDate: new Date().toDateString(), practiceResume: null });
      this.save();
      return result;
    },
    clearPracticeData() {
      this.setState({ sessions: [], reports: [], songProgress: {}, recentSongs: [], practiceElapsedSeconds: 0 });
      return this.save();
    },
    todayStats() {
      return calculateTodayStats(state.sessions);
    },
  };
}
