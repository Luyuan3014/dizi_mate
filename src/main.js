import "./style.css";
import "./views.css";
import { NOTES } from "./music.js";
import { createStore } from "./store.js";
import { AppShell } from "./shell.js";
import { Router } from "./router.js";
import { AudioService } from "./audio-service.js";
import { PracticePage } from "./views/practice.js";
import { FingeringPage } from "./views/fingering.js";
import { TunerPage } from "./views/tuner.js";
import { LongTonePage } from "./views/long-tone.js";
import { NotationPage } from "./views/notation.js";
import { SongsPage } from "./views/songs.js";
import { HistoryPage } from "./views/history.js";

const app = document.querySelector("#app");
const store = createStore();

const context = {
  store,
  shell: null,
  router: null,
  audioService: null,
};

const shell = new AppShell(app, {
  onNavigate: (pageId) => {
    context.router.navigate(pageId);
  },
  onSettingsSaved: ({ key, reference, tolerance }) => {
    store.setState({
      key,
      reference,
      tolerance,
      passed: new Set(),
      challenge: null,
      longArmed: false,
    });
    store.save();
    shell.updateInstrument(key);
    shell.toast(`已切换为 ${key} 调竹笛，继续慢慢练。`);
  },
  onModalOpen: (type) => {
    context.audioService.stopAll();
    shell.openModal(type, store.getState());
  },
  onModalClose: () => {
    // Modal closed
  },
});
context.shell = shell;

const mainContent = shell.mount(store.getState());

const audioService = new AudioService({
  store,
  shell,
  getActivePage: () => context.router?.getCurrentPage(),
});
context.audioService = audioService;

const routes = {
  practice: (ctx) => new PracticePage(ctx),
  fingering: (ctx) => new FingeringPage(ctx),
  tuner: (ctx) => new TunerPage(ctx),
  "long-tone": (ctx) => new LongTonePage(ctx),
  notation: (ctx) => new NotationPage(ctx),
  songs: (ctx) => new SongsPage(ctx),
  history: (ctx) => new HistoryPage(ctx),
};

const router = new Router({
  container: mainContent,
  context,
  routes,
  onBeforeNavigate: (oldPageId, newPageId) => {
    audioService.stopAll();
    store.setState({ page: newPageId });
    if (newPageId === "practice") {
      const state = store.getState();
      const noteId = state.lesson.sequence[state.index];
      const note = NOTES.find((n) => n.id === noteId);
      if (note) store.setState({ note });
    }
  },
  onAfterNavigate: (pageId) => {
    shell.updateNav(pageId);
  },
});
context.router = router;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audioService.stopAll();
  }
});

window.addEventListener("pagehide", () => {
  audioService.stopAll();
});

router.init("practice");
