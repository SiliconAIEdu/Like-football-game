// Match the incoming captured gait to the visible leg pose. This avoids changing
// the support leg abruptly when entering a run or changing from walking to running.
export function matchingGaitTime(clip, model, samples=48){
 const names=['thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r'];
 const tracks=names.map(name=>{
  const bone=model.getObjectByName(name),track=clip.tracks.find(t=>t.name===name+'.quaternion');
  return bone&&track?{q:bone.quaternion,interpolate:track.createInterpolant()}:null;
 }).filter(Boolean);
 if(!tracks.length||!clip.duration)return 0;
 let best=Infinity,time=0;
 for(let i=0;i<samples;i++){
  const t=i*clip.duration/samples;let cost=0;
  for(const {q,interpolate} of tracks){const v=interpolate.evaluate(t);const dot=Math.min(1,Math.abs(q.x*v[0]+q.y*v[1]+q.z*v[2]+q.w*v[3]));cost+=1-dot*dot;}
  if(cost<best){best=cost;time=t;}
 }
 return time;
}
