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
