import * as T from '../vendor/three.module.js';
// Research-informed stylized animation, not a force simulation or motion capture.
// Sequential contralateral/ipsilateral push-off: Ibrahim et al., Frontiers 2020.
// Low set posture, forward open-hand reach: FIFA / FA goalkeeper coaching.
export const DIVE_DURATION=1.6;
export const DIVE_PHASES={load:.16,takeoff:.34,reach:.53,land:.73,recover:.86};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const v=(x,y,z)=>new T.Vector3(x,y,z);
export function diveEnvelope(t){t=clamp(t);return {travel:smooth(.12,.61,t),flight:Math.sin(Math.PI*clamp((t-.23)/.50)),reach:smooth(.08,.36,t)*(1-smooth(.76,.98,t)),lean:smooth(.18,.56,t)*(1-smooth(.83,1,t)),land:smooth(.57,.75,t)*(1-smooth(.84,1,t))};}
function skeletonCopy(node){const o=new T.Object3D();o.name=node.name;o.position.copy(node.position);o.quaternion.copy(node.quaternion);o.scale.copy(node.scale);for(const c of node.children)o.add(skeletonCopy(c));return o;}
function worldRotation(bone,q){const parent=bone.parent?.getWorldQuaternion(new T.Quaternion())??new T.Quaternion();bone.quaternion.copy(parent.invert().multiply(q));bone.updateMatrixWorld(true);}
function worldPosition(bone,p){bone.position.copy(bone.parent?bone.parent.worldToLocal(p.clone()):p);bone.updateMatrixWorld(true);}
function aim(bone,child,goal){const start=bone.getWorldPosition(v(0,0,0)),before=child.getWorldPosition(v(0,0,0)).sub(start).normalize(),after=goal.clone().sub(start).normalize();if(before.lengthSq()<.5||after.lengthSq()<.5)return;const q=new T.Quaternion().setFromUnitVectors(before,after).multiply(bone.getWorldQuaternion(new T.Quaternion()));worldRotation(bone,q);}
// Explicit pole prevents the elbow from solving behind the chest.
export function solveLimb(upper,lower,end,target,pole){
 const a=upper.getWorldPosition(v(0,0,0)),b=lower.getWorldPosition(v(0,0,0)),c=end.getWorldPosition(v(0,0,0));const l1=a.distanceTo(b),l2=b.distanceTo(c);if(Math.min(l1,l2)<1e-5)return;
 const d=target.clone().sub(a),distance=Math.max(Math.abs(l1-l2)+1e-4,Math.min(d.length(),(l1+l2)*.965));d.normalize();let bend=pole.clone().sub(a);bend.addScaledVector(d,-bend.dot(d));if(bend.lengthSq()<1e-8){bend=v(0,0,1).addScaledVector(d,-d.z);}bend.normalize();const along=(l1*l1-l2*l2+distance*distance)/(2*distance);const elbow=a.clone().addScaledVector(d,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));aim(upper,lower,elbow);aim(lower,end,a.clone().addScaledVector(d,distance));
}
export function biomechanicalKeeperClips(scene,directions=[-1,1]){
 return directions.map(direction=>{
  const rig=skeletonCopy(scene);rig.updateMatrixWorld(true);const nodes=[];rig.traverse(n=>{if(/^(Root|pelvis|spine_\d+|neck_\d+|head|clavicle_[lr]|scapula_[lr]|deltoid_[lr]|upperarm_[lr]|lowerarm_[lr]|hand_[lr]|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr])$/.test(n.name))nodes.push(n)});
  const get=n=>rig.getObjectByName(n),pelvis=get('pelvis'),chest=get('spine_03');if(!pelvis||!chest)throw new Error('Missing goalkeeper torso bones');
  const rest=new Map(nodes.map(n=>[n,{p:n.position.clone(),q:n.quaternion.clone(),world:n.getWorldQuaternion(new T.Quaternion()),point:n.getWorldPosition(v(0,0,0))}]));
  const hip=rest.get(pelvis).point,floor=Math.min(...['ball_l','ball_r','foot_l','foot_r'].map(n=>get(n)?.getWorldPosition(v(0,0,0)).y??hip.y));const leg=hip.y-floor,scale=leg/.96;const frames=96,times=[],tracks=new Map(nodes.map(n=>[n,{p:[],q:[]}])) ;
  for(let f=0;f<=frames;f++){
   const t=f/frames,e=diveEnvelope(t);times.push(t*DIVE_DURATION);for(const n of nodes){n.position.copy(rest.get(n).p);n.quaternion.copy(rest.get(n).q)}rig.updateMatrixWorld(true);
   const load=smooth(0,.13,t)*(1-smooth(.19,.34,t)),drop=(direction===0?.12:.82)*leg*e.land;
   worldPosition(pelvis,hip.clone().add(v(0,-.12*leg*load-drop,0)));
   const tilt=new T.Quaternion().setFromAxisAngle(v(0,0,1),-direction*(1.23*e.lean));worldRotation(pelvis,tilt.clone().multiply(rest.get(pelvis).world));
   // Prepare both feet; the far leg extends first, the near leg follows.
   for(const [side,sign] of [['l',1],['r',-1]]){
    const upper=get('thigh_'+side),lower=get('calf_'+side),foot=get('foot_'+side);if(!upper||!lower||!foot)continue;
    const planted=rest.get(foot).point.clone(),onSide=sign===direction,push=smooth(onSide?.22:.15,onSide?.38:.29,t),air=smooth(.30,.46,t)*(1-smooth(.80,1,t));
    const trailing=hip.clone().add(v(-direction*(.46+(onSide?0:.18))*scale,-.62*leg*(1-e.land),(onSide?.12:-.06)*scale));trailing.y-=drop;
    const target=direction===0?planted.clone().add(v(0,.10*leg*air,0)):planted.lerp(trailing,air);target.y+=.05*scale*push*(1-air);const knee=upper.getWorldPosition(v(0,0,0)).add(v(sign*.12*scale,-.35*scale*(1-e.land),.45*scale));solveLimb(upper,lower,foot,target,knee);
   }
   for(const [side,sign] of [['l',1],['r',-1]]){
    const upper=get('upperarm_'+side),lower=get('lowerarm_'+side),hand=get('hand_'+side);if(!upper||!lower||!hand)continue;
    const center=chest.getWorldPosition(v(0,0,0));const ready=center.clone().add(v(sign*.16*scale,-.25*scale,.30*scale));const reach=center.clone().add(v(direction*.56*scale+sign*.09*scale,(direction===0?.40:.12)*scale,.48*scale));const target=ready.lerp(reach,e.reach);
    const pole=center.clone().add(v(sign*.32*scale,-.32*scale,.38*scale));solveLimb(upper,lower,hand,target,pole);
    // Wrist continues the forearm; no backwards palm flip from the old Dive clip.
    const forearm=hand.getWorldPosition(v(0,0,0)).sub(lower.getWorldPosition(v(0,0,0))).normalize();const bind=rest.get(hand).world.clone(),localLong=rest.get(hand).point.clone().sub(rest.get(lower).point).normalize();const world=bind.clone();const delta=new T.Quaternion().setFromUnitVectors(localLong,forearm);worldRotation(hand,delta.multiply(world));
    const deltoid=get('deltoid_'+side);if(deltoid){const base=tilt.clone().multiply(rest.get(deltoid).world),q=base.slerp(upper.getWorldQuaternion(new T.Quaternion()),.35);worldRotation(deltoid,q);}
   }
   for(const n of nodes){const a=tracks.get(n);a.p.push(...n.position.toArray());a.q.push(...n.quaternion.toArray())}
  }
  return new T.AnimationClip(direction===0?'JumpSave':direction<0?'Dive':'DiveMirror',DIVE_DURATION,nodes.flatMap(n=>[new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,tracks.get(n).q),new T.VectorKeyframeTrack(n.name+'.position',times,tracks.get(n).p)]));
 });
}
export function beginDivePlant(actor,direction){actor.model.updateMatrixWorld(true);actor.divePlant={direction,feet:{}};for(const side of ['l','r']){const foot=actor.model.getObjectByName('foot_'+side);if(foot)actor.divePlant.feet[side]=foot.getWorldPosition(v(0,0,0));}}
export function applyDivePlant(actor,progress){if(!actor.divePlant)return;const {direction,feet}=actor.divePlant;for(const [side,sign]of [['l',1],['r',-1]]){const near=sign===direction,weight=1-smooth(near?.24:.16,near?.38:.29,progress);if(weight<=0||!feet[side])continue;const get=n=>actor.model.getObjectByName(n+'_'+side),u=get('thigh'),l=get('calf'),f=get('foot');if(!u||!l||!f)continue;actor.model.updateMatrixWorld(true);const target=f.getWorldPosition(v(0,0,0)).lerp(feet[side],weight);const pole=u.getWorldPosition(v(0,0,0)).add(v(sign*.1,-.3,.5));solveLimb(u,l,f,target,pole);}}
