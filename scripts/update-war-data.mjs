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
  const response = await fetch(COC_API + path, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${cocToken}`
    }
  });
  if (!response.ok) throw new Error(`Clash API HTTP ${response.status} for ${path}`);
  return response.json();
}

function itemsOf(raw) {
  return Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
}

function mapCurrentWar(war) {
  const clan = war?.clan ?? war?.ourClan ?? {};
  const opponent = war?.opponent ?? war?.enemyClan ?? {};
  const state = war?.state ?? war?.status ?? 'unknown';
  return {
    state,
    opponent: opponent?.name ?? war?.opponentName ?? '–',
    opponentTag: opponent?.tag ?? '',
    ourStars: clan?.stars ?? clan?.clanStars ?? 0,
    enemyStars: opponent?.stars ?? opponent?.clanStars ?? 0,
    ourAttacks: clan?.attacksUsed ?? clan?.attacks ?? war?.attacksUsed ?? 0,
    enemyAttacks: opponent?.attacksUsed ?? opponent?.attacks ?? 0,
    warSize: war?.teamSize ?? war?.warSize ?? clan?.members?.length ?? 0,
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
  if (!cocToken) return null;

  try {
    const current = await getCoC(`/clans/${encoded}/currentwar`);
    if (current?.state && current.state !== 'notInWar') return current;
  } catch (error) {
    console.warn(`Offizieller aktueller Krieg konnte nicht geladen werden: ${error.message}`);
  }

  // Während der CWL liefert /currentwar häufig notInWar. Deshalb die
  // League-Gruppe laden und die einzelnen War-Tags prüfen.
  try {
    const group = await getCoC(`/clans/${encoded}/currentwar/leaguegroup`);
    const warTags = [...new Set((group?.rounds ?? []).flatMap(round => round?.warTags ?? []))]
      .filter(tag => tag && tag !== '#0');

    for (const warTag of warTags) {
      try {
        const war = await getCoC(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`);
        const ownClan = war?.clan?.tag === CLAN_TAG || war?.opponent?.tag === CLAN_TAG;
        const state = String(war?.state ?? '').toLowerCase();
        if (ownClan && (state === 'inwar' || state === 'preparation')) return war;
      } catch (error) {
        console.warn(`CWL-Runde ${warTag} konnte nicht geladen werden: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`CWL-Liga-Gruppe konnte nicht geladen werden: ${error.message}`);
  }

  return null;
}

let current = null;
let source = 'ClashKing';

const officialCurrent = await getOfficialCurrentWar();
if (officialCurrent) {
  current = mapCurrentWar(officialCurrent);
  source = 'Clash of Clans API';
} else {
  try {
    const basicRaw = await getClashKing(`/v2/war/${encoded}/basic`);
    const basic = basicRaw?.data ?? basicRaw ?? {};
    const basicState = basic?.state ?? basic?.status ?? 'notInWar';
    if (basicState !== 'notInWar' && basicState !== 'unknown' && Object.keys(basic).length > 0) {
      current = mapCurrentWar(basic);
    }
  } catch (error) {
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
  previous
};

await writeFile('war-data.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`War data updated: current=${current ? current.state : 'notInWar'}, source=${source}, previous=${previous.length}`);
