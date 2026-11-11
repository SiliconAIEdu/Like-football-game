// The source dive leans toward world -X when the keeper faces +Z.
// Reflect the rig's X axis and swap paired bones to produce the opposite pose.
export function mirrorKeeperDive(source){
 const clip=source.clone();
 clip.name='DiveMirror';
 for(const track of clip.tracks){
  track.name=track.name.replace(/_([lr])(?=\.)/,(suffix,side)=>side==='l'?'_r':'_l');
  const values=track.values;
  if(track.name.endsWith('.position')){
   for(let i=0;i<values.length;i+=3)values[i]=-values[i];
  }else if(track.name.endsWith('.quaternion')){
   for(let i=0;i<values.length;i+=4){
    values[i+1]=-values[i+1];
    values[i+2]=-values[i+2];
   }
  }
 }
 return clip;
}

// Preserve the dive's elbow bend while aiming each arm toward the incoming ball.
export function reachWithArm(upper,lower,hand,target,weight){
 const shoulder=upper.getWorldPosition(target.clone());
 const elbow=lower.getWorldPosition(target.clone());
 const wrist=hand.getWorldPosition(target.clone());
 const upperLength=shoulder.distanceTo(elbow);
 const lowerLength=elbow.distanceTo(wrist);
 const aim=target.clone().sub(shoulder);
 if(aim.lengthSq()<1e-8||Math.min(upperLength,lowerLength)<1e-5)return;
 const distance=Math.max(Math.abs(upperLength-lowerLength)+.005,
  Math.min(aim.length(),(upperLength+lowerLength)*.97));
 aim.normalize();
 const along=(upperLength**2-lowerLength**2+distance**2)/(2*distance);
 const bend=elbow.clone().sub(shoulder);
 bend.addScaledVector(aim,-bend.dot(aim));
 if(bend.lengthSq()<1e-8){
  bend.set(0,-1,0).addScaledVector(aim,aim.y);
  if(bend.lengthSq()<1e-8)bend.set(1,0,0);
 }
 const elbowGoal=shoulder.clone().addScaledVector(aim,along)
  .addScaledVector(bend.normalize(),Math.sqrt(Math.max(0,upperLength**2-along**2)));
 const wristGoal=shoulder.clone().addScaledVector(aim,distance);

 function aimBone(bone,child,goal){
  const origin=bone.getWorldPosition(target.clone());
  const before=child.getWorldPosition(target.clone()).sub(origin).normalize();
  const after=goal.clone().sub(origin).normalize();
  const worldRotation=bone.getWorldQuaternion(bone.quaternion.clone());
  const turn=bone.quaternion.clone().setFromUnitVectors(before,after);
  const parentInverse=bone.parent.getWorldQuaternion(bone.quaternion.clone()).invert();
  const rotation=parentInverse.multiply(turn).multiply(worldRotation);
  bone.quaternion.slerp(rotation,weight);
 }
 aimBone(upper,lower,elbowGoal);
 aimBone(lower,hand,wristGoal);
}
