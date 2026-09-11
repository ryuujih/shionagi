import * as THREE from 'three';
import { groundHeight, smoothAngle, sampleRoute, VEHICLES, type VehicleKind, type RoutePoint, type Collider } from './simulation.ts';
import { SURFACE, ACCENT, NEON, harborCachedMat } from './look.ts';

type MovingActor={model:THREE.Group; route:RoutePoint[]; progress:number; speed:number; category:'person'|'robot'|'traffic'|'air'|'ship'; limbs:THREE.Object3D[]};
export class CityLife {
  readonly vehicles=new Map<VehicleKind,THREE.Group>();
  private actors:MovingActor[]=[];
  private holograms:THREE.Group[]=[];
  private fans:THREE.Object3D[]=[];
  private unitBox=new THREE.BoxGeometry(1,1,1);
  private unitSphere=new THREE.SphereGeometry(1,10,8);
  private materials=new Map<string,THREE.Material>();
  private halos:THREE.Sprite[]=[];
  private haloTexture:THREE.CanvasTexture;
  constructor(private scene:THREE.Scene) {
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!;const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(.2,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);this.haloTexture=new THREE.CanvasTexture(c);
    this.buildAtmosphere();this.buildActors();this.buildNewDistrictLife();
    for(const vehicle of VEHICLES){const model=this.vehicleModel(vehicle.id,vehicle.color);model.position.set(vehicle.home[0],vehicle.id==='boat'?0:groundHeight(vehicle.home[1]),vehicle.home[1]);if(vehicle.id==='boat')model.rotation.y=Math.PI;if(model.userData.rider)model.userData.rider.visible=false;this.scene.add(model);this.vehicles.set(vehicle.id,model);this.station(vehicle.home[0],vehicle.home[1],vehicle.color,vehicle.name);}
  }
  private material(color:string,glow=false){return harborCachedMat(this.materials,color,glow);}
  private box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string,glow=false){const mesh=new THREE.Mesh(this.unitBox,this.material(color,glow));mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  private sphere(parent:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,glow=false){const mesh=new THREE.Mesh(this.unitSphere,this.material(color,glow));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;}
  private halo(parent:THREE.Object3D,x:number,y:number,z:number,size:number,color:string){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.haloTexture,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.6}));sprite.position.set(x,y,z);sprite.scale.set(size,size,1);parent.add(sprite);this.halos.push(sprite);return sprite;}
  private label(parent:THREE.Object3D,text:string,sub:string,x:number,y:number,z:number,width:number,color:string){const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle=SURFACE.labelFill;ctx.fillRect(0,0,512,192);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(3,3,506,186);ctx.textAlign='center';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=13;ctx.font='600 54px sans-serif';ctx.fillText(text,256,88);ctx.font='22px monospace';ctx.fillText(sub,256,144);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.375),new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  vehicleModel(kind:VehicleKind,color:string){
    const g=new THREE.Group(),dark='#1c2a2c',glass='#2a4a4e';g.userData.wheels=[];g.userData.rotors=[];
    if(kind==='bike'){
      this.box(g,.75,.45,2.6,0,.85,0,color);this.box(g,.65,.2,1.2,0,1.16,.3,dark);this.box(g,1.45,.1,.12,0,1.65,-.85,dark);this.box(g,.16,.6,.16,0,1.35,-.8,dark);this.box(g,.5,.12,.12,0,1.05,-1.35,ACCENT.teal,true);
      for(const z of [-.9,.9]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.12,8,16),this.material(ACCENT.teal,true));ring.rotation.y=Math.PI/2;ring.position.set(0,.48,z);g.add(ring);}this.halo(g,0,.3,0,3,color);const rider=new THREE.Group();this.box(rider,.52,.65,.36,0,1.65,.2,'#4e6981');this.sphere(rider,0,2.2,.08,.27,.27,.26,'#25374b');this.box(rider,.4,.1,.06,0,2.23,-.16,ACCENT.teal,true);for(const x of [-.32,.32]){const arm=this.box(rider,.14,.65,.14,x,1.68,-.15,'#4e6981');arm.rotation.x=-.8;this.box(rider,.19,.56,.24,x,1.02,.5,'#27384c');}g.add(rider);g.userData.rider=rider;
    }else if(kind==='truck'){
      this.box(g,1.85,.55,3.7,0,.68,0,color);this.box(g,1.85,1.25,1.5,0,1.55,-.9,color);this.box(g,1.55,.66,.08,0,1.65,-1.7,glass);this.box(g,1.6,.12,1.8,0,1,.9,dark);for(const x of [-.88,.88])this.box(g,.12,.45,2,x,1.16,.8,color);
      for(const x of [-.95,.95])for(const z of [-1.1,1.2]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.25,12),this.material('#142333'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.4,z);g.add(wheel);g.userData.wheels.push(wheel);this.box(wheel,.09,.04,.66,0,.14,0,'#859eaa');this.sphere(g,x*1.13,.4,z,.025,.15,.15,color,true);}
      for(const x of [-.65,.65])this.box(g,.4,.18,.1,x,.85,-1.9,ACCENT.amber,true);this.box(g,1.4,.06,.04,0,2.18,-1.67,color,true);
      for(const x of [-.4,.4])this.box(g,.6,.6,.7,x,1.35,.85,'#558c88');this.label(g,'鮮魚','MINATO LOGISTICS',0,1.55,1.88,1.5,'#ffd39b');
    }else if(kind==='boat'){
      this.box(g,2.8,.55,6,0,.05,0,color);this.sphere(g,0,.05,-2.5,1.4,.4,1.7,color);this.box(g,2.2,1.45,2.7,0,1.05,.3,dark);this.box(g,1.9,.8,.06,0,1.2,-1.1,glass);this.box(g,2.7,.16,3,0,1.88,.3,color);for(const x of [-1.5,1.5])this.box(g,.13,.12,5,x,.25,0,color,true);this.box(g,.08,2.8,.08,0,2.4,1.15,dark);this.halo(g,0,3.8,1.15,2,color);
    }else{
      this.sphere(g,0,1.1,0,1.2,.65,2.05,color);this.sphere(g,0,1.65,-.2,.91,.67,1.2,glass);this.box(g,3.8,.18,1,0,.85,.7,dark);for(const x of [-1.75,1.75])for(const z of [-1,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.53,.12,8,16),this.material(color,true));ring.rotation.x=Math.PI/2;ring.position.set(x,.75,z);g.add(ring);const rotor=new THREE.Group();rotor.position.copy(ring.position);this.box(rotor,.85,.04,.1,0,0,0,dark);this.box(rotor,.1,.04,.85,0,0,0,dark);g.add(rotor);g.userData.rotors.push(rotor);this.halo(g,x,.45,z,2.5,color);}
      this.box(g,1.1,.13,.1,0,1,-1.9,ACCENT.teal,true);this.box(g,.9,.09,.09,0,1,2,color,true);
    }
    if(kind==='truck'){
      for(const x of [-1,1]){this.box(g,.25,.2,.12,x,1.75,-1.3,dark);this.box(g,.04,.65,1.05,x*.935,1.65,-.9,glass);this.box(g,.03,.06,.3,x*.96,1.1,-.4,dark);this.box(g,.22,.17,.06,x*.7,.8,1.88,'#ff6758',true);}
      this.box(g,1.6,.15,.16,0,.48,-1.94,dark);this.box(g,.4,.16,.03,0,.7,-1.99,'#f2eac5');g.scale.set(.82,.9,.9);
    }else if(kind==='bike'){
      this.box(g,.55,.42,.07,0,1.47,-1.01,glass).rotation.x=-.3;
      for(const x of [-.5,.5]){this.box(g,.24,.45,.65,x,.86,.75,dark);this.box(g,.2,.05,.48,x,.94,.76,color,true);this.box(g,.24,.07,.35,x,.65,.05,dark);}
      this.box(g,.4,.08,.08,0,1,1.33,ACCENT.amber,true);g.scale.setScalar(.88);
    }else if(kind==='boat'){
      for(const x of [-1.12,1.12]){for(const z of [-2,-1,1,2])this.box(g,.05,.65,.05,x,.62,z,dark);this.box(g,.05,.05,4,x,.95,0,'#b1c8ce');this.box(g,.06,.7,1.7,x,1.15,.3,glass);}
      for(const z of [-1.8,1.8]){const life=new THREE.Mesh(new THREE.TorusGeometry(.25,.08,8,16),this.material('#ef9b62'));life.position.set(1.44,.65,z);life.rotation.y=Math.PI/2;g.add(life);}
    }
    return g;
  }
  animateVehicle(model:THREE.Group,kind:VehicleKind,speed:number,steer:number,dt:number,time:number){
    const blend=1-Math.exp(-dt*8);
    const bank=kind==='bike'?steer*Math.min(Math.abs(speed)/16,1)*.2:kind==='air'?steer*Math.min(Math.abs(speed)/12,1)*.16:kind==='boat'?Math.sin(time*1.2)*.025+steer*speed*.002:steer*speed*.003;
    model.rotation.z+=(bank-model.rotation.z)*blend;
    model.rotation.x+=((kind==='boat'?Math.sin(time*.8)*.018:kind==='air'?-speed*.003:0)-model.rotation.x)*blend;
    if(kind==='bike')model.position.y+=Math.sin(time*2.5)*.025;
    if(kind==='boat')model.position.y+=Math.sin(time)*.08;
    for(const wheel of model.userData.wheels??[])wheel.rotateY(-speed*dt/.36);
    for(const rotor of model.userData.rotors??[])rotor.rotation.y+=dt*(25+Math.abs(speed));
  }
  private person(index:number,robot:boolean){const g=new THREE.Group();const color=robot?['#b8c9c0','#a89078','#e6bb73'][index%3]:['#5a6e68','#2d7a78','#8a5a4a','#bb8055','#486878'][index%5];const limbs:THREE.Object3D[]=[];
    if(robot){this.box(g,.65,.65,.5,0,.95,0,color);this.box(g,.52,.4,.45,0,1.52,0,'#263a50');this.box(g,.37,.09,.04,0,1.53,-.24,ACCENT.teal,true);this.box(g,.12,.4,.12,0,1.9,0,color);this.sphere(g,0,2.12,0,.08,.08,.08,ACCENT.amber,true);this.box(g,.37,.32,.35,0,.87,-.4,'#bc9870');}
    else{this.box(g,.48,.7,.33,0,1.1,0,color);this.box(g,.4,.24,.32,0,.71,0,'#243247');this.sphere(g,0,1.69,0,.22,.25,.21,'#b99985');this.sphere(g,0,1.82,.025,.24,.15,.23,'#29303e');if(index%3===0)this.box(g,.41,.09,.06,0,1.72,-.21,ACCENT.teal,true);this.box(g,.3,.4,.19,0,1.12,.27,'#253347');this.box(g,.3,.045,.05,0,1.25,-.18,index%2?ACCENT.amber:ACCENT.teal,true);}
    for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.68,0);this.box(leg,.17,.57,.18,0,-.28,0,'#283548');this.box(leg,.2,.13,.34,0,-.58,-.06,'#1a2431');g.add(leg);limbs.push(leg);const arm=new THREE.Group();arm.position.set(side*(robot?.43:.33),1.35,0);this.box(arm,.14,.62,.18,0,-.29,0,color);g.add(arm);limbs.push(arm);}
    return {model:g,limbs};
  }
  private buildActors(){
    for(let i=0;i<28;i++){
      const robot=i%4===0;const {model,limbs}=this.person(i,robot);const col=i%4;const left=-70+col*35+4,right=left+27;const top=-16-Math.floor(i/12)*39,bottom=top+35;
      const route:RoutePoint[]=[[left,bottom],[left,top],[right,top],[right,bottom]];if(i%2)route.reverse();this.scene.add(model);this.actors.push({model,limbs,route,progress:i*13,speed:robot?.95:1.1+(i%3)*.15,category:robot?'robot':'person'});
    }
    for(let i=0;i<7;i++){
      const model=this.vehicleModel(i%3===0?'bike':'truck',['#72c6bb','#c597c5','#bfa785'][i%3]);this.scene.add(model);
      const x=-70+(i%4)*35;const route:RoutePoint[]=[[x-1.4,21.5],[x-1.4,-56.5],[x+33.6,-56.5],[x+33.6,21.5]];
      this.actors.push({model,limbs:[],route,progress:i*36,speed:3.8+(i%3),category:'traffic'});
    }
    for(let i=0;i<5;i++){const model=this.vehicleModel('air',i%2?'#d28dce':'#80cbd1');this.scene.add(model);this.actors.push({model,limbs:[],route:[[-88,110],[-88,-80],[100,-80],[100,110]],progress:i*125,speed:8+i,category:'air'});}
    for(let i=0;i<2;i++){const model=this.vehicleModel('boat',i?'#ba9bd6':'#689bca');this.scene.add(model);this.actors.push({model,limbs:[],route:[[-110,120],[-110,195],[120,195],[120,120]],progress:i*170,speed:4,category:'ship'});}
  }
  private buildNewDistrictLife(){
    for(let i=0;i<30;i++){
      const {model,limbs}=this.person(i,i%5===0);this.scene.add(model);
      const route:RoutePoint[]=i<12?[[157,20],[157,-20],[204,-20],[204,20]]:i<20?[[29,-125],[29,-212],[42,-212],[42,-125]]:[[220,240],[220,278],[245,278],[245,240]];
      this.actors.push({model,limbs,route,progress:i*17,speed:.8+(i%3)*.2,category:i%5===0?'robot':'person'});
    }
    for(const [x,z] of [[166,-2],[194,8],[180,15]] as const){const {model,limbs}=this.person(3,true);this.scene.add(model);this.actors.push({model,limbs,route:[[x,z],[x,z]],progress:0,speed:0,category:'robot'});}
    for(let i=0;i<3;i++){const model=this.vehicleModel('truck',i?'#8c9dc1':'#9fc4a1');this.scene.add(model);this.actors.push({model,limbs:[],route:i===2?[[230,23],[230,276],[280,276],[280,245],[230,245]]:[[230,23],[230,-80],[280,-80],[280,23]],progress:i*110,speed:4+i,category:'traffic'});}
    const model=this.vehicleModel('boat','#b6d7cf');this.scene.add(model);this.actors.push({model,limbs:[],route:[[70,100],[70,245],[118,245],[118,100]],progress:0,speed:4.5,category:'ship'});
  }
  private station(x:number,z:number,color:string,name:string){const y=z>32?-.6:groundHeight(z)+.12;const ring=new THREE.Mesh(new THREE.RingGeometry(2.5,2.65,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.65}));ring.rotation.x=-Math.PI/2;ring.position.set(x,y,z);this.scene.add(ring);this.label(this.scene,name,'E : BOARD / V : GARAGE',x,y+5.7,z,2.5,color);}
  private buildAtmosphere(){
    for(const x of [-70,-35,0,35,70])for(let z=-100;z<25;z+=7){this.box(this.scene,.075,.04,2.7,x+3.2,groundHeight(z)+.09,z,z%14?ACCENT.teal:ACCENT.amber,true);}
    for(let i=0;i<14;i++){
      const x=-62+(i%5)*35,z=9-Math.floor(i/5)*39,y=groundHeight(z)+8;
      const g=new THREE.Group();g.position.set(x,y,z+6);const color=NEON.pair(i);
      this.label(g,['網修理','夜市 2089','渡し船','浜茶屋','汐凪無線'][i%5],['NET MEND','NIGHT MARKET','FERRY DOCK','HAMA TEA','PORT RADIO'][i%5],0,0,0,4.7,color);
      this.halo(g,0,0,.1,7,color);this.scene.add(g);this.holograms.push(g);
      this.box(this.scene,.12,5,.12,x-2.5,y-1,z+6,color,true);
      // 地面の淡い光は夜のネオンアクセント（teal / amber）に限る。
      const pool=new THREE.Mesh(new THREE.PlaneGeometry(7,5),new THREE.MeshBasicMaterial({map:this.haloTexture,color,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(x,groundHeight(z+10)+.15,z+10);this.scene.add(pool);
    }
    for(const [x,z,color] of [[-15,19,ACCENT.amber],[17,19,ACCENT.teal],[0,-53,ACCENT.amber]] as const){const light=new THREE.PointLight(color,36,22,1.6);light.position.set(x,5+groundHeight(z),z);this.scene.add(light);}
    // 海の町の目印として、巨大な魚の立体広告を港の上に浮かべる。
    const fish=new THREE.Group();fish.position.set(13,23,28);
    const holo=new THREE.MeshBasicMaterial({color:ACCENT.teal,wireframe:true,transparent:true,opacity:.42,depthWrite:false});const body=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),holo);body.scale.set(5,1.7,1.5);fish.add(body);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(2.4,3,3),holo);tail.rotation.z=-Math.PI/2;tail.position.x=-5.6;fish.add(tail);this.sphere(fish,3.1,.5,1,.18,.18,.18,ACCENT.amber,true);this.label(fish,'汐凪夜市','FRESH CATCH / WET DOCK',0,-3,0,9,ACCENT.teal);this.halo(fish,0,0,0,18,SURFACE.baseMid);this.scene.add(fish);fish.userData.fish=true;this.holograms.push(fish);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(6,.2,21,24,1,true),new THREE.MeshBasicMaterial({color:ACCENT.teal,transparent:true,opacity:.015,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.set(13,10,28);this.scene.add(beam);
    for(let i=0;i<7;i++){
      const x=-133+(i%2)*17,z=-65-i*15,h=28+(i%3)*12,y=groundHeight(z);this.box(this.scene,10,h,12,x,y+h/2,z,SURFACE.ground);
      this.box(this.scene,.16,h+5,.16,x+5,y+h/2,z+6,NEON.pair(i),true);for(let f=0;f<h/3;f++)for(let k=0;k<4;k++)this.box(this.scene,1.25,.65,.07,x-3.5+k*2.2,y+2+f*3,z+6.1,(f+k)%4?ACCENT.teal:ACCENT.amber,true);
    }
    this.label(this.scene,'汐凪モビリティ','LAND / SEA / SKY · V',0,7.3,19,9,ACCENT.teal);
  }
  obstacles(kind:VehicleKind):Collider[]{
    const result:Collider[]=[];
    for(const actor of this.actors){if(kind==='boat'?actor.category==='ship':actor.category==='traffic')result.push({x:actor.model.position.x,z:actor.model.position.z,w:kind==='boat'?4:2,d:kind==='boat'?7:3.8,height:3});}
    for(const [id,model] of this.vehicles){if(id===kind||(kind==='boat')!==(id==='boat'))continue;result.push({x:model.position.x,z:model.position.z,w:id==='bike'?1.1:2.8,d:3.8,height:model.position.y-groundHeight(model.position.z,model.position.x)+3});}
    return result;
  }
  update(dt:number,time:number,player:THREE.Vector3,occupied:VehicleKind|null){
    for(const actor of this.actors){
      const current=sampleRoute(actor.route,actor.progress);let speed=actor.speed;
      if(actor.category==='traffic'){
        const dx=player.x-current.x,dz=player.z-current.z;
        if(player.y-groundHeight(current.z,current.x)<4&&Math.hypot(dx,dz)<7&&dx*-Math.sin(current.heading)+dz*-Math.cos(current.heading)>0)speed=0;
        // 前の車に追いついたら待つ。交差点での積極的な追い越しはしない。
        for(const other of this.actors){if(other===actor||other.category!=='traffic')continue;const ox=other.model.position.x-current.x,oz=other.model.position.z-current.z;if(Math.hypot(ox,oz)<5&&ox*-Math.sin(current.heading)+oz*-Math.cos(current.heading)>1)speed=0;}
      }
      actor.progress+=speed*dt;const p=sampleRoute(actor.route,actor.progress);const y=actor.category==='air'?32+(actor.speed-8)*4:actor.category==='ship'?Math.sin(time+actor.speed)*.12:groundHeight(p.z,p.x);
      actor.model.position.set(p.x,y,p.z);actor.model.rotation.y=smoothAngle(actor.model.rotation.y,p.heading,dt,actor.category==='traffic'?5:8);actor.model.visible=actor.category==='air'||Math.hypot(p.x-player.x,p.z-player.z)<250;
      actor.limbs.forEach((limb,i)=>limb.rotation.x=speed>0?Math.sin(actor.progress*3.8)*([.45,-.3,-.45,.3][i]??0):0);
      if(actor.category==='traffic'||actor.category==='ship'||actor.category==='air')this.animateVehicle(actor.model,actor.category==='ship'?'boat':actor.category==='air'?'air':actor.model.userData.rider?'bike':'truck',speed,0,dt,time);
    }
    for(const [kind,model] of this.vehicles){if(model.userData.rider)model.userData.rider.visible=kind===occupied;if(kind===occupied)continue;if(kind==='bike')model.position.y=groundHeight(model.position.z,model.position.x)+Math.sin(time*2)*.045;else if(kind==='boat')model.position.y=Math.sin(time)*.1;}
    for(const holo of this.holograms){if(holo.userData.baseY===undefined)holo.userData.baseY=holo.position.y;holo.position.y=holo.userData.baseY+Math.sin(time*.7+holo.position.x)*.22;if(holo.userData.fish)holo.rotation.y=Math.sin(time*.16)*.35;}
    this.fans.forEach(f=>f.rotation.z+=dt*2);
  }
}
