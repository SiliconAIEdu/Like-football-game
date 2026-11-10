import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {strikeRoot} from './rules.js';
const contract=JSON.parse(fs.readFileSync(new URL('./assets/mocap-contract.json',import.meta.url)));
const bytes=fs.readFileSync(new URL('./assets/ronaldo-natural.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));

test('export timing agrees with motion-driven game movement',()=>{
 for(const c of contract.clips){
  const animation=gltf.animations.find(a=>a.name===c.name);assert.ok(animation,c.name+' missing');
  const end=Math.max(...animation.samplers.map(s=>gltf.accessors[s.input].max?.[0]||0));
  assert.ok(Math.abs(end-c.duration)<.035,`${c.name} export ${end}, expected ${c.duration}`);
  assert.ok(c.source&&c.sourceFrames,'captured action needs provenance');
  assert.ok(c.root.every((r,i)=>Number.isFinite(r.x+r.z+r.yaw+r.t)&&(!i||r.t>c.root[i-1].t)));
 }
});
test('turns and stopping include actual body travel',()=>{
 for(const name of ['TurnLeft','TurnRight']){
  const c=contract.clips.find(c=>c.name===name),end=c.root.at(-1);
  assert.ok(Math.abs(end.yaw-c.root[0].yaw)>1.1&&Math.abs(end.yaw-c.root[0].yaw)<2);
  assert.ok(Math.hypot(end.x,end.z)>.6,'turn must include steps');
 }
 const stop=contract.clips.find(c=>c.name==='RunStop');
 assert.ok(Math.hypot(stop.root.at(-1).x,stop.root.at(-1).z)<1.5,'stop must not include a long approach run');
});
test('contact precedes follow-through and stays aligned at every goal angle',()=>{
 const k=contract.kick;assert.ok(k.time>.1&&k.time<k.duration-.2);
 for(const yaw of [0,.7,Math.PI,4.2])for(const scale of [1,1.99/1.87,1.70/1.87]){
  const c=k.contact,ball={x:2,z:-3},r=strikeRoot(ball,yaw,c,scale);
  assert.ok(Math.abs(r.x+scale*(c.x*Math.cos(yaw)+c.z*Math.sin(yaw))-ball.x)<1e-8);
  assert.ok(Math.abs(r.z+scale*(-c.x*Math.sin(yaw)+c.z*Math.cos(yaw))-ball.z)<1e-8);
 }
});


test('player face exports working eyelid and gaze geometry',()=>{
 const body=gltf.meshes.find(m=>m.extras?.targetNames?.includes('BlinkLeft'));
 assert.ok(body,'body must have real eyelid targets');
 for(const name of ['BlinkLeft','BlinkRight','Smile','Focus']){
  const i=body.extras.targetNames.indexOf(name);assert.ok(i>=0,name);
  const delta=gltf.accessors[body.primitives[0].targets[i].POSITION];
  assert.ok(delta.max.some((v,j)=>Math.abs(v-delta.min[j])>.0001),name+' must change geometry');
 }
 const eyes=gltf.meshes.filter(m=>m.extras?.targetNames?.includes('LookLeft'));
 assert.equal(eyes.length,4,'both irises and pupils follow gaze');
 for(const eye of eyes)for(const name of ['LookLeft','LookRight','LookUp','LookDown'])assert.ok(eye.extras.targetNames.includes(name));
});
