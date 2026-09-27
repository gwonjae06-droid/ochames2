// Horizontal champion tiers use completed PvP results; no recommendation UI.
(() => {
  'use strict';
  const lobby=document.getElementById('lobby-panel');
  if(!lobby||typeof POKEDEX==='undefined')return;
  const seed=['oh','boingo','choi','sungwon_time','bae','park','lee','yoon'];
  const ids=seed.filter(id=>POKEDEX[id]);
  const endpoint='https://fljvwzkndydseevgnhjq.supabase.co/functions/v1/champion-pvp-stats';
  // Public legacy anon JWT for the Edge Function gateway, never a service-role secret.
  const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanZ3emtuZHlkc2VldmduaGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODc5MDksImV4cCI6MjEwNTk2MzkwOX0.sMS5dRhodfVoQ-gjiKHN9u-Kt0yH_lEtXVARwpATLpo';
  const visitorKey='ochams-tier-visitor-v1';
  const css=document.createElement('style');css.textContent=`
    .champion-tier-board{position:relative;align-self:stretch;width:100%;min-width:0;z-index:1;margin:0 0 10px;background:#132139;border:2px solid #6184aa;border-radius:12px;color:#f1f5f9;font:12px/1.4 system-ui;overflow:hidden}
    .champion-tier-board summary{cursor:pointer;padding:10px 13px;background:#203655;color:#f5d487;font-size:14px;font-weight:900;list-style:none}
    .champion-tier-board summary::-webkit-details-marker{display:none}
    .champion-tier-board summary::after{content:'▾';float:right}.champion-tier-board:not([open]) summary::after{content:'▸'}
    .tier-board-body{padding:10px;display:grid;gap:7px}
    .tier-group{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;align-items:center;background:#101e32;border:1px solid #314b66;border-radius:8px;padding:6px}
    .tier-grade{min-height:36px;border-radius:6px;display:grid;place-items:center;background:#34465c;font-weight:900;font-size:18px}
    .tier-group[data-grade="S"] .tier-grade{background:#a52546}.tier-group[data-grade="A"] .tier-grade{background:#b65e28}.tier-group[data-grade="B"] .tier-grade{background:#70608f}
    .tier-cards{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
    .tier-name{display:inline-block;border-radius:6px;background:#243c58;border:1px solid #466686;padding:6px 9px;color:#f8fafc;font-size:12px;font-weight:800;white-space:nowrap}
    @media(max-width:600px){
      .tier-board-body{padding:7px;gap:5px}.tier-group{grid-template-columns:34px minmax(0,1fr);gap:5px;padding:5px}.tier-grade{min-height:32px;font-size:15px}.tier-name{font-size:11px;padding:5px 7px}
      #battle-screen{height:clamp(330px,100vw,380px)}
      #battle-screen .pokemon-hud{width:min(45vw,165px);padding:6px 7px}
      #battle-screen .trainer-nameplate{font-size:10px;margin-bottom:3px}
      #battle-screen .mini-badge{font-size:9px;padding:2px 4px}
      #battle-screen .sprite-enemy{top:31%;right:5%}
      #battle-screen .sprite-player{bottom:23%;left:5%}
      #battle-bottom .msg-row{flex-wrap:wrap}
      #battle-bottom .log-toggle-btn{width:100%;min-height:34px}
      #battle-bottom .dual-workspace{grid-template-columns:minmax(0,1fr)}
      #battle-bottom .menu-moves{grid-template-columns:repeat(2,minmax(0,1fr))}
      #battle-bottom .btn-move{min-height:65px}
      #battle-bottom .move-title{font-size:11px}
      #battle-bottom .chat-log{height:82px}
    }
  `;document.head.append(css);
  const board=document.createElement('details');board.className='champion-tier-board';board.open=true;
  const summary=document.createElement('summary');summary.textContent='🏆 챔피언 티어표';board.append(summary);
  const body=document.createElement('div');body.className='tier-board-body';board.append(body);
  const npcRow=lobby.querySelector('.ai-btn')?.closest('.btn-row');
  if(npcRow)npcRow.after(board);else lobby.append(board);
  let visitor=null,pvp={};
  try{
    visitor=localStorage.getItem(visitorKey);
    if(!visitor){
      visitor=crypto.randomUUID?crypto.randomUUID():null;
      if(!visitor&&crypto.getRandomValues){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;visitor=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');}
      if(visitor)localStorage.setItem(visitorKey,visitor);
    }
  }catch(error){visitor=null;}
  const score=id=>{const w=Math.max(0,Number(pvp[id]?.wins)||0),l=Math.max(0,Number(pvp[id]?.losses)||0);return w+l<5?.5:(w+2)/(w+l+4);};
  function render(){
    body.replaceChildren();
    const ordered=[...ids].sort((a,b)=>score(b)-score(a)||seed.indexOf(a)-seed.indexOf(b));
    for(const [grade,members] of [['S',ordered.slice(0,3)],['A',ordered.slice(3,7)],['B',ordered.slice(7)]]){
      const row=document.createElement('div');row.className='tier-group';row.dataset.grade=grade;
      const badge=document.createElement('span');badge.className='tier-grade';badge.textContent=grade;row.append(badge);
      const cards=document.createElement('div');cards.className='tier-cards';
      for(const id of members){const name=document.createElement('span');name.className='tier-name';name.textContent=POKEDEX[id].name;cards.append(name);}
      row.append(cards);body.append(row);
    }
  }
  const headers={'Authorization':`Bearer ${anon}`,'apikey':anon,'Content-Type':'application/json'};
  async function refresh(){try{const res=await fetch(endpoint,{headers,cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data?.error||`HTTP ${res.status}`);pvp=data.stats||{};render();}catch(error){console.warn('PvP 티어 집계 연결 오류 · 기본 티어 표시',error);}}
  let currentMatchId=null;
  const start=window.startBattleScreen;
  if(typeof start==='function')window.startBattleScreen=function(...args){
    const result=start.apply(this,args);
    currentMatchId=!isAiMode&&isHost&&!isSpectator&&args[0]!==true&&crypto.randomUUID?crypto.randomUUID():null;
    return result;
  };
  const gameOver=window.showGameOverMenu;
  if(typeof gameOver==='function')window.showGameOverMenu=function(outcome,...args){
    const shouldSave=!matchEnded&&!isAiMode&&isHost&&!isSpectator&&!!currentMatchId&&!!visitor&&!!myTeam&&!!enemyTeam&&['win','lose','draw'].includes(outcome);
    const record=shouldSave?{match_id:currentMatchId,host_visitor_id:visitor,p1_ids:[myTeam.lead,...myTeam.bench].map(mon=>mon.id),p2_ids:[enemyTeam.lead,...enemyTeam.bench].map(mon=>mon.id),result:outcome==='win'?'p1':outcome==='lose'?'p2':'draw'}:null;
    const result=gameOver.call(this,outcome,...args);
    if(record){currentMatchId=null;fetch(endpoint,{method:'POST',headers,body:JSON.stringify(record),cache:'no-store'}).then(async res=>{if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.json();pvp=data.stats||pvp;render();}).catch(error=>console.warn('PvP 전적 저장 실패',error));}
    return result;
  };
  render();refresh();
  setInterval(()=>{if(!document.hidden&&getComputedStyle(lobby).display!=='none')refresh();},30000);
})();
