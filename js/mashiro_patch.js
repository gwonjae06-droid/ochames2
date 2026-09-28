(()=>{
'use strict';
const LABELS={atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드',acc:'명중'};
const CELESTIALS=[
 {id:'planet',name:'거대 행성',desc:'행성 대포 위력 1.35배'},
 {id:'comet',name:'혜성',desc:'스피드 +1랭크'},
 {id:'nebula',name:'성운',desc:'특수방어 +1랭크'},
 {id:'black_hole',name:'블랙홀',desc:'상대의 최종 명중률 0.9배'},
 {id:'supernova',name:'초신성',desc:'이번 턴 공격 피해 1.25배'}
];
const blank=()=>({atk:0,def:0,spa:0,spd:0,spe:0,acc:0});
function ready(){return typeof window.buildMon==='function'&&typeof window.calculateTurnEvents==='function'&&typeof window.triggerSwitchInAbilities==='function'&&typeof window.renderHudBadges==='function';}
function ensure(mon){
 if(!mon)return mon;mon.stages={...blank(),...(mon.stages||{})};
 if(!mon.radarCopiedStages)mon.radarCopiedStages=blank();
 if(!Number.isFinite(mon.radarCopyTurns))mon.radarCopyTurns=0;
 if(!Number.isFinite(mon.blackHoleAccuracyMult))mon.blackHoleAccuracyMult=1;
 if(!Number.isFinite(mon.blackHoleAccuracyTurns))mon.blackHoleAccuracyTurns=0;
 if(!Number.isFinite(mon.celestialAttackMult))mon.celestialAttackMult=1;
 if(!Number.isFinite(mon.celestialCannonMult))mon.celestialCannonMult=1;
 return mon;
}
function all(team){return team?[team.lead,...(team.bench||[])].filter(Boolean):[];}
function accMult(mon){const s=Math.max(-6,Math.min(6,ensure(mon).stages.acc||0));return s>=0?(3+s)/3:3/(3-s);}
function radar(mon,foe){
 ensure(mon);ensure(foe);const copied=blank();
 for(const stat of Object.keys(copied)){const value=Math.max(0,foe.stages[stat]||0);copied[stat]=Math.max(0,Math.min(value,6-(mon.stages[stat]||0)));mon.stages[stat]+=copied[stat];}
 mon.radarCopiedStages=copied;mon.radarCopyTurns=2;
 const text=Object.entries(copied).filter(([,v])=>v).map(([k,v])=>`${LABELS[k]} +${v}`).join(', ');
 return text?`🐾 [고양이 레이더] 상대 강화 복사! (${text}, 2턴)`:'🐾 [고양이 레이더] 복사할 상대 강화가 없다.';
}
function success(events,side,name){
 const start=events.findIndex(e=>e.type==='move_announce'&&e.side===side&&e.moveName===name);if(start<0)return false;
 const end=events.findIndex((e,i)=>i>start&&e.type==='move_announce');
 return !events.slice(start,end<0?events.length:end).some(e=>(e.type==='msg'&&/빗나갔|실패/.test(e.msg||''))||(e.type==='protect'&&e.side!==side));
}
function install(){
 if(window.__mashiroPatch||!ready())return;window.__mashiroPatch=true;
 const oldBuild=window.buildMon,oldCalc=window.calculateTurnEvents,oldSwitch=window.triggerSwitchInAbilities,oldBadges=window.renderHudBadges;
 window.getAccuracyMultiplier=accMult;
 window.buildMon=function(...args){return ensure(oldBuild(...args));};
 window.triggerSwitchInAbilities=function(mon,foe){oldSwitch(mon,foe);ensure(mon);ensure(foe);if(mon.ability==='고양이 레이더'){const msg=radar(mon,foe);setTimeout(()=>{if(window.battleActive)window.setBattleMsg(msg);},720);}};
 window.calculateTurnEvents=function(c1,c2,p1,p2,turn,sand){
  const a=structuredClone(p1),b=structuredClone(p2),choices=[structuredClone(c1),structuredClone(c2)],teams=[a,b],intro=[];
  for(const t of teams)for(const m of all(t)){ensure(m);m.blackHoleAccuracyMult=1;m.blackHoleAccuracyTurns=0;}
  teams.forEach((team,i)=>{
   const mon=ensure(team.lead),foe=ensure(teams[1-i].lead);if(mon.id!=='mashiro'||mon.fainted)return;
   const celestial=CELESTIALS[Math.floor(Math.random()*CELESTIALS.length)];mon.celestial=celestial.id;mon.celestialAttackMult=celestial.id==='supernova'?1.25:1;mon.celestialCannonMult=celestial.id==='planet'?1.35:1;
   if(celestial.id==='comet')mon.stages.spe=Math.min(6,mon.stages.spe+1);
   if(celestial.id==='nebula')mon.stages.spd=Math.min(6,mon.stages.spd+1);
   if(celestial.id==='black_hole'){foe.blackHoleAccuracyMult=.9;foe.blackHoleAccuracyTurns=1;}
   intro.push({type:'msg',msg:`🌌 [천체 탐색] ${mon.name}이(가) ${celestial.name}을(를) 발견했다! ${celestial.desc}`});
  });
  teams.forEach((team,i)=>{const mon=ensure(team.lead),choice=choices[i];if(choice.type!=='move')return;const move=mon.moves[choice.moveIndex];if(!move)return;move.acc=Math.max(0,Math.min(100,move.acc*accMult(mon)*(mon.blackHoleAccuracyMult||1)));if(mon.id==='mashiro'&&move.pwr>0)move.pwr*=mon.celestialAttackMult*(move.planetCannon?mon.celestialCannonMult:1);});
  const events=oldCalc(choices[0],choices[1],a,b,turn,sand),sync=events.find(e=>e.type==='sync_teams');if(!sync)return intro.concat(events);
  events.splice(events.indexOf(sync),1);const out=[sync.p1,sync.p2];out.forEach(t=>all(t).forEach(ensure));
  teams.forEach((before,i)=>{const side=i?'p2':'p1',other=i?'p1':'p2',choice=choices[i],used=before.lead.moves[choice.moveIndex],me=out[i].lead,foe=out[1-i].lead;if(choice.type!=='move'||!used)return;
   if(used.dropEnemySpd&&success(events,side,used.name)){if(foe.ability==='엄마없음')events.push({type:'msg',msg:`${foe.name}의 특성 [엄마없음]! 특수방어가 떨어지지 않는다!`});else{foe.stages.spd=Math.max(-6,foe.stages.spd-used.dropEnemySpd);events.push({type:'debuff',side:other,stat:'spd',amount:-used.dropEnemySpd,msg:`${foe.name}의 특수방어가 1랭크 떨어졌다!`});}}
   if(used.dropEnemyAcc&&success(events,side,used.name)){if(foe.ability==='엄마없음')events.push({type:'msg',msg:`${foe.name}의 특성 [엄마없음]! 명중이 떨어지지 않는다!`});else{foe.stages.acc=Math.max(-6,foe.stages.acc-used.dropEnemyAcc);events.push({type:'debuff',side:other,stat:'acc',amount:-used.dropEnemyAcc,msg:`${foe.name}의 명중이 1랭크 떨어졌다!`});}}
   if(used.gravityShield&&success(events,side,used.name)){const heal=Math.min(me.maxHp-me.hp,Math.max(1,Math.floor(me.maxHp*.08)));if(heal>0){me.hp+=heal;events.push({type:'heal',side,heal,hp:me.hp,msg:`🪐 [중력방패] 중력을 흡수해 체력을 ${heal} 회복했다!`});}}
   if(used.haze&&success(events,side,used.name)){me.stages.acc=0;foe.stages.acc=0;}
  });
  teams.forEach((before,i)=>{const foe=out[1-i].lead,now=out[i];if(now.lead.id!==before.lead.id){now.lead.stages={...blank(),...now.lead.stages,acc:0};if(now.lead.ability==='고양이 레이더')events.push({type:'msg',msg:radar(now.lead,foe)});}});
  teams.forEach((before,i)=>{const side=i?'p2':'p1',choice=choices[i],move=before.lead.moves[choice.moveIndex],team=out[i];if(choice.type!=='move'||!move||!move.phaseShift||!success(events,side,move.name)||team.lead.id!=='mashiro'||team.lead.fainted)return;const idx=team.bench.findIndex(m=>m&&!m.fainted);if(idx<0)return;const old=team.lead,next=team.bench[idx];old.stages=blank();old.radarCopyTurns=0;old.radarCopiedStages=blank();next.stages={...blank(),...next.stages,acc:0};team.lead=next;team.bench[idx]=old;events.push({type:'switch',side,benchIndex:idx,newLeadId:next.id,newBenchId:old.id,msg:`✨ [위상전이] ${old.name}이(가) 위상을 바꾸고 ${next.name}에게 자리를 넘겼다!`});if(next.ability==='고양이 레이더')events.push({type:'msg',msg:radar(next,out[1-i].lead)});});
  out.forEach((team,i)=>all(team).forEach(mon=>{if(mon.radarCopyTurns>0){mon.radarCopyTurns--;if(mon.radarCopyTurns===0){for(const stat of Object.keys(blank()))mon.stages[stat]=Math.max(-6,(mon.stages[stat]||0)-Math.min(mon.radarCopiedStages[stat]||0,Math.max(0,mon.stages[stat]||0)));mon.radarCopiedStages=blank();events.push({type:'msg',msg:`🐾 ${mon.name}의 고양이 레이더 복사 효과가 끝났다.`});}}}));
  events.push(sync);return intro.concat(events);
 };
 window.renderHudBadges=function(id,mon){ensure(mon);oldBadges(id,mon);const box=document.getElementById(id);if(!box)return;const add=(text,cls)=>{const b=document.createElement('span');b.className=`mini-badge ${cls}`;b.textContent=text;box.appendChild(b);};if(mon.stages.acc)add(`명중${mon.stages.acc>0?'+':''}${mon.stages.acc}`,mon.stages.acc>0?'buff':'debuff');if(mon.radarCopyTurns>0)add(`🐾 레이더 ${mon.radarCopyTurns}T`,'buff');if(mon.celestial)add(`🌌 ${mon.celestial}`,'shield');if((mon.blackHoleAccuracyMult||1)<1)add('🕳️ 최종명중×0.9','debuff');};
}
(function wait(){if(ready())install();else setTimeout(wait,25);})();
})();
