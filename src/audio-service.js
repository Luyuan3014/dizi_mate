import { AudioEngine } from "./audio.js";
import { Metronome } from "./metronome.js";
import { ConfidenceBucket } from "./practice.js";
import { NOTES, frequencyFor, noteLabel, pitchNameFor } from "./music.js";

export class AudioService {
  constructor({ store, shell, getActivePage }) {
    this.store = store;
    this.shell = shell;
    this.getActivePage = getActivePage;

    this.engine = new AudioEngine();
    this.confidence = new ConfidenceBucket();
    this.demoTimer = null;
    this.demoGeneration = 0;
    this.micGeneration = 0;

    this.metronome = new Metronome(
      this.engine,
      (beat, index) => this.handleMetronomeBeat(beat, index),
      () => {
        this.stopDemo();
        this.syncMetronomeState();
      },
    );
  }

  async startMic() {
    const state = this.store.getState();
    if (state.mic !== "off") {
      this.stopMic();
      return;
    }
    this.stopDemo();
    this.store.setState({ mic: "requesting", micStatus: "requesting", micNoise: "unknown", micLevel: 0 });
    const generation = ++this.micGeneration;

    try {
      const started = await this.engine.start(
        (data) => this.handleAudioFrame(data),
        () => {
          this.stopMic();
          this.store.setState({ micStatus: "interrupted" });
          const page = this.getActivePage();
          if (page?.setFeedback) {
            page.setFeedback(
              "麦克风连接中断了",
              "重新连接麦克风后，再点击下方按钮。",
            );
          }
        },
        { mode: state.micMode || "precise", observeTone: Boolean(this.getActivePage()?.observeTone) },
      );
      if (!started || generation !== this.micGeneration) return;
      this.store.setState({
        mic: "on",
        micStatus: "testing",
      });
      this.noiseSamples = [];
      this.toneNoiseSamples = [];
      const tested = await new Promise((resolve) => {
        this.resolveMicTest = resolve;
        this.micTestTimer = setTimeout(() => { this.resolveMicTest = null; resolve(true); }, 1000);
      });
      if (!tested || generation !== this.micGeneration) return;
      const noise = this.noiseSamples.reduce((sum, rms) => sum + rms, 0) / Math.max(1, this.noiseSamples.length);
      this.toneNoiseFloor = this.toneNoiseSamples.reduce((sum, rms) => sum + rms, 0) / Math.max(1, this.toneNoiseSamples.length);
      this.store.setState({ micStatus: "ready", micNoise: noise > 0.015 ? "noisy" : "quiet", sessionStarted: performance.now() });
      const page = this.getActivePage();
      if (page?.setFeedback) {
        page.setFeedback(
          "准备好了，轻轻吹一声",
          "让麦克风离笛子约 30–50 厘米，避开直吹气流。",
        );
      }
    } catch (error) {
      if (generation !== this.micGeneration) return;
      this.stopMic();
      const messages = {
        SecurityError: "当前页面无法使用麦克风。请改用 localhost 或 HTTPS 地址。",
        NotSupportedError: "当前浏览器不支持音频处理，请更新 Chrome、Edge 或 Safari。",
        NotAllowedError:
          "麦克风未获授权。请在地址栏的权限设置里允许麦克风，再重试。",
        NotFoundError: "没有找到麦克风。连接设备后，再试一次。",
        NotReadableError:
          "麦克风可能正被其他应用占用。关闭占用的应用后，再试一次。",
        AbortError: "麦克风启动中断了，请重新尝试。",
      };
      const title = "还没有听到你的声音";
      const copy =
        messages[error.name] || error.message || "麦克风暂时不可用，请稍后重试。";
      this.store.setState({ micStatus: this.statusForMicError(error) });
      const page = this.getActivePage();
      if (page?.setFeedback) {
        page.setFeedback(title, copy);
      } else {
        this.shell.toast(copy);
      }
    }
  }

  stopMic() {
    const state = this.store.getState();
    const activePage = this.getActivePage();
    activePage?.onMicStopped?.();
    if (activePage?.onFinishLongTone) {
      activePage.onFinishLongTone();
    }
    this.micGeneration++;
    clearTimeout(this.micTestTimer);
    this.resolveMicTest?.(false);
    this.resolveMicTest = null;
    this.engine.stop();
    this.toneNoiseFloor = 0;
    if (state.sessionStarted) {
      const seconds = Math.round(
        (performance.now() - state.sessionStarted) / 1000,
      );
      if (seconds >= 1) {
        const directions = state.sessionDirections || { low: {}, high: {} };
        this.store.addSession(seconds, state.sessionNotes, {
          lowNotes: Object.entries(directions.low || {}).flatMap(([id, count]) => Array(Math.min(20, count)).fill(id)),
          highNotes: Object.entries(directions.high || {}).flatMap(([id, count]) => Array(Math.min(20, count)).fill(id)),
        });
        this.store.setState({
          practiceElapsedSeconds: (state.practiceElapsedSeconds || 0) + seconds,
          practiceResume: state.lesson ? { lessonId: state.lesson.id, index: state.index || 0 } : state.practiceResume,
        });
        this.store.save();
      }
    }
    this.confidence.reset();
    this.engine.smoother.reset();
    this.store.setState({
      mic: "off",
      micStatus: "idle",
      micLevel: 0,
      micNoise: "unknown",
      sessionStarted: 0,
      sessionNotes: new Set(),
      sessionDirections: { low: {}, high: {} },
    });
  }

