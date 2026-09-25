// ochames2: eight cosmetic skins, NPC challenge, and signature cinematics.
(() => {
  'use strict';
  const KEY='ochams-skins-v1';
  const SKINS={
    storm:{owner:'lee',name:'적뢰',front:'lee-red.png',back:'lee-red-back.png',color:'#f43f5e'},
    rewind:{owner:'sungwon_time',name:'역행',color:'#67e8f9'},
    bloodmoon:{owner:'bae',name:'혈월의 권투사',front:'bae-bloodmoon.png',back:'bae-bloodmoon-back.png',color:'#ef4444'},
    abyss:{owner:'oh',name:'심연의 독술사',front:'oh-abyss.png',back:'oh-abyss-back.png',color:'#a855f7'},
    meteor:{owner:'park',name:'흑철 운석',front:'park-meteor.jpg',back:'park-meteor-back.jpg',color:'#fb923c'},
    jackpot:{owner:'choi',name:'청염 도박사',front:'choi-jackpot.png',back:'choi-jackpot-back.png',color:'#38bdf8'},
    rift:{owner:'yoon',name:'균열의 마녀',color:'#e879f9'},
    jester:{owner:'boingo',name:'심야의 광대',color:'#f9a8d4'}
  };
  const ROUNDS=[
    {name:'단단한 방어선',ids:['park','bae','oh']},
    {name:'혼돈의 마도단',ids:['boingo','choi','yoon']},
    {name:'시간을 넘는 질주',ids:['lee','sungwon_time','park']}
  ];
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){console.warn('스킨 저장 읽기 실패',e);}
  const owned=new Set((Array.isArray(saved.unlocked)?saved.unlocked:[]).filter(id=>SKINS[id]));
  const equipped=saved.equipped&&typeof saved.equipped==='object'?{...saved.equipped}:{};
  let pending=!!saved.pending, active=false, round=0, fxId=0;
  const valid=id=>{const skin=equipped[id];return owned.has(skin)&&SKINS[skin]?.owner===id?skin:null;};
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({claimed:owned.size>0,pending,unlocked:[...owned],equipped}));}catch(e){console.warn('스킨 저장 실패',e);}};
  const css=document.createElement('style');
  css.textContent=`
    .challenge-btn{width:100%;background:#7c3aed!important}
    .skin-entry-btn{width:100%;background:#334155!important}
    .skin-modal{position:fixed;inset:0;z-index:220;background:#050a15e8;display:flex;align-items:center;justify-content:center;padding:14px}
    .skin-box{width:min(460px,100%);max-height:85vh;overflow:auto;background:#17243a;border:1px solid #7dd3fc;border-radius:14px;padding:17px;color:#fff;box-shadow:0 15px 70px #000b}
    .skin-box h2{font-size:17px;color:#a5f3fc;margin:0 0 8px}.skin-box p{font-size:12px;line-height:1.55;color:#cbd5e1;margin:0 0 10px}
    .skin-row{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:8px;margin:7px 0;background:#243550;border:1px solid #4c6682;border-radius:8px;font-size:12px}
    .skin-row button{flex:0 0 auto;min-width:65px}.skin-box .skin-close{width:100%;background:#475569;margin-top:8px}
    .char-sprite[data-skin]{--skin-glow:#f43f5e;filter:drop-shadow(0 0 14px var(--skin-glow))}
    .char-sprite[data-skin]::after{border-color:var(--skin-glow);box-shadow:0 0 18px var(--skin-glow),inset 0 0 13px var(--skin-glow);opacity:.85}
    .pick-portrait[data-skin]{outline:2px solid var(--skin-glow,#f43f5e);box-shadow:0 0 14px var(--skin-glow,#f43f5e)}
    .char-sprite[data-skin="storm"]{--skin-glow:#ff244b}
    .char-sprite[data-skin="storm"]::after{animation:skinStorm .7s steps(3,end) infinite}
    .skin-cloud{position:absolute;inset:-22px;z-index:-1;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse at 25% 36%,#07070fea,transparent 60%),radial-gradient(ellipse at 74% 60%,#17101ce8,transparent 63%);filter:blur(8px);animation:skinCloud 1.9s ease-in-out infinite alternate}
    .skin-spark{position:absolute;inset:-20px;width:calc(100% + 40px);height:calc(100% + 40px);z-index:4;pointer-events:none}
    .skin-cinematic{position:absolute;inset:0;width:100%;height:100%;z-index:18;pointer-events:none}
    @keyframes skinStorm{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.1)}}
    @keyframes skinCloud{from{transform:translate(-6px,2px);opacity:.6}to{transform:translate(6px,-3px);opacity:1}}
    @media(prefers-reduced-motion:reduce){.char-sprite[data-skin]::after,.skin-cloud{animation:none!important}}
  `;
  document.head.appendChild(css);
  const imageOK=new Map();
  function preflight(url){
    if(!imageOK.has(url))imageOK.set(url,new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=url;}));
    return imageOK.get(url);
  }
  function art(node,id,skin){
    const img=node?.querySelector('img.champion-art');if(!img)return;
    const side=node.id==='player-sprite'?'back':'front';
    const file=skin&&SKINS[skin][side];
    const target=file?`assets/skins/${file}`:'';
    if(!target){
      if(img.dataset.skinArt){delete img.dataset.skinArt;img.src=`assets/sprites/${id}${side==='back'?'-back':''}.png`;}
      return;
    }
    if(img.dataset.skinArt===target&&img.getAttribute('src')===target)return;
    preflight(target).then(ok=>{
      if(!ok||!node.isConnected||node.dataset.character!==id||node.dataset.skin!==skin)return;
      const current=node.querySelector('img.champion-art');
      if(current!==img)return;
      img.dataset.skinArt=target;
      if(img.getAttribute('src')!==target)img.src=target;
    });
  }
  let ambientTimer=null;
  function ambient(){
    const sprite=document.getElementById('player-sprite');
    const canvas=sprite?.querySelector('.skin-spark');
    if(!canvas||typeof myTeam==='undefined'||myTeam?.lead?.id!=='lee'||valid('lee')!=='storm'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;canvas.width=w*d;canvas.height=h*d;
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(d,d);
    for(let i=0;i<5;i++){
      const a=Math.random()*Math.PI*2,x=w/2+Math.cos(a)*w*.32,y=h/2+Math.sin(a)*h*.32;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(Math.random()-.5)*20,y-12);ctx.lineTo(x+(Math.random()-.5)*23,y-23);
      ctx.strokeStyle=i===0?'#100813':'#ff365c';ctx.lineWidth=2.5;ctx.shadowColor='#ff123c';ctx.shadowBlur=8;ctx.stroke();
    }
  }
  function paint(){
    const lead=typeof myTeam!=='undefined'?myTeam?.lead:null;
    const sprite=document.getElementById('player-sprite');
    if(sprite){
      const skin=lead?valid(lead.id):null;
      if(skin){sprite.dataset.skin=skin;sprite.style.setProperty('--skin-glow',SKINS[skin].color);}
      else{delete sprite.dataset.skin;sprite.style.removeProperty('--skin-glow');}
      if(lead)art(sprite,lead.id,skin);
      let cloud=sprite.querySelector('.skin-cloud'),spark=sprite.querySelector('.skin-spark');
      if(skin==='storm'){
        if(!cloud){cloud=document.createElement('span');cloud.className='skin-cloud';sprite.append(cloud);}
        if(!spark){spark=document.createElement('canvas');spark.className='skin-spark';sprite.append(spark);}
        if(!ambientTimer)ambientTimer=setInterval(ambient,180);
      }else{cloud?.remove();spark?.remove();if(ambientTimer){clearInterval(ambientTimer);ambientTimer=null;}}
    }
    if(typeof POKEDEX==='undefined')return;
    for(const id of Object.keys(POKEDEX)){
      const portrait=document.querySelector(`#card-${id} .pick-portrait`);if(!portrait)continue;
      const skin=valid(id);
      if(skin){portrait.dataset.skin=skin;portrait.style.setProperty('--skin-glow',SKINS[skin].color);}
      else{delete portrait.dataset.skin;portrait.style.removeProperty('--skin-glow');}
      art(portrait,id,skin);
    }
  }
  function modal(title,description){
    const shade=document.createElement('div');shade.className='skin-modal';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
    const box=document.createElement('div');box.className='skin-box';
    const h=document.createElement('h2');h.textContent=title;
    const p=document.createElement('p');p.textContent=description;
    box.append(h,p);shade.append(box);document.body.append(shade);
    const close=document.createElement('button');close.type='button';close.className='skin-close';close.textContent='닫기';close.onclick=()=>shade.remove();
    return{shade,box,close};
  }
  function row(box,text,buttonText,act){
    const line=document.createElement('div');line.className='skin-row';
    const label=document.createElement('span');label.textContent=text;
    const button=document.createElement('button');button.type='button';button.textContent=buttonText;button.onclick=act;
    line.append(label,button);box.append(line);
  }
  function reward(){
    if(!pending||document.querySelector('.skin-modal'))return;
    const available=Object.entries(SKINS).filter(([id])=>!owned.has(id));
    if(!available.length){pending=false;save();return;}
    const{shade,box,close}=modal('🏆 3연전 승리 보상','아직 없는 스킨 하나를 고르세요. 능력치와 기술 판정은 변하지 않습니다.');
    for(const[id,skin]of available)row(box,`${POKEDEX[skin.owner]?.name||skin.owner} · ${skin.name}`,'받기',()=>{
      owned.add(id);equipped[skin.owner]=id;pending=false;save();paint();shade.remove();
      const msg=document.getElementById('battle-msg');if(msg)msg.textContent=`${skin.name} 스킨을 해금하고 장착했습니다!`;
    });
    box.append(close);
  }
  function wardrobe(){
    const{shade,box,close}=modal('🎨 스킨 보관함','스킨은 전용 캐릭터에게만 장착됩니다. 이 브라우저에 저장됩니다.');
    if(!owned.size){const p=document.createElement('p');p.textContent='3연전을 이기면 스킨 하나를 고를 수 있습니다.';box.append(p);}
    for(const id of owned){const skin=SKINS[id];row(box,`${POKEDEX[skin.owner]?.name||skin.owner} · ${skin.name}`,valid(skin.owner)===id?'해제':'장착',()=>{
      if(valid(skin.owner)===id)delete equipped[skin.owner];else equipped[skin.owner]=id;
      save();paint();shade.remove();wardrobe();
    });}
    box.append(close);
  }
  const lobby=document.getElementById('lobby-panel');
  if(lobby&&typeof window.startAiMode==='function'){
    const normal=window.startAiMode;
    window.startAiMode=function(...args){active=false;round=0;return normal.apply(this,args);};
    const btn=document.createElement('button');btn.type='button';btn.className='ai-btn challenge-btn';btn.textContent='🏆 NPC 3연전 도전';lobby.append(btn);
    btn.onclick=()=>{active=true;round=1;normal();const s=document.getElementById('net-status');if(s)s.textContent=`NPC 3연전 · 1/3: ${ROUNDS[0].name}`;};
  }
  const picks=document.getElementById('pick-panel');
  if(picks){const btn=document.createElement('button');btn.type='button';btn.className='skin-entry-btn';btn.textContent='🎨 스킨 보관함';btn.onclick=wardrobe;picks.append(btn);}
  function opponent(n){const ids=ROUNDS[n-1].ids;return{lead:buildMon(ids[0],ids[0]==='sungwon_time'?'high':null),bench:ids.slice(1).map(id=>buildMon(id,id==='sungwon_time'?'high':null))};}
  function player(){const ids=myPickList;return{lead:buildMon(ids[0],ids[0]==='sungwon_time'?sungwonSelectedForm:null),bench:ids.slice(1).map(id=>buildMon(id,id==='sungwon_time'?sungwonSelectedForm:null))};}
  if(typeof window.confirmTeam==='function'){
    const original=window.confirmTeam;
    window.confirmTeam=function(...args){
      if(!active||!isAiMode)return original.apply(this,args);
      if(myPickList.length!==3){alert('캐릭터 3명을 선택해 주세요.');return;}
      myTeam=player();enemyTeam=opponent(round);startBattleScreen();
    };
  }
  if(typeof window.showGameOverMenu==='function'){
    const original=window.showGameOverMenu;
    window.showGameOverMenu=function(outcome){
      const finished=matchEnded,result=original.call(this,outcome);
      if(finished||!active||!isAiMode)return result;
      const menu=document.getElementById('menu-gameover');
      if(outcome==='win'&&round<3&&menu){
        const next=document.createElement('button');next.type='button';next.className='btn-restart';
        next.textContent=`다음 경기 (${round+1}/3): ${ROUNDS[round].name}`;
        next.onclick=()=>{round++;myTeam=player();enemyTeam=opponent(round);startBattleScreen();};menu.append(next);
      }else{
        if(outcome==='win'&&owned.size<Object.keys(SKINS).length){pending=true;save();reward();}
        active=false;round=0;
      }
      return result;
    };
  }
  if(typeof window.restartToLobby==='function'){
    const original=window.restartToLobby;
    window.restartToLobby=function(...args){active=false;round=0;const result=original.apply(this,args);paint();return result;};
  }
  if(typeof window.renderBattleField==='function'){
    const original=window.renderBattleField;
    window.renderBattleField=function(...args){const result=original.apply(this,args);paint();return result;};
  }
  if(typeof window.updatePickVisuals==='function'){
    const original=window.updatePickVisuals;
    window.updatePickVisuals=function(...args){const result=original.apply(this,args);paint();return result;};
  }
  let audio;
  document.addEventListener('pointerdown',()=>{try{const C=window.AudioContext||window.webkitAudioContext;if(C){audio||=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});}}catch(e){}},{passive:true});
  function boom(power=1){
    if(!audio)return;
    try{
      const t=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain();osc.type='sawtooth';
      osc.frequency.setValueAtTime(170*power,t);osc.frequency.exponentialRampToValueAtTime(35,t+.44);
      g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.16,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.46);
      osc.connect(g).connect(audio.destination);osc.start(t);osc.stop(t+.47);
    }catch(e){console.warn('스킨 컷신 소리 오류',e);}
  }
  const signature={
    bae:{'드레인펀치':'punch'},oh:{'오물폭탄':'toxic'},park:{'메테오 스트라이크':'ride'},
    choi:{'수능 가챠':'roulette'},yoon:{'사이코 쇼크':'rift'},boingo:{'스플래시 매직':'cards','익스트림 카오스':'cards'},
    sungwon_time:{'되감기':'clock','빨리감기':'clock','되감기 / 빨리감기':'clock'},lee:{'롱레인지 찌르기':'lightning','벽력일섬':'lightning','전기자석파':'lightning','충전':'lightning'}
  };
  function line(ctx,x1,y1,x2,y2,color,width){
    ctx.beginPath();ctx.moveTo(x1,y1);
    for(let i=1;i<10;i++){let t=i/10;ctx.lineTo(x1+(x2-x1)*t+(Math.random()-.5)*24,y1+(y2-y1)*t+(Math.random()-.5)*20);}
    ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
  }
  function cutscene(kind,skin,name){
    const field=document.getElementById('battle-screen');
    if(!field||getComputedStyle(field).display==='none')return;
    boom(kind==='ride'||kind==='toxic'||kind==='punch'?1.6:1);
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const token=++fxId;
    let c=field.querySelector('.skin-cinematic');
    if(!c){c=document.createElement('canvas');c.className='skin-cinematic';c.setAttribute('aria-hidden','true');field.append(c);}
    const w=field.clientWidth,h=field.clientHeight,d=Math.min(devicePixelRatio||1,2);
    c.width=w*d;c.height=h*d;
    const ctx=c.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const duration={ride:1900,toxic:1900,punch:1600,roulette:1800,rift:1200,cards:1100,clock:1100,lightning:1100}[kind];
    const start=performance.now();
    const player=field.querySelector('#player-sprite img.champion-art');
    function frame(now){
      if(token!==fxId||!c.isConnected)return;
      const t=Math.min(1,(now-start)/duration), ex=w*.75,ey=h*.47,px=w*.2,py=h*.72;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle=kind==='toxic'?'rgba(18,5,25,.86)':kind==='roulette'?'rgba(2,14,32,.86)':'rgba(4,7,18,.78)';ctx.fillRect(0,0,w,h);
      const glow=(x,y,r,color)=>{const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);};
      if(kind==='ride'){
        const descend=t<.4?t/.4:Math.min(1,(t-.4)/.6), mx=ex-(1-descend)*w*.35,my=-h*.25+descend*ey;
        glow(mx,my,90,'#f97316');ctx.fillStyle='#2b303b';ctx.beginPath();ctx.arc(mx,my,35+15*t,0,Math.PI*2);ctx.fill();
        for(let i=0;i<7;i++)line(ctx,mx-25+i*7,my+30,mx-50+i*14,my+70,'#fb923c',2);
        const jump=t<.34?t/.34:1;
        if(player?.complete&&player.naturalWidth)ctx.drawImage(player,px+(mx-px)*jump-25,py+(my-py-42)*jump-28,55,55);
        else{ctx.fillStyle='#e2e8f0';ctx.fillRect(px+(mx-px)*jump-8,py+(my-py-42)*jump-18,16,28);}
        if(t>.76){glow(ex,ey,120*(t-.76)/.24,'#ffba65');ctx.strokeStyle='#ffe4b5';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ex,ey,190*(t-.76)/.24,0,Math.PI*2);ctx.stroke();}
      }else if(kind==='toxic'){
        const fall=Math.min(1,t/.56),x=ex,y=-30+(ey+30)*fall*fall;
        if(t<.56){glow(x,y,36,'#b826ed');ctx.fillStyle='#9d35d5';ctx.beginPath();ctx.arc(x,y,15,0,7);ctx.fill();}
        else{const r=(t-.56)/.44;glow(ex,ey,130*r,'#bb39fc');ctx.fillStyle=`rgba(124,37,164,${1-r*.6})`;
          ctx.beginPath();ctx.ellipse(ex,ey-45*r,55*r+6,75*r+5,0,0,7);ctx.fill();
          ctx.beginPath();ctx.ellipse(ex,ey-100*r,90*r+6,40*r+5,0,0,7);ctx.fill();
          ctx.fillStyle='#21082b';ctx.fillRect(ex-18*r,ey-75*r,36*r,75*r);
          ctx.fillStyle='#06060d';ctx.fillRect(px-8,py-25,16,25);ctx.beginPath();ctx.arc(px,py-30,8,0,7);ctx.fill();}
      }else if(kind==='punch'){
        const l=Math.min(1,t*2.4);line(ctx,px,py,px+(ex-px)*l,py+(ey-py)*l,'#fd8295',18);
        if(t>.37){let r=(t-.37)/.63;glow(ex,ey,120*r,'#f02c52');for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(ex,ey,(40+i*75)*r,0,7);ctx.strokeStyle=i?'#ffc6cf':'#fff5ef';ctx.lineWidth=7-i;ctx.stroke();}}
      }else if(kind==='roulette'){
        const cx=w/2,cy=h/2,R=Math.min(h*.36,w*.22),n=10,angle=(1-t)*t*18;
        for(let i=0;i<n;i++){ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,angle+i*2*Math.PI/n,angle+(i+1)*2*Math.PI/n);ctx.closePath();ctx.fillStyle=i%2?'#096888':'#f7bc35';ctx.fill();ctx.strokeStyle='#e0f2fe';ctx.stroke();}
        ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx,cy-R-18);ctx.lineTo(cx-12,cy-R-40);ctx.lineTo(cx+12,cy-R-40);ctx.fill();glow(cx,cy,R*.6,'#ffe280');
      }else if(kind==='rift'){
        for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(ex,ey,(15+i*16)*t+4,(50+i*9)*t+4,t*3+i,0,7);ctx.strokeStyle=i%2?'#db74f6':'#621a9d';ctx.lineWidth=4;ctx.stroke();}
      }else if(kind==='cards'){
        for(let i=0;i<9;i++){const x=px+(ex-px)*t+i*19-70,y=py+(ey-py)*t+Math.sin(t*9+i)*28;
          ctx.save();ctx.translate(x,y);ctx.rotate(t*4+i);ctx.fillStyle=i%2?'#f9a8d4':'#e2e8f0';ctx.fillRect(-12,-18,24,36);ctx.fillStyle='#7e124b';ctx.font='18px serif';ctx.fillText('♠',-8,7);ctx.restore();}
      }else if(kind==='clock'){
        for(let i=0;i<3;i++){let r=35+i*22;ctx.beginPath();ctx.arc(ex,ey,r,0,7);ctx.strokeStyle='#67e8f9';ctx.lineWidth=3;ctx.stroke();}
        line(ctx,ex,ey,ex+60*Math.cos(t*15),ey+60*Math.sin(t*15),'#e0f2fe',3);
      }else if(kind==='lightning'){
        for(let i=0;i<8;i++){let x=(i/7)*w+(Math.random()-.5)*w*.15;
          line(ctx,x,-20,ex+(Math.random()-.5)*75,ey+(Math.random()-.5)*55,'#110910',15);
          line(ctx,x,-20,ex+(Math.random()-.5)*32,ey+(Math.random()-.5)*26,'#ff3156',5);}
        glow(ex,ey,50,'#ffecf1');
      }
      if(t<1)requestAnimationFrame(frame);else if(token===fxId)c.remove();
    }
    requestAnimationFrame(frame);
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){
    const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...rest){
      const result=original.call(this,name,side,...rest);
      const mine=!isSpectator&&(isHost?side==='p1':side==='p2');
      const mon=mine?myTeam?.lead:null,skin=mon&&valid(mon.id);
      const kind=skin&&signature[mon.id]?.[name];
      if(kind&&!Object.prototype.hasOwnProperty.call(rest[1]||{},'isGachaWin')){
        try{cutscene(kind,skin,name);}catch(e){console.warn('스킨 컷신 오류',e);}
      }
      return result;
    };
  }
  if(typeof window.skillCinematicDuration==='function'){
    const original=window.skillCinematicDuration;
    window.skillCinematicDuration=function(name){
      const base=original.call(this,name),mon=typeof myTeam!=='undefined'?myTeam?.lead:null;
      if(!mon||!valid(mon.id)||!signature[mon.id]?.[name])return base;
      return Math.max(base,{'드레인펀치':1650,'오물폭탄':1950,'메테오 스트라이크':1950,'수능 가챠':1850}[name]||1200);
    };
  }
  paint();if(pending)queueMicrotask(reward);
})();
