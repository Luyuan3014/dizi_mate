import test from "node:test";
import assert from "node:assert/strict";
import { ConfidenceBucket, LongToneChallenge, longToneScore } from "../src/practice.js";
import { PitchSmoother } from "../src/audio.js";
import { NOTES, KEYS, frequencyFor, nearestNote, noteForHoles } from "../src/music.js";

test("five-frame median rejects isolated octave jumps and follows a real note change", () => {
  const filter = new PitchSmoother();
  [440,440,440,440,440].forEach((f) => filter.update(f));
  assert.ok(Math.abs(filter.update(880)-440) < 0.001);
  assert.ok(Math.abs(filter.update(440)-440) < 0.001);
  [660,660,660].forEach((f) => filter.update(f));
  assert.ok(Math.abs(filter.update(660)-660) < 0.001);
  assert.equal(filter.update(null), null);
  assert.ok(Math.abs(filter.update(880)-880) < 0.001);
  filter.reset();
  assert.ok(Math.abs(filter.update(330)-330) < 0.001);
});

test("confidence tolerates occasional bad frames but rejects mostly bad and interrupted input", () => {
  const bucket = new ConfidenceBucket();
  let passed = false;
  for (let i=0; i<50; i++) passed ||= bucket.update(i*80, i%12 !== 6).passed;
  assert.equal(passed, true);
  bucket.reset();
  for (let i=0; i<100; i++) assert.equal(bucket.update(i*80, i%3 === 0).passed, false);
  bucket.reset();
  for (let i=0; i<12; i++) bucket.update(i*80, true);
  const before = bucket.value;
  bucket.update(960, false);
  assert.ok(bucket.value > 0 && bucket.value < before, "one wobble drains without resetting");
  for (let i=13; i<30; i++) bucket.update(i*80, null);
  assert.equal(bucket.value, 0, "silence drains the bucket");
  bucket.update(6000, true);
  assert.equal(bucket.value, 0, "a scheduler gap grants no credit");
});

test("confidence time integration behaves consistently at different frame rates", () => {
  for (const step of [70,100,140]) {
    const bucket = new ConfidenceBucket();
    let result;
    for (let t=0; t<=1400; t+=step) result = bucket.update(t,true);
    assert.equal(result.passed,true);
  }
});

test("metronome-masked frames neither credit nor drain confidence", () => {
  const bucket = new ConfidenceBucket();
  for (let i=0;i<10;i++) bucket.update(i*80,true);
  const value = bucket.value;
  bucket.pause(800);
  bucket.pause(880);
  bucket.update(960,true);
  assert.equal(bucket.value,value);
  assert.equal(bucket.update(1040,true).passed,false);
});

test("all 16 notes map across keys, including high register and forked fingerings", () => {
  assert.equal(NOTES.length,16);
  for (const key of Object.keys(KEYS)) {
    for (const note of NOTES) assert.equal(nearestNote(frequencyFor(note,key,442),key,442).id,note.id);
  }
  assert.deepEqual(NOTES.find((n)=>n.id==='high4').holes,[0,1,1,1,1,0]);
  assert.deepEqual(NOTES.find((n)=>n.id==='high5').holes,[0,1,1,1,1,1]);
  assert.deepEqual(NOTES.find((n)=>n.id==='high6').holes,[1,1,0,1,1,0]);
  assert.equal(noteForHoles([1,1,1,0,0,0],true,true).id,'high1');
});

function hold(challenge, start, seconds, cents=0, rms=0.1) {
  for(let i=0;i<=Math.round(seconds*20);i++) challenge.update(start+i*50,cents,rms);
}

test("long tones award bronze, silver, gold at 3/5/8 continuous seconds", () => {
  for (const [duration,medal] of [[3.05,'青铜'],[5.05,'白银'],[8.05,'黄金']]) {
    const challenge = new LongToneChallenge();
    hold(challenge,0,duration);
    challenge.finish();
    assert.equal(challenge.result.medal,medal);
    assert.equal(challenge.result.score,100);
  }
});

test("long tones wait for voice, restart streak on misses and finish on silence", () => {
  const challenge = new LongToneChallenge(20);
  hold(challenge,0,5,null,0);
  assert.equal(challenge.status,'waiting');
  hold(challenge,5100,3.2);
  assert.ok(challenge.best>=3);
  challenge.update(8350,21,0.1);
  assert.equal(challenge.streak,0);
  hold(challenge,8400,1);
  hold(challenge,9450,0.7,null,0);
  assert.equal(challenge.status,'finished');
  assert.equal(challenge.result.medal,'青铜');
  assert.ok(challenge.result.duration<4.5,'release silence excluded from scoring duration');
});

test("long tone discontinuities cannot create medals and long takes are bounded", () => {
  const challenge = new LongToneChallenge();
  hold(challenge,0,2);
  challenge.update(10000,0,0.1);
  assert.equal(challenge.streak,0);
  hold(challenge,10050,0.7,null,0);
  assert.equal(challenge.result.medal,'继续加油');
  const out = new LongToneChallenge();
  hold(out,0,30.1,100);
  assert.equal(out.status,'finished');
  assert.equal(out.result.medal,'继续加油');
});

test("stability score penalizes both pitch jitter and volume variation", () => {
  const stable = Array.from({length:40},()=>({cents:0,rms:.1}));
  const pitchy = stable.map((s,i)=>({...s,cents:i%2?30:-30}));
  const loud = stable.map((s,i)=>({...s,rms:i%2?.1:.3}));
  const wrong = stable.map((s)=>({...s,cents:120}));
  assert.equal(longToneScore(stable,35).score,100);
  assert.ok(longToneScore(pitchy,35).score<100);
  assert.ok(longToneScore(loud,35).score<100);
  assert.ok(longToneScore(wrong,35).score<=40);
  assert.equal(longToneScore([],35).score,0);
});
