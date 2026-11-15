import {Vector3} from 'three';
const cache=new WeakMap();
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function shoulderWeights(angle,forwardFraction){
 const active=smooth(25,85,angle),over=smooth(100,155,angle),front=Math.max(0,Math.min(1,forwardFraction))**2;
 return [active*(1-over)*(1-front),active*(1-over)*front,active*over*(1-front),active*over*front];
}
export function updateUpperArmVolume(model){
 let setup=cache.get(model);
 if(!setup){
  const meshes=[];model.traverse(o=>{if(o.morphTargetDictionary?.UpperArmVolume_l!==undefined)meshes.push(o)});
  setup={meshes,spine:model.getObjectByName('spine_03'),neck:model.getObjectByName('neck_01'),left:model.getObjectByName('clavicle_l'),right:model.getObjectByName('clavicle_r'),arms:['l','r'].map(side=>({side,upper:model.getObjectByName('upperarm_'+side),lower:model.getObjectByName('lowerarm_'+side)})),up:new Vector3(),forward:new Vector3(),a:new Vector3(),b:new Vector3(),horizontal:new Vector3()};cache.set(model,setup);
 }
 if(!setup.meshes.length||!setup.spine||!setup.neck||!setup.left||!setup.right)return;
 const {up,forward,a,b,horizontal}=setup;model.updateMatrixWorld(true);
 setup.neck.getWorldPosition(up);setup.spine.getWorldPosition(a);up.sub(a).normalize();
 setup.left.getWorldPosition(forward);setup.right.getWorldPosition(a);forward.sub(a).cross(up).normalize();
 for(const {side,upper,lower} of setup.arms){
  if(!upper||!lower)continue;
  upper.getWorldPosition(a);lower.getWorldPosition(b);b.sub(a).normalize();
  const angle=Math.acos(Math.max(-1,Math.min(1,-b.dot(up))))*180/Math.PI;
  horizontal.copy(b).addScaledVector(up,-b.dot(up));
  const weights=shoulderWeights(angle,horizontal.length()>.001?horizontal.normalize().dot(forward):0);
  ['UpperArmVolume','ShoulderFront','ShoulderOverhead','ShoulderOverheadFront'].forEach((name,k)=>{
   for(const mesh of setup.meshes){const i=mesh.morphTargetDictionary[name+'_'+side];if(i!==undefined)mesh.morphTargetInfluences[i]=weights[k]}
  });
 }
}
