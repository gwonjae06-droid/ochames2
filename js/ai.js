// NPC AI and guarded battle-rule patches.
function getNpcChoice(aiTeam, playerTeam, currentSandstorm = 0) {
  const aiMon = aiTeam.lead, playerMon = playerTeam.lead;
  const availableBench = (aiTeam.bench || []).map((mon, idx) => ({ mon, idx })).filter(item => item.mon && !item.mon.fainted);
  if (aiMon.fainted) return {type:'switch', benchIndex:availableBench.length ? availableBench[0].idx : 0};
  if (availableBench.length) {
    if (aiMon.ability === '자가 수복' && (aiMon.hp < aiMon.maxHp * .45 || aiMon.poisoned || aiMon.burned || aiMon.paralyzed)) {
      if (Math.random() < .65) return {type:'switch',benchIndex:availableBench[0].idx};
    }
    if (aiMon.hp < aiMon.maxHp * .3) for (const b of availableBench) {
      const superMove = b.mon.moves.some(m => m.role === '공격' && getEffectiveness(m.type,playerMon.type) >= 2);
      if (superMove && Math.random() < .5) return {type:'switch',benchIndex:b.idx};
    }
  }
  let bestIdx=0, highestScore=-9999;
  const isTaunted=aiMon.tauntedTurns>0;
  aiMon.moves.forEach((move,idx)=>{
    if (move.isPassiveFaint || (isTaunted && move.role !== '공격')) return;
    let score=0;
    if (move.role==='방어') score=aiMon.protectCount>0 ? -80 : 25+Math.random()*20;
    else if (move.role==='공격') {
      const eff=getEffectiveness(move.type,playerMon.type), stab=aiMon.type===move.type?1.4:1;
      const physical=move.category==='물리';
      const atk=getStat(aiMon,physical?'atk':'spa',currentSandstorm);
      const def=getStat(playerMon,physical?'def':'spd',currentSandstorm);
      const estDmg=move.pwr*(atk/Math.max(1,def))*eff*stab;
      score=estDmg;
      if(estDmg>=playerMon.hp)score+=200;
      if(move.drain && aiMon.hp<aiMon.maxHp*.6)score+=40;
    } else {
      if(move.reflector && aiMon.reflectTurns<=0)score=70;
      else if(move.haze && Object.values(playerMon.stages).some(v=>v>0))score=75;
      else if(move.taunt && playerMon.tauntedTurns<=0)score=65;
      else if(move.paralyze100 && !playerMon.paralyzed)score=60;
      else if(move.burn100 && !playerMon.burned)score=60;
      else if(move.leechSeed && !playerMon.seeded)score=55;
      else if(move.sandstorm && currentSandstorm<=0)score=50;
      else score=30;
    }
    score+=Math.random()*10-5;
    if(score>highestScore){highestScore=score;bestIdx=idx;}
  });
  return {type:'move',moveIndex:bestIdx};
}

