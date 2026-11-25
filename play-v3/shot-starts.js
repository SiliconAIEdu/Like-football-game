// Five distinct shooting lanes, shuffled once per match. Retry keeps its spot.
export function randomShotStarts(random=Math.random){
 const starts=[-4.8,-2.4,0,2.4,4.8].map(x=>({x:x+(random()-.5)*.8,distance:11+random()*6}));
 for(let i=starts.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[starts[i],starts[j]]=[starts[j],starts[i]];}
 return starts;
}
