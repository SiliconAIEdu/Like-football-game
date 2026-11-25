import * as THREE from '../vendor/three.module.js';
import {mirrorKeeperDive} from './keeper-motion.js';

// Copy the reference pose in world space, retaining each player's bone lengths.
function rigCopy(scene){
 const copy=new THREE.Object3D();copy.name=scene.name;
 copy.position.copy(scene.position);copy.quaternion.copy(scene.quaternion);copy.scale.copy(scene.scale);
 for(const child of scene.children)copy.add(rigCopy(child));
 return copy;
}
export function yamalKeeperClips(reference,target){
 const original=reference.animations.find(c=>/^Dive(?:_Ronaldo_Rig)?$/.test(c.name));
 if(!original)throw new Error('亚马尔扑救动作缺失');
 return [original,mirrorKeeperDive(original)].map(clip=>{
  if(target===reference.scene){const copy=clip.clone();copy.name=clip.name==='DiveMirror'?'DiveMirror':'Dive';return copy;}
  return retargetDive(reference.scene,target,clip);
 });
}
export function retargetDive(sourceScene,targetScene,clip,stableTwist=false){
 const source=rigCopy(sourceScene),target=rigCopy(targetScene);
 source.updateMatrixWorld(true);target.updateMatrixWorld(true);
 const pairs=[];
 target.traverse(bone=>{
  const from=source.getObjectByName(bone.name);
  if(!from||!clip.tracks.some(t=>t.name.startsWith(bone.name+'.')))return;
  const child=bone.children.find(c=>source.getObjectByName(c.name));
  pairs.push({bone,from,child,sourceChild:child&&source.getObjectByName(child.name),rest:bone.quaternion.clone(),position:bone.position.clone(),sourceRest:from.getWorldQuaternion(new THREE.Quaternion()).invert(),targetRest:bone.getWorldQuaternion(new THREE.Quaternion()),sourceY:from.getWorldPosition(new THREE.Vector3()).y,rotations:[],positions:[]});
 });
 const mixer=new THREE.AnimationMixer(source);mixer.clipAction(clip).play();
 const times=[],frames=Math.ceil(clip.duration*60);
 for(let f=0;f<=frames;f++){
  const time=Math.min(clip.duration-1e-7,f/frames*clip.duration);times.push(f/frames*clip.duration);mixer.setTime(time);source.updateMatrixWorld(true);
  for(const p of pairs){
   const {bone,from,child,sourceChild}=p;
   bone.position.copy(p.position);
   const world=from.getWorldQuaternion(new THREE.Quaternion()).multiply(p.sourceRest).multiply(p.targetRest);
   if(child&&sourceChild&&/^(upperarm|lowerarm|thigh|calf|hand)_/.test(bone.name)){
    if(stableTwist&&/^(upperarm|lowerarm)_/.test(bone.name))world.copy(p.targetRest);
    const actual=child.position.clone().normalize().applyQuaternion(world);
    const wanted=sourceChild.getWorldPosition(new THREE.Vector3()).sub(from.getWorldPosition(new THREE.Vector3())).normalize();
    if(actual.lengthSq()&&wanted.lengthSq())world.premultiply(new THREE.Quaternion().setFromUnitVectors(actual,wanted));
   }
   if(stableTwist&&/^clavicle_/.test(bone.name))world.copy(p.targetRest);
   const parent=bone.parent?.getWorldQuaternion(new THREE.Quaternion())||new THREE.Quaternion();
   bone.quaternion.copy(parent.clone().invert().multiply(world));
   if(bone.name==='pelvis'){
    const dy=from.getWorldPosition(new THREE.Vector3()).y-p.sourceY;
    bone.position.add(new THREE.Vector3(0,dy,0).applyQuaternion(parent.clone().invert()).divide(bone.parent.getWorldScale(new THREE.Vector3())));
   }
   bone.updateMatrixWorld(true);p.rotations.push(...bone.quaternion.toArray());p.positions.push(...bone.position.toArray());
  }
 }
 mixer.stopAllAction();
 return new THREE.AnimationClip(clip.name==='DiveMirror'?'DiveMirror':'Dive',clip.duration,pairs.flatMap(p=>[
  new THREE.QuaternionKeyframeTrack(p.bone.name+'.quaternion',times,p.rotations),new THREE.VectorKeyframeTrack(p.bone.name+'.position',times,p.positions)
 ]));
}
