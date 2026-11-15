import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

export function addYamalCurls(model){
 const head=model.getObjectByName('head');
 if(!head)return;
 model.updateWorldMatrix(true,true);
 const curls=[];
 const colors=[0x6a4329,0x946236,0xc09150,0xd9ac6a].map(hex=>new THREE.Color(hex));
 let seed=19;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let row=0;row<6;row++){
  const latitude=.14+row*.25;
  const count=Math.round(25*Math.cos(latitude));
  for(let i=0;i<count;i++){
   const angle=(i+(row%2)*.5)*Math.PI*2/count;
   const front=Math.max(0,Math.sin(angle));
   const radial=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
   const tangent=new THREE.Vector3(-radial.z,0,radial.x);
   const center=new THREE.Vector3(radial.x*.086*Math.cos(latitude),
    1.76+.080*Math.sin(latitude)+front*.026,
    -.008+radial.z*.082*Math.cos(latitude));
   const size=.010+random()*.009;
   const phase=random()*Math.PI*2;
   const points=Array.from({length:13},(_,j)=>{
    const t=j/12;
    const turn=phase+t*Math.PI*2.5;
    const p=center.clone().addScaledVector(tangent,size*Math.cos(turn))
     .addScaledVector(radial,.007+size*.45*Math.sin(turn)+.010*Math.sin(Math.PI*t));
    p.y+=size*Math.sin(turn)*.75+(t-.5)*.012;
    return head.worldToLocal(model.localToWorld(p));
   });
   const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.0038,5,false);
   const color=colors[Math.floor(random()*colors.length)];
   const data=new Float32Array(geo.attributes.position.count*3);
   for(let j=0;j<data.length;j+=3)color.toArray(data,j);
   geo.setAttribute('color',new THREE.BufferAttribute(data,3));
   curls.push(geo);
  }
 }
 const hair=new THREE.Mesh(mergeGeometries(curls),new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.73
 }));
 hair.name='Yamal_Golden_Curls';
 hair.castShadow=true;
 curls.forEach(geometry=>geometry.dispose());
 head.add(hair);
}
