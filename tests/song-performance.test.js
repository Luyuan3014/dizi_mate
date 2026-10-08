import test from "node:test";
import assert from "node:assert/strict";
import { PERFORMANCE_SONGS, songTimeline, SongPerformance, readReports, reportAdvice } from "../src/song-performance.js";
import { NOTES, frequencyFor } from "../src/music.js";
import { createStore, createInitialState } from "../src/store.js";
import { performanceReport, exportPerformanceReport } from "../src/components/performance-report.js";

function play(song = PERFORMANCE_SONGS[0], options = {}, transform = (f) => f, end = Infinity, step = 50) {
  const take = new SongPerformance(song, options);
  for (let time=0; time<Math.min(end,take.timeline.duration); time+=step) {
    const note = take.targetAt(time);
    const f = frequencyFor(NOTES.find((n) => n.id === note.id), take.settings.key, take.settings.reference);
    // Brief releases articulate repeated notes.
    const frequency = note.end-time <= 50 ? null : transform(f,time,note);
    take.sample(time,frequency,frequency ? .1 : 0);
  }
  return take;
}

test("full scores contain valid fingerings and 32 / 48 / 32 beats including half and held notes", () => {
  for (const [i,beats] of [32,48,32].entries()) {
    const song = PERFORMANCE_SONGS[i];
    assert.ok(song.notes.every((n) => NOTES.some((note) => note.id === n.id) && n.beats > 0));
    assert.equal(song.notes.reduce((sum,n) => sum+n.beats,0),beats);
    for (const bpm of [40,72,120]) {
      const timeline = songTimeline(song,bpm);
      assert.ok(Math.abs(timeline.duration-beats*60000/bpm)<.001);
      assert.equal(timeline.notes.at(-1).end,timeline.duration);
      assert.equal(song.boundaries.at(-1),song.notes.length);
    }
  }
});

test("on-time articulated performances receive high marks across keys, calibration and speeds", () => {
  for (const key of ["C","D","E","F","G"]) for (const bpm of [40,72,120]) {
    const take = play(PERFORMANCE_SONGS[0], {key,bpm,reference:442});
    const report = take.finish();
    assert.ok(report.score>=90,JSON.stringify({key,bpm,score:report.score}));
    assert.ok(report.accuracy>=90);
    assert.equal(report.completed,true);
    assert.ok(Math.abs(report.bias)<=1);
    assert.equal(report.rows.length,32);
  }
});

test("silence, low amplitude, octave mistakes and missing samples cannot produce a good report", () => {
  const silent = play(undefined,{},()=>null).finish();
  assert.equal(silent.score,null);
  assert.equal(silent.coverage,0);
  assert.equal(silent.missed,32);
  assert.match(reportAdvice(silent)[0],/未识别/);
  const octave = play(undefined,{},(f)=>f*2).finish();
  assert.equal(octave.accuracy,0);
  assert.ok(octave.score<=20);
  assert.equal(octave.bias,1200);
  const quiet = new SongPerformance(PERFORMANCE_SONGS[0]);
  quiet.sample(0,frequencyFor(NOTES.find((n)=>n.id==='1')),.001);
  assert.equal(quiet.finish().score,null);
  const gap = play(undefined,{},(f)=>f,Infinity,500).finish();
  assert.ok(gap.coverage<=30,"unobserved time earns no credit beyond the 150 ms hold limit");
  assert.ok(gap.score<60);
});

test("same-pitch legato does not manufacture repeated onsets; late starts miss the rhythm window", () => {
  const song = { ...PERFORMANCE_SONGS[0], notes:[{id:"1",beats:1},{id:"1",beats:1}], boundaries:[0,2], phrases:["test"] };
  const legato = new SongPerformance(song,{bpm:60});
  for(let t=0;t<2000;t+=50) legato.sample(t,frequencyFor(NOTES.find((n)=>n.id==='1')),.1);
  assert.equal(legato.finish().rhythm,50);
  const late = play(PERFORMANCE_SONGS[0],{},(f,time,n)=>time-n.start>350?f:null).finish();
  assert.equal(late.rhythm,0);
});

