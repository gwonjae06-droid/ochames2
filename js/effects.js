
// -------------------------------------------------------------
// 캔버스 비주얼 이펙트 & 파티클 렌더 엔진 (포켓몬 본가 배틀 스타일 대폭 강화)
// -------------------------------------------------------------
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
let activeFX = [];
let fxHoldFrames = 0;
let fxShakeFrames = 0;
let fxShakeStrength = 0;
const fxReducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxLimit = fxReducedMotion ? 24 : 112;

function addFX(animFn) {
  if (!fxCtx || typeof animFn !== 'function') return;
  if (activeFX.length >= fxLimit) activeFX.shift();
  activeFX.push(animFn);
}

function renderFXLoop() {
  requestAnimationFrame(renderFXLoop);
  if (!fxCtx || !fxCanvas) return;
  const screen = document.getElementById('battle-screen');
  if (!screen || screen.style.display === 'none' || document.hidden) {
    activeFX.length = 0;
    fxHoldFrames = 0;
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    return;
  }
  if (fxHoldFrames > 0 && !fxReducedMotion) { fxHoldFrames--; return; }
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  fxCtx.save();
  if (fxShakeFrames > 0 && !fxReducedMotion) {
    const power = fxShakeStrength * fxShakeFrames / 12;
    fxCtx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
    fxShakeFrames--;
  }
  const drawing = activeFX;
  activeFX = [];
  for (const anim of drawing) {
    try { if (anim(fxCtx) && activeFX.length < fxLimit) activeFX.push(anim); }
    catch (err) { console.warn('VFX 렌더 오류:', err); }
  }
  fxCtx.restore();
}
renderFXLoop();

function getSpriteCenter(spriteId) {
  const sprite = document.getElementById(spriteId);
  const screen = document.getElementById('battle-screen');
  if (!sprite || !screen || !fxCanvas) return { x: 300, y: 160 };
  const sRect = sprite.getBoundingClientRect();
  const scRect = screen.getBoundingClientRect();
  const scaleX = fxCanvas.width / scRect.width;
  const scaleY = fxCanvas.height / scRect.height;
  return {
    x: (sRect.left - scRect.left + sRect.width / 2) * scaleX,
    y: (sRect.top - scRect.top + sRect.height / 2) * scaleY
  };
}


// 기존 app.js의 회피 스텝 호출을 수용하고, 다른 방어/강화 기술에도 재사용한다.
function playBuffAuraFX(x, y, color = '#38bdf8') {
  let frame = 0;
  const sparks = Array.from({ length: fxReducedMotion ? 5 : 14 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 10 + Math.random() * 30,
    size: 1.8 + Math.random() * 3
  }));
  addFX(ctx => {
    frame++;
    const alpha = Math.max(0, 1 - frame / 28);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = fxReducedMotion ? 3 : 13;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 18 + frame * 1.7, 0, Math.PI * 2);
    ctx.stroke();
    for (const s of sparks) {
      const dist = s.radius + frame * 0.65;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + Math.cos(s.angle) * dist, y + Math.sin(s.angle) * dist, s.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return frame < 28;
  });
}

function playAfterimageFX(fromX, fromY, toX, toY, color = '#fff') {
  let frame = 0;
  addFX(ctx => {
    frame++;
    const alpha = Math.max(0, 1 - frame / 14);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < (fxReducedMotion ? 1 : 4); i++) {
      const t = Math.max(0, Math.min(1, (frame - i * 2) / 12));
      ctx.globalAlpha = alpha * (0.46 - i * 0.07);
      ctx.strokeStyle = color;
      ctx.lineWidth = 10 - i * 2;
      ctx.beginPath();
      ctx.moveTo(fromX + (toX - fromX) * Math.max(0, t - 0.25), fromY + (toY - fromY) * Math.max(0, t - 0.25));
      ctx.lineTo(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t);
      ctx.stroke();
    }
    ctx.restore();
    return frame < 14;
  });
}

// 실제 피해 이벤트 발생 시 호출. 게임의 턴 계산은 멈추지 않고 그림만 잠깐 유지한다.
function playHitImpactFX(x, y, options = {}) {
  if (!fxCanvas || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const crit = !!options.crit;
  const eff = Number(options.effectiveness) || 1;
  const color = crit ? '#fff3b0' : eff >= 2 ? '#ff815d' : eff <= 0.5 ? '#7dd3fc' : '#f8fafc';
  const count = fxReducedMotion ? 5 : crit ? 26 : 16;
  const shards = Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2, speed: 2 + Math.random() * (crit ? 8 : 5),
    size: 1.5 + Math.random() * 3.2, twist: Math.random() * 3
  }));
  fxShakeFrames = fxReducedMotion ? 0 : Math.max(fxShakeFrames, crit ? 12 : eff >= 2 ? 8 : 5);
  fxShakeStrength = crit ? 16 : eff >= 2 ? 11 : 6;
  let frame = 0;
  addFX(ctx => {
    frame++;
    if (frame === 1 && !fxReducedMotion) fxHoldFrames = crit ? 3 : 1;
    const alpha = Math.max(0, 1 - frame / 18);
    ctx.save();
    if (frame < 4) {
      ctx.globalAlpha = Math.max(0, (crit ? 0.25 : 0.12) * (1 - frame / 4));
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, fxCanvas.width, fxCanvas.height);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = crit ? 5 : 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = fxReducedMotion ? 0 : 12;
    ctx.beginPath();
    ctx.arc(x, y, 9 + frame * (crit ? 4 : 3), 0, Math.PI * 2);
    ctx.stroke();
    for (const p of shards) {
      const dist = p.speed * frame;
      const px = x + Math.cos(p.a) * dist;
      const py = y + Math.sin(p.a) * dist;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.2, p.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    if (options.damage && frame <= 16) {
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.font = `900 ${crit ? 20 : 15}px system-ui, sans-serif`;
      ctx.fillStyle = crit ? '#fff3b0' : '#fff';
      ctx.fillText(`-${Math.max(0, Number(options.damage) || 0)}`, x, y - 30 - frame * 1.3);
    }
    ctx.restore();
    return frame < 18;
  });
}

