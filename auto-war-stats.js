(() => {
  const DATA_URL = 'war-data.json?v=' + Date.now();
  const $ = id => document.getElementById(id);
  const n = value => Number(value || 0);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => {
    if (!value) return '';
    const iso = String(value);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'});
  };
  const warResult = (our, enemy) => our > enemy ? 'win' : our < enemy ? 'loss' : 'draw';
  const resultLabel = r => r === 'win' ? 'SIEG' : r === 'loss' ? 'NIEDERLAGE' : 'UNENTSCHIEDEN';
  const resultClass = r => r === 'win' ? 'win' : r === 'loss' ? 'loss' : 'draw';

  function warCard(w, finished) {
    const our = n(w.ourStars), enemy = n(w.enemyStars);
    const result = warResult(our, enemy);
    return `<div class="war-card"><div class="war-head"><div class="war-name">${finished ? 'LETZTER KRIEG' : 'AKTUELLER KRIEG'}${w.warSize ? ' • ' + esc(w.warSize) : ''}</div><div class="status ${finished ? 'finished' : 'active'}">${finished ? 'BEENDET' : (w.state === 'inWar' ? 'LIVE' : 'VORBEREITUNG')}</div></div><div class="war-grid"><div class="versus"><div class="clan"><img src="Wappen.png" alt="Cold N' Dark"><b>COLD N' DARK</b></div><div class="vs">VS</div><div class="clan"><div class="shield">🛡️</div><b>${esc(w.opponent || 'GEGNERCLAN')}</b></div></div><div class="metrics"><div class="metric"><b>⭐ Sterne</b><span class="ours">${our}</span><span class="enemy">${enemy}</span></div><div class="metric"><b>⚔️ Angriffe</b><span class="ours">${n(w.ourAttacks)}</span><span class="enemy">${n(w.enemyAttacks)}</span></div><div class="metric"><b>💥 Zerstörung</b><span class="ours">${n(w.ourDestruction).toFixed(1)}%</span><span class="enemy">${n(w.enemyDestruction).toFixed(1)}%</span></div></div></div><div class="endline">${finished ? '🏁 ' + resultLabel(result) : '⚔️ Krieg läuft'}</div><div class="muted">${w.endTime ? 'Ende: ' + date(w.endTime) + ' • ' : ''}Automatisch aus Clash of Clans</div></div>`;
  }

  function normalizePrevious(w) {
    const clan = w.clan || {};
    const opponent = w.opponent || {};
    const ourStars = n(clan.stars), enemyStars = n(opponent.stars);
    return {
      opponent: opponent.name || w.opponentName || 'Unbekannter Gegner',
      warSize: w.teamSize || w.warSize || '',
      ourStars,
      enemyStars,
      ourAttacks: n(clan.attacks),
      enemyAttacks: n(opponent.attacks),
      ourDestruction: n(clan.destructionPercentage),
      enemyDestruction: n(opponent.destructionPercentage),
      endTime: w.endTime,
      result: warResult(ourStars, enemyStars),
      raw: w
    };
  }

  function historyRow(w) {
    return `<div class="history-row"><div><b>${esc(w.opponent)}</b><div class="date">${esc(w.warSize ? w.warSize + ' • ' : '')}${date(w.endTime)}</div></div><div class="score">${w.ourStars} : ${w.enemyStars}</div><div class="score">${w.ourAttacks} : ${w.enemyAttacks}</div><div class="result ${resultClass(w.result)}">${resultLabel(w.result)}</div></div>`;
  }

  function renderParticipants(current) {
    const list = Array.isArray(current?.players) ? [...current.players] : [];
    list.sort((a,b) => n(b.stars) - n(a.stars) || n(b.destruction) - n(a.destruction) || String(a.name).localeCompare(String(b.name), 'de'));
    $('participantCount').textContent = list.length + ' SPIELER';
    if (!list.length) {
      $('participants').innerHTML = '<div class="empty">👥 Keine automatischen Teilnehmerdaten vorhanden.</div>';
      return;
    }
    $('participants').innerHTML = `<div class="stats-card"><p class="stats-note">Teilnehmer des aktuellen Krieges. Die Werte werden automatisch aus Clash of Clans übernommen.</p><div class="participant-grid">${list.map((p,i) => {
      const done = n(p.attacks) > 0;
      const attack = done ? `⭐ ${n(p.stars)} • 💥 ${n(p.destruction)}%` : '⏳ Noch offen';
      return `<div class="participant"><div class="num">${i+1}</div><div class="pname">${esc(p.name)}</div><div class="pstats">⭐ ${n(p.stars)} • ⚔️ ${n(p.attacks)} • 💥 ${n(p.destruction)}%</div><div class="attack-lines"><div class="attack-line ${done?'done':'open'}"><strong>⚔️ Angriff:</strong> ${attack}</div></div></div>`;
    }).join('')}</div></div>`;
  }

  function buildPlayerStats(current, previous) {
    const map = new Map();
    const add = (name, attacks, stars, destruction, wars) => {
      if (!name) return;
      const key = String(name);
      if (!map.has(key)) map.set(key, {name:key, attacks:0, stars:0, destruction:0, wars:0});
      const p = map.get(key);
      p.attacks += n(attacks);
      p.stars += n(stars);
      p.destruction += n(destruction);
      p.wars += n(wars);
    };

    (current?.players || []).forEach(p => add(p.name, p.attacks, p.stars, p.destruction, 1));
    previous.forEach(w => (w.raw?.clan?.members || []).forEach(m => {
      const attacks = Array.isArray(m.attacks) ? m.attacks : [];
      add(m.name, attacks.length, attacks.reduce((s,a) => s + n(a.stars), 0), attacks.reduce((s,a) => s + n(a.destructionPercentage), 0), 1);
    }));

    const list = [...map.values()]
      .filter(p => p.attacks > 0)
      .map(p => ({...p, avgStars: p.stars / p.attacks, avgDestruction: p.destruction / p.attacks}))
      .sort((a,b) => b.stars - a.stars || b.avgStars - a.avgStars || b.avgDestruction - a.avgDestruction || b.attacks - a.attacks || a.name.localeCompare(b.name, 'de'));

    $('statsCount').textContent = list.length + ' SPIELER';
    if (!list.length) {
      $('playerStats').innerHTML = '<div class="empty">🏆 Noch keine automatischen Spielerstatistiken vorhanden.</div>';
      return;
    }

    $('playerStats').innerHTML = `<div class="stats-card"><p class="stats-note">Automatische Spielerstatistik aus den erfassten Kriegen. Zerstörung und Sterne werden zusätzlich als Durchschnitt pro Angriff angezeigt.</p><div class="stats-scroll"><table class="stats-table"><thead><tr><th>#</th><th>Spieler</th><th>⭐ Sterne</th><th>⚔️ Angriffe</th><th>Ø Sterne</th><th>Ø Zerstörung</th><th>Kriege</th></tr></thead><tbody>${list.map((p,i) => `<tr><td class="rank">${i+1}</td><td class="player">${esc(p.name)}</td><td class="small-stat">${p.stars}</td><td>${p.attacks}</td><td>${p.avgStars.toFixed(2)}</td><td>${p.avgDestruction.toFixed(1)}%</td><td>${p.wars}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  async function loadAutomaticStats() {
    try {
      const response = await fetch(DATA_URL, {cache:'no-store'});
      if (!response.ok) throw new Error('war-data.json konnte nicht geladen werden.');
      const data = await response.json();
      const current = data.current && data.current.state !== 'notInWar' ? data.current : null;
      const previous = Array.isArray(data.previous) ? data.previous.map(normalizePrevious).sort((a,b) => new Date(b.endTime || 0) - new Date(a.endTime || 0)) : [];

      $('currentTag').textContent = current ? 'AUTOMATISCH LIVE' : 'KEIN AKTIVER KRIEG';
      $('currentWar').innerHTML = current ? warCard(current, false) : '<div class="empty">🟢 Aktuell läuft kein Krieg.</div>';
      $('lastWar').innerHTML = previous.length ? warCard(previous[0], true) : '<div class="empty">🏁 Noch kein beendeter Krieg vorhanden.</div>';
      $('historyCount').textContent = previous.length + ' KRIEGE';
      $('history').innerHTML = previous.length ? `<div class="history">${previous.slice(0,15).map(historyRow).join('')}</div>` : '<div class="empty">📜 Noch keine automatische Kriegshistorie vorhanden.</div>';
      renderParticipants(current);
      buildPlayerStats(current, previous);
    } catch (error) {
      console.error('Automatische Kriegsstatistik:', error);
    }
  }

  loadAutomaticStats();
})();
