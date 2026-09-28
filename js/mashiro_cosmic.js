(()=>{
'use strict';

const byId=()=>window.MASHIRO_CELESTIAL_BY_ID||{};
const list=()=>window.MASHIRO_CELESTIALS||[];
const cannonNames=()=>new Set(list().map(c=>c.move.name));
const isOwnSide=side=>(window.isHost||window.isSpectator)?side==='p1':side==='p2';
const spriteForSide=side=>isOwnSide(side)?'player-sprite':'enemy-sprite';
const has=name=>typeof window[name]==='function';

function injectCss(){
 if(document.getElementById('mashiro-cosmic-css-v3'))return;
 const style=document.createElement('style');
 style.id='mashiro-cosmic-css-v3';
 style.textContent=`
 .char-sprite{overflow:visible!important}
 .mashiro-space-card{--cc:#a5b4fc;position:absolute;z-index:30;left:50%;top:-91px;transform:translateX(-50%);width:max-content;max-width:225px;padding:7px 10px;border:1px solid var(--cc);border-radius:11px;background:linear-gradient(135deg,rgba(2,6,23,.97),rgba(30,20,58,.95));box-shadow:0 0 20px color-mix(in srgb,var(--cc) 68%,transparent);color:#fff;text-align:center;font:800 10px/1.3 system-ui;pointer-events:none;text-shadow:0 1px 2px #000}
 .mashiro-space-card b{display:block;color:var(--cc);font-size:13px}.mashiro-space-card small{display:block;color:#e2e8f0}.mashiro-space-card em{display:block;color:#cbd5e1;font:700 9px/1.2 system-ui;margin-top:2px}
 .mashiro-space-card.pop{animation:msPop .9s cubic-bezier(.18,.89,.32,1.28)}
 @keyframes msPop{0%{opacity:0;transform:translateX(-50%) scale(.2) rotate(-12deg);filter:blur(7px)}65%{transform:translateX(-50%) scale(1.13) rotate(2deg)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
 @media(max-width:620px){.mashiro-space-card{top:-76px;max-width:170px;font-size:8px;padding:5px}.mashiro-space-card b{font-size:10px}.mashiro-space-card em{font-size:7px}}
 `;
 document.head.append(style);
}
function renderCard(spriteId,mon,celestialId=null,pop=false){
 const root=document.getElementById(spriteId);if(!root)return;
 let card=root.querySelector('.mashiro-space-card');
 const id=celestialId||mon?.celestial;
 const celestial=byId()[id];
 if(!mon||mon.id!=='mashiro'||mon.fainted||!celestial){card?.remove();return;}
 if(!card){card=document.createElement('div');card.className='mashiro-space-card';root.append(card);pop=true;}
 card.style.setProperty('--cc',celestial.color);
 card.innerHTML=`<b>${celestial.icon} 탐색 완료 · ${celestial.name}</b><small>${celestial.move.name} · ${celestial.move.type} · 위력 ${celestial.move.pwr} · 명중 ${celestial.move.acc}%</small><em>${celestial.effect}</em>`;
 if(pop){card.classList.remove('pop');void card.offsetWidth;card.classList.add('pop');}
}
function center(spriteId){return has('getSpriteCenter')?getSpriteCenter(spriteId):{x:330,y:155};}
function addFx(draw){if(has('addFX'))addFX(draw);}
function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.fill();}
function drawBody(ctx,c,x,y,r,alpha=1){
 ctx.save();ctx.globalAlpha*=alpha;ctx.shadowColor=c.color;ctx.shadowBlur=18;circle(ctx,x,y,r,c.color);ctx.shadowBlur=0;
 const id=c.id;
 if(id==='mercury'){
  for(const q of [[-.35,-.25,.18],[.32,.18,.14],[-.05,.4,.09]])circle(ctx,x+r*q[0],y+r*q[1],r*q[2],'rgba(68,64,60,.45)');
 }else if(id==='venus'){
  ctx.strokeStyle='#fff7c2';ctx.globalAlpha*=.55;ctx.lineWidth=Math.max(2,r*.12);for(let k=-1;k<=1;k++){ctx.beginPath();ctx.arc(x,y+k*r*.25,r*.72,-2.8,-.3);ctx.stroke();}
 }else if(id==='earth'){
  ctx.fillStyle='#22c55e';ctx.beginPath();ctx.ellipse(x-r*.18,y-r*.15,r*.34,r*.17,-.35,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+r*.28,y+r*.23,r*.22,r*.3,.45,0,7);ctx.fill();
 }else if(id==='mars'){
  circle(ctx,x-r*.28,y-r*.2,r*.15,'rgba(127,29,29,.5)');circle(ctx,x+r*.3,y+r*.22,r*.11,'rgba(127,29,29,.45)');
 }else if(id==='jupiter'){
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.clip();for(let k=-3;k<=3;k++){ctx.fillStyle=k%2?'#f5d0a9':'#9a6746';ctx.fillRect(x-r,y+k*r*.25-r*.1,2*r,r*.18);}ctx.fillStyle='#b91c1c';ctx.beginPath();ctx.ellipse(x+r*.35,y+r*.2,r*.24,r*.13,-.15,0,7);ctx.fill();ctx.restore();
 }else if(id==='saturn'||id==='planet'){
  ctx.strokeStyle=c.accent;ctx.lineWidth=Math.max(3,r*.16);ctx.beginPath();ctx.ellipse(x,y,r*1.65,r*.42,-.28,0,7);ctx.stroke();
 }else if(id==='uranus'){
  ctx.strokeStyle=c.accent;ctx.lineWidth=Math.max(2,r*.1);ctx.beginPath();ctx.ellipse(x,y,r*.35,r*1.5,.18,0,7);ctx.stroke();
 }else if(id==='neptune'){
  ctx.strokeStyle='#dbeafe';ctx.lineWidth=Math.max(2,r*.09);ctx.beginPath();ctx.arc(x,y,r*.58,.4,3.4);ctx.stroke();circle(ctx,x+r*.3,y+r*.18,r*.13,'#1e3a8a');
 }else if(id==='comet'){
  const g=ctx.createLinearGradient(x-r*4,y,x+r,y);g.addColorStop(0,'rgba(56,189,248,0)');g.addColorStop(1,c.accent);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-r*4,y-r*.5);ctx.lineTo(x+r*.2,y);ctx.lineTo(x-r*4,y+r*.5);ctx.fill();circle(ctx,x,y,r,c.color);
 }else if(id==='nebula'){
  ctx.globalAlpha*=.3;for(let k=0;k<6;k++){ctx.fillStyle=k%2?c.color:c.accent;ctx.beginPath();ctx.ellipse(x+Math.cos(k)*r*.4,y+Math.sin(k*2)*r*.25,r*1.2,r*.38,k*.55,0,7);ctx.fill();}
 }else if(id==='black_hole'){
  ctx.fillStyle='#020617';circle(ctx,x,y,r,'#020617');ctx.strokeStyle=c.color;ctx.lineWidth=Math.max(4,r*.25);ctx.beginPath();ctx.ellipse(x,y,r*1.45,r*.4,-.35,0,7);ctx.stroke();
 }else if(id==='supernova'){
  ctx.strokeStyle=c.accent;ctx.lineWidth=3;for(let k=0;k<12;k++){const q=k*Math.PI/6;ctx.beginPath();ctx.moveTo(x+Math.cos(q)*r*.7,y+Math.sin(q)*r*.7);ctx.lineTo(x+Math.cos(q)*r*2,y+Math.sin(q)*r*2);ctx.stroke();}circle(ctx,x,y,r*.55,'#fff7c2');
 }
 ctx.restore();
}
function playDiscoveryFx(spriteId,celestialId){
 const celestial=byId()[celestialId];if(!celestial)return;
 const origin=center(spriteId),start=performance.now();
 const stars=Array.from({length:64},(_,k)=>({angle:k*2.399+Math.random()*.25,r:20+Math.random()*185,z:1+Math.random()*2.2}));
 addFx(ctx=>{
  const t=Math.min(1,(performance.now()-start)/1350),fade=t<.82?1:(1-t)/.18;
  ctx.save();ctx.globalAlpha=Math.max(0,fade);ctx.fillStyle=`rgba(2,6,23,${.62*Math.sin(Math.PI*Math.min(1,t*1.2))})`;ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);
  ctx.translate(origin.x,origin.y-20);ctx.rotate(t*.8);
  for(const star of stars){const rr=star.r*(.12+t);circle(ctx,Math.cos(star.angle)*rr,Math.sin(star.angle)*rr*.55,star.z,star.r%4>2?celestial.color:'#fff');}
  ctx.rotate(-t*.8);ctx.strokeStyle=celestial.color;ctx.lineWidth=3;ctx.shadowColor=celestial.accent;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,24+67*t,-1.4,-1.4+Math.PI*2*Math.min(1,t*1.5));ctx.stroke();ctx.shadowBlur=0;
  if(t>.38){const p=(t-.38)/.62;drawBody(ctx,celestial,0,0,(10+25*p)*Math.min(1,p*3),Math.min(1,p*4));}
  ctx.restore();return t<1;
 });
 playDiscoverySound(celestialId);
}
function playDiscoverySound(id){
 if(!has('playTone'))return;
 const bases={mercury:660,venus:523,earth:392,mars:220,jupiter:147,saturn:196,uranus:440,neptune:294,planet:174,comet:784,nebula:330,black_hole:73,supernova:392};
 const b=bases[id]||330;
 playTone(b,id==='black_hole'?'sine':'triangle',.34,.08,null,{delay:0});
 playTone(b*1.5,'sine',.3,.075,null,{delay:.13});
 playTone(b*2,'triangle',.4,.075,null,{delay:.27});
 if(has('playNoise'))playNoise(.42,.045,{filter:'highpass',cutoff:1700,endCutoff:5100});
}
function playCannonSound(id,impact=false){
 if(!has('playTone'))return;
 const bases={mercury:520,venus:210,earth:260,mars:150,jupiter:105,saturn:180,uranus:390,neptune:240,planet:90,comet:720,nebula:315,black_hole:58,supernova:175};
 const b=bases[id]||180;
 playTone(impact?Math.max(48,b*.55):b,impact?'sawtooth':'triangle',impact?.45:.62,impact?.18:.12,impact?42:b*2.4);
 if(has('playNoise'))playNoise(impact?.35:.2,impact?.16:.08,{filter:id==='comet'||id==='mercury'?'highpass':'lowpass',cutoff:id==='comet'?2800:900});
}
function playCannonFx(celestialId,actorId,targetId){
 const c=byId()[celestialId];if(!c)return;
 const a=center(actorId),b=center(targetId),start=performance.now();
 playCannonSound(celestialId,false);
 addFx(ctx=>{
  const t=Math.min(1,(performance.now()-start)/900),p=1-(1-t)**3;
  const x=a.x+(b.x-a.x)*p,y=a.y+(b.y-a.y)*p-Math.sin(Math.PI*p)*(c.id==='comet'?78:30);
  ctx.save();ctx.globalAlpha=1-t*.15;ctx.strokeStyle=c.accent;ctx.shadowColor=c.color;ctx.shadowBlur=22;ctx.lineWidth=c.id==='supernova'?18:9;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.stroke();ctx.shadowBlur=12;
  drawBody(ctx,c,x,y,c.id==='jupiter'||c.id==='saturn'||c.id==='planet'?24:c.id==='supernova'?27:17);
  if(t>.78){const e=(t-.78)/.22;ctx.globalAlpha=1-e;ctx.strokeStyle=c.accent;ctx.lineWidth=7*(1-e);ctx.beginPath();ctx.arc(b.x,b.y,18+75*e,0,7);ctx.stroke();for(let k=0;k<12;k++){const q=k*Math.PI/6;ctx.beginPath();ctx.moveTo(b.x+Math.cos(q)*15,b.y+Math.sin(q)*15);ctx.lineTo(b.x+Math.cos(q)*(25+60*e),b.y+Math.sin(q)*(25+60*e));ctx.stroke();}}
  ctx.restore();return t<1;
 });
 setTimeout(()=>playCannonSound(celestialId,true),690);
}
function phaseShiftFx(actorId,targetId){
 const a=center(actorId),b=center(targetId);if(has('playBuffAuraFX'))playBuffAuraFX(a.x,a.y,'#a5b4fc');if(has('playAfterimageFX'))playAfterimageFX(a.x,a.y,b.x,b.y,'#c4b5fd');
 if(has('playTone')){playTone(180,'sine',.55,.12,1480);playTone(880,'triangle',.3,.07,null,{delay:.16});}
}
function shieldFx(actorId){const a=center(actorId);if(has('playBarrierFX'))playBarrierFX(a.x,a.y);if(has('playBuffAuraFX'))playBuffAuraFX(a.x,a.y,'#818cf8');if(has('playTone'))playTone(130,'sine',.6,.16,45);}
function flashFx(targetId){
 const b=center(targetId),start=performance.now();
 if(has('playPsychicFX'))playPsychicFX(b.x,b.y);if(has('playRankDownFX'))playRankDownFX(b.x,b.y);
 addFx(ctx=>{const t=Math.min(1,(performance.now()-start)/480);ctx.save();ctx.globalAlpha=(1-t)*.85;const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,150*t+15);g.addColorStop(0,'#fff');g.addColorStop(.25,'#fde68a');g.addColorStop(1,'rgba(250,204,21,0)');ctx.fillStyle=g;ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);ctx.restore();return t<1;});
 if(has('playTone')){playTone(480,'sine',.25,.11,1900);playTone(1500,'triangle',.22,.06,null,{delay:.08});}
}
function showDiscovery(side,mon,celestialId,message){
 const spriteId=spriteForSide(side),c=byId()[celestialId];if(!c)return;
 renderCard(spriteId,mon,celestialId,true);playDiscoveryFx(spriteId,celestialId);
 if(message&&has('setBattleMsg'))setBattleMsg(message);
}
window.showMashiroDiscovery=showDiscovery;

