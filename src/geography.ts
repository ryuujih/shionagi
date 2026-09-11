export const LAND_RECTS = [
  {x0:-96,x1:96,z0:-116,z1:30},
  {x0:90,x1:340,z0:-112,z1:30},
  {x0:-96,x1:96,z0:-250,z1:-110},
  {x0:-55,x1:-45,z0:28,z1:87},
  {x0:41,x1:51,z0:28,z1:87},
  {x0:125,x1:163,z0:240,z1:250},
] as const;
export const ISLAND={x:230,z:245,rx:78,rz:66};
export const BRIDGE={x0:224,x1:236,z0:28,z1:182};
export function onIsland(x:number,z:number,padding=0){return ((x-ISLAND.x)/(ISLAND.rx+padding))**2+((z-ISLAND.z)/(ISLAND.rz+padding))**2<=1;}
export function onBridge(x:number,z:number){return x>=BRIDGE.x0&&x<=BRIDGE.x1&&z>=BRIDGE.z0&&z<=BRIDGE.z1;}
export function groundHeight(z:number,x=0){
  if(onBridge(x,z)){const t=Math.max(0,Math.min(1,(z-30)/150));return 9.5*Math.sin(t*Math.PI)**2;}
  return Math.max(0,(-z-27)*.15);
}
export function onSolidLand(x:number,z:number){return LAND_RECTS.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)||onIsland(x,z);}
export function onWalkSurface(x:number,z:number,radius=.4){
  // 接続部分は矩形単体でなく和集合を判定し、道路の継ぎ目で止まらないようにする。
  for(let i=0;i<8;i++){const px=x+Math.cos(i*Math.PI/4)*radius,pz=z+Math.sin(i*Math.PI/4)*radius;if(!onSolidLand(px,pz)&&!onBridge(px,pz))return false;}
  return Number.isFinite(x)&&Number.isFinite(z);
}
export function boatSurface(x:number,z:number,radius:number){
  if(x < -250+radius || x > 455-radius || z < 34+radius || z > 425-radius)return false;
  for(let i=0;i<12;i++){const px=x+Math.cos(i*Math.PI/6)*radius,pz=z+Math.sin(i*Math.PI/6)*radius;if(onSolidLand(px,pz))return false;if(onBridge(px,pz)&&groundHeight(pz,px)<5.5)return false;}
  return !onSolidLand(x,z);
}
export const PLACES = [
  {id:'port',name:'汐凪漁港',tag:'OLD PORT',x:0,z:25,color:'#94efd2',description:'漁船のエンジンと潮の匂い。汐凪の暮らしが始まる場所。',story:'港の掲示板｜午前4時、無人漁船が帰ってくる。最後の目利きは、今も人の仕事だ。'},
  {id:'market',name:'東浜夜市',tag:'NIGHT MARKET',x:180,z:20,color:'#ffc38c',description:'屋台の湯気、魚の競り台、修理屋。屋根の下まで歩ける夜市。',story:'夜市の店主｜「今日の鯛？ 人工じゃないよ。沖で獲れた本物。ロボットにも味がわかればいいんだけどね。」'},
  {id:'terminal',name:'潮路ターミナル',tag:'TRANSIT QUARTER',x:288,z:-30,color:'#f89ae4',description:'空中駅と集合住宅が立ち並ぶ、港の新しい中心地。',story:'駅の時刻表｜瀬戸内環状線・次便 21:08。島の小さな駅も、今では空の路線図につながっている。'},
  {id:'village',name:'山灯の集落',tag:'MOUNTAIN HAMLET',x:35,z:-174,color:'#abd7ae',description:'竹林と段々の家並み。古い暮らしと小さな発電設備が残る坂道。',story:'集落の配達員｜「坂を登ってきたの？ この辺は通信が弱いから、急がない人が多いんだ。」'},
  {id:'overlook',name:'星見展望台',tag:'HILLTOP LOOKOUT',x:0,z:-228,color:'#b4c6ff',description:'湾とネオンの街を一望する、山の上の休憩所。',story:'展望台の銘板｜2081年、島々の灯りが再びつながった。この景色を忘れないための場所。'},
  {id:'island',name:'青汐島の船着場',tag:'AOSHIO ISLAND',x:164,z:245,color:'#82cce9',description:'橋でも船でも訪ねられる島。網干し場と小さな茶屋が迎える。',story:'船着場の案内｜青汐島へようこそ。橋は新しくなっても、渡し船は毎日運航しています。'},
  {id:'lighthouse',name:'青汐灯台',tag:'LIGHTHOUSE POINT',x:269,z:270,color:'#ffe6a0',description:'回る灯りが湾をなぞる。海風の強い岬の散歩道。',story:'灯台守の記録｜自動航行の時代にも、この灯りは消さない。帰ってくる人に、陸の場所を教えるために。'},
] as const;
export type PlaceId=typeof PLACES[number]['id'];
export function districtAt(x:number,z:number){if(onIsland(x,z)||x>120&&x<165&&z>230)return '青汐島';if(onBridge(x,z))return '青汐大橋';if(z<-210)return '星見の丘';if(z<-116)return '山灯の集落';if(x>245&&z<10)return '潮路ターミナル';if(x>110)return '東浜夜市';if(z>32)return '汐凪湾';if(z<-90)return '汐見神社';if(z<-30)return '山手の坂道';if(z<12)return '汐凪商店街';return '汐凪漁港';}
