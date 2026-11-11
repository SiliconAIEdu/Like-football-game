export const GOAL_Z=-14,GOAL_HALF=3.66,GOAL_HEIGHT=2.44;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const GRAVITY=9.81;

// The reticle indicates the intended target. Harder shots trade accuracy for speed.
export function shotTarget(aim,power,random=Math.random){
 const overhit=clamp((power-.65)/.35,0,1);
 const spread=.26+.43*overhit*overhit;
 return {
  x:aim.x+(random()*2-1)*spread,
  y:Math.max(.12,aim.y+(random()*2-1)*spread*.8),
  z:aim.z
 };
}

export function flight(start,target,power=.65){
 const speed=13+power*13;
 const distance=Math.hypot(target.x-start.x,target.z-start.z);
 return {duration:Math.max(.06,distance/speed),start:{...start},target:{...target}};
}

export function flightPoint(f,t){
 const time=clamp(t,0,f.duration);
 const p=time/f.duration;
 return {
  x:f.start.x+(f.target.x-f.start.x)*p,
  y:f.start.y+(f.target.y-f.start.y)*p+.5*GRAVITY*time*(f.duration-time),
  z:f.start.z+(f.target.z-f.start.z)*p
 };
}

// Return the first point in a frame where the moving ball touches a collider.
export function sweptContact(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const x=from.x-center.x,y=from.y-center.y,z=from.z-center.z;
 const c=x*x+y*y+z*z-radius*radius;
 if(c<=0)return 0;
 const a=dx*dx+dy*dy+dz*dz;
 const b=x*dx+y*dy+z*dz;
 const discriminant=b*b-a*c;
 if(a===0||b>=0||discriminant<0)return null;
 const hit=(-b-Math.sqrt(discriminant))/a;
 return hit<=1?hit:null;
}

export function inGoal(p){return Math.abs(p.x)<GOAL_HALF-.12&&p.y>.1&&p.y<GOAL_HEIGHT-.12}
export function keeperReach(ball,keeperX,diving){return Math.abs(ball.x-keeperX)<(diving?1.25:.47)&&ball.y<(diving?2.3:1.7)}
export const refScenarios=[{foul:true,title:'从身后推倒对手',explain:'防守队员从背后推人，没有触到球，应判犯规。',type:'push'},{foul:false,title:'干净地抢到球',explain:'防守队员先触球，随后带球离开，没有造成犯规接触。',type:'clean'},{foul:true,title:'伸腿绊倒对手',explain:'防守队员没有碰到球，伸腿绊倒了带球队员。',type:'trip'},{foul:false,title:'合理的肩部争抢',explain:'双方在争球距离内肩对肩接触，没有推搡或拉拽，比赛继续。',type:'shoulder'}];

export function strikeRoot(ball,yaw,contact,scale=1){return{x:ball.x-scale*(contact.x*Math.cos(yaw)+contact.z*Math.sin(yaw)),y:0,z:ball.z-scale*(-contact.x*Math.sin(yaw)+contact.z*Math.cos(yaw))}}

function shuffled(items,random){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

// Keep a full set of practice shots while varying their order and exact targets.
export function randomKeeperTargets(random=Math.random){
 return shuffled([-1,-1,1,1,0],random).map(side=>({
  x:side===0?(random()*2-1)*2.7:side*(2.8+random()*.6),
  y:side===0?.22+random()*.43:2+random()*.28,
  z:GOAL_Z
 }));
}

// Shuffle once per match so replay and judging share the same scenario.
export function randomRefScenarios(random=Math.random){
 return shuffled(refScenarios,random);
}
