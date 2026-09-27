// Cosmetic switch animation for both players, NPCs and spectators.
(() => {
  'use strict';
  const css=document.createElement('style');
  css.textContent=`
    .switch-ghost{position:absolute;z-index:9;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:visible;border-radius:16px;background:var(--switch-glow,#38bdf8);color:white;font:900 12px system-ui;box-shadow:0 0 18px var(--switch-glow,#38bdf8);animation:switchWithdraw .32s ease-in forwards}
    .switch-ghost img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 7px 10px #0009)}
    .char-sprite.switch-arrival{animation:switchArrival .58s cubic-bezier(.18,.8,.3,1) .26s both!important}
    .switch-spark{position:absolute;left:50%;top:50%;z-index:8;width:4px;height:17px;border-radius:999px;background:linear-gradient(white,var(--switch-glow,#38bdf8));box-shadow:0 0 18px var(--switch-glow,#38bdf8);pointer-events:none;animation:switchSpark .6s ease-out both}
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

// Keep existing game handlers, but lay out pre-battle navigation in three columns.
(() => {
  'use strict';
  const lobby=document.getElementById('lobby-panel'),entry=document.getElementById('pick-panel'),battle=document.getElementById('battle-screen');
  if(!lobby||!entry||!battle)return;
  lobby.querySelectorAll('.title-rune').forEach(el=>el.remove());
  const aside=document.createElement('aside');aside.className='home-npc-panel';aside.setAttribute('aria-label','NPC 대전');
  const title=document.createElement('h2');title.textContent='🤖 NPC 도전';
  const help=document.createElement('p');help.textContent='왼쪽에서 NPC 대전을 선택한 뒤, 오른쪽에서 엔트리와 도구를 정하세요.';
  const actions=document.createElement('div');actions.className='home-npc-actions';aside.append(title,help,actions);
  const single=lobby.querySelector('.ai-btn:not(.challenge-btn)');
  if(single){const oldRow=single.parentElement;actions.append(single);if(oldRow?.classList.contains('btn-row')&&!oldRow.children.length)oldRow.remove();}
  const challenge=lobby.querySelector('.challenge-btn');if(challenge)actions.append(challenge);
  lobby.before(aside);
  const onlineTitle=document.createElement('h2');onlineTitle.className='home-card-title';onlineTitle.textContent='⚔️ 온라인 전투 참가';lobby.prepend(onlineTitle);
  const entryTitle=document.createElement('h2');entryTitle.className='home-card-title';entryTitle.textContent='🎯 엔트리 · 지닌 도구';entry.prepend(entryTitle);
  const field=document.createElement('div');field.className='home-diamond-field';field.setAttribute('aria-hidden','true');
  for(let i=0;i<40;i++){const gem=document.createElement('span');gem.style.setProperty('--delay',`${-(i%9)*.17}s`);field.append(gem);}document.body.prepend(field);
  const css=document.createElement('style');css.textContent=`
    .home-npc-panel,.home-diamond-field{display:none}
    body.home-layout{width:100%;max-width:1440px;margin:0 auto;display:grid;grid-template-columns:minmax(210px,.8fr) minmax(290px,1.1fr) minmax(350px,1.35fr);gap:18px;align-items:start}
    body.home-layout>.top-header{grid-column:1/-1;grid-row:1;max-width:none;width:100%;position:relative;z-index:2}
    body.home-layout>.home-npc-panel{grid-column:1;grid-row:2;display:flex;flex-direction:column;gap:14px}
    body.home-layout>#lobby-panel{grid-column:2;grid-row:2;max-width:none;width:100%;min-width:0;margin:0}
    body.home-layout>#pick-panel{grid-column:3;grid-row:2;max-width:none;width:100%;min-width:0;margin:0;max-height:calc(100vh - 96px);overflow:auto}
    body.home-layout>.home-npc-panel,body.home-layout>#lobby-panel,body.home-layout>#pick-panel{position:relative;z-index:1;background:rgba(15,27,45,.96);border:1px solid #4d6886;border-radius:16px;padding:18px;box-shadow:0 16px 45px #02061788}
    body.home-layout #pick-panel .pick-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    body.home-layout #pick-panel .skin-entry-btn{display:none!important}
    .home-npc-panel h2,.home-card-title{font-size:17px;color:#93e5ff;margin:0 0 10px;font-weight:900}
    .home-npc-panel p{font-size:12px;line-height:1.6;color:#cbd5e1}
    .home-npc-actions{display:flex;flex-direction:column;gap:10px}
    .home-npc-actions button{width:100%;min-height:46px;flex:none}
    body.home-layout>#lobby-panel::before{display:none}
    body.home-layout #pick-panel.home-wait-mode #pick-grid,body.home-layout #pick-panel.home-wait-mode select{opacity:.55;pointer-events:none}
    body.home-layout #pick-panel.home-wait-mode .home-card-title::after{content:' · 먼저 대전 방식을 선택';font-size:11px;color:#fbbf24}
    body.home-layout .home-diamond-field{display:grid;position:fixed;inset:0;z-index:0;pointer-events:none;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(5,1fr);padding:22px;overflow:hidden}
    .home-diamond-field span{width:clamp(15px,3vw,38px);height:clamp(15px,3vw,38px);align-self:center;justify-self:center;border:2px solid #38bdf8;box-shadow:0 0 14px #38bdf877,inset 0 0 8px #a855f777;opacity:calc(.22 + var(--title-beat,0)*.55);transform:rotate(45deg) translateY(calc(var(--title-beat,0)*-12px));animation:diamondDrift 3.6s ease-in-out infinite alternate;animation-delay:var(--delay)}
    .home-diamond-field span:nth-child(3n){border-color:#c4b5fd;width:clamp(11px,2vw,28px);height:clamp(11px,2vw,28px)}
    @keyframes diamondDrift{from{margin-top:-12px;filter:brightness(.75)}to{margin-top:12px;filter:brightness(1.35)}}
    body.home-layout.title-theme-on .top-header h1{transform:translateY(calc(var(--title-beat,0)*-8px))}
    body.home-layout.title-theme-on #lobby-panel .status-badge,body.home-layout.title-theme-on #lobby-panel #user-nickname{transform:translateY(calc(var(--title-beat,0)*-6px));transition:transform .12s linear}
    body.home-layout.title-theme-on #lobby-panel button,body.home-layout.title-theme-on .home-npc-panel button{transform:translateY(calc(var(--title-beat,0)*-5px));transition:transform .16s ease,filter .16s ease}
    @media(hover:hover){body.home-layout #lobby-panel button:hover,body.home-layout .home-npc-panel button:hover{transform:translateY(-5px) scale(1.08);filter:brightness(1.18);box-shadow:0 10px 30px #38bdf877}}
    @media(max-width:980px){body.home-layout{display:flex;flex-direction:column;gap:12px}body.home-layout>.top-header,body.home-layout>#lobby-panel,body.home-layout>.home-npc-panel,body.home-layout>#pick-panel{width:100%;max-width:660px;margin:0 auto}body.home-layout>#pick-panel{max-height:none}body.home-layout>#lobby-panel{order:1}body.home-layout>.home-npc-panel{order:2}body.home-layout>#pick-panel{order:3}}
    @media(prefers-reduced-motion:reduce){.home-diamond-field span{animation:none!important;transform:rotate(45deg)!important}body.home-layout.title-theme-on #lobby-panel button,body.home-layout.title-theme-on .home-npc-panel button,body.home-layout.title-theme-on .top-header h1,body.home-layout.title-theme-on #lobby-panel .status-badge,body.home-layout.title-theme-on #lobby-panel #user-nickname{transform:none!important;transition:none!important}}
  `;document.head.append(css);
  let modeChosen=false;
  function refresh(){entry.classList.toggle('home-wait-mode',!modeChosen);const ready=document.getElementById('btn-ready');if(ready&&!modeChosen)ready.disabled=true;}
  aside.addEventListener('click',event=>{if(event.target.closest('button')){modeChosen=true;refresh();}},true);
  lobby.addEventListener('click',event=>{if(event.target.closest('button')){modeChosen=true;refresh();}},true);
  const oldUpdate=window.updatePickVisuals;
  if(typeof oldUpdate==='function')window.updatePickVisuals=function(...args){const result=oldUpdate.apply(this,args);refresh();return result;};
  const oldStart=window.startBattleScreen;
  if(typeof oldStart==='function')window.startBattleScreen=function(...args){document.body.classList.remove('home-layout');return oldStart.apply(this,args);};
  const oldRestart=window.restartToLobby;
  if(typeof oldRestart==='function')window.restartToLobby=function(...args){const result=oldRestart.apply(this,args);modeChosen=false;document.body.classList.add('home-layout');refresh();return result;};
  new MutationObserver(()=>{if(getComputedStyle(battle).display!=='none')document.body.classList.remove('home-layout');}).observe(battle,{attributes:true,attributeFilter:['style']});
  document.body.classList.add('home-layout');refresh();
})();