function playStatusFX(x, y, status) {
  const palette = { poisoned: '#a855f7', burned: '#f97316', paralyzed: '#facc15', seeded: '#4ade80', flinched: '#f8fafc' };
  const color = palette[status] || '#c084fc';
  let frame = 0;
  const dots = Array.from({ length: fxReducedMotion ? 6 : 18 }, () => ({
    dx: (Math.random() - 0.5) * 44,
    dy: Math.random() * 15,
    speed: 0.5 + Math.random() * 1.9,
    r: 1.5 + Math.random() * 3
  }));
  addFX(ctx => {
    frame++;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - frame / 28);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = fxReducedMotion ? 0 : 11;
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(x + d.dx + Math.sin(frame * 0.2 + d.dx) * 3, y + d.dy - frame * d.speed, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return frame < 28;
  });
}

// 💡 [본가 포켓몬 공통 랭크업 / 랭크다운 화살표 연출]
function playRankUpFX(x, y, colorHex = '#38bdf8') {
  let frame = 0;
  const arrows = Array.from({ length: 4 }, (_, i) => ({
    offsetX: (i - 1.5) * 18,
    delay: i * 4,
    yOffset: 40,
    alpha: 0
  }));

  addFX((ctx) => {
    frame++;
    ctx.save();
    arrows.forEach(arr => {
      if (frame >= arr.delay) {
        arr.yOffset -= 3.5;
        arr.alpha = Math.max(0, 1 - Math.abs(arr.yOffset) / 60);

        ctx.fillStyle = colorHex;
        ctx.shadowColor = colorHex;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = arr.alpha;

        const posX = x + arr.offsetX;
        const posY = y + arr.yOffset;

        // 본가 스타일 정삼각형 상승 화살표 (▲)
        ctx.beginPath();
        ctx.moveTo(posX, posY - 8);
        ctx.lineTo(posX + 7, posY + 6);
        ctx.lineTo(posX - 7, posY + 6);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.restore();
    return frame < 28;
  });
}

function playRankDownFX(x, y) {
  let frame = 0;
  const arrows = Array.from({ length: 3 }, (_, i) => ({
    offsetX: (i - 1) * 22,
    delay: i * 5,
    yOffset: -40,
    alpha: 0
  }));

  addFX((ctx) => {
    frame++;
    ctx.save();
    arrows.forEach(arr => {
      if (frame >= arr.delay) {
        arr.yOffset += 3.2;
        arr.alpha = Math.max(0, 1 - Math.abs(arr.yOffset) / 60);

        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#7e22ce';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = arr.alpha;

        const posX = x + arr.offsetX;
        const posY = y + arr.yOffset;

        // 본가 스타일 역삼각형 하강 화살표 (▼)
        ctx.beginPath();
        ctx.moveTo(posX, posY + 8);
        ctx.lineTo(posX + 7, posY - 6);
        ctx.lineTo(posX - 7, posY - 6);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.restore();
    return frame < 28;
  });
}

// ---------------- 1. 배서준 (격투 / 흡혈귀) ----------------
function playDrainPunchFX(fromX, fromY, toX, toY) {
  playAfterimageFX(fromX, fromY, toX, toY, '#fb7185');
  let frame = 0;
  const punchOffsets = Array.of(
    { x: -15, y: -10, delay: 0 },
    { x: 15, y: 10, delay: 4 },
    { x: 0, y: 0, delay: 8 }
  );

  addFX((ctx) => {
    frame++;
    ctx.save();
    punchOffsets.forEach(p => {
      if (frame >= p.delay && frame < p.delay + 6) {
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(toX + p.x, toY + p.y, (frame - p.delay) * 5 + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(toX + p.x, toY + p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
    return frame < 16;
  });

  let t = 0;
  addFX((ctx) => {
      if (frame < 10) return true;
      t += 0.06;
      const curX = toX + (fromX - toX) * t;
      const curY = toY + (fromY - toY) * t - Math.sin(t * Math.PI) * 25;
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(curX, curY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(curX - (fromX - toX) * 0.05, curY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return t < 1.0;
  });
}

function playSlashFX(x, y) {
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 50 + frame * 5, y - 50 + frame * 4);
    ctx.lineTo(x + 50 - frame * 3, y + 50 - frame * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
    return frame < 12;
  });
}

function playBulkUpFX(x, y) {
  playBuffAuraFX(x, y, '#fb923c');
  playRankUpFX(x, y, '#ef4444');
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    const alpha = Math.max(0, 1 - frame / 18);
    ctx.strokeStyle = `rgba(234, 88, 12, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, frame * 3.5 + 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return frame < 18;
  });
}

// ---------------- 2. 오슬우 (독 / 멘헤라) ----------------
function playSludgeBombFX(fromX, fromY, toX, toY) {
  playAfterimageFX(fromX, fromY, toX, toY, '#c084fc');
  let t = 0;
  addFX((ctx) => {
    t += 0.055;
    const curX = fromX + (toX - fromX) * t;
    const arcHeight = Math.sin(t * Math.PI) * 75;
    const curY = fromY + (toY - fromY) * t - arcHeight;

    ctx.save();
    ctx.fillStyle = '#7e22ce';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(curX, curY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(curX - 3, curY - 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (t >= 1.0) {
      playPoisonFX(toX, toY);
    }
    return t < 1.0;
  });
}

function playPoisonFX(x, y) {
  let bubbles = Array.from({ length: 20 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8 - 2,
    r: Math.random() * 9 + 4,
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    bubbles.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.alpha -= 0.045;
      ctx.fillStyle = `rgba(168, 85, 247, ${Math.max(0, b.alpha)})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return bubbles.at(0).alpha > 0;
  });
}

function playLeechSeedFX(fromX, fromY, toX, toY) {
  let t = 0;
  addFX((ctx) => {
    t += 0.055;
    const curX = fromX + (toX - fromX) * t;
    const curY = fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 45;
    ctx.save();
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#16a34a';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(curX, curY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return t < 1.0;
  });
}

function playAttractCharmFX(fromX, fromY, toX, toY) {
  let t = 0;
  addFX((ctx) => {
    t += 0.05;
    const curX = fromX + (toX - fromX) * t;
    const curY = fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 35;
    ctx.save();
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;

    const size = 12;
    ctx.beginPath();
    ctx.moveTo(curX, curY + size / 4);
    ctx.quadraticCurveTo(curX, curY, curX + size / 4, curY);
    ctx.quadraticCurveTo(curX + size / 2, curY, curX + size / 2, curY + size / 4);
    ctx.quadraticCurveTo(curX + size / 2, curY, curX + (size * 3) / 4, curY);
    ctx.quadraticCurveTo(curX + size, curY, curX + size, curY + size / 4);
    ctx.quadraticCurveTo(curX + size, curY + size / 2, curX + (size * 3) / 4, curY + (size * 3) / 4);
    ctx.lineTo(curX + size / 2, curY + size);
    ctx.lineTo(curX + size / 4, curY + (size * 3) / 4);
    ctx.quadraticCurveTo(curX, curY + size / 2, curX, curY + size / 4);
    ctx.fill();
    ctx.restore();
    return t < 1.0;
  });
}

// ---------------- 3. 이권재 (전기 / 가속) ----------------
function playThunderboltFX(x, y) {
  playAfterimageFX(x + 20, y - 125, x, y + 35, '#7dd3fc');
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(x + 25, y - 130);
    ctx.lineTo(x - 20, y - 70);
    ctx.lineTo(x + 18, y - 25);
    ctx.lineTo(x - 10, y + 15);
    ctx.lineTo(x, y + 40);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    if (frame > 3) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + (Math.random() - 0.5) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 35);
        ctx.lineTo(x + Math.cos(ang) * 45, y + 35 + Math.sin(ang) * 20);
        ctx.stroke();
      }
    }
    ctx.restore();
    return frame < 12;
  });
}

function playElectricSparksFX(x, y) {
  let sparks = Array.from({ length: 18 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 11,
    vy: (Math.random() - 0.5) * 11,
    len: Math.random() * 14 + 6,
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    sparks.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.alpha -= 0.055;
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, s.alpha)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.vx * 1.5, s.y + s.vy * 1.5);
      ctx.stroke();
    });
    ctx.restore();
    return sparks.at(0).alpha > 0;
  });
}

