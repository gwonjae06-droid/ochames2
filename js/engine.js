
// -------------------------------------------------------------
// 포켓몬 룰 기반 연산 엔진 (보슬우 랭크업 버그 수정 및 격리)
// -------------------------------------------------------------

function getEffectiveness(atkType, defType) {
  if (typeof TYPE_CHART !== 'undefined' && TYPE_CHART[atkType] && TYPE_CHART[atkType][defType] !== undefined) {
    return TYPE_CHART[atkType][defType];
  }
  return 1.0;
}

function buildMon(id, formMode = null) {
  const base = POKEDEX[id];
  let initialSpe = base.spe;
  if (id === 'sungwon_time') {
    const mode = formMode || (Math.random() < 0.5 ? 'low' : 'high');
    if (mode === 'low') {
      initialSpe = Math.floor(Math.random() * 50) + 30;
    } else {
      initialSpe = Math.floor(Math.random() * 50) + 121;
    }
  }

  return {
    id: base.id,
    name: base.name,
    type: base.type,
    color: base.color,
    ability: base.ability,
    abilityDesc: base.abilityDesc,
    maxHp: base.hp,
    hp: base.hp,
    atk: base.atk,
    def: base.def,
    spa: base.spa,
    spd: base.spd,
    spe: initialSpe,
    moves: base.moves,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    protectCount: 0,
    protectActive: false,
    charged: false,
    reflectTurns: 0,
    poisoned: false,
    burned: false,
    paralyzed: false,
    flinched: false,
    seeded: false,
    tauntedTurns: 0,
    fainted: false,
    lastMoveIndex: null,
    hasGuaranteedPrio: false,
    isForceRandom: false,
    vulnerableMult: 1.0,
    vulnerableTurns: 0,
    battery: 0,
    rewindActive: false,
    overchargeBuffTurns: 0,
    overchargeBuffAmount: 0,
    revivedOnce: false,
    futureDecayingAtkBuff: 0,
    boingoSpaBuffTurns: 0,
    boingoDefSpdBuffTurns: 0,
    nikaTurns: 0
  };
}

function getStat(mon, statKey, sandstormTurns = 0) {
  let base = mon[statKey];
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

  if (statKey === 'atk' && mon.burned) mult *= 0.5; // 화상: 물리 공격력 50% 반감
  if (statKey === 'spe' && mon.paralyzed) mult *= 0.7; // 마비: 스피드 감소
  if (statKey === 'spd' && sandstormTurns > 0 && mon.type === '바위') mult *= 1.3; // 모래바람 특방 보정

  return Math.floor(base * mult);
}

