// 오이붕 턴제 배틀 - Web Audio 엔진 (기존 audio.js 전체 교체본)
// 일반 script 로드, 전역 initAudio/playTone/SFX API 유지.
let audioCtx = null;
let audioMaster = null;
let audioNoise = null;
let audioMusicBus = null;
let lastLowHpSound = 0;

function initAudio() {
  try {
    if (!audioCtx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audioCtx = new Context();
      const limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.value = -20;
      limiter.knee.value = 10;
      limiter.ratio.value = 9;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.16;
      audioMaster = audioCtx.createGain();
      audioMaster.gain.value = 0.52;
      audioMaster.connect(limiter);
      audioMusicBus=audioCtx.createGain();
      audioMusicBus.gain.value=.72;
      audioMusicBus.connect(audioMaster);
      limiter.connect(audioCtx.destination);
      const buffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * 0.6), audioCtx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
      audioNoise = buffer;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch (err) {
    return null;
  }
}

window.addEventListener('pointerdown', initAudio, { passive: true });
window.addEventListener('keydown', initAudio);

function playTone(freq, type, duration, gain = 0.25, slideToFreq = null, options = {}) {
  const ctx = initAudio();
  if (!ctx || !audioMaster) return;
  try {
    const f = Math.min(12000, Math.max(25, Number(freq) || 440));
    const d = Math.min(1.6, Math.max(0.025, Number(duration) || 0.1));
    const vol = Math.min(0.42, Math.max(0.0001, Number(gain) || 0.1));
    const t = ctx.currentTime + Math.max(0, Number(options.delay) || 0);
    const attack = Math.min(d * 0.45, Math.max(0.003, Number(options.attack) || 0.008));
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = ['sine', 'triangle', 'sawtooth', 'square'].includes(type) ? type : 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (slideToFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, Math.min(12000, Number(slideToFreq) || f)), t + d);
    }
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(vol, t + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (options.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = options.filter;
      filter.frequency.value = Math.max(60, Number(options.cutoff) || 1200);
      osc.connect(filter);
      filter.connect(envelope);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); envelope.disconnect(); };
    } else {
      osc.connect(envelope);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    }
    if (options.pan != null && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, Number(options.pan) || 0));
      envelope.connect(pan);
      pan.connect(options.music&&audioMusicBus?audioMusicBus:audioMaster);
      const cleanup = osc.onended;
      osc.onended = () => { cleanup(); pan.disconnect(); };
    } else envelope.connect(options.music&&audioMusicBus?audioMusicBus:audioMaster);
    osc.start(t);
    osc.stop(t + d + 0.01);
  } catch (err) { /* 오디오 실패가 전투 진행을 중단하지 않도록 한다. */ }
}

function playNoise(duration, gain, options = {}) {
  const ctx = initAudio();
  if (!ctx || !audioNoise || !audioMaster) return;
  try {
    const t = ctx.currentTime + Math.max(0, Number(options.delay) || 0);
    const d = Math.max(0.025, Math.min(0.5, Number(duration) || 0.12));
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = audioNoise;
    filter.type = options.filter || 'lowpass';
    filter.frequency.setValueAtTime(Math.max(90, Number(options.cutoff) || 1500), t);
    if (options.endCutoff) filter.frequency.exponentialRampToValueAtTime(Math.max(90, Number(options.endCutoff)), t + d);
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, Math.min(0.4, gain)), t + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + d);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(options.music&&audioMusicBus?audioMusicBus:audioMaster);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(t);
    source.stop(t + d);
  } catch (err) { /* 오디오 실패 시 화면과 전투는 유지한다. */ }
}

function playNotes(notes, type = 'triangle', spacing = 0.07, gain = 0.14) {
  notes.forEach((freq, i) => playTone(freq, type, 0.16, gain, null, { delay: i * spacing }));
}

