
// -------------------------------------------------------------
// NPC AI 의사결정 알고리즘 (안전한 벤치 다중 배열 처리)
// -------------------------------------------------------------

function getNpcChoice(aiTeam, playerTeam, currentSandstorm = 0) {
  const aiMon = aiTeam.lead;
  const playerMon = playerTeam.lead;
  
  // 💡 [버그 수정] 살아있는 벤치 목록을 정확히 인덱싱하여 배열 크래시 원천 방지
  const availableBench = (aiTeam.bench || [])
    .map((mon, idx) => ({ mon, idx }))
    .filter(item => item.mon && !item.mon.fainted);

  if (aiMon.fainted) {
    if (availableBench.length > 0) {
      return { type: 'switch', benchIndex: availableBench[0].idx };
    }
    return { type: 'switch', benchIndex: 0 };
  }

  // 전략적 교체 고려
  if (availableBench.length > 0) {
    if (aiMon.ability === '자가 수복' && (aiMon.hp < aiMon.maxHp * 0.45 || aiMon.poisoned || aiMon.burned || aiMon.paralyzed)) {
      if (Math.random() < 0.65) {
        return { type: 'switch', benchIndex: availableBench[0].idx };
      }
    }

    if (aiMon.hp < aiMon.maxHp * 0.3) {
      for (const b of availableBench) {
        const hasSuperMove = b.mon.moves.some(m => m.role === '공격' && getEffectiveness(m.type, playerMon.type) >= 2.0);
        if (hasSuperMove && Math.random() < 0.5) {
          return { type: 'switch', benchIndex: b.idx };
        }
      }
    }
  }

  // 기술 선택 점수 산출
  let bestIdx = 0;
  let highestScore = -9999;
  const isTaunted = (aiMon.tauntedTurns > 0);

  aiMon.moves.forEach((move, idx) => {
    if (move.isPassiveFaint) return;
    if (isTaunted && move.role !== '공격') return;

    let score = 0;
    if (move.role === '방어') {
      if (aiMon.protectCount > 0) score = -80;
      else score = 25 + Math.random() * 20;
    } else if (move.role === '공격') {
      const eff = getEffectiveness(move.type, playerMon.type);
      const stab = (aiMon.type === move.type) ? 1.4 : 1.0;
      const isPhysical = (move.category === '물리');
      const atkVal = getStat(aiMon, isPhysical ? 'atk' : 'spa', currentSandstorm);
      const defVal = getStat(playerMon, isPhysical ? 'def' : 'spd', currentSandstorm);
      let estDmg = (move.pwr * (atkVal / Math.max(1, defVal))) * eff * stab;

      score = estDmg;
      if (estDmg >= playerMon.hp) score += 200; // 결정타 우선
      if (move.drain && aiMon.hp < aiMon.maxHp * 0.6) score += 40;
    } else {
      if (move.reflector && aiMon.reflectTurns <= 0) score = 70;
      else if (move.haze && Object.values(playerMon.stages).some(v => v > 0)) score = 75;
      else if (move.taunt && playerMon.tauntedTurns <= 0) score = 65;
      else if (move.paralyze100 && !playerMon.paralyzed) score = 60;
      else if (move.burn100 && !playerMon.burned) score = 60;
      else if (move.leechSeed && !playerMon.seeded) score = 55;
      else if (move.sandstorm && currentSandstorm <= 0) score = 50;
      else score = 30;
    }

    score += (Math.random() * 10 - 5);
    if (score > highestScore) {
      highestScore = score;
      bestIdx = idx;
    }
  });

  return { type: 'move', moveIndex: bestIdx };
}

