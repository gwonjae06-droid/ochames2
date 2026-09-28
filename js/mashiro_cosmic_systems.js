(()=>{
'use strict';
const BIG_BANG='관측 완료: 빅뱅';
const BIG_MOVE={name:BIG_BANG,type:'환락',role:'공격',category:'특수',pwr:130,acc:90,planetCannon:true,bigBang:true,desc:'서로 다른 천체 3종의 관측 데이터를 충돌시킨다. 위력 130 · 환락 · 명중 90%. 사용 후 관측 기록 초기화.'};
const RESONANCES={
 'mercury>supernova':{id:'slingshot',name:'태양 근접비행',icon:'☿✹',desc:'다음 일반 행성 대포 우선도 +1'},
 'earth>nebula':{id:'biosphere',name:'푸른 생명권',icon:'🌍🌌',desc:'아군 전체 최대 HP의 6% 회복',instant:'heal'},
 'mars>jupiter':{id:'warstorm',name:'전쟁의 폭풍',icon:'♂♃',desc:'다음 일반 행성 대포 위력 1.2배'},
 'saturn>uranus':{id:'ringwave',name:'고리 공명',icon:'♄⛢',desc:'다음 턴까지 피해 경감 장막',instant:'barrier'},
 'neptune>black_hole':{id:'deep_horizon',name:'심해의 지평선',icon:'♆◉',desc:'다음 일반 행성 대포가 장막 관통'},
 'venus>mars':{id:'hot_atmosphere',name:'작열 대기',icon:'♀♂',desc:'다음 일반 행성 대포에 화상 확률 50%'}
};
const CHARGE={
 slingshot:m=>({...m,priority:Math.max(1,m.priority||0),desc:`${m.desc||''} · [쌍성 공명] 우선도 +1`}),
 warstorm:m=>({...m,pwr:Math.round((m.pwr||0)*1.2),desc:`${m.desc||''} · [쌍성 공명] 위력 1.2배`}),
 deep_horizon:m=>({...m,ignoreBarrier:true,desc:`${m.desc||''} · [쌍성 공명] 장막 관통`}),
 hot_atmosphere:m=>({...m,burnChance:Math.max(.5,m.burnChance||0),desc:`${m.desc||''} · [쌍성 공명] 화상 50%`})
};
const cp=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
const sideMine=s=>(typeof isHost!=='undefined'&&(isHost||isSpectator))?s==='p1':s==='p2';
const sprite=s=>sideMine(s)?'player-sprite':'enemy-sprite';
const members=t=>t?[t.lead,...(t.bench||[])].filter(Boolean):[];
const mash=t=>members(t).find(m=>m?.id==='mashiro');
const sideTeam=(sync,s)=>s==='p1'?sync.p1:sync.p2;
const source=id=>(window.MASHIRO_CELESTIAL_BY_ID||{})[id];
const syncOf=E=>[...E].reverse().find(e=>e?.type==='sync_teams');
const announce=(E,s,n)=>E.some(e=>e?.type==='move_announce'&&e.side===s&&e.moveName===n);
const hit=(E,s,n)=>E.some(e=>e?.type==='damage'&&e.actorSide===s&&e.moveName===n&&e.targetSide!==s);
function prep(mon){if(!mon)return;mon.cosmicObserved=Array.isArray(mon.cosmicObserved)?[...new Set(mon.cosmicObserved)].slice(0,3):[];mon.cosmicBigBangReady=!!mon.cosmicBigBangReady||mon.cosmicObserved.length>=3;}
function enhanced(base,id){return CHARGE[id]?CHARGE[id]({...base}):{...base};}
function cannonSetup(team,choice,side,temps){
 const mon=team?.lead;if(mon?.id!=='mashiro'||choice?.type!=='move'||Number(choice.moveIndex)!==1)return null;prep(mon);
 const real=mon.celestial,c=source(real);if(!c)return null;
 const isBig=mon.cosmicBigBangReady;
 const move=isBig?{...BIG_MOVE}:enhanced(c.move,mon.cosmicResonanceCharge);
 const key=`__cosmic_${side}_${Math.random().toString(36).slice(2)}`;
 window.MASHIRO_CELESTIAL_BY_ID[key]={...c,id:key,move};temps.push(key);
 mon.celestial=key;
 return {side,real,key,move,isBig,charge:mon.cosmicResonanceCharge||null};
}
function addObservation(E,sync,ctx){
 const team=sideTeam(sync,ctx.side),mon=mash(team);if(!mon)return;prep(mon);
 if(ctx.isBig){
  if(announce(E,ctx.side,BIG_BANG)){mon.cosmicObserved=[];mon.cosmicBigBangReady=false;E.splice(E.indexOf(sync),0,{type:'cosmic_bigbang_reset',side:ctx.side,msg:'🌠 [관측 완료] 빅뱅 방출! 관측일지가 초기화됐다.'});}
  return;
 }
 if(ctx.charge&&announce(E,ctx.side,ctx.move.name)){
  mon.cosmicResonanceCharge=null;
  E.splice(E.indexOf(sync),0,{type:'msg',msg:`✨ [쌍성 공명] ${RESONANCES[Object.keys(RESONANCES).find(k=>RESONANCES[k].id===ctx.charge)]?.name||'공명'}의 힘을 행성 대포에 실었다!`});
 }
 if(!hit(E,ctx.side,ctx.move.name)||mon.cosmicObserved.includes(ctx.real))return;
 mon.cosmicObserved.push(ctx.real);mon.cosmicObserved=mon.cosmicObserved.slice(0,3);
 const c=source(ctx.real),count=mon.cosmicObserved.length;
 E.splice(E.indexOf(sync),0,{type:'cosmic_observe',side:ctx.side,celestial:ctx.real,msg:`📖 [우주 관측일지] ${c?.icon||'✦'} ${c?.name||ctx.real} 등록! (${count}/3)`});
 if(count>=3){mon.cosmicBigBangReady=true;E.splice(E.indexOf(sync),0,{type:'cosmic_bigbang_ready',side:ctx.side,msg:'🌌 관측 데이터 3종 완성! 행성 대포가 「관측 완료: 빅뱅」으로 변한다!'});}
}
function applyResonances(E,sync,previous){
 const additions=[];
 E.forEach((ev,index)=>{
  if(ev?.type!=='mashiro_discovery')return;
  const prev=previous[ev.side],key=`${prev}>${ev.celestial}`,r=RESONANCES[key];previous[ev.side]=ev.celestial;if(!r)return;
  const team=sideTeam(sync,ev.side),mon=mash(team);if(!mon)return;
  if(r.instant==='heal'){
   const healed=[];members(team).forEach((ally,bi)=>{if(ally.fainted||ally.hp<=0||ally.hp>=ally.maxHp)return;const amount=Math.min(ally.maxHp-ally.hp,Math.max(1,Math.floor(ally.maxHp*.06)));ally.hp+=amount;healed.push(`${ally.name} +${amount}`);});
   additions.push({index:index+1,event:{type:'cosmic_resonance',side:ev.side,resonance:r.id,msg:`${r.icon} [쌍성 공명: ${r.name}] ${healed.length?`아군 회복! (${healed.join(', ')})`:'생명권이 펼쳐졌지만 회복할 체력이 없다.'}`}});
  }else if(r.instant==='barrier'){
   mon.reflectTurns=Math.max(mon.reflectTurns||0,2);additions.push({index:index+1,event:{type:'cosmic_resonance',side:ev.side,resonance:r.id,msg:`${r.icon} [쌍성 공명: ${r.name}] 다음 턴까지 피해 경감 장막이 펼쳐졌다!`}});
  }else{
   mon.cosmicResonanceCharge=r.id;additions.push({index:index+1,event:{type:'cosmic_resonance',side:ev.side,resonance:r.id,msg:`${r.icon} [쌍성 공명: ${r.name}] ${r.desc}!`}});
  }
 });
 additions.sort((a,b)=>b.index-a.index).forEach(x=>E.splice(x.index,0,x.event));
}
function clearFainted(sync){for(const t of [sync.p1,sync.p2]){const m=mash(t);if(m?.fainted){m.cosmicObserved=[];m.cosmicBigBangReady=false;m.cosmicResonanceCharge=null;}}}
function injectCss(){if(document.getElementById('mashiro-cosmic-system-css'))return;const s=document.createElement('style');s.id='mashiro-cosmic-system-css';s.textContent=`
.cosmic-journal{position:absolute;inset:-29px -34px;pointer-events:none;animation:cjSpin 8s linear infinite}.cosmic-journal i{position:absolute;left:50%;top:50%;font-style:normal;font-size:19px;filter:drop-shadow(0 0 7px #a78bfa);transform:rotate(var(--a)) translateX(58px) rotate(calc(-1 * var(--a)));animation:cjPulse 1.4s ease-in-out infinite alternate}.cosmic-journal.ready{filter:drop-shadow(0 0 12px #f472b6)}
@keyframes cjSpin{to{transform:rotate(360deg)}}@keyframes cjPulse{to{scale:1.25}}
.cosmic-ready-flash{animation:cosmicReady .8s ease-in-out infinite alternate!important}@keyframes cosmicReady{to{box-shadow:0 0 30px #f472b6,0 0 60px #7c3aed}}
`;document.head.append(s)}
function renderOrbit(id,mon){const root=document.getElementById(id);if(!root)return;root.querySelector('.cosmic-journal')?.remove();if(mon?.id!=='mashiro'||mon.fainted)return;prep(mon);if(!mon.cosmicObserved.length)return;const o=document.createElement('div');o.className=`cosmic-journal${mon.cosmicBigBangReady?' ready':''}`;o.innerHTML=mon.cosmicObserved.map((x,i)=>`<i style="--a:${i*120}deg;animation-delay:${i*.18}s">${source(x)?.icon||'✦'}</i>`).join('');root.append(o)}
function center(id){return typeof getSpriteCenter==='function'?getSpriteCenter(id):{x:330,y:155}}
function bigBangFx(aId,bId){if(typeof addFX!=='function')return;const a=center(aId),b=center(bId),mon=aId==='player-sprite'?myTeam?.lead:enemyTeam?.lead,ids=(mon?.cosmicObserved||[]).slice(0,3),start=performance.now();if(typeof playTone==='function'){playTone(82,'sine',1.1,.16,38);playTone(246,'triangle',.7,.08,64,{delay:.35});playTone(55,'sawtooth',.65,.18,30,{delay:.82});}if(typeof playNoise==='function')setTimeout(()=>playNoise(.5,.2,{filter:'lowpass',cutoff:700}),760);addFX(ctx=>{const t=Math.min(1,(performance.now()-start)/1450),p=Math.min(1,t/.63);ctx.save();ctx.fillStyle=`rgba(2,6,23,${Math.sin(Math.PI*t)*.78})`;ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);ids.forEach((id,i)=>{const c=source(id),q=i*Math.PI*2/3+t*5,r=75*(1-p)+8*p,x=b.x+Math.cos(q)*r,y=b.y+Math.sin(q)*r*.55;if(c&&typeof window.drawMashiroCosmicBody==='function')window.drawMashiroCosmicBody(ctx,c,x,y,15);else{ctx.fillStyle=c?.color||'#a78bfa';ctx.shadowColor=c?.color||'#a78bfa';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(x,y,12,0,7);ctx.fill();}});if(t>.58){const e=(t-.58)/.42,rad=18+135*e;const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,rad);g.addColorStop(0,'#fff');g.addColorStop(.18,'#f0abfc');g.addColorStop(.5,'#7c3aed');g.addColorStop(1,'rgba(2,6,23,0)');ctx.globalAlpha=1-e*.75;ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,rad,0,7);ctx.fill();}ctx.restore();return t<1})}
function resonanceFx(side){const c=center(sprite(side));if(typeof playBuffAuraFX==='function')playBuffAuraFX(c.x,c.y,'#c084fc');if(typeof playTone==='function'){playTone(330,'triangle',.35,.08,660);playTone(495,'sine',.42,.06,990,{delay:.12});}}
function install(){
 if(window.__mashiroCosmicSystems||typeof calculateTurnEvents!=='function'||typeof renderHudBadges!=='function'||typeof renderBattleField!=='function'||!window.MASHIRO_CELESTIAL_BY_ID)return setTimeout(install,40);window.__mashiroCosmicSystems=1;injectCss();
 const calc=window.calculateTurnEvents,badges=window.renderHudBadges,render=window.renderBattleField,moves=window.openMoveMenu,visual=window.triggerSkillVisualAndAudio,play=window.playTurnEvents;
 window.calculateTurnEvents=function(c1,c2,p1,p2,turn,sand){const teams=[cp(p1),cp(p2)],choices=[cp(c1),cp(c2)],temps=[],contexts=[],previous={p1:teams[0]?.lead?.celestial,p2:teams[1]?.lead?.celestial};for(let i=0;i<2;i++){const x=cannonSetup(teams[i],choices[i],i?'p2':'p1',temps);if(x)contexts.push(x)}let E;try{E=calc(choices[0],choices[1],teams[0],teams[1],turn,sand)}finally{temps.forEach(k=>delete window.MASHIRO_CELESTIAL_BY_ID[k])}if(!Array.isArray(E))return E;const sync=syncOf(E);if(!sync)return E;for(const ctx of contexts){for(const m of members(sideTeam(sync,ctx.side)))if(m?.celestial===ctx.key)m.celestial=ctx.real;addObservation(E,sync,ctx)}applyResonances(E,sync,previous);clearFainted(sync);return E};
 window.renderHudBadges=function(id,mon){badges(id,mon);if(mon?.id!=='mashiro')return;prep(mon);const box=document.getElementById(id);if(!box)return;const add=(text,cls)=>{const b=document.createElement('span');b.className=`mini-badge ${cls}`;b.textContent=text;box.append(b)};const icons=mon.cosmicObserved.map(x=>source(x)?.icon||'✦').join('');add(`📖 관측 ${mon.cosmicObserved.length}/3 ${icons}`,mon.cosmicBigBangReady?'buff':'shield');if(mon.cosmicBigBangReady)add('🌌 빅뱅 준비','buff');if(mon.cosmicResonanceCharge){const r=Object.values(RESONANCES).find(x=>x.id===mon.cosmicResonanceCharge);if(r)add(`${r.icon} ${r.name}`,'buff')}};
 window.renderBattleField=function(...a){const r=render(...a);renderOrbit('player-sprite',myTeam?.lead);renderOrbit('enemy-sprite',enemyTeam?.lead);return r};
 window.openMoveMenu=function(...a){const r=moves(...a),m=myTeam?.lead;if(m?.id==='mashiro'){prep(m);if(m.cosmicBigBangReady){const n=document.getElementById('m1-name'),t=document.getElementById('m1-tag'),d=document.getElementById('m1-desc'),b=document.getElementById('btn-m1');if(n)n.textContent=BIG_BANG;if(t)t.textContent='환락 · 위력 130 · 명중 90%';if(d)d.textContent=BIG_MOVE.desc;if(b)b.classList.add('cosmic-ready-flash')}else{const b=document.getElementById('btn-m1');b?.classList.remove('cosmic-ready-flash')}}return r};
 window.triggerSkillVisualAndAudio=function(name,a,t,...rest){if(name===BIG_BANG){bigBangFx(sprite(a),sprite(t||a==='p1'?'p2':'p1'));return}return visual(name,a,t,...rest)};
 window.playTurnEvents=async function(E){if(!Array.isArray(E))return play(E);const map=new Map;for(const e of E)if(e?.type==='cosmic_resonance')map.set(e.msg,e);const old=window.setBattleMsg;window.setBattleMsg=x=>{const e=map.get(x);if(e)resonanceFx(e.side);return old(x)};try{return await play(E.map(e=>['cosmic_resonance','cosmic_observe','cosmic_bigbang_ready','cosmic_bigbang_reset'].includes(e.type)?{...e,type:'msg'}:e))}finally{window.setBattleMsg=old}};
 if(typeof POKEDEX!=='undefined'&&POKEDEX.mashiro){POKEDEX.mashiro.abilityDesc='출전 즉시 및 매 턴 종료마다 천체를 탐색한다. 연속된 특정 천체는 쌍성 공명을 일으키며, 서로 다른 행성 대포 3종을 적중시키면 위력 130·명중 90%의 환락 기술 「관측 완료: 빅뱅」을 1회 사용할 수 있다. 획득한 랭크 상승은 2턴 유지된다.';POKEDEX.mashiro.story='우주와 태양계를 탐사하고 쌍성 공명을 일으키며, 축적한 관측 기록을 빅뱅으로 방출한다.'}
}
install();
})();
