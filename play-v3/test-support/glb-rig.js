import fs from 'node:fs';import * as T from '../../vendor/three.module.js';
export function asset(path){
 const bytes=fs.readFileSync(path),len=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+len)),start=28+len;
 const nodes=j.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();j.scenes[j.scene||0].nodes.forEach(i=>scene.add(nodes[i]));
 function data(i,size){const a=j.accessors[i],v=j.bufferViews[a.bufferView],offset=start+(v.byteOffset||0)+(a.byteOffset||0);return Float32Array.from({length:a.count*size},(_,k)=>bytes.readFloatLE(offset+4*k));}
 const animations=(j.animations||[]).map(a=>new T.AnimationClip(a.name,-1,a.channels.filter(c=>c.target.path!=='scale').map(c=>{const s=a.samplers[c.sampler],q=c.target.path==='rotation';return new (q?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(j.nodes[c.target.node].name+(q?'.quaternion':'.position'),data(s.input,1),data(s.output,q?4:3));})));
 return {scene,animations};
}
