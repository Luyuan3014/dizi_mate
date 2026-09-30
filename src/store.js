import { NOTES, LESSONS, readSaved } from "./music.js";

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

  return {
    ...saved,
    page: "practice",
    lesson: LESSONS[0],
    index: 0,
    note: NOTES[0],
    customHoles: null,
    mic: "off",
    demo: false,
    passed: new Set(),
    sessionNotes: new Set(),
    sessionStarted: 0,
    metronome: { bpm: 60, beats: 4, open: false, running: false },
    longNote: NOTES[0],
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
        }),
      );
    }
  } catch (error) {
    console.warn("Storage save failed:", error);
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
  let state = { ...initialState };
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
      saveSettings(state);
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
