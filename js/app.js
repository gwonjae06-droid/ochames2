
// -------------------------------------------------------------
// 포켓몬 턴제 배틀 메인 프론트엔드 엔진 (본가 액션 & 피격 컷신 연동)
// -------------------------------------------------------------

let sungwonSelectedForm = 'low';
let battleMode = 'ai';
let isAiMode = true;
let isHost = true;
let myNick = '도전자';
let isSpectator = false;
let spectatorConns = [];
let playerConn = null;

let myPickList = [];
let myTeam = null;
let enemyTeam = null;
let sandstormTurns = 0;
let currentTurnNumber = 1;
let battleLogHistory = [];

let damageStats = {
  player: { total: 0, byMon: {} },
  enemy: { total: 0, byMon: {} }
};
let isFaintSwitchMode = false;

let peer = null;
let conn = null;
let hostP1Choice = null;
let hostP2Choice = null;
let isProcessingTurn = false;
let queuedSnapshot=null, queuedTurns=[], queuedForced=null;
let connectTimer=null, npcTimer=null, npcSwitchTimer=null, npcSwitchPending=false;
let roomEpoch=0, matchEnded=false, teamPayload=null, submittedTurn=0;
function clearConnectTimer(){if(connectTimer)clearTimeout(connectTimer);connectTimer=null;}
function clearPendingTimers(){clearBoingoTimer();if(npcTimer)clearTimeout(npcTimer);if(npcSwitchTimer)clearTimeout(npcSwitchTimer);npcTimer=null;npcSwitchTimer=null;npcSwitchPending=false;}
function fatalBattle(message){
  ++battleGeneration;clearPendingTimers();clearConnectTimer();
  isProcessingTurn=false;hostP1Choice=null;hostP2Choice=null;queuedTurns=[];queuedSnapshot=null;queuedForced=null;
  if((battleActive || (isSpectator && document.getElementById('battle-screen').style.display==='block')) && !matchEnded){
    if(isHost && !isAiMode)broadcastData({type:'matchInterrupted',message});
    battleActive=false;matchEnded=true;enableCommands(false);setBattleMsg(message);
    const menu=document.getElementById('menu-gameover');menu.replaceChildren();menu.style.display='flex';
    if(isSpectator)document.getElementById('section-cmd').style.display='block';
    const btn=document.createElement('button');btn.className='btn-restart';btn.textContent='로비로 돌아가기';btn.onclick=restartToLobby;menu.appendChild(btn);
  } else setStatus(message);
}
function networkTimeout(epoch, message){
  clearConnectTimer();connectTimer=setTimeout(()=>{if(epoch!==roomEpoch)return;fatalBattle(message);if(peer){const old=peer;peer=null;old.destroy();}},12000);
}

let battleActive = false;
let awaitingForcedSwitch = false;
let pendingGuestForcedSwitch = false;
let roundSummary = [];
let battleHighlights = [];
let matchStart = null;
let matchRecord = null;
let lowHpAudioLead = null;
let voluntarySwitches = 0;
let roomPlayerNick = '상대';
let hostPlayerNick = '호스트';
let battleGeneration = 0;

function battleDelay(ms){return delay(ms);}
function recordBattleEvent(ev) {
  if (ev.type === 'turnStart') { roundSummary = []; return; }
  if (ev.type === 'move_announce') roundSummary.push(ev.msg);
  if (ev.type === 'damage') {
    roundSummary.push(`${ev.targetName} -${ev.dmg} HP`);
    if (ev.actorSide && ev.actorName && ev.actorName !== ev.targetName) {
      const key = (isHost ? ev.actorSide === 'p1' : ev.actorSide === 'p2') ? 'player' : 'enemy';
      const actual = Math.max(0, Number(ev.dmg) || 0);
      damageStats[key].total += actual;
      damageStats[key].byMon[ev.actorName] = (damageStats[key].byMon[ev.actorName] || 0) + actual;
    }
  }
  if (ev.type === 'switch') voluntarySwitches++;
  if (ev.type === 'faint') { roundSummary.push(ev.msg); battleHighlights.push(`T${currentTurnNumber}: ${ev.msg}`); }
  if (ev.type === 'debuff' && ev.status) roundSummary.push(ev.msg);
}
function showRoundSummary() {
  const el = document.getElementById('round-summary');
  if (!el) return;
  el.textContent = `T${currentTurnNumber} · ${roundSummary.slice(-5).join(' / ') || '변화 없음'} · HP ${Math.ceil(myTeam.lead.hp)} : ${Math.ceil(enemyTeam.lead.hp)}`;
}
function makeBattleSnapshot() {
  return {type:'battleState', p1: myTeam, p2: enemyTeam, turn: currentTurnNumber,
    sandstorm: sandstormTurns, active: battleActive, log: battleLogHistory.slice(-100),
    p1Nick:myNick,p2Nick:isAiMode?'NPC 트레이너':roomPlayerNick};
}
function applyBattleSnapshot(data){
 if(!data || !data.p1 || !data.p2 || !Number.isInteger(data.turn))return;
 if(isProcessingTurn){queuedSnapshot=data;return;}
 const first=document.getElementById('battle-screen').style.display!=='block';
 myTeam=isSpectator?data.p1:data.p2;enemyTeam=isSpectator?data.p2:data.p1;
 if(typeof data.p1Nick==='string')hostPlayerNick=data.p1Nick.slice(0,10);
 if(isSpectator&&typeof data.p2Nick==='string')roomPlayerNick=data.p2Nick.slice(0,10);
 if(first)startBattleScreen(true);
 currentTurnNumber=data.turn;sandstormTurns=data.sandstorm;battleActive=!!data.active;
 battleLogHistory=Array.isArray(data.log)?data.log:[];
 const box=document.getElementById('battle-log-content');box.replaceChildren();
 for(const line of battleLogHistory){const div=document.createElement('div');div.className='log-item';div.textContent=String(line);box.appendChild(div);}
 document.getElementById('log-count-text').textContent=battleLogHistory.length;
 renderBattleField();
 if(isSpectator){document.getElementById('section-cmd').style.display='none';return;}
 awaitingForcedSwitch=false;isFaintSwitchMode=false;
 if(battleActive)checkBattleOutcome();else fatalBattle('경기가 종료되었습니다. 로비로 돌아가 주세요.');
}
function applyForcedSwitch(side, index) {
  const team = side === 'p1' ? myTeam : enemyTeam;
  if (!team || !team.lead.fainted || ![0,1].includes(index) || !team.bench[index] || team.bench[index].fainted) return false;
  const old=team.lead, next=team.bench[index];
  for (const mon of [old,next]) {
    mon.stages={atk:0,def:0,spa:0,spd:0,spe:0};
    mon.boingoDefSpdBuffTurns=0;mon.boingoSpaBuffTurns=0;mon.overchargeBuffTurns=0;
    mon.overchargeBuffAmount=0;mon.lastMoveIndex=null;mon.protectActive=false;mon.rewindActive=false;mon.nikaTurns=0;
  }
  team.lead=next; team.bench[index]=old;
  triggerSwitchInAbilities(next, side === 'p1' ? enemyTeam.lead : myTeam.lead);
  addBattleLog(`${next.name} 출전!`);
  return true;
}
function finishForcedSwitch(side,index) {
  if (!isHost || !applyForcedSwitch(side,index)) return;
  broadcastData(makeBattleSnapshot());
  renderBattleField();
  if (side === 'p1') awaitingForcedSwitch=false;
  checkBattleOutcome();
}
function disconnectNotice(){
 if(isAiMode || matchEnded)return;
 if(battleActive)fatalBattle('상대와의 연결이 끊겼습니다. 로비에서 다시 참가해 주세요.');
 else{enemyTeam=null;hostP1Choice=null;hostP2Choice=null;setStatus('상대가 나갔습니다. 새 참가자를 기다리는 중...');}
}


function showSpectatorResult(outcome){
 if(!isSpectator)return;
 matchEnded=true;battleActive=false;clearPendingTimers();
 document.getElementById('section-cmd').style.display='block';
 document.getElementById('menu-main').style.display='none';
 document.getElementById('menu-moves').style.display='none';
 document.getElementById('menu-pokemon').style.display='none';
 document.getElementById('cmd-waiting').style.display='none';
 setBattleMsg(`경기가 종료되었습니다. 호스트 기준 ${outcome==='win'?'승리':outcome==='lose'?'패배':'무승부'}.`);
 const menu=document.getElementById('menu-gameover');menu.replaceChildren();menu.style.display='flex';
 const btn=document.createElement('button');btn.className='btn-restart';btn.textContent='로비로 돌아가기';btn.onclick=restartToLobby;menu.appendChild(btn);
}
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function setStatus(msg, connected = false) {
  const el = document.getElementById('net-status');
  if (!el) return;
  el.textContent = msg;
  if (connected) el.classList.add('connected');
  else el.classList.remove('connected');
}

function getNickname() {
  const input = document.getElementById('user-nickname');
  if (input && input.value.trim()) {
    myNick = input.value.trim().slice(0,10);
  } else {
    myNick = '도전자_' + Math.floor(Math.random() * 900 + 100);
    if (input) input.value = myNick;
  }
  if(input)input.value=myNick;
  return myNick;
}

function joinRoomByButton(roomName, mode) {
  getNickname();
  joinRoom(roomName, mode);
}

// ---------------- 엔트리 픽 ----------------
function initPickUI() {
  const grid = document.getElementById('pick-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.values(POKEDEX).forEach(p => {
    const card = document.createElement('div');
    card.className = 'pick-card';
    card.id = `card-${p.id}`;
    card.innerHTML = `
      <div class="pick-name">${p.name}</div>
      <div class="pick-type">[${p.type}]</div>
      <div style="font-size:8.5px; color:#94a3b8; margin-top:2px;">${p.roleTag}</div>
      <div id="badge-${p.id}"></div>
    `;
    card.onclick = () => {
      SFX.click();
      showCharDetail(p.id);
      togglePick(p.id);
    };
    grid.appendChild(card);
    const portrait=document.createElement('div');portrait.className='pick-portrait';const label=document.createElement('span');label.className='sprite-label';portrait.append(label);card.prepend(portrait);mountChampionArt(portrait,p);
  });
  showCharDetail('bae');
  updatePickVisuals();
}

function selectSungwonForm(mode) {
  SFX.click();
  sungwonSelectedForm = mode;
  const lowBtn = document.getElementById('btn-form-low');
  const highBtn = document.getElementById('btn-form-high');
  if (lowBtn && highBtn) {
    if (mode === 'low') {
      lowBtn.style.background = '#0284c7'; lowBtn.style.color = '#fff';
      highBtn.style.background = '#1e293b'; highBtn.style.color = '#94a3b8';
    } else {
      highBtn.style.background = '#06b6d4'; highBtn.style.color = '#fff';
      lowBtn.style.background = '#1e293b'; lowBtn.style.color = '#94a3b8';
    }
  }
}

