// Cosmetic switch animation for both players, NPCs and spectators.
(() => {
  'use strict';
  const css=document.createElement('style');
  css.textContent=`
    .switch-ghost{position:absolute;z-index:9;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:visible;border-radius:16px;background:var(--switch-glow,#38bdf8);color:white;font:900 12px system-ui;box-shadow:0 0 18px var(--switch-glow,#38bdf8);animation:switchWithdraw .32s ease-in forwards}
    .switch-ghost img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 7px 10px #0009)}
    .char-sprite.switch-arrival{animation:switchArrival .58s cubic-bezier(.18,.8,.3,1) .26s both!important}
    .switch-spark{position:absolute;left:50%;top:50%;z-index:8;width:4px;height:17px;border-radius:999px;background:linear-gradient(white,var(--switch-glow,#38bdf8));box-shadow:0 0 9px var(--switch-glow,#38bdf8);pointer-events:none;animation:switchSpark .6s ease-out both}
    .switch-ring{position:absolute;inset:-12px;z-index:7;border:3px solid var(--switch-glow,#38bdf8);border-radius:50%;box-shadow:0 0 22px var(--switch-glow,#38bdf8);pointer-events:none;animation:switchRing .7s ease-out both}
    @keyframes switchWithdraw{0%{opacity:1;transform:scale(1);filter:brightness(1)}45%{opacity:.9;transform:scale(.72);filter:brightness(2)}100%{opacity:0;transform:scale(.12) translateY(-65px)}}
    @keyframes switchArrival{0%{opacity:0;transform:scale(.25) translateY(30px);filter:brightness(2.8)}70%{opacity:1;transform:scale(1.13);filter:brightness(1.55)}100%{opacity:1;transform:scale(1);filter:none}}
    @keyframes switchSpark{0%{opacity:0;transform:rotate(var(--angle)) translateY(0) scale(.3)}25%{opacity:1}100%{opacity:0;transform:rotate(var(--angle)) translateY(var(--distance)) scale(.65)}}
    @keyframes switchRing{0%{opacity:0;transform:scale(.3)}35%{opacity:.95}100%{opacity:0;transform:scale(1.5)}}
    @media(prefers-reduced-motion:reduce){.switch-ghost{animation:none;display:none}.char-sprite.switch-arrival{animation:none!important}.switch-ring,.switch-spark{animation:none;display:none}}
  `;
  document.head.append(css);
  let last={player:null,enemy:null};
  function color(side){return side==='player'?'#38bdf8':'#f43f5e';}
  function withdraw(side){
    const field=document.getElementById('battle-screen'),node=document.getElementById(`${side}-sprite`);
    if(!field||!node||getComputedStyle(field).display==='none')return;
    const r=node.getBoundingClientRect(),base=field.getBoundingClientRect();
    const ghost=document.createElement('div');ghost.className='switch-ghost';
    ghost.style.left=`${r.left-base.left}px`;ghost.style.top=`${r.top-base.top}px`;
    ghost.style.width=`${r.width}px`;ghost.style.height=`${r.height}px`;
    ghost.style.setProperty('--switch-glow',color(side));ghost.setAttribute('aria-hidden','true');
    const art=node.querySelector('img.champion-art');
    if(art?.getAttribute('src')&&node.dataset.spriteReady==='true'){
      const img=document.createElement('img');img.src=art.currentSrc||art.src;img.alt='';ghost.append(img);
    }else ghost.textContent=node.querySelector('.sprite-label')?.textContent||'';
    field.append(ghost);setTimeout(()=>ghost.remove(),850);
  }
  function arrive(side){
    const node=document.getElementById(`${side}-sprite`);if(!node)return;
    node.style.setProperty('--switch-glow',color(side));
    node.classList.remove('switch-arrival');void node.offsetWidth;node.classList.add('switch-arrival');
    const ring=document.createElement('span');ring.className='switch-ring';ring.setAttribute('aria-hidden','true');node.append(ring);
    const sparks=[];for(let i=0;i<8;i++){const spark=document.createElement('span');spark.className='switch-spark';spark.setAttribute('aria-hidden','true');spark.style.setProperty('--angle',`${i*45}deg`);spark.style.setProperty('--distance',`${-38-i%3*10}px`);node.append(spark);sparks.push(spark);}
    setTimeout(()=>{node.classList.remove('switch-arrival');ring.remove();sparks.forEach(s=>s.remove());},820);
  }
  const render=window.renderBattleField;
  window.renderBattleField=function(...args){
    const current={player:typeof myTeam!=='undefined'?myTeam?.lead?.id:null,
      enemy:typeof enemyTeam!=='undefined'?enemyTeam?.lead?.id:null};
    const changed=Object.keys(current).filter(side=>last[side]&&current[side]&&last[side]!==current[side]);
    for(const side of changed)withdraw(side);
    const result=render.apply(this,args);
    for(const side of changed)arrive(side);
    last=current;
    return result;
  };
  const start=window.startBattleScreen;
  window.startBattleScreen=function(...args){last={player:null,enemy:null};return start.apply(this,args);};
  const restart=window.restartToLobby;
  window.restartToLobby=function(...args){last={player:null,enemy:null};return restart.apply(this,args);};
  const play=window.playTurnEvents;
  window.playTurnEvents=function(events){
    if(!Array.isArray(events))return play.call(this,events);
    const paced=[];
    for(let i=0;i<events.length;i++){
      const ev=events[i];paced.push(ev);
      if(ev?.type==='sync_teams'&&events[i-1]?.type==='switch'){
        const lead=(events[i-1].side==='p1'?ev.p1:ev.p2)?.lead;
        if(lead)paced.push({type:'msg',msg:`${lead.name}이(가) 전장에 등장했다!`});
      }
    }
    return play.call(this,paced);
  };
})();

// Clear Leech Seed from the target when it leaves the field.
(() => {
  'use strict';
  const calculate=window.calculateTurnEvents;
  window.calculateTurnEvents=function(...args){
    const events=calculate.apply(this,args);
    if(!Array.isArray(events))return events;
    const outgoing=new Map();
    for(const ev of events){
      if(ev?.type==='switch'&&ev.newBenchId)outgoing.set(ev.side,ev.newBenchId);
      if(ev?.type==='sync_teams')for(const [side,id] of outgoing){
        const team=side==='p1'?ev.p1:ev.p2;
        for(const mon of [team?.lead,...(team?.bench||[])])if(mon?.id===id)mon.seeded=false;
      }
    }
    return events;
  };
  const forced=window.applyForcedSwitch;
  if(typeof forced==='function')window.applyForcedSwitch=function(side,index){
    const team=side==='p1'?myTeam:enemyTeam,old=team?.lead;
    const result=forced.apply(this,arguments);
    if(result&&old)old.seeded=false;
    return result;
  };
  let lastNpcLead=null;
  const render=window.renderBattleField;
  window.renderBattleField=function(...args){
    if(typeof isAiMode!=='undefined'&&isAiMode&&typeof enemyTeam!=='undefined'&&enemyTeam){
      const current=enemyTeam.lead;
      if(lastNpcLead&&current!==lastNpcLead&&enemyTeam.bench?.includes(lastNpcLead))lastNpcLead.seeded=false;
      lastNpcLead=current;
    }else lastNpcLead=null;
    return render.apply(this,args);
  };
})();
