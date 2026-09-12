import * as THREE from 'three';
import { MISSIONS, advanceCampaign, freshCampaign, parseCampaign, inMissionRange, rayBoxDistance, choiceConfirmLine, homecomingChip, dialogueBody, type CampaignProgress, type EndingChoice } from './campaign.ts';
import { groundHeight } from './geography.ts';
import { smoothAngle, type Collider } from './simulation.ts';
import { buildRenAvatar, buildStationVisual } from './characters-look.ts';
import { harborCachedMat } from './look.ts';
import { wantArmed, stepAimBlend, sampleArmingPose } from './avatar-arming.ts';
export type CombatFeedback='emp'|'damage'|'dodge'|'lock'|'reload';
export type StorySnapshot={enabled:boolean;stage:number;choice:EndingChoice|null;hp:number;ammo:number;reloading:boolean;scan:number;kills:number;near:boolean;dialogue:boolean;down:boolean;locked:boolean;feedback:CombatFeedback|null;message:string;saveAvailable:boolean;combatMode:boolean;aimBlend:number};
export const EMPTY_STORY:StorySnapshot={enabled:false,stage:0,choice:null,hp:100,ammo:12,reloading:false,scan:0,kills:0,near:false,dialogue:false,down:false,locked:false,feedback:null,message:'',saveAvailable:true,combatMode:false,aimBlend:0};
type Enemy={model:THREE.Group;hp:number;phase:number;charge:number;anchor:THREE.Vector3};
type Bolt={mesh:THREE.Mesh;velocity:THREE.Vector3;life:number};
export class StoryWorld {
  progress:CampaignProgress=freshCampaign();
  enabled=false;dialogue=false;hp=100;ammo=12;down=false;
  private reloadTime=0;private fireCooldown=0;private invulnerable=0;private lastDamage=0;private clock=0;private scan=0;private scanning=false;
  private enemies:Enemy[]=[];private spawned=false;private locked:Enemy|null=null;
  private marker=new THREE.Group();private stations:THREE.Group[]=[];private bolts:Bolt[]=[];
  private traces:{line:THREE.Line;life:number}[]=[];private traceIndex=0;
  private message='';private messageUntil=0;private saveAvailable=true;private feedback:CombatFeedback|null=null;private feedbackUntil=0;
  readonly avatar=new THREE.Group();private legs:THREE.Group[]=[];private arms:THREE.Group[]=[];private stride=0;private gait=0;private weapon=new THREE.Group();
  private boxGeometry=new THREE.BoxGeometry(1,1,1);
  aimBlend=0;private weaponRecoil=0;private lastOnFoot=true;private lastPlaying=false;
  private materials=new Map<string,THREE.Material>();
  private cachedSave:CampaignProgress|null=null;
  constructor(private scene:THREE.Scene,private colliders:Collider[]){
    try{this.cachedSave=parseCampaign(localStorage.getItem('shionagi.campaign.v1'));}catch{this.saveAvailable=false;}
    this.makeAvatar();this.makeStations();this.makeEnemies();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.09,8,28),this.mat('#f5ca7f',true));ring.rotation.x=Math.PI/2;this.marker.add(ring);const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.75),this.mat('#f5ca7f',true));diamond.position.y=3.5;this.marker.add(diamond);this.scene.add(this.marker);this.marker.visible=false;
    for(let i=0;i<18;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),this.mat('#ff756f',true));mesh.visible=false;this.scene.add(mesh);this.bolts.push({mesh,velocity:new THREE.Vector3(),life:0});}
    for(let i=0;i<12;i++){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#84fff2',transparent:true,opacity:.9}));line.visible=false;this.scene.add(line);this.traces.push({line,life:0});}
  }
  private mat(color:string,glow=false){return harborCachedMat(this.materials as Map<string,THREE.Material>,color,glow,glow?{roughness:.48,metalness:.05,glowStrength:1.4}:{roughness:.82,metalness:.04}) as THREE.MeshStandardMaterial;}
  private box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string,glow=false){const mesh=new THREE.Mesh(this.boxGeometry,this.mat(color,glow));mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  private makeAvatar(){const g=this.avatar;
    buildRenAvatar(g,(p,w,h,d,x,y,z,c,glow)=>this.box(p,w,h,d,x,y,z,c,glow),(c,glow)=>this.mat(c,glow),this.legs,this.arms,this.weapon);
    this.scene.add(g);g.visible=false;
  }
  private makeStations(){for(let i=0;i<MISSIONS.length;i++){const m=MISSIONS[i],g=new THREE.Group();g.position.set(m.x+2,groundHeight(m.z,m.x),m.z);buildStationVisual(i,g,(p,w,h,d,x,y,z,c,glow)=>this.box(p,w,h,d,x,y,z,c,glow));this.scene.add(g);g.visible=false;this.stations.push(g);}}
  private makeEnemies(){for(let i=0;i<3;i++){const g=new THREE.Group();this.box(g,1.5,.45,.8,0,0,0,'#733f5c');this.box(g,.6,.16,.06,0,0,-.43,'#ff796f',true);for(const x of [-1,1]){const rotor=new THREE.Mesh(new THREE.TorusGeometry(.4,.08,8,16),this.mat('#f2b079',true));rotor.rotation.x=Math.PI/2;rotor.position.x=x;g.add(rotor);}this.scene.add(g);g.visible=false;this.enemies.push({model:g,hp:2,phase:i*2.1,charge:0,anchor:new THREE.Vector3(248+i*10,3.2+i*.6,263+(i%2)*7)});}}
  start(){if(!this.enabled){this.progress=this.cachedSave??freshCampaign();this.enabled=true;this.message='レン / 港の配達員 — 帰港灯のない夜';this.messageUntil=this.clock+6;this.resetFight();}return this.progress.stage;}
  explore(){this.enabled=false;this.dialogue=false;this.messageUntil=0;this.feedback=null;this.feedbackUntil=0;this.resetFight();this.traces.forEach(t=>{t.life=0;t.line.visible=false;});}
  private save(){this.cachedSave={...this.progress};try{localStorage.setItem('shionagi.campaign.v1',JSON.stringify(this.progress));}catch{this.saveAvailable=false;}}
  private finish(choice?:EndingChoice){const m=MISSIONS[this.progress.stage];if(!m)return;const next=advanceCampaign(this.progress,m.event,choice);if(next===this.progress)return;this.progress=next;this.save();if(m.event==='network'&&choice)this.message=choiceConfirmLine(choice);else if(m.event==='home')this.message=homecomingChip(this.progress.choice)??dialogueBody(5,this.progress.choice);else this.message=m.text;this.messageUntil=this.clock+12;this.scanning=false;this.scan=0;this.locked=null;this.ammo=12;this.hp=100;if(this.progress.stage!==3)this.bolts.forEach(b=>{b.life=0;b.mesh.visible=false;});}
  action(pos:THREE.Vector3,onFoot:boolean){if(!this.enabled||this.down||!onFoot||this.dialogue||this.progress.stage>=6||!this.near(pos))return false;const m=MISSIONS[this.progress.stage];if(m.kind==='combat')return false;if(m.kind==='scan'){this.scanning=true;return false;}this.dialogue=true;return true;}
  confirm(choice?:EndingChoice){if(!this.dialogue)return;const before=this.progress.stage;this.finish(choice);if(this.progress.stage!==before)this.dialogue=false;}
  private near(pos:THREE.Vector3){return inMissionRange(this.progress.stage,pos.x,pos.z,pos.y,groundHeight(pos.z,pos.x));}
  private cue(kind:CombatFeedback,ms=450){this.feedback=kind;this.feedbackUntil=Date.now()+ms;}
  snapshot(pos:THREE.Vector3):StorySnapshot{const near=this.near(pos);const combatMode=this.lastPlaying&&wantArmed({enabled:this.enabled,dialogue:this.dialogue,down:this.down,onFoot:this.lastOnFoot,stage:this.progress.stage,near});return{enabled:this.enabled,stage:this.progress.stage,choice:this.progress.choice,hp:Math.ceil(this.hp),ammo:this.ammo,reloading:this.reloadTime>0,scan:this.scan/1.8,kills:this.enemies.filter(e=>e.hp===0).length,near,dialogue:this.dialogue,down:this.down,locked:!!this.locked,feedback:Date.now()<this.feedbackUntil?this.feedback:null,message:this.clock<this.messageUntil?this.message:'',saveAvailable:this.saveAvailable,combatMode,aimBlend:this.aimBlend;}
  clearLock(){this.locked=null;}
  target(){return this.locked?.hp?this.locked.model.position:null;}
  toggleLock(pos:THREE.Vector3){if(this.locked){this.locked=null;return;}this.locked=this.enemies.filter(e=>e.hp>0&&e.model.visible&&e.model.position.distanceTo(pos)<65&&this.clearLine(pos,e.model.position)).sort((a,b)=>a.model.position.distanceToSquared(pos)-b.model.position.distanceToSquared(pos))[0]??null;if(this.locked)this.cue('lock');}
  reload(){if(this.ammo<12&&this.reloadTime<=0&&!this.down){this.reloadTime=1.3;this.cue('reload');}}
  dodge(){if(this.invulnerable<=0&&!this.down){this.invulnerable=.28;this.cue('dodge');}}
  private wallDistance(from:THREE.Vector3,dir:THREE.Vector3){let min=Infinity;for(const c of this.colliders)min=Math.min(min,rayBoxDistance(from,dir,{...c,bottom:groundHeight(c.z,c.x),top:groundHeight(c.z,c.x)+(c.height??12)}));return min;}
  private clearLine(from:THREE.Vector3,to:THREE.Vector3){const delta=to.clone().sub(from);return this.wallDistance(from,delta.clone().normalize())>delta.length()-.2;}
  fire(camera:THREE.PerspectiveCamera,pos:THREE.Vector3){
    if(!this.enabled||this.down||this.dialogue||this.reloadTime>0||this.fireCooldown>0)return;if(this.ammo===0){this.reload();return;}this.ammo--;this.fireCooldown=.25;
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);let range=Math.min(80,this.wallDistance(ray.ray.origin,ray.ray.direction)),hit:Enemy|null=null;
    for(const enemy of this.enemies){if(!enemy.model.visible||enemy.hp<=0)continue;const center=enemy.model.position;const along=center.clone().sub(ray.ray.origin).dot(ray.ray.direction);if(along>0&&along<range&&ray.ray.distanceToPoint(center)<1.3){range=along;hit=enemy;}}
    const end=ray.ray.at(range,new THREE.Vector3());const muzzle=pos.clone().add(new THREE.Vector3(0,-.5,0));
    // カメラから見えても、銃口の前が壁なら貫通させない。
    const path=end.clone().sub(muzzle),blocked=this.wallDistance(muzzle,path.clone().normalize());if(blocked<path.length()-.4){end.copy(muzzle).addScaledVector(path.normalize(),blocked);hit=null;}
    const trace=this.traces[this.traceIndex++%this.traces.length];const a=trace.line.geometry.attributes.position;a.setXYZ(0,muzzle.x,muzzle.y,muzzle.z);a.setXYZ(1,end.x,end.y,end.z);a.needsUpdate=true;trace.line.geometry.computeBoundingSphere();trace.line.visible=true;trace.life=.11;
    if(this.aimBlend>.8)this.weaponRecoil=.13;
    if(hit){hit.hp--;this.cue('emp');if(hit.hp<=0){hit.model.visible=false;if(this.locked===hit)this.locked=null;const stopped=this.enemies.filter(e=>e.hp===0).length;this.message=`ドローン停止 ${stopped}/3`;this.messageUntil=this.clock+1.5;}else{this.message='EMP命中';this.messageUntil=this.clock+1.3;}}
    if(this.progress.stage===3&&this.enemies.every(e=>e.hp===0))this.finish();
  }
  private resetFight(){this.hp=100;this.ammo=12;this.down=false;this.reloadTime=0;this.fireCooldown=0;this.scan=0;this.scanning=false;this.locked=null;this.feedback=null;this.feedbackUntil=0;this.spawned=false;this.enemies.forEach(e=>{e.hp=2;e.charge=0;e.model.visible=false;});this.bolts.forEach(b=>{b.life=0;b.mesh.visible=false;});}
  retry(){this.resetFight();this.dialogue=false;return MISSIONS[Math.min(this.progress.stage,5)];}
  update(dt:number,pos:THREE.Vector3,heading:number,speed:number,active:boolean,onFoot:boolean,playing:boolean){
    const moving=active&&!this.down&&!this.dialogue?speed:0;
    if(active){this.gait+=(Math.min(1,moving/2)-this.gait)*(1-Math.exp(-dt*12));this.stride+=moving*dt*2.8;}
    this.avatar.visible=playing&&onFoot;this.avatar.position.set(pos.x,groundHeight(pos.z,pos.x)+Math.abs(Math.sin(this.stride))*.035*this.gait,pos.z);
    this.avatar.rotation.y=smoothAngle(this.avatar.rotation.y,heading,dt,12);
    this.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.stride)*(i?-.58:.58)*this.gait);
    // Keep transitions running through dialogue, boarding, and disabled/explore states.
    // One combat-mode gate drives EMP + published snapshot (HUD/camera consumers).
    this.lastOnFoot=onFoot;this.lastPlaying=playing;
    const armed=playing&&wantArmed({enabled:this.enabled,dialogue:this.dialogue,down:this.down,onFoot,stage:this.progress.stage,near:this.near(pos)});
    this.aimBlend=stepAimBlend(this.aimBlend,armed,dt);
    const pose=sampleArmingPose(this.aimBlend);
    this.arms.forEach((arm,i)=>arm.rotation.x=pose.armPitch+Math.sin(this.stride)*(i?.36:-.36)*this.gait*(1-this.aimBlend));
    this.weaponRecoil*=Math.exp(-dt*20);
    this.weapon.position.set(pose.x,pose.y,pose.z+this.weaponRecoil*this.aimBlend);
    this.weapon.rotation.set(pose.pitch,0,0);
    this.stations.forEach((g,i)=>g.visible=this.enabled&&i===this.progress.stage);this.marker.visible=this.enabled&&this.progress.stage<6;
    if(this.marker.visible){const m=MISSIONS[this.progress.stage];this.marker.position.set(m.x,groundHeight(m.z,m.x)+.12,m.z);this.marker.rotation.y+=dt*.8;}
    if(!active||!playing||this.down||this.dialogue)return;
    this.clock+=dt;this.fireCooldown=Math.max(0,this.fireCooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0)this.ammo=12;}
    for(const trace of this.traces){trace.life-=dt;trace.line.visible=trace.life>0;}
    if(!this.enabled)return;
    if(this.scanning){if(!onFoot||!this.near(pos)){this.scanning=false;this.scan=0;}else{this.scan+=dt;if(this.scan>=1.8)this.finish();}}
    if(this.clock-this.lastDamage>6)this.hp=Math.min(100,this.hp+dt*5);
    if(this.progress.stage!==3){this.enemies.forEach(e=>e.model.visible=false);return;}
    if(this.near(pos)&&onFoot)this.spawned=true;
    if(!this.spawned)return;
    for(const e of this.enemies){if(e.hp<=0)continue;e.model.visible=true;e.model.position.copy(e.anchor).add(new THREE.Vector3(Math.sin(this.clock*.7+e.phase)*2,Math.sin(this.clock+e.phase)*.4,Math.cos(this.clock*.6+e.phase)*2));e.model.lookAt(pos);const distance=e.model.position.distanceTo(pos);
      if(distance<38&&onFoot&&this.clearLine(e.model.position,pos)){e.charge+=dt;e.model.scale.setScalar(e.charge>2.3?1.08:1);if(e.charge>3.5+e.phase*.2){e.charge=0;const bolt=this.bolts.find(b=>b.life<=0);if(bolt){bolt.mesh.position.copy(e.model.position);bolt.velocity.copy(pos).sub(e.model.position).normalize().multiplyScalar(12);bolt.life=4;bolt.mesh.visible=true;}}}else e.charge=0;
    }
    for(const bolt of this.bolts){if(bolt.life<=0)continue;const old=bolt.mesh.position.clone();bolt.mesh.position.addScaledVector(bolt.velocity,dt);bolt.life-=dt;const wall=this.wallDistance(old,bolt.velocity.clone().normalize());if(wall<12*dt)bolt.life=0;const line=new THREE.Line3(old,bolt.mesh.position),closest=line.closestPointToPoint(pos,true,new THREE.Vector3());if(onFoot&&closest.distanceTo(pos)<.65&&this.invulnerable<=0){this.hp=Math.max(0,this.hp-12);this.lastDamage=this.clock;this.invulnerable=.35;this.cue('damage');bolt.life=0;if(this.hp===0){this.down=true;this.locked=null;}}bolt.mesh.visible=bolt.life>0;}
  }
}
