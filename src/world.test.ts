import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canWalk, groundHeight } from './world.ts';

test('港から神社まで中央の道を移動でき、坂を上れる', () => {
  for(let z=25;z>=-103;z--) assert.equal(canWalk(0,z,[]),true);
  assert.equal(groundHeight(25),0);
  assert.equal(groundHeight(-27),0);
  assert.ok(groundHeight(-103)>11);
});
test('海とマップ外へは出られず、桟橋だけに進める', () => {
  assert.equal(canWalk(0,40,[]),false);
  assert.equal(canWalk(-50,60,[]),true);
  assert.equal(canWalk(46,60,[]),true);
  assert.equal(canWalk(46,88,[]),false);
  assert.equal(canWalk(341,0,[]),false);
  assert.equal(canWalk(0,-251,[]),false);
});
test('建物とプレイヤー半径を考慮して侵入を防ぐ', () => {
  const walls=[{x:10,z:0,w:10,d:12}];
  assert.equal(canWalk(10,0,walls),false);
  assert.equal(canWalk(4.8,0,walls),false);
  assert.equal(canWalk(4.5,0,walls),true);
  assert.equal(canWalk(10,6.5,walls),true);
});

import { VEHICLES, canDrive, stepDrive, findExit, sampleRoute, type DriveState } from './simulation.ts';
const neutral={throttle:0,steer:0,vertical:0,brake:false};
test('4車種とも加速して移動し、ブレーキで停止する',()=>{
  for(const vehicle of VEHICLES){
    let state:DriveState={x:0,y:vehicle.id==='air'?30:0,z:vehicle.id==='boat'?180:23,heading:0,speed:0};
    const initialZ=state.z;
    for(let i=0;i<40;i++)state=stepDrive(state,vehicle,{...neutral,throttle:1},.025,[]);
    assert.ok(state.z<initialZ,vehicle.name);
    assert.ok(state.speed>0&&state.speed<=vehicle.maxSpeed,vehicle.name);
    for(let i=0;i<80;i++)state=stepDrive(state,vehicle,{...neutral,brake:true},.025,[]);
    assert.equal(state.speed,0,vehicle.name);
  }
});
test('地上車両は建物を貫通せず、海にも入れない',()=>{
  const bike=VEHICLES[0];let state:DriveState={x:0,y:0,z:10,heading:0,speed:16};const wall=[{x:0,z:0,w:10,d:10,height:10}];
  for(let i=0;i<100;i++)state=stepDrive(state,bike,{...neutral,throttle:1},.05,wall);
  assert.ok(state.z>=5.7);assert.equal(state.speed,0);
  assert.equal(canDrive('truck',0,31,0,[]),false);
  assert.equal(canDrive('bike',341,0,0,[]),false);
});
test('船は桟橋と係留船を避け、外海の範囲内を走れる',()=>{
  assert.equal(canDrive('boat',55,79,0,[]),true);
  assert.equal(canDrive('boat',46,70,0,[]),false);
  assert.equal(canDrive('boat',0,25,0,[]),false);
  assert.equal(canDrive('boat',0,426,0,[]),false);
  assert.equal(canDrive('boat',0,160,0,[{x:0,z:160,w:4,d:8}]),false);
});
test('飛行は建物より上で許可し、上限高度と地面を守る',()=>{
  const wall=[{x:0,z:0,w:10,d:10,height:15}];
  assert.equal(canDrive('air',0,0,10,wall),false);
  assert.equal(canDrive('air',0,0,22,wall),true);
  assert.equal(canDrive('air',0,0,76,[]),false);
  const air=VEHICLES[3];let state:DriveState={x:0,y:73,z:23,heading:0,speed:0};
  for(let i=0;i<30;i++)state=stepDrive(state,air,{...neutral,vertical:1},.05,[]);
  assert.equal(state.y,74);
  for(let i=0;i<200;i++)state=stepDrive(state,air,{...neutral,vertical:-1},.05,[]);
  assert.ok(state.y>=2.2);
});
test('陸と桟橋には降車でき、外海では降車できない',()=>{
  assert.ok(findExit('bike',0,23,[]));assert.ok(findExit('boat',55,79,[]));assert.equal(findExit('boat',0,180,[]),null);
});
test('巡回経路は距離が一周しても連続し、退化した点列にも対応する',()=>{
  const route=[[0,0],[10,0],[10,10],[0,10]] as const;
  assert.deepEqual(sampleRoute(route,5),sampleRoute(route,45));
  assert.equal(sampleRoute(route,15).z,5);
  assert.deepEqual(sampleRoute([[2,3],[2,3]],100),{x:2,z:3,heading:0});
});


