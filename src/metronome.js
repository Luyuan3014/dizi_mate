// Schedule clicks and melody against the same audio clock; UI timers only paint.
export class Metronome {
  constructor(engine, onBeat = () => {}, onStop = () => {}) {
    this.engine = engine;
    this.onBeat = onBeat;
    this.onStop = onStop;
    this.generation = 0;
    this.running = false;
    this.visualTimers = new Set();
  }

  async start({ bpm = 60, beats = 4, sequence = null, frequencyForNote } = {}) {
    this.stop();
    const generation = this.generation;
    const context = await this.engine.ready();
    if (generation !== this.generation) return false;
    this.bpm = Math.max(40, Math.min(180, bpm));
    this.beats = [2, 3, 4].includes(beats) ? beats : 4;
    this.running = true;
    this.sequence = sequence;
    this.tickIndex = 0;
    this.nextTime = context.currentTime + 0.06;
    const later = (callback, time) => {
      const timer = setTimeout(() => {
        this.visualTimers.delete(timer);
        if (generation === this.generation) callback();
      }, Math.max(0, (time - context.currentTime) * 1000));
      this.visualTimers.add(timer);
    };
    const schedule = () => {
      if (!this.running || generation !== this.generation) return;
      const interval = 60 / this.bpm;
      // Do not emit a burst after a stalled foreground frame.
      if (this.nextTime < context.currentTime - 0.15) this.nextTime = context.currentTime + 0.03;
      while (this.nextTime < context.currentTime + 0.12) {
        const index = this.tickIndex++;
        if (sequence && index >= sequence.length) {
          later(() => { this.stop(); this.onStop(); }, this.nextTime);
          return;
        }
        const beat = index % this.beats;
        this.engine.click(this.nextTime, beat === 0);
        if (sequence?.[index]) this.engine.scheduleTone(frequencyForNote(sequence[index]), interval * 0.82, this.nextTime);
        later(() => this.onBeat(beat, index), this.nextTime);
        this.nextTime += interval;
      }
      this.timer = setTimeout(schedule, 25);
    };
    schedule();
    return true;
  }

  stop() {
    this.generation++;
    this.running = false;
    clearTimeout(this.timer);
    this.visualTimers.forEach(clearTimeout);
    this.visualTimers.clear();
    this.engine.stopClicks();
    if (this.sequence) this.engine.stopTones();
    this.sequence = null;
  }
}
