import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {actorMotions} from './actor-motion.js';
import {players} from './roster.js';
const path=new URL('./assets/yamal-playable-v1.glb',import.meta.url),raw=fs.readFileSync(path),length=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+length)),binary=raw.subarray(28+length);
function attribute(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5121:1,5123:2,5126:4}[a.componentType],stride=v.byteStride||n*bytes,base=(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>a.componentType===5126?binary.readFloatLE(base+i*stride+j*bytes):a.componentType===5123?binary.readUInt16LE(base+i*stride+j*bytes):binary.readUInt8(base+i*stride+j*bytes)));}
test('Yamal roster uses the new skinned model and matching compressed asset',()=>{
 assert.equal(players.find(p=>p.id==='yamal').model,'assets/yamal-playable-v1.glb');assert.deepEqual(zlib.gunzipSync(fs.readFileSync(new URL('./assets/yamal-playable-v1.glb.gz',import.meta.url))),raw);
 assert.ok(doc.skins?.length);assert.ok(doc.skins.every(s=>s.joints.length===27));
 const names=new Set(doc.animations.map(a=>a.name));for(const name of ['Idle','Walk','Run','Kick','RunStop','TurnLeft','TurnRight','ReactGoal','ReactMiss'])assert.ok(names.has(name),name);
 for(const mesh of doc.meshes)for(const p of mesh.primitives){assert.ok(p.attributes.JOINTS_0!==undefined);const weights=attribute(p.attributes.WEIGHTS_0);for(const w of weights)assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<.0001);}
});
test('Character-specific clips win without applying foreign rest-position offsets',()=>{
 const library=[{name:'Kick'},{name:'ReactGoal'}],own={name:'Kick'},check={name:'CheckRest'};
 const result=actorMotions(library,{animations:[own,check]});assert.equal(result[0].clip,own);assert.equal(result[0].local,true);assert.equal(result[1].local,false);assert.ok(result.some(r=>r.clip===check&&r.local));
});
test('The dedicated kick contract matches the new foot and preserves release time',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('./assets/yamal-playable-v1-contact.json',import.meta.url)));assert.equal(c.rig,'yamal-playable-v1');assert.equal(c.time,.9);assert.ok(c.duration>c.time);
 const p=c.footAtContact,q=c.contact;assert.ok(Math.abs(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)-.11)<.002);
});
