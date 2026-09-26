// Extra skin visuals: no damage, turn order, or status changes.
(() => {
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    .battle-screen.finisher-shake{animation:finisherShake .76s cubic-bezier(.22,.7,.26,1)!important}
    @keyframes finisherShake{0%,100%{transform:translate(0,0) rotate(0)}9%{transform:translate(19px,-11px) rotate(1deg)}19%{transform:translate(-20px,12px) rotate(-1deg)}29%{transform:translate(17px,9px)}41%{transform:translate(-15px,-10px)}54%{transform:translate(11px,7px)}69%{transform:translate(-8px,-5px)}85%{transform:translate(4px,3px)}}
    .fractured-screen{position:absolute;inset:0;z-index:36;width:100%;height:100%;pointer-events:none;animation:fracturePulse 1.4s ease-in-out infinite}
    .fractured-screen path{fill:none;stroke:#e8f6ff;stroke-width:2.7;stroke-linejoin:round;filter:drop-shadow(1px 2px 2px #111827) drop-shadow(0 0 4px #fff)}
    .fractured-screen .branch{stroke:#cbd5e1;stroke-width:1.4}
    @keyframes fracturePulse{50%{opacity:.78}}
    .metal-plating{position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,transparent 9%,#eef4ff22 29%,#ffffff8a 46%,#4f6a8766 52%,transparent 75%);mix-blend-mode:screen;animation:steelShine 2.6s ease-in-out infinite}
    @keyframes steelShine{0%,100%{background-position:-120px 0;opacity:.4}50%{background-position:120px 0;opacity:1}}
    .finisher-extra{position:absolute;inset:0;width:100%;height:100%;z-index:54;pointer-events:none}
    @media(prefers-reduced-motion:reduce){.battle-screen.finisher-shake,.fractured-screen,.metal-plating{animation:none!important}}
  `;document.head.append(style);
  const actorOwn=side=>(isHost||isSpectator)?side==='p1':side==='p2';
  const sprite=own=>document.getElementById(own?'player-sprite':'enemy-sprite');
  const mon=own=>own?myTeam?.lead:enemyTeam?.lead;
  const hasSkin=(own,id,skin)=>mon(own)?.id===id&&sprite(own)?.dataset.skin===skin;
  const pos=(element,field)=>{const a=field.getBoundingClientRect(),b=element.getBoundingClientRect();return{x:b.left-a.left+b.width/2,y:b.top-a.top+b.height/2};};
  const between=(a,b,t)=>a+(b-a)*t;
  let drain=null,fxKey=0,crackUntil=-1,crackBattle=-1;
  function shake(){const field=document.getElementById('battle-screen');if(!field)return;field.classList.remove('finisher-shake');void field.offsetWidth;field.classList.add('finisher-shake');setTimeout(()=>field.classList.remove('finisher-shake'),800);}
  function cracks(target){const field=document.getElementById('battle-screen');if(!field||!target)return;
    field.querySelector('.fractured-screen')?.remove();const p=pos(target,field),cx=p.x/field.clientWidth*1000,cy=p.y/field.clientHeight*600;
    const rays=[[-80,-80],[310,-60],[760,-30],[1080,90],[1120,450],[850,680],[250,700],[-70,570]];
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 600');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','fractured-screen');svg.setAttribute('aria-hidden','true');
    rays.forEach(([x,y],i)=>{const dx=x-cx,dy=y-cy,curve=i%2?1:-1;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      const x1=cx+dx*.29,y1=cy+dy*.26,x2=cx+dx*.56+curve*17,y2=cy+dy*.54-curve*17;
      path.setAttribute('d',`M ${cx} ${cy} L ${x1} ${y1} L ${x2} ${y2} L ${x} ${y}`);svg.append(path);
      const branch=document.createElementNS('http://www.w3.org/2000/svg','path');branch.setAttribute('class','branch');branch.setAttribute('d',`M ${x2} ${y2} L ${x2+dy*.09} ${y2-dx*.09} L ${x2+dy*.16} ${y2-dx*.14}`);svg.append(branch);
    });field.append(svg);crackUntil=(typeof currentTurnNumber==='number'?currentTurnNumber:0)+1;crackBattle=typeof battleGeneration==='number'?battleGeneration:0;}
  function updateAppearance(){if(!myTeam||!enemyTeam)return;const field=document.getElementById('battle-screen');if(!field)return;
    if(field.querySelector('.fractured-screen')&&(battleGeneration!==crackBattle||currentTurnNumber>crackUntil))field.querySelector('.fractured-screen').remove();
    for(const own of [true,false]){
      const el=sprite(own),unit=mon(own);if(!el||!unit)continue;
      const bae=hasSkin(own,'bae','bloodmoon'),park=hasSkin(own,'park','meteor');
      el.style.transformOrigin=bae?'50% 100%':'';
      el.style.scale=bae?String(Math.min(2.45,1+Math.max(0,unit.stages?.atk||0)*.48)):'';
      const image=el.querySelector('img.champion-art');if(image)image.style.filter=park?`grayscale(${Math.min(1,(unit.stages?.def||0)*.23)}) contrast(${1+Math.min(.6,(unit.stages?.def||0)*.10)}) brightness(1.05)`:'';
      let plate=el.querySelector('.metal-plating');const stage=park?Math.max(0,unit.stages?.def||0):0;
      if(stage>0){if(!plate){plate=document.createElement('span');plate.className='metal-plating';el.append(plate);}plate.style.opacity=String(Math.min(.86,.24+stage*.12));}
      else plate?.remove();
    }
  }
  function overlay(kind,from,to){const field=document.getElementById('battle-screen');if(!field||!from||!to||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    let canvas=field.querySelector('.finisher-extra');if(!canvas){canvas=document.createElement('canvas');canvas.className='finisher-extra';canvas.setAttribute('aria-hidden','true');field.append(canvas);}
    const id=++fxKey,w=field.clientWidth,h=field.clientHeight,d=Math.min(2,devicePixelRatio||1);canvas.width=w*d;canvas.height=h*d;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(d,0,0,d,0,0);
    const a=pos(from,field),b=pos(to,field),start=performance.now(),length=kind==='stomp'?1900:1700;
    function draw(now){if(id!==fxKey||!canvas.isConnected)return;const t=Math.min(1,(now-start)/length);ctx.clearRect(0,0,w,h);
      if(kind==='wave'){
        const dx=b.x-a.x,dy=b.y-a.y,distance=Math.max(1,Math.hypot(dx,dy));
        const travel=distance*Math.min(1,t*1.24),rise=Math.min(h*.59,205)*(0.70+Math.min(1,t)*.30);
        const angle=Math.atan2(dy,dx);
        ctx.save();ctx.translate(a.x,a.y);ctx.rotate(angle);
        const shadow=ctx.createLinearGradient(0,0,0,rise*.8);shadow.addColorStop(0,'#02030aaa');shadow.addColorStop(1,'#08020c11');
        ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(travel*.56,rise*.65,Math.max(10,travel*.57),rise*.26,0,0,Math.PI*2);ctx.fill();
        for(let layer=0;layer<4;layer++){
          const crest=rise*(1.18-layer*.18),front=travel-(3-layer)*13;
          const colors=[['#080912','#09030f'],['#200b30','#361043'],['#4b1268','#7c2ca2'],['#b251db','#f3bbff']][layer];
          const grad=ctx.createLinearGradient(0,-crest,0,crest*.45);grad.addColorStop(0,colors[1]);grad.addColorStop(.55,colors[0]);grad.addColorStop(1,'#160820e0');
          ctx.save();ctx.globalAlpha=layer===3 ? 0.58 : 0.74;ctx.fillStyle=grad;ctx.shadowColor=layer===0?'#000015':'#b353df';ctx.shadowBlur=layer===0?28:20;
          ctx.beginPath();ctx.moveTo(-28,crest*.65);
          ctx.bezierCurveTo(front*.18,-crest*.2,front*.60,-crest*1.04,front,-crest*.78);
          ctx.bezierCurveTo(front+crest*.24,-crest*.72,front+crest*.25,-crest*.02,front-crest*.05,crest*.28);
          ctx.bezierCurveTo(front*.69,crest*.61,front*.28,crest*.55,-28,crest*.65);
          ctx.closePath();ctx.fill();ctx.restore();
        }
        ctx.save();ctx.strokeStyle='#f6d6ff';ctx.lineWidth=4;ctx.globalAlpha=.68;
        ctx.shadowColor='#d890f5';ctx.shadowBlur=18;ctx.beginPath();
        ctx.moveTo(travel*.35,-rise*.51);ctx.bezierCurveTo(travel*.57,-rise*.89,travel*.87,-rise*1.10,travel,-rise*.75);
        ctx.bezierCurveTo(travel+rise*.17,-rise*.58,travel+rise*.11,-rise*.24,travel-rise*.04,-rise*.10);ctx.stroke();ctx.restore();
        for(let i=0;i<33;i++){
          const phase=i*2.399,flow=Math.max(0,travel-(i%11)*13);
          const x=flow+Math.cos(phase)*((i%4)*12),y=-rise*.65+Math.sin(phase)*24;
          ctx.globalAlpha=.26+(i%4)*.15;ctx.fillStyle=i%5?'#e3a3ff':'#080611';
          ctx.beginPath();ctx.arc(x,y,2+i%4*2,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();ctx.globalAlpha=1;
      }else{
        const p=Math.min(1,t/.76),x=between(a.x,b.x,p),y=-h*.15+(b.y+h*.15)*p*p;
        for(const dir of [-1,1]){ctx.save();ctx.translate(x+dir*31,y);ctx.rotate(dir*.14);ctx.fillStyle='#404859';ctx.shadowColor='#f9a866';ctx.shadowBlur=19;
          ctx.beginPath();ctx.moveTo(-17,-58);ctx.lineTo(19,-58);ctx.lineTo(24,37);ctx.quadraticCurveTo(29,54,8,54);ctx.lineTo(-24,48);ctx.closePath();ctx.fill();
          ctx.fillStyle='#b9c2cc';ctx.fillRect(-25,40,52,12);ctx.restore();}
        if(t>.76){const r=(t-.76)/.24;ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,.4);ctx.strokeStyle='#ffa75c';ctx.lineWidth=13;ctx.shadowColor='#ff8a3d';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(0,0,w*.35*r,0,7);ctx.stroke();ctx.restore();}
      }
      if(t<1)requestAnimationFrame(draw);else if(id===fxKey)canvas.remove();}
    requestAnimationFrame(draw);
  }
  function cosmeticLabel(events){return events.map(ev=>{
    if(!ev?.msg||!ev.msg.includes('메테오 스트라이크'))return ev;
    const side=ev.type==='move_announce'?ev.side:ev.actorSide;if(!side)return ev;
    const own=actorOwn(side);if(!hasSkin(own,'park','meteor'))return ev;
    return {...ev,msg:ev.msg.replaceAll('메테오 스트라이크','점프 내려찍기')};
  });}
  function install(){
    if(typeof window.renderBattleField==='function'){const old=window.renderBattleField;window.renderBattleField=function(...args){const result=old.apply(this,args);updateAppearance();return result;};}
    if(typeof window.startBattleScreen==='function'){const old=window.startBattleScreen;window.startBattleScreen=function(...args){document.querySelector('.fractured-screen')?.remove();crackUntil=-1;drain=null;const result=old.apply(this,args);updateAppearance();return result;};}
    if(typeof window.openMoveMenu==='function'){const old=window.openMoveMenu;window.openMoveMenu=function(...args){const result=old.apply(this,args);if(hasSkin(true,'park','meteor'))for(let i=0;i<4;i++){const label=document.getElementById(`m${i}-name`);if(label?.textContent==='메테오 스트라이크')label.textContent='점프 내려찍기';}return result;};}
    if(typeof window.playTurnEvents==='function'){const old=window.playTurnEvents;window.playTurnEvents=function(events){return old.call(this,Array.isArray(events)?cosmeticLabel(events):events);};}
    if(typeof window.triggerSkillVisualAndAudio==='function'){const old=window.triggerSkillVisualAndAudio;window.triggerSkillVisualAndAudio=function(name,side,...args){const result=old.call(this,name,side,...args),own=actorOwn(side);
      if(name==='드레인펀치'&&hasSkin(own,'bae','bloodmoon'))drain={side,at:Date.now(),target:sprite(!own)};
      if(name==='오물폭탄'&&hasSkin(own,'oh','abyss'))overlay('wave',sprite(own),sprite(!own));
      if(name==='메테오 스트라이크'&&hasSkin(own,'park','meteor'))overlay('stomp',sprite(own),sprite(!own));
      return result;};}
    if(typeof window.playSkillCinematicImpactFX==='function'){const old=window.playSkillCinematicImpactFX;window.playSkillCinematicImpactFX=function(name,point){const result=old.call(this,name,point);
      if(name==='드레인펀치'&&drain&&Date.now()-drain.at<8000){shake();cracks(drain.target);drain=null;}
      return result;};}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();