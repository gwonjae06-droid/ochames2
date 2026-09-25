// Cosmetic-only skin cinematics. Portraits appear for signature skills only.
(() => {
  'use strict';
  const css=document.createElement('style');
  css.textContent=`
    .battle-screen{width:100%;max-width:980px;height:450px}
    .battle-bottom{width:100%;max-width:980px}
    .battle-screen .char-sprite{width:132px;height:132px;font-size:17px}
    .battle-screen .sprite-enemy{top:21%;right:10%}
    .battle-screen .sprite-player{bottom:12%;left:10%}
    .battle-screen .platform-enemy{top:46%;right:7%;width:185px}
    .battle-screen .platform-player{bottom:8%;left:7%;width:195px}
    .cinematic-hd{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40}
    @media(max-width:600px){
      .battle-screen{height:380px}
      .battle-screen .char-sprite{width:clamp(88px,27vw,118px);height:clamp(88px,27vw,118px);font-size:13px}
      .battle-screen .sprite-enemy{top:27%;right:8%}.battle-screen .sprite-player{bottom:14%;left:7%}
      .battle-screen .platform-enemy{top:46%;right:3%;width:35%}.battle-screen .platform-player{bottom:9%;left:3%;width:37%}
      .battle-screen .pokemon-hud{width:min(44vw,205px)}
    }
  `;
  document.head.append(css);
  const artFiles={bae:'bae-bloodmoon.png',oh:'oh-abyss.png',park:'park-meteor.jpg',lee:'lee-red.png'};
  const arts={};
  for(const [id,file] of Object.entries(artFiles)){const img=new Image();img.src=`assets/skins/${file}`;arts[id]=img;}
  const ms={punch:2600,bomb:3100,meteor:3200,flame:1900,thunder:2800,moon:950,slime:1050,cosmic:1050,embers:950};
  let key=0,audio;
  document.addEventListener('pointerdown',()=>{
    try{const C=window.AudioContext||window.webkitAudioContext;if(C){audio||=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});}}catch(error){}
  },{passive:true});
  function hit(){if(!audio)return;try{
    const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sawtooth';
    o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(42,t+.36);
    g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.11,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.42);
    o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.43);
  }catch(error){console.warn('스킨 충돌음 오류',error);}}
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function halo(ctx,x,y,r,color){
    if(r<=0)return;const grad=ctx.createRadialGradient(x,y,1,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');
    ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  function portrait(ctx,id,x,y,size,a){
    const img=arts[id];if(!img?.complete||!img.naturalWidth)return;
    ctx.save();ctx.globalAlpha=a;ctx.shadowColor='#e2e8f0';ctx.shadowBlur=18;ctx.drawImage(img,x-size/2,y-size/2,size,size);ctx.restore();
  }
  function stroke(ctx,x1,y1,x2,y2,color,width){
    ctx.beginPath();ctx.moveTo(x1,y1);for(let i=1;i<10;i++){const t=i/10;ctx.lineTo(x1+(x2-x1)*t+(Math.random()-.5)*30,y1+(y2-y1)*t+(Math.random()-.5)*22);}
    ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=width*3;ctx.stroke();ctx.shadowBlur=0;
  }
  function particles(ctx,w,h,t,color,count=26){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<count;i++){
      const a=i*2.399,travel=(30+i%8*17)*(1+t*2),x=w*.53+Math.cos(a)*travel,y=h*.52+Math.sin(a)*travel*.65;
      const r=1+i%3;ctx.fillStyle=color;ctx.globalAlpha=(1-t)*(.35+i%5*.1);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  }
  function run(kind,id,stage=0){
    const arena=document.getElementById('battle-screen');
    if(!arena||getComputedStyle(arena).display==='none'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const serial=++key;let canvas=arena.querySelector('.cinematic-hd');
    if(!canvas){canvas=document.createElement('canvas');canvas.className='cinematic-hd';canvas.setAttribute('aria-hidden','true');arena.append(canvas);}
    const w=arena.clientWidth,h=arena.clientHeight,d=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;canvas.width=Math.floor(w*d);canvas.height=Math.floor(h*d);
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const major=['punch','bomb','meteor','flame','thunder'].includes(kind),start=performance.now(),len=ms[kind];let hitPlayed=false;
    function frame(now){
      if(serial!==key||!canvas.isConnected)return;
      const t=clamp((now-start)/len,0,1),ex=w*.75,ey=h*.52;
      ctx.clearRect(0,0,w,h);
      if(major){
        const g=ctx.createLinearGradient(0,0,w,h);
        g.addColorStop(0,kind==='bomb'?'#100921':kind==='flame'?'#171022':'#060c1e');
        g.addColorStop(1,kind==='bomb'?'#46205f':kind==='flame'?'#422441':'#20223c');
        ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
        ctx.fillStyle='#d9efff';for(let i=0;i<20;i++)ctx.fillRect((i*127)%w,(i*i*47)%h,1+i%2,1+i%2);
      }
      if(kind==='punch'||kind==='moon'){
        halo(ctx,w*.32,h*.29,h*.35,'#fa31545c');
        ctx.beginPath();ctx.arc(w*.32,h*.29,h*.16,0,Math.PI*2);ctx.fillStyle='#b92540';ctx.fill();
        if(kind==='punch'){
          portrait(ctx,'bae',w*.22,h*.55,Math.min(w*.36,h*.75),clamp(t*6,0,1));
          if(t>.35){const p=clamp((t-.35)/.26,0,1);
            halo(ctx,w*(.3+.55*p),h*.54,w*.18,'#ff5368');
            ctx.save();ctx.translate(w*(.3+.55*p),h*.54);ctx.rotate(-.18);
            ctx.fillStyle='#f6475f';ctx.strokeStyle='#ffeaef';ctx.lineWidth=5;
            ctx.beginPath();ctx.ellipse(0,0,w*.12,h*.12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
            for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(w*(i-1.5)*.05,-h*.12,w*.026,h*.055,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
            ctx.restore();if(p>.86&&!hitPlayed){hit();hitPlayed=true;}
          }
          if(t>.61){const gap=Math.sin(Math.PI*clamp((t-.61)/.39,0,1))*Math.min(44,w*.06);
            for(let i=0;i<3;i++){
              ctx.save();ctx.translate((i-1)*gap*Math.cos(i*2.1),(i-1)*gap*Math.sin(i*2.1));
              ctx.beginPath();ctx.moveTo(ex,ey);const a=-Math.PI/2+i*Math.PI*2/3,b=a+Math.PI*2/3;
              ctx.lineTo(ex+Math.cos(a)*w,ey+Math.sin(a)*h);ctx.lineTo(ex+Math.cos(b)*w,ey+Math.sin(b)*h);
              ctx.closePath();ctx.fillStyle=i%2?'#d7355160':'#ffc6d149';ctx.fill();ctx.restore();
            }
            particles(ctx,w,h,t,'#ffadb8',36);
          }
        }else{for(let i=0;i<16;i++)halo(ctx,(i*93+t*60)%w,(i*47+t*25)%h,10,'#f8717188');}
      }
      if(kind==='bomb'||kind==='slime'){
        ctx.fillStyle=major?'#67258d':'#b44bd267';ctx.beginPath();ctx.ellipse(w*.5,h*.99,w*.7,h*.2,0,0,Math.PI*2);ctx.fill();
        for(let i=0;i<17;i++){const x=(i*71+t*90)%w,y=h*.85-((t*120+i*37)%95);halo(ctx,x,y,10+i%4*4,i%3?'#ef8cf493':'#b051e8ba');}
        if(kind==='bomb'){
          const approach=clamp(t/.34,0,1);portrait(ctx,'oh',w*(-.13+.40*approach),h*.55,Math.min(w*.36,h*.75),approach);
          if(t>.36&&t<.68){const p=(t-.36)/.32,x=w*.27+(ex-w*.27)*p,y=h*.47-h*.34*Math.sin(Math.PI*p);
            halo(ctx,x,y,80+p*30,'#ac52eacf');ctx.beginPath();ctx.arc(x,y,25+p*25,0,Math.PI*2);ctx.fillStyle='#b350ed';ctx.fill();}
          if(t>.68){const p=clamp((t-.68)/.32,0,1);halo(ctx,ex,ey,w*.55*p,'#d850ff');
            ctx.fillStyle='#ae55e9bb';ctx.beginPath();ctx.ellipse(ex,ey-h*.31*p,w*.23*p+4,h*.22*p+4,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(ex,ey-h*.48*p,w*.32*p+4,h*.12*p+4,0,0,Math.PI*2);ctx.fill();
            particles(ctx,w,h,p,'#e5a1ff',40);if(!hitPlayed){hit();hitPlayed=true;}}
        }
      }
      if(kind==='meteor'||kind==='cosmic'){
        particles(ctx,w,h,t,'#cfe6ff',33);
        if(kind==='meteor'){
          const fall=clamp(t/.53,0,1),mx=w*.65,my=-h*.2+(ey+h*.2)*fall;
          halo(ctx,mx,my,100,'#fd944b');ctx.fillStyle='#33394b';ctx.beginPath();ctx.arc(mx,my,h*.11,0,Math.PI*2);ctx.fill();
          if(t>.27){const jump=clamp((t-.27)/.4,0,1);
            portrait(ctx,'park',w*.20+(mx-w*.20)*jump,h*.73+(my-h*.73-h*.11)*jump,Math.min(w*.28,h*.54),1);}
          if(t>.70){const p=clamp((t-.70)/.30,0,1);ctx.save();ctx.translate(ex,ey);ctx.scale(1,.38);
            ctx.beginPath();ctx.arc(0,0,w*.46*p,0,Math.PI*2);ctx.lineWidth=17;ctx.strokeStyle='#ffc271';ctx.shadowColor='#fa6c2e';ctx.shadowBlur=28;ctx.stroke();ctx.restore();
            halo(ctx,ex,ey,w*.26*p,'#ffb970');if(!hitPlayed){hit();hitPlayed=true;}}
        }else{
          for(let i=0;i<6;i++)stroke(ctx,w*.25,h*.7,w*(.3+i*.07),h*.13,'#b2ccff',2);
        }
      }
      if(kind==='flame'||kind==='embers'){
        const r=clamp(stage,0,6),thick=25+r*15,color=r>=4?'#a954ed':r>=2?'#df61ca':r>=1?'#ff8c62':'#ffba52';
        if(kind==='flame'){
          const p=clamp(t/.29,0,1),x=w*(.25+.61*p);
          ctx.save();ctx.globalCompositeOperation='lighter';
          for(let i=2;i>=0;i--){ctx.beginPath();ctx.moveTo(w*.25,h*.5);
            ctx.quadraticCurveTo(w*.48,h*.27-thick*i,x,h*.5-thick*(i+1));ctx.lineTo(x,h*.5+thick*(i+1));
            ctx.quadraticCurveTo(w*.48,h*.70+thick*i,w*.25,h*.5);ctx.closePath();
            ctx.fillStyle=i===0?'#fff0bc':i===1?color:'#7d36c2a8';ctx.shadowColor=color;ctx.shadowBlur=26;ctx.fill();}
          ctx.restore();halo(ctx,x,h*.5,55+thick*2,color);
          if(t>.51&&!hitPlayed){hit();hitPlayed=true;}
        }else{for(let i=0;i<24;i++)halo(ctx,(i*63+t*120)%w,h-((i*79+t*185)%h),7+i%5*4,color);}
      }
      if(kind==='thunder'){
        for(let i=0;i<7;i++){const x=w*(i+.5)/7;halo(ctx,x,h*.18,w*.15,'#080b16');ctx.fillStyle='#080b16';
          ctx.beginPath();ctx.ellipse(x,h*.17,w*.12,h*.09,0,0,Math.PI*2);ctx.fill();}
        portrait(ctx,'lee',w*.29,h*.53,Math.min(w*.38,h*.75),clamp(t*5,0,1));
        if(t>.36){for(let i=0;i<11;i++){const x=w*(i+.5)/11;
          stroke(ctx,x,-20,ex+(Math.random()-.5)*90,ey,'#07080e',15);
          stroke(ctx,x,-20,ex+(Math.random()-.5)*35,ey,'#ff4668',5);}
          particles(ctx,w,h,t,'#ff9bab',38);if(!hitPlayed){hit();hitPlayed=true;}}
      }
      if(t<1)requestAnimationFrame(frame);else if(serial===key)canvas.remove();
    }
    requestAnimationFrame(frame);
  }
  const ownership={bloodmoon:'bae',abyss:'oh',meteor:'park',jackpot:'choi',storm:'lee'};
  function current(id){const skin=document.getElementById('player-sprite')?.dataset.skin;return ownership[skin]===id?skin:null;}
  function kindFor(id,name,mon){
    if(id==='bae')return name==='드레인펀치'?'punch':'moon';
    if(id==='oh')return name==='오물폭탄'?'bomb':'slime';
    if(id==='park')return name==='메테오 스트라이크'?'meteor':'cosmic';
    if(id==='choi')return name==='화염방사'?'flame':'embers';
    if(id==='lee'&&name==='벽력일섬'&&mon.nikaTurns>0)return'thunder';
    return null;
  }
  if(typeof window.triggerSkillVisualAndAudio==='function'){
    const original=window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio=function(name,side,...extra){
      const result=original.call(this,name,side,...extra);
      if(typeof myTeam==='undefined'||isSpectator||!(isHost?side==='p1':side==='p2'))return result;
      if(extra[1]&&Object.prototype.hasOwnProperty.call(extra[1],'isGachaWin'))return result;
      const mon=myTeam?.lead;
      if(mon&&current(mon.id)){const kind=kindFor(mon.id,name,mon);if(kind)try{run(kind,mon.id,mon.stages?.spa||0);}catch(error){console.warn('스킨 연출 오류',error);}}
      return result;
    };
  }
  if(typeof window.skillCinematicDuration==='function'){
    const original=window.skillCinematicDuration;
    window.skillCinematicDuration=function(name){
      const base=original.call(this,name),mon=typeof myTeam!=='undefined'?myTeam?.lead:null;
      if(!mon||!current(mon.id))return base;
      const kind=kindFor(mon.id,name,mon);return kind?Math.max(base,ms[kind]+100):base;
    };
  }
})();