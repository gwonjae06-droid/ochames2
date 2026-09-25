// Skin cinematics layered above the existing battle engine. No combat rules change.
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .battle-screen{max-width:900px;height:420px}
    .battle-bottom{max-width:900px}
    .cinematic-hd{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40}
    @media(max-width:600px){
      .battle-screen{height:350px}
      .sprite-enemy{top:28%;right:8%}.platform-enemy{top:40%;right:3%}
      .sprite-player{bottom:12%;left:8%}.platform-player{bottom:9%;left:2%}
      .pokemon-hud{width:min(44vw,200px)}
    }
  `;
  document.head.append(style);
  const files={bae:'bae-bloodmoon.png',oh:'oh-abyss.png',park:'park-meteor.jpg',lee:'lee-red.png'};
  const images={};
  for(const [id,file] of Object.entries(files)){
    const image=new Image();image.src=`assets/skins/${file}`;images[id]=image;
  }
  let token=0, sound;
  document.addEventListener('pointerdown',()=>{
    try{const C=window.AudioContext||window.webkitAudioContext;if(C){sound||=new C();if(sound.state==='suspended')sound.resume().catch(()=>{});}}
    catch(error){console.warn('컷신 오디오 준비 오류',error);}
  },{passive:true});
  function impact(low=100){
    if(!sound)return;
    try{
      const now=sound.currentTime,o=sound.createOscillator(),gain=sound.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(low*2.5,now);o.frequency.exponentialRampToValueAtTime(Math.max(35,low*.4),now+.33);
      gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.09,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+.38);
      o.connect(gain).connect(sound.destination);o.start(now);o.stop(now+.39);
    }catch(error){console.warn('컷신 오디오 오류',error);}
  }
  const duration={punch:2550,sludge:3050,meteor:3150,flame:1800,thunder:2700,moon:1000,slime:1100,cosmos:1100,embers:1000};
  function point(ctx,x,y,r,color){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  function portrait(ctx,id,x,y,size,alpha=1){
    const img=images[id];ctx.save();ctx.globalAlpha=alpha;
    if(img?.complete&&img.naturalWidth){
      ctx.shadowColor='#fff';ctx.shadowBlur=22;ctx.drawImage(img,x-size/2,y-size/2,size,size);
    }else{
      ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(18,size*.22)}px system-ui`;ctx.textAlign='center';
      ctx.fillText(({bae:'배서준',oh:'오슬우',park:'박성원',lee:'이권재'})[id]||'',x,y);
    }
    ctx.restore();
  }
  function bolt(ctx,x1,y1,x2,y2,color,width){
    ctx.beginPath();ctx.moveTo(x1,y1);
    for(let i=1;i<10;i++){let t=i/10;ctx.lineTo(x1+(x2-x1)*t+(Math.random()-.5)*34,y1+(y2-y1)*t+(Math.random()-.5)*26);}
    ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.shadowBlur=18;ctx.shadowColor=color;ctx.stroke();ctx.shadowBlur=0;
  }
  function scene(kind,id,rank=0){
    const arena=document.getElementById('battle-screen');if(!arena||getComputedStyle(arena).display==='none')return;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const seq=++token;let canvas=arena.querySelector('.cinematic-hd');
    if(!canvas){canvas=document.createElement('canvas');canvas.className='cinematic-hd';canvas.setAttribute('aria-hidden','true');arena.append(canvas);}
    const w=arena.clientWidth,h=arena.clientHeight,d=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;canvas.width=Math.floor(w*d);canvas.height=Math.floor(h*d);
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const start=performance.now(),ms=duration[kind];let struck=false;
    function frame(now){
      if(seq!==token||!canvas.isConnected)return;
      const t=Math.min(1,(now-start)/ms),cx=w*.72,cy=h*.53;
      ctx.clearRect(0,0,w,h);
      const sky=ctx.createLinearGradient(0,0,w,h);
      if(kind==='sludge'||kind==='slime'){sky.addColorStop(0,'#080816');sky.addColorStop(1,'#4e146e');}
      else if(kind==='flame'||kind==='embers'){sky.addColorStop(0,'#161016');sky.addColorStop(1,'#612332');}
      else{sky.addColorStop(0,'#070b18');sky.addColorStop(1,'#1d2440');}
      ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      const stars=kind==='meteor'||kind==='cosmos'||kind==='thunder';
      if(stars){ctx.fillStyle='#dbeafe';for(let i=0;i<28;i++)ctx.fillRect((i*73)%w,(i*i*31)%h,2,2);}
      if(kind==='punch'||kind==='moon'){
        point(ctx,w*.36,h*.26,h*.47,'#c90d379c');ctx.beginPath();ctx.arc(w*.36,h*.26,h*.19,0,Math.PI*2);ctx.fillStyle='#ac1834';ctx.fill();
        portrait(ctx,'bae',w*(kind==='punch'?.22:.34),h*.60,Math.min(h*.75,w*.36),Math.min(1,t*4));
        if(kind==='punch'&&t>.34){
          let p=Math.min(1,(t-.34)/.36);
          ctx.save();ctx.translate(w*(.28+.47*p),h*(.63-.13*p));ctx.rotate(-.23);
          point(ctx,0,0,w*.22,'#ff3b5b');ctx.fillStyle='#ef3656';ctx.strokeStyle='#ffe0e2';ctx.lineWidth=5;
          ctx.beginPath();ctx.roundRect(-w*.12,-h*.12,w*.29,h*.25,22);ctx.fill();ctx.stroke();
          for(let i=0;i<3;i++){ctx.beginPath();ctx.roundRect(-w*.10+i*w*.087,-h*.20,w*.08,h*.105,13);ctx.fill();ctx.stroke();}
          ctx.restore();
          if(p>.72&&!struck){impact(95);struck=true;}
        }
        if(kind==='punch'&&t>.65){
          let q=Math.sin(Math.PI*Math.min(1,(t-.65)/.35))*Math.min(w*.06,45);
          ctx.strokeStyle='#fff0f0';ctx.lineWidth=4;
          for(let i=0;i<3;i++){
            const a=-Math.PI/2+i*2*Math.PI/3;
            ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*w*.8+Math.cos(a)*q,cy+Math.sin(a)*h*.9+Math.sin(a)*q);ctx.stroke();
            point(ctx,cx+Math.cos(a)*w*.3,cy+Math.sin(a)*h*.3,36,'#e63b61');
          }
        }
      }
      if(kind==='sludge'||kind==='slime'){
        ctx.fillStyle='#651a88';ctx.beginPath();ctx.ellipse(w*.5,h*.96,w*.8,h*.27,0,0,7);ctx.fill();
        for(let i=0;i<10;i++){
          const x=(i*97+t*76)%w,y=h*.85-((t*140+i*49)%100);
          ctx.beginPath();ctx.arc(x,y,6+i%4*3,0,7);ctx.fillStyle=i%2?'#e78aed99':'#a428d999';ctx.fill();
        }
        if(kind==='sludge'){
          let walk=Math.min(1,t/.37);portrait(ctx,'oh',w*(-.12+.37*walk),h*.59,Math.min(h*.76,w*.38),Math.min(1,t*6));
          if(t>.38&&t<.69){let p=(t-.38)/.31,x=w*.26+(cx-w*.26)*p,y=h*.44-h*.32*Math.sin(Math.PI*p);
            point(ctx,x,y,Math.min(w*.22,90),'#b932eacc');ctx.beginPath();ctx.arc(x,y,25+p*20,0,7);ctx.fillStyle='#b540e9';ctx.fill();}
          if(t>=.69){let p=(t-.69)/.31;
            point(ctx,cx,cy,Math.max(6,w*.48*p),'#d44df3');ctx.fillStyle='#942bc1dd';
            ctx.beginPath();ctx.ellipse(cx,cy-h*.24*p,w*.20*p+3,h*.27*p+3,0,0,7);ctx.fill();
            ctx.beginPath();ctx.ellipse(cx,cy-h*.45*p,w*.30*p+3,h*.14*p+3,0,0,7);ctx.fill();
            ctx.fillRect(cx-w*.055*p,cy-h*.25*p,w*.11*p,h*.27*p);
            if(!struck){impact(72);struck=true;}
          }
        }
      }
      if(kind==='meteor'||kind==='cosmos'){
        portrait(ctx,'park',w*.21,h*(kind==='meteor'?.75-.53*Math.min(1,t/.43):.48),Math.min(h*.50,w*.28));
        if(kind==='meteor'){
          const p=Math.min(1,t/.56),mx=w*.62,my=-h*.20+(cy+h*.20)*p;
          point(ctx,mx,my,Math.min(w*.23,100),'#fe9d42');ctx.beginPath();ctx.arc(mx,my,h*.09,0,7);ctx.fillStyle='#313445';ctx.fill();
          if(t>.42){let q=Math.min(1,(t-.42)/.33);
            portrait(ctx,'park',w*.21+(mx-w*.21)*q,h*.21+(my-h*.21)*q-h*.12,Math.min(h*.42,w*.24));}
          if(t>.71){let q=(t-.71)/.29;
            ctx.save();ctx.translate(cx,cy);ctx.scale(1,.43);ctx.beginPath();ctx.arc(0,0,(w*.42)*q,0,7);ctx.strokeStyle='#ffb158';ctx.lineWidth=20;ctx.shadowBlur=22;ctx.shadowColor='#ff6325';ctx.stroke();ctx.restore();
            point(ctx,cx,cy,w*.23*q,'#ff8d45');if(!struck){impact(70);struck=true;}
          }
        }else for(let i=0;i<9;i++)point(ctx,(i*83+t*170)%w,(i*137+t*70)%h,20,'#abd9ff');
      }
      if(kind==='flame'||kind==='embers'){
        let r=Math.max(0,Math.min(6,rank)),width=18+r*12;
        let color=r>=4?'#b150f3':r>=2?'#df5bcf':r>=1?'#ff8b51':'#ffb53d';
        ctx.fillStyle='#ffe1aa';ctx.font='900 19px system-ui';ctx.fillText(`특공 +${r}`,18,28);
        if(kind==='flame'){
          let p=Math.min(1,t/.34);point(ctx,w*.25,h*.55,45,color);
          ctx.beginPath();ctx.moveTo(w*.24,h*.53-width/3);ctx.lineTo(w*(.24+.60*p),h*.48-width*p);ctx.lineTo(w*(.24+.60*p),h*.48+width*p);ctx.closePath();
          ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=35;ctx.fill();ctx.shadowBlur=0;
          point(ctx,w*(.24+.60*p),h*.48,45+width*2,color);
          if(t>.6&&!struck){impact(110);struck=true;}
        }else for(let i=0;i<9;i++)point(ctx,(i*101+t*80)%w,h-(i*39+t*120)%h,18+i*2,color);
      }
      if(kind==='thunder'){
        for(let i=0;i<6;i++){
          point(ctx,(i+.5)*w/6,h*.13+Math.sin(i+t*9)*12,w*.16,'#090c18');
          ctx.fillStyle='#090c18';ctx.beginPath();ctx.ellipse((i+.5)*w/6,h*.18,w*.13,h*.10,0,0,7);ctx.fill();
        }
        portrait(ctx,'lee',w*.27,h*.55,Math.min(h*.70,w*.37),Math.min(1,t*5));
        if(t>.43){let q=Math.min(1,(t-.43)/.45);for(let i=0;i<8;i++){
          let sx=w*(i+.5)/8;bolt(ctx,sx,-10,cx+(Math.random()-.5)*w*.18,cy,'#08090f',17);
          bolt(ctx,sx,-10,cx+(Math.random()-.5)*w*.11,cy,'#ff3858',5);
        }
        if(!struck){impact(80);struck=true;}
        point(ctx,cx,cy,w*.15*q,'#ff4f69');}
      }
      if(t<1)requestAnimationFrame(frame);else if(seq===token)canvas.remove();
    }
    requestAnimationFrame(frame);
  }
  function skinFor(id){
    const state=document.getElementById('player-sprite')?.dataset.skin;
    return state&&({bloodmoon:'bae',abyss:'oh',meteor:'park',jackpot:'choi',storm:'lee'})[state]===id?state:null;
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){
    const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...extra){
      const result=original.call(this,name,side,...extra);
      if(typeof myTeam==='undefined'||isSpectator||!(isHost?side==='p1':side==='p2'))return result;
      if(extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'))return result;
      const id=myTeam?.lead?.id,skin=skinFor(id);if(!skin)return result;
      let kind;
      if(id==='bae')kind=name==='드레인펀치'?'punch':'moon';
      if(id==='oh')kind=name==='오물폭탄'?'sludge':'slime';
      if(id==='park')kind=name==='메테오 스트라이크'?'meteor':'cosmos';
      if(id==='choi')kind=name==='화염방사'?'flame':'embers';
      if(id==='lee'&&name==='벽력일섬'&&myTeam.lead.nikaTurns>0)kind='thunder';
      if(kind)try{scene(kind,id,myTeam.lead.stages?.spa||0);}catch(error){console.warn('확장 스킨 컷신 오류',error);}
      return result;
    };
  }
  if(typeof window.skillCinematicDuration==='function'){
    const original=window.skillCinematicDuration;
    window.skillCinematicDuration=function(name){
      const base=original.call(this,name),id=typeof myTeam!=='undefined'?myTeam?.lead?.id:null;
      if(!id||!skinFor(id))return base;
      const major={'드레인펀치':2600,'오물폭탄':3100,'메테오 스트라이크':3200,'화염방사':1900,'벽력일섬':2800};
      const wanted=major[name]||(id==='bae'||id==='oh'||id==='park'||id==='choi'?1150:0);
      return Math.max(base,wanted);
    };
  }
})();