test("time weighting gives comparable scores across sampling cadences and penalizes sustained jitter", () => {
  const scores = [50,70,100].map((step)=>play(undefined,{},(f)=>f,Infinity,step).finish());
  assert.ok(Math.max(...scores.map((r)=>r.score))-Math.min(...scores.map((r)=>r.score))<=5);
  assert.ok(scores.every((r)=>r.stability>=95));
  const jitter=play(undefined,{},(f,t)=>f*2**((t%100===0?30:-30)/1200)).finish();
  assert.ok(jitter.stability<70);
});

test("early finish accounts for the full score and is idempotent", () => {
  const take = play(undefined,{},(f)=>f,4000);
  const report = take.finish(4000,"ended");
  assert.equal(report.completed,false);
  assert.equal(report.elapsed,4000);
  assert.ok(report.coverage<20);
  assert.ok(report.score<30);
  assert.equal(take.finish(),report);
  take.sample(5000,440,.1);
  assert.equal(take.finish().score,report.score);
});

test("metronome masks are excluded from assessment and never count as voice or attacks", () => {
  const take = new SongPerformance(PERFORMANCE_SONGS[0]);
  for(let t=0;t<take.timeline.duration;t+=50) take.sample(t,440,.1,true);
  const report = take.finish();
  assert.equal(report.score,null);
  assert.equal(report.rhythm,0);
  assert.equal(report.coverage,0);
  const partial = play();
  const original = partial.finish();
  assert.ok(original.score>90);
});

test("report persistence keeps 20 takes, rejects broken input, and renders stored text safely", (t) => {
  const storage = new Map();
  const old = globalThis.localStorage;
  globalThis.localStorage = {getItem:(k)=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  t.after(()=>{if(old === undefined)delete globalThis.localStorage;else globalThis.localStorage=old;});
  const store = createStore(createInitialState());
  const report = play().finish();
  for(let i=0;i<23;i++) assert.equal(store.addReport({...report,id:`r${i}`}),true);
  assert.equal(store.getState().reports.length,20);
  assert.equal(createInitialState().reports.length,20);
  assert.equal(store.getState().reports[0].id,"r3");
  store.addReport({...report,id:"r22"});
  assert.equal(store.getState().reports.length,20);
  assert.deepEqual(readReports({getItem:()=>"broken"}),[]);
  assert.deepEqual(readReports({getItem:()=>JSON.stringify([{...report,rows:[{id:"unknown"}]}])}),[]);
  const markup = performanceReport({...report,title:'<img src=x onerror="alert(1)">',phrases:[{label:"<script>x</script>",from:1,to:8,accuracy:90}]});
  assert.ok(!markup.includes('<img src=x'));
  assert.ok(!markup.includes('<script>'));
  assert.match(markup,/&lt;img/);
});

test("export creates a complete printable HTML report and releases its download URL", async (t) => {
  const previousDocument=globalThis.document;
  const previousCreate=URL.createObjectURL;
  const previousRevoke=URL.revokeObjectURL;
  let blob, clicked=false, removed=false, revoked=false;
  const link={click(){clicked=true;},remove(){removed=true;}};
  globalThis.document={body:{append(el){assert.equal(el,link);}},createElement:()=>link};
  URL.createObjectURL=(value)=>{blob=value;return "blob:report-test";};
  URL.revokeObjectURL=(value)=>{assert.equal(value,"blob:report-test");revoked=true;};
  t.mock.timers.enable({apis:["setTimeout"]});
  t.after(()=>{t.mock.timers.reset();URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
  exportPerformanceReport(play().finish());
  assert.ok(clicked&&removed);
  assert.match(link.download,/两只老虎-演奏报告-.*\.html$/);
  const html=await blob.text();
  assert.match(html,/<!doctype html>/);
  assert.match(html,/@media print/);
  assert.match(html,/<details class="report-detail" open>/);
  assert.match(html,/音准命中率/);
  assert.ok(!html.includes('data-action="karaoke-export"'));
  assert.equal(revoked,false);
  t.mock.timers.tick(60000);
  assert.equal(revoked,true);
});
