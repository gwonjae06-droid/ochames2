(()=>{
'use strict';
const KEY='ochames2_mashiro_codex_v1';
const BIG='관측 완료: 빅뱅';
const INNER=new Set(['mercury','venus','earth','mars']);
const OUTER=new Set(['jupiter','saturn','uranus','neptune']);
const SPECIAL=new Set(['planet','comet','nebula','black_hole','supernova']);
const RECIPES=[
 {id:'singularity',name:'종말점: 싱귤래리티',test:a=>a.includes('black_hole'),desc:'피해 경감 장막을 삼키고 폭발한다.',color:'#8b5cf6'},
 {id:'hypernova',name:'하이퍼노바 피날레',test:a=>a.includes('supernova'),desc:'적중하면 상대를 화상 상태로 만든다.',color:'#fb7185'},
 {id:'aurora',name:'오로라 코스모스',test:a=>a.includes('comet')&&a.includes('nebula'),desc:'적중 후 스피드와 명중이 1랭크 상승한다.',color:'#67e8f9'},
 {id:'genesis',name:'창세의 빅뱅',test:a=>a.length===3&&a.every(x=>INNER.has(x)),desc:'적중 후 아군 전체의 체력을 5% 회복한다.',color:'#4ade80'},
 {id:'giant_collapse',name:'거신성 대붕괴',test:a=>a.length===3&&a.every(x=>OUTER.has(x)),desc:'적중 후 상대의 특수방어를 1랭크 낮춘다.',color:'#f59e0b'},
 {id:'unknown',name:'미지우주 대폭발',test:a=>a.length===3&&a.every(x=>SPECIAL.has(x)),desc:'상대의 양수 랭크 하나를 지운다.',color:'#c084fc'},
 {id:'base',name:BIG,test:()=>true,desc:'관측 데이터 3종을 충돌시키는 기본형 빅뱅.',color:'#e879f9'}
];
const cp=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
const source=id=>(window.MASHIRO_CELESTIAL_BY_ID||{})[id];
const list=()=>window.MASHIRO_CELESTIALS||[];
const members=t=>t?[t.lead,...(t.bench||[])].filter(Boolean):[];
const mash=t=>members(t).find(m=>m?.id==='mashiro');
const syncOf=E=>[...E].reverse().find(e=>e?.type==='sync_teams');
const teamOf=(s,side)=>side==='p1'?s.p1:s.p2;
const other=side=>side==='p1'?'p2':'p1';
const mine=side=>(typeof isHost!=='undefined'&&(isHost||isSpectator))?side==='p1':side==='p2';
const sprite=side=>mine(side)?'player-sprite':'enemy-sprite';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function save(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
function entry(db,id){return db[id]||(db[id]={found:0,hits:0})}
function recipe(ids){return RECIPES.find(r=>r.test(ids||[]))||RECIPES.at(-1)}
function recipeFor(mon){return recipe((mon?.cosmicObserved||[]).slice(0,3))}
function clamp(v){return Math.max(-6,Math.min(6,v||0))}
function addEvent(E,sync,e){E.splice(Math.max(0,E.indexOf(sync)),0,e)}
function activeMash(team,choice){
 if(choice?.type==='switch'&&Number.isInteger(choice.benchIndex))return team?.bench?.[choice.benchIndex]?.id==='mashiro'?team.bench[choice.benchIndex]:null;
 return team?.lead?.id==='mashiro'?team.lead:null;
}
function nextForecast(mon){
 if(!mon||mon.id!=='mashiro')return;
 const pool=list().filter(x=>x.id!==mon.celestial);
 const c=pool[Math.floor(Math.random()*pool.length)];
 mon.cosmicForecast=c?.id||null;
}
function category(id){
 if(INNER.has(id))return {name:'내행성권',icon:'◌',color:'#60a5fa'};
 if(OUTER.has(id)||id==='planet')return {name:'거대행성권',icon:'◎',color:'#f59e0b'};
 return {name:'심우주',icon:'✦',color:'#c084fc'};
}
function prepareForecastQueues(p1,p2,c1,c2){
 return [[p1,c1,'p1'],[p2,c2,'p2']].map(([t,c,side])=>{const m=activeMash(t,c);return m?.cosmicForecast?{side,id:m.cosmicForecast,current:m.celestial}:null}).filter(Boolean);
}
function withForecasts(queue,fn){
 if(!queue.length)return fn();
 const arr=window.MASHIRO_CELESTIALS,old=arr?.filter;
 if(!arr||typeof old!=='function')return fn();
 arr.filter=function(cb,thisArg){
  const out=old.call(this,cb,thisArg),stack=String(new Error().stack||'');
  if(!stack.includes('discover')||!queue.length)return out;
  const q=queue.shift(),wanted=out.find(x=>x.id===q.id);
  return wanted?[wanted]:out;
 };
 try{return fn()}finally{arr.filter=old}
}
function hit(E,side,names){return E.some(e=>e?.type==='damage'&&e.actorSide===side&&names.includes(e.moveName)&&e.targetSide!==side)}
function contexts(c1,c2,p1,p2){
 return [[c1,p1,'p1'],[c2,p2,'p2']].map(([c,t,side])=>{const m=t?.lead;if(m?.id!=='mashiro'||c?.type!=='move'||Number(c.moveIndex)!==1||!m.cosmicBigBangReady)return null;const r=recipeFor(m);return {side,ids:[...(m.cosmicObserved||[])],r};}).filter(Boolean);
}
function applyRecipe(E,sync,ctx){
 const baseNames=[BIG,ctx.r.name];
 const success=hit(E,ctx.side,baseNames);
 for(const ev of E){
  if(ev?.side===ctx.side&&ev.moveName===BIG)ev.moveName=ctx.r.name;
  if(typeof ev?.msg==='string')ev.msg=ev.msg.replaceAll(BIG,ctx.r.name);
 }
 if(!success)return;
 const team=teamOf(sync,ctx.side),foeTeam=teamOf(sync,other(ctx.side)),mon=team?.lead,foe=foeTeam?.lead;
 const out=[];
 if(ctx.r.id==='genesis'){
  const healed=[];for(const a of members(team)){if(a.fainted||a.hp<=0||a.hp>=a.maxHp)continue;const n=Math.min(a.maxHp-a.hp,Math.max(1,Math.floor(a.maxHp*.05)));a.hp+=n;healed.push(`${a.name} +${n}`)}
  out.push({type:'msg',msg:`🌍 [창세] ${healed.length?`아군 전체의 생명력이 회복됐다! (${healed.join(', ')})`:'회복할 아군이 없다.'}`});
 }else if(ctx.r.id==='giant_collapse'&&foe){
  if(foe.ability==='엄마없음')out.push({type:'msg',msg:`${foe.name}의 특성 [엄마없음]! 특수방어가 떨어지지 않는다!`});
  else{const b=clamp(foe.stages?.spd),a=clamp(b-1);foe.stages={...(foe.stages||{}),spd:a};if(a!==b)out.push({type:'debuff',side:other(ctx.side),stat:'spd',amount:a-b,msg:`🪐 [거신성 붕괴] ${foe.name}의 특수방어가 1랭크 떨어졌다!`})}
 }else if(ctx.r.id==='hypernova'&&foe&&!foe.status){foe.status='burn';out.push({type:'msg',msg:`✹ [하이퍼노바] ${foe.name}이(가) 화상을 입었다!`})
 }else if(ctx.r.id==='aurora'&&mon){
  mon.stages={...(mon.stages||{}),spe:clamp((mon.stages?.spe||0)+1),acc:clamp((mon.stages?.acc||0)+1)};mon.cosmicRecipeBuffTurns=2;
  out.push({type:'buff',side:ctx.side,msg:`☄️🌌 [오로라 코스모스] ${mon.name}의 스피드와 명중이 1랭크 올랐다! (2턴)`});
 }else if(ctx.r.id==='unknown'&&foe){
  const positives=Object.keys(foe.stages||{}).filter(k=>(foe.stages[k]||0)>0);if(positives.length){const k=positives[Math.floor(Math.random()*positives.length)];foe.stages[k]=0;out.push({type:'debuff',side:other(ctx.side),stat:k,msg:`❔ [미지우주] ${foe.name}의 ${k} 양수 랭크가 소멸했다!`})}
 }
 out.forEach(e=>addEvent(E,sync,e));
 addEvent(E,sync,{type:'cosmic_recipe',side:ctx.side,recipe:ctx.r.id,msg:`🌌 [우주 레시피] ${ctx.r.name}의 고유 효과가 발동했다!`});
}
function tickRecipeBuff(E,sync){
 for(const side of ['p1','p2'])for(const m of members(teamOf(sync,side))){if(!m?.cosmicRecipeBuffTurns)continue;m.cosmicRecipeBuffTurns--;if(m.cosmicRecipeBuffTurns===0){m.stages={...(m.stages||{}),spe:clamp((m.stages?.spe||0)-1),acc:clamp((m.stages?.acc||0)-1)};addEvent(E,sync,{type:'msg',msg:`🌌 ${m.name}의 오로라 코스모스 강화가 끝났다.`})}}
}
function updateCodex(E){
 const db=load();let changed=false;
 for(const ev of E){
  if(ev?.type==='mashiro_discovery'&&source(ev.celestial)){entry(db,ev.celestial).found++;changed=true}
  if(ev?.type==='damage'&&ev.actorSide&&ev.targetSide!==ev.actorSide){const c=list().find(x=>x.move?.name===ev.moveName);if(c){entry(db,c.id).hits++;changed=true}}
  if(ev?.type==='cosmic_resonance'&&ev.resonance){db.resonances=db.resonances||{};db.resonances[ev.resonance]=(db.resonances[ev.resonance]||0)+1;changed=true}
  if(ev?.type==='cosmic_recipe'&&ev.recipe){db.recipes=db.recipes||{};db.recipes[ev.recipe]=(db.recipes[ev.recipe]||0)+1;changed=true}
 }
 if(changed)save(db);
}
function injectCss(){if(document.getElementById('mashiro-extras-css'))return;const s=document.createElement('style');s.id='mashiro-extras-css';s.textContent=`
.cosmic-forecast{position:absolute;z-index:31;left:50%;top:-122px;transform:translateX(-50%);min-width:152px;padding:5px 9px;border:1px dashed var(--fc);border-radius:10px;background:rgba(2,6,23,.9);color:#e2e8f0;text-align:center;font:800 9px system-ui;box-shadow:0 0 14px color-mix(in srgb,var(--fc) 52%,transparent);pointer-events:none}.cosmic-forecast b{color:var(--fc);font-size:11px}.cosmic-recipe-ready{animation:recipePulse .7s ease-in-out infinite alternate!important}@keyframes recipePulse{to{box-shadow:0 0 28px var(--rc),0 0 55px var(--rc);transform:translateY(-2px)}}
#cosmic-codex-modal{position:fixed;inset:0;z-index:9999;display:none;place-items:center;background:rgba(2,6,23,.86);backdrop-filter:blur(5px)}#cosmic-codex-modal.open{display:grid}.cosmic-codex-card{width:min(760px,92vw);max-height:84vh;overflow:auto;padding:18px;border:1px solid #7c3aed;border-radius:18px;background:linear-gradient(145deg,#0f172a,#1e1b4b);color:#fff;box-shadow:0 0 50px #7c3aed88}.cosmic-codex-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.cosmic-codex-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px}.cosmic-codex-item{padding:10px;border:1px solid #334155;border-radius:12px;background:#0f172acc}.cosmic-codex-item.locked{filter:grayscale(1);opacity:.42}.cosmic-codex-item b{display:block;font-size:14px}.cosmic-codex-item small{color:#cbd5e1}.cosmic-close{border:0;border-radius:8px;padding:7px 10px;background:#475569;color:#fff;font-weight:800;cursor:pointer}@media(max-width:620px){.cosmic-forecast{top:-101px;min-width:125px;font-size:7px}.cosmic-forecast b{font-size:9px}}
`;document.head.append(s)}
function renderForecast(rootId,mon){const root=document.getElementById(rootId);if(!root)return;root.querySelector('.cosmic-forecast')?.remove();if(mon?.id!=='mashiro'||mon.fainted||!mon.cosmicForecast)return;const c=source(mon.cosmicForecast),cat=category(mon.cosmicForecast);if(!c)return;const d=document.createElement('div');d.className='cosmic-forecast';d.style.setProperty('--fc',cat.color);d.innerHTML=`🔭 천문예보 · <b>${cat.icon} ${cat.name}</b><br><span>실루엣 ${c.icon} · 다음 탐색 예정</span>`;root.append(d)}
function codexModal(){
 let modal=document.getElementById('cosmic-codex-modal');if(modal)return modal;
 modal=document.createElement('div');modal.id='cosmic-codex-modal';modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};modal.innerHTML='<div class="cosmic-codex-card"><div class="cosmic-codex-head"><h2>🔭 네네코 마시로 천체 도감</h2><button class="cosmic-close">✕ 닫기</button></div><div id="cosmic-codex-body"></div></div>';document.body.append(modal);modal.querySelector('.cosmic-close').onclick=()=>modal.classList.remove('open');return modal;
}
function openCodex(){const modal=codexModal(),db=load(),found=list().filter(c=>(db[c.id]?.found||0)>0).length;document.getElementById('cosmic-codex-body').innerHTML=`<p>발견 ${found}/${list().length} · 발견과 행성 대포 적중 기록은 이 브라우저에 저장됩니다.</p><div class="cosmic-codex-grid">${list().map(c=>{const x=db[c.id]||{},lock=!x.found;return `<div class="cosmic-codex-item ${lock?'locked':''}" style="border-color:${lock?'#334155':c.color}"><b>${lock?'❔ 미확인 천체':`${c.icon} ${c.name}`}</b><small>발견 ${x.found||0}회 · 대포 적중 ${x.hits||0}회</small></div>`}).join('')}</div>`;modal.classList.add('open')}
function addButton(){if(document.getElementById('btn-cosmic-codex'))return;const host=document.querySelector('.header-btns');if(!host)return;const b=document.createElement('button');b.type='button';b.id='btn-cosmic-codex';b.className='info-toggle-btn';b.textContent='🔭 천체도감';b.onclick=openCodex;host.append(b)}
function recipeFx(name,a,t){const r=RECIPES.find(x=>x.name===name);if(!r)return false;if(typeof window.triggerSkillVisualAndAudio==='function')return false;return true}
function install(){
 if(window.__mashiroCosmicExtras||typeof window.calculateTurnEvents!=='function'||typeof window.renderBattleField!=='function'||typeof window.openMoveMenu!=='function'||!window.MASHIRO_CELESTIALS)return setTimeout(install,40);
 window.__mashiroCosmicExtras=1;injectCss();addButton();codexModal();
 const calc=window.calculateTurnEvents,render=window.renderBattleField,moves=window.openMoveMenu,visual=window.triggerSkillVisualAndAudio,switchAbilities=window.triggerSwitchInAbilities,play=window.playTurnEvents;
 window.triggerSwitchInAbilities=function(mon,foe){const r=switchAbilities(mon,foe);if(mon?.id==='mashiro'&&!mon.cosmicForecast)nextForecast(mon);return r};
 window.calculateTurnEvents=function(c1,c2,p1,p2,turn,sand){
  const cs=contexts(c1,c2,p1,p2);for(const x of cs)if(x.r.id==='singularity'){const foe=x.side==='p1'?p2?.lead:p1?.lead;if(foe){foe.reflectTurns=0;foe.rewindActive=false}}
  const queue=prepareForecastQueues(p1,p2,c1,c2);const E=withForecasts(queue,()=>calc(cp(c1),cp(c2),cp(p1),cp(p2),turn,sand));if(!Array.isArray(E))return E;const sync=syncOf(E);if(!sync)return E;
  cs.forEach(x=>applyRecipe(E,sync,x));tickRecipeBuff(E,sync);
  for(const side of ['p1','p2']){const m=mash(teamOf(sync,side));if(m&&!m.fainted)nextForecast(m)}
  updateCodex(E);return E;
 };
 window.renderBattleField=function(...a){const r=render(...a);renderForecast('player-sprite',typeof myTeam!=='undefined'?myTeam?.lead:null);renderForecast('enemy-sprite',typeof enemyTeam!=='undefined'?enemyTeam?.lead:null);return r};
 window.openMoveMenu=function(...a){const r=moves(...a),m=typeof myTeam!=='undefined'?myTeam?.lead:null,b=document.getElementById('btn-m1');if(m?.id==='mashiro'&&m.cosmicBigBangReady&&b){const x=recipeFor(m);document.getElementById('m1-name').textContent=x.name;document.getElementById('m1-tag').textContent='환락 · 위력 130 · 명중 90%';document.getElementById('m1-desc').textContent=`${x.desc} 사용 후 관측 기록 초기화.`;b.style.setProperty('--rc',x.color);b.classList.add('cosmic-recipe-ready')}else b?.classList.remove('cosmic-recipe-ready');return r};
 window.triggerSkillVisualAndAudio=function(name,a,t,...rest){const x=RECIPES.find(r=>r.name===name);if(x&&name!==BIG){visual(BIG,a,t,...rest);const id=sprite(t||other(a)),root=document.getElementById(id);if(root){root.animate([{filter:'drop-shadow(0 0 0 transparent)'},{filter:`drop-shadow(0 0 35px ${x.color}) brightness(1.8)`},{filter:'drop-shadow(0 0 0 transparent)'}],{duration:1350,easing:'ease-out'})}return}return visual(name,a,t,...rest)};
 window.playTurnEvents=async function(E){if(!Array.isArray(E))return play(E);return play(E.map(e=>e?.type==='cosmic_recipe'?{...e,type:'msg'}:e))};
}
install();
})();
