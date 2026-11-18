import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
const bytes=fs.readFileSync(new URL('./assets/ronaldo-anatomy-v8.glb',import.meta.url));
const length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length);
function data(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);return Float32Array.from({length:a.count*size},(_,i)=>binary.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4));}
function pose(name){
 const nodes=g.nodes.map(n=>{const o=new THREE.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 g.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const root=new THREE.Group();g.scenes[g.scene||0].nodes.forEach(i=>root.add(nodes[i]));
 const a=g.animations.find(a=>a.name===name);assert.ok(a,name+' exported');
 const tracks=a.channels.filter(c=>c.target.path!=='scale').map(c=>{const s=a.samplers[c.sampler],rotation=c.target.path==='rotation';return new (rotation?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(nodes[c.target.node].name+(rotation?'.quaternion':'.position'),data(s.input),data(s.output));});
 const clip=new THREE.AnimationClip(name,-1,tracks),mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).play();return{root,mixer,duration:clip.duration};
}
test('actual exported standing, walking and running clips have distinct relaxed elbow ranges',()=>{
 for(const [name,min,max] of [['Idle',7,22],['Walk',10,30],['Run',65,105],['TurnLeft',60,110],['TurnRight',60,110]]){
  const {root,mixer,duration}=pose(name);
  for(let t=0;t<duration;t+=1/60){mixer.setTime(t);root.updateMatrixWorld(true);
   for(const s of ['l','r']){const shoulder=root.getObjectByName('upperarm_'+s).getWorldPosition(new THREE.Vector3()),elbow=root.getObjectByName('lowerarm_'+s).getWorldPosition(new THREE.Vector3()),wrist=root.getObjectByName('hand_'+s).getWorldPosition(new THREE.Vector3());const angle=THREE.MathUtils.radToDeg(elbow.clone().sub(shoulder).angleTo(wrist.sub(elbow)));assert.ok(angle>=min&&angle<=max,`${name} ${s} ${angle}`);}
  }
 }
});
test('new clips retain captured durations and toe animation channels',()=>{
 const contract=JSON.parse(fs.readFileSync(new URL('./assets/mocap-contract.json',import.meta.url)));
 for(const c of contract.clips){const p=pose(c.name);assert.ok(Math.abs(p.duration-c.duration)<.02,c.name);}
 const run=g.animations.find(a=>a.name==='Run');for(const side of ['l','r'])assert.ok(run.channels.some(c=>g.nodes[c.target.node].name==='ball_'+side&&c.target.path==='rotation'));
});
test('celebration keeps upper arms below shoulders, elbows within range and returns to rest',()=>{
 const {root,mixer,duration}=pose('ReactGoal');let previous=null,initial=null;
 const point=n=>root.getObjectByName(n).getWorldPosition(new THREE.Vector3());
 for(let t=0;t<=duration;t+=1/60){mixer.setTime(t);root.updateMatrixWorld(true);
  const state=[];
  for(const s of ['l','r']){
   const shoulder=point('upperarm_'+s),elbow=point('lowerarm_'+s),wrist=point('hand_'+s);
   const upper=elbow.clone().sub(shoulder),fore=wrist.clone().sub(elbow);
   assert.ok(THREE.MathUtils.radToDeg(upper.angleTo(new THREE.Vector3(0,-1,0)))<35,'upper arm stays close to ribs');
   assert.ok(THREE.MathUtils.radToDeg(upper.angleTo(fore))<120,'no extreme elbow bend');
   state.push(shoulder,elbow,wrist);
  }
  if(previous)state.forEach((p,i)=>assert.ok(p.distanceTo(previous[i])<.025,'no frame-to-frame arm snap'));
  initial??=state;previous=state;
 }
 previous.forEach((p,i)=>assert.ok(p.distanceTo(initial[i])<.005,'returns smoothly to neutral'));
});

test('upper-arm corrective targets ship in the actual game model',()=>{
 const body=g.meshes.find(m=>m.extras?.targetNames?.includes('UpperArmVolume_l'));
 assert.ok(body,'exported body retains both corrective shapes');
 assert.ok(body.extras.targetNames.includes('UpperArmVolume_r'));
 for(const p of body.primitives)assert.equal(p.targets.length,8);
 assert.ok(body.weights.every(w=>w===0),'relaxed model must not start with inflated shoulders');
});

test('arm volume follows each arm independently and is invariant to actor orientation',async()=>{
 const {updateUpperArmVolume}=await import('./shoulder-deformation.js');
 const {root,mixer}=pose('Idle');mixer.setTime(.1);
 const mesh=new THREE.Object3D();mesh.morphTargetDictionary={UpperArmVolume_l:0,UpperArmVolume_r:1};mesh.morphTargetInfluences=[0,0];root.add(mesh);
 updateUpperArmVolume(root);assert.ok(mesh.morphTargetInfluences.every(w=>w<.01),'no shoulder bulge at rest');
 const upper=root.getObjectByName('upperarm_l');
 upper.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2));
 updateUpperArmVolume(root);const raised=[...mesh.morphTargetInfluences];
 assert.ok(raised[0]>.8,'raised arm restores volume');assert.ok(raised[1]<.01,'other arm remains relaxed');
 root.rotation.set(.4,.8,.2);updateUpperArmVolume(root);
 raised.forEach((v,i)=>assert.ok(Math.abs(v-mesh.morphTargetInfluences[i])<1e-6));
});

test('directional shoulder correction remains bounded through all raise directions',async()=>{
 const {shoulderWeights}=await import('./shoulder-deformation.js');
 for(let angle=0;angle<=180;angle+=2)for(let direction=-1;direction<=1;direction+=.1){const w=shoulderWeights(angle,direction);assert.ok(w.every(v=>v>=0&&v<=1));assert.ok(w.reduce((a,b)=>a+b,0)<=1+1e-9)}
 assert.deepEqual(shoulderWeights(15,1),[0,0,0,0]);assert.deepEqual(shoulderWeights(90,1),[0,1,0,0]);assert.deepEqual(shoulderWeights(155,1),[0,0,0,1]);assert.deepEqual(shoulderWeights(155,0),[0,0,1,0]);
});
test('exported rig has articulated shoulder helpers in actual inspection clips',()=>{
 for(const side of ['l','r'])for(const part of ['scapula_','deltoid_'])assert.ok(g.nodes.some(n=>n.name===part+side));
 const {root,mixer}=pose('CheckOverhead');mixer.setTime(.1);root.updateMatrixWorld(true);
 for(const side of ['l','r']){
  const a=root.getObjectByName('upperarm_'+side).getWorldPosition(new THREE.Vector3()),b=root.getObjectByName('lowerarm_'+side).getWorldPosition(new THREE.Vector3());
  assert.ok(b.y>a.y,'overhead elbow above shoulder');
  const scap=root.getObjectByName('scapula_'+side),rest=g.nodes.find(n=>n.name===scap.name).rotation;
  assert.ok(scap.quaternion.angleTo(new THREE.Quaternion().fromArray(rest))>.1,'scapula participates');
 }
});
