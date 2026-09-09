const CND_BOT = (() => {
  let data = null;
  const normalize = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const num = v => Number(v || 0);
  const current = () => data?.current || null;
  function warText() {
    const w = current();
    if (!w) return data?.currentError ? `⚠️ Die aktuellen Kriegsdaten konnten noch nicht geladen werden (${data.currentError}). Die automatische Aktualisierung läuft weiter.` : '🏁 Aktuell ist laut den letzten Kriegsdaten kein laufender Krieg eingetragen.';
    const state = normalize(w.state);
    const status = state === 'war day' || state === 'warday' || state === 'inwar' ? 'Kriegstag' : state === 'preparation' ? 'Vorbereitung' : (w.state || 'Aktiv');
    const our = num(w.ourStars), enemy = num(w.enemyStars), oa = num(w.ourAttacks), ea = num(w.enemyAttacks);
    const kind = w.type === 'cwl' ? '🏆 CWL' : '⚔️ Clan-Krieg';
    return `${kind} – ${status}: Cold N' Dark ${our}:${enemy} gegen ${w.opponent || 'Gegner'}. Angriffe: ${oa}:${ea}. Krieggröße: ${w.warSize || '–'}.`;
  }
  function openAttacksText() {
    const w = current();
    if (!w || !Array.isArray(w.players)) return 'ℹ️ Für den aktuellen Krieg sind noch keine Teilnehmerdaten verfügbar.';
    const maxAttacks = num(w.attacksPerMember) || (w.type === 'cwl' ? 1 : 2);
    const open = w.players.filter(p => num(p.attacks) < maxAttacks);
    if (!open.length) return `✅ Nach den vorhandenen Daten haben alle Teilnehmer ihre ${maxAttacks} Angriff${maxAttacks === 1 ? '' : 'e'} gemacht.`;
    return `⚠️ Noch nicht ${maxAttacks} Angriff${maxAttacks === 1 ? '' : 'e'} gemacht: ${open.map(p => `${p.name} (${num(p.attacks)}/${maxAttacks})`).join(', ')}`;
  }
  function playerText(q) {
    const w = current();
    if (!w || !Array.isArray(w.players)) return 'ℹ️ Aktuell sind keine Teilnehmerdaten geladen.';
    const s = normalize(q);
    const p = w.players.find(x => s.includes(normalize(x.name)));
    if (!p) return '👤 Ich finde diesen Spieler nicht in den aktuellen Teilnehmerdaten.';
    return `👤 ${p.name}: ${num(p.attacks)} Angriff${num(p.attacks) === 1 ? '' : 'e'}, ${num(p.stars)} ⭐ und ${num(p.destruction)}% Zerstörung.`;
  }
  function answer(q) {
    const s = normalize(q);
    if (!s) return 'Schreib mir eine Frage. 🙂';
    if (/(wer|welche|spieler|mitglied).*(offen|angriff|noch)/.test(s) || /offen.*angriff/.test(s)) return openAttacksText();
    if (/wie.*(steht|stand)|kriegsstand|krieg.*(stand|score)|gegner|aktueller krieg/.test(s)) return warText();
    if (/angriff/.test(s) && /(wer|noch|offen)/.test(s)) return openAttacksText();
    if (/cwl/.test(s)) return warText();
    if (/mitglieder|mitglied|clan/.test(s) && !/krieg/.test(s)) return '👥 Die Mitgliederübersicht findest du im Bereich Mitglieder. Bei einem aktuellen Krieg kann ich auch die Teilnehmerdaten auswerten.';
    if (/hilfe|help|was kannst|frage/.test(s)) return '🤖 Ich kann den aktuellen Krieg auswerten, den Spielstand nennen, offene Angriffe anzeigen und nach Teilnehmern suchen. Außerdem helfe ich bei CWL und Mitgliedern.';
    if (current()?.players?.length) return playerText(q);
    return 'Das weiß ich im Moment noch nicht. Versuch es mit „Wie steht der Krieg?“, „Wer hat noch Angriffe offen?“ oder dem Namen eines Spielers.';
  }
  async function loadData() {
    try { const r = await fetch('war-data.json?v=' + Date.now(), {cache:'no-store'}); if (r.ok) data = await r.json(); } catch (_) { data = null; }
  }
  function init() {
    if (document.getElementById('cnd-bot')) return;
    const style = document.createElement('style');
    style.textContent = `#cnd-bot{position:fixed;right:16px;bottom:82px;z-index:1000;font-family:system-ui,Arial,sans-serif}#cnd-bot button{font:inherit}#cnd-bot-toggle{width:58px;height:58px;border:1px solid #ffc43d88;border-radius:50%;background:linear-gradient(135deg,#ffc43d,#ff9f1c);color:#171122;font-size:27px;box-shadow:0 8px 24px #0009;cursor:pointer}#cnd-bot-box{display:none;width:min(350px,calc(100vw - 32px));margin-bottom:10px;border:1px solid #ffc43d55;border-radius:18px;background:#171122f7;color:#f7f4ff;box-shadow:0 15px 40px #000b;overflow:hidden}#cnd-bot-head{padding:14px 16px;background:#21172e;border-bottom:1px solid #ffffff18;font-weight:900;color:#ffc43d}#cnd-bot-msg{padding:14px 16px;color:#c9c2d3;font-size:13px;line-height:1.5;min-height:72px}#cnd-bot-form{display:flex;gap:8px;padding:10px;border-top:1px solid #ffffff18}#cnd-bot-input{flex:1;min-width:0;border:1px solid #ffffff22;border-radius:12px;background:#0e0a14;color:#fff;padding:10px;outline:none}#cnd-bot-send{border:0;border-radius:12px;padding:0 13px;background:#ffc43d;color:#171122;font-weight:900;cursor:pointer}@media(max-width:390px){#cnd-bot{right:10px;bottom:78px}}`;
    document.head.appendChild(style);
    const wrap = document.createElement('div'); wrap.id = 'cnd-bot';
    wrap.innerHTML = `<div id="cnd-bot-box"><div id="cnd-bot-head">🤖 Cold N' Dark Bot</div><div id="cnd-bot-msg">Hallo! 👋 Ich kann jetzt die aktuellen Kriegsdaten auswerten. Frag mich z. B. „Wie steht der Krieg?“ oder „Wer hat noch Angriffe offen?“</div><form id="cnd-bot-form"><input id="cnd-bot-input" autocomplete="off" placeholder="Deine Frage …"><button id="cnd-bot-send">Senden</button></form></div><button id="cnd-bot-toggle" aria-label="Clan-Bot öffnen">🤖</button>`;
    document.body.appendChild(wrap);
    const box = wrap.querySelector('#cnd-bot-box'), msg = wrap.querySelector('#cnd-bot-msg'), input = wrap.querySelector('#cnd-bot-input');
    wrap.querySelector('#cnd-bot-toggle').onclick = () => { box.style.display = box.style.display === 'block' ? 'none' : 'block'; if (box.style.display === 'block') input.focus(); };
    wrap.querySelector('#cnd-bot-form').onsubmit = async e => { e.preventDefault(); if (!data) await loadData(); msg.textContent = answer(input.value); input.value = ''; };
    loadData();
  }
  return {init};
})();
document.addEventListener('DOMContentLoaded', CND_BOT.init);