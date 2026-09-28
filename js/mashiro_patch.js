(()=>{
'use strict';

const STAT_LABELS={atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드',acc:'명중'};
const CELESTIALS=[
 {id:'mercury',icon:'☿',name:'수성',color:'#a8a29e',accent:'#f5f5f4',effect:'태양 가속: 스피드와 명중 +1',discover:{self:{spe:1,acc:1}},move:{name:'수성 궤도탄',type:'바위',pwr:76,acc:100,priority:1,desc:'위력 76 · 바위 · 우선도 +1'}},
 {id:'venus',icon:'♀',name:'금성',color:'#fbbf24',accent:'#fde68a',effect:'산성 대기: 상대 특수공격 -1',discover:{foe:{spa:-1}},move:{name:'비너스 산성포',type:'독',pwr:78,acc:100,poisonChance:.35,desc:'위력 78 · 독 · 35% 확률로 독'}},
 {id:'earth',icon:'🌍',name:'지구',color:'#38bdf8',accent:'#22c55e',effect:'생명의 별: 최대 HP 8% 회복',discover:{heal:.08},move:{name:'가이아 생명포',type:'에스퍼',pwr:74,acc:100,grantReflect:2,desc:'위력 74 · 에스퍼 · 적중 시 2턴 피해 경감 장막'}},
 {id:'mars',icon:'♂',name:'화성',color:'#f97316',accent:'#ef4444',effect:'전쟁의 별: 특수공격 +1',discover:{self:{spa:1}},move:{name:'마르스 화염포',type:'불꽃',pwr:84,acc:100,burnChance:.25,desc:'위력 84 · 불꽃 · 25% 확률로 화상'}},
 {id:'jupiter',icon:'♃',name:'목성',color:'#d6a46b',accent:'#fef3c7',effect:'대적점 폭풍: 특수방어 +1',discover:{self:{spd:1}},move:{name:'주피터 대적점포',type:'바람',pwr:90,acc:100,flinchChance:.2,desc:'위력 90 · 바람 · 20% 확률로 풀죽음'}},
 {id:'saturn',icon:'♄',name:'토성',color:'#fde68a',accent:'#c4b5fd',effect:'고리 방벽: 2턴 피해 경감 장막',discover:{reflect:2},move:{name:'새턴 링 캐논',type:'바위',pwr:80,acc:100,dropEnemySpe:1,desc:'위력 80 · 바위 · 적중 시 상대 스피드 -1'}},
 {id:'uranus',icon:'⛢',name:'천왕성',color:'#67e8f9',accent:'#cffafe',effect:'옆누운 자전: 상대 스피드 -1',discover:{foe:{spe:-1}},move:{name:'우라노스 극축포',type:'바람',pwr:77,acc:100,boostSelfSpd:1,desc:'위력 77 · 바람 · 적중 시 자신의 특수방어 +1'}},
 {id:'neptune',icon:'♆',name:'해왕성',color:'#2563eb',accent:'#93c5fd',effect:'심해 항법: 명중 +1',discover:{self:{acc:1}},move:{name:'넵튠 폭풍포',type:'바람',pwr:82,acc:100,dropEnemyAcc:1,desc:'위력 82 · 바람 · 적중 시 상대 명중 -1'}},
 {id:'planet',icon:'🪐',name:'거대 행성',color:'#f59e0b',accent:'#fb923c',effect:'초중력: 행성포 적중 시 상대 특수방어 -1',discover:{},move:{name:'가스 자이언트 대포',type:'바위',pwr:92,acc:100,dropEnemySpd:1,desc:'위력 92 · 바위 · 적중 시 상대 특수방어 -1'}},
 {id:'comet',icon:'☄️',name:'푸른 혜성',color:'#67e8f9',accent:'#38bdf8',effect:'가속 궤도: 스피드 +1',discover:{self:{spe:1}},move:{name:'코멧 레일건',type:'바람',pwr:74,acc:100,priority:1,desc:'위력 74 · 바람 · 우선도 +1'}},
 {id:'nebula',icon:'🌌',name:'몽환 성운',color:'#d8b4fe',accent:'#a855f7',effect:'성운막: 특수방어 +1',discover:{self:{spd:1}},move:{name:'네뷸라 드림포',type:'에스퍼',pwr:72,acc:100,boostSelfSpa:1,desc:'위력 72 · 에스퍼 · 적중 시 자신의 특수공격 +1'}},
 {id:'black_hole',icon:'◉',name:'블랙홀',color:'#c4b5fd',accent:'#312e81',effect:'사건의 지평선: 상대 최종 명중률 0.9배',discover:{},move:{name:'이벤트 호라이즌',type:'독',pwr:65,acc:100,ignoreBarrier:true,desc:'위력 65 · 독 · 피해 경감 장막 관통'}},
 {id:'supernova',icon:'✹',name:'초신성',color:'#fde68a',accent:'#ef4444',effect:'폭발성: 모든 공격 피해 1.25배',discover:{},move:{name:'슈퍼노바 버스터',type:'불꽃',pwr:104,acc:100,recoil:.15,desc:'위력 104 · 불꽃 · 준 피해의 15% 반동'}}
];
const BY_ID=Object.fromEntries(CELESTIALS.map(c=>[c.id,c]));
const blankStages=()=>({atk:0,def:0,spa:0,spd:0,spe:0,acc:0});
const all=team=>team?[team.lead,...(team.bench||[])].filter(Boolean):[];

window.MASHIRO_CELESTIALS=CELESTIALS;
window.MASHIRO_CELESTIAL_BY_ID=BY_ID;

function ensure(mon){
 if(!mon)return mon;
 mon.stages={...blankStages(),...(mon.stages||{})};
 if(!mon.radarCopiedStages)mon.radarCopiedStages=blankStages();
 if(!Number.isFinite(mon.radarCopyTurns))mon.radarCopyTurns=0;
 if(!Number.isFinite(mon.blackHoleAccuracyMult))mon.blackHoleAccuracyMult=1;
 return mon;
}
function accuracyMultiplier(mon){
 const stage=Math.max(-6,Math.min(6,ensure(mon).stages.acc||0));
 return stage>=0?(3+stage)/3:3/(3-stage);
}
function canonicalSide(mon){
 if(typeof myTeam==='undefined'||!myTeam||typeof enemyTeam==='undefined'||!enemyTeam)return 'p1';
 const own=mon===myTeam.lead||(myTeam.bench||[]).includes(mon);
 if(isHost||isSpectator)return own?'p1':'p2';
 return own?'p2':'p1';
}
function applyCannon(mon){
 if(!mon||mon.id!=='mashiro')return;
 const celestial=BY_ID[mon.celestial];
 if(!celestial)return;
 const base=(typeof POKEDEX!=='undefined'&&POKEDEX.mashiro?POKEDEX.mashiro.moves[1]:mon.moves[1]);
 const clean={...base,...celestial.move,planetCannon:true};
 mon.moves=[...mon.moves];
 mon.moves[1]=clean;
}
function changeStage(mon,stat,amount){
 ensure(mon);
 const before=mon.stages[stat]||0;
 mon.stages[stat]=Math.max(-6,Math.min(6,before+amount));
 return mon.stages[stat]-before;
}
function discoveryEvents(mon,foe,side,celestial,reason){
 const events=[{type:'mashiro_discovery',side,celestial:celestial.id,reason,msg:`${celestial.icon} [천체 탐색] ${mon.name}이(가) ${celestial.name}을(를) 발견했다! ${celestial.effect}`}];
 const d=celestial.discover||{};
 for(const [stat,amount] of Object.entries(d.self||{})){
  const changed=changeStage(mon,stat,amount);
  if(changed)events.push({type:'buff',side,stat,amount:changed,msg:`${celestial.icon} ${celestial.name}의 힘! ${mon.name}의 ${STAT_LABELS[stat]}이(가) ${changed}랭크 올랐다!`});
 }
 for(const [stat,amount] of Object.entries(d.foe||{})){
  const foeSide=side==='p1'?'p2':'p1';
  if(foe.ability==='엄마없음')events.push({type:'msg',msg:`${foe.name}의 특성 [엄마없음]! ${STAT_LABELS[stat]}이(가) 떨어지지 않는다!`});
  else{
   const changed=changeStage(foe,stat,amount);
   if(changed)events.push({type:'debuff',side:foeSide,stat,amount:changed,msg:`${celestial.icon} ${celestial.name}의 영향! ${foe.name}의 ${STAT_LABELS[stat]}이(가) ${Math.abs(changed)}랭크 떨어졌다!`});
  }
 }
 if(d.heal&&mon.hp>0&&mon.hp<mon.maxHp){
  const heal=Math.min(mon.maxHp-mon.hp,Math.max(1,Math.floor(mon.maxHp*d.heal)));
  mon.hp+=heal;
  events.push({type:'heal',side,heal,hp:mon.hp,msg:`🌍 [생명의 별] ${mon.name}의 체력이 ${heal} 회복됐다!`});
 }
 if(d.reflect){
  mon.reflectTurns=Math.max(mon.reflectTurns||0,d.reflect);
  events.push({type:'buff',side,msg:`🪐 [고리 방벽] ${mon.name}에게 ${d.reflect}턴 피해 경감 장막이 생겼다!`});
 }
 return events;
}
function discover(mon,foe,side,reason='turnEnd'){
 ensure(mon);ensure(foe);
 const pool=CELESTIALS.filter(c=>c.id!==mon.celestial);
 const celestial=pool[Math.floor(Math.random()*pool.length)]||CELESTIALS[0];
 mon.celestial=celestial.id;
 applyCannon(mon);
 return discoveryEvents(mon,foe,side,celestial,reason);
}
function radar(mon,foe){
 ensure(mon);ensure(foe);
 const copied=blankStages();
 for(const stat of Object.keys(copied)){
  const value=Math.max(0,foe.stages[stat]||0);
  copied[stat]=Math.max(0,Math.min(value,6-(mon.stages[stat]||0)));
  mon.stages[stat]+=copied[stat];
 }
 mon.radarCopiedStages=copied;mon.radarCopyTurns=2;
 const text=Object.entries(copied).filter(([,v])=>v).map(([k,v])=>`${STAT_LABELS[k]} +${v}`).join(', ');
 return text?`🐾 [고양이 레이더] 상대 강화 복사! (${text}, 2턴)`:'🐾 [고양이 레이더] 복사할 상대 강화가 없다.';
}
function moveSucceeded(events,side,name){
 const start=events.findIndex(e=>e.type==='move_announce'&&e.side===side&&e.moveName===name);
 if(start<0)return false;
 const end=events.findIndex((e,i)=>i>start&&e.type==='move_announce');
 return !events.slice(start,end<0?events.length:end).some(e=>(e.type==='msg'&&/빗나갔|실패/.test(e.msg||''))||(e.type==='protect'&&e.side!==side));
}
function insertAfterAnnouncement(events,side,name,newEvents){
 if(!newEvents.length)return;
 const index=events.findIndex(e=>e.type==='move_announce'&&e.side===side&&e.moveName===name);
 events.splice(index<0?events.length:index+1,0,...newEvents);
}
function lowerEnemy(foe,side,stat,amount,message){
 if(foe.ability==='엄마없음')return [{type:'msg',msg:`${foe.name}의 특성 [엄마없음]! ${STAT_LABELS[stat]}이(가) 떨어지지 않는다!`}];
 const changed=changeStage(foe,stat,-amount);
 return changed?[{type:'debuff',side,stat,amount:changed,msg:message}]:[];
}
function ready(){return typeof window.buildMon==='function'&&typeof window.calculateTurnEvents==='function'&&typeof window.triggerSwitchInAbilities==='function'&&typeof window.renderHudBadges==='function';}

function install(){
 if(window.__mashiroPatchV3||!ready())return;
 window.__mashiroPatchV3=true;
 if(typeof POKEDEX!=='undefined'&&POKEDEX.mashiro){
  POKEDEX.mashiro.abilityDesc='출전 즉시 천체를 탐색하고, 이후 매 턴 종료 시 수성·금성·지구·화성·목성·토성·천왕성·해왕성 및 특수 천체 중 다른 하나를 탐색한다. 출전 시 상대의 양수 능력치 랭크를 2턴 동안 복사한다.';
  POKEDEX.mashiro.story='우주와 태양계를 탐사하며, 발견한 천체를 행성 대포에 실어 발사한다.';
 }
 const oldBuild=window.buildMon;
 const oldCalc=window.calculateTurnEvents;
 const oldSwitch=window.triggerSwitchInAbilities;
 const oldBadges=window.renderHudBadges;
 window.getAccuracyMultiplier=accuracyMultiplier;
 window.getDisplayedAccuracy=(mon,move,foe)=>Math.max(0,Math.min(100,Math.round((move?.acc??100)*accuracyMultiplier(mon)*(foe?.celestial==='black_hole'?.9:1))));
 window.buildMon=function(...args){return ensure(oldBuild(...args));};
 window.triggerSwitchInAbilities=function(mon,foe){
  oldSwitch(mon,foe);ensure(mon);ensure(foe);
  if(mon.ability==='고양이 레이더'){
   const radarMsg=radar(mon,foe);
   const side=canonicalSide(mon);
   const found=discover(mon,foe,side,'switchIn');
   const discovery=found[0];
   setTimeout(()=>{if(battleActive&&typeof window.showMashiroDiscovery==='function')window.showMashiroDiscovery(side,mon,discovery.celestial,discovery.msg);},520);
   setTimeout(()=>{if(battleActive&&typeof window.setBattleMsg==='function')window.setBattleMsg(radarMsg);},1550);
  }
 };
 window.calculateTurnEvents=function(c1,c2,p1,p2,turn,sand){
  const teams=[structuredClone(p1),structuredClone(p2)];
  const choices=[structuredClone(c1),structuredClone(c2)];
  teams.forEach(t=>all(t).forEach(ensure));
  const entered=[false,false];
  const entryEvents=[[],[]];

  for(let i=0;i<2;i++){
   const team=teams[i],choice=choices[i],other=teams[1-i];
   let incoming=team.lead;
   if(choice.type==='switch'&&Number.isInteger(choice.benchIndex))incoming=team.bench[choice.benchIndex];
   if(incoming===team.lead&&incoming?.id==='mashiro'&&!incoming.celestial){
    const opposingChoice=choices[1-i];
    const foe=opposingChoice.type==='switch'&&Number.isInteger(opposingChoice.benchIndex)?other.bench[opposingChoice.benchIndex]:other.lead;
    entryEvents[i]=discover(incoming,foe,i?'p2':'p1','switchIn');
    entered[i]=true;
   }
  }

  for(let i=0;i<2;i++){
   const mon=teams[i].lead,foe=teams[1-i].lead;
   ensure(mon);ensure(foe);applyCannon(mon);
   mon.blackHoleAccuracyMult=foe.celestial==='black_hole'?.9:1;
   const choice=choices[i];
   if(choice.type!=='move')continue;
   const move=mon.moves[choice.moveIndex];
   if(!move)continue;
   if(mon.id==='mashiro'&&mon.celestial==='supernova'&&!move.planetCannon&&move.pwr>0)move.pwr*=1.25;
   move.acc=Math.max(0,Math.min(100,(move.acc??100)*accuracyMultiplier(mon)*mon.blackHoleAccuracyMult));
   if(mon.id==='mashiro'&&move.planetCannon&&BY_ID[mon.celestial]?.move.ignoreBarrier){foe.reflectTurns=0;foe.rewindActive=false;}
  }

  const events=oldCalc(choices[0],choices[1],teams[0],teams[1],turn,sand);
  const sync=events.find(e=>e.type==='sync_teams');
  if(!sync)return events;
  events.splice(events.indexOf(sync),1);
  const out=[sync.p1,sync.p2];
  out.forEach(t=>all(t).forEach(ensure));

  for(let i=0;i<2;i++){
   if(!entryEvents[i].length)continue;
   const side=i?'p2':'p1';
   const switchIndex=events.findIndex(e=>e.type==='switch'&&e.side===side);
   events.splice(switchIndex<0?0:switchIndex+1,0,...entryEvents[i]);
  }

  for(let i=0;i<2;i++){
   const side=i?'p2':'p1',foeSide=i?'p1':'p2';
   const before=teams[i],choice=choices[i],actor=before.lead;
   if(choice.type!=='move')continue;
   const used=actor.moves[choice.moveIndex];
   if(!used)continue;
   const me=all(out[i]).find(m=>m.id===actor.id)||out[i].lead;
   const foe=out[1-i].lead;
   const succeeded=moveSucceeded(events,side,used.name);
   if(!succeeded)continue;
   const immediate=[];
   if(used.dropEnemySpd)immediate.push(...lowerEnemy(foe,foeSide,'spd',used.dropEnemySpd,`${foe.name}의 특수방어가 ${used.dropEnemySpd}랭크 떨어졌다!`));
   if(used.dropEnemyAcc)immediate.push(...lowerEnemy(foe,foeSide,'acc',used.dropEnemyAcc,`${foe.name}의 명중이 ${used.dropEnemyAcc}랭크 떨어졌다!`));
   if(used.dropEnemySpe)immediate.push(...lowerEnemy(foe,foeSide,'spe',used.dropEnemySpe,`${foe.name}의 스피드가 ${used.dropEnemySpe}랭크 떨어졌다!`));
   if(used.boostSelfSpa){const amount=changeStage(me,'spa',used.boostSelfSpa);if(amount)immediate.push({type:'buff',side,stat:'spa',amount,msg:`${me.name}의 특수공격이 ${amount}랭크 올랐다!`});}
   if(used.boostSelfSpd){const amount=changeStage(me,'spd',used.boostSelfSpd);if(amount)immediate.push({type:'buff',side,stat:'spd',amount,msg:`${me.name}의 특수방어가 ${amount}랭크 올랐다!`});}
   if(used.grantReflect){me.reflectTurns=Math.max(me.reflectTurns||0,used.grantReflect);immediate.push({type:'buff',side,msg:`🌍 가이아의 생명 장막이 ${used.grantReflect}턴 동안 펼쳐졌다!`});}
   insertAfterAnnouncement(events,side,used.name,immediate);
   if(used.gravityShield){const heal=Math.min(me.maxHp-me.hp,Math.max(1,Math.floor(me.maxHp*.08)));if(heal>0){me.hp+=heal;events.push({type:'heal',side,heal,hp:me.hp,msg:`🪐 [중력방패] 중력을 흡수해 체력을 ${heal} 회복했다!`});}}
   if(used.haze){me.stages.acc=0;foe.stages.acc=0;}
   if(used.recoil){const damage=events.find(e=>e.type==='damage'&&e.actorSide===side&&e.moveName===used.name);if(damage&&me.hp>1){const recoil=Math.min(me.hp-1,Math.max(1,Math.floor(damage.dmg*used.recoil)));me.hp-=recoil;events.push({type:'damage',targetSide:side,actorSide:side,actorName:me.name,targetName:me.name,moveName:'초신성 반동',moveType:'불꽃',dmg:recoil,targetHp:me.hp,targetMaxHp:me.maxHp,isCrit:false,effectiveness:1,msg:`🌟 초신성의 반동! HP -${recoil}`});}}
  }

  for(let i=0;i<2;i++){
   const previous=teams[i].lead,current=out[i].lead,foe=out[1-i].lead,side=i?'p2':'p1';
   if(current.id!==previous.id&&!entered[i]){
    current.stages={...blankStages(),...current.stages,acc:0};
    if(current.ability==='고양이 레이더'){
     events.push({type:'msg',msg:radar(current,foe)});
     events.push(...discover(current,foe,side,'switchIn'));
     entered[i]=true;
    }
   }
  }

  for(let i=0;i<2;i++){
   const side=i?'p2':'p1',choice=choices[i],before=teams[i],team=out[i];
   const used=choice.type==='move'?before.lead.moves[choice.moveIndex]:null;
   if(!used?.phaseShift||!moveSucceeded(events,side,used.name)||team.lead.id!=='mashiro'||team.lead.fainted)continue;
   const idx=team.bench.findIndex(m=>m&&!m.fainted);if(idx<0)continue;
   const old=team.lead,next=team.bench[idx];
   old.stages=blankStages();old.radarCopyTurns=0;old.radarCopiedStages=blankStages();
   next.stages={...blankStages(),...next.stages,acc:0};team.lead=next;team.bench[idx]=old;
   events.push({type:'switch',side,benchIndex:idx,newLeadId:next.id,newBenchId:old.id,msg:`✨ [위상전이] ${old.name}이(가) 위상을 바꾸고 ${next.name}에게 자리를 넘겼다!`});
   if(next.ability==='고양이 레이더'){events.push({type:'msg',msg:radar(next,out[1-i].lead)});events.push(...discover(next,out[1-i].lead,side,'switchIn'));entered[i]=true;}
  }

  out.forEach((team,i)=>all(team).forEach(mon=>{
   if(mon.radarCopyTurns>0){
    mon.radarCopyTurns--;
    if(mon.radarCopyTurns===0){
     for(const stat of Object.keys(blankStages()))mon.stages[stat]=Math.max(-6,(mon.stages[stat]||0)-Math.min(mon.radarCopiedStages[stat]||0,Math.max(0,mon.stages[stat]||0)));
     mon.radarCopiedStages=blankStages();events.push({type:'msg',msg:`🐾 ${mon.name}의 고양이 레이더 복사 효과가 끝났다.`});
    }
   }
  }));

  for(let i=0;i<2;i++){
   const mon=out[i].lead,foe=out[1-i].lead;
   if(mon.id==='mashiro'&&!mon.fainted&&!entered[i])events.push(...discover(mon,foe,i?'p2':'p1','turnEnd'));
   applyCannon(mon);
  }
  events.push(sync);
  return events;
 };
 window.renderHudBadges=function(id,mon){
  ensure(mon);oldBadges(id,mon);
  const box=document.getElementById(id);if(!box)return;
  const add=(text,cls)=>{const b=document.createElement('span');b.className=`mini-badge ${cls}`;b.textContent=text;box.appendChild(b);};
  const finalAcc=Math.max(0,Math.min(100,Math.round(100*accuracyMultiplier(mon)*(mon.blackHoleAccuracyMult||1))));
  add(`🎯 명중 ${finalAcc}%`,finalAcc<100?'debuff':'shield');
  if(mon.stages.acc)add(`명중랭크 ${mon.stages.acc>0?'+':''}${mon.stages.acc}`,mon.stages.acc>0?'buff':'debuff');
  if(mon.radarCopyTurns>0)add(`🐾 레이더 ${mon.radarCopyTurns}T`,'buff');
  if(mon.celestial&&BY_ID[mon.celestial])add(`${BY_ID[mon.celestial].icon} ${BY_ID[mon.celestial].name}`,'shield');
  if((mon.blackHoleAccuracyMult||1)<1)add('◉ 블랙홀 ×0.9','debuff');
 };
}
(function wait(){if(ready())install();else setTimeout(wait,25);})();
})();