function calculateTurnEvents(c1, c2, p1Team, p2Team, currentTurn, sandstorm) {
  const events = [];
  const simP1 = JSON.parse(JSON.stringify(p1Team));
  const simP2 = JSON.parse(JSON.stringify(p2Team));

  const p1Mon = simP1.lead;
  const p2Mon = simP2.lead;

  const chooseUsableMoveIndex = (mon) => {
    const usable = mon.moves
      .map((move, index) => ({ move, index }))
      .filter(({ move }) => !move.isPassiveFaint);
    return usable.length ? usable[Math.floor(Math.random() * usable.length)].index : 0;
  };

  if (p1Mon.isForceRandom && c1.type === 'move') {
    c1.moveIndex = chooseUsableMoveIndex(p1Mon);
    events.push({ 
      type: 'status_force_random_trigger', side: 'p1', moveIndex: c1.moveIndex,
      msg: `${p1Mon.name}은(는) 광기의 예언에 휩싸여 무작위 기술을 강제 사용한다!` 
    });
    p1Mon.isForceRandom = false;
  }
  if (p2Mon.isForceRandom && c2.type === 'move') {
    c2.moveIndex = chooseUsableMoveIndex(p2Mon);
    events.push({ 
      type: 'status_force_random_trigger', side: 'p2', moveIndex: c2.moveIndex,
      msg: `${p2Mon.name}은(는) 광기의 예언에 휩싸여 무작위 기술을 강제 사용한다!` 
    });
    p2Mon.isForceRandom = false;
  }

  events.push({ type: 'turnStart', turnNum: currentTurn, msg: `--- [ 제 ${currentTurn} 턴 ] ---` });

  const getPriority = (c, mon) => {
    if (c.type === 'switch') return 10;
    const m = mon.moves[c.moveIndex];
    if (m && m.isSkill2 && getStat(mon, 'spe', sandstorm) < 100) return 15;
    if (m && m.protect) return 4;
    if (mon.id === 'lee' && mon.nikaTurns > 0 && c.moveIndex === 1) return 2;
    return (m ? m.priority : 0) || 0;
  };

  const prio1 = getPriority(c1, p1Mon);
  const prio2 = getPriority(c2, p2Mon);

  let p1GoesFirst = true;
  if (prio1 !== prio2) {
    p1GoesFirst = (prio1 > prio2);
  } else {
    const spe1 = getStat(p1Mon, 'spe', sandstorm);
    const spe2 = getStat(p2Mon, 'spe', sandstorm);
    p1GoesFirst = (spe1 === spe2) ? (Math.random() < 0.5) : (spe1 > spe2);
  }

  const firstActor = p1GoesFirst ? { side: 'p1', choice: c1 } : { side: 'p2', choice: c2 };
  const secondActor = p1GoesFirst ? { side: 'p2', choice: c2 } : { side: 'p1', choice: c1 };

  function executeAction(actor, targetSide) {
    const isP1 = (actor.side === 'p1');
    const currentTeam = isP1 ? simP1 : simP2;
    const enemyTeam = isP1 ? simP2 : simP1;

    // 교체 (Switch) 커맨드
    if (actor.choice.type === 'switch') {
      const oldMon = currentTeam.lead;
      const bIdx = (actor.choice.benchIndex !== undefined) ? actor.choice.benchIndex : 0;
      const newMon = currentTeam.bench.at(bIdx);

      if (!newMon || newMon.fainted) return;

      if (oldMon.ability === '자가 수복' && !oldMon.fainted) {
        const heal = Math.floor(oldMon.maxHp * 0.30);
        oldMon.hp = Math.min(oldMon.maxHp, oldMon.hp + heal);
        oldMon.poisoned = false; oldMon.burned = false; oldMon.paralyzed = false; oldMon.seeded = false;
        events.push({ 
          type: 'bench_heal', side: actor.side, benchIndex: bIdx, hp: oldMon.hp, 
          msg: `${oldMon.name}의 특성 [자가 수복]! 체력 30% 회복 및 상태이상 완치!` 
        });
      }

      // 💡 [버그 완벽 수정] 교체 시 보인고오슬우의 버프(방어 랭업 등)가 배서준 등 후속 포켓몬에게 절대 전이되지 않도록 분리 및 초기화
      oldMon.lastMoveIndex = null;
      oldMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      oldMon.boingoDefSpdBuffTurns = 0;
      oldMon.boingoSpaBuffTurns = 0;
      oldMon.overchargeBuffTurns = 0;
      oldMon.overchargeBuffAmount = 0;
      oldMon.nikaTurns = 0;
      oldMon.rewindActive = false;
      oldMon.protectActive = false;
      oldMon.vulnerableTurns = 0;
      oldMon.vulnerableMult = 1.0;
      oldMon.reflectTurns = 0;
      oldMon.isForceRandom = false;

      newMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      newMon.boingoDefSpdBuffTurns = 0;
      newMon.boingoSpaBuffTurns = 0;
      newMon.overchargeBuffTurns = 0;
      newMon.overchargeBuffAmount = 0;
      newMon.nikaTurns = 0;
      newMon.rewindActive = false;
      newMon.vulnerableTurns = 0;
      newMon.vulnerableMult = 1.0;
      newMon.protectActive = false;
      newMon.protectCount = 0;
      newMon.charged = false;
      newMon.tauntedTurns = 0;
      newMon.reflectTurns = 0;
      newMon.isForceRandom = false;

      currentTeam.lead = newMon;
      currentTeam.bench[bIdx] = oldMon;

      events.push({
        type: 'switch', side: actor.side, benchIndex: bIdx,
        newLeadId: newMon.id, newBenchId: oldMon.id,
        msg: `${oldMon.name}, 돌아와라! 가라, ${newMon.name}!` 
      });

      if (newMon.ability === '위협') {
        const opposing = enemyTeam.lead;
        if (opposing.ability === '엄마없음') {
          events.push({ type: 'msg', msg: `${opposing.name}의 특성 [엄마없음]! 공격력이 떨어지지 않는다!` });
        } else {
          opposing.stages.atk = Math.max(-6, (opposing.stages.atk || 0) - 1);
          events.push({ type: 'debuff', side: targetSide, stat: 'atk', amount: -1, msg: `${newMon.name}의 [위협]! ${opposing.name}의 공격력이 떨어졌다!` });
        }
      }
      return;
    }

    const activeMon = currentTeam.lead;
    const targetMon = enemyTeam.lead;

    if (activeMon.fainted) return;

    if (activeMon.paralyzed && Math.random() < 0.25) {
      events.push({ type: 'msg', msg: `⚡ ${activeMon.name}은(는) 몸이 저려서 기술을 쓸 수 없다!` });
      return;
    }

    if (activeMon.flinched) {
      activeMon.flinched = false;
      events.push({ type: 'msg', msg: `💥 ${activeMon.name}은(는) 풀이 죽어 움직일 수 없었다!` });
      return;
    }

    const moveIndex = Number(actor.choice.moveIndex);
    const baseMove = Number.isInteger(moveIndex) && moveIndex >= 0 ? activeMon.moves[moveIndex] : null;
    if (!baseMove || baseMove.isPassiveFaint) { events.push({type:'msg',msg:'선택할 수 없는 기술이다!'}); return; }
    if (activeMon.tauntedTurns > 0 && (baseMove.role === '변화' || baseMove.role === '방어' || baseMove.isSkill2 && getStat(activeMon,'spe',sandstorm) < 100 || baseMove.isSkill3 && getStat(activeMon,'spe',sandstorm) < 100)) {
      events.push({type:'msg',msg:`${activeMon.name}은(는) 도발 때문에 기술을 사용할 수 없다!`}); return;
    }
    if (activeMon.id === 'lee') {
      if (activeMon.nikaTurns === 0 && activeMon.stages.spe < 6) {
        activeMon.stages.spe++;
        events.push({type:'buff',side:actor.side,stat:'spe',amount:1,msg:`⚡ ${activeMon.name}의 기술 가속! 스피드 +1 (현재 ${activeMon.stages.spe})`});
      }
      if (activeMon.nikaTurns === 0 && activeMon.stages.spe >= 3) {
        activeMon.nikaTurns = 3;
        const awakeningCost=Math.min(Math.max(0,activeMon.hp-1),Math.max(1,Math.floor(activeMon.maxHp*.05)));
        activeMon.hp-=awakeningCost;
        events.push({type:'nika_start',side:actor.side,turns:3,msg:`⚡☁️ ${activeMon.name}이(가) 니카 모드에 진입했다! (이번 턴 포함 3턴, 각성 체력 -${awakeningCost})`});
        if(awakeningCost>0)events.push({type:'damage',targetSide:actor.side,actorSide:actor.side,actorName:activeMon.name,targetName:activeMon.name,moveName:'니카 각성 대가',moveType:'특성',dmg:awakeningCost,targetHp:activeMon.hp,targetMaxHp:activeMon.maxHp,isCrit:false,effectiveness:1,msg:`${activeMon.name}의 니카 각성 대가! HP -${awakeningCost}`});
      }
      if (activeMon.nikaTurns > 0) events.push({type:'nika_action',side:actor.side,msg:`🥁 ${activeMon.name}의 니카 — 번개와 북소리!`});
    }
    const move = activeMon.id === 'lee' && moveIndex === 1 && activeMon.nikaTurns > 0
      ? {...baseMove, name:'벽력일섬', pwr:86, priority:2, paralyzeChance:0, flinchChance:0.15} : baseMove;
    events.push({ 
      type: 'move_announce', 
      side: actor.side, 
      targetSide: targetSide,
      moveName: move.name,
      msg: `${activeMon.name}의 ${move.name}!` 
    });

    // 보인고오슬우 [만화예언] 고정 피해 연계
    if (activeMon.ability === '만화예언' && activeMon.lastMoveIndex !== null && activeMon.lastMoveIndex !== actor.choice.moveIndex) {
      const fixedDmg = Math.max(1, Math.floor(targetMon.maxHp * 0.10));
      targetMon.hp = Math.max(0, targetMon.hp - fixedDmg);
      events.push({
        type: 'damage', targetSide, actorSide: actor.side, actorName: activeMon.name,
        targetName: targetMon.name, moveName: '만화예언 (연계)', moveType: '특성',
        dmg: fixedDmg, targetHp: targetMon.hp, targetMaxHp: targetMon.maxHp,
        isCrit: false, effectiveness: 1.0
      });
      events.push({ type: 'msg', msg: `🎨 [만화예언] 새로운 기술 연계! ${targetMon.name}에게 10%(-${fixedDmg}) 고정 피해!` });
      if (targetMon.hp <= 0) {
        handleFaint(targetMon, targetSide, activeMon, actor.side);
        return;
      }
    }

    activeMon.lastMoveIndex = actor.choice.moveIndex;
    events.push({ type: 'record_last_move', side: actor.side, moveIndex: actor.choice.moveIndex });

    // 성원-타임 기믹 처리
    if (move.isPaceControl) {
      const prevSpe = getStat(activeMon, 'spe', sandstorm);
      activeMon.spe = prevSpe >= 100 ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 50) + 121;
      events.push({ type: 'speed_change', side: actor.side, newSpe: activeMon.spe, msg: `🌀 페이스 조절로 속도가 [${activeMon.spe}](으)로 전환되었다!` });
      return;
    }

    if (move.isSkill2) {
      const curSpe = getStat(activeMon, 'spe', sandstorm);
      if (curSpe < 100) {
        activeMon.rewindActive = true;
        events.push({ type: 'msg', msg: `[되감기] 이번 턴 받는 피해가 50% 감소하고 배터리를 충전합니다!` });
        return;
      } else {
        const eff = getEffectiveness('바람', targetMon.type);
        const dmg = Math.floor(55 * eff);
        targetMon.hp = Math.max(0, targetMon.hp - dmg);
        if (!targetMon.paralyzed && targetMon.type !== '전기') targetMon.paralyzed = true;
        events.push({
          type: 'damage', targetSide, actorSide: actor.side, actorName: activeMon.name,
          targetName: targetMon.name, moveName: '빨리감기', moveType: '바람',
          dmg, targetHp: targetMon.hp, targetMaxHp: targetMon.maxHp, isCrit: false, effectiveness: eff
        });
        events.push({ type: 'msg', msg: `[빨리감기] 상대를 마비 상태로 만들었다!` });
        if (targetMon.hp <= 0) handleFaint(targetMon, targetSide, activeMon, actor.side);
        return;
      }
    }

    if (move.isSkill3) {
      const curSpe = getStat(activeMon, 'spe', sandstorm);
      if (curSpe < 100) {
        const buff = Math.floor((activeMon.battery || 0) / 10);
        activeMon.battery = 0;
        if (buff > 0) {
          activeMon.stages.atk = Math.min(6, (activeMon.stages.atk || 0) + buff);
          activeMon.stages.spe = Math.min(6, (activeMon.stages.spe || 0) + buff);
          activeMon.overchargeBuffTurns = 2;
          activeMon.overchargeBuffAmount = buff;
          events.push({ type: 'buff', side: actor.side, stat: 'atk', amount: buff, msg: `[오버차지] 공/스피드 +${buff}랭크 상승!` });
        }
        activeMon.spe = Math.floor(Math.random() * 50) + 121;
        events.push({ type: 'speed_change', side: actor.side, newSpe: activeMon.spe, msg: `속도가 고속으로 전환되었다!` });
        return;
      } else {
        const eff = getEffectiveness('바람', targetMon.type);
        let atkStat = getStat(activeMon, 'atk', sandstorm);
        let defStat = getStat(targetMon, 'def', sandstorm);
        let baseDmg = (((18 * 100 * (atkStat / defStat)) / 50) + 4);
        let finalDmg = Math.max(1, Math.floor(baseDmg * eff * 1.4 * (targetMon.reflectTurns > 0 ? 0.6 : 1.0) * (targetMon.rewindActive ? 0.5 : 1.0)));
        targetMon.hp = Math.max(0, targetMon.hp - finalDmg);
        const recoil = Math.max(1, Math.floor(finalDmg * 0.35));
        activeMon.hp = Math.max(0, activeMon.hp - recoil);

        events.push({
          type: 'damage', targetSide, actorSide: actor.side, actorName: activeMon.name,
          targetName: targetMon.name, moveName: '작용반작용', moveType: '바람',
          dmg: finalDmg, targetHp: targetMon.hp, targetMaxHp: targetMon.maxHp, isCrit: false, effectiveness: eff
        });
        events.push({
          type: 'damage', targetSide: actor.side, actorSide: actor.side, actorName: activeMon.name,
          targetName: activeMon.name, moveName: '반동', moveType: '바람',
          dmg: recoil, targetHp: activeMon.hp, targetMaxHp: activeMon.maxHp, isCrit: false, effectiveness: 1.0
        });
        if (targetMon.hp <= 0) handleFaint(targetMon, targetSide, activeMon, actor.side);
        if (activeMon.hp <= 0) handleFaint(activeMon, actor.side, targetMon, targetSide);
        return;
      }
    }

    if (move.protect) {
      let successRate = 1.0;
      if (activeMon.protectCount === 1) successRate = 0.33;
      else if (activeMon.protectCount >= 2) successRate = 0.10;

      if (Math.random() <= successRate) {
        activeMon.protectActive = true;
        activeMon.protectCount++;
        events.push({ type: 'protect', side: actor.side, msg: `${activeMon.name}은(는) 완벽한 방어 태세를 취했다!` });
      } else {
        activeMon.protectActive = false;
        activeMon.protectCount = 0;
        events.push({ type: 'msg', msg: '그러나 방어에 실패했다!' });
      }
      return;
    }

    activeMon.protectCount = 0;

    if (Math.random() * 100 > move.acc) {
      events.push({ type: 'msg', msg: '그러나 공격은 빗나갔다!' });
      return;
    }

    if (targetMon.protectActive) {
      events.push({ type: 'protect', side: targetSide, msg: `${targetMon.name}은(는) 공격을 완전히 막아냈다!` });
      return;
    }

    if (move.benchDmg && enemyTeam.bench && enemyTeam.bench.length > 0) {
      enemyTeam.bench.forEach((bMon, bIdx) => {
        if (bMon && !bMon.fainted) {
          bMon.hp = Math.max(0, bMon.hp - move.benchDmg);
          events.push({
            type: 'bench_damage', side: targetSide, benchIndex: bIdx, benchHp: bMon.hp,
            msg: `💥 [스플래시] 적 벤치의 ${bMon.name}에게도 -${move.benchDmg} 피해!`
          });
          if (bMon.hp <= 0) bMon.fainted = true;
        }
      });
    }

    // 💡 [버그 수정] 보인고오슬우 본인일 때만 해당 버프 턴 및 랭크업 적용
    if (move.boostSpa && activeMon.id === 'boingo') {
      activeMon.stages.spa = Math.min(6, (activeMon.stages.spa || 0) + move.boostSpa);
      activeMon.boingoSpaBuffTurns = 2;
      events.push({ type: 'buff', side: actor.side, stat: 'spa', amount: move.boostSpa, msg: `특수공격이 ${move.boostSpa}랭크 상승했다! (2턴)` });
    }
    if (move.boostDef && activeMon.id === 'boingo') {
      activeMon.stages.def = Math.min(6, (activeMon.stages.def || 0) + move.boostDef);
      activeMon.boingoDefSpdBuffTurns = 2;
      events.push({ type: 'buff', side: actor.side, stat: 'def', amount: move.boostDef, msg: `방어가 ${move.boostDef}랭크 상승했다! (2턴)` });
    }
    if (move.boostSpd && activeMon.id === 'boingo') {
      activeMon.stages.spd = Math.min(6, (activeMon.stages.spd || 0) + move.boostSpd);
      activeMon.boingoDefSpdBuffTurns = 2;
      events.push({ type: 'buff', side: actor.side, stat: 'spd', amount: move.boostSpd, msg: `특수방어가 ${move.boostSpd}랭크 상승했다! (2턴)` });
    }
    if (move.forceRandomMove) {
      targetMon.isForceRandom = true;
      events.push({ type: 'status_force_random', side: targetSide, msg: `🌀 다음 턴 ${targetMon.name}은(는) 무작위 기술을 강제 사용한다!` });
    }
    if (move.selfVulnerable) {
      activeMon.vulnerableMult = move.selfVulnerable;
      activeMon.vulnerableTurns = 1;
      events.push({ type: 'msg', msg: `⚠️ 다음 턴 자신이 받는 피해가 ${move.selfVulnerable}배로 증가한다!` });
    }

    if (move.role === '변화') {
      if (move.boostAtk) {
        activeMon.stages.atk = Math.min(6, (activeMon.stages.atk || 0) + move.boostAtk);
        events.push({ type: 'buff', side: actor.side, stat: 'atk', amount: move.boostAtk, msg: `${activeMon.name}의 공격력이 상승했다!` });
      }
      if (move.boostDef) {
        activeMon.stages.def = Math.min(6, (activeMon.stages.def || 0) + move.boostDef);
        events.push({ type: 'buff', side: actor.side, stat: 'def', amount: move.boostDef, msg: `${activeMon.name}의 방어력이 상승했다!` });
      }
      if (move.boostSpd) {
        activeMon.stages.spd = Math.min(6, (activeMon.stages.spd || 0) + move.boostSpd);
        events.push({ type: 'buff', side: actor.side, stat: 'spd', amount: move.boostSpd, msg: `${activeMon.name}의 특수방어가 상승했다!` });
      }
      if (move.dropEnemyAtk) {
        if (targetMon.ability === '엄마없음') {
          events.push({ type: 'msg', msg: `${targetMon.name}의 특성 [엄마없음]! 공격력이 떨어지지 않는다!` });
        } else {
          targetMon.stages.atk = Math.max(-6, (targetMon.stages.atk || 0) - move.dropEnemyAtk);
          events.push({ type: 'debuff', side: targetSide, stat: 'atk', amount: -move.dropEnemyAtk, msg: `${targetMon.name}의 공격력이 떨어졌다!` });
        }
      }
      if (move.dropEnemySpa) {
        if (targetMon.ability === '엄마없음') {
          events.push({ type: 'msg', msg: `${targetMon.name}의 특성 [엄마없음]! 특수공격력이 떨어지지 않는다!` });
        } else {
          targetMon.stages.spa = Math.max(-6, (targetMon.stages.spa || 0) - move.dropEnemySpa);
          events.push({ type: 'debuff', side: targetSide, stat: 'spa', amount: -move.dropEnemySpa, msg: `${targetMon.name}의 특수공격력이 떨어졌다!` });
        }
      }
      if (move.charge) {
        activeMon.charged = true;
        events.push({ type: 'buff', side: actor.side, msg: `${activeMon.name}은(는) 전기를 충전했다!` });
      }
      if (move.reflector) {
        activeMon.reflectTurns = move.reflector;
        events.push({ type: 'buff', side: actor.side, msg: `리플렉트 실드 발동! 데미지 경감 장막 생성!` });
      }
      if (move.haze) {
        activeMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        targetMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        events.push({ type: 'haze', side: actor.side, msg: `[흑안개] 모든 랭크 변화가 초기화되었다!` });
      }
      if (move.taunt) {
        targetMon.tauntedTurns = move.taunt;
        events.push({ type: 'debuff', side: targetSide, msg: `${targetMon.name}은(는) 도발당했다!` });
      }
      if (move.leechSeed) {
        targetMon.seeded = true;
        events.push({ type: 'debuff', side: targetSide, msg: `${targetMon.name}에게 기생독의 씨가 뿌려졌다!` });
      }
      if (move.paralyze100) {
        if (!targetMon.paralyzed && targetMon.type !== '전기') {
          targetMon.paralyzed = true;
          events.push({ type: 'debuff', side: targetSide, status: 'paralyzed', msg: `${targetMon.name}은(는) 마비되었다!` });
        } else events.push({ type: 'msg', msg: '효과가 없었다!' });
      }
      if (move.burn100) {
        if (!targetMon.burned && targetMon.type !== '불꽃') {
          targetMon.burned = true;
          events.push({ type: 'debuff', side: targetSide, status: 'burned', msg: `${targetMon.name}은(는) 화상을 입었다!` });
        } else events.push({ type: 'msg', msg: '효과가 없었다!' });
      }
      if (move.sandstorm) {
        events.push({ type: 'sandstorm_trigger', turns: move.sandstorm, side: actor.side, msg: '모래바람이 거세게 몰아친다!' });
      }
      if (move.gacha) {
        const isWin = (Math.random() < 0.5);
        if (isWin) {
          activeMon.stages.spa = Math.min(6, (activeMon.stages.spa || 0) + 2);
          activeMon.stages.spe = Math.min(6, (activeMon.stages.spe || 0) + 2);
          events.push({ type: 'buff', side: actor.side, stat: 'spa', amount: 2, isGachaWin: true, msg: '대박! 특수공격과 스피드가 2랭크 상승했다!' });
        } else {
          activeMon.stages.spa = Math.max(-6, (activeMon.stages.spa || 0) - 1);
          activeMon.stages.spe = Math.max(-6, (activeMon.stages.spe || 0) - 1);
          events.push({ type: 'debuff', side: actor.side, stat: 'spa', amount: -1, isGachaFail: true, msg: '꽝... 특수공격과 스피드가 1랭크 하락했다!' });
        }
      }
      return;
    }

    const effectiveness = getEffectiveness(move.type, targetMon.type);
    const isPhysical = (move.category === '물리');
    const atkStat = getStat(activeMon, isPhysical ? 'atk' : 'spa', sandstorm);
    const defStat = getStat(targetMon, isPhysical ? 'def' : 'spd', sandstorm);

    const stab = (activeMon.type === move.type) ? 1.4 : 1.0;
    const chargeMult = activeMon.charged ? 1.35 : 1.0;
    activeMon.charged = false;

    let abilityBoost = 1.0;
    if (activeMon.ability === '흡혈귀' && activeMon.hp <= activeMon.maxHp * 0.5) abilityBoost *= 1.2;
    if (activeMon.ability.includes('맹화') && activeMon.hp <= activeMon.maxHp * 0.35 && move.type === '불꽃') abilityBoost *= 1.3;

    let speedBonusDmg = 0;
    if (activeMon.ability === '가속 상대성') {
      const realSpe = getStat(activeMon, 'spe', sandstorm);
      if (realSpe > 100) speedBonusDmg = Math.floor((realSpe - 100) * 0.5);
    }

    const isCrit = Math.random() < (activeMon.ability.includes('맹화') && activeMon.hp <= activeMon.maxHp * 0.35 ? 0.20 : 0.08);
    const reflectMult = (targetMon.reflectTurns > 0) ? 0.6 : 1.0;
    const vulnMult = targetMon.vulnerableMult || 1.0;
    const rewindMult = targetMon.rewindActive ? 0.5 : 1.0;

    let baseDmg = (((18 * move.pwr * (atkStat / Math.max(1, defStat))) / 50) + 4);
    let finalDmg = Math.max(1, Math.floor(
      (baseDmg * effectiveness * stab * chargeMult * abilityBoost * reflectMult * vulnMult * rewindMult * (isCrit ? 1.4 : 1.0) * (0.88 + Math.random() * 0.12)) + speedBonusDmg
    ));

    targetMon.hp = Math.max(0, targetMon.hp - finalDmg);

    if (targetMon.rewindActive) {
      const chargeAmt = Math.min(100 - (targetMon.battery || 0), finalDmg * 2);
      targetMon.battery = Math.min(100, (targetMon.battery || 0) + chargeAmt);
      events.push({ type: 'battery_charge', side: targetSide, currentBattery: targetMon.battery, msg: `[되감기] 피해 경감 및 배터리 충전!` });
    }

    events.push({
      type: 'damage', targetSide, actorSide: actor.side, actorName: activeMon.name,
      targetName: targetMon.name, moveName: move.name, moveType: move.type,
      dmg: finalDmg, targetHp: targetMon.hp, targetMaxHp: targetMon.maxHp,
      isCrit, effectiveness
    });

    if (isCrit) {
      events.push({ type: 'msg', msg: '💥 급소에 맞았다!' });
    }
    if (effectiveness >= 2.0) {
      events.push({ type: 'msg', msg: '🔥 효과가 굉장했다!' });
    } else if (effectiveness <= 0.5) {
      events.push({ type: 'msg', msg: '🛡️ 효과가 별로인 듯하다...' });
    }

    // 흡혈
    let totalDrainRatio = 0;
    if (move.drain) totalDrainRatio += move.drain;
    if (activeMon.ability === '흡혈귀') totalDrainRatio += 0.15;

    if (totalDrainRatio > 0 && !activeMon.fainted) {
      const healAmt = Math.max(1, Math.floor(finalDmg * totalDrainRatio));
      activeMon.hp = Math.min(activeMon.maxHp, activeMon.hp + healAmt);
      events.push({
        type: 'heal', side: actor.side, heal: healAmt, hp: activeMon.hp,
        msg: `🩸 [흡혈] ${activeMon.name}은(는) 체력을 ${healAmt} 회복했다!`
      });
    }

    // 부가 효과
    if (targetMon.hp > 0) {
      if (move.debuffDefChance && Math.random() < move.debuffDefChance) {
        if (targetMon.ability === '엄마없음') {
          events.push({ type: 'msg', msg: `${targetMon.name}의 특성 [엄마없음]! 방어력이 떨어지지 않는다!` });
        } else {
          targetMon.stages.def = Math.max(-6, (targetMon.stages.def || 0) - 1);
          events.push({ type: 'debuff', side: targetSide, stat: 'def', amount: -1, msg: `${targetMon.name}의 방어력이 1랭크 떨어졌다!` });
        }
      }
      if (move.poisonChance && Math.random() < move.poisonChance && !targetMon.poisoned && targetMon.type !== '독') {
        targetMon.poisoned = true;
        events.push({ type: 'debuff', side: targetSide, status: 'poisoned', msg: `${targetMon.name}은(는) 독에 걸렸다!` });
      }
      if (move.burnChance && Math.random() < move.burnChance && !targetMon.burned && targetMon.type !== '불꽃') {
        targetMon.burned = true;
        events.push({ type: 'debuff', side: targetSide, status: 'burned', msg: `${targetMon.name}은(는) 화상을 입었다!` });
      }
      if (move.paralyzeChance && Math.random() < move.paralyzeChance && !targetMon.paralyzed && targetMon.type !== '전기') {
        targetMon.paralyzed = true;
        events.push({ type: 'debuff', side: targetSide, status: 'paralyzed', msg: `${targetMon.name}은(는) 마비되었다!` });
      }
      if (move.flinchChance && Math.random() < move.flinchChance) {
        targetMon.flinched = true;
      }
    }

    if (targetMon.hp <= 0) {
      handleFaint(targetMon, targetSide, activeMon, actor.side);
    }
  }

  function handleFaint(faintedMon, faintedSide, opponentMon, opponentSide) {
    if (faintedMon.id === 'sungwon_time') {
      if (getStat(faintedMon, 'spe', sandstorm) < 100 && !faintedMon.revivedOnce) {
        faintedMon.revivedOnce = true;
        faintedMon.hp = Math.floor(faintedMon.maxHp * 0.5);
        faintedMon.spe = Math.floor(Math.random() * 50) + 121;
        events.push({
          type: 'revive', side: faintedSide, hp: faintedMon.hp,
          msg: `⏳ [백투더] ${faintedMon.name}이(가) 체력 50%로 1회 부활했다!`
        });
        return;
      }
      if (getStat(faintedMon, 'spe', sandstorm) >= 100 && opponentMon) {
        const diff = Math.max(0, getStat(faintedMon, 'spe', sandstorm) - getStat(opponentMon, 'spe', sandstorm));
        const grantAtk = Math.max(1, Math.min(6, Math.floor(diff / 15)));
        const curTeam = (faintedMon === simP1.lead) ? simP1 : simP2;
        if (curTeam && curTeam.bench) {
          const aliveBench = curTeam.bench.find(b => b && !b.fainted);
          if (aliveBench) {
            aliveBench.stages.atk = Math.min(6, (aliveBench.stages.atk || 0) + grantAtk);
            events.push({ type: 'future_buff', side: faintedSide, grantAtk, msg: `[퓨쳐] 벤치 아군에게 공격 +${grantAtk}랭크 전승!` });
          }
        }
      }
    }

    faintedMon.fainted = true;
    events.push({ type: 'faint', side: faintedSide, msg: `${faintedMon.name}은(는) 쓰러졌다!` });
  }

  executeAction(firstActor, secondActor.side);

  const actingMonOfSecond = (secondActor.side === 'p1') ? simP1.lead : simP2.lead;
  const opposingMonOfSecond = (secondActor.side === 'p1') ? simP2.lead : simP1.lead;
  if (!actingMonOfSecond.fainted && (!opposingMonOfSecond.fainted || secondActor.choice.type === 'switch')) {
    executeAction(secondActor, firstActor.side);
  }

  simP1.lead.protectActive = false;
  simP2.lead.protectActive = false;

  [simP1.lead, simP2.lead].forEach((mon, idx) => {
    if (mon.fainted) return;
    const side = (idx === 0) ? 'p1' : 'p2';
    const otherSide = (idx === 0) ? 'p2' : 'p1';
    const otherMon = (idx === 0) ? simP2.lead : simP1.lead;

    mon.rewindActive = false;

    if (mon.vulnerableTurns > 0) {
      mon.vulnerableTurns--;
      if (mon.vulnerableTurns <= 0) mon.vulnerableMult = 1.0;
    }

    // 💡 [보슬우 버프 격리] 현재 포켓몬이 boingo일 때만 버프 턴 감소 및 만료 처리
    if (mon.id === 'boingo' && mon.boingoSpaBuffTurns > 0) {
      mon.boingoSpaBuffTurns--;
      if (mon.boingoSpaBuffTurns <= 0) {
        mon.stages.spa = Math.max(-6, (mon.stages.spa || 0) - 2);
        events.push({ type: 'debuff', side, stat: 'spa', amount: -2, msg: `⏳ 보인고오슬우의 특수공격 버프 만료 (-2랭크)` });
      }
    }
    if (mon.id === 'boingo' && mon.boingoDefSpdBuffTurns > 0) {
      mon.boingoDefSpdBuffTurns--;
      if (mon.boingoDefSpdBuffTurns <= 0) {
        mon.stages.def = Math.max(-6, (mon.stages.def || 0) - 2);
        mon.stages.spd = Math.max(-6, (mon.stages.spd || 0) - 2);
        events.push({ type: 'debuff', side, stat: 'def', amount: -2, msg: `⏳ 보인고오슬우의 방어/특수방어 버프 만료 (-2랭크)` });
      }
    }

    if (mon.id === 'sungwon_time' && mon.overchargeBuffTurns > 0) {
      mon.overchargeBuffTurns--;
      if (mon.overchargeBuffTurns <= 0) {
        const amount = mon.overchargeBuffAmount || 0;
        if (amount > 0) {
          mon.stages.atk = Math.max(-6, (mon.stages.atk || 0) - amount);
          mon.stages.spe = Math.max(-6, (mon.stages.spe || 0) - amount);
          events.push({ type: 'debuff', side, stat: 'atk', amount: -amount, msg: `⏳ ${mon.name}의 오버차지 버프가 만료되었다! (공격/스피드 -${amount}랭크)` });
        }
        mon.overchargeBuffAmount = 0;
      }
    }

    if (mon.poisoned) {
      const pDmg = Math.max(1, Math.floor(mon.maxHp * 0.125));
      mon.hp = Math.max(0, mon.hp - pDmg);
      events.push({
        type: 'damage', targetSide: side, actorSide: otherSide, actorName: '독 데미지',
        targetName: mon.name, moveName: '독', moveType: '독', dmg: pDmg,
        targetHp: mon.hp, targetMaxHp: mon.maxHp, isCrit: false, effectiveness: 1.0
      });
      events.push({ type: 'msg', msg: `🟣 ${mon.name}은(는) 독의 피해를 입었다! (-${pDmg})` });
      if (mon.hp <= 0) {
        handleFaint(mon, side, otherMon, otherSide);
        return;
      }
    }

    if (mon.burned) {
      const bDmg = Math.max(1, Math.floor(mon.maxHp * 0.0625));
      mon.hp = Math.max(0, mon.hp - bDmg);
      events.push({
        type: 'damage', targetSide: side, actorSide: otherSide, actorName: '화상 데미지',
        targetName: mon.name, moveName: '화상', moveType: '불꽃', dmg: bDmg,
        targetHp: mon.hp, targetMaxHp: mon.maxHp, isCrit: false, effectiveness: 1.0
      });
      events.push({ type: 'msg', msg: `🔥 ${mon.name}은(는) 화상 피해를 입었다! (-${bDmg})` });
      if (mon.hp <= 0) {
        handleFaint(mon, side, otherMon, otherSide);
        return;
      }
    }

    if (sandstorm > 0 && mon.type !== '바위') {
      const sDmg = Math.max(1, Math.floor(mon.maxHp * 0.0625));
      mon.hp = Math.max(0, mon.hp - sDmg);
      events.push({
        type: 'damage', targetSide: side, actorSide: otherSide, actorName: '모래바람',
        targetName: mon.name, moveName: '모래바람', moveType: '바위', dmg: sDmg,
        targetHp: mon.hp, targetMaxHp: mon.maxHp, isCrit: false, effectiveness: 1.0
      });
      events.push({ type: 'msg', msg: `🌪️ 모래바람이 ${mon.name}을(를) 덮친다! (-${sDmg})` });
      if (mon.hp <= 0) {
        handleFaint(mon, side, otherMon, otherSide);
        return;
      }
    }

    if (mon.seeded) {
      const leech = Math.max(1, Math.floor(mon.maxHp * 0.10));
      mon.hp = Math.max(0, mon.hp - leech);
      events.push({
        type: 'damage', targetSide: side, actorSide: otherSide, actorName: '기생독',
        targetName: mon.name, moveName: '기생독', moveType: '풀', dmg: leech,
        targetHp: mon.hp, targetMaxHp: mon.maxHp, isCrit: false, effectiveness: 1.0
      });
      if (!otherMon.fainted) {
        const hAmt = Math.min(otherMon.maxHp - otherMon.hp, leech);
        otherMon.hp += hAmt;
        events.push({ type: 'heal', side: otherSide, heal: hAmt, hp: otherMon.hp, msg: `🌿 기생독이 ${mon.name}의 체력을 흡수했다!` });
      }
      if (mon.hp <= 0) {
        handleFaint(mon, side, otherMon, otherSide);
        return;
      }
    }

    if (mon.id === 'lee' && mon.nikaTurns > 0) {
      if (otherMon && !otherMon.fainted && otherMon.hp > 0) {
        const bolt = Math.min(otherMon.hp, Math.max(1, Math.floor(otherMon.maxHp / 16)));
        otherMon.hp -= bolt;
        events.push({type:'nika_lightning',side,targetSide:otherSide,msg:`⚡ [니카 낙뢰] ${otherMon.name}에게 번개가 내리쳤다!`});
        events.push({type:'damage',targetSide:otherSide,actorSide:side,actorName:mon.name,targetName:otherMon.name,
          moveName:'니카 낙뢰',moveType:'전기',dmg:bolt,targetHp:otherMon.hp,targetMaxHp:otherMon.maxHp,isCrit:false,effectiveness:1});
        if(otherMon.hp<=0)handleFaint(otherMon,otherSide,mon,side);
      }
      mon.nikaTurns--;
      if(mon.nikaTurns===0) {
        mon.stages.spe=0;
        events.push({type:'nika_end',side,msg:`☁️ ${mon.name}의 니카 모드가 종료되고 스피드 랭크가 0으로 돌아왔다.`});
      }
    }

    if (mon.tauntedTurns > 0) mon.tauntedTurns--;
    if (mon.reflectTurns > 0) mon.reflectTurns--;
  });

  events.push({ type: 'sync_teams', p1: simP1, p2: simP2 });
  return events;
}