const SFX = {
  click: () => playTone(660, 'sine', 0.055, 0.09, 920),
  lunge: () => { playNoise(0.16, 0.10, { filter: 'highpass', cutoff: 700, endCutoff: 2200 }); playTone(320, 'triangle', 0.18, 0.13, 115); },
  hit: () => { playTone(128, 'triangle', 0.23, 0.22, 40); playNoise(0.09, 0.13, { cutoff: 1700 }); },
  superHit: () => { playTone(150, 'sawtooth', 0.29, 0.24, 34); playTone(55, 'sine', 0.38, 0.25, 29, { delay: 0.015 }); playNoise(0.17, 0.20, { cutoff: 3300 }); },
  weakHit: () => { playTone(420, 'triangle', 0.11, 0.10, 190); playNoise(0.06, 0.05, { cutoff: 950 }); },
  crit: () => { playNoise(0.21, 0.24, { filter: 'highpass', cutoff: 1800 }); playTone(1100, 'square', 0.10, 0.12, 420); playTone(82, 'sine', 0.43, 0.30, 30, { delay: 0.025 }); },
  protect: () => { playTone(700, 'sine', 0.29, 0.13, 1450); playTone(1046, 'triangle', 0.26, 0.10, 523, { delay: 0.08 }); },
  rankUp: () => playNotes([330, 440, 554, 659], 'triangle', 0.065, 0.13),
  rankDown: () => playNotes([659, 554, 440, 330], 'sawtooth', 0.065, 0.10),
  heal: () => playNotes([523, 659, 784, 1046], 'sine', 0.074, 0.15),
  switchIn: () => { playNoise(0.20, 0.09, { filter: 'highpass', cutoff: 1700 }); playTone(270, 'sine', 0.22, 0.13, 840); playTone(740, 'triangle', 0.15, 0.10, 380, { delay: 0.12 }); },
  faint: () => { playTone(330, 'sawtooth', 0.54, 0.15, 46); playTone(110, 'sine', 0.55, 0.18, 29, { delay: 0.10 }); },
  dodge: () => { playNoise(0.11, 0.11, { filter: 'highpass', cutoff: 2000 }); playTone(620, 'sine', 0.12, 0.09, 980); },
  poison: () => { playTone(500, 'sawtooth', 0.17, 0.12, 160); playNoise(0.18, 0.12, { cutoff: 750, endCutoff: 350 }); },
  burn: () => { playNoise(0.27, 0.14, { filter: 'highpass', cutoff: 1400, endCutoff: 4500 }); playTone(145, 'sawtooth', 0.25, 0.11, 55); },
  paralyze: () => { playNoise(0.075, 0.16, { filter: 'highpass', cutoff: 4200 }); playTone(1900, 'square', 0.045, 0.10, 310); },
  lowHp: () => {
    const now=Date.now();
    if(now-lastLowHpSound<1350)return;
    lastLowHpSound=now;
    playTone(88,'sine',.30,.36,43,{attack:.005});
    playTone(52,'sine',.36,.31,30,{delay:.018});
    playNoise(.1,.10,{cutoff:230,delay:.006});
    playTone(76,'sine',.28,.31,38,{delay:.34});
    playNoise(.09,.08,{cutoff:195,delay:.34});
  },
  victory: () => playNotes([392, 523, 659, 784, 1046], 'triangle', 0.11, 0.15),
  defeat: () => playNotes([440, 349, 294, 220], 'sine', 0.17, 0.12),
  // 배서준
  drain: () => { playTone(185, 'sawtooth', 0.20, 0.13, 650); playNoise(0.13, 0.10, { cutoff: 950, delay: 0.06 }); playTone(620, 'sine', 0.27, 0.14, 165, { delay: 0.13 }); },
  bulkup: () => { playNoise(0.22, 0.10, { cutoff: 500 }); playNotes([130, 164, 196, 261], 'sawtooth', 0.085, 0.10); },
  // 오슬우
  sludge: () => { playNoise(0.34, 0.15, { cutoff: 1050, endCutoff: 260 }); playTone(560, 'sawtooth', 0.13, 0.12, 160); playTone(165, 'square', 0.23, 0.10, 65, { delay: 0.11 }); },
  charm: () => { playTone(880, 'sine', 0.19, 0.12, 460); playTone(660, 'sine', 0.23, 0.12, 220, { delay: 0.13 }); },
  // 이권재
  thunderbolt: () => { playTone(860, 'sawtooth', 0.15, 0.15, 1850); playNoise(0.12, 0.19, { filter: 'highpass', cutoff: 2600, delay: 0.09 }); playTone(120, 'square', 0.29, 0.13, 45, { delay: 0.12 }); },
  charge: () => { playTone(170, 'sine', 0.38, 0.14, 900); playTone(480, 'triangle', 0.26, 0.10, 1300, { delay: 0.12 }); },
  // 박성원
  meteor: () => { playNoise(0.23, 0.13, { filter: 'highpass', cutoff: 900 }); playTone(240, 'triangle', 0.23, 0.16, 45); playTone(58, 'sine', 0.42, 0.22, 29, { delay: 0.09 }); },
  sandstorm: () => { playNoise(0.44, 0.12, { filter: 'bandpass', cutoff: 1100, endCutoff: 480 }); playTone(290, 'triangle', 0.27, 0.10, 145); },
  // 최규원
  flameStream: () => { playNoise(0.39, 0.16, { filter: 'highpass', cutoff: 1200, endCutoff: 3800 }); playTone(250, 'sawtooth', 0.28, 0.14, 80); },
  gachaWin: () => playNotes([523, 659, 784, 1046, 1318], 'triangle', 0.075, 0.15),
  gachaFail: () => { playTone(320, 'sawtooth', 0.19, 0.13, 100); playTone(95, 'sine', 0.34, 0.16, 40, { delay: 0.16 }); },
  // 윤서윤
  psychic: () => { playTone(460, 'sine', 0.32, 0.14, 1020); playTone(780, 'sine', 0.29, 0.11, 390, { delay: 0.11 }); },
  barrier: () => { playTone(1100, 'triangle', 0.29, 0.13, 420); playTone(1568, 'sine', 0.25, 0.09, 784, { delay: 0.07 }); },
  // 보인고오슬우
  chaos: () => { playTone(650, 'square', 0.08, 0.12, 125); playTone(230, 'sawtooth', 0.13, 0.11, 1030, { delay: 0.055 }); playNoise(0.15, 0.13, { cutoff: 1800, delay: 0.11 }); },
  timeLeap: () => { playTone(210, 'sine', 0.31, 0.16, 1260); playNoise(0.16, 0.08, { filter: 'highpass', cutoff: 2100, delay: 0.12 }); },
  // 성원-타임
  airSlash: () => { playNoise(0.17, 0.13, { filter: 'highpass', cutoff: 1600 }); playTone(480, 'triangle', 0.17, 0.13, 930); playTone(680, 'triangle', 0.17, 0.10, 180, { delay: 0.08 }); },
  rewind: () => { playTone(970, 'sawtooth', 0.42, 0.12, 150); playNoise(0.17, 0.09, { filter: 'bandpass', cutoff: 900, delay: 0.10 }); },
  // 다음 app.js 교체에서 move_announce / damage 이벤트에 연결할 2단계 API.
  // 기존 app.js의 SFX 메서드는 전부 보존되어 교체 즉시 기존 전투도 동작한다.
  skillCast: (moveName) => {
    const cast = {
      '피의 방패': 'protect', '드레인펀치': 'drain', '벌크업': 'bulkup', '도발 (Taunt)': 'rankDown',
      '멘헤라 가드': 'protect', '오물폭탄': 'sludge', '보인고 매혹': 'charm', '기생독': 'poison',
      '회피 스텝': 'dodge', '롱레인지 찌르기': 'thunderbolt', '전기자석파': 'charge', '충전': 'charge',
      '철벽 방어': 'protect', '메테오 스트라이크': 'meteor', '스텔스 아머': 'barrier', '모래바람': 'sandstorm',
      '화염 장벽': 'protect', '화염방사': 'flameStream', '도깨비불': 'burn', '수능 가챠': 'charge',
      '절대 방어': 'protect', '사이코 쇼크': 'psychic', '리플렉트 실드': 'barrier', '흑안개': 'rewind',
      '스플래시 매직': 'chaos', '타임 리프 스트라이크': 'timeLeap', '광기의 예언서': 'chaos', '익스트림 카오스': 'chaos',
      '페이스 조절': 'airSlash', '되감기 / 빨리감기': 'rewind', '오버차지 / 작용반작용': 'charge',
      '되감기': 'rewind', '빨리감기': 'airSlash', '오버차지': 'charge', '작용반작용': 'airSlash',
      '벽력일섬': 'thunderbolt', '니카 낙뢰': 'thunderbolt'
    }[moveName];
    (SFX[cast] || SFX.lunge)();
  },
  skillImpact: (moveName, result = 'normal') => {
    if (result === 'miss') return SFX.dodge();
    if (result === 'crit') return SFX.crit();
    if (result === 'super') return SFX.superHit();
    if (result === 'weak') return SFX.weakHit();
    const texture = {
      '드레인펀치': 155, '오물폭탄': 215, '롱레인지 찌르기': 870,
      '메테오 스트라이크': 92, '화염방사': 290, '사이코 쇼크': 690,
      '스플래시 매직': 630, '타임 리프 스트라이크': 720,
      '광기의 예언서': 510, '익스트림 카오스': 185,
      '되감기 / 빨리감기': 840, '오버차지 / 작용반작용': 130
    }[moveName];
    if (texture) playTone(texture, 'triangle', 0.14, 0.11, Math.max(38, texture * 0.55));
    SFX.hit();
    playTone(920,'triangle',.09,.06,1300,{delay:.035});
  },
  killConfirm:()=>playNotes([659,880,1175,1568],'triangle',.07,.11),
  nikaBeat:()=>{for(let i=0;i<4;i++){playTone(75,'sine',.12,.2,44,{delay:i*.18});playNoise(.06,.075,{cutoff:420,delay:i*.18});}playTone(1050,'sawtooth',.28,.14,1800);},
  clockTick:()=>{playTone(1300,'triangle',.05,.07,800);playTone(880,'triangle',.055,.06,520,{delay:.13});},
  clown:()=>{playNotes([660,550,830,390],'triangle',.07,.065);playNoise(.12,.05,{filter:'bandpass',cutoff:1050});},
  meteorCrash:()=>{playTone(58,'sine',.6,.24,30);playNoise(.4,.18,{cutoff:450});playNoise(.2,.08,{filter:'highpass',cutoff:900});}
};

