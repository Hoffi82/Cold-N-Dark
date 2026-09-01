// Mitgliederliste für TYBMC
// Grundlage: vom Nutzer bereitgestellte Clan-Screenshots vom 31.08.2026.
window.TYBMC_MEMBERS = [
  { name: 'König Paul', role: 'admin' },
  { name: 'Niko', role: 'admin' },
  { name: 'COC Hoffi 3.0', role: 'leader' },
  { name: 'COC Hoffi 6.0', role: 'admin' },
  { name: 'COC Hoffi 9.0', role: 'admin' },
  { name: 'COC Hoffi 5.0', role: 'admin' },
  { name: 'DER.HALUNKE', role: 'admin' },
  { name: 'Lord Pinoo', role: 'member' },
  { name: 'Hoffi82', role: 'admin' },
  { name: 'DarkSun', role: 'admin' },
  { name: 'COC-CR2.0', role: 'member' },
  { name: 'Fo-Bro.82', role: 'admin' },
  { name: 'D.K', role: 'member' },
  { name: 'Joel20', role: 'admin' },
  { name: 'Giggel', role: 'admin' },
  { name: 'Giggel2', role: 'admin' },
  { name: 'Hoffi', role: 'admin' },
  { name: 'Obsidion Flux', role: 'admin' },
  { name: 'Joell', role: 'admin' },
  { name: 'Vitalevna', role: 'member' },
  { name: 'Crazy', role: 'admin' },
  { name: 'BAXTER', role: 'admin' },
  { name: 'Creed', role: 'admin' },
  { name: 'Zeus82', role: 'admin' },
  { name: 'MR.CHOC', role: 'admin' },
  { name: '(TG) Sneax', role: 'admin' },
  { name: 'COC SUCHT', role: 'coLeader' },
  { name: '(TG) Kyrro', role: 'admin' },
  { name: 'Clasher1982', role: 'admin' },
  { name: 'Golem', role: 'admin' },
  { name: 'babaBUT', role: 'admin' }
];

window.TYBMC_CLAN = {
  name: 'TYBMC',
  league: 'Gold Liga 3',
  memberCount: window.TYBMC_MEMBERS.length,
  updatedAt: '2026-08-31'
};

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('main .hero');
  if (!hero || document.getElementById('tybmcSections')) return;
  const box = document.createElement('section');
  box.id = 'tybmcSections';
  box.style.cssText = 'margin:18px 0;display:grid;grid-template-columns:1fr 1fr;gap:12px;';
  box.innerHTML = `
    <a href="tybmc-kriege.html" style="display:block;padding:18px;border:2px solid #ffc43d55;border-radius:18px;background:linear-gradient(145deg,#241531,#100c18);text-decoration:none;color:#f8f5ff;text-align:center;box-shadow:0 12px 30px #0006;">
      <div style="font-size:34px">⚔️</div><strong style="display:block;color:#ffc43d;font-size:20px;margin-top:6px">TYBMC-KRIEGE</strong><small style="display:block;color:#aaa1bb;margin-top:5px">Letzte 2 CKs &amp; aktueller Krieg</small>
    </a>
    <a href="tybmc-cwl.html" style="display:block;padding:18px;border:2px solid #ffc43d55;border-radius:18px;background:linear-gradient(145deg,#241531,#100c18);text-decoration:none;color:#f8f5ff;text-align:center;box-shadow:0 12px 30px #0006;">
      <div style="font-size:34px">🏆</div><strong style="display:block;color:#ffc43d;font-size:20px;margin-top:6px">TYBMC-CWL</strong><small style="display:block;color:#aaa1bb;margin-top:5px">CWL-Übersicht • Gold Liga 3</small>
    </a>`;
  hero.insertAdjacentElement('afterend', box);
  const style = document.createElement('style');
  style.textContent = '@media(max-width:520px){#tybmcSections{grid-template-columns:1fr!important}}';
  document.head.appendChild(style);
});

// Sicherheits-Navigation wie bei der funktionierenden Cold-N-Dark-Mitgliederseite:
// Jeder Klick auf eine TYBMC-Mitgliederkarte führt als echter Seitenaufruf zur Profilseite.
document.addEventListener('click', (event) => {
  const card = event.target.closest('.member[data-player]');
  if (!card) return;
  const name = card.getAttribute('data-player');
  if (!name) return;
  event.preventDefault();
  event.stopPropagation();
  window.location.href = 'tybmc-spielerprofil.html?name=' + encodeURIComponent(name);
}, true);
