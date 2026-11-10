import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
const moduleSource=fs.readFileSync(new URL('./locomotion.js',import.meta.url),'utf8')
 .replace("from 'three'",`from '${new URL('../vendor/three.module.js',import.meta.url).href}'`);
const {Locomotion}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
const {clips}=JSON.parse(fs.readFileSync(new URL('./assets/mocap-contract.json',import.meta.url)));

test('slow approach and running keep stride playback matched to actual travel at each player height',()=>{
 for(const height of [1.70,1.87,1.99])for(const speed of [.22,.6,2.4]){
  const actor={root:new THREE.Group(),height,current:null,rate:0};
  const world={motionInfo:name=>clips.find(c=>c.name.toLowerCase()===name),animate:(a,name)=>a.current=name,setSpeed:(a,rate)=>a.rate=rate};
  const controller=new Locomotion(world,actor);
  for(let i=0;i<120;i++)controller.step(new THREE.Vector3(0,0,1),1/60,{targetSpeed:speed,recordedTurns:false});
  const z=actor.root.position.z;
  controller.step(new THREE.Vector3(0,0,1),1/60,{targetSpeed:speed,recordedTurns:false});
  const travelSpeed=(actor.root.position.z-z)*60;
  const strideSpeed=actor.rate*world.motionInfo(actor.current).nominalSpeed*height/1.87;
  assert.ok(Math.abs(strideSpeed-travelSpeed)<.01,`${height}m, ${speed}m/s: feet ${strideSpeed}, body ${travelSpeed}`);
 }
});
