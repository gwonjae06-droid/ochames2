
// -------------------------------------------------------------
// 포켓몬 도감 데이터 (8명) & 상성표
// -------------------------------------------------------------
const POKEDEX = {
  bae: {
    id: 'bae', name: '배서준', type: '격투', roleTag: '흡혈 딜탱', color: '#ea580c',
    story: '가끔 그에게도 마법의 시간이 온다. 남자라고 예외는 아니다. 그는 이를 활용하기로 마음먹었다.',
    advantage: '바위 (2배)', disadvantage: '독 · 에스퍼 (0.5배)',
    hp: 195, atk: 105, def: 90, spa: 60, spd: 85, spe: 85,
    ability: '흡혈귀', abilityDesc: '체력 50% 이하 시 공격력 1.2배 & 모든 공격 시 준 피해의 15% 추가 흡혈',
    moves: [
      { name: '피의 방패', type: '격투', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '상대 공격을 막아낸다 (연속 시 실패율 증가).' },
      { name: '드레인펀치', type: '격투', role: '공격', category: '물리', pwr: 70, acc: 100, drain: 0.35, debuffDefChance: 0.2, desc: '타격 후 피해의 35% 흡혈 + 20% 상대 방어 1랭크 하락.' },
      { name: '벌크업', type: '격투', role: '변화', category: '변화', pwr: 0, acc: 100, boostAtk: 1, boostDef: 1, desc: '공격력과 방어력을 1랭크씩 상승시킨다.' },
      { name: '도발 (Taunt)', type: '격투', role: '변화', category: '변화', pwr: 0, acc: 100, taunt: 2, desc: '2턴 동안 상대의 방어·변화기를 완전 봉쇄한다.' }
    ]
  },
  oh: {
    id: 'oh', name: '오슬우', type: '독', roleTag: '디버프 컨트롤러', color: '#7e22ce',
    story: '지금 그는 매우 toxic하다. 함부로 그에게 다가가지 마라.',
    advantage: '격투 (2배)', disadvantage: '바위 · 에스퍼 (0.5배)',
    hp: 190, atk: 60, def: 85, spa: 110, spd: 100, spe: 80,
    ability: '위협', abilityDesc: '등장 시 상대의 공격력을 1랭크 강제 하락',
    moves: [
      { name: '멘헤라 가드', type: '독', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '독 장벽을 쳐 이번 턴 공격을 완전히 막아낸다.' },
      { name: '오물폭탄', type: '독', role: '공격', category: '특수', pwr: 75, acc: 100, poisonChance: 0.25, desc: '독탄을 발사하여 공격한다 (25% 확률 독 부여).' },
      { name: '보인고 매혹', type: '독', role: '변화', category: '변화', pwr: 0, acc: 100, dropEnemyAtk: 1, dropEnemySpa: 1, desc: '상대의 공격력과 특수공격력을 1랭크씩 깎는다.' },
      { name: '기생독', type: '독', role: '변화', category: '변화', pwr: 0, acc: 100, leechSeed: true, desc: '매 턴 상대 체력의 10%를 흡수하여 내 체력을 회복.' }
    ]
  },
  lee: {
    id: 'lee', name: '이권재', type: '전기', roleTag: '스피드 어태커', color: '#0284c7',
    story: '그의 턱은 피뢰침의 역할을 하는 것 같다.',
    advantage: '독 (2배)', disadvantage: '바위 (0.5배)',
    hp: 185, atk: 110, def: 75, spa: 70, spd: 75, spe: 115,
    ability: '가속', abilityDesc: '니카 전에는 기술 사용 시 스피드 +1랭크. +3에서 니카 진입(진입 시 최대 HP 5% 소모, 쓰러지지 않음). 이번 턴 포함 3턴 동안 턴 종료 낙뢰, 벽력일섬 사용 가능. 종료 시 스피드 0.',
    moves: [
      { name: '회피 스텝', type: '전기', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '민첩한 스텝으로 이번 턴 상대의 공격을 회피한다.' },
      { name: '롱레인지 찌르기', type: '전기', role: '공격', category: '물리', pwr: 65, acc: 100, priority: 1, paralyzeChance: 0.15, desc: '찌르기(+1 선공, 15% 마비). 니카 중 벽력일섬(위력 86, +2 선공, 15% 풀죽음).' },
      { name: '전기자석파', type: '전기', role: '변화', category: '변화', pwr: 0, acc: 90, paralyze100: true, desc: '상대를 마비시켜 스피드를 30% 낮추고 행동을 방해한다.' },
      { name: '충전', type: '전기', role: '변화', category: '변화', pwr: 0, acc: 100, charge: true, boostSpd: 1, desc: '특방 1랭크 상승 & 다음 턴 공격 데미지 1.35배 증폭.' }
    ]
  },
  park: {
    id: 'park', name: '박성원', type: '바위', roleTag: '자가 수복 탱커', color: '#059669',
    story: '한 때 마하의 속도로 달렸던 그는, 이제는 더욱 단단해지기로 한다.',
    advantage: '불꽃 (2배)', disadvantage: '격투 (0.5배)',
    hp: 220, atk: 95, def: 115, spa: 50, spd: 95, spe: 50,
    ability: '자가 수복', abilityDesc: '교체하여 벤치로 들어갈 때 상태이상 완치 & 최대 체력의 30% 즉시 회복!',
    moves: [
      { name: '철벽 방어', type: '바위', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '바위 몸체로 이번 턴 상대 공격을 완벽히 방어한다.' },
      { name: '메테오 스트라이크', type: '바위', role: '공격', category: '물리', pwr: 75, acc: 95, flinchChance: 0.18, desc: '공중 급습 공격. 18% 확률로 상대를 풀죽게 만든다.' },
      { name: '스텔스 아머', type: '바위', role: '변화', category: '변화', pwr: 0, acc: 100, boostDef: 1, boostSpd: 1, desc: '외골격을 굳혀 방어력과 특수방어를 각각 1랭크 올림.' },
      { name: '모래바람', type: '바위', role: '변화', category: '변화', pwr: 0, acc: 100, sandstorm: 4, desc: '4턴간 모래바람 (바위 특방 1.3배 & 비바위 포켓몬 매 턴 피해).' }
    ]
  },
  choi: {
    id: 'choi', name: '최규원', type: '불꽃', roleTag: '폭딜 겜블러', color: '#e11d48',
    story: '어디에 있는가. 그의 행적은 지난 세월에 묶여있다. 다시 날아오를 그날을 위하여.',
    advantage: '전기 · 에스퍼 (2배)', disadvantage: '바위 (0.5배)',
    hp: 195, atk: 100, def: 85, spa: 105, spd: 85, spe: 75,
    ability: '맹화', abilityDesc: '체력 35% 이하 시 불꽃 기술 위력 1.3배 & 급소율 +15%',
    moves: [
      { name: '화염 장벽', type: '불꽃', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '타오르는 불꽃 장벽으로 이번 턴 상대 공격을 막아낸다.' },
      { name: '화염방사', type: '불꽃', role: '공격', category: '특수', pwr: 75, acc: 100, burnChance: 0.18, desc: '불꽃 발사 (18% 확률 화상: 물리 공격력 감소 및 지속 피해).' },
      { name: '도깨비불', type: '불꽃', role: '변화', category: '변화', pwr: 0, acc: 85, burn100: true, desc: '도깨비불을 던져 상대를 100% 화상 상태로 만든다.' },
      { name: '수능 가챠', type: '불꽃', role: '변화', category: '변화', pwr: 0, acc: 100, gacha: true, desc: '50% 확률로 특공/스피드 2랭크 상승, 50% 확률로 1랭크 하락.' }
    ]
  },
  yoon: {
    id: 'yoon', name: '윤서윤', type: '에스퍼', roleTag: '철벽 서포터', color: '#ec4899',
    story: '그녀와 얽힌것이 많은 남자를 알고있다. 최후는 곧 비보이니.',
    advantage: '격투 · 독 (2배)', disadvantage: '불꽃 (2배 피격) · 바위 (0.5배)',
    hp: 200, atk: 65, def: 95, spa: 105, spd: 95, spe: 75,
    ability: '엄마없음', abilityDesc: '상대방의 기술이나 특성에 의해 능력치 랭크가 떨어지지 않음',
    moves: [
      { name: '절대 방어', type: '에스퍼', role: '방어', category: '변화', pwr: 0, acc: 100, protect: true, desc: '상대 공격을 막아낸다 (연속 사용 시 실패율 증가).' },
      { name: '사이코 쇼크', type: '에스퍼', role: '공격', category: '특수', pwr: 75, acc: 100, desc: '강력한 염동파로 적에게 특수 피해를 입힌다.' },
      { name: '리플렉트 실드', type: '에스퍼', role: '변화', category: '변화', pwr: 0, acc: 100, reflector: 5, desc: '5턴 동안 받는 모든 공격 데미지를 40% 경감하는 장막을 친다.' },
      { name: '흑안개', type: '에스퍼', role: '변화', category: '변화', pwr: 0, acc: 100, haze: true, desc: '검은 안개로 필드에 있는 모든 포켓몬의 능력치 랭크 변화를 전부 0으로 초기화한다.' }
    ]
  },
  boingo: {
    id: 'boingo', name: '보인고오슬우', type: '환락', roleTag: '카오스 예측불허', color: '#db2777',
    story: '한 때 순수했던 청년은 모두에게 재미를 주었다.',
    advantage: '환락 (2배)', disadvantage: '없음',
    hp: 200, atk: 100, def: 85, spa: 100, spd: 85, spe: 90,
    ability: '만화예언', 
    abilityDesc: '플레이어가 조종 불가(자동 행동) & 직전과 다른 기술 사용 시 최대 체력의 10%만큼 추가 고정 피해!',
    moves: [
      { name: '스플래시 매직', type: '환락', role: '공격', category: '특수', pwr: 50, acc: 100, benchDmg: 20, desc: '적에게 50 피해, 적 벤치 포켓몬 전원에게 20의 고정 피해를 준다.' },
      { name: '타임 리프 스트라이크', type: '환락', role: '공격', category: '특수', pwr: 40, acc: 100, priority: 1, boostSpa: 2, desc: '[+1 선공기] 적을 선공 타격하고 2턴간 특수공격 2랭크를 얻는다.' },
      { name: '광기의 예언서', type: '환락', role: '공격', category: '특수', pwr: 30, acc: 100, boostDef: 2, boostSpd: 2, forceRandomMove: true, desc: '적에게 30 피해 + 2턴간 방어/특방 2랭크 획득 + 다음 턴 상대 기술 강제 무작위 사용.' },
      { name: '익스트림 카오스', type: '환락', role: '공격', category: '특수', pwr: 90, acc: 100, selfVulnerable: 1.5, desc: '적에게 90 피해를 주지만, 다음 턴 자신이 받는 피해가 1.5배가 된다.' }
    ]
  },
  sungwon_time: {
    id: 'sungwon_time', name: '성원-타임', type: '바람', roleTag: '속도 변환 트릭스터', color: '#06b6d4',
    story: '마하의 강림. 시간을 되감다. 눈빛은 흔들리고..',
    advantage: '독 · 격투 (2배)', disadvantage: '바위 · 전기 (2배 피격)',
    hp: 215, atk: 90, def: 80, spa: 85, spd: 80, spe: 100,
    ability: '가속 상대성',
    abilityDesc: '속도가 100 초과 시 초과분의 50%만큼 추가 바람 피해를 주며, 100 미만 시 (100-속도)/10만큼 방어 랭크가 실시간 증가합니다.',
    moves: [
      { name: '페이스 조절', type: '바람', role: '변화', category: '변화', pwr: 0, acc: 100, isPaceControl: true, desc: '속도 영역을 반대로 전환한다 (≥100 -> 30~79, <100 -> 121~170). 사용 시 오버차지 버프 즉시 소멸.' },
      { name: '되감기 / 빨리감기', type: '바람', role: '변화', category: '변화', pwr: 0, acc: 100, isSkill2: true, desc: '[<100 되감기] 최우선도로 이번 턴 받는 피해를 50% 경감하고 배터리 충전 / [≥100 빨리감기] 위력 55 바람 피해 + 100% 마비.' },
      { name: '오버차지 / 작용반작용', type: '바람', role: '공격', category: '물리', pwr: 100, acc: 100, isSkill3: true, desc: '[<100 오버차지] 배터리 10당 공/스피드 랭크 1 증가(2턴) & 속도 고속 전환 / [≥100 작용반작용] 위력 100 바람 물리 피해 + 35% 반동.' },
      { name: '백투더 / 퓨쳐', type: '바람', role: '변화', category: '변화', pwr: 0, acc: 100, isPassiveFaint: true, desc: '[패시브 기절 시] <100: 체력 50% 부활(1회) / ≥100: 속도차 비례 다음 아군 공격 랭크 전승.' }
    ]
  }
};

const TYPE_CHART = {
  '격투': { '바위': 2.0, '독': 0.5, '에스퍼': 0.5 },
  '독':   { '격투': 2.0, '바위': 0.5, '에스퍼': 0.5 },
  '전기': { '독': 2.0,   '바위': 0.5, '바람': 2.0 },
  '바위': { '불꽃': 2.0, '격투': 0.5, '바람': 2.0 },
  '불꽃': { '전기': 2.0, '바위': 0.5, '에스퍼': 2.0 },
  '에스퍼': { '격투': 2.0, '독': 2.0, '바위': 0.5 },
  '환락': { '환락': 2.0 },
  '바람': { '독': 2.0, '격투': 2.0, '바위': 0.5, '전기': 0.5 }
};
