import { groundHeight, onWalkSurface, boatSurface } from './geography.ts';
export { groundHeight } from './geography.ts';
export type Collider = { x: number; z: number; w: number; d: number; height?: number };
export type VehicleKind = 'bike' | 'truck' | 'boat' | 'air';
export type VehicleDefinition = { id: VehicleKind; name: string; tag: string; description: string; color: string; maxSpeed: number; acceleration: number; turnRate: number; radius: number; home: [number, number]; };
export const VEHICLES: VehicleDefinition[] = [
  { id: 'bike', name: 'ホバーバイク', tag: 'KAZE / LAND', description: '路地をすり抜ける、一人乗りの浮遊バイク。', color: '#66ffe1', maxSpeed: 16, acceleration: 11.5, turnRate: 2.15, radius: .7, home: [2, 24] },
  { id: 'truck', name: '電動軽トラック', tag: 'MINATO / CARGO', description: '水産市場の働き者。ゆっくり街を巡る。', color: '#ffc07a', maxSpeed: 10, acceleration: 4.4, turnRate: 1.05, radius: 1.25, home: [35, 23] },
  { id: 'boat', name: '水上タクシー', tag: 'NAMI / MARINE', description: '桟橋を離れ、海からネオンの街を眺める。', color: '#79bbff', maxSpeed: 14, acceleration: 4.8, turnRate: .95, radius: 2.5, home: [55, 79] },
  { id: 'air', name: 'スカイポッド', tag: 'SORA / AIR', description: '屋根の上へ。空から港と山を巡る二人乗り。', color: '#f898ff', maxSpeed: 20, acceleration: 8.2, turnRate: 1.42, radius: 1.8, home: [70, 23] },
];
export function canWalk(x: number, z: number, colliders: Collider[]) {
  return onWalkSurface(x,z) && !colliders.some(c => Math.abs(x-c.x)<c.w/2+.4 && Math.abs(z-c.z)<c.d/2+.4);
}
export function canDrive(kind: VehicleKind, x: number, z: number, y: number, obstacles: Collider[]) {
  const radius=VEHICLES.find(v=>v.id===kind)!.radius;
  if (![x,z,y].every(Number.isFinite)) return false;
  if(kind==='boat') {
    if(!boatSurface(x,z,radius))return false;
    return !obstacles.some(c=>Math.abs(x-c.x)<c.w/2+radius && Math.abs(z-c.z)<c.d/2+radius);
  }
  if(kind==='air') {
    if(x < -245 || x > 450 || z < -270 || z > 420 || y < groundHeight(z,x)+2 || y>75) return false;
    return !obstacles.some(c=>Math.abs(x-c.x)<c.w/2+radius && Math.abs(z-c.z)<c.d/2+radius && y<groundHeight(c.z,c.x)+(c.height??12)+2);
  }
  if(!onWalkSurface(x,z,radius+.4))return false;
  return !obstacles.some(c=>Math.abs(x-c.x)<c.w/2+radius && Math.abs(z-c.z)<c.d/2+radius);
}
export type DriveState={x:number;y:number;z:number;heading:number;speed:number;steering?:number};
/** Soft exit gate: leftover crawl must not soft-lock dismount. */
export function exitSpeedOk(speed:number, limit=2.2){return Math.abs(speed)<=limit;}
export function stepDrive(state:DriveState, vehicle:VehicleDefinition, input:{throttle:number;steer:number;vertical:number;brake:boolean}, dt:number, obstacles:Collider[]):DriveState {
  dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
  if(dt===0)return {...state,steering:state.steering??0};
  input={throttle:Math.max(-1,Math.min(1,input.throttle||0)),steer:Math.max(-1,Math.min(1,input.steer||0)),vertical:Math.max(-1,Math.min(1,input.vertical||0)),brake:input.brake};
  const target=input.brake?0:input.throttle*vehicle.maxSpeed*(input.throttle<0?.4:1);
  // Predictive accel/brake: brake bites harder; coast sheds speed quickly; throttle reaches intent fast.
  const coast=vehicle.id==='truck'?2.2:vehicle.id==='boat'?1.35:vehicle.id==='air'?1.55:2.4;
  const accelMul=input.brake?7.2:input.throttle===0?coast:1.85;
  const acceleration=vehicle.acceleration*accelMul*dt;
  let speed=state.speed+Math.max(-acceleration,Math.min(acceleration,target-state.speed));
  if(input.brake&&Math.abs(speed)<.08)speed=0;
  if(!input.brake&&input.throttle===0&&Math.abs(speed)<.04)speed=0;
  const steerRate=vehicle.id==='bike'?16:vehicle.id==='truck'?8:vehicle.id==='boat'?7.5:12;
  let steering=(state.steering??0)+(input.steer-(state.steering??0))*(1-Math.exp(-dt*steerRate));
  if(input.steer===0&&Math.abs(steering)<.02)steering=0;
  const grip=vehicle.id==='boat'?.55:vehicle.id==='truck'?.48:vehicle.id==='air'?.32:.22;
  const heading=state.heading-steering*vehicle.turnRate*dt*Math.min(1,Math.abs(speed)/1.4)/(1+Math.abs(speed)/vehicle.maxSpeed*grip)*(speed<0?-1:1);
  let x=state.x,z=state.z,y=state.y;
  if(vehicle.id==='air') {
    const nextY=Math.max(groundHeight(z,x)+2.2,Math.min(74,state.y+input.vertical*14*dt));
    if(canDrive('air',x,z,nextY,obstacles))y=nextY;
  }
  const nx=x-Math.sin(heading)*speed*dt,nz=z-Math.cos(heading)*speed*dt;
  const nextY=vehicle.id==='air'?Math.max(y,groundHeight(nz,nx)+2.2):vehicle.id==='boat'?.0:groundHeight(nz,nx);
  if(canDrive(vehicle.id,nx,nz,nextY,obstacles)){x=nx;z=nz;y=nextY;}
  else {
    // Wall hit: kill speed and clear steering so next input predicts the free move (no stuck steer).
    speed=0;steering=0;
  }
  return {x,y,z,heading,speed,steering};
}
export function findExit(kind:VehicleKind, x:number,z:number,obstacles:Collider[]):{x:number;z:number}|null {
  // Wider/denser shore search so leftover distance near piers does not soft-lock exit.
  const radii=kind==='boat'?[4,5,6,7,8,10,12,14,16]:[2.4,2.8,3.5,4.5,5.5,7];
  const steps=kind==='boat'?24:20;
  let best:{x:number;z:number;d:number}|null=null;
  for(const radius of radii)for(let i=0;i<steps;i++){
    const ang=i*(Math.PI*2)/steps;
    const nx=x+Math.cos(ang)*radius,nz=z+Math.sin(ang)*radius;
    if(canWalk(nx,nz,obstacles)&&(kind!=='boat'||groundHeight(nz,nx)<1)){
      const d=Math.hypot(nx-x,nz-z);
      if(!best||d<best.d)best={x:nx,z:nz,d};
    }
  }
  return best?{x:best.x,z:best.z}:null;
}
export type RoutePoint=readonly [number,number];
export function routeLengths(route:readonly RoutePoint[]):number[]{
  return route.map((p,i)=>Math.hypot(p[0]-route[(i+1)%route.length][0],p[1]-route[(i+1)%route.length][1]));
}
export function sampleRoute(route:readonly RoutePoint[],distance:number,lengths?:readonly number[]):{x:number;z:number;heading:number}{
  if(route.length<2)throw new Error('経路には2点以上必要です');
  const segs=lengths??routeLengths(route);
  const total=segs.reduce((a,b)=>a+b,0);if(total===0)return {x:route[0][0],z:route[0][1],heading:0};
  let remaining=((distance%total)+total)%total;
  for(let i=0;i<route.length;i++){if(remaining<=segs[i]&&segs[i]>0){const a=route[i],b=route[(i+1)%route.length],t=remaining/segs[i];return{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,heading:Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]))};}remaining-=segs[i];}
  return{x:route[0][0],z:route[0][1],heading:0};
}

