(()=>{
'use strict';
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const all=team=>team?[team.lead,...(team.bench||[])].filter(Boolean):[];
const ownSide=side=>(isHost||isSpectator)?side==='p1':side==='p2';
const foeSide=side=>side==='p1'?'p2':'p1';
function statEvent(side,stat,amount,msg){return {type:amount>0?'buff':'debuff',side,stat,amount,msg};}
function applyStage(mon,stat,amount){
 if(!mon)return 0;if(!mon.stages)mon.stages={atk:0,def:0,spa:0,spd:0,spe:0,acc:0};
 if(!(stat in mon.stages))mon.stages[stat]=0;
 const before=mon.stages[stat]||0;mon.stages[stat]=Math.max(-6,Math.min(6,before+amount));return mon.stages[stat]-before;
}
function successful(events,side,name){
 const start=events.findIndex(e=>e.type==='move_announce'&&e.side===side&&e.moveName===name);if(start<0)return false;
 const end=events.findIndex((e,i)=>i>start&&e.type==='move_announce');
 return !events.slice(start,end<0?events.length:end).some(e=>(e.type==='msg'&&/빗나갔|실패/.test(e.msg||''))||(e.type==='protect'&&e.side!==side));
}
function resetSwitchState(mon){
 if(!mon)return;mon.stages={atk:0,def:0,spa:0,spd:0,spe:0,acc:0};mon.radarCopyTurns=0;
 mon.radarCopiedStages={atk:0,def:0,spa:0,spd:0,spe:0,acc:0};mon.lastMoveIndex=null;
 mon.protectActive=false;mon.rewindActive=false;mon.yuksu=false;
}
function install(){
 if(window.__mashiroV4||typeof calculateTurnEvents!=='function'||typeof selectMove!=='function'||typeof renderHudBadges!=='function')return setTimeout(install,30);
 window.__mashiroV4=true;
 const oldCalc=window.calculateTurnEvents,oldSelect=window.selectMove,oldBadges=window.renderHudBadges,oldDisplayed=window.getDisplayedAccuracy;
 window.calculateTurnEvents=function(c1,c2,p1,p2,turn,sand){
  const choices=[clone(c1),clone(c2)],before=[clone(p1),clone(p2)];
  before.forEach(t=>all(t).forEach(m=>{if(typeof m.yuksu!=='boolean')m.yuksu=false;}));
  for(let i=0;i<2;i++){
   const actor=before[i].lead,target=before[1-i].lead,choice=choices[i];
   if(choice.type!=='move'||!actor||!target)continue;
   const move=actor.moves?.[choice.moveIndex];if(!move)continue;
   if(target.id==='mashiro'&&actor.yuksu)move.acc=.9;
   if(move.ignoreBarrier){move.ignoreBarrier=true;target.reflectTurns=target.reflectTurns||0;}
  }
  const events=oldCalc(choices[0],choices[1],before[0],before[1],turn,sand);
  const syncIndex=events.findIndex(e=>e.type==='sync_teams');if(syncIndex<0)return events;
  const sync=events[syncIndex],out=[sync.p1,sync.p2];
  for(let i=0;i<2;i++){
   const side=i?'p2':'p1',other=foeSide(side),choice=choices[i],used=before[i].lead.moves?.[choice.moveIndex];
   if(choice.type!=='move'||!used?.gravityShield||!successful(events,side,used.name))continue;
   const block=events.findIndex(e=>e.type==='protect'&&e.side===side&&/막아냈다/.test(e.msg||''));
   if(block<0)continue;
   const attacker=out[1-i].lead;if(!attacker||attacker.fainted)continue;
   attacker.yuksu=true;
   for(let j=events.length-1;j>=0;j--){
    if(events[j].type==='heal'&&events[j].side===side&&/중력방패/.test(events[j].msg||''))events.splice(j,1);
    else if(events[j].status==='yuksu'&&events[j].side===other)events.splice(j,1);
   }
   events.splice(block+1,0,{type:'debuff',side:other,status:'yuksu',msg:`🥣 [중력방패] ${attacker.name}이(가) 육수 상태가 됐다! 네네코 마시로를 공격할 때 명중률은 0.9%다.`});
  }
  for(let i=0;i<2;i++){
   const side=i?'p2':'p1',choice=choices[i],used=before[i].lead.moves?.[choice.moveIndex];
   if(choice.type!=='move'||!used?.phaseShift||!successful(events,side,used.name))continue;
   const team=out[i];
   const autoEventIndex=events.findIndex(e=>e.type==='switch'&&e.side===side&&/\[위상전이\]/.test(e.msg||''));
   if(team.lead?.id!=='mashiro'){
    const mashiroBench=team.bench.findIndex(m=>m?.id==='mashiro');
    if(mashiroBench>=0){const autoLead=team.lead;team.lead=team.bench[mashiroBench];team.bench[mashiroBench]=autoLead;}
   }
   if(autoEventIndex>=0)events.splice(autoEventIndex,1);
   const old=team.lead;if(!old||old.id!=='mashiro'||old.fainted)continue;
   let idx=Number(choice.phaseShiftBenchIndex);if(![0,1].includes(idx)||!team.bench[idx]||team.bench[idx].fainted)idx=team.bench.findIndex(m=>m&&!m.fainted);
   if(idx<0)continue;const next=team.bench[idx];resetSwitchState(old);resetSwitchState(next);team.lead=next;team.bench[idx]=old;
   const finalSyncIndex=events.indexOf(sync);
   events.splice(finalSyncIndex<0?events.length:finalSyncIndex,0,{type:'switch',side,benchIndex:idx,phaseShift:true,newLeadId:next.id,newBenchId:old.id,msg:`✨ [위상전이] ${old.name}이(가) 위상을 바꾸고 ${next.name}에게 자리를 넘겼다!`});
   if(next.ability==='위협'){
    const target=out[1-i].lead;
    if(target.ability==='엄마없음')events.splice(events.indexOf(sync),0,{type:'msg',msg:`${target.name}의 특성 [엄마없음]! 공격력이 떨어지지 않는다!`});
    else {const d=applyStage(target,'atk',-1);if(d)events.splice(events.indexOf(sync),0,statEvent(foeSide(side),'atk',d,`${next.name}의 [위협]! ${target.name}의 공격력이 떨어졌다!`));}
   }
  }
  sync.p1=out[0];sync.p2=out[1];
  return events;
 };
 function showPhaseTargets(moveIdx){
  const alive=myTeam.bench.map((mon,index)=>({mon,index})).filter(x=>x.mon&&!x.mon.fainted);if(!alive.length)return oldSelect(moveIdx);
  document.getElementById('menu-moves').style.display='none';const menu=document.getElementById('menu-pokemon');menu.style.display='grid';
  let html='<div style="grid-column:span 2;font-size:11px;font-weight:bold;color:#c4b5fd;margin-bottom:2px;">✨ 위상전이 직후 교체할 챔피언 선택:</div>';
  for(const {mon,index} of alive)html+=`<button data-phase-target="${index}" class="sub-btn" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;margin-bottom:4px;"><span style="color:${mon.color};font-weight:bold;">${mon.name} [${mon.type}]</span><span style="color:#22c55e;font-size:10px;">${Math.ceil(mon.hp/mon.maxHp*100)}% HP</span></button>`;
  html+='<button data-phase-back class="sub-btn" style="grid-column:span 2;background:#334155;margin-top:2px;">기술 선택으로 돌아가기</button>';menu.innerHTML=html;
  menu.querySelectorAll('[data-phase-target]').forEach(btn=>btn.onclick=()=>{const idx=Number(btn.dataset.phaseTarget),target=myTeam.bench[idx];if(!target||target.fainted)return;SFX.click();menu.style.display='none';submitTurnChoice({type:'move',moveIndex:moveIdx,phaseShiftBenchIndex:idx});});
  menu.querySelector('[data-phase-back]').onclick=()=>{menu.style.display='none';openMoveMenu();};
 }
 window.selectMove=function(moveIdx){const move=myTeam?.lead?.moves?.[moveIdx];if(move?.phaseShift&&myTeam.bench.some(m=>m&&!m.fainted)){SFX.click();clearBoingoTimer();showPhaseTargets(moveIdx);return;}return oldSelect(moveIdx);};
 window.getDisplayedAccuracy=function(mon,move,foe){if(foe?.id==='mashiro'&&mon?.yuksu)return .9;return typeof oldDisplayed==='function'?oldDisplayed(mon,move,foe):(move?.acc??100);};
 window.renderHudBadges=function(id,mon){oldBadges(id,mon);if(!mon?.yuksu)return;const box=document.getElementById(id);if(!box||[...box.children].some(x=>x.dataset?.yuksu))return;const b=document.createElement('span');b.className='mini-badge debuff';b.dataset.yuksu='1';b.textContent='🥣 육수 · 對마시로 명중 0.9%';box.appendChild(b);};
 const oldPlay=window.playTurnEvents;
 window.playTurnEvents=async function(events){
  if(!Array.isArray(events))return oldPlay(events);
  const pending=new Map();
  for(const ev of events){if(!['buff','debuff'].includes(ev.type)||(!ev.stat&&!ev.changes))continue;const key=String(ev.msg||'');if(!pending.has(key))pending.set(key,[]);pending.get(key).push(ev);}
  const oldSet=window.setBattleMsg;
  window.setBattleMsg=function(message){
   const list=pending.get(String(message));const ev=list?.shift();
   if(ev){
    const mon=ownSide(ev.side)?myTeam?.lead:enemyTeam?.lead;
    if(mon){
     let changes=Array.isArray(ev.changes)?ev.changes:(ev.stat?[{stat:ev.stat,amount:ev.amount}]:[]);
     if(/공\/스피드/.test(ev.msg||''))changes=[{stat:'atk',amount:ev.amount},{stat:'spe',amount:ev.amount}];
     else if(/특수공격과 스피드/.test(ev.msg||''))changes=[{stat:'spa',amount:ev.amount},{stat:'spe',amount:ev.amount}];
     else if(/방어\/특수방어/.test(ev.msg||''))changes=[{stat:'def',amount:ev.amount},{stat:'spd',amount:ev.amount}];
     for(const change of changes)applyStage(mon,change.stat,Number(change.amount||0));
     if(typeof renderBattleField==='function')renderBattleField();
    }
   }
   return oldSet(message);
  };
  try{return await oldPlay(events);}finally{window.setBattleMsg=oldSet;}
 };
}
install();
})();
