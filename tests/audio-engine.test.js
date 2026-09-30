import test from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../src/audio.js";

test("microphone flows through the 150 Hz filter, and stop inside a frame prevents rescheduling", async (t) => {
  const oldWindow = globalThis.window;
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis,'navigator');
  t.mock.timers.enable({apis:['setTimeout']});
  const connections=[];
  let stopped=0,disconnected=0,frames=0;
  const track={stop(){stopped++;},onended:null};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const filter={frequency:{},Q:{},connect(node){connections.push(['filter',node]);},disconnect(){disconnected++;}};
  const source={connect(node){connections.push(['source',node]);},disconnect(){disconnected++;}};
  const analyser={getFloatTimeDomainData(samples){samples.fill(0);}};
  const engine=new AudioEngine();
  try {
    globalThis.window={isSecureContext:true};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream}}});
    engine.context={
      currentTime:0,sampleRate:48000,
      createAnalyser:()=>analyser,createMediaStreamSource:()=>source,createBiquadFilter:()=>filter,
    };
    engine.ready=async()=>engine.context;
    await engine.start((frame)=>{frames++;assert.equal(frame.frequency,null);engine.stop();},()=>{});
    assert.deepEqual(connections,[['source',filter],['filter',analyser]]);
    assert.equal(filter.type,'highpass');
    assert.equal(filter.frequency.value,150);
    assert.ok(Math.abs(filter.Q.value+3.0103)<0.001);
    t.mock.timers.tick(70);
    t.mock.timers.tick(1000);
    assert.equal(frames,1);
    assert.equal(stopped,1);
    assert.equal(disconnected,2);
    assert.equal(engine.stream,null);
  } finally {
    engine.stop();
    t.mock.timers.reset();
    if(oldWindow===undefined) delete globalThis.window; else globalThis.window=oldWindow;
    if(oldNavigator) Object.defineProperty(globalThis,'navigator',oldNavigator); else delete globalThis.navigator;
  }
});
