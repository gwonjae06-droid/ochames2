// NPC 3연전 + 캐릭터 전용 스킨. index.html에서 js/app.js 다음에 한 번만 로드하세요.
(() => {
  'use strict';
  const KEY = 'ochams-skins-v1';
  const SKINS = Object.freeze({
    storm: { name: '적뢰', owner: 'lee', description: '이권재 전용 · 붉은 전류와 검은 뇌운' },
    rewind: { name: '역행', owner: 'sungwon_time', description: '성원-타임 전용 · 시간의 잔광' }
  });
  const ROUNDS = [
    { name: '단단한 방어선', ids: ['park', 'bae', 'oh'] },
    { name: '혼돈의 마도단', ids: ['boingo', 'choi', 'yoon'] },
    { name: '시간을 넘는 질주', ids: ['lee', 'sungwon_time', 'park'] }
  ];
  const blank = () => ({ claimed: false, pending: false, unlocked: [], equipped: {} });
  let state = blank();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      state.claimed = saved.claimed === true;
      state.pending = saved.pending === true && !state.claimed;
      state.unlocked = Array.isArray(saved.unlocked) ? saved.unlocked.filter(id => Object.hasOwn(SKINS, id)) : [];
      state.equipped = saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {};
    }
  } catch (err) { console.warn('스킨 저장 정보를 읽지 못했습니다.', err); }
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (err) { console.warn('스킨 정보를 저장하지 못했습니다.', err); }
  };
  const equipped = id => {
    const skin = state.equipped[id];
    return state.unlocked.includes(skin) && SKINS[skin]?.owner === id ? skin : '';
  };
  let active = false, round = 0;
  const css = document.createElement('style');
  css.textContent = `
    .challenge-btn{width:100%;min-height:41px;background:#7c3aed!important}
    .skin-entry-btn{min-height:38px;background:#334155!important}
    .skin-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;background:#050a15e8}
    .skin-modal-card{width:min(440px,100%);max-height:88vh;overflow:auto;background:#17243a;color:#f8fafc;border:1px solid #70d6ed;border-radius:14px;padding:17px;box-shadow:0 20px 70px #000a}
    .skin-modal-card h2{font-size:17px;margin-bottom:9px;color:#a5f3fc}
    .skin-modal-card p{font-size:12px;line-height:1.55;color:#cbd5e1;margin:0 0 11px}
    .skin-choice{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #45617c;border-radius:9px;background:#223450;margin:7px 0;padding:9px;font-size:12px}
    .skin-choice button{flex:0 0 auto;min-width:64px;padding:5px 9px;min-height:32px}
    .skin-close{width:100%;margin-top:10px;background:#40526b!important}
    .char-sprite .skin-aura{position:absolute;inset:-10px;border:3px solid transparent;border-radius:inherit;pointer-events:none;z-index:3;display:flex;align-items:flex-start;justify-content:flex-end;font-size:18px}
    .char-sprite[data-skin="storm"]{--aura:#ef233c;filter:drop-shadow(0 0 17px #ff1c4d)}
    .char-sprite[data-skin="storm"] .skin-aura{border-color:#ff526c;box-shadow:0 0 25px 9px #e50046aa,inset 0 0 18px #ff596b88;animation:redAura .78s steps(3,end) infinite}
    .char-sprite[data-skin="rewind"] .skin-aura{border-color:#a5f3fc;box-shadow:0 0 24px 7px #c084fcaa;animation:rewindAura 2.2s ease-in-out infinite}
    .pick-portrait[data-skin="storm"]{outline:2px solid #ff486b;box-shadow:0 0 12px #ff1747aa}
    .pick-portrait[data-skin="rewind"]{outline:2px solid #e9d5ff;box-shadow:0 0 12px #d8b4feaa}
    .red-skin-cloud{position:absolute;inset:-24px;z-index:-1;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse at 30% 35%,#17141de8 2%,transparent 55%),radial-gradient(ellipse at 75% 65%,#090c14e8 4%,transparent 57%),radial-gradient(ellipse,#7b163388,transparent 74%);filter:blur(7px);animation:cloudSwirl 2s ease-in-out infinite alternate}
    .red-skin-current{position:absolute;inset:-26px;z-index:4;pointer-events:none;width:calc(100% + 52px);height:calc(100% + 52px)}
    .red-skill-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:12;pointer-events:none}
    @keyframes redAura{0%,100%{opacity:.6;transform:scale(.94)}45%{opacity:1;transform:scale(1.10)}55%{opacity:.4}}
    @keyframes rewindAura{0%,100%{opacity:.68;transform:rotate(-5deg)}50%{opacity:1;transform:rotate(5deg)}}
    @keyframes cloudSwirl{from{opacity:.55;transform:translate(-6px,3px) rotate(-5deg)}to{opacity:1;transform:translate(6px,-5px) rotate(7deg)}}
    @media(prefers-reduced-motion:reduce){.char-sprite .skin-aura,.red-skin-cloud{animation:none!important}}
  `;
  document.head.appendChild(css);
  let ambientTimer = null;
  function ambient() {
    const sprite = document.getElementById('player-sprite');
    const canvas = sprite?.querySelector('.red-skin-current');
    if (!canvas || !sprite?.isConnected || equipped('lee') !== 'storm' ||
        typeof myTeam === 'undefined' || myTeam?.lead?.id !== 'lee' || myTeam.lead.fainted ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(w * dpr); canvas.height = Math.ceil(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(angle) * w * .32, y = cy + Math.sin(angle) * h * .32;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - .5) * 25, y - 12);
      ctx.lineTo(x + (Math.random() - .5) * 22, y - 24);
      ctx.strokeStyle = i % 3 ? '#ff3658' : '#251421'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff002f'; ctx.shadowBlur = 8; ctx.stroke();
    }
  }
  function decorate(sprite, id) {
    if (!sprite) return;
    const skin = equipped(id);
    if (skin) sprite.dataset.skin = skin;
    else delete sprite.dataset.skin;
    let aura = sprite.querySelector('.skin-aura');
    if (!aura) {
      aura = document.createElement('span'); aura.className = 'skin-aura';
      aura.setAttribute('aria-hidden', 'true'); sprite.appendChild(aura);
    }
    aura.textContent = skin === 'storm' ? '⚡' : skin === 'rewind' ? '⏳' : '';
    let cloud = sprite.querySelector('.red-skin-cloud');
    let current = sprite.querySelector('.red-skin-current');
    if (skin === 'storm') {
      if (!cloud) { cloud = document.createElement('span'); cloud.className = 'red-skin-cloud'; sprite.appendChild(cloud); }
      if (!current) { current = document.createElement('canvas'); current.className = 'red-skin-current'; current.setAttribute('aria-hidden', 'true'); sprite.appendChild(current); }
      if (!ambientTimer) ambientTimer = setInterval(ambient, 180);
    } else {
      cloud?.remove(); current?.remove();
      if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    }
  }
  function paint() {
    if (typeof myTeam !== 'undefined' && myTeam?.lead) decorate(document.getElementById('player-sprite'), myTeam.lead.id);
    else decorate(document.getElementById('player-sprite'), '');
    if (typeof POKEDEX === 'undefined') return;
    for (const id of Object.keys(POKEDEX)) {
      const portrait = document.querySelector(`#card-${id} .pick-portrait`);
      if (!portrait) continue;
      const skin = equipped(id);
      if (skin) portrait.dataset.skin = skin;
      else delete portrait.dataset.skin;
    }
  }
  function modal(title, description) {
    const overlay = document.createElement('div'); overlay.className = 'skin-modal';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const card = document.createElement('div'); card.className = 'skin-modal-card';
    const heading = document.createElement('h2'); heading.textContent = title;
    const p = document.createElement('p'); p.textContent = description;
    card.append(heading, p); overlay.appendChild(card); document.body.appendChild(overlay);
    return { overlay, card };
  }
  function row(card, label, buttonText, handler) {
    const item = document.createElement('div'); item.className = 'skin-choice';
    const text = document.createElement('span'); text.textContent = label;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = buttonText;
    button.addEventListener('click', handler); item.append(text, button); card.appendChild(item);
  }
  function closeButton(card, overlay) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'skin-close';
    button.textContent = '닫기'; button.addEventListener('click', () => overlay.remove()); card.appendChild(button);
  }
  function offerReward() {
    if (!state.pending || state.claimed || document.querySelector('.skin-modal')) return;
    const { overlay, card } = modal('🏆 3연전 첫 승리 보상', '스킨 하나를 고르세요. 전투 성능은 바뀌지 않습니다.');
    for (const [id, skin] of Object.entries(SKINS)) {
      row(card, `${skin.name} · ${skin.description}`, '받기', () => {
        state.pending = false; state.claimed = true; state.unlocked = [id]; state.equipped[skin.owner] = id;
        persist(); paint(); overlay.remove();
        const msg = document.getElementById('battle-msg');
        if (msg) msg.textContent = `${skin.name} 해금! ${POKEDEX[skin.owner]?.name || skin.owner}에게 자동 장착했습니다.`;
      });
    }
    closeButton(card, overlay);
  }
  function openWardrobe() {
    const { overlay, card } = modal('🎨 스킨 보관함', '스킨은 해당 캐릭터에게만 장착할 수 있으며 브라우저에 저장됩니다.');
    if (!state.unlocked.length) {
      const p = document.createElement('p'); p.textContent = '아직 해금된 스킨이 없습니다. NPC 3연전을 클리어해 보세요.'; card.appendChild(p);
    } else {
      for (const id of state.unlocked) {
        const skin = SKINS[id];
        row(card, `${skin.name} · ${POKEDEX[skin.owner]?.name || skin.owner} 전용`, equipped(skin.owner) === id ? '해제' : '장착', () => {
          if (equipped(skin.owner) === id) delete state.equipped[skin.owner];
          else state.equipped[skin.owner] = id;
          persist(); paint(); overlay.remove(); openWardrobe();
        });
      }
    }
    closeButton(card, overlay);
  }
  const redActive = () => typeof myTeam !== 'undefined' && myTeam?.lead?.id === 'lee' &&
    !myTeam.lead.fainted && equipped('lee') === 'storm' && !isSpectator;
  let audioCtx;
  // 첫 사용자 탭에서 오디오를 열어 두고, 실제 소리는 기술 시전에만 냅니다.
  document.addEventListener('pointerdown', () => {
    if (!redActive()) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) { audioCtx ||= new Context(); if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); }
    } catch (err) { console.warn('적뢰 오디오를 준비하지 못했습니다.', err); }
  });
  function skillSound(name) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audioCtx ||= new Context();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;
      const strike = name === '벽력일섬', charge = name === '충전';
      const duration = strike ? .85 : charge ? .7 : .46;
      const size = Math.floor(audioCtx.sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let v = 0;
      for (let i = 0; i < size; i++) {
        v = (v + (Math.random() * 2 - 1) * .13) / 1.13;
        data[i] = v * Math.exp(-5 * i / size);
      }
      const src = audioCtx.createBufferSource(); src.buffer = buffer;
      const low = audioCtx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = strike ? 1100 : 680;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(.001, now);
      gain.gain.exponentialRampToValueAtTime(strike ? .46 : .26, now + .02);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      src.connect(low).connect(gain).connect(audioCtx.destination); src.start(now); src.stop(now + duration);
      const tone = audioCtx.createOscillator(), body = audioCtx.createGain();
      tone.type = 'sawtooth'; tone.frequency.setValueAtTime(strike ? 260 : 160, now);
      tone.frequency.exponentialRampToValueAtTime(46, now + .27);
      body.gain.setValueAtTime(.001, now); body.gain.exponentialRampToValueAtTime(.10, now + .02);
      body.gain.exponentialRampToValueAtTime(.001, now + .3);
      tone.connect(body).connect(audioCtx.destination); tone.start(now); tone.stop(now + .31);
    } catch (err) { console.warn('적뢰 기술 소리 오류', err); }
  }
  function bolt(ctx, x1, y1, x2, y2, color, width, jag = 22) {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      ctx.lineTo(x1 + (x2-x1)*t + (Math.random()-.5)*jag,
                 y1 + (y2-y1)*t + (Math.random()-.5)*jag);
    }
    ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = color === '#140c19' ? '#12030d' : '#ff173b'; ctx.shadowBlur = width * 3;
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  let effectToken = 0;
  function skillEffect(name) {
    if (!redActive()) return;
    const recognized = ['롱레인지 찌르기', '벽력일섬', '전기자석파', '충전', '회피 스텝'];
    if (!recognized.includes(name)) return;
    skillSound(name);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const arena = document.getElementById('battle-screen');
    const player = document.getElementById('player-sprite');
    const enemy = document.getElementById('enemy-sprite');
    if (!arena || !player || !enemy || getComputedStyle(arena).display === 'none') return;
    const token = ++effectToken;
    let canvas = arena.querySelector('.red-skill-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'red-skill-canvas'; canvas.setAttribute('aria-hidden', 'true'); arena.appendChild(canvas); }
    const w = Math.max(1, arena.clientWidth), h = Math.max(1, arena.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(w*dpr); canvas.height = Math.ceil(h*dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rect = arena.getBoundingClientRect();
    const center = el => { const r = el.getBoundingClientRect(); return [r.left - rect.left + r.width/2, r.top - rect.top + r.height/2]; };
    const [px, py] = center(player), [ex, ey] = center(enemy);
    const slash = name === '벽력일섬', spear = name === '롱레인지 찌르기';
    const frames = slash ? 10 : 7;
    let frame = 0;
    function draw() {
      if (token !== effectToken || !canvas.isConnected) return;
      ctx.clearRect(0, 0, w, h);
      const t = frame / Math.max(1, frames - 1);
      ctx.fillStyle = slash ? 'rgba(20,4,13,.32)' : 'rgba(7,7,13,.17)';
      ctx.fillRect(0, 0, w, h);
      if (spear || slash) {
        const tx = px + (ex-px)*Math.min(1, t*1.65), ty = py + (ey-py)*Math.min(1, t*1.65);
        for (let i = 0; i < (slash ? 6 : 3); i++) {
          const ox = (Math.random()-.5)*(slash ? 120 : 50), oy = (Math.random()-.5)*(slash ? 100 : 42);
          bolt(ctx, px+ox, py+oy, tx+ox*.4, ty+oy*.4, '#140c19', slash ? 20 : 12, 42);
          bolt(ctx, px+ox, py+oy, tx+ox*.4, ty+oy*.4, '#e5163d', slash ? 7 : 5, 23);
        }
        bolt(ctx, px, py, tx, ty, '#ffe4e8', slash ? 5 : 2, 12);
        if (slash && frame > 2) {
          for (let i = 0; i < 4; i++) {
            const x = i*w/3 + (Math.random()-.5)*w*.3;
            bolt(ctx, x, -20, ex+(Math.random()-.5)*60, ey+(Math.random()-.5)*45, '#130c17', 15, 40);
            bolt(ctx, x, -20, ex+(Math.random()-.5)*25, ey+(Math.random()-.5)*22, '#ff3851', 4, 28);
          }
        }
      } else if (name === '전기자석파') {
        for (let i = 0; i < 8; i++) {
          const a = i*Math.PI/4 + t*3;
          const r = 22 + i%3*13;
          bolt(ctx, ex+Math.cos(a)*r, ey+Math.sin(a)*r,
               ex+Math.cos(a+1.5)*(r+35), ey+Math.sin(a+1.5)*(r+35), i%3?'#ff3054':'#140c19', i%3?4:11, 25);
        }
        if (frame < 3) bolt(ctx, px, py, ex, ey, '#ff4b68', 3, 35);
      } else {
        const radius = name === '충전' ? 100*(1-t)+20 : 38+frame*6;
        for (let i = 0; i < 10; i++) {
          const a = i*Math.PI/5 + t*4, x = px+Math.cos(a)*radius, y = py+Math.sin(a)*radius*.7;
          bolt(ctx, x, y, px+(Math.random()-.5)*32, py+(Math.random()-.5)*32,
               i%3?'#f4234e':'#140c19', i%3?3:10, 24);
        }
      }
      if (++frame < frames) setTimeout(draw, slash ? 72 : 80);
      else setTimeout(() => { if (token === effectToken) canvas.remove(); }, 90);
    }
    draw();
  }
  // 기술이 실제로 발표되는 시점의 기존 연출을 보존하고 전용 붉은 연출만 겹칩니다.
  if (typeof window.triggerSkillVisualAndAudio === 'function') {
    const originalVisual = window.triggerSkillVisualAndAudio;
    window.triggerSkillVisualAndAudio = function(name, side, ...rest) {
      const result = originalVisual.call(this, name, side, ...rest);
      const mine = typeof isHost !== 'undefined' && (isHost ? side === 'p1' : side === 'p2');
      if (mine && redActive()) {
        try { skillEffect(name); } catch (err) { console.warn('적뢰 기술 연출 오류', err); }
      }
      return result;
    };
  }
  const lobby = document.getElementById('lobby-panel');
  if (lobby && typeof window.startAiMode === 'function') {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ai-btn challenge-btn';
    button.textContent = '🏆 NPC 3연전 도전'; lobby.appendChild(button);
    const normalStart = window.startAiMode;
    window.startAiMode = function(...args) { active = false; round = 0; return normalStart.apply(this, args); };
    button.addEventListener('click', () => {
      active = true; round = 1; normalStart();
      const status = document.getElementById('net-status');
      if (status) status.textContent = `NPC 3연전 · 1/3: ${ROUNDS[0].name} — 캐릭터 3명을 고르세요.`;
    });
  }
  const picks = document.getElementById('pick-panel');
  if (picks) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'skin-entry-btn';
    button.textContent = '🎨 스킨 보관함'; button.addEventListener('click', openWardrobe); picks.appendChild(button);
  }
  if (typeof window.confirmTeam === 'function') {
    const normalConfirm = window.confirmTeam;
    window.confirmTeam = function(...args) {
      if (!active || !isAiMode) return normalConfirm.apply(this, args);
      if (myPickList.length !== 3) { alert('캐릭터 3명을 선택해 주세요.'); return; }
      myTeam = { lead: buildMon(myPickList[0], myPickList[0] === 'sungwon_time' ? sungwonSelectedForm : null),
        bench: myPickList.slice(1).map(id => buildMon(id, id === 'sungwon_time' ? sungwonSelectedForm : null)) };
      enemyTeam = makeOpponent(round); startBattleScreen();
    };
  }
  function makeOpponent(index) {
    const ids = ROUNDS[index-1].ids;
    return { lead: buildMon(ids[0], ids[0] === 'sungwon_time' ? 'high' : null),
      bench: ids.slice(1).map(id => buildMon(id, id === 'sungwon_time' ? 'high' : null)) };
  }
  if (typeof window.showGameOverMenu === 'function') {
    const normalGameOver = window.showGameOverMenu;
    window.showGameOverMenu = function(outcome) {
      const alreadyFinished = matchEnded;
      const result = normalGameOver.call(this, outcome);
      if (alreadyFinished || !active || !isAiMode) return result;
      const menu = document.getElementById('menu-gameover');
      if (outcome === 'win' && round < ROUNDS.length && menu) {
        const next = document.createElement('button'); next.type = 'button'; next.className = 'btn-restart';
        next.textContent = `다음 경기 (${round+1}/${ROUNDS.length}): ${ROUNDS[round].name}`;
        next.addEventListener('click', () => {
          round++;
          const ids = myPickList;
          myTeam = { lead: buildMon(ids[0], ids[0] === 'sungwon_time' ? sungwonSelectedForm : null),
            bench: ids.slice(1).map(id => buildMon(id, id === 'sungwon_time' ? sungwonSelectedForm : null)) };
          enemyTeam = makeOpponent(round); startBattleScreen();
        });
        menu.appendChild(next);
      } else {
        if (outcome === 'win' && !state.claimed) { state.pending = true; persist(); offerReward(); }
        active = false; round = 0;
      }
      return result;
    };
  }
  if (typeof window.restartToLobby === 'function') {
    const normalRestart = window.restartToLobby;
    window.restartToLobby = function(...args) { active = false; round = 0; return normalRestart.apply(this, args); };
  }
  if (typeof window.renderBattleField === 'function') {
    const normalRender = window.renderBattleField;
    window.renderBattleField = function(...args) { const result = normalRender.apply(this, args); paint(); return result; };
  }
  if (typeof window.updatePickVisuals === 'function') {
    const normalPicks = window.updatePickVisuals;
    window.updatePickVisuals = function(...args) { const result = normalPicks.apply(this, args); paint(); return result; };
  }
  paint();
  if (state.pending) queueMicrotask(offerReward);
})();