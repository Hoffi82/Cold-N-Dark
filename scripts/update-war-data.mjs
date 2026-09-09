import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const CLASHKING_API = 'https://api.clashk.ing';
const COC_API = 'https://api.clashofclans.com/v1';
const encoded = encodeURIComponent(CLAN_TAG);
const cocToken = process.env.CLASH_API_TOKEN?.trim() || '';

async function getClashKing(path) {
  const response = await fetch(CLASHKING_API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClashKing HTTP ${response.status} for ${path}`);
  return response.json();
}

async function getCoC(path) {
  if (!cocToken) throw new Error('CLASH_API_TOKEN fehlt');
  const response = await fetch(COC_API + path, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${cocToken}` }
  });
  if (!response.ok) throw new Error(`Clash API HTTP ${response.status} for ${path}`);
  return response.json();
}

function itemsOf(raw) {
  return Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
}

function mapCurrentWar(war, isCwl = false) {
  let clan = war?.clan ?? {};
  let opponent = war?.opponent ?? {};
  // In a CWL war response our clan can be in either side. Always put
  // Cold N' Dark into the "clan" side used by the website.
  if (opponent?.tag === CLAN_TAG && clan?.tag !== CLAN_TAG) [clan, opponent] = [opponent, clan];
  const state = war?.state ?? war?.status ?? 'unknown';
  return {
    state,
    type: isCwl ? 'cwl' : 'war',
    attacksPerMember: war?.attacksPerMember ?? (isCwl ? 1 : 2),
    opponent: opponent?.name ?? war?.opponentName ?? '–',
    opponentTag: opponent?.tag ?? '',
    ourStars: clan?.stars ?? clan?.clanStars ?? 0,
    enemyStars: opponent?.stars ?? opponent?.clanStars ?? 0,
    ourAttacks: clan?.attacks ?? clan?.attacksUsed ?? 0,
    enemyAttacks: opponent?.attacks ?? opponent?.attacksUsed ?? 0,
    warSize: war?.teamSize ?? war?.warSize ?? clan?.members?.length ?? 0,
    preparationStartTime: war?.preparationStartTime ?? '',
    startTime: war?.startTime ?? '',
    endTime: war?.endTime ?? '',
    players: Array.isArray(clan?.members) ? clan.members.map(p => {
      const attacks = Array.isArray(p.attacks) ? p.attacks : [];
      return {
        name: p.name ?? p.playerName ?? 'Unbekannt',
        attacks: p.attacksUsed ?? p.attacksCount ?? attacks.length,
        stars: p.stars ?? attacks.reduce((sum, a) => sum + Number(a?.stars || 0), 0),
        destruction: p.destructionPercentage ?? p.destruction ?? attacks.reduce((max, a) => Math.max(max, Number(a?.destructionPercentage || 0)), 0)
      };
    }) : []
  };
}

async function getOfficialCurrentWar() {
  // Normal clan war.
  try {
    const current = await getCoC(`/clans/${encoded}/currentwar`);
    if (current?.state && current.state !== 'notInWar') return { war: current, isCwl: false };
  } catch (error) {
    console.warn(`Offizieller aktueller Krieg konnte nicht geladen werden: ${error.message}`);
  }

  // CWL: /currentwar returns notInWar, so inspect the current league group.
  try {
    const group = await getCoC(`/clans/${encoded}/currentwar/leaguegroup`);
    const rounds = Array.isArray(group?.rounds) ? group.rounds : [];
    const warTags = [...new Set(rounds.flatMap(round => Array.isArray(round?.warTags) ? round.warTags : []))]
      .filter(tag => tag && tag !== '#0');

    const wars = [];
    for (const warTag of warTags) {
      try {
        const war = await getCoC(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`);
        const ownClan = war?.clan?.tag === CLAN_TAG || war?.opponent?.tag === CLAN_TAG;
        if (ownClan) wars.push({ war, isCwl: true });
      } catch (error) {
        console.warn(`CWL-Runde ${warTag} konnte nicht geladen werden: ${error.message}`);
      }
    }

    // Prefer an active preparation/war round. If none is active, keep the
    // newest CWL war as a fallback so the page never silently loses the data.
    const active = wars.filter(({ war }) => ['inwar', 'preparation'].includes(String(war?.state || '').toLowerCase()));
    if (active.length) {
      active.sort((a, b) => String(b.war?.startTime || b.war?.preparationStartTime || '').localeCompare(String(a.war?.startTime || a.war?.preparationStartTime || '')));
      return active[0];
    }
  } catch (error) {
    console.warn(`CWL-Liga-Gruppe konnte nicht geladen werden: ${error.message}`);
  }

  return null;
}

let current = null;
let source = 'ClashKing';
let currentError = '';

if (cocToken) {
  const officialCurrent = await getOfficialCurrentWar();
  if (officialCurrent) {
    current = mapCurrentWar(officialCurrent.war, officialCurrent.isCwl);
    source = officialCurrent.isCwl ? 'Clash of Clans API – CWL' : 'Clash of Clans API';
  }
} else {
  currentError = 'CLASH_API_TOKEN fehlt';
  console.warn(currentError);
}

// Fallback for normal wars through ClashKing.
if (!current) {
  try {
    const basicRaw = await getClashKing(`/v2/war/${encoded}/basic`);
    const basic = basicRaw?.data ?? basicRaw ?? {};
    const basicState = basic?.state ?? basic?.status ?? 'notInWar';
    if (basicState !== 'notInWar' && basicState !== 'unknown' && Object.keys(basic).length > 0) {
      current = mapCurrentWar(basic, false);
      source = 'ClashKing';
    }
  } catch (error) {
    currentError = currentError || error.message;
    console.warn(`ClashKing aktueller Krieg konnte nicht geladen werden: ${error.message}`);
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
