// Manuelle Mitgliederliste für Cold N' Dark
// Die Daten werden anhand der bestätigten Clan-Screenshots gepflegt.
window.COLD_N_DARK_MEMBERS = [
  { name: 'Vanille Waffel', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'Coc Hoffi', role: 'leader', trophies: 0, townHallLevel: 18 },
  { name: 'The Next Level', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'Sebastian II', role: 'coLeader', trophies: 0, townHallLevel: 18 },
  { name: 'KampfKeks', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'Kalle', role: 'coLeader', trophies: 0, townHallLevel: 18 },
  { name: 'CoC-CR', role: 'coLeader', trophies: 0, townHallLevel: 18 },
  { name: 'duster', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'King Olli', role: 'coLeader', trophies: 0, townHallLevel: 18 },
  { name: 'Lucas', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'Duster 1.0', role: 'coLeader', trophies: 0, townHallLevel: 18 },
  { name: 'MosKito', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'Rocky', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'BlackDragon', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'Rhodos', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'Duster 2.0', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'SilverStar', role: 'member', trophies: 0, townHallLevel: 18 },
  { name: 'KallChen', role: 'admin', trophies: 0, townHallLevel: 18 },
  { name: 'Tim', role: 'admin', trophies: 0, townHallLevel: 17 },
  { name: 'Duster 3.0', role: 'admin', trophies: 0, townHallLevel: 17 },
  { name: 'ORIGIN170', role: 'coLeader', trophies: 0, townHallLevel: 17 },
  { name: 'Kallee', role: 'member', trophies: 0, townHallLevel: 17 },
  { name: 'Route66', role: 'member', trophies: 0, townHallLevel: 17 },
  { name: 'Duster 4.0', role: 'admin', trophies: 0, townHallLevel: 17 },
  { name: 'TinkerBell', role: 'admin', trophies: 0, townHallLevel: 17 },
  { name: '1Nicky43', role: 'member', trophies: 0, townHallLevel: 16 },
  { name: 'Hoffi8211', role: 'member', trophies: 0, townHallLevel: 16 },
  { name: 'King', role: 'admin', trophies: 0, townHallLevel: 16 },
  { name: 'WiQUBR', role: 'admin', trophies: 0, townHallLevel: 16 },
  { name: 'Leon', role: 'admin', trophies: 0, townHallLevel: 15 }
];

window.COLD_N_DARK_CLAN = {
  memberCount: window.COLD_N_DARK_MEMBERS.length,
  clanLevel: 26,
  updatedAt: '2026-08-25'
};

(function () {
  const form = document.getElementById('clasherLoginForm');
  const registerTab = document.getElementById('registerTab');
  const nameInput = document.getElementById('clasherName');
  const passwordInput = document.getElementById('clasherPassword');
  const msg = document.getElementById('loginMsg');
  if (!form || !registerTab || !nameInput || !passwordInput || !msg || !window.supabase) return;

  const SUPABASE_URL = 'https://jvgqvtnqncelbhuordzy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4PusmhJVMm0b3Bm-2Y-FPQ__tnZZzZO';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const endpoint = SUPABASE_URL + '/functions/v1/clasher-register';
  const emailFor = (name) => 'clasher+' + encodeURIComponent(name.trim().toLowerCase()).replace(/%/g, '') + '@coldndark.de';

  form.addEventListener('submit', async function (event) {
    if (!registerTab.classList.contains('active')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    msg.className = 'login-msg';
    msg.textContent = 'Registrierung wird angelegt …';

    const name = nameInput.value.trim();
    const password = passwordInput.value;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ name, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Registrierung fehlgeschlagen.');

      const { data, error } = await db.auth.signInWithPassword({ email: result.email || emailFor(name), password });
      if (error) throw error;

      const box = document.getElementById('loginStatus');
      const displayName = data.session?.user?.user_metadata?.display_name || name;
      if (box && data.session) {
        box.innerHTML = '<div class="login-status"><span>✅ Angemeldet als <strong>' + String(displayName).replace(/[&<>]/g, '') + '</strong></span><button class="logout-btn" id="logoutBtn">Abmelden</button></div>';
        document.getElementById('logoutBtn').onclick = async () => { await db.auth.signOut(); location.reload(); };
      }
      form.style.display = 'none';
      msg.className = 'login-msg ok';
      msg.textContent = '✅ Registrierung erfolgreich. Du bist jetzt angemeldet.';
    } catch (error) {
      console.error(error);
      msg.className = 'login-msg error';
      msg.textContent = '❌ ' + (error.message || 'Registrierung fehlgeschlagen.');
    }
  }, true);
})();
