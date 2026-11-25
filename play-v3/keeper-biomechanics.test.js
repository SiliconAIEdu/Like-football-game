import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three.module.js';import {players} from './roster.js';import {asset} from './test-support/glb-rig.js';import{biomechanicalKeeperClips,diveEnvelope,DIVE_DURATION}from './keeper-biomechanics.js';
const cases=players.map(p=>({id:p.id,path:new URL(p.model,import.meta.url)}));
for(const entry of cases)test(entry.id+' anatomy and both dive phases',()=>{
 const {scene}=asset(entry.path);const clips=biomechanicalKeeperClips(scene,[-1,1,0]);assert.deepEqual(clips.map(c=>c.name),['Dive','DiveMirror','JumpSave']);
 const bones=[];scene.traverse(n=>{if(/^(lowerarm|hand|calf|foot)_/.test(n.name))bones.push([n,n.position.length()])});
 for(const clip of clips){assert.equal(clip.duration,DIVE_DURATION);const mixer=new T.AnimationMixer(scene);const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
 for(const phase of [0,.12,.25,.38,.53,.73,.86,1]){mixer.setTime(phase*clip.duration);scene.updateMatrixWorld(true);for(const [b,length] of bones){assert.ok(Math.abs(b.position.length()-length)<1e-5,'bone length '+b.name);assert.ok(b.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));}
 for(const side of ['l','r']){const get=n=>scene.getObjectByName(n+'_'+side).getWorldPosition(new T.Vector3()),a=get('upperarm'),b=get('lowerarm'),c=get('hand');const elbow=b.clone().sub(a).angleTo(c.clone().sub(b));assert.ok(elbow<Math.PI*.90,'no reversed or collapsed elbow');if(phase>.3&&phase<.65)assert.ok(c.z>a.z+.05,'hands reach in front of chest');}}
 mixer.stopAllAction();}
});
test('translation begins after loading and flight ends before recovery',()=>{assert.equal(diveEnvelope(0).travel,0);assert.equal(diveEnvelope(.1).travel,0);assert.equal(diveEnvelope(1).travel,1);assert.ok(Math.abs(diveEnvelope(.8).flight)<1e-8);assert.equal(diveEnvelope(1).lean,0);assert.equal(diveEnvelope(1).land,0);});
