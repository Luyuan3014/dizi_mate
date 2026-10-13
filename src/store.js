import { NOTES, LESSONS, readSaved } from "./music.js";
import { readReports } from "./song-performance.js";

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
    sessionStarted: 0,
    metronome: { bpm: 60, beats: 4, open: false, running: false },
    practiceTargetMinutes: saved.practiceTargetMinutes ?? 3,
    practiceElapsedSeconds: saved.practiceElapsedDate === today ? (saved.practiceElapsedSeconds ?? 0) : 0,
    practiceElapsedDate: today,
    practiceResume: saved.practiceResume || null,
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
    addSession(seconds, notes = []) {
      if (seconds < 1) return;
      const sessions = [
        ...state.sessions,
        {
          at: Date.now(),
          seconds,
          notes: [...notes],
        },
      ].slice(-100);
      this.setState({ sessions });
      this.save();
    },
    todayStats() {
      return calculateTodayStats(state.sessions);
    },
  };
}
