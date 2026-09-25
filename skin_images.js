// Load after skins.js. Gallery, 12-tap developer unlock, and random arenas.
// The eight-skin system in skins.js handles character artwork; do not load the old red-only image observer.
(() => {
  'use strict';
  const KEY = 'ochams-skins-v1';
  const SKINS = [
    { id:'storm', owner:'lee', name:'적뢰', image:'lee-red.png', icon:'⚡', color:'#f43f5e' },
    { id:'bloodmoon', owner:'bae', name:'혈월의 권투사', image:'bae-bloodmoon.png', icon:'✊', color:'#ef4444' },
    { id:'abyss', owner:'oh', name:'심연의 독술사', image:'oh-abyss.png', icon:'☠', color:'#a855f7' },
    { id:'meteor', owner:'park', name:'흑철 운석', image:'park-meteor.jpg', icon:'☄', color:'#fb923c' },
    { id:'jackpot', owner:'choi', name:'청염 도박사', image:'choi-jackpot.png', icon:'🎰', color:'#38bdf8' },
    { id:'rift', owner:'yoon', name:'균열의 마녀', image:null, icon:'✦', color:'#e879f9' },
    { id:'jester', owner:'boingo', name:'심야의 광대', image:null, icon:'♠', color:'#f9a8d4' },
    { id:'rewind', owner:'sungwon_time', name:'역행', image:null, icon:'⌛', color:'#67e8f9' }
  ];
  const ARENAS = [
    { id:'neon', name:'네온 거리' },
    { id:'volcano', name:'화산 지대' },
    { id:'moon', name:'달빛 폐허' },
    { id:'storm', name:'뇌운 사원' }
  ];
  const style = document.createElement('style');
  style.textContent = `
    .skin-gallery{position:fixed;inset:0;z-index:260;background:rgba(3,7,18,.88);display:flex;align-items:center;justify-content:center;padding:14px}
    .skin-gallery-card{width:min(580px,100%);max-height:90vh;overflow-y:auto;background:#152238;border:2px solid #7dd3fc;border-radius:15px;padding:14px;color:#f8fafc;box-shadow:0 18px 60px #000c}
    .skin-gallery-card h2{font-size:18px;margin:0 0 6px;color:#a5f3fc}
    .skin-gallery-card p{font-size:12px;color:#cbd5e1;line-height:1.5;margin:0 0 10px}
    .skin-gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .skin-gallery-item{display:flex;gap:9px;align-items:center;padding:8px;border-radius:9px;background:#21324b;border:1px solid #516981;min-width:0}
    .skin-gallery-item.locked{background:#1a2638}
    .skin-gallery-preview{width:70px;height:70px;flex:none;display:grid;place-items:center;overflow:hidden;border:2px solid var(--skin-color);border-radius:10px;background:radial-gradient(circle at center,var(--skin-color),#101421 75%);font-size:28px;text-shadow:0 2px 9px #000}
    .skin-gallery-preview img{width:100%;height:100%;object-fit:contain;display:block}
    .skin-gallery-meta{min-width:0;flex:1}.skin-gallery-name{font-size:12px;font-weight:900;overflow-wrap:anywhere}.skin-gallery-owner{font-size:10px;color:#a5f3fc;margin:3px 0}.skin-gallery-status{font-size:10px;color:#cbd5e1}
    .skin-gallery-item button{margin-top:4px;min-height:29px;width:100%;font-size:11px;background:#2563eb}.skin-gallery-item button:disabled{background:#334155;color:#94a3b8}
    .skin-gallery-close{width:100%;margin-top:10px;background:#475569}
    @media(max-width:480px){.skin-gallery-grid{grid-template-columns:1fr}.skin-gallery-preview{width:62px;height:62px}}
    #battle-screen[data-arena="neon"]{background:radial-gradient(circle at 48% 25%,#fb4bc355,transparent 39%),repeating-linear-gradient(0deg,transparent 0 26px,#32d6fc15 27px 28px),linear-gradient(130deg,#030b29,#38125a 52%,#061a3b)}
    #battle-screen[data-arena="neon"]::before{background:repeating-linear-gradient(90deg,transparent 0 34px,#ff53e31e 35px 37px),linear-gradient(0deg,#14b8a635,transparent 60%)}
    #battle-screen[data-arena="volcano"]{background:radial-gradient(ellipse at 74% 85%,#ff7a22aa,transparent 42%),radial-gradient(circle at 48% 10%,#72231b88,transparent 40%),linear-gradient(#180b17,#3b1725 70%,#261017)}
    #battle-screen[data-arena="volcano"]::before{background:repeating-linear-gradient(14deg,transparent 0 30px,#ff842215 32px 35px),linear-gradient(0deg,#f851194d,transparent 43%)}
    #battle-screen[data-arena="moon"]{background:radial-gradient(circle at 72% 23%,#dbeafe9c 0 7%,#92a7ed44 10%,transparent 26%),linear-gradient(135deg,#060f28,#25345c 60%,#0a1a31)}
    #battle-screen[data-arena="moon"]::before{background:repeating-linear-gradient(95deg,transparent 0 49px,#dbeafe19 51px 54px),linear-gradient(0deg,#b3c6ff37,transparent 48%)}
    #battle-screen[data-arena="storm"]{background:radial-gradient(circle at 48% 18%,#dbfaff42,transparent 32%),repeating-linear-gradient(120deg,transparent 0 65px,#cceefa18 68px 71px),linear-gradient(145deg,#071622,#234252 50%,#101529)}
    #battle-screen[data-arena="storm"]::before{background:radial-gradient(ellipse at 50% 80%,#9c70e743,transparent 65%),linear-gradient(90deg,transparent 46%,#a5f3fc29 49%,transparent 51%)}
    .arena-title{position:absolute;top:49%;left:50%;transform:translate(-50%,-50%);z-index:11;pointer-events:none;padding:5px 11px;background:#080f22c9;border:1px solid #cbd5e1;border-radius:7px;color:#fff;font:900 13px system-ui;white-space:nowrap;animation:arenaTitle 1.7s ease-out both}
    @keyframes arenaTitle{0%{opacity:0;transform:translate(-50%,-40%) scale(.9)}20%,65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}
    @media(prefers-reduced-motion:reduce){.arena-title{animation:none;opacity:1}}
  `;
  document.head.append(style);

  function read() {
    try { const data=JSON.parse(localStorage.getItem(KEY)||'{}'); return data && typeof data==='object' ? data : {}; }
    catch (error) { console.warn('스킨 저장 정보를 읽지 못했습니다.',error); return {}; }
  }
  function write(data) {
    try { localStorage.setItem(KEY,JSON.stringify(data)); return true; }
    catch (error) { console.warn('스킨 저장 정보를 기록하지 못했습니다.',error); return false; }
  }
  function labelFor(owner) {
    return typeof POKEDEX!=='undefined' ? (POKEDEX[owner]?.name||owner) : owner;
  }
  function openGallery(unlockMode=false) {
    const previous=document.querySelector('.skin-gallery'); if(previous) previous.remove();
    const data=read();
    const owned=new Set(Array.isArray(data.unlocked)?data.unlocked:[]);
    const available=SKINS.filter(skin=>!owned.has(skin.id));
    const shade=document.createElement('div');shade.className='skin-gallery';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
    const card=document.createElement('div');card.className='skin-gallery-card';
    const title=document.createElement('h2');title.textContent=unlockMode?'🛠️ 개발자 스킨 선택':'🎨 전체 스킨 도감';
    const intro=document.createElement('p');intro.textContent=unlockMode
      ? (available.length?'미해금 스킨 중 하나를 선택해 즉시 해금·장착합니다.':'모든 스킨을 해금했습니다.')
      : '8명 전용 스킨 미리보기 · 3연전 승리 또는 개발자 기능으로 해금';
    card.append(title,intro);
    const grid=document.createElement('div');grid.className='skin-gallery-grid';
    for(const skin of SKINS){
      const item=document.createElement('div');item.className='skin-gallery-item';
      item.style.setProperty('--skin-color',skin.color);
      const unlocked=owned.has(skin.id);
      if(!unlocked)item.classList.add('locked');
      const preview=document.createElement('div');preview.className='skin-gallery-preview';
      preview.setAttribute('aria-label',`${skin.name} 미리보기`);
      if(skin.image){
        const img=document.createElement('img');img.alt=`${skin.name} 앞모습`;
        img.loading='lazy';img.src=`assets/skins/${skin.image}`;
        img.onerror=()=>{img.remove();preview.textContent=skin.icon;};
        preview.append(img);
      }else preview.textContent=skin.icon;
      const meta=document.createElement('div');meta.className='skin-gallery-meta';
      const name=document.createElement('div');name.className='skin-gallery-name';name.textContent=skin.name;
      const owner=document.createElement('div');owner.className='skin-gallery-owner';owner.textContent=labelFor(skin.owner);
      const status=document.createElement('div');status.className='skin-gallery-status';
      const currently=data.equipped?.[skin.owner]===skin.id;
      status.textContent=unlocked?(currently?'장착 중':'해금됨'):(skin.image?'미해금':'미해금 · 전용 사진 없음');
      meta.append(name,owner,status);
      if(unlockMode && !unlocked){
        const btn=document.createElement('button');btn.type='button';btn.textContent='해금하기';
        btn.onclick=()=>{
          const fresh=read();const list=Array.isArray(fresh.unlocked)?fresh.unlocked.filter(id=>SKINS.some(s=>s.id===id)):[];
          if(!list.includes(skin.id))list.push(skin.id);
          fresh.unlocked=list;fresh.equipped={...(fresh.equipped||{}),[skin.owner]:skin.id};fresh.claimed=true;
          if(write(fresh))location.reload();
        };
        meta.append(btn);
      }else if(!unlockMode && unlocked){
        const btn=document.createElement('button');btn.type='button';btn.textContent=currently?'장착 해제':'장착하기';
        btn.onclick=()=>{
          const fresh=read();fresh.equipped={...(fresh.equipped||{})};
          if(currently)delete fresh.equipped[skin.owner];else fresh.equipped[skin.owner]=skin.id;
          if(write(fresh))location.reload();
        };
        meta.append(btn);
      }
      item.append(preview,meta);grid.append(item);
    }
    card.append(grid);
    const close=document.createElement('button');close.type='button';close.className='skin-gallery-close';close.textContent='닫기';close.onclick=()=>shade.remove();
    card.append(close);shade.append(card);document.body.append(shade);
  }

  const wardrobe=document.querySelector('#pick-panel .skin-entry-btn');
  if(wardrobe)wardrobe.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();openGallery();
  },true);
  let detailClicks=0;
  const detail=document.getElementById('btn-show-info');
  if(detail)detail.addEventListener('click',event=>{
    detailClicks++;
    if(detailClicks<12)return;
    detailClicks=0;event.preventDefault();event.stopImmediatePropagation();
    const old=document.getElementById('detail-modal');if(old)old.style.display='none';
    openGallery(true);
  },true);

  if(typeof window.startBattleScreen==='function'){
    const original=window.startBattleScreen;
    window.startBattleScreen=function(...args){
      const result=original.apply(this,args);
      const field=document.getElementById('battle-screen');
      if(field){
        const chosen=ARENAS[Math.floor(Math.random()*ARENAS.length)];
        field.dataset.arena=chosen.id;
        field.querySelector('.arena-title')?.remove();
        const label=document.createElement('div');label.className='arena-title';label.textContent=chosen.name;
        label.setAttribute('aria-hidden','true');field.append(label);
        setTimeout(()=>label.remove(),1800);
      }
      return result;
    };
  }
})();