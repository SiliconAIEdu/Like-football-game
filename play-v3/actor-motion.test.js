import test from 'node:test';
import assert from 'node:assert/strict';
import {actorMotions} from './actor-motion.js';
test('model-specific retarget replaces generic gait but retains missing reactions',()=>{
 const run={name:'Run'},reaction={name:'ReactGoal'},updated={name:'Run_Ronaldo_Rig'};
 const result=actorMotions([run,reaction],{animations:[updated]});
 assert.equal(result[0].clip,updated);assert.equal(result[0].local,true);
 assert.equal(result[1].clip,reaction);assert.equal(result[1].local,false);
});
