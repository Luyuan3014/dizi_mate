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

  getFluteWave() {
    if (!this.fluteWave && this.context) {
      const real = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
      const imag = new Float32Array([0, 1.0, 0.38, 0.22, 0.11, 0.06, 0.035, 0.018]);
      this.fluteWave = this.context.createPeriodicWave(real, imag);
    }
    return this.fluteWave;
  }

  async tone(frequency, duration = 1.5) {
    const context = await this.ready();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const wave = this.getFluteWave();
    if (wave) {
      oscillator.setPeriodicWave(wave);
    } else {
      oscillator.type = "triangle";
    }
    oscillator.frequency.setValueAtTime(frequency, now);

    // Subtle natural breath vibrato
    const vibrato = context.createOscillator();
    const vibratoGain = context.createGain();
    vibrato.frequency.setValueAtTime(4.6, now);
    vibratoGain.gain.setValueAtTime(frequency * 0.0025, now);
    vibrato.connect(oscillator.frequency);

    // Acoustic lowpass filter modeling bamboo body resonance
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.max(3200, frequency * 3.5), now);
    filter.Q.setValueAtTime(1.0, now);

    // Dynamic envelope (breath attack, sustain, gentle release)
    const gain = context.createGain();
    const attack = 0.05;
    const release = 0.14;
    const peakVolume = 0.15;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVolume, now + attack);
    gain.gain.setValueAtTime(
      peakVolume,
      now + Math.max(attack + 0.01, duration - release),
    );
    gain.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    this.mutedUntil = Math.max(
      this.mutedUntil,
      performance.now() + duration * 1000 + 400,
    );
    this.oscillators.add(oscillator);
    this.oscillators.add(vibrato);

    oscillator.onended = () => {
      this.oscillators.delete(oscillator);
      this.oscillators.delete(vibrato);
      try {
        vibrato.stop();
      } catch {}
      oscillator.disconnect();
      vibrato.disconnect();
      vibratoGain.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    vibrato.start(now + 0.08);
    vibrato.stop(now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  stopTones() {
    this.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
    });
    this.oscillators.clear();
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
