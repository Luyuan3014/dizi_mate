const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const clamp = (value) => Math.max(0, Math.min(1, value));
const weightedMean = (points, field) => points.reduce((sum, p) => sum + p[field] * p.dt, 0) / Math.max(1e-9, points.reduce((sum, p) => sum + p.dt, 0));
function pitchSpread(points) {
  const cents = points.map((p) => ({ dt: p.dt, cents: 1200 * Math.log2(p.frequency) }));
  const average = weightedMean(cents, "cents");
  return Math.sqrt(weightedMean(cents.map((p) => ({ dt: p.dt, variance: (p.cents - average) ** 2 })), "variance"));
}

// These are signal observations, not a calibrated bamboo-flute timbre score.
export function analyseTone(samples, spectrum, sampleRate, frequency, processing = false) {
  const center = mean(samples);
  let energy = 0, clipped = 0;
  for (const value of samples) {
    energy += (value - center) ** 2;
    if (Math.abs(value) >= 0.985) clipped++;
  }
  const rms = Math.sqrt(energy / samples.length);
  let periodicity = null, harmonicRatio = null;
  if (frequency && rms >= 0.008) {
    const lag = sampleRate / frequency;
    const wholeLag = Math.floor(lag), fraction = lag - wholeLag;
    let cross = 0, first = 0, second = 0;
    for (let i = 0; i + wholeLag + 1 < samples.length; i++) {
      const a = samples[i] - center;
      const b = samples[i + wholeLag] * (1 - fraction) + samples[i + wholeLag + 1] * fraction - center;
      cross += a * b;
      first += a * a;
      second += b * b;
    }
    periodicity = first && second ? clamp(cross / Math.sqrt(first * second)) : null;
    const binWidth = sampleRate / samples.length;
    let total = 0, harmonic = 0;
    for (let i = Math.ceil(180 / binWidth); i < spectrum.length && i * binWidth <= 8000; i++) {
      const power = Number.isFinite(spectrum[i]) ? 10 ** (spectrum[i] / 10) : 0;
      const hz = i * binWidth;
      const multiple = Math.round(hz / frequency);
      total += power;
      // Include the FFT main lobe of every harmonic, not only the fundamental.
      if (multiple >= 1 && Math.abs(hz - multiple * frequency) <= 2 * binWidth) harmonic += power;
    }
    harmonicRatio = total > 1e-12 ? clamp(harmonic / total) : null;
  }
  return { rms, periodicity, harmonicRatio, clipped: clipped / samples.length > 0.001, processing };
}

export class ToneTracker {
  constructor() { this.reset(); }

  reset({ keepPrevious = false } = {}) {
    this.previous = keepPrevious ? this.summary || this.previous : null;
    this.points = [];
    this.started = null;
    this.last = null;
    this.lastVoice = null;
    this.lastFrequency = null;
    this.breaks = 0;
    this.silentBreak = false;
    this.octaves = 0;
    this.finished = false;
    this.excluded = false;
    this.summary = null;
  }

  finish() {
    if (this.finished || this.started === null) return this.summary;
    const sustained = this.points.filter((p) => p.time <= this.lastVoice && p.time >= this.started + 250);
    const valid = sustained.filter((p) => p.valid);
    const duration = valid.reduce((sum, p) => sum + p.dt, 0);
    const totalDuration = sustained.reduce((sum, p) => sum + p.dt, 0);
    this.summary = duration >= 0.6 && duration / Math.max(totalDuration, 0.001) >= 0.7 ? {
      harmonicRatio: weightedMean(valid, "harmonicRatio"),
      periodicity: weightedMean(valid, "periodicity"),
      spread: pitchSpread(valid),
      centerFrequency: 2 ** weightedMean(valid.map((p) => ({ dt: p.dt, frequency: Math.log2(p.frequency) })), "frequency"),
      continuity: totalDuration ? sustained.filter((p) => p.voiced).reduce((sum, p) => sum + p.dt, 0) / totalDuration : 0,
      breaks: this.breaks, octaves: this.octaves,
      duration, previous: this.previous ? { harmonicRatio: this.previous.harmonicRatio, centerFrequency: this.previous.centerFrequency, octaves: this.previous.octaves } : null,
    } : null;
    this.finished = true;
    return this.summary;
  }

  exclude(now) {
    this.last = now;
    this.excluded = true;
    this.points.push({ time: now, dt: 0, valid: false, voiced: false, reason: "excluded" });
    this.points = this.points.filter((p) => now - p.time <= 30000);
  }

