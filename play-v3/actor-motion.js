// A model-specific retarget must win over the generic library, otherwise updated
// wrists/ankles can silently continue playing the previous model's animation.
export const motionName=name=>name.replace(/_Ronaldo_Rig$/,'').toLowerCase();
export function actorMotions(library,source){
 const own=new Map((source.animations||[]).map(clip=>[motionName(clip.name),clip]));
 const selected=(library||source.animations||[]).map(fallback=>{
  const clip=own.get(motionName(fallback.name));
  return {clip:clip||fallback,local:!!clip};
 });
 const used=new Set(selected.map(({clip})=>motionName(clip.name)));
 for(const [name,clip] of own)if(!used.has(name))selected.push({clip,local:true});
 return selected;
}
