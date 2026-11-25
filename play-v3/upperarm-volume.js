import {Vector3} from '../vendor/three.module.js';
// Pose-space sleeve volume compensation; no correction in the relaxed stance.
const cache=new WeakMap();
export function updateUpperArmVolume(model){
 let setup=cache.get(model);
 if(!setup){
  const meshes=[];model.traverse(o=>{if(o.morphTargetDictionary?.UpperArmVolume_l!==undefined)meshes.push(o)});
  setup={meshes,spine:model.getObjectByName('spine_03'),neck:model.getObjectByName('neck_01'),arms:['l','r'].map(side=>({side,upper:model.getObjectByName('upperarm_'+side),lower:model.getObjectByName('lowerarm_'+side)})),up:new Vector3(),a:new Vector3(),b:new Vector3()};cache.set(model,setup);
 }
 if(!setup.meshes.length||!setup.spine||!setup.neck)return;
 const {up,a,b}=setup;model.updateMatrixWorld(true);
 setup.neck.getWorldPosition(up);setup.spine.getWorldPosition(a);up.sub(a).normalize();
 for(const {side,upper,lower} of setup.arms){
  if(!upper||!lower)continue;
  upper.getWorldPosition(a);lower.getWorldPosition(b);b.sub(a).normalize();
  const angle=Math.acos(Math.max(-1,Math.min(1,-b.dot(up))));
  const t=Math.max(0,Math.min(1,(angle-25*Math.PI/180)/(60*Math.PI/180)));
  for(const mesh of setup.meshes){const i=mesh.morphTargetDictionary['UpperArmVolume_'+side];if(i!==undefined)mesh.morphTargetInfluences[i]=t*t*(3-2*t)}
 }
}