function playChargeFX(x, y) {
  playBuffAuraFX(x, y, '#38bdf8');
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    const r = Math.max(8, 45 - frame * 2.5);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return frame < 15;
  });
}

// ---------------- 4. 박성원 (바위 / 탱커) ----------------
function playMeteorStrikeFX(x, y) {
  playAfterimageFX(x - 50, y - 120, x, y, '#fbbf24');
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    const curX = x - 50 + frame * 5;
    const curY = y - 120 + frame * 12;

    ctx.fillStyle = '#78350f';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(curX, Math.min(y, curY), 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(curX - 5, Math.min(y, curY) - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (frame === 10) {
      playStoneSpikesFX(x, y);
    }
    return frame < 11;
  });
}

function playStoneSpikesFX(x, y) {
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    ctx.fillStyle = '#059669';
    ctx.shadowColor = '#047857';
    ctx.shadowBlur = 12;

    const h = Math.min(45, frame * 6);
    ctx.beginPath();
    ctx.moveTo(x - 25, y + 25);
    ctx.lineTo(x - 15, y + 25 - h * 0.7);
    ctx.lineTo(x - 5, y + 25);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - 10, y + 25);
    ctx.lineTo(x, y + 25 - h);
    ctx.lineTo(x + 10, y + 25);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 5, y + 25);
    ctx.lineTo(x + 15, y + 25 - h * 0.75);
    ctx.lineTo(x + 25, y + 25);
    ctx.fill();

    ctx.restore();
    return frame < 14;
  });
}

