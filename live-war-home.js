(function(){
  const $=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const val=(o,...keys)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null)return o[k]}return 0};
  const text=(o,...keys)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='')return String(o[k])}return ''};
  function timeValue(v){
    if(!v)return 0;
    const s=String(v);
    const iso=s.length===18&&/^\d{8}T\d{6}\.\d{3}Z$/.test(s)
      ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}.${s.slice(16,19)}Z`
      : s;
    const t=Date.parse(iso);
    return Number.isNaN(t)?0:t;
  }
  function countdown(end,start){
    const target=timeValue(end);
    if(!target)return '⚔️ Krieg läuft';
    const diff=Math.max(0,target-Date.now());
    const total=Math.floor(diff/1000);
    const d=Math.floor(total/86400),h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),s=total%60;
    return `⏱️ Ende in ${d?d+' T. ':''}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  async function load(){
    try{
      const r=await fetch('war-data.json?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      const w=data.current;
      if(!w){
        if($('warTitle'))$('warTitle').textContent='KEIN LAUFENDER KRIEG';
        if($('warStatus'))$('warStatus').textContent='NICHT AKTIV';
        if($('opponentName'))$('opponentName').textContent='KEIN GEGNER';
        if($('ourStars'))$('ourStars').textContent='0';
        if($('enemyStars'))$('enemyStars').textContent='0';
        if($('ourAttacks'))$('ourAttacks').textContent='0';
        if($('enemyAttacks'))$('enemyAttacks').textContent='0';
        if($('ourDestruction'))$('ourDestruction').textContent='0%';
        if($('enemyDestruction'))$('enemyDestruction').textContent='0%';
        if($('warCountdown'))$('warCountdown').textContent='⏱️ Aktuell kein Krieg';
        if($('warNote'))$('warNote').textContent='Cold N\' Dark ist aktuell in keinem laufenden normalen Krieg.';
        return;
      }
      const opponent=text(w,'opponent','opponentName')||'GEGNERCLAN';
      const state=text(w,'state','status').toLowerCase();
      const size=val(w,'warSize','war_size','teamSize');
      const ourStars=num(val(w,'ourStars','our_stars'));
      const enemyStars=num(val(w,'enemyStars','enemy_stars'));
      const ourAttacks=num(val(w,'ourAttacks','our_attacks'));
      const enemyAttacks=num(val(w,'enemyAttacks','enemy_attacks'));
      const ourDest=num(val(w,'ourDestruction','our_destruction'));
      const enemyDest=num(val(w,'enemyDestruction','enemy_destruction'));
      if($('warTitle'))$('warTitle').textContent='AKTUELLER KRIEG'+(size?' • '+size+'v'+size:'');
      if($('warStatus'))$('warStatus').textContent=state==='preparation'?'VORBEREITUNG':'AKTIV';
      if($('opponentName'))$('opponentName').textContent=opponent;
      if($('ourStars'))$('ourStars').textContent=ourStars;
      if($('enemyStars'))$('enemyStars').textContent=enemyStars;
      if($('ourAttacks'))$('ourAttacks').textContent=ourAttacks;
      if($('enemyAttacks'))$('enemyAttacks').textContent=enemyAttacks;
      if($('ourDestruction'))$('ourDestruction').textContent=ourDest+'%';
      if($('enemyDestruction'))$('enemyDestruction').textContent=enemyDest+'%';
      const end=val(w,'endTime','end_time');
      if($('warCountdown'))$('warCountdown').textContent=countdown(end,val(w,'startTime','start_time'));
      if($('warNote'))$('warNote').textContent='Automatisch aktualisiert aus den aktuellen Cold-N\' Dark-Kriegsdaten.';
    }catch(e){
      console.warn('Live-Kriegsanzeige:',e);
      if($('warNote'))$('warNote').textContent='Kriegsdaten konnten gerade nicht geladen werden.';
    }
  }
  load();
  setInterval(load,60000);
})();
