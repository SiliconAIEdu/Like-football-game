import * as THREE from '../vendor/three.module.js';
// Correct the rendered feet after the outer dive tilt as well as the animation.
export function resetKeeperGround(actor){
 if(actor.keeperBasePosition)actor.model.position.copy(actor.keeperBasePosition);
}
export function keepKeeperAboveGround(actor){
 if(!actor.tracksIncomingBall)return;
 actor.keeperBasePosition??=actor.model.position.clone();
 actor.root.updateMatrixWorld(true);
 if(!actor.soleSamples){
  actor.soleSamples=[];
  actor.model.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;
   const p=mesh.geometry.attributes.position,indices=[];
   for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(v.y<actor.root.position.y+.18||i%12===0)indices.push(i);}
   // Sample the entire body as well as every sole vertex: lateral landings can
   // contact hip, ribs or forearm before the feet.
   actor.soleSamples.push({mesh,indices});
  });
 }
 let floor=Infinity;const point=new THREE.Vector3();
 for(const {mesh,indices} of actor.soleSamples){mesh.skeleton.update();for(const i of indices){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);floor=Math.min(floor,point.y);}}
 if(floor<.008){const lift=new THREE.Vector3(0,.008-floor,0).applyQuaternion(actor.root.getWorldQuaternion(new THREE.Quaternion()).invert());actor.model.position.add(lift);actor.root.updateMatrixWorld(true);}
 actor.keeperFloor=floor;
}
