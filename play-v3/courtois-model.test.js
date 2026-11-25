import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';import {players} from './roster.js';
test('Courtois corrected game model, gzip and dedicated contract agree',()=>{const p=players.find(p=>p.id==='courtois');assert.equal(p.model,'assets/courtois-game-v4.glb');const b=fs.readFileSync(new URL(p.model,import.meta.url));assert.deepEqual(zlib.gunzipSync(fs.readFileSync(new URL(p.model+'.gz',import.meta.url))),b);const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());for(const name of ['Idle','Run','Walk','Kick','RunStop','ReactGoal','ReactMiss','Dive','DiveMirror'])assert.ok(g.animations.some(a=>a.name===name));const c=JSON.parse(fs.readFileSync(new URL('assets/courtois-game-v4-contact.json',import.meta.url)));assert.equal(c.time,.9);assert.ok(c.clips.some(c=>c.name==='Kick'));assert.ok(Object.values(c.contact).every(Number.isFinite));});

import * as T from '../vendor/three.module.js';
function asset(path){
 const bytes=fs.readFileSync(new URL(path,import.meta.url)),len=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+len)),start=28+len;
 const nodes=j.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();j.scenes[j.scene||0].nodes.forEach(i=>scene.add(nodes[i]));
 function data(i,size){const a=j.accessors[i],v=j.bufferViews[a.bufferView],offset=start+(v.byteOffset||0)+(a.byteOffset||0);return Float32Array.from({length:a.count*size},(_,k)=>bytes.readFloatLE(offset+4*k));}
 const animations=(j.animations||[]).map(a=>new T.AnimationClip(a.name,-1,a.channels.filter(c=>c.target.path!=='scale').map(c=>{const s=a.samplers[c.sampler],q=c.target.path==='rotation';return new (q?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(j.nodes[c.target.node].name+(q?'.quaternion':'.position'),data(s.input,1),data(s.output,q?4:3));})));
 return {scene,animations};
}

test('Courtois baked actions follow Yamal arm directions',()=>{
 const ref=asset('./assets/yamal-playable-v1.glb');
 const target=asset('./assets/courtois-game-v4.glb');
 for(const name of ['Idle','Run','Kick','ReactGoal','ReactMiss','Dive']){
  const a=ref.animations.find(c=>c.name.replace(/_Ronaldo_Rig$/,'')===name),b=target.animations.find(c=>c.name===name);
  const rm=new T.AnimationMixer(ref.scene),tm=new T.AnimationMixer(target.scene);rm.clipAction(a).play();tm.clipAction(b).play();
  for(const phase of [.2,.5,.8]){rm.setTime(a.duration*phase);tm.setTime(b.duration*phase);ref.scene.updateMatrixWorld(true);target.scene.updateMatrixWorld(true);
   for(const side of ['l','r']){const dir=s=>s.getObjectByName('hand_'+side).getWorldPosition(new T.Vector3()).sub(s.getObjectByName('lowerarm_'+side).getWorldPosition(new T.Vector3())).normalize();assert.ok(dir(ref.scene).dot(dir(target.scene))>.98,name+' forearm '+side);}
  }rm.stopAllAction();tm.stopAllAction();
 }
});
