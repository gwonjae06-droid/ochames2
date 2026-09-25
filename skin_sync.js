// PeerJS sends cosmetic identifiers only; opponent does not need to own a skin.
(() => {
  'use strict';
  const TYPES={
    storm:{owner:'lee',front:'lee-red.png',back:'lee-red-back.png',color:'#ff3156'},
    bloodmoon:{owner:'bae',front:'bae-bloodmoon.png',back:'bae-bloodmoon-back.png',color:'#ef4444'},
    abyss:{owner:'oh',front:'oh-abyss.png',back:'oh-abyss-back.png',color:'#ba68e8'},
    meteor:{owner:'park',front:'park-meteor.jpg',back:'park-meteor-back.jpg',color:'#fb923c'},
    jackpot:{owner:'choi',front:'choi-jackpot.png',back:'choi-jackpot-back.png',color:'#60a5fa'},
    rift:{owner:'yoon',color:'#e879f9'},jester:{owner:'boingo',color:'#f9a8d4'},
    rewind:{owner:'sungwon_time',color:'#67e8f9'}
  };
  let opponent={},viewerP1={},viewerP2={},serial=0;
  function clean(input){const output={};if(!input||typeof input!=='object')return output;
    for(const [id,skin] of Object.entries(input))if(TYPES[skin]?.owner===id)output[id]=skin;return output;}
  function mine(){try{
    const saved=JSON.parse(localStorage.getItem('ochams-skins-v1')||'{}'),owned=new Set(saved.unlocked||[]),map={};
    for(const [id,skin] of Object.entries(saved.equipped||{}))if(owned.has(skin)&&TYPES[skin]?.owner===id)map[id]=skin;
    return map;
  }catch(error){return {};}}
  function decoratePacket(packet){if(!packet||!['battleStart','battleState','executeTurnEvents'].includes(packet.type))return packet;
    return {...packet,cosmeticSkins:{p1:mine(),p2:opponent}};}
  function consume(packet){const map=packet?.cosmeticSkins;if(!map)return;
    if(isSpectator){viewerP1=clean(map.p1);viewerP2=clean(map.p2);}
    else opponent=clean(isHost?map.p2:map.p1);
    if(typeof renderBattleField==='function'&&myTeam&&enemyTeam)renderBattleField();
  }
  function reset(){opponent={};viewerP1={};viewerP2={};}
  if(typeof window.broadcastData==='function'){const original=window.broadcastData;
    window.broadcastData=function(data){return original.call(this,isHost&&!isAiMode?decoratePacket(data):data);};}
  if(typeof window.makeBattleSnapshot==='function'){const original=window.makeBattleSnapshot;
    window.makeBattleSnapshot=function(...args){return decoratePacket(original.apply(this,args));};}
  if(typeof window.handleIncomingConnection==='function'){const original=window.handleIncomingConnection;
    window.handleIncomingConnection=function(peer){const result=original.call(this,peer);
      peer.on('data',data=>{if(peer!==playerConn||data?.type!=='skinHello')return;
        opponent=clean(data.skins);if(myTeam&&enemyTeam)renderBattleField();});return result;};}
  if(typeof window.setupConnection==='function'){const original=window.setupConnection;
    window.setupConnection=function(...args){const peer=conn,result=original.apply(this,args);
      peer.on('open',()=>{if(peer===conn&&peer.open)peer.send({type:'skinHello',skins:mine()});});
      peer.on('data',data=>{if(peer===conn)consume(data);});return result;};}
  if(typeof window.setupSpectatorConnection==='function'){const original=window.setupSpectatorConnection;
    window.setupSpectatorConnection=function(...args){const peer=conn,result=original.apply(this,args);
      peer.on('data',data=>{if(peer===conn)consume(data);});return result;};}
  for(const key of ['joinRoom','restartToLobby','startAiMode'])if(typeof window[key]==='function'){
    const original=window[key];window[key]=function(...args){reset();return original.apply(this,args);};}
  function costume(node,mon,skin){if(!node||!mon)return;
    const cfg=TYPES[skin],img=node.querySelector('img.champion-art');
    if(!cfg||cfg.owner!==mon.id){if(node.dataset.remoteSkin){delete node.dataset.skin;delete node.dataset.remoteSkin;
      node.style.removeProperty('--skin-glow');if(img?.dataset.remoteSrc){delete img.dataset.remoteSrc;img.src=`assets/sprites/${mon.id}${node.id==='player-sprite'?'-back':''}.png`;}}return;}
    node.dataset.skin=skin;node.dataset.remoteSkin=skin;node.style.setProperty('--skin-glow',cfg.color);
    const file=node.id==='player-sprite'?cfg.back:cfg.front;
    if(img&&file){const src=`assets/skins/${file}`;if(img.getAttribute('src')!==src){img.dataset.remoteSrc=src;img.src=src;}}
  }
  if(typeof window.renderBattleField==='function'){const original=window.renderBattleField;
    window.renderBattleField=function(...args){const result=original.apply(this,args);if(!myTeam||!enemyTeam)return result;
      if(isSpectator)costume(document.getElementById('player-sprite'),myTeam.lead,viewerP1[myTeam.lead.id]);
      costume(document.getElementById('enemy-sprite'),enemyTeam.lead,(isSpectator?viewerP2:opponent)[enemyTeam.lead.id]);return result;};}
  const css=document.createElement('style');css.textContent='.remote-skin-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:45}';document.head.append(css);
  const art={};for(const [skin,cfg] of Object.entries(TYPES))if(cfg.front){art[skin]=new Image();art[skin].src=`assets/skins/${cfg.front}`;}
  function signature(skin,move){return (skin==='bloodmoon'&&move==='드레인펀치')||
    (skin==='abyss'&&move==='오물폭탄')||(skin==='meteor'&&move==='메테오 스트라이크')||
    (skin==='jackpot'&&move==='화염방사')||(skin==='storm'&&move==='벽력일섬');}
  function aura(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,1,x,y,Math.max(r,2));
    g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
  function animate(skin,move,spa=0){const arena=document.getElementById('battle-screen');
    if(!arena||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const cfg=TYPES[skin],major=signature(skin,move),w=arena.clientWidth,h=arena.clientHeight,d=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;
    let canvas=arena.querySelector('.remote-skin-fx');if(!canvas){canvas=document.createElement('canvas');canvas.className='remote-skin-fx';arena.append(canvas);}
    canvas.width=w*d;canvas.height=h*d;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const turn=++serial,ms=major?(skin==='abyss'||skin==='meteor'?3100:skin==='jackpot'?1900:2700):950,start=performance.now();
    function draw(now){if(turn!==serial||!canvas.isConnected)return;
      const t=Math.min(1,(now-start)/ms);ctx.clearRect(0,0,w,h);
      if(major){const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#060916');grad.addColorStop(1,skin==='abyss'?'#401653':'#24162a');
        ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
        const image=art[skin];if(image?.complete&&image.naturalWidth){ctx.shadowColor=cfg.color;ctx.shadowBlur=18;
          ctx.drawImage(image,w*.10,h*.14,w*.42,h*.72);ctx.shadowBlur=0;}}
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<25;i++){
        const a=i*2.399,r=(22+i%7*11)*(1+t*3),x=w*.73+Math.cos(a)*r,y=h*.52+Math.sin(a)*r*.65;
        ctx.globalAlpha=(1-t)*(.3+i%4*.13);ctx.fillStyle=cfg.color;ctx.beginPath();ctx.arc(x,y,2+i%3,0,7);ctx.fill();
      }ctx.restore();
      if(skin==='bloodmoon'){
        aura(ctx,w*.3,h*.28,w*.24,'#ed425185');ctx.beginPath();ctx.arc(w*.3,h*.28,h*.15,0,7);ctx.fillStyle='#b12444';ctx.fill();
        if(major&&t>.48){ctx.lineWidth=5;ctx.strokeStyle='#ffdae1';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w*.72,h*.54);ctx.lineTo(w*(.47+i*.21),i%2?h:0);ctx.stroke();}}
      }else if(skin==='abyss'){
        if(major&&t>.55){const p=(t-.55)/.45;aura(ctx,w*.73,h*.52,w*.45*p,'#db59ef');
          ctx.fillStyle='#ba50e9b8';ctx.beginPath();ctx.ellipse(w*.73,h*(.5-.23*p),w*.22*p+3,h*.21*p+3,0,0,7);ctx.fill();}
        else for(let i=0;i<9;i++)aura(ctx,w*(i+.5)/9,h*.8-(i*21+t*70)%80,15,cfg.color);
      }else if(skin==='meteor'){
        if(major){const y=-h*.2+h*.8*t;aura(ctx,w*.74,y,100,'#fd964a');ctx.beginPath();ctx.arc(w*.74,y,30,0,7);ctx.fillStyle='#303440';ctx.fill();
          if(t>.7){ctx.beginPath();ctx.ellipse(w*.74,h*.56,w*.42*(t-.7)/.3,h*.15*(t-.7)/.3,0,0,7);ctx.strokeStyle='#ffbb70';ctx.lineWidth=12;ctx.stroke();}}
      }else if(skin==='jackpot'){
        const rank=Math.max(0,Math.min(6,spa)),color=rank>=4?'#a54cf2':rank>=2?'#e660c4':'#ffae54';
        ctx.globalCompositeOperation='lighter';ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(w*.35,h*.5);
        ctx.lineTo(w*.89,h*.5-(25+rank*14));ctx.lineTo(w*.89,h*.5+(25+rank*14));ctx.fill();
      }else if(skin==='storm'){
        for(let i=0;i<6;i++){const x=w*(i+.5)/6;ctx.beginPath();ctx.moveTo(x,-10);ctx.lineTo(w*.72+(Math.random()-.5)*50,h*.5);
          ctx.strokeStyle=i%2?'#fb3b5c':'#0b0b11';ctx.lineWidth=i%2?5:13;ctx.shadowColor=cfg.color;ctx.shadowBlur=12;ctx.stroke();}
      }else aura(ctx,w*.74,h*.51,70+t*45,cfg.color);
      if(t<1)requestAnimationFrame(draw);else if(turn===serial)canvas.remove();
    }requestAnimationFrame(draw);
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...extra){const result=original.call(this,name,side,...extra);
      if(!myTeam||!enemyTeam||isAiMode||extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'))return result;
      const mine=(isHost||isSpectator)?side==='p1':side==='p2',mon=mine?myTeam.lead:enemyTeam.lead;
      const skin=(isSpectator?(mine?viewerP1:viewerP2):opponent)[mon?.id];
      if(skin)try{animate(skin,name,mon.stages?.spa||0);}catch(error){console.warn('상대 스킨 연출 오류',error);}
      return result;};}
  if(typeof window.skillCinematicDuration==='function'){const original=window.skillCinematicDuration;
    window.skillCinematicDuration=function(name){const base=original.call(this,name),mon=typeof enemyTeam!=='undefined'?enemyTeam?.lead:null;
      const skin=mon&&opponent[mon.id];if(!skin)return base;
      return Math.max(base,signature(skin,name)?(skin==='abyss'||skin==='meteor'?3200:skin==='jackpot'?2000:2800):1050);};}
})();
(() => {
  const style=document.createElement('style');
  style.textContent='.skin-cinematic{display:none!important}#battle-screen[data-skin-cover="gacha"] .skin-cinematic{display:block!important}';
  document.head.append(style);
  if(typeof window.triggerSkillVisualAndAudio==='function'){
    const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...extra){
      const actor=(isHost||isSpectator)?side==='p1':side==='p2';
      const skin=document.getElementById('player-sprite')?.dataset.skin;
      const outcome=extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin');
      const field=document.getElementById('battle-screen');
      if(field)field.dataset.skinCover=actor&&skin==='jackpot'&&name==='수능 가챠'&&!outcome?'gacha':'off';
      return original.call(this,name,side,...extra);
    };
  }
})();