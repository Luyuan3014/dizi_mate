// YIN: normalized difference rejects weak/noisy signals and favors the fundamental.
export function detectPitch(samples, sampleRate) {
  const size = Math.floor(samples.length / 2);
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  const rms = Math.sqrt(energy / samples.length);
  if (rms < 0.008) return { frequency: null, rms };
  const minLag = Math.max(2, Math.floor(sampleRate / 2000));
  const maxLag = Math.min(size - 1, Math.ceil(sampleRate / 180));
  const difference = new Float32Array(maxLag + 1);
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const delta = samples[i] - samples[i + lag];
      sum += delta * delta;
    }
    cumulative += sum;
    difference[lag] = cumulative ? (sum * lag) / cumulative : 1;
  }
  for (let lag = minLag; lag < maxLag; lag++) {
    if (difference[lag] < 0.12) {
      while (lag + 1 < maxLag && difference[lag + 1] < difference[lag]) lag++;
      const left = difference[lag - 1];
      const center = difference[lag];
      const right = difference[lag + 1];
      const denominator = 2 * (2 * center - right - left);
      const shift = denominator ? (right - left) / denominator : 0;
      return { frequency: sampleRate / (lag + shift), rms };
    }
  }
  return { frequency: null, rms };
}

export class AudioEngine {
  context = null;
  stream = null;
  source = null;
  frame = null;
  mutedUntil = 0;
  oscillators = new Set();
  requestId = 0;

  async ready() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext)
      throw new Error(
        "这个浏览器暂不支持音频处理，请使用新版 Chrome、Edge 或 Safari。",
      );
    this.context ||= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    if (this.context.state !== "running")
      throw new Error("音频没有启动，请再点击一次重试。");
    return this.context;
  }

  async tone(frequency, duration = 1.5) {
    const context = await this.ready();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.06);
    gain.gain.setValueAtTime(
      0.12,
      context.currentTime + Math.max(0.07, duration - 0.12),
    );
    gain.gain.linearRampToValueAtTime(0, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    this.mutedUntil = Math.max(
      this.mutedUntil,
      performance.now() + duration * 1000 + 400,
    );
    this.oscillators.add(oscillator);
    oscillator.onended = () => {
      this.oscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  stopTones() {
    this.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
    });
    this.mutedUntil = performance.now() + 400;
  }

  async start(onFrame, onEnded) {
    this.stop();
    const requestId = this.requestId;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "麦克风需要 HTTPS 或 localhost。请在本机 localhost 地址打开，或部署到 HTTPS。",
      );
    await this.ready();
    if (requestId !== this.requestId) return false;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
    if (requestId !== this.requestId) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    try {
      this.stream = stream;
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 4096;
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(analyser);
      stream.getAudioTracks()[0].onended = onEnded;
      const samples = new Float32Array(analyser.fftSize);
      let last = 0;
      // ponytail: small YIN windows run on the main thread; use an AudioWorklet if real-device profiling shows dropped frames.
      const tick = (now) => {
        if (now - last >= 70) {
          last = now;
          analyser.getFloatTimeDomainData(samples);
          onFrame(
            now < this.mutedUntil
              ? { frequency: null, rms: 0, referencePlaying: true }
              : detectPitch(samples, this.context.sampleRate),
          );
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
      return true;
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop() {
    this.requestId++;
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.source?.disconnect();
    this.source = null;
    this.stream = null;
  }
}