  handleAudioFrame(data) {
    const state = this.store.getState();
    if (state.mic !== "on") return;
    const now = performance.now();
    const level = Math.max(0, Math.min(1, (data.rms || 0) * 8));
    this.store.setState({
      micLevel: level,
    });
    if (state.micStatus === "testing") {
      if (!data.referencePlaying && !data.metronomeBeat) {
        this.noiseSamples?.push(data.rms || 0);
        if (data.tone) this.toneNoiseSamples?.push(data.tone.rms);
      }
      return;
    }
    if (this.getActivePage()?.consumeAudioFrame?.(data)) return;

    if (data.referencePlaying) {
      this.confidence.reset();
      const page = this.getActivePage();
      page?.onReferencePlaying?.();
      return;
    }

    if (data.metronomeBeat) {
      this.confidence.pause(now);
      this.getActivePage()?.onToneExcluded?.();
      return;
    }

    const page = this.getActivePage();
    page?.onAudioFrame?.(data, {
      confidence: this.confidence,
      engine: this.engine,
      toneEnvironment: { noiseFloor: this.toneNoiseFloor || 0, noisy: this.toneNoiseFloor > 0.015, compatible: state.micMode === "compatible" },
    });
  }

  statusForMicError(error) {
    return ({
      NotAllowedError: "denied",
      NotFoundError: "missing",
      NotReadableError: "busy",
      AbortError: "interrupted",
      SecurityError: "insecure",
      NotSupportedError: "unsupported",
    })[error?.name] || "error";
  }

  stopDemo() {
    if (this.metronome.sequence) {
      this.stopMetronome();
    }
    this.confidence.reset();
    this.engine.smoother.reset();
    this.demoGeneration++;
    clearTimeout(this.demoTimer);
    this.store.setState({ demo: false });
    this.engine.stopTones();
    const page = this.getActivePage();
    page?.onStopDemo?.();
  }

  async listen(note) {
    const state = this.store.getState();
    const activePage = this.getActivePage();
    if (activePage?.onFinishLongTone) {
      activePage.onFinishLongTone();
    }

    if (state.demo) {
      this.stopDemo();
      return;
    }
    this.stopDemo();
    this.store.setState({ demo: true });
    const generation = this.demoGeneration;
    const targetNote =
      note || (state.page === "long-tone" ? state.longNote : state.note);

    try {
      await this.engine.tone(
        frequencyFor(targetNote, state.key, state.reference),
      );
      if (generation !== this.demoGeneration) {
        this.engine.stopTones();
        return;
      }
      this.shell.toast(
        `正在播放 ${noteLabel(targetNote)} (${pitchNameFor(targetNote, state.key)}) · ${Math.round(frequencyFor(targetNote, state.key, state.reference))} Hz 竹笛参考音`,
      );
      this.demoTimer = setTimeout(() => this.stopDemo(), 1600);
    } catch (error) {
      this.stopDemo();
      this.shell.toast(error.message);
    }
  }

  async playSequence(sequence, interval = 1000, follow = false) {
    if (this.store.getState().demo) {
      this.stopDemo();
      return;
    }
    this.stopDemo();
    const generation = this.demoGeneration;
    this.store.setState({ demo: true });
    let index = 0;

    const step = async () => {
      if (generation !== this.demoGeneration) return;
      if (index >= sequence.length) {
        this.stopDemo();
        this.shell.toast("听完了，换你试试看。");
        return;
      }
      if (follow) {
        const page = this.getActivePage();
        if (page?.selectNote) {
          page.selectNote(index, false);
        }
        this.store.setState({ demo: true });
      }
      const current = sequence[index++];
      try {
        if (current) {
          const state = this.store.getState();
          const targetNote = NOTES.find((n) => n.id === current);
          if (targetNote) {
            await this.engine.tone(
              frequencyFor(targetNote, state.key, state.reference),
              (interval / 1000) * 0.82,
            );
          }
        }
        if (generation !== this.demoGeneration) {
          this.engine.stopTones();
          return;
        }
        this.demoTimer = setTimeout(step, interval);
      } catch (error) {
        this.stopDemo();
        this.shell.toast(error.message);
      }
    };
    step();
  }

  syncMetronomeState() {
    const isRunning = this.metronome.running;
    const current = this.store.getState().metronome;
    if (current.running !== isRunning) {
      this.store.setState({
        metronome: { ...current, running: isRunning },
      });
    }
  }

  stopMetronome() {
    this.metronome.stop();
    this.syncMetronomeState();
  }

  async startMetronome(sequence = null) {
    const state = this.store.getState();
    const isRunning = this.metronome.running || state.metronome.running;
    if ((sequence && state.demo) || (!sequence && isRunning)) {
      this.stopDemo();
      this.stopMetronome();
      return;
    }
    this.stopDemo();
    this.stopMetronome();
    this.store.setState({
      demo: !!sequence,
      metronome: { ...state.metronome, running: true },
    });

    try {
      await this.metronome.start({
        ...state.metronome,
        sequence,
        frequencyForNote: (id) =>
          frequencyFor(
            NOTES.find((n) => n.id === id),
            state.key,
            state.reference,
          ),
      });
      this.syncMetronomeState();
    } catch (error) {
      this.stopDemo();
      this.stopMetronome();
      this.shell.toast(error.message);
    }
  }

  handleMetronomeBeat(beat, index) {
    const state = this.store.getState();
    const page = this.getActivePage();
    if (state.demo && this.metronome.sequence) {
      if (state.page === "practice" && page?.selectNote) {
        page.selectNote(index, false);
      }
    }
    page?.onBeat?.(beat, index, this.metronome.sequence);
  }

  stopAll() {
    this.getActivePage()?.onStopAll?.();
    this.stopMetronome();
    this.stopMic();
    this.stopDemo();
  }
}
