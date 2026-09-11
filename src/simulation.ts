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
export function stepDrive(state:DriveState, vehicle:VehicleDefinition, input:{throttle:number;steer:number;vertical:number;brake:boolean}, dt:number, obstacles:Collider[]):DriveState {
  dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
  if(dt===0)return {...state};
  input={throttle:Math.max(-1,Math.min(1,input.throttle||0)),steer:Math.max(-1,Math.min(1,input.steer||0)),vertical:Math.max(-1,Math.min(1,input.vertical||0)),brake:input.brake};
  const target=input.brake?0:input.throttle*vehicle.maxSpeed*(input.throttle<0?.35:1);
  const coast=vehicle.id==='truck'?1.3:vehicle.id==='boat'?.65:vehicle.id==='air'?.85:1.4;
  const acceleration=(input.brake?vehicle.acceleration*4.5:input.throttle===0?vehicle.acceleration*coast:vehicle.acceleration)*dt;
  let speed=state.speed+Math.max(-acceleration,Math.min(acceleration,target-state.speed));
  const steerRate=vehicle.id==='bike'?11:vehicle.id==='truck'?5:vehicle.id==='boat'?4.6:8;
  let steering=(state.steering??0)+(input.steer-(state.steering??0))*(1-Math.exp(-dt*steerRate));
  const grip=vehicle.id==='boat'?.72:vehicle.id==='truck'?.62:vehicle.id==='air'?.4:.28;
  const heading=state.heading-steering*vehicle.turnRate*dt*Math.min(1,Math.abs(speed)/2)/(1+Math.abs(speed)/vehicle.maxSpeed*grip)*(speed<0?-1:1);
  let x=state.x,z=state.z,y=state.y;
  if(vehicle.id==='air') {
    const nextY=Math.max(groundHeight(z,x)+2.2,Math.min(74,state.y+input.vertical*11*dt));
    if(canDrive('air',x,z,nextY,obstacles))y=nextY;
  }
  const nx=x-Math.sin(heading)*speed*dt,nz=z-Math.cos(heading)*speed*dt;
  const nextY=vehicle.id==='air'?Math.max(y,groundHeight(nz,nx)+2.2):vehicle.id==='boat'?.0:groundHeight(nz,nx);
  if(canDrive(vehicle.id,nx,nz,nextY,obstacles)){x=nx;z=nz;y=nextY;}else {speed=0;steering*=Math.exp(-dt*24);}
  return {x,y,z,heading,speed,steering};
}
export function findExit(kind:VehicleKind, x:number,z:number,obstacles:Collider[]):{x:number;z:number}|null {
  // 水上からの降車は、近くに歩ける岸・桟橋がある時だけ許可する。
  const radii=kind==='boat'?[5,7,8]:[2.8,4,5];
  for(const radius of radii)for(let i=0;i<16;i++){
    const nx=x+Math.cos(i*Math.PI/8)*radius,nz=z+Math.sin(i*Math.PI/8)*radius;
    if(canWalk(nx,nz,obstacles)&&(kind!=='boat'||groundHeight(nz,nx)<1))return {x:nx,z:nz};
  }
  return null;
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
export function stepFoot(velocity:{x:number;z:number},forward:number,right:number,yaw:number,speed:number,dt:number){
  const length=Math.max(1,Math.hypot(forward,right));forward/=length;right/=length;
  const blend=1-Math.exp(-Math.max(0,Math.min(dt,.05))*(forward||right?14:22));
  const x=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,z=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
  return {x:velocity.x+(x-velocity.x)*blend,z:velocity.z+(z-velocity.z)*blend};
}