function showCharDetail(id) {
  const p = POKEDEX[id];
  const titleEl = document.getElementById('d-title');
  const matchupEl = document.getElementById('d-matchup');
  if (titleEl) titleEl.textContent = `${p.name} [${p.type} · ${p.roleTag}] (HP: ${p.hp} / 속도: ${p.id === 'sungwon_time' ? (sungwonSelectedForm === 'low' ? '30~79 (저속)' : '121~170 (고속)') : p.spe})`;
  if (matchupEl) matchupEl.textContent = `유리: ${p.advantage} | 불리: ${p.disadvantage}`;
  
  const abilityEl = document.getElementById('d-ability');
  const storyHtml = p.story ? `<div style="color:#cbd5e1; font-style:italic; font-size:11.5px; margin-bottom:5px; padding-bottom:4px; border-bottom:1px dashed #475569;">"${p.story}"</div>` : '';

  let formSelectHtml = '';
  if (id === 'sungwon_time') {
    formSelectHtml = `
      <div style="margin-top:6px; padding:6px; background:#0f172a; border-radius:6px; border:1px solid #334155; display:flex; flex-direction:column; gap:4px;">
        <div style="font-size:10.5px; font-weight:bold; color:#38bdf8;">시작 폼 선택:</div>
        <div style="display:flex; gap:6px;">
          <button id="btn-form-low" onclick="selectSungwonForm('low')" style="flex:1; padding:4px; font-size:10px; border-radius:4px; border:1px solid #0284c7; cursor:pointer; background:${sungwonSelectedForm === 'low' ? '#0284c7' : '#1e293b'}; color:${sungwonSelectedForm === 'low' ? '#fff' : '#94a3b8'};">저속 폼 (30~79)</button>
          <button id="btn-form-high" onclick="selectSungwonForm('high')" style="flex:1; padding:4px; font-size:10px; border-radius:4px; border:1px solid #06b6d4; cursor:pointer; background:${sungwonSelectedForm === 'high' ? '#06b6d4' : '#1e293b'}; color:${sungwonSelectedForm === 'high' ? '#fff' : '#94a3b8'};">고속 폼 (121~170)</button>
        </div>
      </div>
    `;
  }

  if (abilityEl) abilityEl.innerHTML = `${storyHtml}특성 [${p.ability}]: ${p.abilityDesc}${formSelectHtml}`;

  const movesList = document.getElementById('d-moves');
  if (movesList) {
    movesList.innerHTML = '';
    p.moves.forEach(m => {
      const item = document.createElement('div');
      item.className = 'detail-move-item';
      const tag = m.pwr > 0 ? `위력${m.pwr}` : m.role;
      item.innerHTML = `<b>${m.name}</b> <span style="color:#38bdf8;">[${tag}]</span>: ${m.desc}`;
      movesList.appendChild(item);
    });
  }
}

function togglePick(id) {
  const idx = myPickList.indexOf(id);
  if (idx > -1) {
    myPickList.splice(idx, 1);
  } else {
    if (myPickList.length >= 3) return;
    myPickList.push(id);
  }
  updatePickVisuals();
}

