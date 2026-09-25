
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
