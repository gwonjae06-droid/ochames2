// Battle item rules. The UI and turn engine call these functions; this file has no side effects on load.
const HELD_ITEMS = Object.freeze({
  leftovers: Object.freeze({name: '먹다남은음식', singleUse: false, description: '턴 종료 시 최대 HP의 1/16 회복'}),
  fullHeal: Object.freeze({name: '만병통치제', singleUse: true, description: '독·화상·마비에 걸리면 자동 치료'}),
  sitrus: Object.freeze({name: '자뭉열매', singleUse: true, description: 'HP가 절반 이하가 되면 최대 HP의 1/4 회복'}),
  whiteHerb: Object.freeze({name: '하양허브', singleUse: true, description: '떨어진 능력치 랭크를 복구'}),
  focusSash: Object.freeze({name: '기합의 띠', singleUse: true, description: 'HP가 가득 찬 상태에서 기술로 기절할 피해를 받으면 HP 1로 버팀'})
});

const HeldItemRules = Object.freeze({
  equip(team, memberId, itemId) {
    if (!team || !team.lead || !Array.isArray(team.bench) || team.bench.length !== 2) return false;
    if (itemId !== null && !Object.prototype.hasOwnProperty.call(HELD_ITEMS, itemId)) return false;
    const members = [team.lead, ...team.bench];
    if (new Set(members.map(mon => mon && mon.id)).size !== 3 || members.some(mon => !mon)) return false;
    if (itemId !== null && !members.some(mon => mon.id === memberId)) return false;
    for (const mon of members) {
      mon.heldItem = itemId !== null && mon.id === memberId ? itemId : null;
      mon.usedHeldItem = null;
    }
    return true;
  },
  itemName(mon) {
    return HELD_ITEMS[mon && mon.heldItem]?.name || '';
  },
  onDirectDamage(mon, hpBefore, damage, side) {
    const amount = Math.max(0, Math.floor(Number(damage) || 0));
    const previous = Math.max(0, Number(hpBefore) || 0);
    let nextHp = Math.max(0, previous - amount);
    const events = [];
    if (mon.heldItem === 'focusSash' && previous === mon.maxHp && amount > 0 && nextHp === 0) {
      nextHp = 1; mon.heldItem = null; mon.usedHeldItem = 'focusSash';
      events.push({type: 'msg', side, msg: `${mon.name}의 기합의 띠! HP 1로 버텼다!`});
    }
    mon.hp = nextHp;
    if (mon.heldItem === 'sitrus' && nextHp > 0 && nextHp <= mon.maxHp / 2) {
      const heal = Math.min(mon.maxHp - nextHp, Math.max(1, Math.floor(mon.maxHp / 4)));
      mon.hp += heal; mon.heldItem = null; mon.usedHeldItem = 'sitrus';
      events.push({type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 자뭉열매! HP ${heal} 회복!`});
    }
    return {hp: mon.hp, events};
  },
  afterHpChange(mon, side) {
    if (!mon || mon.fainted || mon.hp <= 0 || mon.heldItem !== 'sitrus' || mon.hp > mon.maxHp / 2) return [];
    const heal = Math.min(mon.maxHp - mon.hp, Math.max(1, Math.floor(mon.maxHp / 4)));
    mon.hp += heal; mon.heldItem = null; mon.usedHeldItem = 'sitrus';
    return [{type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 자뭉열매! HP ${heal} 회복!`}];
  },
  afterStatChange(mon, side) {
    if (!mon || mon.heldItem !== 'whiteHerb' || !mon.stages) return [];
    const lowered = Object.keys(mon.stages).filter(stat => mon.stages[stat] < 0);
    if (!lowered.length) return [];
    for (const stat of lowered) mon.stages[stat] = 0;
    mon.heldItem = null; mon.usedHeldItem = 'whiteHerb';
    return [{type: 'msg', side, msg: `${mon.name}의 하양허브! 떨어진 능력치가 복구되었다!`}];
  },
  afterStatusChange(mon, side) {
    if (!mon || mon.heldItem !== 'fullHeal' || !(mon.poisoned || mon.burned || mon.paralyzed)) return [];
    mon.poisoned = false; mon.burned = false; mon.paralyzed = false;
    mon.heldItem = null; mon.usedHeldItem = 'fullHeal';
    return [{type: 'msg', side, msg: `${mon.name}의 만병통치제! 상태이상을 치료했다!`}];
  },
  endTurn(mon, side) {
    if (!mon || mon.fainted || mon.hp <= 0 || mon.hp >= mon.maxHp || mon.heldItem !== 'leftovers') return [];
    const heal = Math.min(mon.maxHp - mon.hp, Math.max(1, Math.floor(mon.maxHp / 16)));
    mon.hp += heal;
    return [{type: 'heal', side, heal, hp: mon.hp, msg: `${mon.name}의 먹다남은음식! HP ${heal} 회복!`}];
  }
});