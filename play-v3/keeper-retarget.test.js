import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../vendor/three.module.js';import {yamalKeeperClips} from './keeper-retarget.js';
function asset(path){
 const bytes=fs.readFileSync(new URL(path,import.meta.url)),len=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+len)),start=28+len;
 const nodes=j.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();j.scenes[j.scene||0].nodes.forEach(i=>scene.add(nodes[i]));
 function data(i,size){const a=j.accessors[i],v=j.bufferViews[a.bufferView],offset=start+(v.byteOffset||0)+(a.byteOffset||0);return Float32Array.from({length:a.count*size},(_,k)=>bytes.readFloatLE(offset+4*k));}
 const animations=(j.animations||[]).map(a=>new T.AnimationClip(a.name,-1,a.channels.filter(c=>c.target.path!=='scale').map(c=>{const s=a.samplers[c.sampler],q=c.target.path==='rotation';return new (q?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(j.nodes[c.target.node].name+(q?'.quaternion':'.position'),data(s.input,1),data(s.output,q?4:3));})));
 return {scene,animations};
}
const reference=asset('./assets/yamal-playable-v1.glb');
for(const file of ['yamal-playable-v1','mbappe-game-v3','messi-game-v1','neymar-game-v2','ronaldo-anatomy-v8','courtois-game-v1','players/haaland','players/salah','players/bellingham'])test(file+' receives both Yamal dives without changing bone lengths',()=>{
 const target=asset('./assets/'+file+'.glb'),clips=yamalKeeperClips(reference,target.scene);
 assert.deepEqual(clips.map(c=>c.name),['Dive','DiveMirror']);
 const lengths=new Map();target.scene.traverse(o=>{if(/^(calf|foot|lowerarm|hand)_/.test(o.name))lengths.set(o.name,o.position.length());});
 for(const clip of clips){const mixer=new T.AnimationMixer(target.scene);mixer.clipAction(clip).play();for(const phase of [0,.25,.5,.75,.99]){mixer.setTime(clip.duration*phase);target.scene.updateMatrixWorld(true);for(const [name,length] of lengths){const bone=target.scene.getObjectByName(name);assert.ok(Math.abs(bone.position.length()-length)<1e-5,name+' length');assert.ok(bone.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));}}mixer.stopAllAction();}
 assert.ok(clips[0].tracks.length>20);
 const ref=asset('./assets/yamal-playable-v1.glb'),refClip=ref.animations.find(c=>c.name==='Dive_Ronaldo_Rig');
 const rm=new T.AnimationMixer(ref.scene),tm=new T.AnimationMixer(target.scene);rm.clipAction(refClip).play();tm.clipAction(clips[0]).play();
 for(const phase of [.2,.5,.8]){rm.setTime(refClip.duration*phase);tm.setTime(clips[0].duration*phase);ref.scene.updateMatrixWorld(true);target.scene.updateMatrixWorld(true);
 for(const [a,b] of [['upperarm_l','lowerarm_l'],['lowerarm_l','hand_l'],['thigh_r','calf_r'],['calf_r','foot_r']]){
 const direction=scene=>scene.getObjectByName(b).getWorldPosition(new T.Vector3()).sub(scene.getObjectByName(a).getWorldPosition(new T.Vector3())).normalize();
 assert.ok(direction(ref.scene).dot(direction(target.scene))>.98,file+' matches Yamal '+a);
 }}rm.stopAllAction();tm.stopAllAction();
});
