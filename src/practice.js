// Time-based integration so slower displays do not change the pass criterion.
export class ConfidenceBucket {
  constructor(capacity = 1.2) {
    this.capacity = capacity;
    this.reset();
  }

  reset() {
    this.value = 0;
    this.last = null;
    this.previous = null;
    this.window = [];
    this.excluded = false;
  }

  pause(now) {
    this.last = now;
    this.excluded = true;
  }

  update(now, good) {
    const elapsed = this.last === null ? 0 : (now - this.last) / 1000;
    if (elapsed > 0.25 || elapsed < 0) this.reset();
    const dt = this.last === null || this.excluded ? 0 : Math.min(0.15, Math.max(0, elapsed));
    this.excluded = false;
    // An interval counts as good only when both ends are in tune.
    const credit = good === true && this.previous === true;
    this.value = Math.max(0, Math.min(this.capacity,
      this.value + dt * (credit ? 1 : good === null ? -3 : -2)));
    this.last = now;
    this.previous = good;
    this.window.push({ now, dt, credit });
    this.window = this.window.filter((frame) => now - frame.now < 2400);
    const total = this.window.reduce((sum, frame) => sum + frame.dt, 0);
    const accurate = this.window.reduce((sum, frame) => sum + (frame.credit ? frame.dt : 0), 0);
    return {
      progress: this.value / this.capacity,
      passed: this.value >= this.capacity - 1e-9 && total > 0 && accurate / total >= 0.75,
    };
  }
}

const mean = (values) => values.reduce((sum, n) => sum + n, 0) / (values.length || 1);
const deviation = (values) => {
  const center = mean(values);
  return Math.sqrt(mean(values.map((n) => (n - center) ** 2)));
};

export function longToneScore(samples, tolerance) {
  const voiced = samples.filter((s) => Number.isFinite(s.cents));
  if (!voiced.length) return { score: 0, accuracy: 0, pitchSpread: 0, volumeSpread: 0 };
  const accuracy = voiced.filter((s) => Math.abs(s.cents) <= tolerance).length / samples.length;
  const pitchSpread = deviation(voiced.map((s) => s.cents));
  const volumeSpread = deviation(voiced.map((s) => 20 * Math.log10(Math.max(s.rms, 0.00001))));
  const score = Math.round(100 * (
    0.6 * accuracy + 0.25 * Math.max(0, 1 - pitchSpread / tolerance) +
    0.15 * Math.max(0, 1 - volumeSpread / 6)
  ));
  return { score, accuracy, pitchSpread, volumeSpread };
}

export class LongToneChallenge {
  constructor(tolerance = 35) {
    this.tolerance = tolerance;
    this.status = "waiting";
    this.samples = [];
    this.started = null;
    this.last = null;
    this.lastVoice = null;
    this.previousGood = false;
    this.streak = 0;
    this.best = 0;
    this.result = null;
  }

  update(now, cents, rms) {
    if (this.status === "finished") return;
    const voiced = Number.isFinite(cents);
    if (this.status === "waiting" && !voiced) return;
    if (this.status === "waiting") {
      this.status = "running";
      this.started = now;
    }
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000);
    const good = voiced && Math.abs(cents) <= this.tolerance;
    // Long tones deliberately require continuous green, unlike the lesson bucket.
    this.streak = good ? (this.previousGood && dt <= 0.25 ? this.streak + dt : 0) : 0;
    this.best = Math.max(this.best, this.streak);
    this.previousGood = good;
    this.last = now;
    if (voiced) this.lastVoice = now;
    this.samples.push({ time: (now - this.started) / 1000, cents: voiced ? cents : null, rms });
    if (this.best >= 8 || now - this.lastVoice >= 600 || now - this.started >= 30000) this.finish();
  }

  finish() {
    if (this.status !== "running") return null;
    this.status = "finished";
    // The release/silence used to end a take is not part of the held note.
    const samples = this.samples.slice();
    while (samples.length && samples.at(-1).cents === null) samples.pop();
    this.result = {
      ...longToneScore(samples, this.tolerance),
      best: this.best,
      duration: samples.at(-1)?.time || 0,
      medal: this.best >= 8 ? "黄金" : this.best >= 5 ? "白银" : this.best >= 3 ? "青铜" : "继续加油",
    };
    return this.result;
  }
}