import { PLACES, onWalkSurface, boatSurface } from './geography.ts';
test('旧港から東浜・山灯へ道路が途切れずつながる',()=>{
  for(let x=0;x<332;x++)assert.ok(canDrive('truck',x,23,0,[]),`海沿い x=${x}`);
  for(let z=-100;z>=-240;z--)assert.ok(canDrive('bike',35,z,groundHeight(z,35),[]),`山道 z=${z}`);
  for(const place of PLACES)assert.ok(canWalk(place.x,place.z,[]),place.name);
});
test('橋を徒歩と車で渡れ、橋の外側と島の海岸からは落ちない',()=>{
  for(let z=24;z<280;z++){assert.ok(onWalkSurface(230,z));assert.ok(canDrive('truck',230,z,groundHeight(z,230),[]));}
  assert.equal(onWalkSurface(220,110),false);assert.equal(onWalkSurface(230,313),false);
  let state:DriveState={x:230,y:0,z:26,heading:Math.PI,speed:0};
  for(let i=0;i<1100;i++)state=stepDrive(state,VEHICLES[1],{...neutral,throttle:1},.025,[]);
  assert.ok(state.z>275);assert.ok(Math.abs(state.y)<.001);
});
test('船は島に乗り上げず、橋の中央のみ通航できる',()=>{
  assert.equal(boatSurface(230,245,2.5),false);assert.equal(boatSurface(230,110,2.5),true);assert.equal(boatSurface(230,40,2.5),false);
  assert.equal(boatSurface(119,245,2.5),true);assert.ok(findExit('boat',119,245,[]));
  assert.equal(findExit('boat',218,110,[]),null);
});

import { advanceCampaign, freshCampaign, parseCampaign, inMissionRange, rayBoxDistance, choiceConfirmLine, chapterStatusLine, dialogueBody, homecomingBond, homecomingChip, CHOICE_LOG } from './campaign.ts';
test('シナリオは順番を守って6任務を完了し、選択を保持する',()=>{
  let state=freshCampaign();assert.equal(advanceCampaign(state,'home'),state);
  for(const event of ['accept','core','relay','drones'] as const)state=advanceCampaign(state,event);
  assert.equal(state.stage,4);assert.equal(advanceCampaign(state,'network'),state);
  state=advanceCampaign(state,'network','free');state=advanceCampaign(state,'home');
  assert.equal(state.stage,6);assert.equal(state.choice,'free');assert.equal(advanceCampaign(state,'home'),state);
  assert.deepEqual(parseCampaign(JSON.stringify(state)),state);
});
test('破損した保存や不正なチェックポイントを復元しない',()=>{
  for(const raw of [null,'{','{}','{"version":1,"stage":99,"choice":null}','{"version":1,"stage":5,"choice":null}','{"version":1,"stage":0,"choice":"free"}'])assert.equal(parseCampaign(raw),null);
  assert.deepEqual(parseCampaign('{"version":1,"stage":3,"choice":null}'),{version:1,stage:3,choice:null});
});
test('Phase4a: 方針確認文と帰港分岐・ログ記録',()=>{
  assert.equal(choiceConfirmLine('routes'),'航路だけ戻す——監視は残る');
  assert.equal(choiceConfirmLine('free'),'監視網を切る——島は自分たちで守る');
  assert.match(dialogueBody(5,'free'),/監視の赤い目も消えてる/);
  assert.match(dialogueBody(5,'routes'),/監視の網は、まだ港に残ってる/);
  assert.equal(homecomingChip('free'),'帰港灯再点灯');
  assert.equal(homecomingChip('routes'),'監視網は残った');
  assert.ok(homecomingBond('free'));assert.ok(homecomingBond('routes'));
  assert.equal(chapterStatusLine(4,5,'routes'),CHOICE_LOG.routes);
  assert.equal(chapterStatusLine(4,5,'free'),CHOICE_LOG.free);
  assert.equal(chapterStatusLine(5,6,'free'),'完了 · 帰港灯再点灯');
  assert.equal(chapterStatusLine(5,5,'free'),'港に戻ってナギに報告する');
  assert.equal(chapterStatusLine(3,4,null),'完了');
});
test('任務操作は現地かつ地上にいる時に限る',()=>{
  assert.ok(inMissionRange(0,8,23,1.75,0));assert.equal(inMissionRange(0,8,23,30,0),false);assert.equal(inMissionRange(0,180,20,1.75,0),false);assert.equal(inMissionRange(6,8,23,1.75,0),false);
});
test('射線とカメラは壁の手前で止まり、壁の上は通る',()=>{
  const wall={x:0,z:-10,w:4,d:2,bottom:0,top:5},direction={x:0,y:0,z:-1};
  assert.equal(rayBoxDistance({x:0,y:2,z:0},direction,wall),9);
  assert.equal(rayBoxDistance({x:0,y:6,z:0},direction,wall),Infinity);
  assert.equal(rayBoxDistance({x:4,y:2,z:0},direction,wall),Infinity);
  assert.equal(rayBoxDistance({x:0,y:2,z:-10},direction,wall),0);
});

