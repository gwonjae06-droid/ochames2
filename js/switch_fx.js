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

// Title music and low-frequency-reactive lobby visuals. No combat changes.
(() => {
  'use strict';
  const theme=new Audio('assets/audio/MAIN.mp3');
  theme.loop=true;
  theme.preload='metadata';
  let readyForSound=false;
  const visible=id=>{const el=document.getElementById(id);return !!el&&getComputedStyle(el).display!=='none';};
  const inBattle=()=>visible('battle-screen');
  const lobby=document.getElementById('lobby-panel');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const style=document.createElement('style');
  style.textContent=`
    .music-lobby{position:relative;isolation:isolate;overflow:hidden;--title-beat:0}
    .music-lobby > :not(.title-rune){position:relative;z-index:1}
    .music-lobby .title-rune{position:absolute;z-index:0;pointer-events:none;font:900 clamp(25px,5vw,54px) Georgia,serif;color:#9be5ff;opacity:calc(.06 + var(--title-beat)*.54);text-shadow:0 0 11px #38bdf8,0 0 28px #a855f7;transform:translateY(calc(var(--title-beat)*-11px)) scale(calc(1 + var(--title-beat)*.48));transition:opacity .12s linear,transform .12s linear}
    .music-lobby::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 22% 28%,#38bdf833,transparent 36%),radial-gradient(circle at 83% 70%,#a855f733,transparent 38%);opacity:calc(.18 + var(--title-beat)*.68)}
    body.title-theme-on .top-header h1{transform:translateY(calc(var(--title-beat)*-4px));text-shadow:0 0 16px #38bdf8,0 0 30px #a855f7;transition:transform .12s linear}
    body.title-theme-on .music-lobby .status-badge{transform:translateY(calc(var(--title-beat)*-3px));transition:transform .12s linear}
    .music-lobby button{transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;transform:translateY(calc(var(--title-beat)*-2px))}
    @media(hover:hover){.music-lobby button:hover,body.title-theme-on .top-header button:hover{transform:translateY(-3px) scale(1.055);filter:brightness(1.14);box-shadow:0 8px 24px #38bdf855}}
    .music-lobby button:focus-visible,body.title-theme-on .top-header button:focus-visible{transform:translateY(-3px) scale(1.055);outline:2px solid #a5f3fc;outline-offset:3px}
    @media(prefers-reduced-motion:reduce){.music-lobby .title-rune,.music-lobby button,.music-lobby .status-badge,body.title-theme-on .top-header h1{transition:none!important;transform:none!important}.music-lobby button:hover,body.title-theme-on .top-header button:hover,.music-lobby button:focus-visible{transform:none!important}}
  `;
  document.head.append(style);
  if(lobby){
    lobby.classList.add('music-lobby');
    const marks=['✦','◇','✧','☾','✦','✧','◇','✦','☾'];
    marks.forEach((mark,i)=>{const rune=document.createElement('span');rune.className='title-rune';rune.textContent=mark;rune.setAttribute('aria-hidden','true');rune.style.left=`${[7,20,35,56,76,91,15,63,85][i]}%`;rune.style.top=`${[12,71,32,8,24,64,87,78,45][i]}%`;rune.style.color=i%2?'#c5a7ff':'#9be5ff';lobby.append(rune);});
  }
  let analyser=null,fft=null,frame=0,average=.06,pulse=0,lastBeat=0;
  function wireAnalyser(){
    if(analyser||reduced.matches)return;
    try{const context=typeof initAudio==='function'?initAudio():null;if(!context)return;
      const source=context.createMediaElementSource(theme);
      analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.68;
      source.connect(analyser);analyser.connect(context.destination);
      fft=new Uint8Array(analyser.frequencyBinCount);
    }catch(error){console.warn('타이틀 비트 분석을 사용할 수 없습니다.',error);}
  }
  function animate(now){
    frame=0;
    if(theme.paused||inBattle()||document.hidden||reduced.matches){document.body.classList.remove('title-theme-on');return;}
    let bass=0;
    if(analyser&&fft){analyser.getByteFrequencyData(fft);for(let i=1;i<=6;i++)bass+=fft[i];bass/=6*255;}
    const beat=bass>.13&&bass>average*1.32&&now-lastBeat>190;
    average=average*.98+bass*.02;
    if(beat){lastBeat=now;pulse=1;}else pulse=Math.max(pulse*.87,Math.min(.7,bass*.75));
    const level=pulse.toFixed(3);
    if(lobby)lobby.style.setProperty('--title-beat',level);
    document.body.style.setProperty('--title-beat',level);
    frame=requestAnimationFrame(animate);
  }
  function startVisual(){if(!lobby||reduced.matches||theme.paused||inBattle()||frame)return;document.body.classList.add('title-theme-on');frame=requestAnimationFrame(animate);}
  function stopVisual(){if(frame)cancelAnimationFrame(frame);frame=0;document.body.classList.remove('title-theme-on');pulse=0;if(lobby)lobby.style.setProperty('--title-beat','0');document.body.style.setProperty('--title-beat','0');}
  function volume(){
    try{const s=JSON.parse(localStorage.getItem('ochames2-audio-v2')||'{}');
      const value=Number(s.music);
      theme.volume=s.mute?0:Math.max(0,Math.min(1,Number.isFinite(value)?value:.48))*.62;
    }catch(error){theme.volume=.48*.62;}
  }
  function playTitle(){
    if(inBattle()||document.hidden)return;
    volume();
    theme.play().then(()=>{wireAnalyser();startVisual();}).catch(()=>{});
  }
  function stopTitle(){theme.pause();stopVisual();}
  const start=window.startBattleScreen;
  if(typeof start==='function')window.startBattleScreen=function(...args){stopTitle();return start.apply(this,args);};
  const battleMusic=window.startBattleMusic;
  if(typeof battleMusic==='function')window.startBattleMusic=function(...args){stopTitle();return battleMusic.apply(this,args);};
  const restart=window.restartToLobby;
  if(typeof restart==='function')window.restartToLobby=function(...args){const result=restart.apply(this,args);theme.currentTime=0;playTitle();return result;};
  for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{readyForSound=true;playTitle();},{passive:true});
  for(const type of ['input','change'])document.addEventListener(type,event=>{if(event.target?.closest?.('#audio-settings-modal'))volume();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTitle();else if(readyForSound)playTitle();});
  reduced.addEventListener?.('change',()=>{if(reduced.matches)stopVisual();else startVisual();});
  theme.addEventListener('error',()=>console.warn('타이틀 음악 파일을 불러오지 못했습니다: assets/audio/MAIN.mp3'));
  playTitle();
})();
