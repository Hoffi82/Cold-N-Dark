const CND_BOT = (() => {
  const answers = [
    { keys:['krieg','kriegsstand','kriegstand','gegner'], text:'Ich kann den aktuellen Krieg aus den automatisch aktualisierten Kriegsdaten anzeigen.' },
    { keys:['cwl'], text:'Die CWL-Daten werden automatisch aktualisiert. Öffne den CWL-Bereich für die vollständige Übersicht.' },
    { keys:['mitglied','spieler','clan'], text:'Die aktuelle Mitgliederübersicht findest du im Bereich Mitglieder.' },
    { keys:['hilfe','help','was kannst'], text:'Ich kann dir bei Krieg, CWL, Mitgliedern und den Bereichen der Clan-Seite helfen.' }
  ];
  function normalize(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function answer(q){
    const s=normalize(q);
    if(!s) return 'Schreib mir eine Frage. 🙂';
    for(const a of answers) if(a.keys.some(k=>s.includes(k))) return a.text;
    return 'Das weiß ich im Moment noch nicht. Versuch es mit „Krieg“, „CWL“, „Mitglieder“ oder „Hilfe“. 🙂';
  }
  function init(){
    if(document.getElementById('cnd-bot')) return;
    const style=document.createElement('style');
    style.textContent=`#cnd-bot{position:fixed;right:16px;bottom:82px;z-index:1000;font-family:system-ui,Arial,sans-serif}#cnd-bot button{font:inherit}#cnd-bot-toggle{width:58px;height:58px;border:1px solid #ffc43d88;border-radius:50%;background:linear-gradient(135deg,#ffc43d,#ff9f1c);color:#171122;font-size:27px;box-shadow:0 8px 24px #0009;cursor:pointer}#cnd-bot-box{display:none;width:min(340px,calc(100vw - 32px));margin-bottom:10px;border:1px solid #ffc43d55;border-radius:18px;background:#171122f7;color:#f7f4ff;box-shadow:0 15px 40px #000b;overflow:hidden}#cnd-bot-head{padding:14px 16px;background:#21172e;border-bottom:1px solid #ffffff18;font-weight:900;color:#ffc43d}#cnd-bot-msg{padding:14px 16px;color:#c9c2d3;font-size:13px;line-height:1.45;min-height:72px}#cnd-bot-form{display:flex;gap:8px;padding:10px;border-top:1px solid #ffffff18}#cnd-bot-input{flex:1;min-width:0;border:1px solid #ffffff22;border-radius:12px;background:#0e0a14;color:#fff;padding:10px;outline:none}#cnd-bot-send{border:0;border-radius:12px;padding:0 13px;background:#ffc43d;color:#171122;font-weight:900;cursor:pointer}@media(max-width:390px){#cnd-bot{right:10px;bottom:78px}}`;
    document.head.appendChild(style);
    const wrap=document.createElement('div'); wrap.id='cnd-bot';
    wrap.innerHTML=`<div id="cnd-bot-box"><div id="cnd-bot-head">🤖 Cold N' Dark Bot</div><div id="cnd-bot-msg">Hallo! 👋 Frag mich etwas über Krieg, CWL oder Mitglieder.</div><form id="cnd-bot-form"><input id="cnd-bot-input" autocomplete="off" placeholder="Deine Frage …"><button id="cnd-bot-send">Senden</button></form></div><button id="cnd-bot-toggle" aria-label="Clan-Bot öffnen">🤖</button>`;
    document.body.appendChild(wrap);
    const box=wrap.querySelector('#cnd-bot-box'), msg=wrap.querySelector('#cnd-bot-msg'), input=wrap.querySelector('#cnd-bot-input');
    wrap.querySelector('#cnd-bot-toggle').onclick=()=>{box.style.display=box.style.display==='block'?'none':'block';if(box.style.display==='block')input.focus()};
    wrap.querySelector('#cnd-bot-form').onsubmit=e=>{e.preventDefault();msg.textContent=answer(input.value);input.value='';};
  }
  return {init};
})();
document.addEventListener('DOMContentLoaded',CND_BOT.init);