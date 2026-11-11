import test from 'node:test';import assert from 'node:assert/strict';import {flight,flightPoint,movingContact,inGoal,keeperReach,stepCharge,shotTarget,randomKeeperTargets,refScenarios,randomRefScenarios} from './rules.js';
test('shot reaches its aimed position and respects posts/crossbar',()=>{const start={x:0,y:.22,z:3},target={x:2,y:1,z:-14},f=flight(start,target,.7);assert.deepEqual(flightPoint(f,0),start);const end=flightPoint(f,f.duration);assert.ok(Math.abs(end.y-target.y)<1e-8);assert.equal(end.z,-14);assert.equal(inGoal(end),true);assert.equal(inGoal({x:4,y:1}),false);assert.equal(inGoal({x:0,y:2.6}),false)});
test('a keeper can save a reachable ball but not cover the whole goal',()=>{assert.equal(keeperReach({x:2.8,y:1},0,false),false);assert.equal(keeperReach({x:2.8,y:1},2.6,false),true);assert.equal(keeperReach({x:2.8,y:1.9},1.8,true),true);assert.equal(keeperReach({x:2.8,y:1.9},1.8,false),false)});
test('referee challenge includes foul and fair-play decisions',()=>{assert.equal(refScenarios.length,4);assert.equal(refScenarios.filter(s=>s.foul).length,2);assert.ok(refScenarios.every(s=>s.explain.length>10))});

test('referee rounds shuffle without losing scenarios or changing the source',()=>{const original=[...refScenarios];const shuffled=randomRefScenarios(()=>0);assert.deepEqual(refScenarios,original);assert.equal(new Set(shuffled).size,4);assert.ok(original.every(s=>shuffled.includes(s)));assert.notDeepEqual(shuffled,original);assert.equal(shuffled.filter(s=>s.foul).length,2);assert.deepEqual(randomRefScenarios(()=>.999),original)});

test('either upper corner can score or miss, and high power widens the miss',()=>{
 for(const side of [-1,1]){
  const aim={x:3.45*side,y:2.2,z:-14};
  const sample=(power,values)=>shotTarget(aim,power,()=>values.shift());
  const inward=[side>0?.1:.9,.1];
  const outward=[side>0?.9:.1,.9];
  assert.equal(inGoal(sample(.65,inward)),true);
  const controlled=sample(.65,[...outward]);
  const hard=sample(1,outward);
  assert.equal(inGoal(controlled),false);
  assert.ok(Math.abs(hard.x)>Math.abs(controlled.x)&&hard.y>controlled.y);
  assert.equal(hard.z,aim.z);
 }
});

test('keeper practice shuffles two high shots on each side and a low shot',()=>{
 const first=randomKeeperTargets(()=>0);
 const second=randomKeeperTargets(()=>.99);
 const classify=shots=>shots.map(({x,y})=>y<1?'low':x<0?'left':'right');
 for(const shots of [first,second]){
  assert.deepEqual(classify(shots).sort(),['left','left','low','right','right']);
  assert.ok(shots.every(inGoal));
 }
 assert.notDeepEqual(classify(first),classify(second));
 assert.notEqual(first.find(s=>s.x<0&&s.y>1).x,second.find(s=>s.x<0&&s.y>1).x);
});

test('holding the shot key cycles from zero to full power and back',()=>{
 let state={power:0,direction:1};
 const endpoints=[];
 for(let frame=0;frame<150;frame++){
  state=stepCharge(state.power,state.direction,.05);
  if(state.power===0||state.power===1)endpoints.push(state.power);
 }
 assert.deepEqual(endpoints,[1,0,1]);
 assert.ok(state.power>0&&state.power<1&&state.direction===-1);
});

test('the marked power band is more accurate than very weak or full power',()=>{
 const aim={x:0,y:1,z:-14};
 const offset=power=>shotTarget(aim,power,()=>.99).x;
 assert.equal(offset(.55),offset(.70));
 assert.ok(offset(.65)<offset(.1)&&offset(.65)<offset(1));
});

test('a moving glove can intercept the ball between frames without saving a nearby miss',()=>{
 const from={x:0,y:1,z:1},to={x:0,y:1,z:-1};
 const previous={x:-.4,y:1,z:0},current={x:.4,y:1,z:0};
 const hit=movingContact(from,to,previous,current,.16);
 assert.ok(hit>0&&hit<.5);
 assert.equal(movingContact(from,to,{...previous,y:1.3},{...current,y:1.3},.16),null);
});
