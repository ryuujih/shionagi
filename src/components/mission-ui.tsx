import { Crosshair, Radio, Shield, X, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { MISSIONS, type EndingChoice } from '../campaign.ts';
import type { StorySnapshot } from '../story-world.ts';

type Props={story:StorySnapshot;x:number;z:number;heading:number;active:boolean;onFoot:boolean;open:boolean;onOpen:()=>void;onClose:()=>void;onTravel:()=>void;onAction:()=>void;onConfirm:(choice?:EndingChoice)=>void;onRetry:()=>void;onFire:()=>void;onReload:()=>void;onLock:()=>void};
export function MissionUI(p:Props){
  const s=p.story;if(!s.enabled)return null;const mission=MISSIONS[s.stage];
  const distance=mission?Math.round(Math.hypot(mission.x-p.x,mission.z-p.z)):0;
  const bearing=mission?Math.atan2(mission.x-p.x,-(mission.z-p.z))+p.heading:0;
  return <>
    {mission&&<div className="pointer-events-none absolute left-1/2 top-[4.5rem] z-20 flex w-[min(90vw,420px)] -translate-x-1/2 items-center gap-3 rounded-md border border-amber-200/40 bg-[#101f31]/95 px-3 py-2 text-xs shadow-lg">
      <span aria-hidden="true" className="text-2xl text-amber-200" style={{transform:`rotate(${bearing}rad)`}}>↑</span>
      <div className="min-w-0 flex-1"><p className="font-semibold text-amber-100">{mission.title}</p><p className="truncate text-[10px] text-white/80">{mission.task}</p></div>
      <span className="shrink-0 font-mono text-teal-200">{distance} m</span>
    </div>}
    {p.active&&p.onFoot&&<>
      {s.feedback&&<div aria-hidden="true" className={`combat-flash combat-flash-${s.feedback} pointer-events-none absolute inset-0 z-10`}/>}
      <div aria-hidden="true" className={`combat-reticle ${s.locked?'is-locked':''} feedback-${s.feedback??'none'} pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"><i/><i/><i/><i/>{s.feedback==='emp'&&<span>×</span>}</div>
      {(s.reloading||s.ammo===0)&&<div role="status" className="pointer-events-none absolute left-1/2 top-[56%] z-20 -translate-x-1/2 rounded border border-amber-200/70 bg-slate-950/90 px-4 py-2 text-xs font-bold tracking-widest text-amber-200">{s.reloading?'装填中…':'弾切れ · R 装填'}</div>}
    </>}
    <aside className="absolute right-5 top-28 z-20 w-64 rounded-md border border-amber-100/20 bg-[#101f31]/90 p-4 shadow-sm backdrop-blur-md md:right-10 md:w-72">
      <p className="flex items-center gap-2 font-mono text-[9px] tracking-[.15em] text-amber-200/70"><Radio size={12}/> {mission?`MISSION ${String(s.stage+1).padStart(2,'0')} / 06`:'STORY COMPLETE'}</p>
      <h3 className="mt-2 text-base tracking-wider">{mission?.title??'帰港灯が、戻った。'}</h3>
      <p className="mt-2 text-xs leading-6 text-white/70">{mission?.task??(s.choice==='free'?'島々は、自分たちの手で航路を守りはじめた。':'航路が再開した。監視網の行方は、まだこれからだ。')}</p>
      {mission&&<p className="mt-2 font-mono text-[10px] text-teal-200">{Math.round(Math.hypot(p.x-mission.x,p.z-mission.z))} m {s.stage===3?`· 停止 ${s.kills} / 3`:s.stage===2?'· 中継コア × 1':s.stage===4?'· 制御キー × 1':''}</p>}
      {s.scan>0&&<><progress aria-label="端末処理" value={s.scan} max={1} className="mt-3 h-1.5 w-full accent-teal-200"/><p className="mt-1 text-[10px] text-teal-100">端末処理中… その場で待機</p></>}
      <div className="mt-3 flex gap-2"><Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={p.onOpen}><BookOpen size={12}/>任務ログ L</Button>{s.near&&p.onFoot&&mission&&mission.kind!=='combat'&&p.active&&<Button size="sm" className="h-8 px-3 text-[10px]" onClick={p.onAction}>E {mission.kind==='scan'?'端末操作':'話す'}</Button>}</div>
    </aside>
    {p.active&&p.onFoot&&<div className="absolute bottom-24 right-6 z-20 w-60 rounded-md border border-teal-100/15 bg-[#101f31]/90 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between text-[10px] text-teal-100"><span className="flex items-center gap-2"><Shield size={13}/>スーツ {s.hp} / 100</span><span className={s.reloading||s.ammo===0?'rounded bg-amber-200/20 px-2 py-1 font-bold text-amber-200':''}>{s.reloading?'装填中…':`${s.ammo} / 12`}</span></div>
      <progress aria-label="スーツ耐久値" value={s.hp} max={100} className="mt-2 h-1.5 w-full accent-teal-200"/>
      <p className="mt-2 text-[9px] tracking-wider text-white/50">EMP PULSE · 無限予備弾 / SPACE 回避</p>
      <div className="mt-3 grid grid-cols-3 gap-1"><Button variant="outline" size="sm" onClick={p.onFire} disabled={s.reloading} className="h-8 px-1 text-[10px]">射撃 J</Button><Button variant={s.locked?'default':'outline'} size="sm" onClick={p.onLock} className="h-8 px-1 text-[10px]">ロック Q</Button><Button variant="outline" size="sm" onClick={p.onReload} className="h-8 px-1 text-[10px]">装填 R</Button></div>
    </div>}
    {s.message&&p.active&&!s.dialogue&&<div role="status" className="pointer-events-none absolute bottom-24 left-1/2 z-20 w-[min(80vw,430px)] -translate-x-1/2 rounded-md border border-teal-100/15 bg-[#102435]/95 px-5 py-4 text-xs leading-6 text-teal-50 shadow-sm">{s.message}</div>}
    {p.open&&<div className="absolute inset-0 z-40 flex items-center justify-center bg-[#051321]/75 p-5 backdrop-blur-md"><section className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-md border border-teal-100/20 bg-[#102334] p-7"><div className="flex justify-between"><div><p className="text-[9px] tracking-[.25em] text-teal-200/70">SHIONAGI / CAMPAIGN</p><h2 className="mt-2 text-2xl tracking-widest">帰港灯のない夜</h2></div><Button variant="ghost" size="icon" onClick={p.onClose} aria-label="任務ログを閉じる"><X size={18}/></Button></div><p className="mt-4 text-xs leading-6 text-white/60">2089年、汐凪。島々をつなぐ帰港灯が消えた。<br/>配達員レンは、街の人々の声と小さなコアを運ぶ。</p><ol className="mt-5 space-y-2">{MISSIONS.map((m,i)=><li key={m.event} className={`rounded-md border px-4 py-3 ${i===s.stage?'border-teal-200/50 bg-teal-200/10':'border-white/10'}`}><p className="text-xs">{i<s.stage?'✓':`${i+1}.`} {m.title}<span className="float-right text-[10px] text-teal-200/70">{i<s.stage?'完了':i===s.stage?'進行中':'未開始'}</span></p>{i===s.stage&&<p className="mt-1 text-[10px] leading-5 text-white/60">{m.task}</p>}</li>)}</ol><p className="mt-4 text-[10px] leading-6 text-white/45">{s.saveAvailable?'ミッション完了時に自動保存。再読み込み後はタイトルの「物語をプレイ」から再開できます。':'このブラウザでは保存できません。進行は今回のプレイ中のみ保持します。'}<br/>クリック / J 射撃 · Q ロックオン · R 装填 · SPACE 回避</p>{mission&&<Button className="mt-5 w-full" onClick={p.onTravel}>目的地へ移動して再開 <ArrowRight size={15}/></Button>}<Button variant="ghost" className="mt-2 w-full" onClick={p.onClose}>現在地からつづける</Button></section></div>}
    {s.dialogue&&mission&&<div className="absolute inset-0 z-50 flex items-end justify-center bg-[#071520]/40 p-5 pb-12 backdrop-blur-[2px]"><section role="dialog" aria-label="シナリオ会話" aria-modal="true" className="w-full max-w-2xl rounded-md border border-teal-100/25 bg-[#102435]/95 p-7 shadow-xl"><p className="flex items-center gap-2 text-[10px] tracking-widest text-teal-200"><Radio size={14}/>{mission.speaker}</p><h2 className="mt-3 text-xl tracking-wider">{mission.title}</h2><p className="mt-4 text-sm leading-8 text-white/85">{mission.text}</p>{mission.kind==='choice'?<div className="mt-6 grid gap-3 sm:grid-cols-2"><Button onClick={()=>p.onConfirm('free')}>監視網を切り離す</Button><Button variant="outline" onClick={()=>p.onConfirm('routes')}>航路だけ復旧する</Button></div>:<Button className="mt-6 w-full" onClick={()=>p.onConfirm()}>{mission.action}<ArrowRight size={16}/></Button>}</section></div>}
    {s.down&&<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#170c23]/85 p-6 backdrop-blur-md"><section className="w-full max-w-sm rounded-md border border-rose-200/25 bg-[#211c30] p-8 text-center"><Crosshair className="mx-auto text-rose-200" size={28}/><h2 className="mt.4 text-2xl tracking-widest">通信途絶</h2><p className="mt-4 text-xs leading-7 text-white/60">レンのスーツが緊急停止しました。<br/>現在のミッションから再挑戦できます。</p><Button className="mt-6 w-full" onClick={p.onRetry}><RotateCcw size={15}/>チェックポイントから再挑戦</Button></section></div>}
  </>;
}
