// Load after app.js and cosmetic scripts, and after held_items_core.js.
(() => {
  'use strict';
  let selectedMember = '', selectedItem = '';
  const validItem = id => Object.prototype.hasOwnProperty.call(HELD_ITEMS, id);
  const all = team => team ? [team.lead, ...(team.bench || [])] : [];
  const selection = () => selectedMember && validItem(selectedItem) && myPickList.includes(selectedMember)
    ? {owner: selectedMember, item: selectedItem} : null;
  const picker = document.createElement('div');
  picker.style.cssText = 'background:#0f172a;border:1px solid #475569;border-radius:8px;padding:9px;color:#e2e8f0;font-size:12px';
  const label = document.createElement('div');
  label.textContent = '지닌 도구 · 엔트리 3명 중 1명만 장착 (장착하지 않아도 됨)';
  const member = document.createElement('select'); member.setAttribute('aria-label','도구 장착 캐릭터');
  const item = document.createElement('select'); item.setAttribute('aria-label','장착 도구');
  for (const field of [member,item]) field.style.cssText='min-height:34px;background:#1e293b;color:#fff;border:1px solid #64748b;border-radius:6px;padding:4px;margin:5px 5px 0 0;max-width:100%';
  for (const [id, data] of Object.entries(HELD_ITEMS)) {
    const option = document.createElement('option'); option.value=id; option.textContent=`${data.name} · ${data.description}`; item.append(option);
  }
  picker.append(label,member,item);
  document.getElementById('pick-grid')?.after(picker);
  function paintPicker() {
    if (selectedMember && !myPickList.includes(selectedMember)) { selectedMember=''; selectedItem=''; }
    member.replaceChildren(new Option('장착하지 않음',''));
    for (const id of myPickList) member.add(new Option(POKEDEX[id].name,id));
    member.value=selectedMember;
    item.disabled=!selectedMember;
    item.value=selectedItem || Object.keys(HELD_ITEMS)[0];
  }
  member.onchange=()=>{selectedMember=member.value;selectedItem=selectedMember?(selectedItem||'leftovers'):'';paintPicker();};
  item.onchange=()=>{selectedItem=item.value;};
  const oldPicks=window.updatePickVisuals;
  window.updatePickVisuals=function(...args){const result=oldPicks.apply(this,args);paintPicker();return result;};
  paintPicker();
  function equipOwn() {
    const choice=selection();
    if (!choice || !myTeam || isSpectator || all(myTeam).some(mon=>mon?.heldItem||mon?.usedHeldItem)) return;
    HeldItemRules.equip(myTeam,choice.owner,choice.item);
  }
  const oldStart=window.startBattleScreen;
  window.startBattleScreen=function(fromSnapshot=false) {
    if (!fromSnapshot) equipOwn();
    return oldStart.apply(this,arguments);
  };
  function addPayload(packet) {
    const choice=selection();
    if (packet?.type==='teamReady' && packet.team && choice) {
      packet.team.itemOwner=choice.owner; packet.team.itemId=choice.item;
    }
    return packet;
  }
  const oldConfirm=window.confirmTeam;
  window.confirmTeam=function(...args) {
    const choice=selection(), oldBuild=window.buildMon;
    let made=0;
    window.buildMon=function(...values) {
      const mon=oldBuild.apply(this,values);
      if (made++<3 && choice && mon.id===choice.owner) {
        mon.heldItem=choice.item;mon.usedHeldItem=null;
      }
      return mon;
    };
    const patched=[];
    for (const channel of new Set([typeof conn==='undefined'?null:conn,typeof playerConn==='undefined'?null:playerConn])) {
      if (!channel?.open || typeof channel.send!=='function') continue;
      const oldSend=channel.send;
      channel.send=function(packet){return oldSend.call(this,addPayload(packet));};
      patched.push([channel,oldSend]);
    }
    try { return oldConfirm.apply(this,args); }
    finally {
      window.buildMon=oldBuild;
      for (const [channel,oldSend] of patched) channel.send=oldSend;
      if (typeof teamPayload!=='undefined' && teamPayload) addPayload(teamPayload);
    }
  };
  const oldIncoming=window.handleIncomingConnection;
  window.handleIncomingConnection=function(channel) {
    const oldOn=channel.on;
    channel.on=function(type,listener) {
      if(type!=='data')return oldOn.call(this,type,listener);
      return oldOn.call(this,type,function(data) {
        const team=data?.type==='teamReady'?data.team:null;
        const ids=team?[team.leadId,team.bench1Id,team.bench2Id]:[];
        const okay=team && validItem(team.itemId) && ids.includes(team.itemOwner) && new Set(ids).size===3;
        if (!okay) return listener.call(this,data);
        const oldBuild=window.buildMon; let made=0;
        window.buildMon=function(...values) {
          const mon=oldBuild.apply(this,values);
          if(made++<3 && mon.id===team.itemOwner){mon.heldItem=team.itemId;mon.usedHeldItem=null;}
          return mon;
        };
        try{return listener.call(this,data);}finally{window.buildMon=oldBuild;}
      });
    };
    try{return oldIncoming.call(this,channel);}finally{channel.on=oldOn;}
  };
  const oldBadges=window.renderHudBadges;
  window.renderHudBadges=function(id,mon) {
    const result=oldBadges.apply(this,arguments),box=document.getElementById(id);
    if(box && mon?.heldItem){const badge=document.createElement('span');badge.className='mini-badge buff';badge.textContent=`도구: ${HeldItemRules.itemName(mon)}`;box.append(badge);}
    return result;
  };
  const oldCalc=window.calculateTurnEvents;
  window.calculateTurnEvents=function(...args) {
    const notices=[], originalParse=JSON.parse;
    let parsed=0;
    function install(team,side) {
      for (const mon of all(team)) {
        if(!mon)continue;
        let hp=mon.hp, herbActive=false;
        Object.defineProperty(mon,'hp',{enumerable:true,configurable:true,get(){return hp;},set(value){
          const before=hp;hp=value;
          if(mon.heldItem==='focusSash' && before===mon.maxHp && value<=0 && value<before){
            hp=1;mon.heldItem=null;mon.usedHeldItem='focusSash';
            notices.push({type:'msg',msg:`${mon.name}의 기합의 띠! HP 1로 버텼다!`});
          }else if(mon.heldItem==='sitrus' && hp>0 && hp<=mon.maxHp/2 && hp<before){
            const heal=Math.min(mon.maxHp-hp,Math.max(1,Math.floor(mon.maxHp/4)));
            hp+=heal;mon.heldItem=null;mon.usedHeldItem='sitrus';
            notices.push({type:'msg',msg:`${mon.name}의 자뭉열매! HP ${heal} 회복!`});
          }
        }});
        const statuses={poisoned:!!mon.poisoned,burned:!!mon.burned,paralyzed:!!mon.paralyzed};
        for(const key of Object.keys(statuses))Object.defineProperty(mon,key,{enumerable:true,configurable:true,
          get(){return statuses[key];},set(value){statuses[key]=!!value;
            if(value && mon.heldItem==='fullHeal'){
              for(const field of Object.keys(statuses))statuses[field]=false;
              mon.heldItem=null;mon.usedHeldItem='fullHeal';
              notices.push({type:'msg',msg:`${mon.name}의 만병통치제! 상태이상을 치료했다!`});
            }
          }});
        let stageValue;
        const wrapStages = value => new Proxy(value,{set(target,key,v){
          target[key]=(v<0 && (mon.heldItem==='whiteHerb'||herbActive))?0:v;
          if(v<0 && mon.heldItem==='whiteHerb'){
            for(const field of Object.keys(target))if(target[field]<0)target[field]=0;
            herbActive=true;mon.heldItem=null;mon.usedHeldItem='whiteHerb';
            notices.push({type:'msg',msg:`${mon.name}의 하양허브! 떨어진 능력치가 복구되었다!`});
          }
          return true;
        }});
        stageValue=wrapStages(mon.stages);
        Object.defineProperty(mon,'stages',{enumerable:true,configurable:true,
          get(){return stageValue;},set(v){stageValue=wrapStages(v);}});
        notices.push(...HeldItemRules.afterStatusChange(mon,side),...HeldItemRules.afterStatChange(mon,side));
      }
    }
    JSON.parse=function(text,...rest) {
      const value=originalParse.call(this,text,...rest);
      if(parsed<2 && value?.lead && Array.isArray(value.bench))install(value,parsed++===0?'p1':'p2');
      return value;
    };
    let events;
    try{events=oldCalc.apply(this,args);}finally{JSON.parse=originalParse;}
    if (!Array.isArray(events) || events.at(-1)?.type!=='sync_teams') return events;
    const state=events.at(-1);
    for (const [team,side] of [[state.p1,'p1'],[state.p2,'p2']]) {
      notices.push(...HeldItemRules.endTurn(team.lead,side));
    }
    state.p1=originalParse.call(JSON,JSON.stringify(state.p1));
    state.p2=originalParse.call(JSON,JSON.stringify(state.p2));
    events.splice(events.length-1,0,...notices);
    return events;
  };
})();