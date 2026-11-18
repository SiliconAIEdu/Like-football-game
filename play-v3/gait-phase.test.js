import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {matchingGaitTime} from './gait-phase.js';
test('incoming gait finds matching leg pose, including equivalent negative quaternions',()=>{
 const model=new THREE.Group(),bone=new THREE.Bone();bone.name='thigh_l';model.add(bone);
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),1);
 bone.quaternion.copy(q);const clip=new THREE.AnimationClip('Run',1,[new THREE.QuaternionKeyframeTrack('thigh_l.quaternion',[0,.5,1],[0,0,0,1,-q.x,-q.y,-q.z,-q.w,0,0,0,1])]);
 assert.equal(matchingGaitTime(clip,model),.5);
});