// Temporary source-guarded patch for the original battle engine.
(() => {
  'use strict';
  try {
    const boon = POKEDEX.boingo, ability = boon.abilityDesc;
    const leap = boon.moves[1], prophecy = boon.moves[2];
    if (!ability.includes('최대 체력의 10%') || leap.boostSpa !== 2 ||
        prophecy.boostDef !== 2 || prophecy.boostSpd !== 2 ||
        !leap.desc.includes('특수공격 2랭크') || !prophecy.desc.includes('방어/특방 2랭크'))
      throw new Error('보인고 데이터가 예상과 다릅니다.');
    let code = Function.prototype.toString.call(window.calculateTurnEvents);
    for (const [before, after] of [
      ['Math.floor(targetMon.maxHp * 0.10)', 'Math.floor(targetMon.maxHp * 0.07)'],
      ['10%(-${fixedDmg})', '7%(-${fixedDmg})'],
      ['activeMon.vulnerableTurns = 1;', 'activeMon.vulnerableTurns = 2;'],
      ["if (move.boostSpa && activeMon.id === 'boingo') {",
       "if (move.boostSpa && activeMon.id === 'boingo' && activeMon.boingoSpaBuffTurns <= 0) {"],
      ["if (move.boostDef && activeMon.id === 'boingo') {",
       "const firstBoingoDefenseBoost = activeMon.boingoDefSpdBuffTurns <= 0;\n    if (move.boostDef && activeMon.id === 'boingo' && firstBoingoDefenseBoost) {"],
      ["if (move.boostSpd && activeMon.id === 'boingo') {",
       "if (move.boostSpd && activeMon.id === 'boingo' && firstBoingoDefenseBoost) {"],
      ['mon.stages.spa = Math.max(-6, (mon.stages.spa || 0) - 2);',
       'mon.stages.spa = Math.max(-6, (mon.stages.spa || 0) - 1.5);'],
      ['mon.stages.def = Math.max(-6, (mon.stages.def || 0) - 2);',
       'mon.stages.def = Math.max(-6, (mon.stages.def || 0) - 1.5);'],
      ['mon.stages.spd = Math.max(-6, (mon.stages.spd || 0) - 2);',
       'mon.stages.spd = Math.max(-6, (mon.stages.spd || 0) - 1.5);'],
      ["stat: 'spa', amount: -2, msg: `⏳ 보인고오슬우의 특수공격 버프 만료 (-2랭크)`",
       "stat: 'spa', amount: -1.5, msg: `⏳ 보인고오슬우의 특수공격 버프 만료 (-1.5랭크)`"],
      ["stat: 'def', amount: -2, msg: `⏳ 보인고오슬우의 방어/특수방어 버프 만료 (-2랭크)`",
       "stat: 'def', amount: -1.5, msg: `⏳ 보인고오슬우의 방어/특수방어 버프 만료 (-1.5랭크)`"],
      ['targetMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };',
       'targetMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };\n        for (const buffMon of [activeMon, targetMon]) { buffMon.boingoSpaBuffTurns = 0; buffMon.boingoDefSpdBuffTurns = 0; }']
    ]) {
      if (code.split(before).length !== 2) throw new Error(`엔진 변경 지점을 찾지 못했습니다: ${before}`);
      code = code.replace(before, after);
    }
    const revised = new Function(`return (${code})`)();
    window.calculateTurnEvents = revised;
    boon.abilityDesc = ability.replace('최대 체력의 10%', '최대 체력의 7%');
    leap.boostSpa = 1.5; leap.desc = leap.desc.replace('특수공격 2랭크', '특수공격 1.5랭크');
    prophecy.boostDef = 1.5; prophecy.boostSpd = 1.5;
    prophecy.desc = prophecy.desc.replace('방어/특방 2랭크', '방어/특방 1.5랭크');
  } catch (error) {
    console.error('보인고 밸런스 패치 실패: 원본 엔진을 유지합니다.', error);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const play = window.playTurnEvents;
    if (typeof play === 'function') window.playTurnEvents = function(events) {
      const visible = Array.isArray(events) ? events.map(event =>
        ['status_force_random', 'status_force_random_trigger'].includes(event?.type)
          ? {...event, type:'msg'} : event) : events;
      return play.call(this, visible);
    };
    const badges = window.renderHudBadges;
    if (typeof badges === 'function') window.renderHudBadges = function(containerId, mon) {
      const result = badges.apply(this, arguments);
      if (mon?.isForceRandom && !mon.fainted) {
        const root = document.getElementById(containerId);
        if (root) {
          const tag = document.createElement('span');
          tag.className = 'mini-badge debuff';
          tag.textContent = '다음 기술 무작위';
          root.append(tag);
        }
      }
      return result;
    };
    const commands = window.enableCommands;
    if (typeof commands === 'function') window.enableCommands = function(enabled) {
      const result = commands.apply(this, arguments);
      if (enabled && typeof myTeam !== 'undefined' && myTeam?.lead?.isForceRandom) {
        const indicator = document.getElementById('cmd-status-indicator');
        if (indicator) indicator.textContent = '다음 기술 무작위 · 교체 가능';
      }
      return result;
    };
  }, {once:true});
})();
