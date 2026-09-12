import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundHeight, PLACES, ISLAND } from './geography.ts';
import type { Collider } from './simulation.ts';
import { SURFACE, ACCENT, harborCachedMat } from './look.ts';
import { buildMarketStallSilhouette, buildWarehouseSilhouette, addHarborPointLight } from './buildings-look.ts';

export class WorldExpansion {
  private batches=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[]}>();
  private unit=new THREE.BoxGeometry(1,1,1);
  private lighthouse=new THREE.Group();
  private steam:THREE.Points;
  private steamBases:number[]=[];
  private tram=new THREE.Group();
  constructor(private scene:THREE.Scene,private colliders:Collider[]){
    this.land();this.eastTown();this.mountain();this.island();this.oldTownDetails();
    for(const place of PLACES){this.sign(place.name,'F : READ / '+place.tag,place.x+3,groundHeight(place.z,place.x)+2.7,place.z,3,place.color);this.box(.12,2,.12,place.x+3,groundHeight(place.z,place.x)+1,place.z,'#7c9090');}
    for(const batch of this.batches.values()){const geometry=mergeGeometries(batch.geometries);if(geometry)this.scene.add(new THREE.Mesh(geometry,batch.material));batch.geometries.forEach(g=>g.dispose());}this.batches.clear();this.unit.dispose();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(this.steamBases,3));this.steam=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#cde5df',size:.3,transparent:true,opacity:.25,depthWrite:false}));this.scene.add(this.steam);
  }
  private matCache=new Map<string,THREE.Material>();
  private add(geometry:THREE.BufferGeometry,color:string,glow=false){const key=color+glow;let batch=this.batches.get(key);if(!batch){batch={material:harborCachedMat(this.matCache,color,glow,glow?{roughness:.48,metalness:.05,glowStrength:1.25}:{roughness:.82,metalness:.04}),geometries:[]};this.batches.set(key,batch);}batch.geometries.push(geometry);}
  private box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,glow=false,rotation=0){const g=this.unit.clone();g.scale(w,h,d);g.rotateY(rotation);g.translate(x,y,z);this.add(g,color,glow);}
  private sphere(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string){const g=new THREE.SphereGeometry(1,8,6);g.scale(rx,ry,rz);g.translate(x,y,z);this.add(g,color);}
  private sign(text:string,sub:string,x:number,y:number,z:number,width:number,color='#96efcf',rotation=0){const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle=SURFACE.labelFillWorld;ctx.fillRect(0,0,512,192);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(4,4,504,184);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='600 53px sans-serif';ctx.fillText(text,256,91);ctx.font='19px monospace';ctx.fillText(sub,256,145);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.375),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;this.scene.add(mesh);}
  private surface(x0:number,x1:number,z0:number,z1:number,color:string,offset=0){const g=new THREE.PlaneGeometry(x1-x0,z1-z0,2,Math.max(2,Math.ceil((z1-z0)/2)));g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)+(x0+x1)/2,z=p.getZ(i)+(z0+z1)/2;p.setXYZ(i,x,groundHeight(z,x)+offset,z);}g.computeVertexNormals();this.add(g,color);}
  private road(x0:number,x1:number,z0:number,z1:number){this.surface(x0,x1,z0,z1,'#263d46',.08);if(z1-z0>x1-x0){const x=(x0+x1)/2;for(let z=z0+2;z<z1;z+=6)this.box(.1,.025,2.5,x,groundHeight(z,x)+.12,z,'#8eab9e');}else{const z=(z0+z1)/2;for(let x=x0+2;x<x1;x+=7)this.box(3,.025,.1,x,groundHeight(z,x)+.13,z,'#8eab9e');}}
  private land(){
    const coast=[[-96,32],[340,32],[340,-112],[96,-112],[96,-250],[-96,-250],[-96,32]];
    for(let edge=0;edge<coast.length-1;edge++){const a=coast[edge],b=coast[edge+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);const cliff=new THREE.PlaneGeometry(length,1,Math.ceil(length/5),1);const p=cliff.attributes.position;for(let i=0;i<p.count;i++){const t=p.getX(i)/length+.5,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;p.setXYZ(i,x,p.getY(i)>0?groundHeight(z,x): -4,z);}cliff.computeVertexNormals();this.add(cliff,'#596b65');}
    this.surface(96,340,-112,32,'#3e5350');this.surface(-96,96,-250,-116,'#4c5d4f');
    const island=new THREE.CylinderGeometry(1,1.08,3,48);island.scale(ISLAND.rx,1,ISLAND.rz);island.translate(ISLAND.x,-1.5,ISLAND.z);this.add(island,'#6b7b6d');
    this.surface(125,163,240,250,'#758981');
    this.road(92,335,19,27);this.road(226,234,-104,182);this.road(276,284,-104,24);this.road(103,332,-34,-26);this.road(104,332,-84,-76);this.road(31,39,-244,-108);this.road(-82,84,-178,-170);this.road(-80,84,-232,-224);
    this.surface(224,236,30,182,'#566c76');this.road(225,235,30,182);
    for(let z=31;z<181;z+=4)for(const x of [224.3,235.7]){const y=groundHeight(z,x);this.box(.13,1.2,.13,x,y+.6,z,'#9bbab7');this.box(.1,.1,4,x,y+1.2,z,'#6ce5d4',true);}
    for(const z of [65,145])for(const x of [223,237]){this.box(.65,24,.65,x,10,z,'#607d88');this.box(15,.35,.35,230,22,z,'#a2c9c3');}
    for(const z of [55,85,115,145,170]){const y=groundHeight(z,230);this.box(2,y+1.1,2,230,(y-1.1)/2,z,'#4b6570');}
    this.sign('青汐大橋','AOSHIO CROSSING / 150 M',230,6,30,9,'#95eaff');
  }
  private house(x:number,z:number,w:number,d:number,h:number,color:string,label?:string){const y=groundHeight(z,x);this.box(w,h,d,x,y+h/2,z,color);this.colliders.push({x,z,w,d,height:h+1});this.box(w+.6,.4,d+.6,x,y+h,z,'#304e5b');
    if(h<=7){const roof=new THREE.ConeGeometry(1,1,4);roof.rotateY(Math.PI/4);roof.scale(w*.8,2.8,d*.8);roof.translate(x,y+h+1.3,z);this.add(roof,'#365968');}
    const floors=Math.floor(h/3);for(let f=0;f<floors;f++)for(let k=0;k<3;k++){const wx=x-w*.3+k*w*.3,wy=y+1.8+f*3;this.box(w*.21,1.4,.07,wx,wy,z+d/2+.04,SURFACE.baseDeep);this.box(w*.18,.05,.05,wx,wy+.55,z+d/2+.1,(f+k)%2?ACCENT.teal:ACCENT.amber,true);this.box(.06,1.4,.09,wx,wy,z+d/2+.1,'#314f58');if(f>0)this.box(w*.25,.12,.7,wx,wy-.8,z+d/2+.25,SURFACE.wetGray);}
    this.box(1.8,2.4,.12,x,y+1.2,z+d/2+.12,'#253d42');this.box(w*.8,.15,1.6,x,y+3,z+d/2+.7,'#688b7d');this.box(1.3,.8,.8,x+w*.3,y+.5,z+d/2+.5,'#829c98');
    if(label)this.sign(label,'SHIONAGI / 2089',x,y+4.1,z+d/2+.18,Math.min(w-1,7));
    for(const side of [-1,1]){this.box(.08,1.3,2,x+side*(w/2+.05),y+2,z,SURFACE.baseDeep);this.box(.1,h,.1,x+side*(w/2-.15),y+h/2,z+d/2+.12,ACCENT.teal,true);}
    this.box(w*.7,.15,d*.4,x,y+h+.3,z,'#315873');
  }
  private bench(x:number,z:number,rotation=0){const y=groundHeight(z,x);this.colliders.push({x,z,w:2.6,d:.8,height:1.2});this.box(2.6,.16,.8,x,y+.6,z,'#ac8a66',false,rotation);this.box(2.6,.7,.12,x,y+1,z+.35,'#977653',false,rotation);for(const dx of [-.95,.95])this.box(.12,.6,.6,x+dx,y+.3,z,'#45616b');}
  private lantern(x:number,y:number,z:number,color='#edbb87'){this.sphere(x,y,z,.28,.4,.28,color);this.box(.12,.12,.12,x,y-.4,z,'#fff4c9',true);}
  private tree(x:number,z:number,bamboo=false){const y=groundHeight(z,x);if(bamboo){for(let k=0;k<3;k++){this.box(.12,7+k,.12,x+k*.5,y+(7+k)/2,z,'#5a8e6a');this.sphere(x+k*.5,y+6+k,z,1.5,.7,1,'#396550');}}else{this.box(.45,4,.45,x,y+2,z,'#596352');this.sphere(x,y+4,z,2.6,2.6,2.6,'#36564c');this.sphere(x+1,y+6,z,2,1.8,2,'#456854');}}
  private stall(x:number,z:number,name:string,_color:string){const y=groundHeight(z,x);
    buildMarketStallSilhouette((w,h,d,px,py,pz,c,glow)=>this.box(w,h,d,px,py,pz,c,!!glow),x,y,z,ACCENT.amber);
    this.sign(name,'FRESH / LOCAL',x,y+2.35,z+1.3,3.8,ACCENT.amber);
    for(let k=0;k<5;k++){this.box(.65,.15,.85,x-1.7+k*.83,y+1,z,SURFACE.wetGray);this.sphere(x-1.7+k*.83,y+1.13,z,.26,.08,.1,'#b6cecf');}
    this.lantern(x+2,y+2.4,z+1.2,ACCENT.amber);for(let k=0;k<9;k++)this.steamBases.push(x+.15*Math.sin(k),y+1.1+k*.15,z-.5);this.colliders.push({x,z,w:5,d:2.3,height:1);}
  }
  private eastTown(){
    this.house(128,0,18,21,11,'#617776','浜の修理工房');this.house(128,-56,20,20,14,'#776c7b','東浜共同住宅');
    this.house(214,-53,17,24,18,'#5b7482','港湾データ局');this.house(257,0,18,21,15,'#796b70','潮路ホテル');this.house(317,0,21,22,11,'#617f82','海洋研究室');
    for(const x of [254,314]){this.house(x,-59,22,27,29,'#516575');this.box(.2,32,.2,x+11,groundHeight(-59,x)+16,-45,'#b579e3',true);}
    this.box(39,.4,36,180,6.6,0,SURFACE.ground);for(const x of [161,199])for(const z of [-17,17]){this.box(.35,6.4,.35,x,3.2,z,SURFACE.wetGray);this.colliders.push({x,z,w:.4,d:.4,height:7});}
    for(const z of [-10,0,10]){this.stall(166,z,'海の幸',SURFACE.ground);this.stall(194,z,z===0?'潮ラーメン':'焼き魚',SURFACE.rustAmber);}
    for(const z of [-12,0,12])this.box(34,.05,.06,180,6.3,z,ACCENT.amber,true);
    addHarborPointLight(this.scene,180,4.7,0,ACCENT.amber,70,38);
    addHarborPointLight(this.scene,168,3.8,-8,ACCENT.teal,36,22);
    addHarborPointLight(this.scene,192,3.8,8,ACCENT.amber,36,22);
    this.sign('東浜 夜市','NIGHT MARKET / OPEN UNTIL DAWN',180,5,18.2,14,ACCENT.amber);
    for(let x=164;x<=196;x+=4)this.lantern(x,5.8,15,x%8?ACCENT.amber:ACCENT.teal);
    for(const z of [-10,8])for(const x of [175,185]){this.box(2,.1,1.5,x,.8,z,'#9d896d');for(const dx of [-.7,.7])this.box(.13,.8,.8,x+dx,.4,z,'#526c71');this.bench(x,z+1.7);}
    this.sign('潮路駅','SETOUCHI LOOP / NEXT 21:08',289,7,-22,12,'#f6a7dd');this.box(40,.6,8,287,12,-34,'#526e7a');for(const x of [269,305])this.box(.8,12,.8,x,6,-34,'#7c9294');
    this.box(240,.2,1,210,20,-38,'#758791');this.box(240,.08,.08,210,20.3,-38,'#98deed',true);
    const material=new THREE.MeshStandardMaterial({color:'#b9c3cc'});const train=new THREE.Mesh(new THREE.BoxGeometry(14,3.2,3),material);this.tram.add(train);for(let x=-5;x<=5;x+=2){const window=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.5,.06),harborCachedMat(this.matCache,SURFACE.baseDeep,false,{roughness:.3,metalness:.2}));window.position.set(x,.2,1.54);this.tram.add(window);}this.tram.position.set(220,18,-38);this.scene.add(this.tram);
    for(const x of [106,147,210,271,326]){this.bench(x,28);this.tree(x,-99);}
    for(let i=0;i<6;i++)this.box(6,2.6,3,301+(i%3)*8,1.3+Math.floor(i/3)*2.65,18,['#598782','#a26d68','#5c728e'][i%3]);
    this.box(.9,15,.9,331,7.5,21,'#b9a579');this.box(15,.6,.6,325,15,21,'#b9a579');this.box(.08,9,.08,318,10.5,21,'#778c90');
    for(let x=105;x<340;x+=6){this.box(.15,1,.15,x,.5,31,'#779799');this.box(6,.1,.1,x,.95,31,'#779799');}
  }
  private mountain(){
    for(const z of [-148,-196])for(const x of [-62,16,57])this.house(x,z,13,14,6,'#7d8070',x===16?'山灯の宿':undefined);
    for(let z=-130;z>-218;z-=8)for(const x of [27,44]){const y=groundHeight(z,x);this.box(.35,.6,3,x,y+.3,z,'#758474');this.sphere(x,y+.85,z,.7,.55,1,'#4d7560');if((z+130)%24===0){this.box(.12,3.5,.12,x,y+1.75,z,'#718a80');this.lantern(x,y+3.5,z,'#e3b17e');}}
    for(let i=0;i<28;i++){const x=i%2?85:-85,z=-122-Math.floor(i/2)*9;this.tree(x,z,true);}
    for(const z of [-142,-190,-214]){this.bench(43,z);this.box(1.6,2.5,.9,46,groundHeight(z,46)+1.25,z,'#72949b');this.box(1.3,1.4,.04,46,groundHeight(z,46)+1.7,z+.48,'#87ddda',true);}
    const y=groundHeight(-233);this.surface(-16,16,-239,-226,'#798a7b',.03);for(const x of [-15,15])for(const z of [-238,-228])this.box(.16,1.2,.16,x,groundHeight(z)+.6,z,'#8eaa99');this.bench(-6,-233);this.bench(6,-233);
    for(const x of [-11,11]){this.box(.16,1.4,.16,x,y+.7,-228,'#66818a');this.box(.5,.3,.8,x,y+1.5,-228,'#a3c0bf');}
    this.sign('星見展望台','THE COAST NEVER SLEEPS',0,y+3,-238,7,'#b6cfff');
    for(const x of [-45,59]){this.box(5,.13,7,x,groundHeight(-220,x)+.8,-220,'#2b5971');this.box(.15,6,.15,x,groundHeight(-220,x)+3,-220,'#b7c6b8');}
  }
  private island(){
    this.road(226,234,180,282);this.road(151,289,241,249);this.road(191,277,273,279);
    for(const [x,z,label] of [[186,228,'青汐茶屋'],[207,222,'島の郵便局'],[259,223,'海辺の宿'],[191,266,'網の工房']] as const)this.house(x,z,12,12,6,'#87907b',label);
    for(const x of [155,160])for(const z of [238,252])this.box(.2,2,.2,x,1,z,'#94afa2');this.sign('青汐島','AOSHIO / BOAT LANDING',151,4,239,6,'#9edaf5',Math.PI/2);
    for(let i=0;i<9;i++){const x=168+(i%3)*4,z=253+Math.floor(i/3)*3;this.box(2.5,.55,1.5,x,.3,z,'#728d85');for(let k=0;k<4;k++)this.box(.07,1.8,.07,x-1+k*.65,1.4,z,'#9aafa0');}
    const towerX=278,towerZ=280;for(let i=0;i<5;i++){const cylinder=new THREE.CylinderGeometry(2.6-i*.15,2.8-i*.15,3,16);cylinder.translate(towerX,1.5+i*3,towerZ);this.add(cylinder,i%2?'#bc7974':'#bec9b8');}this.colliders.push({x:towerX,z:towerZ,w:6,d:6,height:19});
    this.box(6,.3,6,towerX,15.3,towerZ,'#67828b');this.box(4,2.4,4,towerX,16.5,towerZ,'#c4e7c7',true);this.box(6,.4,6,towerX,18,towerZ,'#5b7884');
    const beam=new THREE.Mesh(new THREE.ConeGeometry(9,140,24,1,true),new THREE.MeshBasicMaterial({color:'#c6eecc',transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.rotation.z=Math.PI/2;beam.position.x=70;this.lighthouse.add(beam);this.lighthouse.position.set(towerX,17,towerZ);this.scene.add(this.lighthouse);
    this.bench(268,280);this.bench(256,288);for(let i=0;i<20;i++){const t=i/20*Math.PI*2,x=230+Math.cos(t)*65,z=245+Math.sin(t)*53;if(Math.abs(x-230)>8&&!(x<177&&Math.abs(z-245)<12))this.tree(x,z);}
    for(let z=194;z<274;z+=12){this.lantern(236,3,z,'#9cebd5');this.box(.12,3,.12,236,1.5,z,'#77938a');}
  }
  private oldTownDetails(){
    for(const [wx,wz,ww,wd] of [[-62,12,11,7],[-18,11,9,6.5],[22,12,10,7]] as const){
      const wy=groundHeight(wz,wx);
      buildWarehouseSilhouette((w,h,d,x,y,z,c,glow)=>this.box(w,h,d,x,y,z,c,!!glow),wx,wy,wz,{w:ww,d:wd,h:5.2});
      this.colliders.push({x:wx,z:wz,w:ww,d:wd,height:6});
      addHarborPointLight(this.scene,wx,wy+5.8,wz+wd/2+1.5,ACCENT.amber,26,16);
    }
    for(const x of [-80,-27,16,58]){this.bench(x,28);for(let i=0;i<3;i++){this.box(.6,.55,.6,x+i*.75,.28,25,'#7b7a64');this.sphere(x+i*.75,.8,25,.4,.45,.4,'#4b7d66');}}
    for(const x of [-31,39])for(const z of [-14,-53]){this.box(.7,1.1,.7,x,groundHeight(z)+.55,z,'#506d79');this.box(.72,.08,.72,x,groundHeight(z)+1.15,z,'#91aca5');}
    for(let i=0;i<16;i++){const x=-80+i*10;this.box(1.2,.13,1.6,x,.18,30,'#364c50');for(let k=0;k<4;k++)this.box(.07,.03,1.4,x-.45+k*.3,.27,30,'#7f9998');}
    for(const x of [-44,51]){this.box(.12,3,.12,x,1.5,57,'#7b9295');const ring=new THREE.TorusGeometry(.5,.13,8,16);ring.translate(x,1.8,57);this.add(ring,'#e5a078');}
  }
  update(time:number){this.lighthouse.rotation.y=time*.18;this.tram.position.x=212+Math.sin(time*.055)*110;const p=this.steam.geometry.attributes.position;for(let i=0;i<p.count;i++){p.setY(i,this.steamBases[i*3+1]+(time*.45+i*.09)%1.7);p.setX(i,this.steamBases[i*3]+Math.sin(time+i)*.12);}p.needsUpdate=true;}
}