function updatePickVisuals() {
  const [leadPick, benchPick1, benchPick2] = myPickList;

  Object.keys(POKEDEX).forEach(id => {
    const card = document.getElementById(`card-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    if (!card) return;
    card.className = 'pick-card';
    if (badge) badge.innerHTML = '';

    if (leadPick === id) {
      card.classList.add('lead');
      if (badge) badge.innerHTML = '<span class="pick-order lead-badge">1st 선발</span>';
    } else if (benchPick1 === id) {
      card.classList.add('bench');
      if (badge) badge.innerHTML = '<span class="pick-order bench-badge">2nd 벤치</span>';
    } else if (benchPick2 === id) {
      card.classList.add('bench');
      if (badge) badge.innerHTML = '<span class="pick-order bench-badge" style="background:#0284c7;">3rd 벤치</span>';
    }
  });

  const btn = document.getElementById('btn-ready');
  if (!btn) return;
  const ready = (myPickList.length === 3);
  btn.disabled = !ready;
  if (isAiMode) {
    btn.textContent = ready ? '배틀 시작 (vs NPC)' : `선택 완료 (${myPickList.length}/3명 필요)`;
  } else {
    btn.textContent = ready ? '선택 완료 (준비하기)' : `선택 완료 (${myPickList.length}/3명 필요)`;
  }
}

function startAiMode() {
  ++roomEpoch;clearConnectTimer();clearPendingTimers();
  SFX.click();
  getNickname();
  battleMode = 'ai';
  if (peer) {peer.destroy(); peer=null;conn=null;playerConn=null;spectatorConns=[];}
  isSpectator=false;matchEnded=false;submittedTurn=0;
  isAiMode = true;
  isHost = true;
  setStatus('NPC 대전 모드 활성화. 엔트리 3명을 선택하세요!', true);
  updatePickVisuals();
}

// ---------------- 네트워크 ----------------
function joinRoom(roomId,mode='player'){
 SFX.click();getNickname();const epoch=++roomEpoch;
 clearConnectTimer();clearPendingTimers();++battleGeneration;
 battleActive=false;matchEnded=false;isProcessingTurn=false;queuedSnapshot=null;queuedTurns=[];queuedForced=null;submittedTurn=0;
 hostP1Choice=null;hostP2Choice=null;isSpectator=mode==='spectator';isHost=isSpectator;isAiMode=false;battleMode='pvp';
 if(peer){const old=peer;peer=null;old.destroy();}
 conn=null;playerConn=null;spectatorConns=[];myTeam=null;enemyTeam=null;myPickList=[];teamPayload=null;updatePickVisuals();
 setStatus(`[${roomId}] 연결 중...`);
 if(typeof Peer!=='function'){fatalBattle('온라인 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return;}
 const id='OEBPOKE-'+roomId;
 const fail=msg=>{if(epoch!==roomEpoch)return;fatalBattle(msg);if(peer){const old=peer;peer=null;old.destroy();}};
 const connect=spectator=>{
  if(epoch!==roomEpoch)return;
  try{
   conn=peer.connect(id,{reliable:true});
   if(spectator)setupSpectatorConnection();else setupConnection();
   conn.on('error',()=>fail('방 연결에 실패했습니다. 다시 접속해 주세요.'));
   networkTimeout(epoch,'방 접속 시간이 초과됐습니다. 다시 시도해 주세요.');
  }catch(err){fail('방 연결을 시작하지 못했습니다.');}
 };
 try{
  if(isSpectator){
   peer=new Peer();peer.on('open',()=>connect(true));
   peer.on('error',()=>fail('관전 방에 접속하지 못했습니다.'));
   networkTimeout(epoch,'관전 접속 시간이 초과됐습니다.');
  }else{
   peer=new Peer(id);
   peer.on('open',()=>{if(epoch!==roomEpoch)return;isHost=true;clearConnectTimer();setStatus(`[${roomId}] 방 생성 완료. 상대 대기 중...`,true);});
   peer.on('connection',c=>{if(epoch===roomEpoch)handleIncomingConnection(c);else c.close();});
   peer.on('error',err=>{
    if(epoch!==roomEpoch)return;
    if(err.type==='unavailable-id'){
     peer.destroy();peer=new Peer();
     peer.on('open',()=>{isHost=false;connect(false);});
     peer.on('error',()=>fail('호스트 연결에 실패했습니다.'));
     networkTimeout(epoch,'호스트 접속 시간이 초과됐습니다.');
    }else fail('연결 오류가 발생했습니다. 네트워크를 확인해 주세요.');
   });
   networkTimeout(epoch,'방 생성 시간이 초과됐습니다.');
  }
 }catch(err){fail('온라인 연결을 시작할 수 없습니다.');}
}

function setupConnection(){
 const channel=conn;
 channel.on('open',()=>{
  if(channel!==conn)return;clearConnectTimer();
  setStatus('상대와 연결되었습니다. 엔트리를 선택하세요.',true);
  channel.send({type:'handshake',role:'player',nickname:myNick});
  if(teamPayload)channel.send(teamPayload);
  updatePickVisuals();
 });
 channel.on('close',()=>{if(channel===conn && !isAiMode && !matchEnded)fatalBattle('호스트와의 연결이 끊겼습니다. 로비에서 다시 참가해 주세요.');});
 channel.on('data',data=>{
  if(channel!==conn || !data)return;
  if(data.type==='battleStart'){
   if(battleActive || !myTeam || !data.hostTeam)return;
   const t=data.hostTeam;hostPlayerNick=typeof data.hostNick==='string'?data.hostNick.slice(0,10):'호스트';
   enemyTeam={lead:buildMon(t.leadId,t.leadForm),bench:[buildMon(t.bench1Id,t.bench1Form),buildMon(t.bench2Id,t.bench2Form)]};
   startBattleScreen();
  }else if(data.type==='battleState')applyBattleSnapshot(data);
  else if(data.type==='matchInterrupted')fatalBattle(data.message || '경기가 중단됐습니다.');
  else if(data.type==='roomFull' || data.type==='roomUnavailable')fatalBattle('이 방에 참가할 수 없습니다. 다른 방을 선택해 주세요.');
  else if(data.type==='executeTurnEvents')queueTurn(data.events);
  else if(data.type==='chat')appendChatMessage(data.sender,data.text,'enemy');
 });
}

function handleIncomingConnection(c) {
  c.on('data', data => {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'handshake') {
      if(matchEnded){c.send({type:'roomUnavailable'});c.close();return;}
      if (data.role === 'spectator') {
        spectatorConns.push({conn:c, nick:String(data.nickname||'관전자').slice(0,10)});
        if (battleActive && myTeam && enemyTeam) c.send(makeBattleSnapshot());
      } else if (data.role === 'player') {
        if (playerConn && playerConn !== c && playerConn.open) { c.send({type:'roomFull'}); c.close(); return; }
        playerConn=c; conn=c; roomPlayerNick=String(data.nickname||'상대').slice(0,10);
        setStatus(`${roomPlayerNick} 님이 입장했습니다!`,true);
        updatePickVisuals();
        if (battleActive) c.send(makeBattleSnapshot());
      }
      return;
    }
    if (spectatorConns.some(s=>s.conn === c)) {
      if (data.type === 'chat' && typeof data.text === 'string') {
        const msg={type:'chat',sender:'관전자',text:data.text.slice(0,200)};
        broadcastData(msg); appendChatMessage(msg.sender,msg.text,'enemy');
      }
      return;
    }
    if (c !== playerConn) return;
    if (data.type === 'teamReady' && !battleActive) {
      const team=data.team;
      if (!team || ![team.leadId,team.bench1Id,team.bench2Id].every(id=>Object.prototype.hasOwnProperty.call(POKEDEX,id)) || new Set([team.leadId,team.bench1Id,team.bench2Id]).size!==3) return;
      enemyTeam={lead:buildMon(team.leadId,team.leadForm),bench:[buildMon(team.bench1Id,team.bench1Form),buildMon(team.bench2Id,team.bench2Form)]};
      checkBothReady();
    } else if (data.type === 'actionChoice' && battleActive && !enemyTeam.lead.fainted) {
      if (data.turn !== currentTurnNumber + (isProcessingTurn ? 1 : 0) || hostP2Choice) return;
      const choice=data.choice;
      if (!choice || !['move','switch'].includes(choice.type)) return;
      if (choice.type === 'move' && (!Number.isInteger(choice.moveIndex) || choice.moveIndex<0 || choice.moveIndex>3 || enemyTeam.lead.moves[choice.moveIndex].isPassiveFaint)) return;
      if (choice.type === 'switch' && (![0,1].includes(choice.benchIndex) || enemyTeam.bench[choice.benchIndex].fainted)) return;
      hostP2Choice=choice; checkExecuteTurn();
    } else if (data.type === 'forcedSwitch' && battleActive && data.turn === currentTurnNumber) {
      finishForcedSwitch('p2',data.benchIndex);
    } else if (data.type === 'chat' && typeof data.text === 'string') {
      const msg={type:'chat',sender:roomPlayerNick,text:data.text.slice(0,200)};
      for (const s of spectatorConns) if (s.conn.open) s.conn.send(msg);
      appendChatMessage(msg.sender,msg.text,'enemy');
    }
  });
  c.on('close', () => {
    spectatorConns=spectatorConns.filter(s=>s.conn !== c);
    if(c===playerConn){playerConn=null;conn=null;disconnectNotice();}
  });
}

function broadcastData(data) {
  if (playerConn && playerConn.open) playerConn.send(data);
  if (spectatorConns && spectatorConns.length > 0) {
    spectatorConns.forEach(s => {
      if (s.conn && s.conn.open) s.conn.send(data);
    });
  }
}

function setupSpectatorConnection(){
 const channel=conn;
 channel.on('open',()=>{
  if(channel!==conn)return;clearConnectTimer();
  setStatus('관전 연결 완료. 경기 시작을 기다립니다.',true);
  channel.send({type:'handshake',role:'spectator',nickname:myNick});
  document.getElementById('lobby-panel').style.display='none';document.getElementById('pick-panel').style.display='none';
  document.getElementById('battle-screen').style.display='block';document.getElementById('battle-bottom').style.display='flex';
  document.getElementById('section-cmd').style.display='none';setBattleMsg('경기 시작을 기다리는 중...');
 });
 channel.on('close',()=>{if(channel===conn && !matchEnded)fatalBattle('관전 연결이 끊겼습니다.');});
 channel.on('data',data=>{
  if(channel!==conn || !data)return;
  if(data.type==='battleState')applyBattleSnapshot(data);
  else if(data.type==='executeTurnEvents')queueTurn(data.events);
  else if(data.type==='matchInterrupted')fatalBattle(data.message || '경기가 중단됐습니다.');
  else if(data.type==='matchComplete')showSpectatorResult(data.outcome);
  else if(data.type==='roomUnavailable')fatalBattle('관전할 수 없는 방입니다.');
  else if(data.type==='chat')appendChatMessage(data.sender,data.text,'enemy');
 });
}

function confirmTeam() {
  SFX.click();
  if (myPickList.length < 3) {
    alert('엔트리 3명을 모두 선택해주세요!');
    return;
  }

  const [p1Id, p2Id, p3Id] = myPickList;
  const f1 = (p1Id === 'sungwon_time') ? sungwonSelectedForm : null;
  const f2 = (p2Id === 'sungwon_time') ? sungwonSelectedForm : null;
  const f3 = (p3Id === 'sungwon_time') ? sungwonSelectedForm : null;

  myTeam = {
    lead: buildMon(p1Id, f1),
    bench: [
      buildMon(p2Id, f2),
      buildMon(p3Id, f3)
    ]
  };

  if (isAiMode) {
    const allIds = Object.keys(POKEDEX);
    const npcPool = allIds.filter(id => !myPickList.includes(id));
    const candidates = npcPool.length >= 3 ? npcPool : allIds;
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const [e1Id, e2Id, e3Id] = shuffled;
    
    enemyTeam = {
      lead: buildMon(e1Id),
      bench: [
        buildMon(e2Id),
        buildMon(e3Id)
      ]
    };
    startBattleScreen();
  } else {
    document.getElementById('btn-ready').disabled = true;
    document.getElementById('btn-ready').textContent = '상대 선택 대기 중...';
    const payload = {
      type: 'teamReady',
      team: {
        leadId: p1Id, leadForm: f1,
        bench1Id: p2Id, bench1Form: f2,
        bench2Id: p3Id, bench2Form: f3
      }
    };
    teamPayload=payload;
    if(isHost && playerConn && playerConn.open)playerConn.send(payload);
    else if(!isHost && conn && conn.open)conn.send(payload);
    else setStatus('연결을 기다리는 중입니다. 연결되면 엔트리를 자동 전송합니다.');
    checkBothReady();
  }
}

function checkBothReady() {
  if(myTeam && enemyTeam && isHost && !battleActive && playerConn && playerConn.open){
    const [b1, b2] = myTeam.bench;
    broadcastData({
      type: 'battleStart', hostNick:myNick,
      hostTeam: {
        leadId: myTeam.lead.id, leadForm: null,
        bench1Id: b1.id, bench1Form: null,
        bench2Id: b2.id, bench2Form: null
      }
    });
    startBattleScreen();
    broadcastData(makeBattleSnapshot());
  }
}

// ---------------- 배틀 화면 ----------------
function startBattleScreen(fromSnapshot = false) {
  battleGeneration++;
  battleActive = true;matchEnded=false;submittedTurn=0;
  if(typeof startBattleMusic==='function')startBattleMusic(()=>battleActive&&!matchEnded,()=>!isSpectator&&myTeam&&myTeam.lead&&myTeam.lead.hp>0&&myTeam.lead.hp/myTeam.lead.maxHp<=.30);
  matchStart = Date.now();
  lowHpAudioLead = null;
  battleHighlights = []; voluntarySwitches=0;
  document.getElementById('section-cmd').style.display = isSpectator ? 'none' : 'block';
  document.getElementById('round-summary').textContent = '3명 엔트리 · 선발 1명 / 벤치 2명';
  document.getElementById('lobby-panel').style.display = 'none';
  document.getElementById('pick-panel').style.display = 'none';
  document.getElementById('battle-screen').style.display = 'block';
  document.getElementById('battle-bottom').style.display = 'flex';
  document.getElementById('menu-gameover').style.display = 'none';

  currentTurnNumber = 1;
  battleLogHistory = [];
  isFaintSwitchMode = false;
  document.getElementById('battle-log-content').innerHTML = '';

  const [pb1, pb2] = myTeam.bench;
  const [eb1, eb2] = enemyTeam.bench;
  damageStats = {
    player: { total: 0, byMon: { [myTeam.lead.name]: 0, [pb1.name]: 0, [pb2.name]: 0 } },
    enemy: { total: 0, byMon: { [enemyTeam.lead.name]: 0, [eb1.name]: 0, [eb2.name]: 0 } }
  };

  SFX.switchIn();
  renderBattleField();
  setBattleMsg(`${isAiMode ? 'NPC 트레이너' : '상대'}의 ${enemyTeam.lead.name} 출현! 가라, ${myTeam.lead.name}!`);

  if (!isSpectator && !fromSnapshot) {
    triggerSwitchInAbilities(myTeam.lead, enemyTeam.lead);
    triggerSwitchInAbilities(enemyTeam.lead, myTeam.lead);
    enableCommands(true);
  }
}

function triggerSwitchInAbilities(userMon, opponentMon) {
  const generation=battleGeneration;
  if (userMon.ability === '위협') {
    if (opponentMon.ability === '엄마없음') {
      setTimeout(() => {if(generation===battleGeneration && battleActive)setBattleMsg(`${opponentMon.name}의 특성 [엄마없음]! 공격력이 떨어지지 않는다!`);},700);
    } else {
      opponentMon.stages.atk = Math.max(-6, (opponentMon.stages.atk || 0) - 1);
      SFX.rankDown();
      setTimeout(() => {if(generation===battleGeneration && battleActive)setBattleMsg(`${userMon.name}의 [위협]! ${opponentMon.name}의 공격력이 떨어졌다!`);},700);
    }
  }
}

const SPRITE_FILES=Object.freeze({bae:'bae',oh:'oh',lee:'lee',park:'park',choi:'choi',yoon:'yoon',boingo:'boingo',sungwon_time:'sungwon_time'});
function mountChampionArt(node,mon,back=false){
 if(!node||!mon||!Object.prototype.hasOwnProperty.call(SPRITE_FILES,mon.id))return;
 const key=mon.id+(back?'-back':'-front');node.dataset.character=mon.id;
 node.style.setProperty('--sprite-color',mon.color);node.setAttribute('aria-label',mon.name);
 if(node.dataset.spriteKey===key)return;node.dataset.spriteKey=key;node.dataset.spriteReady='false';
 const label=node.querySelector('.sprite-label');if(label)label.textContent=mon.name;
 let img=node.querySelector('.champion-art');
 if(!img){img=document.createElement('img');img.className='champion-art';img.alt='';img.draggable=false;node.prepend(img);}
 const front=`assets/sprites/${SPRITE_FILES[mon.id]}.png`;let fallback=!back;
 img.onload=()=>{if(node.dataset.spriteKey===key)node.dataset.spriteReady='true';};
 img.onerror=()=>{if(node.dataset.spriteKey!==key)return;if(!fallback){fallback=true;img.src=front;}else{node.dataset.spriteReady='false';img.removeAttribute('src');}};
 img.src=back?`assets/sprites/${SPRITE_FILES[mon.id]}-back.png`:front;
}
function escapeNick(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updateTrainerNameplate(){
 const names=[['player',isSpectator?hostPlayerNick:myNick],['enemy',isAiMode?'NPC 트레이너':isSpectator?roomPlayerNick:isHost?roomPlayerNick:hostPlayerNick]];
 for(const [side,name] of names){const root=document.querySelector(`.hud-${side}`);if(!root)continue;
 let tag=root.querySelector('.trainer-nameplate');if(!tag){tag=document.createElement('div');tag.className='trainer-nameplate';root.prepend(tag);}
 tag.textContent=`${side==='player'?(isSpectator?'P1':'내 트레이너'):(isSpectator?'P2':'상대 트레이너')} · ${name}`;}
}

function renderBattleField() {
  if (!myTeam || !enemyTeam) return;

  const p = myTeam.lead;
  const e = enemyTeam.lead;
  const pRealSpe = getStat(p, 'spe', sandstormTurns);
  const eRealSpe = getStat(e, 'spe', sandstormTurns);

  const pSprite=document.getElementById('player-sprite');
  const eSprite=document.getElementById('enemy-sprite');
  mountChampionArt(pSprite,p,true);mountChampionArt(eSprite,e);updateTrainerNameplate();
  for (const [sprite, mon] of [[pSprite, p], [eSprite, e]]) {
    if (!sprite) continue;
    sprite.classList.toggle('sprite-status-poison', !!mon.poisoned && !mon.fainted);
    sprite.classList.toggle('sprite-status-burn', !!mon.burned && !mon.fainted);
    sprite.classList.toggle('sprite-status-paralyze', !!mon.paralyzed && !mon.fainted);
    sprite.classList.toggle('sprite-faint', !!mon.fainted);
    sprite.classList.toggle('sprite-nika',mon.id==='lee'&&mon.nikaTurns>0&&!mon.fainted);
    if(typeof updateNikaAmbientFX==='function')updateNikaAmbientFX(sprite.id,mon.id==='lee'&&mon.nikaTurns>0&&!mon.fainted);
    const tags=[];if(mon.poisoned)tags.push('☠ 독');if(mon.burned)tags.push('🔥 화상');if(mon.paralyzed)tags.push('⚡ 마비');
    const tag=sprite.querySelector('.condition-tags');if(tag){tag.textContent=tags.join(' · ');tag.hidden=!tags.length||!!mon.fainted;}
  }
  const playerHud = document.querySelector('.hud-player');
  const enemyHud = document.querySelector('.hud-enemy');
  const playerLow=p.hp>0&&p.hp/p.maxHp<=0.30;
  const arena=document.getElementById('battle-screen');
  if(arena){
    let danger=arena.querySelector('.low-hp-overlay');
    if(!danger){danger=document.createElement('div');danger.className='low-hp-overlay';danger.setAttribute('aria-hidden','true');arena.appendChild(danger);}
    arena.classList.toggle('low-hp-alert',playerLow&&!isSpectator&&battleActive);
  }
  if (playerHud) playerHud.classList.toggle('hud-low-hp', playerLow);
  if (enemyHud) enemyHud.classList.toggle('hud-low-hp', e.hp > 0 && e.hp / e.maxHp <= 0.30);
  if (!playerLow || p.fainted) lowHpAudioLead = null;
  else if (!isSpectator && battleActive && lowHpAudioLead !== p.id) {
    lowHpAudioLead = p.id;
    if (typeof SFX.lowHp === 'function') SFX.lowHp();
  }

  let pStatus = (p.poisoned ? ' (독)' : '') + (p.burned ? ' (화상)' : '') + (p.paralyzed ? ' (마비)' : '');
  let eStatus = (e.poisoned ? ' (독)' : '') + (e.burned ? ' (화상)' : '') + (e.paralyzed ? ' (마비)' : '');

  document.getElementById('player-name').textContent = `${p.name} [${p.type}] (속도:${pRealSpe})${pStatus}`;
  document.getElementById('player-hp-num').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  updateHpBar('player-hp-bar', p.hp, p.maxHp);

  document.getElementById('enemy-name').textContent = `${isAiMode ? 'NPC · ' : ''}${e.name} [${e.type}] (속도:${eRealSpe})${eStatus}`;
  document.getElementById('enemy-hp-num').textContent = `${Math.ceil(e.hp)} / ${e.maxHp}`;
  updateHpBar('enemy-hp-bar', e.hp, e.maxHp);

  updateBallIcons('player-ball', myTeam);
  updateBallIcons('enemy-ball', enemyTeam);

  renderHudBadges('player-hud-badges', p);
  renderHudBadges('enemy-hud-badges', e);

  const detailModal = document.getElementById('detail-modal');
  if (detailModal && detailModal.style.display === 'flex') {
    renderDetailModalContent();
  }
}

function updateBallIcons(prefix, team) {
  const [b1, b2] = team.bench;
  const allMons = [team.lead, b1, b2];
  allMons.forEach((mon, i) => {
    const ball = document.getElementById(`${prefix}-${i + 1}`);
    if (ball) {
      if (!mon || mon.fainted) ball.classList.add('fainted');
      else ball.classList.remove('fainted');
    }
  });
}

function renderHudBadges(containerId, mon) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  for(const [on,cls,text] of [[mon.poisoned,'poison','☠ 독'],[mon.burned,'burn','🔥 화상'],[mon.paralyzed,'paralyze','⚡ 마비'],[mon.id==='lee'&&mon.nikaTurns>0,'nika',`☁️ 니카 ${mon.nikaTurns}T`]]){if(on){const badge=document.createElement('span');badge.className=`mini-badge condition-${cls}`;badge.textContent=text;container.append(badge);}}
  const statLabels = { atk: '공', def: '방', spa: '특공', spd: '특방', spe: '스피드' };
  Object.keys(statLabels).forEach(st => {
    let val = mon.stages[st] || 0;
    if (val !== 0) {
      const badge = document.createElement('span');
      badge.className = `mini-badge ${val > 0 ? 'buff' : 'debuff'}`;
      badge.textContent = `${statLabels[st]}${val > 0 ? '+' : ''}${val}`;
      container.appendChild(badge);
    }
  });

  if (mon.reflectTurns > 0) {
    const b = document.createElement('span'); b.className = 'mini-badge shield';
    b.textContent = `장막(${mon.reflectTurns}T)`; container.appendChild(b);
  }
  if (mon.charged) {
    const b = document.createElement('span'); b.className = 'mini-badge buff';
    b.textContent = '충전'; container.appendChild(b);
  }
  if (mon.tauntedTurns > 0) {
    const b = document.createElement('span'); b.className = 'mini-badge debuff';
    b.textContent = `도발(${mon.tauntedTurns}T)`; container.appendChild(b);
  }
}

function updateHpBar(elementId, cur, max) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  el.style.width = `${pct}%`;
  el.className = 'hp-bar';
  if (pct <= 20) el.classList.add('danger');
  else if (pct <= 50) el.classList.add('warn');
}

function setBattleMsg(txt) {
  const el = document.getElementById('battle-msg');
  if (el) el.textContent = txt;
  addBattleLog(txt);
}

function addBattleLog(msg) {
  if (!msg || msg === '대결 상대를 기다리는 중입니다...') return;
  battleLogHistory.push(msg);
  const container = document.getElementById('battle-log-content');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'log-item';
  if (msg.includes('굉장했다') || msg.includes('급소') || msg.includes('피해')) item.classList.add('highlight');
  else if (msg.includes('상승') || msg.includes('회복') || msg.includes('완치')) item.classList.add('buff');
  else if (msg.includes('쓰러졌다')) item.classList.add('faint');
  item.textContent = `• ${msg}`;
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
  document.getElementById('log-count-text').textContent = `${battleLogHistory.length}건 기록됨`;
}

function toggleBattleLog() {
  SFX.click();
  const drawer = document.getElementById('battle-log-drawer');
  const btn = document.getElementById('btn-toggle-log');
  if (drawer.style.display === 'none') {
    drawer.style.display = 'flex'; btn.textContent = '전투로그 접기 ▲';
  } else {
    drawer.style.display = 'none'; btn.textContent = '전투로그 펼치기 ▼';
  }
}

// ---------------- 커맨드 조작 ----------------
function clearBoingoTimer() {
  if(window.boingoAutoTimer)clearTimeout(window.boingoAutoTimer);
  if(window.boingoInterval)clearInterval(window.boingoInterval);
  window.boingoAutoTimer=null;window.boingoInterval=null;
}

function enableCommands(enable) {
  if (isSpectator || !myTeam || !myTeam.lead) return;

  const waitingEl = document.getElementById('cmd-waiting');
  const statusInd = document.getElementById('cmd-status-indicator');

  if (enable) {
    if (myTeam.lead.ability === '만화예언' || myTeam.lead.id === 'boingo') {
      if (waitingEl) waitingEl.style.display = 'none';
      document.getElementById('menu-main').style.display = 'none';
      document.getElementById('menu-moves').style.display = 'none';
      const canSwitch=myTeam.bench.some(b=>b&&!b.fainted);
      if(canSwitch)openSwitchMenu();
      else document.getElementById('menu-pokemon').style.display='none';

      statusInd.textContent = '보인고오슬우 자동 조종 중';
      statusInd.style.color = '#db2777';

      const autoGeneration=battleGeneration,autoLead=myTeam.lead,autoTurn=currentTurnNumber;
      let countdown = 4;
      setBattleMsg(`[만화예언] 4초 후 무작위 스킬 자동 발동! (지금 교체 가능)`);

      clearBoingoTimer();
      window.boingoInterval = setInterval(() => {
        countdown--;
        if(countdown>0 && battleActive && !matchEnded && autoGeneration===battleGeneration && currentTurnNumber===autoTurn && myTeam.lead===autoLead && submittedTurn!==autoTurn)
          setBattleMsg(`[만화예언] ${countdown}초 후 자동 스킬 발동! (${myTeam.bench.some(b=>b&&!b.fainted)?'교체 가능':'자동 행동'})`);
      }, 1000);

      window.boingoAutoTimer = setTimeout(() => {
        clearInterval(window.boingoInterval);window.boingoInterval=null;window.boingoAutoTimer=null;
        if(!battleActive||matchEnded||isProcessingTurn||autoGeneration!==battleGeneration||autoTurn!==currentTurnNumber||submittedTurn===autoTurn||myTeam.lead!==autoLead)return;
        document.getElementById('menu-pokemon').style.display='none';
        const validMoves = myTeam.lead.moves.map((m, idx) => (!m.isPassiveFaint ? idx : null)).filter(v => v !== null);
        const randomIdx = validMoves[Math.floor(Math.random() * validMoves.length)] || 0;
        submitTurnChoice({ type: 'move', moveIndex: randomIdx });
      }, 4000);
      return;
    }

    if (waitingEl) waitingEl.style.display = 'none';
    document.getElementById('menu-main').style.display = 'grid';
    document.getElementById('menu-moves').style.display = 'none';
    document.getElementById('menu-pokemon').style.display = 'none';
    statusInd.textContent = `내 턴 (Turn ${currentTurnNumber})`;
    statusInd.style.color = '#38bdf8';
  } else {
    clearBoingoTimer();
    if (waitingEl) { waitingEl.style.display = 'flex'; waitingEl.textContent = '턴 진행 중...'; }
    document.getElementById('menu-main').style.display = 'none';
    document.getElementById('menu-moves').style.display = 'none';
    document.getElementById('menu-pokemon').style.display = 'none';
    statusInd.textContent = '진행 중...';
    statusInd.style.color = '#94a3b8';
  }
}

function openMoveMenu() {
  SFX.click();
  document.getElementById('menu-main').style.display = 'none';
  document.getElementById('menu-moves').style.display = 'grid';

  const enemyMon = enemyTeam.lead;
  const isTaunted = myTeam.lead.tauntedTurns > 0;

  myTeam.lead.moves.forEach((m, i) => {
    const btn = document.getElementById(`btn-m${i}`);
    const nameEl = document.getElementById(`m${i}-name`);
    const descEl = document.getElementById(`m${i}-desc`);
    const tag = document.getElementById(`m${i}-tag`);

    const nikaMove=myTeam.lead.id==='lee'&&myTeam.lead.nikaTurns>0&&i===1;
    if(nameEl)nameEl.textContent=nikaMove?'벽력일섬':m.name;
    if(descEl)descEl.textContent=nikaMove?'니카 전용 · 위력 86 · 우선도 +2 · 15% 풀죽음':m.desc;
    if (!btn || !tag) return;

    btn.disabled = false;
    btn.className = 'btn-move';

    if (m.isPassiveFaint) {
      btn.disabled = true; tag.className = 'move-tag tag-protect'; tag.textContent = '패시브';
      return;
    }

    if (isTaunted && m.role !== '공격') {
      btn.disabled = true; tag.className = 'move-tag tag-protect'; tag.textContent = '도발 봉쇄';
      return;
    }

    if (m.role === '방어') {
      btn.classList.add('protect-move'); tag.className = 'move-tag tag-protect'; tag.textContent = '방어';
    } else if (m.role === '공격') {
      btn.classList.add('attack-move');
      const eff = getEffectiveness(m.type, enemyMon.type);
      if (eff >= 2.0) { tag.className = 'move-tag tag-super'; tag.textContent = `위력${nikaMove?86:m.pwr} · 굉장함`; }
      else if (eff <= 0.5) { tag.className = 'move-tag tag-resisted'; tag.textContent = `위력${nikaMove?86:m.pwr} · 반감`; }
      else { tag.className = 'move-tag tag-neutral'; tag.textContent = `위력${nikaMove?86:m.pwr} · 보통`; }
    } else {
      btn.classList.add('status-move'); tag.className = 'move-tag tag-status'; tag.textContent = '변화';
    }
  });
}

function openSwitchMenu() {
  SFX.click();
  document.getElementById('menu-main').style.display = 'none';
  const pokeMenu = document.getElementById('menu-pokemon');
  pokeMenu.style.display = 'grid';

  const aliveBench = myTeam.bench.filter(b => b && !b.fainted);
  if (aliveBench.length === 0 && !isFaintSwitchMode) {
    alert('교체할 수 있는 포켓몬이 없습니다!');
    backToMain();
    return;
  }

  let html = `<div style="grid-column: span 2; font-size:11px; font-weight:bold; color:#38bdf8; margin-bottom:2px;">출전할 벤치 포켓몬 선택:</div>`;
  myTeam.bench.forEach((bMon, idx) => {
    if (!bMon) return;
    const isDead = bMon.fainted;
    html += `
      <button onclick="selectSwitchTarget(${idx})" class="sub-btn" ${isDead ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; margin-bottom:4px;">
        <span style="color:${bMon.color}; font-weight:bold;">${bMon.name} [${bMon.type}]</span>
        <span style="color:${isDead ? '#ef4444' : '#22c55e'}; font-size:10px;">${isDead ? '기절' : `${Math.ceil((bMon.hp/bMon.maxHp)*100)}% HP`}</span>
      </button>
    `;
  });

  if (!isFaintSwitchMode) {
    if(myTeam.lead.id!=='boingo')html += `<button onclick="backToMain()" class="sub-btn" style="grid-column: span 2; background:#334155; margin-top:2px;">돌아가기</button>`;
  }
  pokeMenu.innerHTML = html;
}

function selectSwitchTarget(benchIdx) {
  if(!myTeam||!myTeam.lead||!battleActive||matchEnded||(!isFaintSwitchMode&&(isProcessingTurn||submittedTurn===currentTurnNumber)))return;
  const selectedMon=Number.isInteger(benchIdx)&&[0,1].includes(benchIdx)?myTeam.bench[benchIdx]:null;
  if(!selectedMon||selectedMon.fainted)return;
  SFX.click();clearBoingoTimer();
  document.getElementById('menu-pokemon').style.display='none';
  if (isFaintSwitchMode) {
    isFaintSwitchMode=false;
    if (isAiMode) {
      applyForcedSwitch('p1',benchIdx);
      renderBattleField(); setBattleMsg(`가라, ${myTeam.lead.name}!`);
      checkBattleOutcome();
    } else if (isHost) {
      finishForcedSwitch('p1',benchIdx);
    } else {
      awaitingForcedSwitch=true;
      conn.send({type:'forcedSwitch',benchIndex:benchIdx,turn:currentTurnNumber});
      setBattleMsg('교체 동기화 중...'); enableCommands(false);
    }
    return;
  }
  submitTurnChoice({type:'switch',benchIndex:benchIdx});
}

function backToMain() {
  if(myTeam&&myTeam.lead&&myTeam.lead.id==='boingo'&&!isFaintSwitchMode&&battleActive){
    document.getElementById('menu-main').style.display='none';
    document.getElementById('menu-moves').style.display='none';
    if(myTeam.bench.some(b=>b&&!b.fainted))document.getElementById('menu-pokemon').style.display='grid';
    return;
  }
  SFX.click();
  document.getElementById('menu-moves').style.display = 'none';
  document.getElementById('menu-pokemon').style.display = 'none';
  document.getElementById('menu-main').style.display = 'grid';
}

function selectMove(moveIdx) {
  SFX.click();
  clearBoingoTimer();
  submitTurnChoice({ type: 'move', moveIndex: moveIdx });
}

function submitTurnChoice(choice) {
  if(!battleActive || matchEnded || isProcessingTurn || !myTeam || myTeam.lead.fainted || enemyTeam.lead.fainted)return;
  if(submittedTurn===currentTurnNumber)return;
  submittedTurn=currentTurnNumber;
  enableCommands(false);
  if (isAiMode) {
    setBattleMsg('NPC가 수를 생각하고 있습니다...');
    const generation=battleGeneration;
    npcTimer=setTimeout(() => {
      npcTimer=null;if(generation!==battleGeneration || !battleActive)return;
      let npcChoice = getNpcChoice(enemyTeam, myTeam, sandstormTurns);
      const events = calculateTurnEvents(choice, npcChoice, myTeam, enemyTeam, currentTurnNumber, sandstormTurns);
      playTurnEvents(events);
    }, 450);
  } else {
    setBattleMsg('상대방 선택 대기 중...');
    if (isHost) {
      hostP1Choice = choice;
      checkExecuteTurn();
    } else {
      if(conn && conn.open){try{conn.send({type:'actionChoice',choice,turn:currentTurnNumber});}catch(err){fatalBattle('행동 전송에 실패했습니다.');}}
      else fatalBattle('상대와의 연결이 끊겼습니다.');
    }
  }
}

function checkExecuteTurn() {
  if(hostP1Choice && hostP2Choice && !isProcessingTurn && battleActive && !myTeam.lead.fainted && !enemyTeam.lead.fainted){
    isProcessingTurn = true;
    let events;
    try{events=calculateTurnEvents(hostP1Choice,hostP2Choice,myTeam,enemyTeam,currentTurnNumber,sandstormTurns);}catch(err){console.error(err);fatalBattle('전투 계산 중 오류가 발생했습니다.');return;}
    hostP1Choice = null; hostP2Choice = null;
    broadcastData({type:'executeTurnEvents',turn:currentTurnNumber,events});
    playTurnEvents(events);
  }
}

// ---------------- 💡 [포켓몬 본가 배틀 스타일 화려한 컷신 & 사운드 엔진] ----------------
function triggerSkillVisualAndAudio(moveName, actorSide, targetSide, extra = {}) {
  const isMe=(isHost||isSpectator)?actorSide==='p1':actorSide==='p2';
  const actorSpriteId = isMe ? 'player-sprite' : 'enemy-sprite';
  const targetSpriteId = isMe ? 'enemy-sprite' : 'player-sprite';

  const actorCenter = getSpriteCenter(actorSpriteId);
  const targetCenter = getSpriteCenter(targetSpriteId);

  const actorSprite = document.getElementById(actorSpriteId);
  const outcomeEffect = Object.prototype.hasOwnProperty.call(extra, 'isGachaWin');
  const layeredAudio = !outcomeEffect && typeof SFX.skillCast === 'function';
  const chargedMoves = new Set(['벌크업', '충전', '스텔스 아머', '모래바람', '수능 가챠', '리플렉트 실드', '광기의 예언서', '오버차지', '페이스 조절']);
  if (actorSprite && !outcomeEffect) {
    const motion = chargedMoves.has(moveName) ? 'sprite-charging' : isMe ? 'sprite-lunge-player' : 'sprite-lunge-enemy';
    actorSprite.classList.remove('sprite-lunge-player', 'sprite-lunge-enemy', 'sprite-charging');
    void actorSprite.offsetWidth;
    actorSprite.classList.add(motion);
    setTimeout(() => actorSprite.classList.remove(motion), motion === 'sprite-charging' ? 620 : 350);
  }
  if(layeredAudio)SFX.skillCast(moveName);
  const special=new Set(['드레인펀치','오물폭탄','화염방사','메테오 스트라이크','사이코 쇼크','롱레인지 찌르기','벽력일섬','니카 낙뢰']);
  if(!outcomeEffect && special.has(moveName)){
    playSkillCinematicFX(moveName,actorCenter,targetCenter);
    return;
  }
  else if (!outcomeEffect) SFX.lunge();

  switch (moveName) {
    // 1. 배서준 (격투 / 흡혈귀)
    case '드레인펀치':
      playDrainPunchFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.drain();
      break;
    case '피의 방패':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '벌크업':
      playBulkUpFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.bulkup();
      break;
    case '도발 (Taunt)':
      playRankDownFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.rankDown();
      break;

    // 2. 오슬우 (독 / 멘헤라)
    case '오물폭탄':
      playSludgeBombFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.sludge();
      break;
    case '멘헤라 가드':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '보인고 매혹':
      playAttractCharmFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      playRankDownFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.charm();
      break;
    case '기생독':
      playLeechSeedFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.drain();
      break;

    // 3. 이권재 (전기 / 가속)
    case '롱레인지 찌르기':
      playThunderboltFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.thunderbolt();
      break;
    case '회피 스텝':
      if (typeof playBuffAuraFX === 'function') playBuffAuraFX(actorCenter.x, actorCenter.y);
      else playChargeFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '전기자석파':
      playElectricSparksFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.thunderbolt();
      break;
    case '충전':
      playChargeFX(actorCenter.x, actorCenter.y);
      playRankUpFX(actorCenter.x, actorCenter.y, '#38bdf8');
      if (!layeredAudio) SFX.charge();
      break;

    // 4. 박성원 (바위 / 탱커)
    case '메테오 스트라이크':
      playMeteorStrikeFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.meteor();
      break;
    case '철벽 방어':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '스텔스 아머':
      playRockFX(actorCenter.x, actorCenter.y);
      playRankUpFX(actorCenter.x, actorCenter.y, '#10b981');
      if (!layeredAudio) SFX.rankUp();
      break;
    case '모래바람':
      playSandstormWeatherFX();
      if (!layeredAudio) SFX.sandstorm();
      break;

    // 5. 최규원 (불꽃 / 겜블러)
    case '화염방사':
      playFlamethrowerFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.flameStream();
      break;
    case '화염 장벽':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '도깨비불':
      playWillOWispFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.flameStream();
      break;
    case '수능 가챠':
      if (extra.isGachaWin) {
        playGachaEffect(actorCenter.x, actorCenter.y, true);
        playRankUpFX(actorCenter.x, actorCenter.y, '#eab308');
        SFX.gachaWin();
      } else {
        playGachaEffect(actorCenter.x, actorCenter.y, false);
        playRankDownFX(actorCenter.x, actorCenter.y);
        SFX.gachaFail();
      }
      break;

    // 6. 윤서윤 (에스퍼 / 서포터)
    case '사이코 쇼크':
      playPsychicFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.psychic();
      const screenEl = document.getElementById('battle-screen');
      if (screenEl) {
        screenEl.classList.add('screen-flash-psy');
        setTimeout(() => screenEl.classList.remove('screen-flash-psy'), 350);
      }
      break;
    case '절대 방어':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.protect();
      break;
    case '리플렉트 실드':
      playBarrierFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.barrier();
      break;
    case '흑안개':
      playHazeFX();
      if (!layeredAudio) SFX.rankDown();
      break;

    // 7. 보인고오슬우 (환락 / 카오스)
    case '스플래시 매직':
      playSplashMagicFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.chaos();
      break;
    case '타임 리프 스트라이크':
      playChaosGlitchFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.timeLeap();
      break;
    case '광기의 예언서':
      playChaosGlitchFX(actorCenter.x, actorCenter.y);
      playRankUpFX(actorCenter.x, actorCenter.y, '#db2777');
      if (!layeredAudio) SFX.chaos();
      break;
    case '익스트림 카오스':
      playChaosGlitchFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.chaos();
      break;

    // 8. 성원-타임 (바람 / 시간조작)
    case '페이스 조절':
      playWindFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.airSlash();
      break;
    case '되감기 / 빨리감기':
    case '빨리감기':
      playAirSlashFX(actorCenter.x, actorCenter.y, targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.airSlash();
      break;
    case '되감기':
      playTimeClockFX(actorCenter.x, actorCenter.y);
      if (!layeredAudio) SFX.rewind();
      break;
    case '오버차지 / 작용반작용':
    case '오버차지':
      playChargeFX(actorCenter.x, actorCenter.y);
      playRankUpFX(actorCenter.x, actorCenter.y, '#06b6d4');
      if (!layeredAudio) SFX.charge();
      break;
    case '작용반작용':
      playSlashFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.hit();
      break;
    default:
      playSlashFX(targetCenter.x, targetCenter.y);
      if (!layeredAudio) SFX.hit();
      break;
  }
}

// ---------------- 턴 애니메이션 연출 ----------------
function queueTurn(events){
 if(!Array.isArray(events) || !battleActive)return;
 if(isProcessingTurn){queuedTurns.push(events);return;}
 playTurnEvents(events);
}

async function playTurnEvents(events){
 if(!Array.isArray(events) || !battleActive || !myTeam || !enemyTeam)return;
 isProcessingTurn=true;
 let sandstormStartedThisTurn=false;
 const generation=battleGeneration;
 try{
  for (let i = 0; i < events.length; i++) {
    if (generation !== battleGeneration) return;
    const ev = events.at(i);
    recordBattleEvent(ev);

    if (ev.type === 'sync_teams') {
      if (isHost) { myTeam = ev.p1; enemyTeam = ev.p2; }
      else { myTeam = isSpectator ? ev.p1 : ev.p2; enemyTeam = isSpectator ? ev.p2 : ev.p1; }
      renderBattleField();
      continue;
    }

    if (ev.type === 'move_announce') {
      setBattleMsg(ev.msg);
      const actor=(isHost||isSpectator ? ev.side==='p1' : ev.side==='p2')?myTeam.lead:enemyTeam.lead;
      const sp=actor&&actor.id==='sungwon_time'?getStat(actor,'spe',sandstormTurns):0;
      const name=ev.moveName==='되감기 / 빨리감기'?(sp<100?'되감기':'빨리감기'):
        ev.moveName==='오버차지 / 작용반작용'?(sp<100?'오버차지':'작용반작용'):ev.moveName;
      if(actor&&actor.id==='boingo'){
        const origin=getSpriteCenter((isHost||isSpectator?ev.side==='p1':ev.side==='p2')?'player-sprite':'enemy-sprite');
        playClownActionFX(origin);SFX.clown();
      }
      if(actor&&actor.id==='sungwon_time'){
        const origin=getSpriteCenter((isHost||isSpectator?ev.side==='p1':ev.side==='p2')?'player-sprite':'enemy-sprite');
        playTimeActionFX(origin,name);SFX.clockTick();
      }
      triggerSkillVisualAndAudio(name,ev.side,ev.targetSide);
      await battleDelay(typeof skillCinematicDuration==='function'?skillCinematicDuration(ev.moveName):700);
      continue;
    }

    if(['nika_start','nika_action','nika_lightning','nika_end'].includes(ev.type)){
      const isMe=(isHost||isSpectator)?ev.side==='p1':ev.side==='p2';
      const actorId=isMe?'player-sprite':'enemy-sprite';
      const mon=isMe?myTeam.lead:enemyTeam.lead;
      if(ev.type==='nika_start'){
        mon.nikaTurns=ev.turns;renderBattleField();playNikaAwakeningFX(getSpriteCenter(actorId));SFX.nikaBeat();
      } else if(ev.type==='nika_action'){
        SFX.nikaBeat();
      } else if(ev.type==='nika_lightning'){
        const targetIsMe=(isHost||isSpectator)?ev.targetSide==='p1':ev.targetSide==='p2';
        playNikaBoltFX(getSpriteCenter(actorId),getSpriteCenter(targetIsMe?'player-sprite':'enemy-sprite'));
        SFX.thunderbolt();
      } else {
        mon.nikaTurns=0;mon.stages.spe=0;renderBattleField();SFX.rewind();
      }
      setBattleMsg(ev.msg);addBattleLog(ev.msg);
      await battleDelay(ev.type==='nika_start'?900:ev.type==='nika_lightning'?560:ev.type==='nika_action'?320:650);
      continue;
    }

    if (ev.type === 'turnStart') {
      setBattleMsg(ev.msg);
      addBattleLog(ev.msg);
      await battleDelay(500);
    } else if (ev.type === 'sandstorm_trigger') {
      sandstormTurns = ev.turns;
      sandstormStartedThisTurn = true;
      playSandstormWeatherFX();
      setBattleMsg(ev.msg);
      addBattleLog(ev.msg);
      await battleDelay(900);
    } else if (ev.type === 'revive') {
      const isMe = isHost ? ev.side === 'p1' : ev.side === 'p2';
      const revivedMon = isMe ? myTeam.lead : enemyTeam.lead;
      revivedMon.hp = ev.hp;
      revivedMon.fainted = false;
      renderBattleField();
      setBattleMsg(ev.msg);
      addBattleLog(ev.msg);
      await battleDelay(900);
    } else if (ev.type === 'damage') {
      const isTargetMe = (isHost && ev.targetSide === 'p1') || (!isHost && ev.targetSide === 'p2');
      const targetSprite = document.getElementById(isTargetMe ? 'player-sprite' : 'enemy-sprite');
      const screenEl = document.getElementById('battle-screen');
      const isDirectAttack=!!ev.moveName&&ev.actorName!==ev.targetName&&!['독','화상','모래바람','기생독'].includes(ev.moveName);
      const quality = ev.isCrit ? 'crit' : ev.effectiveness >= 2 ? 'super' : ev.effectiveness <= 0.5 ? 'weak' : 'normal';
      const hitMon=isTargetMe?myTeam.lead:enemyTeam.lead;
      hitMon.hp=ev.targetHp;
      if(ev.moveName==='빨리감기'&&hitMon.type!=='전기'&&ev.targetHp>0)hitMon.paralyzed=true;
      if(isDirectAttack&&targetSprite){
        playSkillCinematicImpactFX(ev.moveName,getSpriteCenter(targetSprite.id));
        if(ev.moveName==='메테오 스트라이크')SFX.meteorCrash();
        if(ev.targetHp<=0&&typeof SFX.killConfirm==='function')SFX.killConfirm();
      }
      if(isDirectAttack&&typeof SFX.skillImpact==='function')SFX.skillImpact(ev.moveName,quality);
      else if (quality === 'crit') SFX.crit();
      else if (quality === 'super') SFX.superHit();
      else if (quality === 'weak') SFX.weakHit();
      else SFX.hit();
      if (true) {
        if (targetSprite) {
          targetSprite.classList.remove('sprite-flicker');
          void targetSprite.offsetWidth;
          targetSprite.classList.add('sprite-flicker');
          if (isDirectAttack) targetSprite.classList.add('sprite-hit-stop');
          setTimeout(() => targetSprite.classList.remove('sprite-hit-stop'), ev.isCrit ? 70 : 38);
          setTimeout(() => targetSprite.classList.remove('sprite-flicker'), 450);
          if (isDirectAttack && typeof playHitImpactFX === 'function') {
            const center = getSpriteCenter(targetSprite.id);
            playHitImpactFX(center.x, center.y, { crit: !!ev.isCrit, effectiveness: ev.effectiveness, damage: ev.dmg });
          }
        }
        if (screenEl && isDirectAttack) {
          const critical = quality === 'crit' || quality === 'super';
          const motion = critical ? 'battle-screen-shake-crit' : 'battle-screen-shake-normal';
          screenEl.classList.remove('battle-screen-shake-crit', 'battle-screen-shake-normal', 'screen-flash-white');
          void screenEl.offsetWidth;
          screenEl.classList.add(motion);
          if(isDirectAttack) screenEl.classList.add('screen-flash-white');
          setTimeout(() => screenEl.classList.remove(motion, 'screen-flash-white'), critical ? 350 : 250);
        }
      }
      renderBattleField();
      setBattleMsg(ev.msg || `${ev.targetName}에게 -${ev.dmg} 데미지!`);
      await battleDelay(650);
    } else if (ev.type === 'heal') {
      SFX.heal();
      const isMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      if(isMe)myTeam.lead.hp=ev.hp;else enemyTeam.lead.hp=ev.hp;
      if(/흡혈/.test(ev.msg||''))playVampiricSiphonFX(getSpriteCenter(isMe?'enemy-sprite':'player-sprite'),getSpriteCenter(isMe?'player-sprite':'enemy-sprite'));
      renderBattleField();
      setBattleMsg(ev.msg);
      await battleDelay(750);
    } else if (ev.type === 'bench_heal') {
      SFX.heal();
      const isMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      const targetTeam = isMe ? myTeam : enemyTeam;
      const targetMon = targetTeam.bench.at(ev.benchIndex);
      if (targetMon) targetMon.hp = ev.hp;
      renderBattleField();
      setBattleMsg(ev.msg);
      await battleDelay(750);
    } else if (ev.type === 'bench_damage') {
      SFX.hit();
      const isTargetMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      const targetTeam = isTargetMe ? myTeam : enemyTeam;
      const targetMon = targetTeam.bench.at(ev.benchIndex);
      if (targetMon) {
        targetMon.hp = ev.benchHp;
        if (targetMon.hp <= 0) targetMon.fainted = true;
      }
      renderBattleField();
      setBattleMsg(ev.msg);
      await battleDelay(700);
    } else if (ev.type === 'protect') {
      SFX.protect();
      setBattleMsg(ev.msg);
      await battleDelay(700);
    } else if (ev.type === 'buff') {
      const isMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      const center = getSpriteCenter(isMe ? 'player-sprite' : 'enemy-sprite');
      playRankUpFX(center.x, center.y, '#4ade80');
      if (ev.isGachaWin) triggerSkillVisualAndAudio('수능 가챠', ev.side, null, { isGachaWin: true });
      else SFX.rankUp();
      setBattleMsg(ev.msg);
      await battleDelay(750);
    } else if (ev.type === 'debuff') {
      const isMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      const center = getSpriteCenter(isMe ? 'player-sprite' : 'enemy-sprite');
      playRankDownFX(center.x, center.y);
      if(ev.status){
        const mon=isMe?myTeam.lead:enemyTeam.lead;
        if(mon&&Object.prototype.hasOwnProperty.call(mon,ev.status))mon[ev.status]=true;
        renderBattleField();
        if(true && typeof playStatusFX === 'function') playStatusFX(center.x, center.y, ev.status);
        if (ev.status === 'poisoned' && typeof SFX.poison === 'function') SFX.poison();
        else if (ev.status === 'burned' && typeof SFX.burn === 'function') SFX.burn();
        else if (ev.status === 'paralyzed' && typeof SFX.paralyze === 'function') SFX.paralyze();
        else SFX.rankDown();
      } else if (ev.isGachaFail) triggerSkillVisualAndAudio('수능 가챠', ev.side, null, { isGachaWin: false });
      else SFX.rankDown();
      setBattleMsg(ev.msg);
      await battleDelay(750);
    } else if(ev.type==='switch'){
      SFX.switchIn();
      if(ev.newLeadId==='boingo'){const own=(isHost||isSpectator)?ev.side==='p1':ev.side==='p2';playClownActionFX(getSpriteCenter(own?'player-sprite':'enemy-sprite'));SFX.clown();}
      setBattleMsg(ev.msg);
      await battleDelay(850);
    } else if (ev.type === 'faint') {
      SFX.faint();
      const isMe = (isHost && ev.side === 'p1') || (!isHost && ev.side === 'p2');
      const faintSprite = document.getElementById(isMe ? 'player-sprite' : 'enemy-sprite');
      if (faintSprite && true) faintSprite.classList.add('sprite-faint');
      setBattleMsg(ev.msg);
      await battleDelay(900);
    } else if (ev.type === 'msg') {
      if (/빗나갔|피했|회피했/.test(ev.msg) && typeof SFX.dodge === 'function') SFX.dodge();
      setBattleMsg(ev.msg);
      await battleDelay(750);
    }
  }

  if (sandstormTurns > 0 && !sandstormStartedThisTurn) {
    sandstormTurns--;
    if (sandstormTurns <= 0) setBattleMsg('모래바람이 가라앉았다.');
  }

  showRoundSummary();
  currentTurnNumber++;
 }catch(err){
  console.error('전투 재생 오류',err);
  if(generation===battleGeneration)fatalBattle('전투 도중 오류가 발생했습니다.');
 }finally{
  if(generation===battleGeneration){
   isProcessingTurn=false;
   if(queuedSnapshot){const data=queuedSnapshot;queuedSnapshot=null;applyBattleSnapshot(data);}
   else if(!isSpectator && battleActive)checkBattleOutcome();
   if(isHost && !isAiMode && queuedForced && battleActive){const req=queuedForced;queuedForced=null;if(req.turn===currentTurnNumber)finishForcedSwitch('p2',req.benchIndex);}
   if(isHost && !isAiMode && battleActive)checkExecuteTurn();
   if(queuedTurns.length && battleActive){const next=queuedTurns.shift();queueMicrotask(()=>queueTurn(next));}
  }
 }
}

// ---------------- 승패 & 기절 후속 처리 ----------------
function checkBattleOutcome() {
  const myAllDead = myTeam.lead.fainted && myTeam.bench.every(b => b.fainted);
  const enemyAllDead = enemyTeam.lead.fainted && enemyTeam.bench.every(b => b.fainted);

  if (myAllDead && enemyAllDead) { showGameOverMenu('draw'); return; }
  if (myAllDead) { showGameOverMenu('lose'); return; }
  if (enemyAllDead) { showGameOverMenu('win'); return; }

  if (myTeam.lead.fainted) {
    isFaintSwitchMode = true;
    enableCommands(false);
    setBattleMsg(`${myTeam.lead.name}이(가) 쓰러졌다! 출전할 포켓몬을 선택하세요.`);
    if (!awaitingForcedSwitch) setTimeout(() => { if (isFaintSwitchMode && !awaitingForcedSwitch) openSwitchMenu(); }, 600);
    return;
  }

  if(enemyTeam.lead.fainted && isAiMode){
    enableCommands(false);
    if(npcSwitchPending)return;
    const aliveIdx = enemyTeam.bench.findIndex(b => b && !b.fainted);
    if (aliveIdx > -1) {
      const generation=battleGeneration;npcSwitchPending=true;
      npcSwitchTimer=setTimeout(() => {
        npcSwitchTimer=null;npcSwitchPending=false;
        if(generation!==battleGeneration || !battleActive)return;
        SFX.switchIn();
        const oldLead = enemyTeam.lead;
        oldLead.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        oldLead.boingoDefSpdBuffTurns = 0;
        oldLead.boingoSpaBuffTurns = 0;

        const nextMon = enemyTeam.bench.at(aliveIdx);
        nextMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        nextMon.boingoDefSpdBuffTurns = 0;
        nextMon.boingoSpaBuffTurns = 0;

        enemyTeam.lead = nextMon;
        enemyTeam.bench[aliveIdx] = oldLead;
        renderBattleField();
        triggerSwitchInAbilities(enemyTeam.lead, myTeam.lead);
        setBattleMsg(`NPC는 ${enemyTeam.lead.name}(을)를 내보냈다!`);
        enableCommands(true);
      }, 1000);
      return;
    }
  }

  if (!isAiMode && enemyTeam.lead.fainted) { enableCommands(false); setBattleMsg('상대의 교체를 기다리는 중...'); return; }
  setBattleMsg(`${myTeam.lead.name}은(는) 무엇을 할까?`);
  enableCommands(true);
}

function showGameOverMenu(outcome) {
  if (matchEnded) return;
  clearPendingTimers();matchEnded=true;
  if (outcome === 'win' && typeof SFX.victory === 'function') SFX.victory();
  else if (outcome === 'lose' && typeof SFX.defeat === 'function') SFX.defeat();
  if(isHost && !isAiMode){for(const s of spectatorConns)if(s.conn.open)s.conn.send({type:'matchComplete',outcome});}
  document.getElementById('cmd-waiting').style.display = 'none';
  document.getElementById('menu-main').style.display = 'none';
  document.getElementById('menu-moves').style.display = 'none';
  document.getElementById('menu-pokemon').style.display = 'none';

  const goMenu = document.getElementById('menu-gameover');
  goMenu.style.display = 'flex';
  goMenu.style.flexDirection = 'column';
  goMenu.style.gap = '8px';

  const statusInd = document.getElementById('cmd-status-indicator');
  statusInd.textContent = outcome === 'win' ? '🎉 승리!' : (outcome === 'lose' ? '💀 패배...' : '무승부');
  statusInd.style.color = outcome === 'win' ? '#22c55e' : '#ef4444';

  battleActive=false;
  matchRecord={outcome, turns:Math.max(1,currentTurnNumber-1), damage:JSON.parse(JSON.stringify(damageStats)), highlights:[...battleHighlights]};
  const challengeNoSwitch = voluntarySwitches===0;
  const challengeShort = outcome==='win' && matchRecord.turns<=5;
  const challengeResult = outcome==='win' ? [challengeNoSwitch && '교체 없이 승리',challengeShort && '5턴 이내 승리'].filter(Boolean) : [];
  goMenu.replaceChildren();
  const report=document.createElement('div'); report.className='battle-report';
  const lines=[`배틀 ${outcome==='win'?'승리':outcome==='lose'?'패배':'무승부'} · ${matchRecord.turns}턴`,
    `준 피해: 나 ${damageStats.player.total} / 상대 ${damageStats.enemy.total}`,
    `내 캐릭터별 피해: ${Object.entries(damageStats.player.byMon).map(([name,dmg])=>`${name} ${dmg}`).join(' · ')}`,
    `하이라이트: ${battleHighlights.slice(-3).join(' / ') || '기록 없음'}`,
    `도전 과제: ${challengeResult.join(' · ') || '이번 경기 달성 없음'}`];
  for (const line of lines) {const p=document.createElement('div');p.textContent=line;report.appendChild(p);} 
  goMenu.appendChild(report);
  const back=document.createElement('button'); back.className='btn-restart'; back.textContent='로비로 돌아가기'; back.onclick=restartToLobby;goMenu.appendChild(back);
}

function restartToLobby() {
  SFX.click();++roomEpoch;clearConnectTimer();
  battleGeneration++;battleActive=false;matchEnded=false;
  if (peer) {peer.destroy();peer=null;}
  conn=null;playerConn=null;spectatorConns=[];
  hostP1Choice=null;hostP2Choice=null;isProcessingTurn=false;
  clearPendingTimers();queuedTurns=[];queuedSnapshot=null;queuedForced=null;submittedTurn=0;teamPayload=null;
  document.getElementById('battle-screen').style.display = 'none';
  document.getElementById('battle-bottom').style.display = 'none';
  document.getElementById('lobby-panel').style.display = 'flex';
  document.getElementById('pick-panel').style.display = 'flex';

  myPickList = [];
  myTeam = null;
  enemyTeam = null;
  sandstormTurns = 0;
  currentTurnNumber = 1;lowHpAudioLead=null;roomPlayerNick='상대';hostPlayerNick='호스트';
  isFaintSwitchMode = false;awaitingForcedSwitch=false;
  document.getElementById('section-cmd').style.display='block';
  updatePickVisuals();
  setStatus('모드를 선택하세요 (NPC 대전 또는 온라인 1:1)');
}

function getStatBreakdown(mon, statKey, sandstormTurns = 0) {
  const base = mon[statKey];
  let currentStage = mon.stages[statKey] || 0;

  if (mon.ability === '가속 상대성' && statKey === 'def') {
    const rawSpe = mon.spe;
    const speStage = Math.max(-6, Math.min(6, mon.stages.spe || 0));
    const speMult = speStage >= 0 ? (2 + speStage) / 2 : 2 / (2 - speStage);
    const estSpe = Math.floor(rawSpe * speMult * (mon.paralyzed ? 0.7 : 1.0));
    if (estSpe < 100) {
      currentStage += Math.floor((100 - estSpe) / 10);
    }
  }

  const stage = Math.max(-6, Math.min(6, currentStage));
  let mult = stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);

  let finalVal = Math.floor(base * mult);
  let bonus = finalVal - base;
  let bonusStr = bonus >= 0 ? `(+${bonus})` : `(${bonus})`;

  let note = '';
  if (statKey === 'atk' && mon.burned) {
    finalVal = Math.floor(finalVal * 0.5);
    note = ' [화상-50%]';
  }
  if (statKey === 'spe' && mon.paralyzed) {
    finalVal = Math.floor(finalVal * 0.7);
    note = ' [마비-30%]';
  }
  if (statKey === 'spd' && sandstormTurns > 0 && mon.type === '바위') {
    finalVal = Math.floor(finalVal * 1.3);
    note = ' [모래바람+30%]';
  }

  return {
    text: `${base} ${bonusStr} ➔ ${finalVal}${note}`,
    stage,
    base,
    bonus,
    finalVal
  };
}

function openBattleDetailModal() {
  SFX.click();
  renderDetailModalContent();
  const modal = document.getElementById('detail-modal');
  if (modal) modal.style.display = 'flex';
}

function closeBattleDetailModal() {
  SFX.click();
  const modal = document.getElementById('detail-modal');
  if (modal) modal.style.display = 'none';
}

function closeModalOnBackdrop(e) {
  if (e.target.id === 'detail-modal') closeBattleDetailModal();
}

function renderDetailModalContent() {
  const content = document.getElementById('modal-body-content');
  if (!content) return;

  if (!myTeam || !enemyTeam) {
    content.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8;">전투 시작 후 상세 정보를 확인할 수 있습니다.</div>';
    return;
  }

  function renderPokemonFullCard(mon, isLead, teamRole, themeColor, opponentLead) {
    if (!mon) return '';
    const hpPct = Math.max(0, Math.min(100, Math.ceil((mon.hp / mon.maxHp) * 100)));
    const hpColor = hpPct <= 20 ? '#ef4444' : (hpPct <= 50 ? '#eab308' : '#22c55e');

    const atkData = getStatBreakdown(mon, 'atk', sandstormTurns);
    const defData = getStatBreakdown(mon, 'def', sandstormTurns);
    const spaData = getStatBreakdown(mon, 'spa', sandstormTurns);
    const spdData = getStatBreakdown(mon, 'spd', sandstormTurns);
    const speData = getStatBreakdown(mon, 'spe', sandstormTurns);

    let statusTags = [];
    if (mon.fainted) statusTags.push('<span class="effect-pill danger">기절</span>');
    if (mon.poisoned) statusTags.push('<span class="effect-pill danger">독 (매턴 12.5% 피해)</span>');
    if (mon.burned) statusTags.push('<span class="effect-pill danger">화상 (물리공격 반감 & 매턴 6.25% 피해)</span>');
    if (mon.paralyzed) statusTags.push('<span class="effect-pill danger">마비 (스피드 30% 저하 & 25% 행동불가)</span>');
    if (mon.reflectTurns > 0) statusTags.push(`<span class="effect-pill highlight">리플렉트 실드 (${mon.reflectTurns}턴 지속)</span>`);
    if (mon.tauntedTurns > 0) statusTags.push(`<span class="effect-pill danger">도발 (${mon.tauntedTurns}턴 지속)</span>`);
    if (mon.charged) statusTags.push('<span class="effect-pill highlight">전기 충전 (다음 공격 1.35배)</span>');
    if (mon.battery > 0) statusTags.push(`<span class="effect-pill highlight">배터리 (${mon.battery}/100)</span>`);
    if (mon.seeded) statusTags.push('<span class="effect-pill danger">기생독 씨앗 흡수 중</span>');
    if (statusTags.length === 0) statusTags.push('<span class="effect-pill">상태 이상 없음 (정상)</span>');

    let movesHtml = '';
    mon.moves.forEach(m => {
      let effText = '';
      if (opponentLead && m.pwr > 0) {
        const eff = getEffectiveness(m.type, opponentLead.type);
        if (eff >= 2.0) effText = '<span style="color:#ef4444; font-weight:bold;"> (상대에게 2배 굉장함!)</span>';
        else if (eff <= 0.5) effText = '<span style="color:#38bdf8; font-weight:bold;"> (상대에게 0.5배 반감)</span>';
      }
      movesHtml += `
        <div style="background:#0f172a; padding:4px 6px; border-radius:4px; font-size:10px; border-left:3px solid ${themeColor}; margin-bottom:3px;">
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span style="color:#fff;">${m.name} [${m.type} · ${m.category}]</span>
            <span style="color:#94a3b8;">${m.pwr > 0 ? `위력 ${m.pwr} / 명중 ${m.acc}%` : '변화기'}${effText}</span>
          </div>
          <div style="color:#cbd5e1; font-size:9.5px; margin-top:2px;">${m.desc}</div>
        </div>
      `;
    });

    return `
      <div style="background:rgba(15,23,42,0.85); border:1.5px solid ${isLead ? themeColor : '#334155'}; border-radius:8px; padding:10px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:6px;">
          <div>
            <span style="font-size:13px; font-weight:900; color:#fff;">${mon.name}</span>
            <span style="font-size:11px; color:${themeColor}; font-weight:bold; margin-left:4px;">[${mon.type}형]</span>
            <span style="font-size:10px; color:#94a3b8; margin-left:4px;">(${teamRole})</span>
          </div>
          <div style="font-size:11px; font-weight:bold; color:${hpColor};">
            ${Math.ceil(mon.hp)} / ${mon.maxHp} HP (${hpPct}%)
          </div>
        </div>

        <div style="background:#334155; height:6px; border-radius:999px; overflow:hidden; margin-bottom:8px;">
          <div style="background:${hpColor}; width:${hpPct}%; height:100%;"></div>
        </div>

        <div style="font-size:10.5px; color:#c084fc; margin-bottom:8px;">
          <b>특성 [${mon.ability}]:</b> ${mon.abilityDesc}
        </div>

        <div style="background:#1e293b; border-radius:6px; padding:6px; margin-bottom:8px;">
          <div style="font-size:10px; font-weight:900; color:#38bdf8; margin-bottom:4px; border-bottom:1px dashed #334155; padding-bottom:2px;">
            📊 실시간 5대 스탯 상세 분석 (기본점수 (+랭크보너스) ➔ 최종 실적용점수)
          </div>
          <div style="display:grid; grid-template-columns:1fr; gap:3px; font-size:10px;">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">⚔️ 공격 (ATK):</span>
              <span style="font-weight:bold; color:${atkData.bonus > 0 ? '#4ade80' : (atkData.bonus < 0 ? '#f87171' : '#fff')};">${atkData.text}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">🛡️ 방어 (DEF):</span>
              <span style="font-weight:bold; color:${defData.bonus > 0 ? '#4ade80' : (defData.bonus < 0 ? '#f87171' : '#fff')};">${defData.text}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">🔮 특수공격 (SPA):</span>
              <span style="font-weight:bold; color:${spaData.bonus > 0 ? '#4ade80' : (spaData.bonus < 0 ? '#f87171' : '#fff')};">${spaData.text}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">🔰 특수방어 (SPD):</span>
              <span style="font-weight:bold; color:${spdData.bonus > 0 ? '#4ade80' : (spdData.bonus < 0 ? '#f87171' : '#fff')};">${spdData.text}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#cbd5e1;">⚡ 스피드 (SPE):</span>
              <span style="font-weight:bold; color:${speData.bonus > 0 ? '#4ade80' : (speData.bonus < 0 ? '#f87171' : '#fff')};">${speData.text}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <div style="font-size:10px; font-weight:bold; color:#cbd5e1; margin-bottom:3px;">활성 상태 & 배틀 효과:</div>
          <div style="display:flex; flex-wrap:wrap; gap:3px;">${statusTags.join('')}</div>
        </div>

        <div>
          <div style="font-size:10px; font-weight:bold; color:#cbd5e1; margin-bottom:3px;">보유 기술 (4종):</div>
          ${movesHtml}
        </div>
      </div>
    `;
  }

  const [pb1, pb2] = myTeam.bench;
  const [eb1, eb2] = enemyTeam.bench;

  let playerSideHtml = `
    <div style="margin-bottom:12px;">
      <div style="font-size:13px; font-weight:900; color:#38bdf8; margin-bottom:6px; border-bottom:2px solid #0284c7; padding-bottom:4px;">
        🛡️ 내 진영 (${escapeNick(isSpectator?hostPlayerNick:myNick)})
      </div>
      ${renderPokemonFullCard(myTeam.lead, true, '1st 선발 출전 중', '#38bdf8', enemyTeam.lead)}
      ${renderPokemonFullCard(pb1, false, '2nd 벤치 대기', '#0284c7', enemyTeam.lead)}
      ${renderPokemonFullCard(pb2, false, '3rd 벤치 대기', '#0284c7', enemyTeam.lead)}
    </div>
  `;

  let enemySideHtml = `
    <div>
      <div style="font-size:13px; font-weight:900; color:#f43f5e; margin-bottom:6px; border-bottom:2px solid #e11d48; padding-bottom:4px;">
        ⚔️ 상대 진영 (${isAiMode?'NPC 트레이너':escapeNick(isSpectator?roomPlayerNick:isHost?roomPlayerNick:hostPlayerNick)})
      </div>
      ${renderPokemonFullCard(enemyTeam.lead, true, '1st 선발 출전 중', '#f43f5e', myTeam.lead)}
      ${renderPokemonFullCard(eb1, false, '2nd 벤치 대기', '#e11d48', myTeam.lead)}
      ${renderPokemonFullCard(eb2, false, '3rd 벤치 대기', '#e11d48', myTeam.lead)}
    </div>
  `;

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; max-height:65vh; overflow-y:auto; padding-right:4px;">
      <div style="font-size:11px; background:#0f172a; padding:6px 10px; border-radius:6px; border:1px solid #334155; color:#94a3b8; text-align:center;">
        현재 필드 상태: ${sandstormTurns > 0 ? `<b style="color:#eab308;">모래바람 휘몰아침 (${sandstormTurns}턴 남음)</b>` : '날씨 맑음 (평온)'} | 현재 ${currentTurnNumber}턴 진행 중
      </div>
      <div class="status-columns">
        <div>${playerSideHtml}</div>
        <div>${enemySideHtml}</div>
      </div>
    </div>
  `;
}

function appendChatMessage(sender,text,type) {
  const log=document.getElementById('chat-log'); if (!log) return;
  const div=document.createElement('div'); div.className=`chat-msg ${type==='me'?'me':'enemy'}`;
  const label=document.createElement('span');label.className='sender';label.textContent=`[${String(sender).slice(0,10)}]`;
  div.appendChild(label);div.appendChild(document.createTextNode(String(text).slice(0,200)));
  log.appendChild(div);log.scrollTop=log.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  if (text.length>200) {alert('채팅은 200자 이하로 입력해 주세요.');return;}
  input.value = '';
  SFX.click();
  appendChatMessage(myNick, text, 'me');
  if (isHost) broadcastData({ type: 'chat', sender: myNick, text });
  else if (conn && conn.open) conn.send({ type: 'chat', sender: myNick, text });
}

initPickUI();


