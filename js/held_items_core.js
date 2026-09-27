// Battle item rules; presentation hooks at the end preserve these rules.
const HELD_ITEMS = Object.freeze({
  leftovers: Object.freeze({name: '먹다남은음식', singleUse: false, description: '턴 종료 시 최대 HP의 1/16 회복'}),
  fullHeal: Object.freeze({name: '만병통치제', singleUse: true, description: '독·화상·마비에 걸리면 자동 치료'}),
  sitrus: Object.freeze({name: '자뭉열매', singleUse: true, description: 'HP가 절반 이하가 되면 최대 HP의 1/4 회복'}),
  whiteHerb: Object.freeze({name: '하양허브', singleUse: true, description: '떨어진 능력치 랭크를 복구'}),
  focusSash: Object.freeze({name: '기합의 띠', singleUse: true, description: 'HP가 가득 찬 상태에서 기술로 기절할 피해를 받으면 HP 1로 버팀'})
});

const HeldItemRules = Object.freeze({
  equip(team, memberId, itemId) {
    if (!team || !team.lead || !Array.isArray(team.bench) || team.bench.length !== 2) return false;
    if (itemId !== null && !Object.prototype.hasOwnProperty.call(HELD_ITEMS, itemId)) return false;
    const members = [team.lead, ...team.bench];
    if (new Set(members.map(mon => mon && mon.id)).size !== 3 || members.some(mon => !mon)) return false;
    if (itemId !== null && !members.some(mon => mon.id === memberId)) return false;
    for (const mon of members) {
      mon.heldItem = itemId !== null && mon.id === memberId ? itemId : null;
      mon.usedHeldItem = null;
    }
    return true;
  },
  itemName(mon) {
    return HELD_ITEMS[mon && mon.heldItem]?.name || '';
  },
  onDirectDamage(mon, hpBefore, damage, side) {
    const amount = Math.max(0, Math.floor(Number(damage) || 0));
    const previous = Math.max(0, Number(hpBefore) || 0);
    let nextHp = Math.max(0, previous - amount);
    const events = [];
    if (mon.heldItem === 'focusSash' && previous === mon.maxHp && amount > 0 && nextHp === 0) {
      nextHp = 1; mon.heldItem = null; mon.usedHeldItem = 'focusSash';
      events.push({type: 'msg', side, msg: `${mon.name}의 기합의 띠! HP 1로 버텼다!`});
    }
    mon.hp = nextHp;
    if (mon.heldItem === 'sitrus' && nextHp > 0 && nextHp <= mon.maxHp / 2) {
      const heal = Math.min(mon.maxHp - nextHp, Math.max(1, Math.floor(mon.maxHp / 4)));
      mon.hp += heal; mon.heldItem = null; mon.usedHeldItem = 'sitrus';
      events.push({type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 자뭉열매! HP ${heal} 회복!`});
    }
    return {hp: mon.hp, events};
  },
  afterHpChange(mon, side) {
    if (!mon || mon.fainted || mon.hp <= 0 || mon.heldItem !== 'sitrus' || mon.hp > mon.maxHp / 2) return [];
    const heal = Math.min(mon.maxHp - mon.hp, Math.max(1, Math.floor(mon.maxHp / 4)));
    mon.hp += heal; mon.heldItem = null; mon.usedHeldItem = 'sitrus';
    return [{type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 자뭉열매! HP ${heal} 회복!`}];
  },
  afterStatChange(mon, side) {
    if (!mon || mon.heldItem !== 'whiteHerb' || !mon.stages) return [];
    const lowered = Object.keys(mon.stages).filter(stat => mon.stages[stat] < 0);
    if (!lowered.length) return [];
    for (const stat of lowered) mon.stages[stat] = 0;
    mon.heldItem = null; mon.usedHeldItem = 'whiteHerb';
    return [{type: 'msg', side, msg: `${mon.name}의 하양허브! 떨어진 능력치가 복구되었다!`}];
  },
  afterStatusChange(mon, side) {
    if (!mon || mon.heldItem !== 'fullHeal' || !(mon.poisoned || mon.burned || mon.paralyzed)) return [];
    mon.poisoned = false; mon.burned = false; mon.paralyzed = false;
    mon.heldItem = null; mon.usedHeldItem = 'fullHeal';
    return [{type: 'msg', side, msg: `${mon.name}의 만병통치제! 상태이상을 치료했다!`}];
  },
  endTurn(mon, side) {
    if (!mon || mon.fainted || mon.hp <= 0 || mon.hp >= mon.maxHp || mon.heldItem !== 'leftovers') return [];
    const heal = Math.min(mon.maxHp - mon.hp, Math.max(1, Math.floor(mon.maxHp / 16)));
    mon.hp += heal;
    return [{type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 먹다남은음식! HP ${heal} 회복!`}];
  }
});

// Presentation-only battle feedback; no changes to damage, turns, or items.
(() => {
  'use strict';
  const field=document.getElementById('battle-screen'),controls=document.getElementById('battle-bottom');
  if(!field||!controls)return;
  const css=document.createElement('style');css.textContent=`
    #battle-bottom button.battle-pressed{position:relative;overflow:hidden;animation:battlePress .22s ease-out;border-color:#7dd3fc!important;box-shadow:0 0 20px #38bdf899!important}
    #battle-bottom button.battle-pressed.switch-choice{border-color:#67e8f9!important;box-shadow:0 0 23px #67e8f9bb!important}
    .battle-press-wave{position:absolute;width:20px;height:20px;left:var(--press-x);top:var(--press-y);border-radius:50%;background:radial-gradient(circle,#ffffffaf,#38bdf880 55%,transparent 72%);pointer-events:none;transform:translate(-50%,-50%);animation:battleWave .45s ease-out forwards}
    @keyframes battlePress{40%{transform:scale(.965)}100%{transform:scale(1)}}
    @keyframes battleWave{to{opacity:0;scale:10}}
    .battle-screen .rank-surge{--rank-color:#4ade80;position:absolute;z-index:32;width:190px;height:190px;pointer-events:none;transform:translate(-50%,-50%);display:grid;place-items:center;text-align:center;color:white;font:900 22px/1.1 system-ui;text-shadow:0 2px 3px #04120d,0 0 17px var(--rank-color);animation:rankAppear 1.05s ease-out forwards}
    .rank-surge::before{content:'';position:absolute;inset:18px;border:7px solid var(--rank-color);border-radius:50%;box-shadow:0 0 22px var(--rank-color),inset 0 0 22px var(--rank-color);animation:rankRing 1.05s ease-out forwards}
    .rank-surge span{position:relative;z-index:1;background:#071b18d9;border:2px solid var(--rank-color);border-radius:10px;padding:7px 12px;box-shadow:0 0 18px var(--rank-color)}
    @keyframes rankAppear{0%{opacity:0;scale:.55}25%{opacity:1;scale:1.17}72%{opacity:1;scale:1}100%{opacity:0;scale:1.14}}
    @keyframes rankRing{0%{opacity:0;scale:.3}30%{opacity:1;scale:1.1}100%{opacity:0;scale:1.55}}
    .switch-flare{position:absolute;inset:-20px;z-index:9;border:4px solid #7dd3fc;border-radius:50%;box-shadow:0 0 28px #38bdf8,0 0 45px #67e8f9;pointer-events:none;animation:switchFlare .8s ease-out forwards}
    @keyframes switchFlare{0%{opacity:0;scale:.4}45%{opacity:1;scale:1.12}100%{opacity:0;scale:1.4}}
    @media(prefers-reduced-motion:reduce){#battle-bottom button.battle-pressed,.battle-press-wave,.rank-surge,.rank-surge::before,.switch-flare{animation:none!important}.battle-press-wave,.switch-flare{display:none}.rank-surge{opacity:1;scale:1}}
  `;document.head.append(css);
  function commandButton(node){return node?.closest?.('.btn-move,.btn-fight,.btn-switch,#menu-pokemon button');}
  function press(button,event){
    if(!button||button.disabled||getComputedStyle(field).display==='none')return;
    const switching=/selectSwitchTarget/.test(button.getAttribute('onclick')||'');
    button.classList.remove('battle-pressed','switch-choice');void button.offsetWidth;
    button.classList.add('battle-pressed');if(switching)button.classList.add('switch-choice');
    const box=button.getBoundingClientRect(),wave=document.createElement('span');wave.className='battle-press-wave';
    wave.style.setProperty('--press-x',`${event.clientX?event.clientX-box.left:box.width/2}px`);
    wave.style.setProperty('--press-y',`${event.clientY?event.clientY-box.top:box.height/2}px`);
    button.append(wave);setTimeout(()=>{wave.remove();button.classList.remove('battle-pressed','switch-choice');},480);
    if(switching){playTone(390,'sine',.14,.09,890);playNoise(.11,.035,{filter:'highpass',cutoff:1800});}
    else playTone(810,'triangle',.08,.06,1120);
  }
  controls.addEventListener('pointerdown',event=>press(commandButton(event.target),event),{passive:true});
  controls.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')press(commandButton(event.target),event);});
  const oldSwitchSound=SFX.switchIn;
  SFX.switchIn=function(...args){const result=oldSwitchSound.apply(this,args);playTone(460,'sine',.2,.08,980);return result;};
  const oldRank=window.playRankUpFX;
  if(typeof oldRank==='function')window.playRankUpFX=function(x,y,color){
    const result=oldRank.apply(this,arguments);
    if(getComputedStyle(field).display==='none')return result;
    const c=document.getElementById('fx-canvas'),scaleX=field.clientWidth/(c?.width||field.clientWidth),scaleY=field.clientHeight/(c?.height||field.clientHeight);
    const mark=document.createElement('div');mark.className='rank-surge';mark.setAttribute('aria-hidden','true');
    mark.style.left=`${Number(x)*scaleX}px`;mark.style.top=`${Number(y)*scaleY}px`;
    mark.style.setProperty('--rank-color',typeof color==='string'?color:'#4ade80');
    const text=document.createElement('span');text.textContent='▲ 랭크 UP';mark.append(text);field.append(mark);
    setTimeout(()=>mark.remove(),1100);
    return result;
  };
  let previous={player:null,enemy:null};
  const oldRender=window.renderBattleField;
  if(typeof oldRender==='function')window.renderBattleField=function(...args){
    const now={player:typeof myTeam!=='undefined'?myTeam?.lead?.id:null,enemy:typeof enemyTeam!=='undefined'?enemyTeam?.lead?.id:null};
    const changes=Object.keys(now).filter(side=>previous[side]&&now[side]&&previous[side]!==now[side]);
    const result=oldRender.apply(this,args);previous=now;
    if(getComputedStyle(field).display!=='none')for(const side of changes){const node=document.getElementById(`${side}-sprite`);if(!node)continue;const flare=document.createElement('span');flare.className='switch-flare';flare.setAttribute('aria-hidden','true');node.append(flare);setTimeout(()=>flare.remove(),850);}
    return result;
  };
})();
