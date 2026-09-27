// Community recommendations are separate from PvP win-rate tiers.
(() => {
  'use strict';
  const lobby=document.getElementById('lobby-panel');
  if(!lobby||typeof POKEDEX==='undefined')return;
  const seed=['oh','boingo','choi','sungwon_time','bae','park','lee','yoon'];
  const ids=seed.filter(id=>POKEDEX[id]);
  const baseUrl='https://fljvwzkndydseevgnhjq.supabase.co/functions/v1/';
  const endpoint=baseUrl+'champion-recommendations',pvpEndpoint=baseUrl+'champion-pvp-stats';
  // Public legacy anon JWT for the Edge Function gateway, never a service-role secret.
  const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanZ3emtuZHlkc2VldmduaGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODc5MDksImV4cCI6MjEwNTk2MzkwOX0.sMS5dRhodfVoQ-gjiKHN9u-Kt0yH_lEtXVARwpATLpo';
  const visitorKey='ochams-tier-visitor-v1';
  const css=document.createElement('style');css.textContent=`
    .champion-tier-board{position:relative;align-self:flex-start;z-index:1;width:min(320px,100%);max-width:100%;margin:0 0 10px;background:#132139;border:2px solid #6184aa;border-radius:12px;box-shadow:0 8px 25px #000a;color:#f1f5f9;font:12px/1.4 system-ui;overflow:hidden}
    .champion-tier-board summary{cursor:pointer;padding:10px 12px;background:#203655;color:#f5d487;font-size:14px;font-weight:900;list-style:none}
    .champion-tier-board summary::-webkit-details-marker{display:none}
    .champion-tier-board summary::after{content:'▾';float:right}.champion-tier-board:not([open]) summary::after{content:'▸'}
    .tier-board-body{padding:9px;max-height:min(63vh,570px);overflow:auto}
    .tier-board-note{font-size:10px;color:#b5c7db;margin-bottom:8px}.tier-board-status{font-size:10px;min-height:16px;color:#8dd7fa;margin:5px 0}
    .tier-group{display:grid;grid-template-columns:31px minmax(0,1fr);gap:5px;margin:5px 0;align-items:start}
    .tier-grade{border-radius:6px;min-height:29px;display:grid;place-items:center;background:#34465c;font-weight:900;font-size:15px}
    .tier-group[data-grade="S"] .tier-grade{background:#a52546}.tier-group[data-grade="A"] .tier-grade{background:#b65e28}.tier-group[data-grade="B"] .tier-grade{background:#70608f}
    .tier-cards{display:flex;flex-direction:column;gap:4px;min-width:0}.tier-empty{color:#71859b;font-size:10px;padding:7px 3px}
    .tier-entry{display:flex;align-items:center;gap:4px;min-width:0;background:#0c182c;border:1px solid #35516c;border-radius:6px;padding:4px}
    .tier-dot{width:9px;height:9px;flex:none;border-radius:50%;background:var(--tier-color);box-shadow:0 0 6px var(--tier-color)}
    .tier-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800}.tier-count{color:#f5d487;font-size:10px;flex:none}.tier-record{color:#91d4f8;font-size:10px;flex:none}
    .tier-vote-btn{flex:none!important;min-height:28px!important;padding:3px 6px!important;border-radius:5px!important;background:#155e75!important;color:white!important;font-size:10px!important}
    .tier-vote-btn[aria-pressed="true"]{background:#9a3412!important}.tier-vote-btn:disabled{opacity:.5;cursor:wait}
    @media(max-width:1240px){.champion-tier-board{width:min(320px,100%);box-shadow:none}.tier-board-body{max-height:320px}.tier-group{grid-template-columns:34px minmax(0,1fr)}}
    @media(max-width:600px){
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
  const summary=document.createElement('summary');summary.textContent='🏆 챔피언 PvP 승률 티어';board.append(summary);
  const body=document.createElement('div');body.className='tier-board-body';board.append(body);
  const note=document.createElement('p');note.className='tier-board-note';note.textContent='온라인 1:1 기준 · 5전 미만 기본 티어 · 추천 수는 별도';body.append(note);
  const status=document.createElement('p');status.className='tier-board-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  const groups=document.createElement('div');body.append(groups);
  const npcRow=lobby.querySelector('.ai-btn')?.closest('.btn-row');
  if(npcRow)npcRow.after(board);else lobby.append(board);
  let visitor=null,counts={},mine=new Set(),ready=false,busy=false,pvp={};
  try{
    visitor=localStorage.getItem(visitorKey);
    if(!visitor){
      visitor=crypto.randomUUID?crypto.randomUUID():null;
      if(!visitor&&crypto.getRandomValues){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;visitor=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');}
      if(visitor)localStorage.setItem(visitorKey,visitor);
    }
  }catch(error){visitor=null;}
  const count=id=>Math.max(0,Math.floor(Number(counts[id])||0));
  const score=id=>{const w=Math.max(0,Number(pvp[id]?.wins)||0),l=Math.max(0,Number(pvp[id]?.losses)||0);return w+l<5?.5:(w+2)/(w+l+4);};
  function ranking(){
    const ordered=[...ids].sort((a,b)=>score(b)-score(a)||seed.indexOf(a)-seed.indexOf(b));
    const grade={};ordered.forEach((id,index)=>{grade[id]=index<3?'S':index<7?'A':'B';});
    return {ordered,grade};
  }
  const title=text=>{status.textContent=text;};
  function render(){
    groups.replaceChildren();const {ordered,grade:tiers}=ranking();
    for(const grade of ['S','A','B']){
      const row=document.createElement('div');row.className='tier-group';row.dataset.grade=grade;
      const badge=document.createElement('span');badge.className='tier-grade';badge.textContent=grade;row.append(badge);
      const cards=document.createElement('div');cards.className='tier-cards';
      const members=ordered.filter(id=>tiers[id]===grade);
      if(!members.length){const empty=document.createElement('span');empty.className='tier-empty';empty.textContent='아직 없음';cards.append(empty);}
      for(const id of members){
        const mon=POKEDEX[id],entry=document.createElement('div');entry.className='tier-entry';
        const dot=document.createElement('span');dot.className='tier-dot';dot.style.setProperty('--tier-color',mon.color||'#38bdf8');entry.append(dot);
        const name=document.createElement('span');name.className='tier-name';name.textContent=mon.name;name.title=mon.name;entry.append(name);
        const w=Math.max(0,Number(pvp[id]?.wins)||0),l=Math.max(0,Number(pvp[id]?.losses)||0),games=w+l;
        const record=document.createElement('span');record.className='tier-record';record.textContent=games>=5?`${Math.round(w/games*100)}%`:`${games}/5전`;record.title=`온라인 1:1 ${w}승 ${l}패${games<5?' · 기본 티어 유지':''}`;entry.append(record);
        const number=document.createElement('span');number.className='tier-count';number.textContent=`👍${count(id)}`;number.title='추천 수 (승률 티어와 별개)';entry.append(number);
        const button=document.createElement('button');button.type='button';button.className='tier-vote-btn';button.dataset.champion=id;button.disabled=!ready||busy||!visitor;button.setAttribute('aria-pressed',String(mine.has(id)));button.setAttribute('aria-label',`${mon.name} ${mine.has(id)?'추천 취소':'추천'}`);button.textContent=mine.has(id)?'취소':'👍 추천';entry.append(button);cards.append(entry);
      }
      row.append(cards);groups.append(row);
    }
  }
  const headers={'Authorization':`Bearer ${anon}`,'apikey':anon,'Content-Type':'application/json'};
  async function request(method='GET',payload){
    const url=method==='GET'&&visitor?`${endpoint}?visitor_id=${encodeURIComponent(visitor)}`:endpoint;
    const res=await fetch(url,{method,headers,body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
    const data=await res.json();if(!res.ok)throw Error(data?.error||`HTTP ${res.status}`);
    counts=data.votes||{};mine=new Set(data.voted||[]);ready=true;render();
  }
  async function refresh(){if(busy)return;try{await request();title(visitor?'PvP 승률 티어 · 👍은 별도 추천 수':'PvP 승률 티어 · 브라우저 저장을 허용하면 추천 가능');}catch(error){ready=false;title('추천 서버에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');render();}}
  async function refreshPvp(){try{const res=await fetch(pvpEndpoint,{headers,cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data?.error||`HTTP ${res.status}`);pvp=data.stats||{};render();}catch(error){console.warn('PvP 승률 집계 연결 오류',error);}}
  groups.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-champion]');if(!button||busy||!ready||!visitor)return;
    const id=button.dataset.champion;if(!ids.includes(id))return;
    busy=true;render();title('추천을 반영하는 중...');
    try{await request('POST',{champion_id:id,visitor_id:visitor,action:mine.has(id)?'cancel':'recommend'});title('추천이 반영되었습니다.');}
    catch(error){title('추천 반영에 실패했습니다. 다시 시도해 주세요.');}
    finally{busy=false;render();}
  });
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
    if(record){currentMatchId=null;fetch(pvpEndpoint,{method:'POST',headers,body:JSON.stringify(record),cache:'no-store'}).then(async res=>{if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.json();pvp=data.stats||pvp;render();}).catch(error=>console.warn('PvP 전적 저장 실패',error));}
    return result;
  };
  title('추천과 PvP 승률 불러오는 중...');render();refresh();refreshPvp();
  setInterval(()=>{if(!document.hidden&&getComputedStyle(lobby).display!=='none'){refresh();refreshPvp();}},30000);
})();