(() => {
  'use strict';
  try {
    const boon=POKEDEX.boingo, ability=boon.abilityDesc;
    const leap=boon.moves[1], prophecy=boon.moves[2];
    if(!ability.includes('최대 체력의 10%') || leap.boostSpa!==2 || prophecy.boostDef!==2 || prophecy.boostSpd!==2 || !leap.desc.includes('특수공격 2랭크') || !prophecy.desc.includes('방어/특방 2랭크')) throw Error('보인고 원본 데이터 불일치');
    let code=Function.prototype.toString.call(window.calculateTurnEvents);
    const replace=(before,after)=>{if(code.split(before).length!==2)throw Error(`엔진 지점 불일치: ${before}`);code=code.replace(before,after);};
    for(const [before,after] of [
      ['Math.floor(targetMon.maxHp * 0.10)','Math.floor(targetMon.maxHp * 0.07)'],
      ['10%(-${fixedDmg})','7%(-${fixedDmg})'],
      ['activeMon.vulnerableTurns = 1;','activeMon.vulnerableTurns = 2;'],
      ["if (move.boostSpa && activeMon.id === 'boingo') {","if (move.boostSpa && activeMon.id === 'boingo' && activeMon.boingoSpaBuffTurns <= 0) {"],
      ["if (move.boostDef && activeMon.id === 'boingo') {","const firstBoingoDefenseBoost = activeMon.boingoDefSpdBuffTurns <= 0;\n    if (move.boostDef && activeMon.id === 'boingo' && firstBoingoDefenseBoost) {"],
      ["if (move.boostSpd && activeMon.id === 'boingo') {","if (move.boostSpd && activeMon.id === 'boingo' && firstBoingoDefenseBoost) {"],
      ['mon.stages.spa = Math.max(-6, (mon.stages.spa || 0) - 2);','mon.stages.spa = Math.max(-6, (mon.stages.spa || 0) - 1.5);'],
      ['mon.stages.def = Math.max(-6, (mon.stages.def || 0) - 2);','mon.stages.def = Math.max(-6, (mon.stages.def || 0) - 1.5);'],
      ['mon.stages.spd = Math.max(-6, (mon.stages.spd || 0) - 2);','mon.stages.spd = Math.max(-6, (mon.stages.spd || 0) - 1.5);'],
      ["stat: 'spa', amount: -2, msg: `⏳ 보인고오슬우의 특수공격 버프 만료 (-2랭크)`","stat: 'spa', amount: -1.5, msg: `⏳ 보인고오슬우의 특수공격 버프 만료 (-1.5랭크)`"],
      ["stat: 'def', amount: -2, msg: `⏳ 보인고오슬우의 방어/특수방어 버프 만료 (-2랭크)`","stat: 'def', amount: -1.5, msg: `⏳ 보인고오슬우의 방어/특수방어 버프 만료 (-1.5랭크)`"],
      ['targetMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };','targetMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };\n        for (const buffMon of [activeMon, targetMon]) { buffMon.boingoSpaBuffTurns = 0; buffMon.boingoDefSpdBuffTurns = 0; }'],
      ["if (targetMon.protectActive) {","if (targetMon.protectActive && (move.role === '공격' || move.dropEnemyAtk || move.dropEnemySpa || move.taunt || move.leechSeed || move.paralyze100 || move.burn100 || move.forceRandomMove)) {"]
    ])replace(before,after);
    const branch="} else {\n        const eff = getEffectiveness('바람', targetMon.type);";
    if(code.split(branch).length!==3)throw Error('성원-타임 공격 분기 불일치');
    code=code.split(branch).join("} else {\n        if (targetMon.protectActive) { events.push({type:'protect',side:targetSide,msg:`${targetMon.name}은(는) 공격을 완전히 막아냈다!`}); return; }\n        if (Math.random()*100 > move.acc) { events.push({type:'msg',msg:'그러나 공격은 빗나갔다!'}); return; }\n        const eff = getEffectiveness('바람', targetMon.type);");
    for(const [before,after] of [
      ['const simP2 = JSON.parse(JSON.stringify(p2Team));','const simP2 = JSON.parse(JSON.stringify(p2Team));\n  const hasMajor = m => !!(m.poisoned || m.burned || m.paralyzed || m.backPainTurns > 0);\n  const acted = new Set();'],
      ['oldMon.lastMoveIndex = null;','oldMon.lastMoveIndex = null;\n      oldMon.poisonTurns = 0; oldMon.backPainTurns = 0; oldMon.flinched = false;'],
      ['const dmg = Math.floor(55 * eff);','const dmg = Math.max(1, Math.floor(55 * eff * (targetMon.vulnerableMult || 1) * (targetMon.backPainTurns > 0 ? 1.5 : 1) * (targetMon.reflectTurns > 0 ? .6 : 1) * (targetMon.rewindActive ? .5 : 1)));'],
      ["if (!targetMon.paralyzed && targetMon.type !== '전기') targetMon.paralyzed = true;","const canParalyze = !hasMajor(targetMon) && targetMon.type !== '전기';\n        if (canParalyze) targetMon.paralyzed = true;"],
      ["msg: `[빨리감기] 상대를 마비 상태로 만들었다!`","msg: canParalyze ? `[빨리감기] 상대를 마비 상태로 만들었다!` : `[빨리감기] 추가 효과가 발동하지 않았다.`"],
      ['* (targetMon.rewindActive ? 0.5 : 1.0)));','* (targetMon.rewindActive ? 0.5 : 1.0) * (targetMon.vulnerableMult || 1) * (targetMon.backPainTurns > 0 ? 1.5 : 1)));'],
      ['const vulnMult = targetMon.vulnerableMult || 1.0;','const vulnMult = (targetMon.vulnerableMult || 1.0) * (targetMon.backPainTurns > 0 ? 1.5 : 1);'],
      ["if (!targetMon.paralyzed && targetMon.type !== '전기') {","if (!hasMajor(targetMon) && targetMon.type !== '전기') {"],
      ["if (!targetMon.burned && targetMon.type !== '불꽃') {","if (!hasMajor(targetMon) && targetMon.type !== '불꽃') {"],
      ["&& !targetMon.poisoned && targetMon.type !== '독'","&& !hasMajor(targetMon) && targetMon.type !== '독'"],
      ["&& !targetMon.burned && targetMon.type !== '불꽃'","&& !hasMajor(targetMon) && targetMon.type !== '불꽃'"],
      ["&& !targetMon.paralyzed && targetMon.type !== '전기'","&& !hasMajor(targetMon) && targetMon.type !== '전기'"],
      ['targetMon.poisoned = true;','targetMon.poisoned = true; targetMon.poisonTurns = 0;'],
      ['if (targetMon.hp > 0) {','if (targetMon.hp > 0) {\n      if (move.backPainChance && !hasMajor(targetMon) && Math.random() < move.backPainChance) {\n        if (targetMon.heldItem === \'fullHeal\') { targetMon.heldItem = null; targetMon.usedHeldItem = \'fullHeal\'; events.push({type:\'msg\',msg:`${targetMon.name}의 만병통치제! 허리삐끗을 치료했다!`}); }\n        else { targetMon.backPainTurns = 3; events.push({type:\'debuff\',side:targetSide,status:\'backPain\',msg:`${targetMon.name}은(는) 허리삐끗! 2턴간 받는 피해 1.5배!`}); }\n      }'],
      ['if (move.flinchChance && Math.random() < move.flinchChance) {',"if (move.flinchChance && !acted.has(targetSide) && secondActor.side === targetSide && secondActor.choice.type === 'move' && Math.random() < move.flinchChance) {"],
      ['executeAction(firstActor, secondActor.side);','executeAction(firstActor, secondActor.side);\n  acted.add(firstActor.side);'],
      ['mon.rewindActive = false;','mon.rewindActive = false; mon.flinched = false;\n    if (mon.backPainTurns > 0) mon.backPainTurns--;'],
      ['const pDmg = Math.max(1, Math.floor(mon.maxHp * 0.125));','mon.poisonTurns = Math.min(15, (mon.poisonTurns || 0) + 1);\n      const pDmg = Math.max(1, Math.floor(mon.maxHp * mon.poisonTurns / 16));']
    ])replace(before,after);
    const revised=new Function(`return (${code})`)();
    window.calculateTurnEvents=revised;
    boon.abilityDesc=ability.replace('최대 체력의 10%','최대 체력의 7%');
    leap.boostSpa=1.5;leap.desc=leap.desc.replace('특수공격 2랭크','특수공격 1.5랭크');
    prophecy.boostDef=1.5;prophecy.boostSpd=1.5;prophecy.desc=prophecy.desc.replace('방어/특방 2랭크','방어/특방 1.5랭크');
    const meteor=POKEDEX.park.moves[1];
    meteor.flinchChance=0;meteor.backPainChance=.18;
    meteor.desc='공중 급습 공격. 18% 확률로 상대를 허리삐끗 상태로 만든다 (2턴간 받는 피해 1.5배).';
    const oldBuild=window.buildMon;
    window.buildMon=function(...args){const mon=oldBuild.apply(this,args);mon.poisonTurns=0;mon.backPainTurns=0;return mon;};
  } catch(error) { console.error('전투 규칙 패치 실패: 원본 엔진을 유지합니다.',error); }
  document.addEventListener('DOMContentLoaded',()=>{
    const play=window.playTurnEvents;
    if(typeof play==='function')window.playTurnEvents=function(events){
      const visible=Array.isArray(events)?events.map(ev=>['status_force_random','status_force_random_trigger'].includes(ev?.type)?{...ev,type:'msg'}:ev):events;
      return play.call(this,visible);
    };
    const badges=window.renderHudBadges;
    if(typeof badges==='function')window.renderHudBadges=function(id,mon){
      const result=badges.apply(this,arguments),root=document.getElementById(id);
      if(root && mon && !mon.fainted){
        for(const [show,label] of [[mon.isForceRandom,'다음 기술 무작위'],[mon.backPainTurns>0,'허리삐끗 · 피해 1.5배']])if(show){
          const tag=document.createElement('span');tag.className='mini-badge debuff';tag.textContent=label;root.append(tag);
        }
      }
      return result;
    };
    const commands=window.enableCommands;
    if(typeof commands==='function')window.enableCommands=function(enabled){
      const result=commands.apply(this,arguments);
      if(enabled && typeof myTeam!=='undefined' && myTeam?.lead?.isForceRandom){
        const indicator=document.getElementById('cmd-status-indicator');
        if(indicator)indicator.textContent='다음 기술 무작위 · 교체 가능';
      }
      return result;
    };
    const forced=window.applyForcedSwitch;
    if(typeof forced==='function')window.applyForcedSwitch=function(side,index){
      const team=side==='p1'?myTeam:enemyTeam,old=team?.lead;
      const result=forced.apply(this,arguments);
      if(result && old){old.poisonTurns=0;old.backPainTurns=0;old.flinched=false;}
      return result;
    };
  },{once:true});
})();