  update(now, frame, { noiseFloor = 0, noisy = false, compatible = false } = {}) {
    const signal = frame.tone;
    const frequency = frame.rawFrequency ?? frame.frequency;
    const voiced = Boolean(frequency && signal && signal.rms >= Math.max(0.008, noiseFloor * 2));
    const excluded = this.excluded;
    this.excluded = false;
    const gap = this.last !== null && now - this.last > 250;
    if (gap) {
      this.finish();
      this.reset();
    }
    if (this.finished && voiced) {
      const previous = this.summary || this.previous;
      this.reset();
      this.previous = previous;
    }
    if (this.started === null && voiced) this.started = now;
    const dt = this.last === null || excluded ? 0 : Math.min(0.15, Math.max(0, (now - this.last) / 1000));
    const reason = !signal ? "unavailable" : compatible || signal.processing ? "processing"
      : signal.clipped ? "clipped" : noisy || (noiseFloor > 0 && signal.rms < noiseFloor * 3 && signal.rms >= 0.008) ? "environment"
        : !voiced ? signal.rms >= 0.008 ? "unresolved" : "quiet" : null;
    if (!excluded && reason === "quiet" && this.lastVoice !== null && now - this.lastVoice > 180) this.silentBreak = true;
    if (voiced && !this.finished) {
      if (!excluded && this.silentBreak) this.breaks++;
      this.silentBreak = false;
      if (!excluded && this.lastFrequency && this.lastVoice !== null && now - this.lastVoice <= 180) {
        const jump = Math.abs(1200 * Math.log2(frequency / this.lastFrequency));
        if (jump > 900 && jump < 1500) this.octaves++;
      }
      this.lastVoice = now;
      this.lastFrequency = frequency;
    }
    const valid = !reason && this.started !== null && now - this.started >= 250
      && Number.isFinite(signal?.periodicity) && Number.isFinite(signal?.harmonicRatio);
    const point = { time: now, dt, frequency, voiced, valid, reason,
      harmonicRatio: valid ? signal.harmonicRatio : null, periodicity: valid ? signal.periodicity : null };
    this.points.push(point);
    this.points = this.points.filter((p) => now - p.time <= 30000);
    this.last = now;
    if (this.started !== null && !voiced && now - this.lastVoice >= 600) this.finish();
    const window = this.points.filter((p) => now - p.time <= 1500 && p.valid);
    const enough = window.reduce((sum, p) => sum + p.dt, 0) >= 0.6;
    const harmonicRatio = enough ? weightedMean(window, "harmonicRatio") : null;
    const periodicity = enough ? weightedMean(window, "periodicity") : null;
    const spread = enough ? pitchSpread(window) : null;
    return { reason, enough, harmonicRatio, periodicity, spread, voiced, summary: this.summary,
      breaks: this.breaks, octaves: this.octaves, gap };
  }
}

export function toneFeedback(result) {
  const messages = {
    unavailable: ["暂无发音数据", "重新开启麦克风后再试一次。"],
    processing: ["拾音处理影响观察", "可切换高精度模式；设备降噪会改变声音结构。"],
    clipped: ["输入声音失真", "将设备稍微移远，避开直吹气流后再试。"],
    environment: ["环境影响较大", "到安静处重新开启麦克风，保持拾音距离。"],
    unresolved: ["还没有听清稳定单音", "先保持风门位置，轻轻送气，再试一声。"],
    quiet: ["等待下一口气", "保持设备位置，吹一个持续的单音。"],
  };
  if (result.reason) return { kind: "uncertain", title: messages[result.reason][0], advice: messages[result.reason][1] };
  if (!result.enough) return { kind: "uncertain", title: "正在观察持续段", advice: "均匀送气，保持这个音。" };
  if (result.octaves) return { kind: "attention", title: "出现明显八度跳动", advice: "先保持风门和气速，尝试让声音停留在同一音区。" };
  if (result.spread > 25) return { kind: "attention", title: "音高起伏较明显", advice: "保持嘴型与送气，再观察下一口气。" };
  if (result.harmonicRatio < 0.72 || result.periodicity < 0.85) return { kind: "attention", title: "背景成分较明显", advice: "尝试小幅调整吹孔角度，比较声音主体是否更明显。" };
  return { kind: "observed", title: "声音主体较明显", advice: "保持这次的风门与送气，再吹一口气比较。" };
}