function install(){
 if(window.__mashiroCosmicV3||!has('playTurnEvents')||!has('renderBattleField')||!has('openMoveMenu')||!window.MASHIRO_CELESTIALS)return setTimeout(install,30);
 window.__mashiroCosmicV3=true;injectCss();
 const oldRender=window.renderBattleField;
 const oldMoves=window.openMoveMenu;
 const oldVisual=window.triggerSkillVisualAndAudio;
 const oldImpact=window.playSkillCinematicImpactFX;
 const oldPlay=window.playTurnEvents;

 window.renderBattleField=function(...args){const result=oldRender(...args);renderCard('player-sprite',window.myTeam?.lead);renderCard('enemy-sprite',window.enemyTeam?.lead);return result;};
 window.openMoveMenu=function(...args){
  const result=oldMoves(...args),mon=window.myTeam?.lead,foe=window.enemyTeam?.lead;if(!mon)return result;
  mon.moves.forEach((move,i)=>{const tag=document.getElementById(`m${i}-tag`),desc=document.getElementById(`m${i}-desc`);if(!tag)return;const acc=has('getDisplayedAccuracy')?getDisplayedAccuracy(mon,move,foe):move.acc??100;if(!tag.textContent.includes('명중'))tag.textContent+=` · 명중 ${acc}%`;if(mon.id==='mashiro'&&i===1&&BY_ID[mon.celestial]){const c=BY_ID[mon.celestial];document.getElementById('m1-name').textContent=c.move.name;tag.textContent=`${c.move.type} · 위력 ${c.move.pwr} · 명중 ${acc}%`;if(desc)desc.textContent=c.move.desc;}}
  );return result;
 };
 window.triggerSkillVisualAndAudio=function(moveName,actorSide,targetSide,...rest){
  const actorId=spriteForSide(actorSide),targetId=spriteForSide(targetSide||((actorSide==='p1')?'p2':'p1'));
  const celestial=list().find(c=>c.move.name===moveName);
  if(celestial){playCannonFx(celestial.id,actorId,targetId);return;}
  if(moveName==='위상전이'){phaseShiftFx(actorId,targetId);return;}
  if(moveName==='중력방패'){shieldFx(actorId);return;}
  if(moveName==='플래시'){flashFx(targetId);return;}
  return oldVisual(moveName,actorSide,targetSide,...rest);
 };
 window.playSkillCinematicImpactFX=function(moveName,target,...rest){
  if(cannonNames().has(moveName)){if(has('playHitImpactFX'))playHitImpactFX(target.x,target.y,{crit:moveName==='슈퍼노바 버스터',effectiveness:1});return;}
  return oldImpact(moveName,target,...rest);
 };
 window.playTurnEvents=async function(events){
  if(!Array.isArray(events))return oldPlay(events);
  const discoveries=[];
  const filtered=[];
  for(const ev of events){
   if(ev.type==='mashiro_discovery'){discoveries.push({index:filtered.length,event:ev});filtered.push({...ev,type:'mashiro_discovery_marker'});}
   else filtered.push(ev);
  }
  if(!discoveries.length)return oldPlay(events);
  const patched=filtered.map(ev=>ev.type==='mashiro_discovery_marker'?{type:'msg',msg:'__MASHIRO_DISCOVERY__'}:ev);
  let pointer=0;
  const oldSet=window.setBattleMsg;
  window.setBattleMsg=function(message){
   if(message==='__MASHIRO_DISCOVERY__'){
    const item=discoveries[pointer++]?.event;if(item){const mon=isOwnSide(item.side)?window.myTeam?.lead:window.enemyTeam?.lead;showDiscovery(item.side,mon,item.celestial,item.msg);}return;
   }
   return oldSet(message);
  };
  try{return await oldPlay(patched);}finally{window.setBattleMsg=oldSet;}
 };
}
install();
})();
