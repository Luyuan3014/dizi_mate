import test from "node:test";
import assert from "node:assert/strict";
import { Metronome } from "../src/metronome.js";

test("metronome schedules melody on exactly the click clock, with bar accents, then stops", async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const bpm of [40, 60, 180]) {
    const clicks = [], tones = [], visuals = [];
    const context = { currentTime: 0 };
    const engine = {
      ready: async () => context,
      click: (time, accent) => clicks.push({time,accent}),
      scheduleTone: (frequency, duration, time) => tones.push({frequency,duration,time}),
      stopClicks() {}, stopTones() {},
    };
    let finished = 0;
    const metro = new Metronome(engine, (beat,index)=>visuals.push({beat,index}), ()=>finished++);
    await metro.start({bpm, beats:3, sequence:['1','2','3','1'], frequencyForNote: (n)=>Number(n)*440});
    const length = Math.ceil(4*60/bpm*1000+300);
    for(let ms=0;ms<length;ms+=25) { context.currentTime+=.025; t.mock.timers.tick(25); }
    assert.equal(clicks.length,4);
    assert.deepEqual(clicks.map((c)=>c.accent),[true,false,false,true]);
    assert.deepEqual(tones.map((n)=>n.time),clicks.map((c)=>c.time));
    assert.ok(Math.abs(clicks[1].time-clicks[0].time-60/bpm)<1e-9);
    assert.equal(visuals.length,4);
    assert.equal(finished,1);
    assert.equal(metro.running,false);
  }
  t.mock.timers.reset();
});

test("stop cancels pending audio initialization and queued visual callbacks", async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let ready, clicks=0, visuals=0;
  const engine = {
    ready: () => new Promise((resolve)=>{ready=resolve;}),
    click: ()=>clicks++, stopClicks() {}, stopTones() {},
  };
  const metro = new Metronome(engine,()=>visuals++);
  const pending = metro.start();
  metro.stop();
  ready({currentTime:0});
  assert.equal(await pending,false);
  assert.equal(clicks,0);
  engine.ready=async()=>({currentTime:0});
  await metro.start();
  assert.equal(clicks,1);
  metro.stop();
  t.mock.timers.tick(3000);
  assert.equal(visuals,0);
  assert.equal(clicks,1);
  t.mock.timers.reset();
});
