import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const CLASHKING_API = 'https://api.clashk.ing';
const COC_PROXY_API = 'https://proxy.clashk.ing/v1';
const encoded = encodeURIComponent(CLAN_TAG);

async function getJson(base, path) {
  const response = await fetch(base + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${base}${path}`);
  return response.json();
}

async function getClashKing(path) { return getJson(CLASHKING_API, path); }
async function getCocProxy(path) { return getJson(COC_PROXY_API, path); }
function itemsOf(raw) { return Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []); }

function mapCurrentWar(war, isCwl = false) {
  let clan = war?.clan ?? {};
  let opponent = war?.opponent ?? {};
  if (opponent?.tag === CLAN_TAG && clan?.tag !== CLAN_TAG) [clan, opponent] = [opponent, clan];
  const state = war?.state ?? war?.status ?? 'unknown';
  return {
    state,
    type: isCwl ? 'cwl' : 'war',
    attacksPerMember: war?.attacksPerMember ?? (isCwl ? 1 : 2),
    opponent: opponent?.name ?? '–',
    opponentTag: opponent?.tag ?? '',
    ourStars: clan?.stars ?? 0,
    enemyStars: opponent?.stars ?? 0,
    ourAttacks: clan?.attacks ?? 0,
    enemyAttacks: opponent?.attacks ?? 0,
    ourDestruction: clan?.destructionPercentage ?? 0,
    enemyDestruction: opponent?.destructionPercentage ?? 0,
    warSize: war?.teamSize ?? clan?.members?.length ?? 0,
    preparationStartTime: war?.preparationStartTime ?? '',
    startTime: war?.startTime ?? '',
    endTime: war?.endTime ?? '',
    players: Array.isArray(clan?.members) ? clan.members.map(p => {
      const attacks = Array.isArray(p.attacks) ? p.attacks : [];
      return {
        name: p.name ?? 'Unbekannt',
        attacks: attacks.length,
        stars: attacks.reduce((sum, a) => sum + Number(a?.stars || 0), 0),
        destruction: attacks.reduce((max, a) => Math.max(max, Number(a?.destructionPercentage || 0)), 0)
      };
    }) : []
  };
}

function isActiveWar(war) {
  return ['inwar', 'inWar', 'preparation'].includes(String(war?.state ?? war?.status ?? ''));
}

function pickActiveWar(wars) {
  const active = wars
    .filter(war => war && (war?.clan?.tag === CLAN_TAG || war?.opponent?.tag === CLAN_TAG))
    .filter(isActiveWar);
  active.sort((a, b) => String(b?.startTime || b?.preparationStartTime || '').localeCompare(String(a?.startTime || a?.preparationStartTime || '')));
  return active[0] ?? null;
}

async function getCurrentCwlViaProxy() {
  const groupRaw = await getCocProxy(`/clans/${encoded}/currentwar/leaguegroup`);
  const group = groupRaw?.data ?? groupRaw ?? {};
  const rounds = Array.isArray(group?.rounds) ? group.rounds : [];
  const warTags = rounds.flatMap(round => Array.isArray(round?.warTags) ? round.warTags : [])
    .filter(tag => typeof tag === 'string' && tag && tag !== '#0');
  const wars = [];
  for (const warTag of [...new Set(warTags)]) {
    try {
      const warRaw = await getCocProxy(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`);
      const war = warRaw?.data ?? warRaw ?? {};
      if (war?.clan || war?.opponent) wars.push(war);
    } catch (error) {
      console.warn(`CWL-War ${warTag} konnte über den CoC-Proxy nicht geladen werden: ${error.message}`);
    }
  }
  return pickActiveWar(wars);
}

async function getCurrentCwlViaClashKing() {
  const groupRaw = await getClashKing(`/v2/cwl/${encoded}/group`);
  const group = groupRaw?.data ?? groupRaw ?? {};
  const season = group?.season;
  if (!season) return null;
  const fullRaw = await getClashKing(`/cwl/${encoded}/${encodeURIComponent(season)}`);
  const fullGroup = fullRaw?.data ?? fullRaw ?? {};
  const rounds = Array.isArray(fullGroup?.rounds) ? fullGroup.rounds : [];
  const wars = rounds.flatMap(round => Array.isArray(round?.warTags) ? round.warTags : [])
    .filter(war => war && typeof war === 'object');
  return pickActiveWar(wars);
}

async function getCurrentCwl() {
  try { const current = await getCurrentCwlViaProxy(); if (current) return current; }
  catch (error) { console.warn(`CWL über CoC-Proxy konnte nicht geladen werden: ${error.message}`); }
  try { const current = await getCurrentCwlViaClashKing(); if (current) return current; }
  catch (error) { console.warn(`CWL über ClashKing konnte nicht geladen werden: ${error.message}`); }
  return null;
}

let current = null;
let source = 'ClashKing';
let currentError = '';

// Aktuellen normalen Krieg direkt über die offizielle CoC-API prüfen.
// CLASH_API_TOKEN wird nur serverseitig im GitHub-Workflow verwendet.
try {
  if (!process.env.CLASH_API_TOKEN) throw new Error('CLASH_API_TOKEN fehlt in GitHub Actions.');
  const response = await fetch(`https://api.clashofclans.com/v1/clans/${encoded}/currentwar`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} bei der offiziellen CoC-API.`);
  const basic = await response.json();
  const basicState = String(basic?.state ?? basic?.status ?? 'notInWar');
  console.log(`CoC-API aktueller Krieg: HTTP ${response.status}, state=${basicState}, clan=${basic?.clan?.name || '–'}, opponent=${basic?.opponent?.name || '–'}`);
  if (['inWar', 'inwar', 'preparation'].includes(basicState) && Object.keys(basic).length > 0) {
    current = mapCurrentWar(basic, false);
    source = 'Offizielle Clash-of-Clans-API – Normaler Krieg';
  }
} catch (error) {
  currentError = error.message;
  console.warn(`Offizielle CoC-API aktueller Krieg konnte nicht geladen werden: ${error.message}`);
}

// Falls die offizielle API keinen aktiven normalen Krieg liefert, CWL als Fallback prüfen.
if (!current) {
  try {
    const basicRaw = await getClashKing(`/v2/war/${encoded}/basic`);
    const basic = basicRaw?.data ?? basicRaw ?? {};
    const basicState = String(basic?.state ?? basic?.status ?? 'notInWar');
    console.log(`ClashKing-Fallback aktueller Krieg: state=${basicState}`);
  } catch (error) {
    console.warn(`ClashKing-Fallback konnte nicht geladen werden: ${error.message}`);
  }
  const cwlCurrent = await getCurrentCwl();
  if (cwlCurrent) {
    current = mapCurrentWar(cwlCurrent, true);
    source = 'ClashKing/CoC-Proxy – CWL';
  }
}

let previous = [];
try {
  const warsRaw = await getClashKing(`/v2/clan/${encoded}/wars?limit=15`);
  previous = itemsOf(warsRaw);
} catch (error) {
  console.warn(`Kriegsverlauf konnte nicht geladen werden: ${error.message}`);
}

const payload = {
  ok: true,
  clanTag: CLAN_TAG,
  source,
  fetchedAt: new Date().toISOString(),
  current,
  currentError,
  previous
};

await writeFile('war-data.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`War data updated: current=${current ? current.state : 'notInWar'}, source=${source}, previous=${previous.length}`);
if (currentError) console.log(`Current-war diagnostic: ${currentError}`);