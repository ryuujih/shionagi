import * as THREE from 'three';

import { StoryWorld, type StorySnapshot } from './story-world.ts';
import { MISSIONS, rayBoxDistance, type EndingChoice } from './campaign.ts';
import { WorldExpansion } from './expansion.ts';
import { PLACES, districtAt, type PlaceId } from './geography.ts';
import { CityLife } from './city-life.ts';
import { VEHICLES, stepFoot, canWalk, groundHeight, stepDrive, findExit, type Collider, type VehicleKind, type DriveState } from './simulation.ts';
export { canWalk, groundHeight } from './simulation.ts';
export type WorldStatus = { x: number; z: number; heading: number; location: string; distance: number; vehicle: VehicleKind | null; speed: number; altitude: number; nearby: VehicleKind | null; notice: string; cruise: boolean; discovered: PlaceId[]; nearbyPlace: PlaceId | null; campaign: StorySnapshot };

export class HarborWorld {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);
  private colliders: Collider[] = [];
  private marineObstacles: Collider[] = [];
  private city!: CityLife;
  private expansion!: WorldExpansion;
  private story!: StoryWorld;
  private firing=false;
  private footVelocity={x:0,z:0};
  private actualSpeed=0;
  private bodyHeading=0;
  private dash=0;
  private dashCooldown=0;
  private pointerStart={x:0,y:0};
  private discovered = new Set<PlaceId>();
  private riding: VehicleKind | null = null;
  private cruise = false;
  private drive: DriveState = {x:0,y:0,z:0,heading:0,speed:0};
  private notice = '';
  private noticeUntil = 0;
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private pos = new THREE.Vector3(0, 1.75, 25);
  private previousFrame = performance.now();
  private time = 0;
  private distance = 0;
  private playing = false;
  private active = false;
  private disposed = false;
  private reportAt = 0;
  private boats: THREE.Group[] = [];
  private drones: THREE.Group[] = [];
  private water!: THREE.ShaderMaterial;
  private sky!: THREE.ShaderMaterial;
  private litMaterials: THREE.MeshStandardMaterial[] = [];
  private sun!: THREE.DirectionalLight;
  private ambient!: THREE.HemisphereLight;
  private seed = 1977;
  private drag: {x:number; y:number} | null = null;
  private resizeObserver: ResizeObserver;
  private listeners: (() => void)[] = [];
  onStatus: (s: WorldStatus) => void;
  onLock: (locked: boolean) => void;
  constructor(private container: HTMLDivElement, onStatus: (s: WorldStatus) => void, onLock: (locked: boolean) => void) {
    this.onStatus = onStatus; this.onLock = onLock;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2('#244f60', 0.0028);
    this.build();
    this.expansion = new WorldExpansion(this.scene,this.colliders);
    for(const z of [55,85,115,145,170])this.marineObstacles.push({x:230,z,w:2,d:2});
    this.city = new CityLife(this.scene);
    this.story = new StoryWorld(this.scene,this.colliders);
    this.setNight(true);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container); this.resize();
    this.bind();
    this.renderer.setAnimationLoop(this.update);
  }
  private rand() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  private mat(color: string | number, roughness = 0.8) { return new THREE.MeshStandardMaterial({ color, roughness }); }
  private glow(color: string, strength = 2) {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: 0.35 });
    this.litMaterials.push(m); return m;
  }
  private box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = this.scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  private line(points: THREE.Vector3[], color: string, parent: THREE.Object3D = this.scene) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color })); parent.add(line); return line;
  }
  private textSign(text: string, sub: string, w: number, h: number, x: number, y: number, z: number, color = '#76f4dc', parent: THREE.Object3D = this.scene) {
    const c = document.createElement('canvas'); c.width = 768; c.height = 256;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#0a2629'; ctx.fillRect(0,0,768,256);
    ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.strokeRect(13,13,742,230);
    ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.font = '600 95px "Hiragino Kaku Gothic ProN", sans-serif'; ctx.fillText(text,384,136);
    ctx.shadowBlur = 0; ctx.font = '25px sans-serif'; ctx.fillText(sub,384,203);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map, toneMapped:false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w,h), m); sign.position.set(x,y,z); parent.add(sign); return sign;
  }
  private build() {
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite:false, uniforms:{ top:{value:new THREE.Color('#142d4b')}, bottom:{value:new THREE.Color('#658d91')} }, vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader:'varying vec3 v; uniform vec3 top; uniform vec3 bottom; void main(){float h=normalize(v).y; gl_FragColor=vec4(mix(bottom,top,smoothstep(-.05,.65,h)),1.);}' });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(950,32,16),this.sky));
    this.ambient = new THREE.HemisphereLight('#a1d8ed','#283b3e',2.3); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#c3e0ed',2.2); this.sun.position.set(-120,180,90); this.scene.add(this.sun);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9,24,24),new THREE.MeshBasicMaterial({color:'#d7e9db'})); moon.position.set(230,220,-470); this.scene.add(moon);
    const starPositions:number[] = []; for(let i=0;i<400;i++){const theta=this.rand()*Math.PI*2;const y=200+this.rand()*500;const r=700;starPositions.push(Math.cos(theta)*r,y,Math.sin(theta)*r);}
    const starsGeo = new THREE.BufferGeometry(); starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)); this.scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#d2eee9',size:0.8,transparent:true,opacity:0.6})));
    const mountainMat = this.mat('#254c50');
    for(let i=0;i<17;i++){
      const x=(i-8)*47; const h=65+this.rand()*105; const geo=new THREE.SphereGeometry(1,14,10,0,Math.PI*2,0,Math.PI/2);const verts=geo.attributes.position;for(let v=0;v<verts.count;v++){const yy=verts.getY(v);verts.setY(v,yy*(.9+.1*Math.sin(verts.getX(v)*9+verts.getZ(v)*7)));}geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,mountainMat);mesh.scale.set(95+this.rand()*35,h*.73,90);mesh.position.set(x,-2,-385-this.rand()*70); mesh.rotation.y=this.rand()*6; this.scene.add(mesh);
    }
    for(let i=0;i<6;i++){const h=28+this.rand()*35; const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2),this.mat('#456a71'));mesh.scale.set(65,h,58);mesh.position.set(270+i*75,-4,-120+this.rand()*150); this.scene.add(mesh);}
    const landGeo=new THREE.PlaneGeometry(192,148,1,40); landGeo.rotateX(-Math.PI/2);
    const a=landGeo.attributes.position; for(let i=0;i<a.count;i++){const z=a.getZ(i)-42;a.setZ(i,z);a.setY(i,groundHeight(z));} landGeo.computeVertexNormals();
    this.scene.add(new THREE.Mesh(landGeo,this.mat('#394b4b')));
    this.box(192,3,3,0,-1.5,32,this.mat('#63706b'));
    const roadMat=this.mat('#273f44',0.37); const curb=this.mat('#697975');
    for(const x of [-70,-35,0,35,70]){
      const geo=new THREE.PlaneGeometry(7,140,1,40); geo.rotateX(-Math.PI/2); const a=geo.attributes.position;
      for(let i=0;i<a.count;i++){const z=a.getZ(i)-40;a.setZ(i,z);a.setY(i,groundHeight(z)+0.025);} geo.computeVertexNormals();const road=new THREE.Mesh(geo,roadMat);road.position.x=x;this.scene.add(road);
      for(let z=-103;z<25;z+=5) this.box(.10,.02,2.4,x,groundHeight(z)+.05,z,this.mat('#829088'));
    }
    for(const z of [23,-16,-55,-94]) this.box(187,.06,7,0,groundHeight(z)+.03,z,roadMat);
    this.box(190,.08,5,0,.04,29,curb);
    this.water = new THREE.ShaderMaterial({ uniforms: { time:{value:0}, waterColor:{value:new THREE.Color('#164954')} }, transparent:false,
      vertexShader:`varying vec3 p; uniform float time; void main(){ p=position; vec3 v=position; v.z+=sin(v.x*.08+time*.55)*.13+cos(v.y*.11+time*.4)*.09; gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.); }`,
      fragmentShader:`varying vec3 p; uniform float time; uniform vec3 waterColor; void main(){float wave=sin(p.x*.25+p.y*.45+time)*sin(p.y*.23-time*.8); float fine=pow(max(0.,sin(p.x*.7+p.y*1.8+time*.7)),18.); float strip=pow(max(0.,sin(p.x*.046+sin(p.y*.08)*.23)),28.); vec3 col=waterColor+wave*.018+fine*.045; col+=vec3(.16,.48,.39)*strip*(.15+fine)*exp(-abs(p.y+70.)*.005); gl_FragColor=vec4(col,1.); }` });
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(1900,1900,150,100),this.water);sea.rotation.x=-Math.PI/2;sea.position.set(0,-1.1,200);this.scene.add(sea);
    for(const x of [-50,46]){
      this.box(11,1.2,60,x,-.35,59,curb);
      for(let z=38;z<89;z+=10){this.box(.35,3,.35,x-5,1,z,curb);this.box(.35,3,.35,x+5,1,z,curb);}
      this.box(.12,.12,51,x-5,2.1,63,curb);this.box(.12,.12,51,x+5,2.1,63,curb);
      this.lamp(x,84,0);
    }
    const palette=['#788078','#556e72','#8a8070','#627d7a','#8b776c','#68727c'];
    const names=[['汐凪水産','SHIONAGI FISHERY'],['浜の湯','PUBLIC BATH · 24H'],['凪食堂','FISH & RICE'],['ミナト電機','REPAIR / AUGMENT'],['青波商店','AOBA GENERAL STORE'],['海猫珈琲','UMINEKO COFFEE'],['旅館 潮路','SHIOJI INN'],['つり具','FISHING TACKLE'],['港湾通信','PORT NETWORK'],['居酒屋 灯','AKARI · OPEN LATE']];
    let n=0;
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){
      const centerX=-70+col*35+17.5; if(centerX>86)continue;
      for(let j=0;j<2;j++){
        const x=centerX+(j===0?-7:7);const z=3-row*39+(this.rand()-.5)*2;const w=10+this.rand()*2;const d=18+this.rand()*4;const h=5.5+this.rand()*7;
        this.buildHouse(x,z,w,d,h,palette[n%palette.length],names[n%names.length],n);n++;
      }
    }
    // 山側にも民家を置き、坂の終点を小さな神社にする。
    for(const x of [-52,-17,18,53]) this.buildHouse(x,-81,17,15,7,palette[n++%6],['汐凪','SHIONAGI'],n);
    this.shrine(0,-103);
    for(const x of [-70,-35,0,35,70]) for(const z of [20,-19,-58]) this.lamp(x-4.5,z,groundHeight(z));
    for(const z of [17,-22,-61]){
      for(const x of [-69,-34,1,36,71]){
        const y=groundHeight(z);this.box(.24,11,.24,x,y+5.5,z,this.mat('#384d4d'));
        this.box(3,.15,.15,x,y+10,z,this.mat('#435557'));
        for(let strand=0;strand<3;strand++) {const pts=[];for(let i=0;i<=20;i++){const t=i/20;pts.push(new THREE.Vector3(x+35*t,y+10-Math.sin(t*Math.PI)*1.9,z+strand*.38));}this.line(pts,'#233b40');}
      }
    }
    for(let i=0;i<9;i++) this.boat(-37+i*9,44+(i%3)*12,i);
    this.boat(65,77,10);
    for(let i=0;i<22;i++){
      const x=-85+this.rand()*168,z=26;const y=0;this.box(1.1,.8,1.1,x,y+.4,z,this.mat(i%2?'#659b9b':'#b08055'));
      if(i%3===0){this.box(1.1,.8,1.1,x,y+1.2,z,this.mat('#668e81'));}
    }
    for(let i=0;i<10;i++){
      const x=-90+i*18;this.box(.55,.4,.55,x,.3,31,this.mat('#9f9b83'));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.16,6,12),this.mat('#1c3035'));ring.position.set(x,-.2,33.6);this.scene.add(ring);
    }
    this.textSign('汐凪漁港','SHIONAGI PORT / SINCE 1968',11,3.4,-50,5,30,'#a9ebd6');
    this.box(.15,7,.15,-56,3.5,29.8,curb);this.box(.15,7,.15,-44,3.5,29.8,curb);
    // 遠景の風車と海上標識で、漁港の生活感の中に未来の設備を混ぜる。
    for(let i=0;i<5;i++){const x=220+i*36;this.box(.65,38,.65,x,18,-10,this.mat('#a0b2ae'));const hub=new THREE.Group();hub.position.set(x,36,-10);for(let k=0;k<3;k++){const blade=this.box(.6,15,.22,0,7,0,this.mat('#acb8af'),hub);blade.geometry.translate(0,0,0);const pivot=new THREE.Group();hub.remove(blade);pivot.add(blade);pivot.rotation.z=k*Math.PI*2/3;hub.add(pivot);}this.scene.add(hub);this.drones.push(hub);}
    for(let i=0;i<3;i++){const drone=new THREE.Group();const m=this.mat('#96b5b3');this.box(1.5,.3,.65,0,0,0,m,drone);this.box(.7,.12,.15,0,-.2,.4,this.glow('#71ffe0'),drone);this.scene.add(drone);drone.userData.flying=true;drone.userData.offset=i*2.1;this.drones.push(drone);}
    this.tree(-87,-48);this.tree(87,-48);for(let i=0;i<32;i++)this.tree(-110+this.rand()*220,-125-this.rand()*50);
  }
  private buildHouse(x:number,z:number,w:number,d:number,h:number,color:string,name:string[],n:number){
    const y=groundHeight(z); const wall=this.mat(color);const dark=this.mat('#293f43'); const trim=this.mat('#98a295');
    this.box(w,h,d,x,y+h/2,z,wall);this.colliders.push({x,z,w,d,height:h+2});
    this.box(w+.6,.3,d+.6,x,y+h,z,dark);
    if(n%3!==0){
      const roofGeo=new THREE.BufferGeometry();const a=w/2+.6,b=d/2+.6;
      const verts=[-a,0,-b,a,0,-b,0,2,-b,-a,0,b,0,2,b,a,0,b,-a,0,-b,0,2,-b,-a,0,b,0,2,-b,0,2,b,-a,0,b,0,2,-b,a,0,-b,0,2,b,a,0,-b,a,0,b,0,2,b];
      roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));roofGeo.computeVertexNormals();const roof=new THREE.Mesh(roofGeo,this.mat(n%2?'#35515c':'#52656a'));roof.position.set(x,y+h,z);this.scene.add(roof);
    } else {
      this.box(w*.68,.18,d*.5,x,y+h+.25,z,this.mat('#244c63',.2));
      this.box(1.4,1.3,1.4,x+w/3,y+h+.7,z-2,trim);
      this.box(.06,4,.06,x-3,y+h+2,z,dark);this.box(2,.06,.06,x-3,y+h+3,z,dark);
    }
    const front=z+d/2+.03;
    const windowMat=this.glow(n%3===0?'#82d9cf':'#edbb78',n%3===0?.9:.65);
    for(let f=0;f<Math.floor(h/3);f++)for(let k=0;k<3;k++){
      const wx=x-w*.32+k*w*.32;const wy=y+2+f*3;
      this.box(2,1.55,.10,wx,wy,front,dark);this.box(1.7,1.29,.11,wx,wy,front+.04,windowMat);
      this.box(.07,1.4,.13,wx,wy,front+.1,dark);this.box(1.8,.07,.13,wx,wy,front+.1,dark);
      if(f>0)this.box(2.3,.11,.7,wx,wy-.8,front+.3,trim);
    }
    // 両側面に窓を付け、路地からも生活の気配が見えるようにする。
    for(const side of [-1,1])for(let k=0;k<3;k++){
      this.box(.08,1.5,2,x+side*(w/2+.04),y+2.3,z-5+k*5,windowMat);
      this.box(.12,1.5,.09,x+side*(w/2+.08),y+2.3,z-5+k*5,dark);
    }
    this.box(1.8,2.5,.15,x,y+1.25,front+.1,dark);
    this.box(w+.4,.14,2.1,x,y+3.4,front+.9,this.mat(n%2?'#417d77':'#995f4f'));
    this.textSign(name[0],name[1],Math.min(w-1,8),1.75,x,y+4.6,front+.22,n%3===0?'#71f9dd':'#ffb889');
    this.box(.11,h,.13,x-w/2+.25,y+h/2,front+.15,this.glow(n%2?'#60ddcf':'#eab581',1.25));
    if(n%3===0){
      const g=new THREE.Group();g.position.set(x+w/2+.18,y+5.6,front-1.5);g.rotation.y=Math.PI/2;this.textSign(n%2?'宿':'酒','OPEN',2,2.4,0,0,0,'#ff917e',g);this.scene.add(g);
    }
    const ac=this.box(1.5,.9,.65,x+w*.3,y+1.25,front+.4,trim);for(let i=0;i<4;i++)this.box(1.2,.04,.02,ac.position.x,y+1+i*.14,front+.74,dark);
    if(n%4===0){
      this.box(1.25,2.5,.85,x-w/2-.75,y+1.25,front-.7,this.mat('#cb7665'));
      this.box(.97,1.4,.05,x-w/2-.75,y+1.6,front-.24,this.glow('#91f4db',.8));
      for(let j=0;j<3;j++)this.box(.85,.04,.08,x-w/2-.75,y+1.1+j*.38,front-.18,dark);
      this.colliders.push({x:x-w/2-.75,z:front-.7,w:1.25,d:.85});
    }
    if(n%2===0){const lantern=new THREE.Mesh(new THREE.SphereGeometry(.45,10,8),this.glow('#ff986f',1.4));lantern.scale.y=1.4;lantern.position.set(x-w*.4,y+2.7,front+1);this.scene.add(lantern);}
  }
  private lamp(x:number,z:number,y:number){
    const m=this.mat('#5a7476');this.box(.13,6.4,.13,x,y+3.2,z,m);this.box(1.7,.13,.13,x+.8,y+6.3,z,m);this.box(.9,.12,.6,x+1.2,y+6.2,z,this.glow('#b1ffe5',2));
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({color:'#72c8b7',transparent:true,opacity:.045,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(x+1,y+.08,z);this.scene.add(glow);
  }
  private boat(x:number,z:number,n:number){
    this.marineObstacles.push({x,z,w:3.6,d:10});
    const group=new THREE.Group();group.position.set(x,-.65,z);group.rotation.y=(n%2?-.12:.12);const hull=this.mat(n%3===0?'#cb8970':'#b1c4b6');
    const shape=new THREE.Shape();shape.moveTo(-1.5,-4);shape.lineTo(1.5,-4);shape.lineTo(1.75,1.5);shape.lineTo(.8,4.2);shape.lineTo(0,5);shape.lineTo(-.8,4.2);shape.lineTo(-1.75,1.5);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:true,bevelThickness:.2,bevelSize:.2,bevelSegments:1,steps:1});geo.rotateX(Math.PI/2);const body=new THREE.Mesh(geo,hull);body.position.y=.7;group.add(body);
    this.box(2.6,.16,6,0,.8,-.7,this.mat('#506e70'),group);this.box(2.1,1.8,2.6,0,1.6,-1.1,hull,group);this.box(1.7,.85,.06,0,1.9,.23,this.glow('#78c9c8',.5),group);this.box(2.4,.16,2.9,0,2.55,-1.1,hull,group);this.box(.09,4.5,.09,0,3,-1.5,hull,group);this.box(2.5,.05,.05,0,4.7,-1.5,hull,group);
    for(let i=0;i<3;i++)this.box(.55,.4,.8,-.6+i*.6,1,1.5,this.mat('#6f9c9b'),group);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),this.glow('#ffb892',2));bulb.position.set(0,5.1,-1.5);group.add(bulb);this.scene.add(group);group.userData.phase=n;this.boats.push(group);
  }
  private tree(x:number,z:number){const y=groundHeight(z);this.box(.7,6,.7,x,y+3,z,this.mat('#3b5148'));const m=this.mat('#294e4a');for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.ConeGeometry(3.8-i*.7,5,7),m);mesh.position.set(x,y+5+i*2,z);this.scene.add(mesh);}}
  private shrine(x:number,z:number){const y=groundHeight(z);const red=this.mat('#b9624e');for(const dx of [-3,3])this.box(.48,5,.48,x+dx,y+2.5,z,red);this.box(8,.5,.7,x,y+5,z,red);this.box(7,.3,.4,x,y+4,z,red);this.box(8.7,.25,.85,x,y+5.3,z,this.mat('#283e43'));this.box(6,4,4,x,y+2,z-6,this.mat('#7b6452'));this.box(8,.6,6,x,y+4,z-6,this.mat('#334c54'));this.colliders.push({x,z:z-6,w:6,d:4});}
  private bind(){
    const listen=<K extends keyof WindowEventMap>(type:K, fn:(e:WindowEventMap[K])=>void)=>{window.addEventListener(type,fn);this.listeners.push(()=>window.removeEventListener(type,fn));};
    listen('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','ControlLeft','ControlRight','KeyQ','KeyR'].includes(e.code)&&this.active){e.preventDefault();this.keys.add(e.code);}});
    listen('keydown',e=>{if(e.code==='Escape'&&this.active)this.pause();if(this.active&&!this.riding&&!e.repeat){if(e.code==='KeyQ')this.story.toggleLock(this.pos);if(e.code==='KeyR')this.story.reload();if(e.code==='KeyJ')this.fire();if(e.code==='Space'&&this.dashCooldown<=0){this.dash=.22;this.dashCooldown=1.4;this.story.dodge();}}if(e.code==='KeyF'&&this.active&&!e.repeat)this.readPlace();if(e.code==='KeyC'&&this.active&&!e.repeat)this.toggleCruise();if(e.code==='KeyE'&&this.active&&!e.repeat){e.preventDefault();this.interact();}});
    listen('keyup',e=>this.keys.delete(e.code));listen('blur',()=>{this.keys.clear();this.footVelocity={x:0,z:0};this.drag=null;if(this.playing)this.pause();});
    const lock=()=>{if(document.pointerLockElement===this.renderer.domElement){this.active=true;this.onLock(true);}else if(this.active)this.pause();};
    document.addEventListener('pointerlockchange',lock);this.listeners.push(()=>document.removeEventListener('pointerlockchange',lock));
    listen('mousemove',e=>{if(this.active&&document.pointerLockElement){this.yaw-=e.movementX*.002;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.002,-1.35,1.35);}});
    const canvas=this.renderer.domElement;
    const down=(e:PointerEvent)=>{this.pointerStart={x:e.clientX,y:e.clientY};if(this.active&&document.pointerLockElement&&e.button===0){this.fire();this.firing=true;}if(this.playing&&this.active&&!document.pointerLockElement){this.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}};
    const move=(e:PointerEvent)=>{if(this.drag){this.yaw-=(e.clientX-this.drag.x)*.005;this.pitch=THREE.MathUtils.clamp(this.pitch-(e.clientY-this.drag.y)*.005,-1.35,1.35);this.drag={x:e.clientX,y:e.clientY};}};
    const up=(e:PointerEvent)=>{if(e.type!=='pointercancel'&&this.drag&&this.active&&!document.pointerLockElement&&e.button===0&&Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)<5)this.fire();this.drag=null;this.firing=false;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    this.listeners.push(()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);});
  }
  async start(){if(this.story.down||this.story.dialogue)return;this.playing=true;if(matchMedia('(pointer: coarse)').matches){this.active=true;this.onLock(true);return;}try{await this.renderer.domElement.requestPointerLock();}catch{/* 固定視点に非対応のブラウザではドラッグ操作で継続する。 */}this.active=true;this.onLock(true);}
  pause(){this.footVelocity={x:0,z:0};this.dash=0;this.drag=null;this.firing=false;this.cruise=false;this.drive.speed=0;this.active=false;this.keys.clear();this.footVelocity={x:0,z:0};document.exitPointerLock?.();this.onLock(false);}
  home(){this.pause();this.playing=false;}
  reset(){
    if(this.riding){const definition=VEHICLES.find(v=>v.id===this.riding)!;const model=this.city.vehicles.get(this.riding)!;model.position.set(definition.home[0],this.riding==='boat'?0:groundHeight(definition.home[1]),definition.home[1]);model.rotation.y=this.riding==='boat'?Math.PI:0;}
    this.riding=null;this.cruise=false;this.drive.speed=0;this.pos.set(0,1.75,25);this.yaw=0;this.pitch=0;this.keys.clear();this.footVelocity={x:0,z:0};this.notice='港に戻りました';this.noticeUntil=this.time+4;
  }
  private nearestVehicle(){let nearest:VehicleKind|null=null,best=7.5;for(const [id,model] of this.city.vehicles){const d=Math.hypot(this.pos.x-model.position.x,this.pos.z-model.position.z);if(d<best){nearest=id;best=d;}}return nearest;}
  board(id:VehicleKind){
    // 車庫からの移動は明示された操作。以前の車両はその場に残す。
    const model=this.city.vehicles.get(id);if(!model||this.story.down||this.story.dialogue)return;
    this.story.clearLock();this.footVelocity={x:0,z:0};this.riding=id;this.cruise=false;this.drive={x:model.position.x,y:id==='boat'?0:Math.max(model.position.y,groundHeight(model.position.z,model.position.x)),z:model.position.z,heading:model.rotation.y,speed:0};
    if(id==='air')this.drive.y=Math.max(this.drive.y,groundHeight(this.drive.z,this.drive.x)+3);
    this.pos.set(this.drive.x,this.drive.y+1.5,this.drive.z);this.yaw=this.drive.heading;this.pitch=0;this.keys.clear();this.footVelocity={x:0,z:0};this.playing=true;this.notice='';
  }
  startExploring(){this.story.explore();this.reset();}
  startStory(){this.story.start();this.missionTravel();}
  missionTravel(){const m=MISSIONS[Math.min(this.story.progress.stage,5)];if(!m||this.story.down||this.story.dialogue)return;this.riding=null;this.cruise=false;this.drive.speed=0;this.pos.set(m.x,groundHeight(m.z,m.x)+1.75,m.z);this.yaw=this.story.progress.stage===3?Math.PI:0;this.pitch=0;this.keys.clear();this.footVelocity={x:0,z:0};}
  missionAction(){if(this.riding||!this.active)return false;const snap=this.story.snapshot(this.pos);if(!snap.enabled||!snap.near||snap.stage>=6||MISSIONS[snap.stage].kind==='combat')return false;if(this.story.action(this.pos,true))this.pause();return true;}
  confirmStory(choice?:EndingChoice){this.story.confirm(choice);}
  retryStory(){this.story.retry();this.missionTravel();}
  fire(){if(this.active&&!this.riding){this.bodyHeading=this.yaw;this.story.fire(this.camera,this.pos);}}
  reloadWeapon(){this.story.reload();}
  lockEnemy(){if(!this.riding)this.story.toggleLock(this.pos);}
  private nearbyPlace(){return PLACES.find(p=>Math.hypot(p.x-this.pos.x,p.z-this.pos.z)<11);}
  readPlace(){const place=this.nearbyPlace();if(!place||this.riding)return;this.notice=place.story;this.noticeUntil=this.time+14;this.discovered.add(place.id);}
  travel(id:PlaceId){const place=PLACES.find(p=>p.id===id);if(!place||this.story.down||this.story.dialogue||!canWalk(place.x,place.z,this.colliders))return false;this.riding=null;this.cruise=false;this.drive.speed=0;this.pos.set(place.x,groundHeight(place.z,place.x)+1.75,place.z);this.yaw=id==='overlook'?Math.PI:id==='island'?-.9:id==='lighthouse'?-2.4:0;this.pitch=0;this.keys.clear();this.footVelocity={x:0,z:0};this.notice='';return true;}
  toggleCruise(){if(this.riding&&this.active)this.cruise=!this.cruise;}
  interact(){
    if(this.story.down||this.story.dialogue)return;if(this.missionAction())return;
    if(!this.riding){const nearby=this.nearestVehicle();if(nearby)this.board(nearby);return;}
    if(Math.abs(this.drive.speed)>1){this.notice='Spaceで停止してから降りてください';this.noticeUntil=this.time+4;return;}
    if(this.riding==='air'&&this.drive.y>groundHeight(this.drive.z,this.drive.x)+5){this.notice='Qで地上近くまで降下してください';this.noticeUntil=this.time+4;return;}
    const exit=findExit(this.riding,this.drive.x,this.drive.z,this.colliders);
    if(!exit){this.notice=this.riding==='boat'?'桟橋に近づくと降りられます。Vの車庫から港にも戻れます':'降りられる広い場所へ移動してください';this.noticeUntil=this.time+5;return;}
    this.riding=null;this.cruise=false;this.drive.speed=0;this.pos.set(exit.x,groundHeight(exit.z,exit.x)+1.75,exit.z);this.pitch=0;this.keys.clear();this.footVelocity={x:0,z:0};this.notice='';
  }
  setKey(key:string,down:boolean){if(down)this.keys.add(key);else this.keys.delete(key);}
  setNight(night:boolean){this.sky.uniforms.top.value.set(night?'#12162e':'#578795');this.sky.uniforms.bottom.value.set(night?'#64516f':'#d8c7a1');this.ambient.intensity=night?1.35:3.2;this.sun.color.set(night?'#c3e0ed':'#ffe1ad');this.sun.intensity=night?1.1:3;this.scene.fog=new THREE.FogExp2(night?'#2c354e':'#8faaa5',.0018);this.water.uniforms.waterColor.value.set(night?'#164954':'#34777e');}
  private resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();}
  private update=()=>{
    if(this.disposed)return;const now=performance.now();const dt=Math.min((now-this.previousFrame)/1000,.05);this.previousFrame=now;this.time+=dt;if(this.active){this.dash=Math.max(0,this.dash-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);}this.water.uniforms.time.value=this.time;
    this.boats.forEach(b=>{b.position.y=-.65+Math.sin(this.time*.8+b.userData.phase)*.08;b.rotation.z=Math.sin(this.time*.65+b.userData.phase)*.016;});
    this.drones.forEach(d=>{if(d.userData.flying){const t=this.time*.08+d.userData.offset;d.position.set(Math.sin(t)*64,19+Math.sin(t*3)*2,Math.cos(t)*32-24);}else d.rotation.z+=dt*.12;});
    this.city.update(dt,this.time,this.pos,this.riding);
    this.expansion.update(this.time);
    if(this.playing){
      if(this.riding){
        const vehicle=VEHICLES.find(v=>v.id===this.riding)!;
        const down=(key:string)=>this.active&&this.keys.has(key);
        if(down('Space')||down('KeyS')||down('ArrowDown'))this.cruise=false;
        const input={throttle:Number(down('KeyW')||down('ArrowUp'))-Number(down('KeyS')||down('ArrowDown')),steer:Number(down('KeyD')||down('ArrowRight'))-Number(down('KeyA')||down('ArrowLeft')),vertical:Number(down('KeyR'))-Number(down('KeyQ')||down('ControlLeft')||down('ControlRight')),brake:!this.active||down('Space')};
        if(this.cruise&&input.throttle===0)input.throttle=.32;
        const previous=this.drive;
        this.drive=stepDrive(this.drive,vehicle,input,dt,[...(this.riding==='boat'?this.marineObstacles:this.colliders),...this.city.obstacles(this.riding)]);
        this.yaw+=this.drive.heading-previous.heading;
        const model=this.city.vehicles.get(this.riding)!;model.position.set(this.drive.x,this.drive.y,this.drive.z);model.rotation.y=this.drive.heading;
        this.city.animateVehicle(model,this.riding,this.drive.speed,this.drive.steering??0,dt,this.time);
        this.pos.set(this.drive.x,this.drive.y+1.5,this.drive.z);
        const follow=this.riding==='boat'?10:this.riding==='air'?9:6;
        const target=new THREE.Vector3(this.drive.x,this.drive.y+1.4,this.drive.z);
        const desired=new THREE.Vector3(this.drive.x+Math.sin(this.yaw)*follow,this.drive.y+Math.max(1.8,4-this.pitch*4),this.drive.z+Math.cos(this.yaw)*follow);
        // 追従カメラが建物に入る場合は、手前まで寄せる。
        for(let i=1;i<=12;i++){const probe=target.clone().lerp(desired,i/12);if(this.colliders.some(c=>Math.abs(probe.x-c.x)<c.w/2+.2&&Math.abs(probe.z-c.z)<c.d/2+.2&&probe.y<groundHeight(c.z,c.x)+(c.height??12))){desired.copy(target.clone().lerp(desired,Math.max(.05,(i-1)/12)));break;}}
        this.camera.position.copy(desired);this.camera.lookAt(target);
      }else{
        this.actualSpeed=0;
        if(this.active&&!this.story.down&&!this.story.dialogue){
          let f=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'));
          const r=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'));
          if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.3;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.3;
          if(this.dash>0&&f===0&&r===0)f=1;
          this.footVelocity=stepFoot(this.footVelocity,f,r,this.yaw,this.dash>0?15:this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?7:3.8,dt);
          const oldX=this.pos.x,oldZ=this.pos.z,dx=this.footVelocity.x*dt,dz=this.footVelocity.z*dt;
          if(canWalk(this.pos.x+dx,this.pos.z,this.colliders))this.pos.x+=dx;else this.footVelocity.x=0;
          if(canWalk(this.pos.x,this.pos.z+dz,this.colliders))this.pos.z+=dz;else this.footVelocity.z=0;
          const moved=Math.hypot(this.pos.x-oldX,this.pos.z-oldZ);this.distance+=moved;this.actualSpeed=dt>0?moved/dt:0;
          this.bodyHeading=this.story.target()?this.yaw:this.actualSpeed>.1?Math.atan2(-(this.pos.x-oldX),-(this.pos.z-oldZ)):this.bodyHeading;
        }else this.footVelocity={x:0,z:0};
        this.pos.y=groundHeight(this.pos.z,this.pos.x)+1.75;
        const locked=this.story.target();
        if(locked){const delta=locked.clone().sub(this.pos);this.yaw=Math.atan2(-delta.x,-delta.z);this.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));}
        const forward=new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));
        const desired=this.pos.clone().addScaledVector(forward,-4.8).add(new THREE.Vector3(Math.cos(this.yaw)*.7,.45,-Math.sin(this.yaw)*.7));
        const delta=desired.clone().sub(this.pos),direction=delta.clone().normalize();let distance=delta.length();
        for(const c of this.colliders)distance=Math.min(distance,Math.max(.35,rayBoxDistance(this.pos,direction,{...c,w:c.w+.3,d:c.d+.3,bottom:groundHeight(c.z,c.x),top:groundHeight(c.z,c.x)+(c.height??12)})-.25));
        this.camera.position.copy(this.pos).addScaledVector(direction,distance);this.camera.position.y=Math.max(this.camera.position.y,groundHeight(this.camera.position.z,this.camera.position.x)+.4);
        this.camera.lookAt(locked??this.pos.clone().addScaledVector(forward,35));
      }
    } else {this.camera.position.set(105+Math.sin(this.time*.035)*4,49,105);this.camera.lookAt(-3,8,-22);}
    this.story.update(dt,this.pos,this.story.target()?this.yaw:this.bodyHeading,this.riding?0:this.actualSpeed,this.active,!this.riding,this.playing);
    if(this.firing)this.fire();
    if(this.time-this.reportAt>.15){this.reportAt=this.time;const place=this.nearbyPlace();if(this.playing&&place&&this.pos.y-groundHeight(this.pos.z,this.pos.x)<6)this.discovered.add(place.id);this.onStatus({x:this.pos.x,z:this.pos.z,heading:this.riding?this.drive.heading:this.yaw,location:districtAt(this.pos.x,this.pos.z)+(this.riding==='air'?' 上空':''),distance:this.distance,vehicle:this.riding,speed:Math.abs(this.drive.speed)*3.6,altitude:Math.max(0,this.drive.y-groundHeight(this.drive.z,this.drive.x)),nearby:this.riding?null:this.nearestVehicle(),notice:this.time<this.noticeUntil?this.notice:'',cruise:this.cruise,discovered:[...this.discovered],nearbyPlace:this.nearbyPlace()?.id??null,campaign:this.story.snapshot(this.pos)});}
    this.renderer.render(this.scene,this.camera);
  };
  dispose(){this.disposed=true;this.renderer.setAnimationLoop(null);if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();this.resizeObserver.disconnect();this.listeners.forEach(fn=>fn());const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();this.scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line||obj instanceof THREE.Points||obj instanceof THREE.Sprite){if(!(obj instanceof THREE.Sprite))geometries.add(obj.geometry);for(const m of (Array.isArray(obj.material)?obj.material:[obj.material])){materials.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.domElement.remove();}
}
