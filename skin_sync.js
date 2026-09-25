// PeerJS cosmetic sync: skin identifiers only, never file URLs or gameplay stats.
(() => {
  'use strict';
  const CATALOG={
    storm:{owner:'lee',front:'lee-red.png',back:'lee-red-back.png',color:'#ff3156'},
    bloodmoon:{owner:'bae',front:'bae-bloodmoon.png',back:'bae-bloodmoon-back.png',color:'#ef4444'},
    abyss:{owner:'oh',front:'oh-abyss.png',back:'oh-abyss-back.png',color:'#bb68ee'},
    meteor:{owner:'park',front:'park-meteor.jpg',back:'park-meteor-back.jpg',color:'#fb923c'},
    jackpot:{owner:'choi',front:'choi-jackpot.png',back:'choi-jackpot-back.png',color:'#60a5fa'},
    rift:{owner:'yoon',color:'#e879f9'},jester:{owner:'boingo',color:'#f9a8d4'},
    rewind:{owner:'sungwon_time',color:'#67e8f9'}
  };
  const KEY='ochams-skins-v1';
  let remote={},spectatorP1={},spectatorP2={},sceneToken=0;
  function clean(map){
    const result={};if(!map||typeof map!=='object')return result;
    for(const [id,skin] of Object.entries(map))if(CATALOG[skin]?.owner===id)result[id]=skin;
    return result;
  }
  function own(){
    try{
      const record=JSON.parse(localStorage.getItem(KEY)||'{}');
      const list=new Set(Array.isArray(record.unlocked)?record.unlocked:[]);
      const result={};
      for(const [id,skin] of Object.entries(record.equipped||{}))if(list.has(skin)&&CATALOG[skin]?.owner===id)result[id]=skin;
      return result;
    }catch(error){return {};}
  }
  function attach(packet){
    if(!packet||typeof packet!=='object'||!['battleStart','battleState','executeTurnEvents'].includes(packet.type))return packet;
    return {...packet,cosmeticSkins:{p1:own(),p2:remote}};
  }
  function ingest(data){
    const pairs=data?.cosmeticSkins;if(!pairs||typeof pairs!=='object')return;
    if(typeof isSpectator!=='undefined'&&isSpectator){
      spectatorP1=clean(pairs.p1);spectatorP2=clean(pairs.p2);
    }else remote=clean(isHost?pairs.p2:pairs.p1);
    if(typeof renderBattleField==='function'&&typeof myTeam!=='undefined'&&myTeam&&enemyTeam)renderBattleField();
  }
  function reset(){remote={};spectatorP1={};spectatorP2={};}
  if(typeof window.broadcastData==='function'){
    const original=window.broadcastData;
    window.broadcastData=function(packet){return original.call(this,isHost&&!isAiMode?attach(packet):packet);};
  }
  if(typeof window.makeBattleSnapshot==='function'){
    const original=window.makeBattleSnapshot;
    window.makeBattleSnapshot=function(...args){return attach(original.apply(this,args));};
  }
  if(typeof window.handleIncomingConnection==='function'){
    const original=window.handleIncomingConnection;
    window.handleIncomingConnection=function(channel){
      const result=original.call(this,channel);
      channel.on('data',data=>{
        if(channel!==playerConn||data?.type!=='skinHello')return;
        remote=clean(data.skins);
        if(typeof renderBattleField==='function'&&myTeam&&enemyTeam)renderBattleField();
      });
      return result;
    };
  }
  if(typeof window.setupConnection==='function'){
    const original=window.setupConnection;
    window.setupConnection=function(...args){
      const channel=conn,result=original.apply(this,args);
      channel.on('open',()=>{if(channel===conn&&channel.open)channel.send({type:'skinHello',skins:own()});});
      channel.on('data',data=>{if(channel===conn)ingest(data);});
      return result;
    };
  }
  if(typeof window.setupSpectatorConnection==='function'){
    const original=window.setupSpectatorConnection;
    window.setupSpectatorConnection=function(...args){
      const channel=conn,result=original.apply(this,args);
      channel.on('data',data=>{if(channel===conn)ingest(data);});
      return result;
    };
  }
  if(typeof window.joinRoom==='function'){
    const original=window.joinRoom;
    window.joinRoom=function(...args){reset();return original.apply(this,args);};
  }
  if(typeof window.restartToLobby==='function'){
    const original=window.restartToLobby;
    window.restartToLobby=function(...args){reset();return original.apply(this,args);};
  }
  if(typeof window.startAiMode==='function'){
    const original=window.startAiMode;
    window.startAiMode=function(...args){reset();return original.apply(this,args);};
  }
  function costume(node,mon,skin){
    if(!node||!mon)return;
    const cfg=CATALOG[skin];
    if(!cfg||cfg.owner!==mon.id){
      if(node.dataset.remoteSkin){
        delete node.dataset.skin;delete node.dataset.remoteSkin;
        node.style.removeProperty('--skin-glow');
        const img=node.querySelector('img.champion-art');
        if(img?.dataset.remoteSrc){delete img.dataset.remoteSrc;img.src=`assets/sprites/${mon.id}${node.id==='player-sprite'?'-back':''}.png`;}
      }
      return;
    }
    node.dataset.skin=skin;node.dataset.remoteSkin=skin;node.style.setProperty('--skin-glow',cfg.color);
    const img=node.querySelector('img.champion-art');
    const name=node.id==='player-sprite'?cfg.back:cfg.front;
    if(img&&name){const src=`assets/skins/${name}`;if(img.dataset.remoteSrc!==src||img.getAttribute('src')!==src){img.dataset.remoteSrc=src;img.src=src;}}
  }
  if(typeof window.renderBattleField==='function'){
    const original=window.renderBattleField;
    window.renderBattleField=function(...args){
      const result=original.apply(this,args);
      if(typeof myTeam==='undefined'||!myTeam||!enemyTeam)return result;
      if(isSpectator)costume(document.getElementById('player-sprite'),myTeam.lead,spectatorP1[myTeam.lead.id]);
      costume(document.getElementById('enemy-sprite'),enemyTeam.lead,(isSpectator?spectatorP2:remote)[enemyTeam.lead.id]);
      return result;
    };
  }
  const css=document.createElement('style');
  css.textContent='.remote-skin-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:45}';
  document.head.append(css);
  function effect(skin,name,stage=0){
    const arena=document.getElementById('battle-screen');if(!arena||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const cfg=CATALOG[skin],w=arena.clientWidth,h=arena.clientHeight,d=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;
    let canvas=arena.querySelector('.remote-skin-fx');if(!canvas){canvas=document.createElement('canvas');canvas.className='remote-skin-fx';arena.append(canvas);}
    const seq=++sceneToken;canvas.width=w*d;canvas.height=h*d;
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const major=(skin==='bloodmoon'&&name==='드레인펀치')||(skin==='abyss'&&name==='오물폭탄')||
      (skin==='meteor'&&name==='메테오 스트라이크')||(skin==='storm'&&name==='벽력일섬');
    const ms=major?2800:skin==='jackpot'&&name==='화염방사'?1800:1100,start=performance.now();
    const portrait=cfg.front&&new Image();if(portrait)portrait.src=`assets/skins/${cfg.front}`;
    function tick(now){
      if(seq!==sceneToken||!canvas.isConnected)return;
      let t=Math.min(1,(now-start)/ms);
      ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(5,8,18,.86)';ctx.fillRect(0,0,w,h);
      const glow=(x,y,r,color)=>{const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
      glow(w*.27,h*.47,h*.5,cfg.color);
      if(portrait?.complete&&portrait.naturalWidth){ctx.shadowColor=cfg.color;ctx.shadowBlur=28;ctx.drawImage(portrait,w*.08,h*.17,w*.4,h*.68);ctx.shadowBlur=0;}
      else{ctx.fillStyle=cfg.color;ctx.font='900 34px system-ui';ctx.fillText(skin,w*.12,h*.55);}
      if(skin==='bloodmoon'){
        ctx.beginPath();ctx.arc(w*.28,h*.23,h*.15,0,7);ctx.fillStyle='#bb1c3e';ctx.fill();
        if(t>.42){ctx.strokeStyle='#ffd1d9';ctx.lineWidth=6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w*.75,h*.48);ctx.lineTo(w*(.5+i*.23),i%2?h:0);ctx.stroke();}}
      }else if(skin==='abyss'){
        glow(w*.75,h*.5,(t>.6?t*.45:.1)*w,'#af43da');
        if(t>.62){ctx.fillStyle='#a23ed3aa';ctx.beginPath();ctx.ellipse(w*.75,h*.28,w*.2*t,h*.24*t,0,0,7);ctx.fill();}
      }else if(skin==='meteor'){
        const y=-h*.2+h*.8*t;glow(w*.72,y,110,'#fd953b');ctx.beginPath();ctx.arc(w*.72,y,35,0,7);ctx.fillStyle='#24252f';ctx.fill();
        if(t>.7){ctx.beginPath();ctx.ellipse(w*.73,h*.58,w*.37*(t-.7)/.3,h*.15*(t-.7)/.3,0,0,7);ctx.lineWidth=13;ctx.strokeStyle='#ffb560';ctx.stroke();}
      }else if(skin==='jackpot'){
        const r=Math.max(0,Math.min(6,stage)),color=r>=4?'#9a44e8':r>=2?'#e050ad':'#ff993d';
        glow(w*.73,h*.5,60+r*18,color);ctx.fillStyle=color;
        ctx.beginPath();ctx.moveTo(w*.35,h*.42);ctx.lineTo(w*.9,h*.42-r*10);ctx.lineTo(w*.9,h*.58+r*10);ctx.lineTo(w*.35,h*.58);ctx.fill();
      }else if(skin==='storm'){
        for(let i=0;i<7;i++){ctx.strokeStyle=i%2?'#ff2b52':'#080811';ctx.lineWidth=i%2?5:14;ctx.beginPath();ctx.moveTo(w*(i+.5)/7,0);ctx.lineTo(w*.72+(Math.random()-.5)*80,h*.5);ctx.stroke();}
      }else{
        for(let i=0;i<9;i++)glow(w*(i+.5)/9,h*(.25+.55*t),16+i*3,cfg.color);
      }
      if(t<1)requestAnimationFrame(tick);else if(seq===sceneToken)canvas.remove();
    }
    requestAnimationFrame(tick);
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){
    const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...extra){
      const result=original.call(this,name,side,...extra);
      if(typeof myTeam==='undefined'||!myTeam||!enemyTeam||isAiMode)return result;
      if(extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'))return result;
      const mine=(isHost||isSpectator)?side==='p1':side==='p2';
      const mon=mine?myTeam.lead:enemyTeam.lead;
      const mapping=isSpectator?(mine?spectatorP1:spectatorP2):remote;
      const skin=mapping[mon?.id];
      if(skin)try{effect(skin,name,mon.stages?.spa||0);}catch(error){console.warn('상대 스킨 연출 오류',error);}
      return result;
    };
  }
  if(typeof window.skillCinematicDuration==='function'){
    const original=window.skillCinematicDuration;
    window.skillCinematicDuration=function(name){
      const base=original.call(this,name),mon=typeof enemyTeam!=='undefined'?enemyTeam?.lead:null;
      if(!mon||!remote[mon.id])return base;
      const map={'드레인펀치':2800,'오물폭탄':3100,'메테오 스트라이크':3200,'벽력일섬':2800,'화염방사':1900};
      return Math.max(base,map[name]||1150);
    };
  }
})();