// 전투 시작 시 3종 중 하나를 고른다. HP 30% 이하일 때만 별도 위기 테마로 전환한다.
const BATTLE_TRACKS=Object.freeze([
  {name:'NEON DRIVE',bpm:132,bass:[55,43.65,65.41,49],lead:[440,523.25,659.25,523.25,392,523.25,659.25,783.99],kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],wave:'sawtooth'},
  {name:'VOLTAGE RUN',bpm:148,bass:[61.74,49,55,73.42],lead:[493.88,587.33,739.99,587.33,554.37,739.99,880,739.99],kick:[0,3,7,8,11,14],snare:[4,12],hat:[1,3,5,7,9,11,13,15],wave:'square'},
  {name:'NIGHT CIRCUIT',bpm:122,bass:[65.41,51.91,58.27,43.65],lead:[523.25,659.25,783.99,1046.5,783.99,659.25,587.33,659.25],kick:[0,6,8,14],snare:[4,12],hat:[2,4,6,10,12,14],wave:'triangle'}
]);
const DANGER_TRACK=Object.freeze({
  name:'CRITICAL OVERRIDE',bpm:96,
  bass:[41.2,38.89,36.71,43.65],
  lead:[329.63,311.13,261.63,246.94,293.66,261.63,233.08,246.94],
  kick:[0,7,10],snare:[6,14],hat:[3,11,15],wave:'triangle'
});
let battleMusicTimer=null;
let battleMusicTheme=null;
let battleMusicActiveTheme=null;
let battleMusicStep=0;
let battleMusicSession=0;
function renderMusicStep(theme,n){
  const bar=Math.floor(n/16)%4,beat=n%16,bass=theme.bass[bar];
  if(theme.kick.includes(beat)){
    playTone(theme===DANGER_TRACK?86:110,'sine',.19,.17,33,{music:true});
    playNoise(.04,.025,{filter:'lowpass',cutoff:290,music:true});
  }
  if(theme.snare.includes(beat)){
    playNoise(.11,.069,{filter:'highpass',cutoff:1600,music:true});
    playTone(171,'triangle',.09,.027,84,{music:true});
  }
  if(theme.hat.includes(beat))playNoise(.032,.025,{filter:'highpass',cutoff:5400,music:true});
  if(beat%2===0)playTone(bass,theme.wave,theme===DANGER_TRACK?.28:.19,.078,bass*.8,
    {filter:'lowpass',cutoff:theme===DANGER_TRACK?540:900,music:true,attack:.009});
  if(theme===DANGER_TRACK){
    if(beat%4===0)playTone(theme.lead[(bar*2+beat/4)%8],'sine',.27,.045,null,
      {filter:'lowpass',cutoff:1200,music:true,attack:.016});
    if(beat===15)playTone(622.25,'triangle',.18,.022,329.63,{music:true});
  }else if(beat%4===0||(theme.bpm>140&&beat%4===3)){
    const ix=(bar*2+Math.floor(beat/4))%theme.lead.length;
    playTone(theme.lead[ix],theme.wave,.12,.034,theme.lead[ix]*1.02,
      {filter:'lowpass',cutoff:2300,music:true,attack:.007});
  }
}
function startBattleMusic(isActive,isLowHp){
  battleMusicSession++;
  const session=battleMusicSession;
  if(battleMusicTimer)clearTimeout(battleMusicTimer);
  battleMusicTimer=null;
  battleMusicTheme=BATTLE_TRACKS[Math.floor(Math.random()*BATTLE_TRACKS.length)];
  battleMusicActiveTheme=null;
  battleMusicStep=0;
  let lastPulse=0,lastDanger=null;
  const tick=()=>{
    if(session!==battleMusicSession)return;
    if(!isActive()){
      battleMusicTimer=null;
      if(audioCtx&&audioMusicBus)audioMusicBus.gain.setTargetAtTime(0,audioCtx.currentTime,.10);
      return;
    }
    if(document.hidden){battleMusicTimer=setTimeout(tick,250);return;}
    const danger=!!isLowHp();
    if(danger!==lastDanger){battleMusicStep=0;lastDanger=danger;lastPulse=0;}
    battleMusicActiveTheme=danger?DANGER_TRACK:battleMusicTheme;
    const ctx=initAudio();
    if(ctx&&audioMusicBus){
      audioMusicBus.gain.setTargetAtTime(danger?.16:.72,ctx.currentTime,.18);
      renderMusicStep(battleMusicActiveTheme,battleMusicStep++);
      if(danger){const now=Date.now();if(now-lastPulse>=1430){lastPulse=now;SFX.lowHp();}}
    }
    battleMusicTimer=setTimeout(tick,60000/battleMusicActiveTheme.bpm/4);
  };
  tick();
}
const oldSkillCast=SFX.skillCast;
SFX.skillCast=(name)=>{oldSkillCast(name);
 if(name==='화염방사'){playTone(235,'sawtooth',1.5,.075,610);for(let i=0;i<4;i++)playNoise(.46,.07,{filter:'highpass',cutoff:950,delay:i*.37});}
 if(name==='메테오 스트라이크')playTone(165,'triangle',.45,.085,42);
 if(name==='오물폭탄')playTone(330,'sawtooth',.52,.07,90);
 if(name==='드레인펀치')playTone(115,'sawtooth',.37,.09,65);
 if(name==='사이코 쇼크')playTone(540,'sine',.62,.085,1200);
 if(name==='벽력일섬')SFX.nikaBeat();
 if(name==='페이스 조절'||name==='되감기'||name==='빨리감기'||name==='오버차지'||name==='작용반작용')SFX.clockTick();
 if(['스플래시 매직','타임 리프 스트라이크','광기의 예언서','익스트림 카오스'].includes(name))SFX.clown();
};