export function smoothAngle(current:number,target:number,dt:number,rate=10){
  const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+delta*(1-Math.exp(-Math.max(0,dt)*rate));
}
/** Predictive foot velocity: input direction wins within ~1 beat; release stops short. */
export function stepFoot(velocity:{x:number;z:number},forward:number,right:number,yaw:number,speed:number,dt:number){
  const length=Math.max(1,Math.hypot(forward,right));forward/=length;right/=length;
  const hasInput=!!(forward||right);
  const blend=1-Math.exp(-Math.max(0,Math.min(dt,.05))*(hasInput?32:48));
  const x=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,z=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
  const next={x:velocity.x+(x-velocity.x)*blend,z:velocity.z+(z-velocity.z)*blend};
  if(!hasInput&&Math.hypot(next.x,next.z)<.05)return {x:0,z:0};
  return next;
}
export type FootResolve={x:number;z:number;vx:number;vz:number};
/**
 * Axis-separated walk resolution: blocked axes drop velocity (no wall stick/slide),
 * corners get micro-nudges; release clears residual so steps/corners don't trap.
 */
export function resolveFootStep(pos:{x:number;z:number}, velocity:{x:number;z:number}, dt:number, colliders:Collider[], hasInput=true):FootResolve {
  dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
  let x=pos.x,z=pos.z,vx=velocity.x,vz=velocity.z;
  if(dt===0)return {x,z,vx,vz};
  const dx=vx*dt,dz=vz*dt;
  const canX=canWalk(x+dx,z,colliders),canZ=canWalk(x,z+dz,colliders);
  if(canX)x+=dx;else vx=0;
  if(canZ)z+=dz;else vz=0;
  // Both axes blocked (corner/step): try micro-nudges along free diagonals, else clear motion.
  if(!canX&&!canZ){
    if(hasInput){
      const nudges:[[number,number],[number,number],[number,number],[number,number]]=[[.12,0],[-.12,0],[0,.12],[0,-.12]];
      let freed=false;
      for(const [nx,nz] of nudges){
        if(canWalk(pos.x+nx,pos.z+nz,colliders)){x=pos.x+nx;z=pos.z+nz;vx=0;vz=0;freed=true;break;}
      }
      if(!freed){vx=0;vz=0;x=pos.x;z=pos.z;}
    }else {vx=0;vz=0;x=pos.x;z=pos.z;}
  }
  if(!hasInput){vx=0;vz=0;}
  return {x,z,vx,vz};
}
