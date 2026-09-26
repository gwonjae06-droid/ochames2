// Online cosmetic sync plus localized skin accents. Combat calculations are unchanged.
(() => {
  'use strict';
  const TYPES={storm:{owner:'lee',front:'lee-red.png',back:'lee-red-back.png',color:'#ff3156'},bloodmoon:{owner:'bae',front:'bae-bloodmoon.png',back:'bae-bloodmoon-back.png',color:'#ef4444'},abyss:{owner:'oh',front:'oh-abyss.png',back:'oh-abyss-back.png',color:'#c76af4'},meteor:{owner:'park',front:'park-meteor.jpg',back:'park-meteor-back.jpg',color:'#fb923c'},jackpot:{owner:'choi',front:'choi-jackpot.png',back:'choi-jackpot-back.png',color:'#ff995c'},rift:{owner:'yoon',color:'#e879f9'},jester:{owner:'boingo',color:'#f9a8d4'},rewind:{owner:'sungwon_time',color:'#67e8f9'}};
  const KEY='ochams-skins-v1';let remote={},viewP1={},viewP2={},sequence=0;
  function clean(source){const map={};if(!source||typeof source!=='object')return map;for(const [id,skin] of Object.entries(source))if(TYPES[skin]?.owner===id)map[id]=skin;return map;}
  function local(){try{const value=JSON.parse(localStorage.getItem(KEY)||'{}'),unlocked=new Set(value.unlocked||[]),map={};for(const [id,skin] of Object.entries(value.equipped||{}))if(unlocked.has(skin)&&TYPES[skin]?.owner===id)map[id]=skin;return map;}catch(error){return {};}}
  function packet(data){if(!data||!['battleStart','battleState','executeTurnEvents'].includes(data.type))return data;return {...data,cosmeticSkins:{p1:local(),p2:remote}};}
  function receive(data){if(!data?.cosmeticSkins)return;const maps=data.cosmeticSkins;if(isSpectator){viewP1=clean(maps.p1);viewP2=clean(maps.p2);}else remote=clean(isHost?maps.p2:maps.p1);if(myTeam&&enemyTeam)renderBattleField();}
  function reset(){remote={};viewP1={};viewP2={};}
  if(typeof window.broadcastData==='function'){const old=window.broadcastData;window.broadcastData=function(data){return old.call(this,isHost&&!isAiMode?packet(data):data);};}
  if(typeof window.makeBattleSnapshot==='function'){const old=window.makeBattleSnapshot;window.makeBattleSnapshot=function(...args){return packet(old.apply(this,args));};}
  if(typeof window.handleIncomingConnection==='function'){const old=window.handleIncomingConnection;window.handleIncomingConnection=function(peer){const result=old.call(this,peer);peer.on('data',data=>{if(peer!==playerConn||data?.type!=='skinHello')return;remote=clean(data.skins);if(myTeam&&enemyTeam)renderBattleField();});return result;};}
  if(typeof window.setupConnection==='function'){const old=window.setupConnection;window.setupConnection=function(...args){const peer=conn,result=old.apply(this,args);peer.on('open',()=>{if(peer===conn&&peer.open)peer.send({type:'skinHello',skins:local()});});peer.on('data',data=>{if(peer===conn)receive(data);});return result;};}
  if(typeof window.setupSpectatorConnection==='function'){const old=window.setupSpectatorConnection;window.setupSpectatorConnection=function(...args){const peer=conn,result=old.apply(this,args);peer.on('data',data=>{if(peer===conn)receive(data);});return result;};}
  for(const key of ['joinRoom','restartToLobby','startAiMode'])if(typeof window[key]==='function'){const old=window[key];window[key]=function(...args){reset();return old.apply(this,args);};}
  function costume(node,mon,skin){if(!node||!mon)return;const cfg=TYPES[skin],img=node.querySelector('img.champion-art');if(!cfg||cfg.owner!==mon.id){if(node.dataset.remoteSkin){delete node.dataset.skin;delete node.dataset.remoteSkin;node.style.removeProperty('--skin-glow');if(img?.dataset.remoteSrc){delete img.dataset.remoteSrc;img.src=`assets/sprites/${mon.id}${node.id==='player-sprite'?'-back':''}.png`;}}return;}
    node.dataset.skin=skin;node.dataset.remoteSkin=skin;node.style.setProperty('--skin-glow',cfg.color);const file=node.id==='player-sprite'?cfg.back:cfg.front;if(img&&file){const path=`assets/skins/${file}`;if(img.getAttribute('src')!==path){img.dataset.remoteSrc=path;img.src=path;}}}
  const css=document.createElement('style');css.textContent=`
    @media(min-width:601px){.battle-screen{max-width:800px;height:375px}.battle-bottom{max-width:800px}}
    #battle-screen:not([data-skin-scene="major"]) .cinematic-hd,#battle-screen:not([data-skin-scene="major"]) .remote-skin-fx{display:none!important}
    .skin-cinematic{display:none!important}#battle-screen[data-skin-cover="gacha"] .skin-cinematic{display:block!important}
    .skin-accent{--accent:#f43f5e;position:absolute;inset:-16px;z-index:9;pointer-events:none;border-radius:50%;border:3px solid var(--accent);box-shadow:0 0 12px var(--accent),inset 0 0 17px var(--accent);animation:accentPop .75s ease-out both}
    .skin-accent::before,.skin-accent::after{content:'';position:absolute;inset:7%;border-radius:inherit;border:2px dashed var(--accent);filter:drop-shadow(0 0 7px var(--accent));animation:accentSpin .65s ease-out both}
    .skin-accent::after{inset:20%;border-width:4px;animation-direction:reverse}
    .skin-accent[data-kind="slime"]{border-radius:44% 56% 62% 38%;background:radial-gradient(circle at 50% 70%,#ed9cff65,transparent 68%)}
    .skin-accent[data-kind="moon"]{background:radial-gradient(circle at 40% 20%,#df355d9c,transparent 70%)}
    .skin-accent[data-kind="ember"]{background:radial-gradient(circle at 50% 60%,#ff9b4d80,transparent 67%)}
    .skin-accent[data-kind="star"]{background:radial-gradient(circle at 50% 30%,#dbeafe9c,transparent 70%)}
    .skin-accent[data-kind="bolt"]{background:radial-gradient(circle,#f8b4c675,transparent 65%)}
    @keyframes accentPop{0%{opacity:0;scale:.52}28%{opacity:.95;scale:1.05}100%{opacity:0;scale:1.36}}
    @keyframes accentSpin{from{transform:rotate(-35deg)}to{transform:rotate(50deg)}}
    .parasite-marker{position:absolute;right:-8px;top:30%;z-index:12;width:35px;height:42px;pointer-events:none;display:grid;place-items:center;border-radius:60% 45% 60% 40%;background:radial-gradient(circle at 30% 25%,#e9aaff,#7b269d 67%,#25093d);border:2px solid #f3b6ff;box-shadow:0 0 14px #a855f7;font:900 18px system-ui;color:white;animation:parasitePulse 1.1s ease-in-out infinite}
    .parasite-marker::after{content:'기생독';position:absolute;top:100%;white-space:nowrap;background:#341348dd;color:#fff;padding:2px 4px;border-radius:3px;font:900 10px system-ui}
    @keyframes parasitePulse{50%{transform:scale(1.15);filter:brightness(1.35)}}
    @media(prefers-reduced-motion:reduce){.skin-accent,.skin-accent::before,.skin-accent::after,.parasite-marker{animation:none!important}}
  `;document.head.append(css);
  function parasite(node,shown){if(!node)return;let marker=node.querySelector('.parasite-marker');if(shown&&!marker){marker=document.createElement('span');marker.className='parasite-marker';marker.setAttribute('aria-hidden','true');marker.textContent='◉';node.append(marker);}else if(!shown)marker?.remove();}
  function persistent(){if(!myTeam||!enemyTeam)return;const player=document.getElementById('player-sprite'),enemy=document.getElementById('enemy-sprite');if(!player||!enemy)return;
    const bae=player.dataset.skin==='bloodmoon'&&myTeam.lead.id==='bae',enemyBae=enemy.dataset.skin==='bloodmoon'&&enemyTeam.lead.id==='bae';
    player.style.scale=bae?String(1+Math.min(.34,Math.max(0,myTeam.lead.stages?.atk||0)*.07)):'';
    enemy.style.scale=enemyBae?String(1+Math.min(.34,Math.max(0,enemyTeam.lead.stages?.atk||0)*.07)):'';
    parasite(enemy,player.dataset.skin==='abyss'&&myTeam.lead.id==='oh'&&!!enemyTeam.lead.seeded&&!enemyTeam.lead.fainted);
    parasite(player,enemy.dataset.skin==='abyss'&&enemyTeam.lead.id==='oh'&&!!myTeam.lead.seeded&&!myTeam.lead.fainted);
  }
  if(typeof window.renderBattleField==='function'){const old=window.renderBattleField;window.renderBattleField=function(...args){const result=old.apply(this,args);if(!myTeam||!enemyTeam)return result;if(isSpectator)costume(document.getElementById('player-sprite'),myTeam.lead,viewP1[myTeam.lead.id]);costume(document.getElementById('enemy-sprite'),enemyTeam.lead,(isSpectator?viewP2:remote)[enemyTeam.lead.id]);persistent();return result;};}
  function accent(node,skin,name){if(!node)return;const kind=skin==='bloodmoon'?'moon':skin==='abyss'?'slime':skin==='meteor'?'star':skin==='jackpot'?'ember':skin==='storm'?'bolt':skin==='rift'?'star':skin==='jester'?'slime':'star';const el=document.createElement('span');el.className='skin-accent';el.dataset.kind=kind;el.style.setProperty('--accent',TYPES[skin].color);el.setAttribute('aria-hidden','true');node.append(el);setTimeout(()=>el.remove(),820);
    if(skin==='meteor'){node.classList.remove('sprite-charging');void node.offsetWidth;node.classList.add('sprite-charging');setTimeout(()=>node.classList.remove('sprite-charging'),650);}}
  function main(skin,name){return (skin==='bloodmoon'&&name==='드레인펀치')||(skin==='abyss'&&name==='오물폭탄')||(skin==='meteor'&&name==='메테오 스트라이크')||(skin==='jackpot'&&(name==='화염방사'||name==='수능 가챠'))||(skin==='storm'&&name==='벽력일섬');}
  function skinOf(mine,mon){return (mine?document.getElementById('player-sprite')?.dataset.skin:document.getElementById('enemy-sprite')?.dataset.remoteSkin)||null;}
  const portraitArt={};for(const [id,cfg] of Object.entries(TYPES))if(cfg.front){const image=new Image();image.src=`assets/skins/${cfg.front}`;portraitArt[id]=image;}
  function remoteMajor(skin,name){const arena=document.getElementById('battle-screen'),cfg=TYPES[skin];if(!arena||!cfg||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    let canvas=arena.querySelector('.remote-skin-fx');if(!canvas){canvas=document.createElement('canvas');canvas.className='remote-skin-fx';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:45;pointer-events:none';arena.append(canvas);}
    const n=++sequence,w=arena.clientWidth,h=arena.clientHeight,d=Math.min(2,devicePixelRatio||1);canvas.width=w*d;canvas.height=h*d;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);const len=skin==='abyss'||skin==='meteor'?3000:skin==='jackpot'?1800:2600,start=performance.now();
    function draw(now){if(n!==sequence||!canvas.isConnected)return;const t=Math.min(1,(now-start)/len),g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#060817');g.addColorStop(1,cfg.color);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      const image=portraitArt[skin];if(image?.complete&&image.naturalWidth){ctx.shadowColor=cfg.color;ctx.shadowBlur=24;ctx.drawImage(image,w*.07,h*.12,w*.38,h*.74);ctx.shadowBlur=0;}
      ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<28;i++){const a=i*2.399,r=(20+i%8*17)*(1+t),x=w*.74+Math.cos(a)*r,y=h*.5+Math.sin(a)*r*.65;ctx.fillStyle=i%3?'#fff':cfg.color;ctx.globalAlpha=(1-t)*.72;ctx.beginPath();ctx.arc(x,y,2+i%4,0,7);ctx.fill();}ctx.restore();
      if(skin==='bloodmoon'){ctx.fillStyle='#a51e3d';ctx.beginPath();ctx.arc(w*.29,h*.25,h*.15,0,7);ctx.fill();if(t>.45){ctx.strokeStyle='#ffecf0';ctx.lineWidth=6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w*.75,h*.5);ctx.lineTo(w*(.48+i*.23),i%2?h:0);ctx.stroke();}}}
      if(skin==='abyss'&&t>.55){const r=(t-.55)/.45;ctx.fillStyle='#b54de8dd';ctx.beginPath();ctx.ellipse(w*.74,h*(.5-.23*r),w*.25*r+2,h*.23*r+2,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(w*.74,h*(.5-.43*r),w*.32*r+2,h*.12*r+2,0,0,7);ctx.fill();}
      if(skin==='meteor'){const y=-h*.2+h*.77*t;ctx.shadowColor='#ff973e';ctx.shadowBlur=27;ctx.fillStyle='#292d3b';ctx.beginPath();ctx.arc(w*.75,y,37,0,7);ctx.fill();ctx.shadowBlur=0;if(t>.67){ctx.strokeStyle='#ffc17e';ctx.lineWidth=13;ctx.beginPath();ctx.ellipse(w*.74,h*.56,w*.4*(t-.67)/.33,h*.14*(t-.67)/.33,0,0,7);ctx.stroke();}}
      if(skin==='jackpot'){const rank=Math.max(0,Math.min(6,enemyTeam?.lead?.stages?.spa||0));ctx.fillStyle=rank>=3?'#a64fee':'#ff9a50';ctx.beginPath();ctx.moveTo(w*.4,h*.5);ctx.lineTo(w*.94,h*.5-(35+rank*15));ctx.lineTo(w*.94,h*.5+(35+rank*15));ctx.fill();}
      if(skin==='storm'){for(let i=0;i<8;i++){const x=w*(i+.5)/8;ctx.strokeStyle=i%2?'#f94160':'#090b15';ctx.lineWidth=i%2?5:14;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(w*.73+(Math.random()-.5)*90,h*.5);ctx.stroke();}}
      if(t<1)requestAnimationFrame(draw);else if(n===sequence)canvas.remove();}
    requestAnimationFrame(draw);
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){const old=window.triggerSkillVisualAndAudio;window.triggerSkillVisualAndAudio=function(name,side,...extra){
      const mine=(isHost||isSpectator)?side==='p1':side==='p2',mon=mine?myTeam?.lead:enemyTeam?.lead,skin=mon&&skinOf(mine,mon),outcome=!!(extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'));
      const primary=!!(skin&&main(skin,name)&&!outcome),field=document.getElementById('battle-screen');if(field){field.dataset.skinScene=primary?'major':'minor';field.dataset.skinCover=skin==='jackpot'&&name==='수능 가챠'&&!outcome?'gacha':'off';}
      const result=old.call(this,name,side,...extra);if(!skin||!TYPES[skin]||outcome)return result;
      if(!primary){const actor=document.getElementById(mine?'player-sprite':'enemy-sprite'),target=document.getElementById(mine?'enemy-sprite':'player-sprite');
        const focus=/기생독|매혹|도발|자석파|도깨비불|스플래시|사이코 쇼크|흑안개/.test(name)?target:actor;accent(focus,skin,name);}
      else if(!mine&&!isAiMode)try{remoteMajor(skin,name);}catch(error){console.warn('상대 주력기 연출 오류',error);}
      return result;};}
  if(typeof window.skillCinematicDuration==='function'){const old=window.skillCinematicDuration;window.skillCinematicDuration=function(name){const base=old.call(this,name),p=document.getElementById('player-sprite')?.dataset.skin,e=document.getElementById('enemy-sprite')?.dataset.remoteSkin;
      const signature=(p&&main(p,name))||(e&&main(e,name));if(signature)return base;if(['bloodmoon','abyss','meteor','jackpot','storm'].includes(p)||['bloodmoon','abyss','meteor','jackpot','storm'].includes(e))return Math.min(base,850);return base;};}
})();