export type EndingChoice = 'free' | 'routes';
export type CampaignProgress = { version: 1; stage: number; choice: EndingChoice | null };
export type MissionEvent = 'accept' | 'core' | 'relay' | 'drones' | 'network' | 'home';
export type PortraitId = 'nagi' | 'mio' | 'terminal' | 'nagi-radio';
export const MISSIONS = [
  { title:'帰港灯のない夜', task:'港で整備士ナギの依頼を聞く', x:8,z:23,kind:'talk',event:'accept',speaker:'ナギ',roleTitle:'港の整備士・ナギ',portrait:'nagi' as PortraitId,text:'帰港灯が消えた。自動操船の船が、沖で立ち往生している。配達員のレン、あんたの足を貸して。夜市に預けた中継コアを受け取って、山灯の旧式中継局へ運んでほしい。',action:'依頼を引き受ける' },
  { title:'夜市の落とし物', task:'東浜夜市の保管端末をスキャンする',x:180,z:20,kind:'scan',event:'core',speaker:'保管端末',roleTitle:'東浜夜市・保管端末',portrait:'terminal' as PortraitId,text:'ナギからの荷物を確認。中継コアを回収した。配送ログには、灯台から送られた不審な停止命令が残っている。',action:'コアを回収する' },
  { title:'山灯の古い約束', task:'山灯の中継局にコアを設置する',x:35,z:-174,kind:'scan',event:'relay',speaker:'ナギ',roleTitle:'港の整備士・ナギ（無線）',portrait:'nagi-radio' as PortraitId,text:'旧回線がつながった！ 原因は青汐灯台の保安ドローン。誤った封鎖命令を繰り返している。EMPパルスで3機を停止して。住民には当てないでね。',action:'中継局を復旧する' },
  { title:'灯台の番人', task:'青汐島の暴走ドローン3機をEMPで停止する',x:263,z:260,kind:'combat',event:'drones',speaker:'ナギ',roleTitle:'港の整備士・ナギ（無線）',portrait:'nagi-radio' as PortraitId,text:'3機とも停止。制御キーを回収した。潮路ターミナルに行けば、港湾ネットワークを再起動できる。',action:'ドローンを停止する' },
  { title:'誰のための航路', task:'潮路ターミナルで復旧方針を選ぶ',x:288,z:-30,kind:'choice',event:'network',speaker:'ミオ',roleTitle:'港湾システム技師・ミオ',portrait:'mio' as PortraitId,text:'故障じゃない。運営会社が「採算の悪い島」を航路から外そうとしたんだ。航路だけ戻せば、監視網は残る。監視網ごと切り離せば、これからは島の人たちが自分で守ることになる。レン、どうする？',action:'復旧方針を選ぶ' },
  { title:'おかえり、汐凪', task:'港に戻ってナギに報告する',x:8,z:23,kind:'talk',event:'home',speaker:'ナギ',roleTitle:'港の整備士・ナギ',portrait:'nagi' as PortraitId,text:'見て、帰港灯が戻った。沖の船も動き出してる。今日の配達、ちゃんと届いたね。ありがとう、レン。夜明けまで、まだ少し時間がある。',action:'依頼を完了する' },
] as const;

/** Short confirm line shown after the binary network choice, before advancing. */
export const CHOICE_CONFIRM: Record<EndingChoice, string> = {
  routes: '航路だけ戻す——監視は残る',
  free: '監視網を切る——島は自分たちで守る',
};

/** Mission-log CHAPTER record for the network decision (re-readable). */
export const CHOICE_LOG: Record<EndingChoice, string> = {
  routes: '記録：航路のみ復旧。監視網は残した。',
  free: '記録：監視網を切り離した。航路は島のものに。',
};

export type HomecomingCopy = { text: string; chip: string; bond: string };
/** Nagi homecoming branches: dialogue + one result chip + relationship one-liner. */
export const HOMECOMING: Record<EndingChoice, HomecomingCopy> = {
  free: {
    text: '見て、帰港灯が戻った。監視の赤い目も消えてる。これからは、うちらで航路を守る番だね。今日の配達、ちゃんと届いた。ありがとう、レン。夜明けまで、まだ少し時間がある。',
    chip: '帰港灯再点灯',
    bond: 'ナギ——港の灯りを、一緒に守ろう',
  },
  routes: {
    text: '見て、帰港灯が戻った。沖の船も動き出してる。でも監視の網は、まだ港に残ってる。……航路は戻った。それで、今日は十分だ。ありがとう、レン。',
    chip: '監視網は残った',
    bond: 'ナギ——航路は戻った。でも監視の影は残る',
  },
};

export function choiceConfirmLine(choice: EndingChoice): string {
  return CHOICE_CONFIRM[choice];
}

export function dialogueBody(stage: number, choice: EndingChoice | null): string {
  const m = MISSIONS[stage];
  if (!m) return '';
  if (m.event === 'home' && choice) return HOMECOMING[choice].text;
  return m.text;
}

export function homecomingChip(choice: EndingChoice | null): string | null {
  return choice ? HOMECOMING[choice].chip : null;
}

export function homecomingBond(choice: EndingChoice | null): string | null {
  return choice ? HOMECOMING[choice].bond : null;
}

/** CHAPTER body for mission log — records the network choice once made. */
export function chapterStatusLine(index: number, stage: number, choice: EndingChoice | null): string {
  const m = MISSIONS[index];
  if (!m) return '—';
  if (index > stage) return '—';
  if (index === stage) return m.task;
  // completed
  if (m.event === 'network' && choice) return CHOICE_LOG[choice];
  if (m.event === 'home' && choice) return `完了 · ${HOMECOMING[choice].chip}`;
  return '完了';
}

export const freshCampaign = (): CampaignProgress => ({version:1,stage:0,choice:null});
export function advanceCampaign(state:CampaignProgress,event:MissionEvent,choice?:EndingChoice):CampaignProgress {
  if(state.stage>=MISSIONS.length||MISSIONS[state.stage].event!==event)return state;
  if(event==='network'&&!choice)return state;
  return {...state,stage:state.stage+1,choice:event==='network'?choice!:state.choice};
}
export function parseCampaign(raw:string|null):CampaignProgress|null {
  if(!raw)return null;
  try{const value=JSON.parse(raw);if(value?.version!==1||!Number.isInteger(value.stage)||value.stage<0||value.stage>6)return null;if(value.choice!==null&&value.choice!=='free'&&value.choice!=='routes')return null;if((value.stage<5&&value.choice!==null)||(value.stage>=5&&value.choice===null))return null;return{version:1,stage:value.stage,choice:value.choice};}catch{return null;}
}
export function inMissionRange(stage:number,x:number,z:number,y:number,terrainHeight:number){const m=MISSIONS[stage];return Boolean(m)&&Math.hypot(m.x-x,m.z-z)<(m.kind==='combat'?42:7.5)&&Math.abs(y-terrainHeight-1.75)<3;}
export type RayObstacle={x:number;z:number;w:number;d:number;bottom:number;top:number};
export function rayBoxDistance(origin:{x:number;y:number;z:number},direction:{x:number;y:number;z:number},box:RayObstacle):number{
  let near=0,far=Infinity;
  for(const [o,v,lo,hi] of [[origin.x,direction.x,box.x-box.w/2,box.x+box.w/2],[origin.y,direction.y,box.bottom,box.top],[origin.z,direction.z,box.z-box.d/2,box.z+box.d/2]]){if(Math.abs(v)<1e-8){if(o<lo||o>hi)return Infinity;continue;}const a=(lo-o)/v,b=(hi-o)/v;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return Infinity;}
  return far<0?Infinity:near;
}