function playRockFX(x, y) {
  let radius = 10;
  let alpha = 1.0;
  addFX((ctx) => {
    radius += 5;
    alpha -= 0.055;
    ctx.save();
    ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0, alpha)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return alpha > 0;
  });
}

function playSandstormWeatherFX() {
  let particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * (fxCanvas ? fxCanvas.width : 660),
    y: Math.random() * (fxCanvas ? fxCanvas.height : 310),
    vx: -(Math.random() * 9 + 8),
    vy: (Math.random() - 0.5) * 2.5,
    size: Math.random() * 4 + 2,
    alpha: 0.95
  }));
  addFX((ctx) => {
    ctx.save();
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
      ctx.fillStyle = `rgba(217, 119, 6, ${Math.max(0, p.alpha)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return particles.at(0).alpha > 0;
  });
}

// ---------------- 5. 최규원 (불꽃 / 겜블러) ----------------
function playFlamethrowerFX(fromX, fromY, toX, toY) {
  playAfterimageFX(fromX, fromY, toX, toY, '#fb923c');
  let frame = 0;
  const fireParticles = Array.from({ length: 28 }, (_, i) => ({
    delay: i * 1.5,
    progress: 0,
    wobble: (Math.random() - 0.5) * 35,
    size: Math.random() * 8 + 8
  }));

  addFX((ctx) => {
    frame++;
    ctx.save();
    fireParticles.forEach(fp => {
      if (frame >= fp.delay && fp.progress < 1.0) {
        fp.progress += 0.06;
        const curX = fromX + (toX - fromX) * fp.progress;
        const curY = fromY + (toY - fromY) * fp.progress + Math.sin(fp.progress * Math.PI * 2) * fp.wobble;

        ctx.fillStyle = fp.progress < 0.6 ? '#f59e0b' : '#ef4444';
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(curX, curY, fp.size * (1 + fp.progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
    if (frame === 15) playFireFX(toX, toY);
    return frame < 45;
  });
}

function playWillOWispFX(fromX, fromY, toX, toY) {
  let t = 0;
  addFX((ctx) => {
    t += 0.045;
    const centerX = fromX + (toX - fromX) * t;
    const centerY = fromY + (toY - fromY) * t;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const angle = t * 8 + (i * Math.PI * 2) / 3;
      const radius = 22 * (1 - t * 0.5);
      const fx = centerX + Math.cos(angle) * radius;
      const fy = centerY + Math.sin(angle) * radius;

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#2563eb';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return t < 1.0;
  });
}

function playFireFX(x, y) {
  let sparks = Array.from({ length: 22 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9,
    r: Math.random() * 9 + 4,
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    sparks.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.alpha -= 0.045;
      ctx.fillStyle = `rgba(239, 68, 68, ${Math.max(0, s.alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return sparks.at(0).alpha > 0;
  });
}

function playGachaEffect(x, y, isWin) {
  let stars = Array.from({ length: 28 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * (isWin ? 14 : 6),
    vy: (Math.random() - 0.5) * (isWin ? 14 : 6),
    size: Math.random() * 7 + 4,
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    stars.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.alpha -= 0.04;
      ctx.fillStyle = isWin ? `rgba(250, 204, 21, ${Math.max(0, s.alpha)})` : `rgba(71, 85, 105, ${Math.max(0, s.alpha)})`;
      ctx.shadowColor = isWin ? '#eab308' : '#334155';
      ctx.shadowBlur = isWin ? 12 : 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return stars.at(0).alpha > 0;
  });
}

// ---------------- 6. 윤서윤 (에스퍼 / 서포터) ----------------
function playPsychicFX(x, y) {
  playBuffAuraFX(x, y, '#f9a8d4');
  let rings = Array.of(0, 8, 16);
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    rings.forEach((offset) => {
      let r = (frame * 3.5 + offset * 2) % 65;
      let alpha = Math.max(0, 1 - r / 65);
      ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.95})`;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, r + 12, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
    return frame < 22;
  });
}

function playBarrierFX(x, y) {
  playBuffAuraFX(x, y, '#7dd3fc');
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    const alpha = Math.sin((frame / 16) * Math.PI);
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.95})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 14;

    const r = 48;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = x + Math.cos(angle) * r;
      const hy = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return frame < 16;
  });
}

function playHazeFX() {
  let smoke = Array.from({ length: 30 }, () => ({
    x: Math.random() * (fxCanvas ? fxCanvas.width : 660),
    y: (fxCanvas ? fxCanvas.height : 310) + 20,
    vy: -(Math.random() * 3 + 2),
    r: Math.random() * 25 + 15,
    alpha: 0.85
  }));
  addFX((ctx) => {
    ctx.save();
    smoke.forEach(s => {
      s.y += s.vy;
      s.alpha -= 0.025;
      ctx.fillStyle = `rgba(30, 41, 59, ${Math.max(0, s.alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    return smoke.at(0).alpha > 0;
  });
}

// ---------------- 7. 보인고오슬우 (환락 / 카오스) ----------------
function playChaosGlitchFX(x, y) {
  playBuffAuraFX(x, y, '#e879f9');
  const glitchColors = Array.of('#db2777', '#38bdf8', '#a855f7', '#f43f5e', '#22c55e');
  let blocks = Array.from({ length: 25 }, () => ({
    x: x + (Math.random() - 0.5) * 75,
    y: y + (Math.random() - 0.5) * 75,
    w: Math.random() * 18 + 8,
    h: Math.random() * 12 + 4,
    color: glitchColors.at(Math.floor(Math.random() * glitchColors.length)),
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    blocks.forEach(b => {
      b.alpha -= 0.055;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.alpha);
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    ctx.restore();
    return blocks.at(0).alpha > 0;
  });
}

function playSplashMagicFX(fromX, fromY, toX, toY) {
  let t = 0;
  addFX((ctx) => {
    t += 0.06;
    const curX = fromX + (toX - fromX) * t;
    const curY = fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 50;
    ctx.save();
    ctx.fillStyle = '#db2777';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(curX, curY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (t >= 1.0) {
      playChaosGlitchFX(toX, toY);
    }
    return t < 1.0;
  });
}

// ---------------- 8. 성원-타임 (바람 / 시간조작) ----------------
function playAirSlashFX(fromX, fromY, toX, toY) {
  playAfterimageFX(fromX, fromY, toX, toY, '#67e8f9');
  let t = 0;
  addFX((ctx) => {
    t += 0.065;
    const curX = fromX + (toX - fromX) * t;
    const curY = fromY + (toY - fromY) * t;
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4.5;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(curX, curY, 22, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(curX, curY, 20, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();

    ctx.restore();
    return t < 1.0;
  });
}

function playWindFX(x, y) {
  playBuffAuraFX(x, y, '#67e8f9');
  let lines = Array.from({ length: 9 }, () => ({
    x: x + (Math.random() - 0.5) * 75,
    y: y + (Math.random() - 0.5) * 75,
    len: Math.random() * 50 + 25,
    angle: (Math.random() - 0.5) * 0.5 - Math.PI / 4,
    speed: Math.random() * 10 + 8,
    alpha: 1.0
  }));
  addFX((ctx) => {
    ctx.save();
    lines.forEach(l => {
      l.x += Math.cos(l.angle) * l.speed;
      l.y += Math.sin(l.angle) * l.speed;
      l.alpha -= 0.055;
      ctx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0, l.alpha)})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len);
      ctx.stroke();
    });
    ctx.restore();
    return lines.at(0).alpha > 0;
  });
}

function playTimeClockFX(x, y) {
  let frame = 0;
  addFX((ctx) => {
    frame++;
    ctx.save();
    const alpha = Math.max(0, 1 - frame / 22);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.stroke();

    const angle = -(frame * 0.45);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * 26, y + Math.sin(angle) * 26);
    ctx.stroke();
    ctx.restore();
    return frame < 22;
  });
}

// 타격 판정은 playSkillCinematicImpactFX가 받는다. 시전 단계는 적중을 미리 표현하지 않는다.
function skillCinematicDuration(name){return ({'화염방사':1650,'메테오 스트라이크':1300,'오물폭탄':1050,'드레인펀치':850,'사이코 쇼크':1050,'롱레인지 찌르기':880,'벽력일섬':900})[name]||700;}
function cinematicGlow(ctx,x,y,r,color,alpha){
  const gradient=ctx.createRadialGradient(x,y,1,x,y,Math.max(2,r));gradient.addColorStop(0,color);
  gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=gradient;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function playSkillCinematicFX(name,from,to){
  if(!fxCtx||![from.x,from.y,to.x,to.y].every(Number.isFinite))return;
  const duration=skillCinematicDuration(name)-90;
  const start=performance.now(), dx=to.x-from.x,dy=to.y-from.y;
  const violet=name==='오물폭탄',flame=name==='화염방사',rock=name==='메테오 스트라이크';
  const psychic=name==='사이코 쇼크',fist=name==='드레인펀치';
  const electric=name==='롱레인지 찌르기'||name==='벽력일섬';
  const color=violet?'#a855f7':flame?'#ff6b37':rock?'#ffb64e':psychic?'#d8b4fe':fist?'#fb7185':'#fef08a';
  const dust=Array.from({length:fxReducedMotion?7:29},()=>({a:Math.random()*Math.PI*2,d:Math.random()*20,v:1+Math.random()*3,size:1+Math.random()*3}));
  const screen=document.getElementById('battle-screen');
  if(psychic && screen && !fxReducedMotion){
    const enemy=[document.getElementById('player-sprite'),document.getElementById('enemy-sprite')].filter(Boolean).sort((a,b)=>{
      const pa=getSpriteCenter(a.id),pb=getSpriteCenter(b.id);return Math.hypot(pa.x-to.x,pa.y-to.y)-Math.hypot(pb.x-to.x,pb.y-to.y);
    })[0];
    if(enemy){enemy.classList.remove('sprite-space-warp');void enemy.offsetWidth;enemy.classList.add('sprite-space-warp');setTimeout(()=>enemy.classList.remove('sprite-space-warp'),duration);}
  }
  addFX(ctx=>{
    const elapsed=performance.now()-start,t=Math.max(0,Math.min(1,elapsed/duration));
    const travel=Math.min(1,t*(rock?1.08:1.14));
    const px=rock?to.x+90*(1-travel):from.x+dx*travel;
    const py=rock?-80+(to.y+80)*travel:from.y+dy*travel-Math.sin(Math.PI*travel)*(violet?115:fist?27:12);
    ctx.save();ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=fxReducedMotion?0:24;
    if(rock){
      ctx.fillStyle='rgba(4,12,37,'+(Math.sin(Math.PI*Math.min(1,t*1.5))*.82)+')';ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);
      for(let i=0;i<34;i++){const x=(i*137+17)%fxCanvas.width,y=(i*71+23)%155;
        ctx.globalAlpha=Math.max(0,1-t*.8);ctx.fillStyle='#fff';ctx.fillRect(x,y,2,2);}
      ctx.globalAlpha=1;ctx.fillStyle='#6b3325';ctx.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4,r=(i%2?38:46)*(1+.25*t);ctx.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);}ctx.closePath();ctx.fill();
      cinematicGlow(ctx,px,py,75,'#ff8b42',.46);
    }else if(violet){
      const size=18+t*5;cinematicGlow(ctx,px,py,size*2.4,color,.67);
      ctx.fillStyle='#8627ae';ctx.beginPath();ctx.arc(px,py,size,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d8b4fe';ctx.beginPath();ctx.arc(px-6,py-6,size*.31,0,Math.PI*2);ctx.fill();
      for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#a855f7':'#ddd6fe';ctx.beginPath();ctx.arc(px-i*4+(1-t)*10,py+8-i*5+(i%3)*8,2+i%3,0,Math.PI*2);ctx.fill();}
    }else if(flame){
      const grow=Math.min(1,t*4.2);
      const len=Math.max(1,Math.hypot(dx,dy));
      const nx=-dy/len,ny=dx/len;
      const layers=[
        {reach:94,start:17,color:'#ea3d14',alpha:.46,blur:35},
        {reach:68,start:12,color:'#ff8123',alpha:.70,blur:28},
        {reach:37,start:7,color:'#fff1a3',alpha:.94,blur:18}
      ];
      for(const layer of layers){
        ctx.save();ctx.globalAlpha=layer.alpha;ctx.fillStyle=layer.color;
        ctx.shadowColor=layer.color;ctx.shadowBlur=fxReducedMotion?0:layer.blur;
        ctx.beginPath();
        const steps=fxReducedMotion?7:19;
        for(let side=1;side>=-1;side-=2){
          for(let k=0;k<=steps;k++){
            const u=side===1?k/steps:1-k/steps;
            const wave=fxReducedMotion?0:Math.sin(u*22+elapsed*.021+side*2)*(.1+u*.13);
            const spread=(layer.start+(layer.reach-layer.start)*u)*(1+wave);
            const x=from.x+dx*grow*u+nx*spread*side;
            const y=from.y+dy*grow*u+ny*spread*side;
            if(side===1&&k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
        }
        ctx.closePath();ctx.fill();ctx.restore();
      }
      const tipX=from.x+dx*grow,tipY=from.y+dy*grow;
      cinematicGlow(ctx,tipX,tipY,fxReducedMotion?65:112,'#ffb347',.48);
      ctx.save();ctx.globalAlpha=.72;ctx.shadowColor='#ffe3a4';ctx.shadowBlur=fxReducedMotion?0:20;
      for(const bit of dust){
        const u=(t*2+bit.d/23)%1;
        const wide=(11+u*66)*(bit.v/4);
        const side=Math.sin(bit.a*4+elapsed*.016);
        const ex=from.x+dx*u+nx*wide*side;
        const ey=from.y+dy*u+ny*wide*side;
        ctx.fillStyle=bit.d>10?'#ffe5a3':'#ff822a';
        ctx.beginPath();ctx.arc(ex,ey,Math.max(1.5,bit.size*1.65),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }else if(psychic){
      cinematicGlow(ctx,to.x,to.y,81,color,.42);
      for(let i=0;i<6;i++){const r=16+i*16+t*27;ctx.beginPath();ctx.lineWidth=2;
        for(let k=0;k<=48;k++){const a=k*Math.PI/24,warp=Math.sin(a*4+t*9+i)*11;
          const x=to.x+Math.cos(a)*(r+warp),y=to.y+Math.sin(a)*(r*.63+warp);
          if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.globalAlpha=Math.max(.12,(1-t)*.7);ctx.strokeStyle=i%2?'#f0abfc':'#ddd6fe';ctx.stroke();}
      ctx.globalAlpha=1;
    }else if(electric){
      const strike=t>.23;
      ctx.strokeStyle='#fef9c3';ctx.lineWidth=name==='벽력일섬'?8:5;
      if(strike){ctx.globalAlpha=.7+Math.sin(elapsed*.09)*.3;ctx.beginPath();ctx.moveTo(from.x,from.y);
        ctx.lineTo(from.x+dx*.32,from.y-64);ctx.lineTo(to.x-10,to.y-106);ctx.lineTo(to.x+19,to.y-123);ctx.lineTo(to.x,to.y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(to.x-20,-15);ctx.lineTo(to.x+22,to.y-66);ctx.lineTo(to.x-14,to.y-40);ctx.lineTo(to.x,to.y);ctx.stroke();}
      cinematicGlow(ctx,to.x,to.y,58,'#e0f2fe',.3+(Math.sin(elapsed*.07)+1)*.15);
      ctx.fillStyle='rgba(255,255,255,'+(Math.sin(elapsed*.08)>0.4?.08:0)+')';ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);
    }else if(fist){
      ctx.fillStyle='#b91c1c';ctx.beginPath();ctx.arc(px,py,22,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffe4e6';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(px-13+i*9,py-11,6,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#fda4af';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(px,py);ctx.stroke();
      cinematicGlow(ctx,px,py,58,'#fb7185',.4);
    }
    if(!flame&&!psychic){ctx.globalAlpha=Math.max(.18,1-t);
      for(const bit of dust){const x=px+Math.cos(bit.a)*(bit.d+elapsed*.014*bit.v),y=py+Math.sin(bit.a)*(bit.d+elapsed*.01*bit.v);
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,bit.size,0,Math.PI*2);ctx.fill();}}
    ctx.restore();return elapsed<duration;
  });
}
function playSkillCinematicImpactFX(name,to){
  if(!fxCtx)return;
  const start=performance.now(),skull=name==='오물폭탄';
  const col=skull?'#a855f7':name==='메테오 스트라이크'?'#fb923c':name==='드레인펀치'?'#f87171':name==='사이코 쇼크'?'#d8b4fe':name==='화염방사'?'#ff9c42':'#fef08a';
  const sparks=Array.from({length:fxReducedMotion?7:38},()=>({a:Math.random()*Math.PI*2,v:3+Math.random()*8,r:1+Math.random()*4}));
  addFX(ctx=>{
    const elapsed=performance.now()-start,t=Math.min(1,elapsed/850),fade=Math.max(0,1-t);
    ctx.save();ctx.shadowColor=col;ctx.shadowBlur=fxReducedMotion?0:24;ctx.globalAlpha=fade;
    ctx.strokeStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(to.x,to.y+35,12+t*(name==='화염방사'?165:112),5+t*(name==='화염방사'?56:41),0,0,Math.PI*2);ctx.stroke();
    for(const p of sparks){const d=p.v*elapsed/16;
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(to.x+Math.cos(p.a)*d,to.y+Math.sin(p.a)*d,p.r*fade,0,Math.PI*2);ctx.fill();}
    if(skull){
      ctx.fillStyle='#c084fc';ctx.beginPath();ctx.arc(to.x,to.y-9,38,Math.PI,0);ctx.lineTo(to.x+29,to.y+24);ctx.lineTo(to.x-29,to.y+24);ctx.closePath();ctx.fill();
      ctx.fillStyle='#251039';for(const x of [-15,15]){ctx.beginPath();ctx.arc(to.x+x,to.y-7,9,0,Math.PI*2);ctx.fill();}
      ctx.beginPath();ctx.moveTo(to.x,to.y+4);ctx.lineTo(to.x-6,to.y+15);ctx.lineTo(to.x+6,to.y+15);ctx.fill();
      ctx.fillStyle='#e9d5ff';for(let k=-2;k<=2;k++)ctx.fillRect(to.x+k*8-3,to.y+23,6,11);
      ctx.fillStyle='rgba(153,27,209,.44)';ctx.beginPath();ctx.ellipse(to.x,to.y+39,55+t*26,17+t*10,0,0,Math.PI*2);ctx.fill();
    }else if(name==='드레인펀치'){
      ctx.fillStyle='#fff';ctx.font='900 42px system-ui';ctx.textAlign='center';ctx.fillText('✊',to.x,to.y+11);
    }else if(name==='메테오 스트라이크'){
      ctx.fillStyle='rgba(130,70,38,.68)';ctx.beginPath();ctx.ellipse(to.x,to.y+38,42+t*29,13+t*10,0,0,Math.PI*2);ctx.fill();
    }else if(name==='사이코 쇼크'){
      for(let j=0;j<4;j++){ctx.strokeStyle=j%2?'#fff':'#d8b4fe';ctx.beginPath();ctx.ellipse(to.x,to.y,12+t*(40+j*20),9+t*(24+j*10),t*3+j,0,Math.PI*2);ctx.stroke();}
    }
    ctx.restore();return elapsed<850;
  });
}
function playVampiricSiphonFX(from,to){
  const start=performance.now();let bits=Array.from({length:22},(_,i)=>({t:i/22,spread:(Math.random()-.5)*28}));
  addFX(ctx=>{const elapsed=performance.now()-start,t=Math.min(1,elapsed/1080);
    ctx.save();ctx.shadowColor='#f43f5e';ctx.shadowBlur=fxReducedMotion?0:20;
    for(const bit of bits){const u=(t*1.6-bit.t+1)%1;
      const x=from.x+(to.x-from.x)*u,y=from.y+(to.y-from.y)*u-Math.sin(u*Math.PI)*38+bit.spread;
      ctx.fillStyle=bit.t>.5?'#fff1f2':'#f43f5e';ctx.beginPath();ctx.arc(x,y,4+Math.sin(u*Math.PI)*3,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#fb7185';ctx.lineWidth=5;ctx.globalAlpha=Math.max(0,.75-t*.65);
    ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,(from.y+to.y)/2-56,to.x,to.y);ctx.stroke();
    ctx.restore();return elapsed<1080;});
}

// app.js가 호출하는 모든 캐릭터 전용 연출 API를 이 파일에서 함께 제공한다.
const nikaAmbientFX = new Map();
function updateNikaAmbientFX(spriteId, enabled) {
  if (!fxCtx || !spriteId) return;
  let state=nikaAmbientFX.get(spriteId);
  if (!enabled) { if (state) state.enabled=false; return; }
  if (!state) { state={enabled:true,tick:0,draw:null};nikaAmbientFX.set(spriteId,state); }
  state.enabled=true;
  if (state.draw && activeFX.includes(state.draw)) return;
  state.draw=ctx=>{
    if (!state.enabled) return false;
    const sprite=document.getElementById(spriteId);
    if (!sprite || !sprite.classList.contains('sprite-nika')) return false;
    const {x,y}=getSpriteCenter(spriteId),t=state.tick++;
    ctx.save();ctx.shadowColor='#fef08a';ctx.shadowBlur=fxReducedMotion?0:19;
    for(let i=0;i<(fxReducedMotion?3:7);i++){
      const theta=t*.022+i*Math.PI*2/7;
      ctx.globalAlpha=.38+(i%3)*.11;ctx.fillStyle=i%2?'#e2e8f0':'#94a3b8';
      ctx.beginPath();ctx.ellipse(x+Math.cos(theta)*(18+i*3),y-26+Math.sin(theta*2)*9,18,9,0,0,Math.PI*2);ctx.fill();
    }
    if (t%10<6) {ctx.globalAlpha=.92;ctx.strokeStyle='#fef08a';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(x+17,y-22);ctx.lineTo(x-6,y+5);ctx.lineTo(x+11,y);ctx.lineTo(x-9,y+29);ctx.stroke();}
    ctx.restore();return true;
  };
  addFX(state.draw);
}
function playNikaAwakeningFX(point) {
  if (!fxCtx || !point) return;
  const start=performance.now();
  addFX(ctx=>{const t=(performance.now()-start)/960;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.shadowColor='#fef08a';ctx.shadowBlur=fxReducedMotion?0:25;
    ctx.strokeStyle='#fef08a';ctx.lineWidth=5;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(point.x,point.y,24+t*74+i*11,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#fff';ctx.font='900 25px system-ui';ctx.textAlign='center';ctx.fillText('NIKA!',point.x,point.y-55-t*18);
    ctx.restore();return t<1;});
}
function playNikaBoltFX(from,to) {
  if (!fxCtx || !from || !to) return;
  const start=performance.now();
  addFX(ctx=>{const t=(performance.now()-start)/660;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.shadowColor='#facc15';ctx.shadowBlur=fxReducedMotion?0:23;
    ctx.strokeStyle='#fff7aa';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(from.x,from.y-26);
    ctx.lineTo((from.x+to.x)/2,to.y-113);ctx.lineTo(to.x-17,to.y-70);ctx.lineTo(to.x+17,to.y-43);ctx.lineTo(to.x,to.y);ctx.stroke();
    if(t<.17){ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(0,0,fxCanvas.width,fxCanvas.height);}
    ctx.restore();return t<1;});
}
function playClownActionFX(point) {
  if (!fxCtx || !point) return;
  const start=performance.now();
  addFX(ctx=>{const t=(performance.now()-start)/780;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.shadowColor='#f472b6';ctx.shadowBlur=fxReducedMotion?0:17;
    for(let i=0;i<(fxReducedMotion?4:8);i++){
      const ang=i*Math.PI/4+t*3.7,r=16+t*67;
      ctx.save();ctx.translate(point.x+Math.cos(ang)*r,point.y+Math.sin(ang)*r);ctx.rotate(ang+t*7);
      ctx.fillStyle=i%2?'#f9a8d4':'#fff';ctx.fillRect(-6,-10,12,20);
      ctx.strokeStyle='#be185d';ctx.lineWidth=2;ctx.strokeRect(-6,-10,12,20);
      ctx.fillStyle='#be185d';ctx.font='bold 12px serif';ctx.textAlign='center';ctx.fillText(i%2?'♠':'♥',0,4);ctx.restore();
    }
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(point.x,point.y-30,19,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#be185d';ctx.fillRect(point.x-10,point.y-35,5,4);ctx.fillRect(point.x+5,point.y-35,5,4);
    ctx.strokeStyle='#be185d';ctx.beginPath();ctx.arc(point.x,point.y-32,7,0,Math.PI);ctx.stroke();
    ctx.restore();return t<1;});
}
function playTimeActionFX(point,moveName='') {
  if (!fxCtx || !point) return;
  const start=performance.now(),dir=/되감기/.test(moveName)?-1:1;
  addFX(ctx=>{const t=(performance.now()-start)/830;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.strokeStyle='#a5f3fc';ctx.shadowColor='#67e8f9';ctx.shadowBlur=fxReducedMotion?0:18;ctx.lineWidth=2.8;
    for(let j=0;j<2;j++){ctx.beginPath();ctx.arc(point.x,point.y,24+j*15+t*20,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<12;i++){const a=i*Math.PI/6+dir*t*6;ctx.beginPath();
      ctx.moveTo(point.x+Math.cos(a)*31,point.y+Math.sin(a)*31);
      ctx.lineTo(point.x+Math.cos(a)*43,point.y+Math.sin(a)*43);ctx.stroke();}
    ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(point.x,point.y);
    ctx.lineTo(point.x+Math.cos(dir*t*11)*27,point.y+Math.sin(dir*t*11)*27);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 14px system-ui';ctx.textAlign='center';
    ctx.fillText(dir<0?'⟲ REWIND':'⟳ FORWARD',point.x,point.y-54);
    ctx.restore();return t<1;});
}