import { stepFoot, smoothAngle } from './simulation.ts';
test('斜め移動は速くならず、入力を離すと短距離で停止する',()=>{
  let straight={x:0,z:0},diagonal={x:0,z:0};
  for(let i=0;i<60;i++){straight=stepFoot(straight,1,0,0,3.8,1/60);diagonal=stepFoot(diagonal,1,1,0,3.8,1/60);}
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-Math.hypot(straight.x,straight.z))<.001);
  let drift=0;for(let i=0;i<30;i++){straight=stepFoot(straight,0,0,0,3.8,1/60);drift+=Math.hypot(straight.x,straight.z)/60;}
  assert.ok(drift<.18);assert.ok(Math.hypot(straight.x,straight.z)<.001);
});
test('旋回は角度の境界でも近い向きへ回る',()=>{
  const result=smoothAngle(Math.PI-.01,-Math.PI+.01,.016);
  assert.ok(result>Math.PI-.01);assert.ok(result<Math.PI+.01);
});
test('各車種の操舵は滑らかに入り、入力解除で戻る',()=>{
  for(const vehicle of VEHICLES){let state:DriveState={x:0,z:vehicle.id==='boat'?150:0,y:vehicle.id==='air'?40:0,heading:0,speed:3};
    state=stepDrive(state,vehicle,{throttle:0,steer:1,vertical:0,brake:false},1/60,[]);
    assert.ok(state.steering!>0&&state.steering!<.2);const first=state.steering!;
    state=stepDrive(state,vehicle,{throttle:0,steer:0,vertical:0,brake:false},1/60,[]);assert.ok(state.steering!<first);
    const unchanged=stepDrive(state,vehicle,{throttle:1,steer:1,vertical:1,brake:false},0,[]);assert.deepEqual(unchanged,state);
  }
});
test('30fpsと120fpsの直進距離が大きく変わらない',()=>{
  for(const vehicle of VEHICLES){const simulate=(fps:number)=>{let state:DriveState={x:0,z:vehicle.id==='boat'?150:0,y:vehicle.id==='air'?40:0,heading:0,speed:0};for(let i=0;i<fps*2;i++)state=stepDrive(state,vehicle,{throttle:1,steer:0,vertical:0,brake:false},1/fps,[]);return state;};assert.ok(Math.abs(simulate(30).z-simulate(120).z)<.25);}
});


import { SURFACE, ACCENT, HOUSE_PALETTE, harborDay, harborNight, NEON, harborMat, harborGlow } from './look.ts';
test('Phase 1 look palette stays harbor-warm (teal/amber accents, no sterile cold base)', () => {
  assert.equal(ACCENT.teal, '#8dffee');
  assert.equal(ACCENT.amber, '#f5ca7f');
  assert.equal(SURFACE.baseDeep, '#0c252e');
  assert.equal(SURFACE.ground, '#2b494b');
  assert.equal(SURFACE.wetGray, '#5d7470');
  assert.equal(HOUSE_PALETTE.length, 6);
  assert.equal(harborNight.fog, '#1a3a40');
  assert.ok(harborDay.sunColor.startsWith('#f') || harborDay.sunColor.startsWith('#e') || harborDay.sunColor.startsWith('#d'));
  assert.equal(NEON.pair(0), ACCENT.teal);
  assert.equal(NEON.pair(1), ACCENT.amber);
  const m = harborMat(SURFACE.wetGray);
  assert.ok(m.roughness >= 0.7);
  assert.ok(m.metalness <= 0.1);
  m.dispose();
  const g = harborGlow(ACCENT.amber, 1.3);
  assert.ok(g.emissiveIntensity > 0);
  g.dispose();
});
