import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

export function addYamalCurls(model){
 const head=model.getObjectByName('head');
 if(!head)return;
 model.updateWorldMatrix(true,true);
 const parts=[];
 const colors=[0x805431,0x9c693b,0xb98448,0xc99554].map(hex=>new THREE.Color(hex));
 let seed=19;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 const local=p=>head.worldToLocal(model.localToWorld(p));

 // The front of this head is +Z. Fit the cap around the forehead and temples.
 function scalp(angle,row){
  const front=Math.max(0,Math.sin(angle));
  const baseY=1.754+.048*front;
  const ring=Math.cos(row*Math.PI/2);
  return new THREE.Vector3(.091*Math.cos(angle)*ring,
   baseY+(1.88-baseY)*Math.sin(row*Math.PI/2),
   .063+(Math.sin(angle)>0?.114:.123)*Math.sin(angle)*ring);
 }
 function tint(geometry,color){
  const data=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<data.length;i+=3)color.toArray(data,i);
  geometry.setAttribute('color',new THREE.BufferAttribute(data,3));
  return geometry;
 }

 const cap=new THREE.SphereGeometry(1,36,16,0,Math.PI*2,0,Math.PI/2);
 const vertices=cap.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const angle=Math.atan2(vertices.getZ(i),vertices.getX(i));
  const row=Math.asin(THREE.MathUtils.clamp(vertices.getY(i),0,1))*2/Math.PI;
  const point=local(scalp(angle,row));
  vertices.setXYZ(i,point.x,point.y,point.z);
 }
 cap.computeVertexNormals();
 parts.push(tint(cap,new THREE.Color(0x623e24)));

 for(let row=0;row<6;row++){
  const level=row/6;
  const count=Math.round(21*Math.cos(level*Math.PI/2));
  for(let i=0;i<count;i++){
   const angle=(i+(row%2)*.5+random()*.34)*Math.PI*2/count;
   const center=scalp(angle,level);
   const radial=new THREE.Vector3(Math.cos(angle),level*.8,Math.sin(angle)).normalize();
   const tangent=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
   const up=radial.clone().cross(tangent).negate();
   const size=.016+random()*.009;
   const phase=random()*Math.PI*2;
   const points=Array.from({length:15},(_,j)=>{
    const t=j/14;
    const turn=phase+t*Math.PI*1.85;
    const radius=size*(1-.25*t);
    return local(center.clone().addScaledVector(tangent,radius*Math.cos(turn))
     .addScaledVector(up,radius*Math.sin(turn))
     .addScaledVector(radial,-.003+.017*Math.sin(Math.PI*t)));
   });
   const curve=new THREE.CatmullRomCurve3(points);
   const segments=16;
   const sides=7;
   const curl=new THREE.TubeGeometry(curve,segments,.008,sides,false);
   const strand=curl.attributes.position;
   const point=new THREE.Vector3();
   for(let step=0;step<=segments;step++){
    const t=step/segments;
    const axis=curve.getPointAt(t);
    const width=.28+.72*Math.sin(Math.PI*t)**.65;
    for(let j=0;j<=sides;j++){
     const index=step*(sides+1)+j;
     point.fromBufferAttribute(strand,index).sub(axis).multiplyScalar(width).add(axis);
     strand.setXYZ(index,point.x,point.y,point.z);
    }
   }
   curl.computeVertexNormals();
   parts.push(tint(curl,colors[Math.floor(random()*colors.length)]));
  }
 }
 const hair=new THREE.Mesh(mergeGeometries(parts),new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.73,side:THREE.DoubleSide
 }));
 hair.name='Yamal_Golden_Curls';
 hair.castShadow=true;
 parts.forEach(geometry=>geometry.dispose());
 head.add(hair);
}
