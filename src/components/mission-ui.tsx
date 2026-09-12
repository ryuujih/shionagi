import { useEffect, useState } from 'react';
import { Crosshair, Shield, X, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import {
  MISSIONS,
  choiceConfirmLine,
  chapterStatusLine,
  dialogueBody,
  homecomingBond,
  homecomingChip,
  type EndingChoice,
  type PortraitId,
} from '../campaign.ts';
import type { StorySnapshot } from '../story-world.ts';

function FacePanel({id,name}:{id:PortraitId;name:string}){
  const tone=id==='mio'?'from-[#1a3a40] to-[#2b494b]':id==='terminal'?'from-[#0c252e] to-[#1a3a40]':id==='nagi-radio'?'from-[#2b494b] to-[#1a3a40]':'from-[#3a3830] to-[#b88353]';
  const accent=id==='mio'?'#8dffee':id==='terminal'?'#f5ca7f':'#c99568';
  return <div aria-hidden="true" className={`portrait-panel relative h-28 w-24 shrink-0 overflow-hidden rounded-sm border border-teal-100/25 bg-gradient-to-b ${tone}`}>
    <div className="absolute inset-x-3 top-4 mx-auto h-10 w-10 rounded-full" style={{background:id==='terminal'?'#5d7470':'#c7a58a'}}/>
    {id!=='terminal'&&<div className="absolute inset-x-2 top-14 mx-auto h-16 w-14 rounded-t-md" style={{background:id==='mio'?'#3a5560':'#c99568'}}/>}
    {id==='terminal'&&<div className="absolute inset-x-3 top-16 h-8 rounded-sm" style={{background:accent,opacity:.85}}/>}
    <div className="absolute bottom-1 left-1 right-1 truncate text-center font-mono text-[8px] tracking-wider text-white/70">{name}</div>
    <div className="absolute left-0 top-0 h-full w-0.5" style={{background:accent}}/>
  </div>;
}

type Props={story:StorySnapshot;x:number;z:number;heading:number;active:boolean;onFoot:boolean;open:boolean;onOpen:()=>void;onClose:()=>void;onTravel:()=>void;onAction:()=>void;onConfirm:(choice?:EndingChoice)=>void;onRetry:()=>void;onFire:()=>void;onReload:()=>void;onLock:()=>void};
export function MissionUI(p:Props){
  const s=p.story;if(!s.enabled)return null;const mission=MISSIONS[s.stage];
  const distance=mission?Math.round(Math.hypot(mission.x-p.x,mission.z-p.z)):0;
  const bearing=mission?Math.atan2(mission.x-p.x,-(mission.z-p.z))+p.heading:0;
  // Density follows published combatMode (same gate as EMP/camera) — not a parallel stage check.
  const combat=s.combatMode;
  const talking=s.dialogue;
  const dim=talking?'opacity-25 pointer-events-none':'';
  const [pendingChoice,setPendingChoice]=useState<EndingChoice|null>(null);

  // Clear pending confirm when leaving dialogue / changing stage
  useEffect(()=>{if(!talking||!mission||mission.kind!=='choice')setPendingChoice(null);},[talking,mission,s.stage]);

  const body=mission?dialogueBody(s.stage,s.choice):'';
  const bond=mission?.event==='home'?homecomingBond(s.choice):null;
  const chip=mission?.event==='home'?homecomingChip(s.choice):null;

  return <>
    {/* Explore chip — always on when mission active; PR#1 heading/distance wiring kept */}
    {mission&&!s.down&&<div className={`pointer-events-none absolute left-1/2 top-[4.5rem] z-20 flex w-[min(88vw,360px)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-amber-200/35 bg-[#0c252e]/88 px-3 py-1.5 text-xs shadow-md backdrop-blur-sm ${dim}`}>
      <span aria-hidden="true" className="text-lg leading-none text-amber-200" style={{transform:`rotate(${bearing}rad)`}}>↑</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium tracking-wide text-amber-50">{mission.task}</p></div>
      <span className="shrink-0 font-mono text-[10px] text-teal-200/90">{distance}m</span>
    </div>}

    {/* Tiny explore crosshair vs denser combat reticle — feedback wiring preserved */}
    {p.active&&p.onFoot&&!talking&&!s.down&&<>
      {s.feedback&&<div aria-hidden="true" className={`combat-flash combat-flash-${s.feedback} pointer-events-none absolute inset-0 z-10`}/>}
      {combat
        ? <div aria-hidden="true" className={`combat-reticle is-combat ${s.locked?'is-locked':''} feedback-${s.feedback??'none'} pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2`}><i/><i/><i/><i/>{s.feedback==='emp'&&<span>×</span>}</div>
        : <div aria-hidden="true" className="explore-crosshair pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"/>}
      {combat&&(s.reloading||s.ammo===0)&&<div role="status" className="pointer-events-none absolute left-1/2 top-[56%] z-20 -translate-x-1/2 rounded border border-amber-200/70 bg-slate-950/90 px-4 py-2 text-xs font-bold tracking-widest text-amber-200">{s.reloading?'装填中…':'弾切れ · R 装填'}</div>}
    </>}

    {/* Explore: no dense aside — only a ghost log trigger when near/action needed */}
    {!talking&&!s.down&&<div className={`absolute right-5 top-28 z-20 md:right-10 ${dim}`}>
      {s.scan>0&&<div className="mb-2 w-52 rounded-md border border-teal-100/20 bg-[#0c252e]/90 px-3 py-2 backdrop-blur-sm"><progress aria-label="端末処理" value={s.scan} max={1} className="h-1.5 w-full accent-teal-200"/><p className="mt-1 text-[10px] text-teal-100">端末処理中…</p></div>}
      <div className="flex flex-col items-end gap-1.5">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-white/55 hover:text-white" onClick={p.onOpen}><BookOpen size={12}/>ログ L</Button>
        {s.near&&p.onFoot&&mission&&mission.kind!=='combat'&&p.active&&<Button size="sm" className="h-8 px-3 text-[10px]" onClick={p.onAction}>E {mission.kind==='scan'?'端末操作':'話す'}</Button>}
        {combat&&mission&&<p className="rounded bg-[#0c252e]/80 px-2 py-1 font-mono text-[10px] text-teal-200">停止 {s.kills} / 3</p>}
      </div>
    </div>}

    {/* Combat densifies suit/ammo — does not block explore chip */}
    {combat&&<div className="absolute bottom-24 right-6 z-20 w-56 rounded-md border border-teal-100/20 bg-[#0c252e]/92 p-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between text-[10px] text-teal-100"><span className="flex items-center gap-1.5"><Shield size={12}/>スーツ {s.hp}</span><span className={s.reloading||s.ammo===0?'rounded bg-amber-200/20 px-1.5 py-0.5 font-bold text-amber-200':''}>{s.reloading?'装填…':`${s.ammo}/12`}</span></div>
      <progress aria-label="スーツ耐久値" value={s.hp} max={100} className="mt-1.5 h-1.5 w-full accent-teal-200"/>
      <div className="mt-2.5 grid grid-cols-3 gap-1"><Button variant="outline" size="sm" onClick={p.onFire} disabled={s.reloading} className="h-7 px-1 text-[9px]">射撃</Button><Button variant={s.locked?'default':'outline'} size="sm" onClick={p.onLock} className="h-7 px-1 text-[9px]">ロック</Button><Button variant="outline" size="sm" onClick={p.onReload} className="h-7 px-1 text-[9px]">装填</Button></div>
    </div>}

    {s.message&&p.active&&!talking&&<div role="status" className="pointer-events-none absolute bottom-24 left-1/2 z-20 w-[min(80vw,400px)] -translate-x-1/2 rounded-md border border-teal-100/15 bg-[#0c252e]/92 px-4 py-3 text-xs leading-6 text-teal-50/90 shadow-sm">{s.message}</div>}

    {/* Mission log — book tone: chapters + whitespace; records network choice */}
    {p.open&&<div className="absolute inset-0 z-40 flex items-center justify-center bg-[#051321]/80 p-5 backdrop-blur-md">
      <section className="mission-book max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-sm border border-[#c99568]/25 bg-[#102435] px-8 py-10 shadow-xl sm:px-12">
        <div className="flex justify-between gap-4">
          <div>
            <p className="font-serif text-[10px] tracking-[.35em] text-[#c99568]/80">CHAPTER · SHIONAGI</p>
            <h2 className="mt-4 font-serif text-2xl tracking-[.12em] text-[#eef3e9]">帰港灯のない夜</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={p.onClose} aria-label="任務ログを閉じる"><X size={18}/></Button>
        </div>
        <p className="mt-8 max-w-sm text-xs leading-7 text-white/55">2089年、汐凪。<br/>島々をつなぐ帰港灯が消えた。<br/>配達員レンは、街の人々の声と小さなコアを運ぶ。</p>
        <div className="mt-10 space-y-8 border-t border-[#c99568]/20 pt-8">
          {MISSIONS.map((m,i)=><article key={m.event} className={`${i===s.stage?'':i<s.stage?'opacity-50':'opacity-30'}`}>
            <p className="font-serif text-[9px] tracking-[.28em] text-[#c99568]/70">CHAPTER {String(i+1).padStart(2,'0')}</p>
            <h3 className="mt-2 text-sm tracking-wider text-[#eef3e9]">{m.title}</h3>
            <p className="mt-2 text-[10px] leading-6 text-white/50">{chapterStatusLine(i,s.stage,s.choice)}</p>
          </article>)}
        </div>
        <p className="mt-10 text-[10px] leading-6 text-white/40">{s.saveAvailable?'ミッション完了時に自動保存。':'このブラウザでは保存できません。'}</p>
        {mission&&<Button className="mt-6 w-full" onClick={p.onTravel}>目的地へ移動して再開 <ArrowRight size={15}/></Button>}
        <Button variant="ghost" className="mt-2 w-full" onClick={p.onClose}>現在地からつづける</Button>
      </section>
    </div>}

    {/* Conversation — face + body + choices; other HUD dimmed */}
    {talking&&mission&&<div className="absolute inset-0 z-50 flex items-end justify-center bg-[#071520]/60 p-5 pb-12 backdrop-blur-[2px]">
      <section role="dialog" aria-label="シナリオ会話" aria-modal="true" className="flex w-full max-w-2xl gap-5 rounded-md border border-teal-100/25 bg-[#102435]/96 p-6 shadow-xl sm:p-7">
        <FacePanel id={mission.portrait} name={mission.speaker}/>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[.18em] text-teal-200/80">{mission.roleTitle}</p>
          <h2 className="mt-2 text-xl tracking-wider">{mission.title}</h2>
          {bond&&<p className="mt-1.5 text-[11px] leading-5 tracking-wide text-[#c99568]/90">{bond}</p>}
          {chip&&<p className="mt-2 inline-flex rounded-full border border-amber-200/35 bg-amber-200/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-amber-100">{chip}</p>}
          <p className="mt-3 text-sm leading-8 text-white/85">{body}</p>
          {mission.kind==='choice'
            ? pendingChoice
              ? <div className="mt-5 space-y-3">
                  <p role="status" className="rounded-md border border-teal-100/20 bg-[#0c252e]/70 px-3 py-2.5 text-sm leading-7 tracking-wide text-teal-50">{choiceConfirmLine(pendingChoice)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={()=>setPendingChoice(null)}>選び直す</Button>
                    <Button onClick={()=>{const c=pendingChoice;setPendingChoice(null);p.onConfirm(c);}}>この方針でつづける<ArrowRight size={16}/></Button>
                  </div>
                </div>
              : <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button onClick={()=>setPendingChoice('free')}>監視網を切り離す</Button><Button variant="outline" onClick={()=>setPendingChoice('routes')}>航路だけ復旧する</Button></div>
            : <Button className="mt-5 w-full" onClick={()=>p.onConfirm()}>{mission.action}<ArrowRight size={16}/></Button>}
        </div>
      </section>
    </div>}

    {s.down&&<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#170c23]/85 p-6 backdrop-blur-md"><section className="w-full max-w-sm rounded-md border border-rose-200/25 bg-[#211c30] p-8 text-center"><Crosshair className="mx-auto text-rose-200" size={28}/><h2 className="mt-4 text-2xl tracking-widest">通信途絶</h2><p className="mt-4 text-xs leading-7 text-white/60">レンのスーツが緊急停止しました。<br/>現在のミッションから再挑戦できます。</p><Button className="mt-6 w-full" onClick={p.onRetry}><RotateCcw size={15}/>チェックポイントから再挑戦</Button></section></div>}
  </>;
}
