import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{KEEPER_DIVE_SECONDS,KEEPER_RECOVERY_SECONDS,keeperCanDive,tickKeeperRecovery}from './keeper-timing.js';
test('keeper duration includes the shared landing phase',()=>{assert.equal(KEEPER_DIVE_SECONDS,1.6);assert.ok(KEEPER_RECOVERY_SECONDS>=.5);});
test('keeper cannot immediately repeat a completed dive',()=>{const a={diveRecoveryLeft:KEEPER_RECOVERY_SECONDS};assert.equal(keeperCanDive(a),false);tickKeeperRecovery(a,.3);assert.equal(keeperCanDive(a),false);tickKeeperRecovery(a,1);assert.equal(keeperCanDive(a),true);assert.equal(a.diveRecoveryLeft,0);});
