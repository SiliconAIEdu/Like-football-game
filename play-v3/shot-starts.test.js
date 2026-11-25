import test from 'node:test';import assert from 'node:assert/strict';import {randomShotStarts} from './shot-starts.js';
test('five shooting positions stay distinct and within playable distance',()=>{
 for(let n=0;n<100;n++){
 const points=randomShotStarts();assert.equal(points.length,5);
 for(const p of points){assert.ok(Math.abs(p.x)<=5.2);assert.ok(p.distance>=11&&p.distance<=17);}
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.abs(points[i].x-points[j].x)>=1.6);
 }
 assert.notDeepEqual(randomShotStarts(()=>.1),randomShotStarts(()=>.9));
});
