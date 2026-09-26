// One skin-cinematic renderer for both players. Coordinates always come from the acting sprite.
(() => {
  'use strict';
  const defs={
    bloodmoon:{owner:'bae',move:'드레인펀치',kind:'punch',color:'#f34363',image:'bae-bloodmoon.png',ms:2300},
    abyss:{owner:'oh',move:'오물폭탄',kind:'sludge',color:'#ce64f5',image:'oh-abyss.png',ms:2700},
    meteor:{owner:'park',move:'메테오 스트라이크',kind:'meteor',color:'#ffab63',image:'park-meteor.jpg',ms:2800},
    jackpot:{owner:'choi',move:'화염방사',kind:'flame',color:'#ff914f',image:'choi-jackpot.png',ms:1700},
    storm:{owner:'lee',move:'벽력일섬',kind:'thunder',color:'#ff3b58',image:'lee-red.png',ms:2400},
    rift:{owner:'yoon',move:'사이코 쇼크',kind:'psychic',color:'#de89f5',ms:1700},
    jester:{owner:'boingo',move:'익스트림 카오스',kind:'chaos',color:'#f88ac7',ms:1700},
    rewind:{owner:'sungwon_time',move:'되감기 / 빨리감기',kind:'clock',color:'#80e5f5',ms:1700}
  };
  const portraits={};
  for(const [key,def] of Object.entries(defs))if(def.image){const image=new Image();image.src=`assets/skins/${def.image}`;portraits[key]=image;}
  let context,sceneId=0,lastCast=null;
  document.addEventListener('pointerdown',()=>{
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){context||=new Audio();if(context.state==='suspended')context.resume().catch(()=>{});}}
    catch(error){console.warn('스킨 음향 준비 오류',error);}
  },{passive:true});
  function sound(kind,impact=false){
    if(!context)return;
    try{
      const t=context.currentTime;
      const frequencies={punch:[170,48],sludge:[390,72],meteor:[115,34],flame:[280,85],thunder:[480,52],roulette:[620,230],psychic:[530,170],chaos:[270,95],clock:[800,320]};
      const pair=frequencies[kind]||[210,55],duration=impact ? 0.38 : 0.48;
      const o=context.createOscillator(),gain=context.createGain();o.type=kind==='clock'||kind==='psychic'?'sine':'sawtooth';
      o.frequency.setValueAtTime(pair[0]*(impact?1.15:1),t);o.frequency.exponentialRampToValueAtTime(pair[1],t+duration);
      gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(impact?.10:.055,t+.018);
      gain.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(gain).connect(context.destination);o.start(t);o.stop(t+duration+.02);
      if(impact||kind==='flame'||kind==='thunder'){
        const length=Math.floor(context.sampleRate*.38),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/length*5);
        const noise=context.createBufferSource(),filter=context.createBiquadFilter(),ng=context.createGain();
        noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=impact?950:kind==='flame'?2400:1300;
        ng.gain.value=impact?.09:.045;noise.connect(filter).connect(ng).connect(context.destination);noise.start(t);noise.stop(t+.38);
      }
    }catch(error){console.warn('스킨 음향 재생 오류',error);}
  }
  const cap=(v,a,b)=>Math.min(b,Math.max(a,v));
  const ease=x=>1-Math.pow(1-cap(x,0,1),3);
  function center(el,arena){const b=el.getBoundingClientRect(),a=arena.getBoundingClientRect();return{x:b.left-a.left+b.width/2,y:b.top-a.top+b.height/2};}
  function glow(ctx,x,y,r,color,a=1){if(r<2)return;const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.save();ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
  function portrait(ctx,skin,x,y,size,a){const image=portraits[skin];if(!image?.complete||!image.naturalWidth)return;
    ctx.save();ctx.globalAlpha=a;ctx.shadowColor=defs[skin].color;ctx.shadowBlur=25;ctx.drawImage(image,x-size/2,y-size/2,size,size);ctx.restore();}
  function particles(ctx,w,h,t,x,y,color,count=26){ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<count;i++){const angle=i*2.399,r=(15+i%8*12)*(1+t*1.7),px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.75;
      ctx.fillStyle=i%4===0?'#fff':color;ctx.globalAlpha=cap((1-t)*(.4+i%5*.1),0,1);ctx.beginPath();ctx.arc(px,py,2+i%3,0,7);ctx.fill();}ctx.restore();}
  function bolt(ctx,x1,y1,x2,y2,color,width,phase=0){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=width*3;
    ctx.beginPath();ctx.moveTo(x1,y1);for(let i=1;i<10;i++){const t=i/10,j=Math.sin(i*17+phase*29)*19;ctx.lineTo(x1+(x2-x1)*t+j,y1+(y2-y1)*t+Math.cos(i*13+phase*17)*13);}ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function skinMove(skin,name,mon){const def=defs[skin];if(!def||def.owner!==mon?.id)return null;
    if(skin==='jackpot'&&name==='수능 가챠')return{...def,kind:'roulette',ms:1800};
    if(skin==='rewind'&&['되감기','빨리감기'].includes(name))return def;
    if(skin==='storm'&&name==='벽력일섬'&&mon.nikaTurns<=0)return null;
    return name===def.move?def:null;
  }
  function render(kind,skin,actor,target,mon){
    const arena=document.getElementById('battle-screen');if(!arena||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const key=++sceneId,def=defs[skin],w=arena.clientWidth,h=arena.clientHeight,dpr=Math.min(2,devicePixelRatio||1);
    if(!w||!h)return;
    let canvas=arena.querySelector('.unified-skin-fx');if(!canvas){canvas=document.createElement('canvas');canvas.className='unified-skin-fx';canvas.setAttribute('aria-hidden','true');arena.append(canvas);}
    canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const a=center(actor,arena),b=center(target,arena),dir=Math.sign(b.x-a.x)||1,start=performance.now();
    const length=kind==='roulette'?1800:def.ms,heading=kind==='roulette'?'수능 가챠':def.move;
    function frame(now){if(key!==sceneId||!canvas.isConnected)return;
      const t=cap((now-start)/length,0,1),sky=ctx.createLinearGradient(0,0,w,h);
      ctx.clearRect(0,0,w,h);sky.addColorStop(0,'#070b1d');sky.addColorStop(1,skin==='abyss'?'#342052':skin==='meteor'?'#293147':'#22182c');
      ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#dbeafe';for(let i=0;i<27;i++)ctx.fillRect((i*97)%w,(i*i*47)%h,1+i%2,1+i%2);ctx.restore();
      ctx.fillStyle='#f8fafc';ctx.font=`900 ${cap(w*.022,12,18)}px system-ui`;ctx.textAlign='left';ctx.fillText(heading,17,27);
      const imageX=cap(a.x-dir*w*.03,w*.17,w*.83);
      if(kind!=='flame')portrait(ctx,skin,imageX,h*.57,Math.min(h*.72,w*.37),cap(t*5,0,1));
      const dx=b.x-a.x,dy=b.y-a.y;
      if(kind==='punch'){
        glow(ctx,a.x,a.y-h*.25,h*.36,'#df334f',.75);ctx.fillStyle='#a31d3a';ctx.beginPath();ctx.arc(a.x,a.y-h*.25,h*.15,0,7);ctx.fill();
        const p=ease((t-.29)/.47),x=a.x+dx*p,y=a.y+dy*p;
        if(t>.29){glow(ctx,x,y,w*.19,'#ff5770',.68);ctx.save();ctx.translate(x,y);ctx.rotate(dir*.18);ctx.fillStyle='#f44160';
          ctx.beginPath();ctx.ellipse(0,0,w*.11,h*.12,0,0,7);ctx.fill();for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse((i-1.5)*w*.045,-h*.11,w*.026,h*.055,0,0,7);ctx.fill();}ctx.restore();}
        if(t>.73){let gap=Math.sin(Math.PI*cap((t-.73)/.27,0,1))*w*.05;
          ctx.lineWidth=5;ctx.strokeStyle='#ffe4e6';for(let i=0;i<3;i++){const theta=-Math.PI/2+i*Math.PI*2/3;
            ctx.beginPath();ctx.moveTo(b.x+Math.cos(theta)*gap,b.y+Math.sin(theta)*gap);
            ctx.lineTo(b.x+Math.cos(theta)*w,b.y+Math.sin(theta)*h);ctx.stroke();}}
      }else if(kind==='sludge'){
        ctx.fillStyle='#7623a977';ctx.beginPath();ctx.ellipse(a.x,h*.97,w*.39,h*.13,0,0,7);ctx.fill();
        const p=ease((t-.34)/.47),x=a.x+dx*p,y=a.y+dy*p-h*.34*Math.sin(Math.PI*p);
        if(t>.34){glow(ctx,x,y,65+p*40,'#cf6af4',.84);ctx.fillStyle='#a13ccf';ctx.beginPath();ctx.arc(x,y,22+p*23,0,7);ctx.fill();}
        if(t>.80){const u=(t-.80)/.20;glow(ctx,b.x,b.y,w*.36*u,'#d777fb',.83);ctx.fillStyle='#ae50d0c9';
          ctx.beginPath();ctx.ellipse(b.x,b.y-h*.27*u,w*.18*u+2,h*.23*u+2,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(b.x,b.y-h*.43*u,w*.28*u+2,h*.12*u+2,0,0,7);ctx.fill();}
      }else if(kind==='meteor'){
        const mx=a.x+dx*.38,my=-h*.15+h*.5*ease(t/.40);glow(ctx,mx,my,90,'#ff9e54',.7);
        ctx.fillStyle='#353947';ctx.beginPath();ctx.arc(mx,my,h*.105,0,7);ctx.fill();
        if(t>.27){const j=ease((t-.27)/.31);portrait(ctx,skin,a.x+(mx-a.x)*j,a.y+(my-a.y-h*.10)*j,Math.min(h*.45,w*.25),1);}
        if(t>.59){const p=ease((t-.59)/.40),x=mx+(b.x-mx)*p,y=my+(b.y-my)*p;glow(ctx,x,y,75+p*55,'#fca65f',.9);
          ctx.fillStyle='#2f3039';ctx.beginPath();ctx.arc(x,y,h*.10,0,7);ctx.fill();}
        if(t>.86){const r=(t-.86)/.14;ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,.38);ctx.strokeStyle='#ffb878';ctx.lineWidth=17;
          ctx.beginPath();ctx.arc(0,0,w*.36*r,0,7);ctx.stroke();ctx.restore();}
      }else if(kind==='flame'){
        const stage=cap(mon.stages?.spa||0,0,6),thick=26+stage*14,color=stage>=4?'#b463f5':stage>=2?'#e671d1':'#ffae56',p=ease(t/.25),x=a.x+dx*p,y=a.y+dy*p;
        ctx.save();ctx.globalCompositeOperation='lighter';for(let i=2;i>=0;i--){ctx.fillStyle=i===0?'#fff0c6':i===1?color:'#dd538896';ctx.shadowColor=color;ctx.shadowBlur=22;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(a.x+dx*.53,a.y-thick*(i+1),x,y-thick*(i+1));ctx.lineTo(x,y+thick*(i+1));
          ctx.quadraticCurveTo(a.x+dx*.53,a.y+thick*(i+1),a.x,a.y);ctx.fill();}ctx.restore();glow(ctx,x,y,60+thick*2,color,.6);
      }else if(kind==='thunder'){
        for(let i=0;i<7;i++){const x=a.x+(b.x-a.x)*i/6;glow(ctx,x,h*.20,w*.15,'#080c18',.9);ctx.fillStyle='#090a11';ctx.beginPath();ctx.ellipse(x,h*.19,w*.12,h*.09,0,0,7);ctx.fill();}
        if(t>.32){for(let i=0;i<9;i++){const x=a.x+(b.x-a.x)*i/8;bolt(ctx,x,-15,b.x,b.y,i%3?'#ff496b':'#070811',i%3?5:15,t);}
          glow(ctx,b.x,b.y,w*.22,'#fa5576',.6);}
      }else if(kind==='roulette'){
        const cx=(a.x+b.x)/2,cy=h*.5,R=Math.min(h*.33,w*.18),spin=(1-t)*t*22;
        for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,spin+i*Math.PI/6,spin+(i+1)*Math.PI/6);ctx.closePath();
          ctx.fillStyle=i%2?'#f2c44f':'#21779a';ctx.fill();ctx.strokeStyle='#f5f4f0';ctx.stroke();}
        glow(ctx,cx,cy,R*.55,'#ffe297',.7);
      }else if(kind==='psychic'){
        for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(b.x,b.y,18+i*17+t*25,35+i*13+t*18,t*2+i,0,7);ctx.strokeStyle=i%2?'#f0adfb':'#7220a5';ctx.lineWidth=3;ctx.stroke();}
      }else if(kind==='chaos'){
        for(let i=0;i<12;i++){const x=a.x+dx*t+(i-6)*w*.04,y=a.y+dy*t+Math.sin(t*10+i)*h*.11;ctx.save();ctx.translate(x,y);ctx.rotate(t*6+i);
          ctx.fillStyle=i%2?'#f7b0d7':'#f4f4f8';ctx.fillRect(-8,-14,16,28);ctx.restore();}
      }else if(kind==='clock'){
        for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(b.x,b.y,28+i*22+t*30,0,7);ctx.strokeStyle='#77e6f3';ctx.lineWidth=3;ctx.stroke();}
        ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+Math.cos(t*18)*70,b.y+Math.sin(t*18)*70);ctx.stroke();
      }
      particles(ctx,w,h,t,b.x,b.y,def.color,25);
      if(t<1)requestAnimationFrame(frame);else if(key===sceneId)canvas.remove();
    }
    requestAnimationFrame(frame);
  }
  function impactFx(cast){const arena=document.getElementById('battle-screen');if(!arena||!cast)return;
    const w=arena.clientWidth,h=arena.clientHeight,dpr=Math.min(2,devicePixelRatio||1),b=center(cast.target,arena);
    let canvas=arena.querySelector('.unified-impact-fx');if(!canvas){canvas=document.createElement('canvas');canvas.className='unified-impact-fx';canvas.setAttribute('aria-hidden','true');arena.append(canvas);}
    canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);
    const start=performance.now();sound(cast.kind,true);
    function frame(now){const t=cap((now-start)/540,0,1);ctx.clearRect(0,0,w,h);ctx.save();ctx.globalAlpha=1-t;ctx.shadowColor=cast.color;ctx.shadowBlur=26;ctx.strokeStyle=cast.color;ctx.lineWidth=8;
      ctx.beginPath();ctx.ellipse(b.x,b.y,10+t*w*.16,6+t*h*.11,0,0,7);ctx.stroke();ctx.restore();particles(ctx,w,h,t,b.x,b.y,cast.color,38);
      if(t<1)requestAnimationFrame(frame);else canvas.remove();}requestAnimationFrame(frame);
  }
  function init(){
    const style=document.createElement('style');style.textContent=`
      #battle-screen[data-skin-cover] .skin-cinematic,#battle-screen .cinematic-hd,#battle-screen .remote-skin-fx{display:none!important}
      .unified-skin-fx,.unified-impact-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:50}
      .unified-impact-fx{z-index:51}
    `;document.head.append(style);
    const original=window.triggerSkillVisualAndAudio;
    if(typeof original==='function')window.triggerSkillVisualAndAudio=function(name,side,...extra){
      lastCast=null;
      const result=original.call(this,name,side,...extra);
      if(!myTeam||!enemyTeam||extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'))return result;
      const mine=(isHost||isSpectator)?side==='p1':side==='p2',mon=mine?myTeam.lead:enemyTeam.lead;
      const actor=document.getElementById(mine?'player-sprite':'enemy-sprite'),target=document.getElementById(mine?'enemy-sprite':'player-sprite');
      const skin=actor?.dataset.skin,def=skinMove(skin,name,mon);
      if(def&&actor&&target){lastCast={name,side,mine,skin,kind:def.kind,color:def.color,actor,target,time:Date.now()};
        try{render(def.kind,skin,actor,target,mon);sound(def.kind);}catch(error){console.warn('공통 스킨 컛신 오류',error);}}
      return result;
    };
    const baseDuration=window.skillCinematicDuration;
    if(typeof baseDuration==='function')window.skillCinematicDuration=function(name){
      const normal=baseDuration.call(this,name);
      if(lastCast?.name===name&&Date.now()-lastCast.time<6000){const def=skinMove(lastCast.skin,name,lastCast.mine?myTeam?.lead:enemyTeam?.lead);
        if(def)return def.ms+80;}
      return normal;
    };
    const baseImpact=window.playSkillCinematicImpactFX;
    if(typeof baseImpact==='function')window.playSkillCinematicImpactFX=function(name,point){
      const result=baseImpact.call(this,name,point);
      if(lastCast?.name===name&&Date.now()-lastCast.time<6000)try{impactFx(lastCast);}catch(error){console.warn('공통 스킨 충돌 연출 오류',error);}
      return result;
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();