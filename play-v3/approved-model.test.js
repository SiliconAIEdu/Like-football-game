import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {players} from './roster.js';
const bytes=fs.readFileSync(new URL('./assets/ronaldo-anatomy-v8.glb',import.meta.url));
const len=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+len)),bin=bytes.subarray(28+len);
function floats(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView];assert.equal(a.componentType,5126);return Array.from({length:a.count*4},(_,i)=>bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4));}
test('Ronaldo selects approved model; gzip is the identical model',()=>{
 assert.equal(players.find(p=>p.id==='ronaldo').model,'assets/ronaldo-anatomy-v8.glb');
 assert.deepEqual(zlib.gunzipSync(fs.readFileSync(new URL('./assets/ronaldo-anatomy-v8.glb.gz',import.meta.url))),bytes);
});
test('approved portrait has valid weights and animation/contact bones',()=>{
 const names=new Set(doc.skins.flatMap(s=>s.joints.map(i=>doc.nodes[i].name)));
 for(const n of ['pelvis','neck_01','head','hand_l','hand_r','ball_l','ball_r','upperarm_l','lowerarm_l'])assert.ok(names.has(n),n);
 assert.ok(doc.nodes.filter(n=>n.mesh!==undefined).every(n=>n.skin!==undefined&&n.extras.approvedPortrait));
 for(const mesh of doc.meshes)for(const p of mesh.primitives){
  assert.ok(p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined);
  const ws=floats(p.attributes.WEIGHTS_0);
  for(let i=0;i<ws.length;i+=4){assert.ok(ws.slice(i,i+4).every(w=>Number.isFinite(w)&&w>=0));assert.ok(Math.abs(ws[i]+ws[i+1]+ws[i+2]+ws[i+3]-1)<.001);}
 }
});
