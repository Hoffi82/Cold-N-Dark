import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const CLASHKING_API = 'https://api.clashk.ing';
const encoded = encodeURIComponent(CLAN_TAG);

async function getClashKing(path) {
  const response = await fetch(CLASHKING_API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClashKing HTTP ${response.status} for ${path}`);
  return response.json();
}

function itemsOf(raw) {
  return Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
}

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

async function getCurrentCwl() {
  try {
    // The public group endpoint returns the CWL round as war tags. The
    // season-specific legacy endpoint hydrates those tags into full war data.
    const groupRaw = await getClashKing(`/v2/cwl/${encoded}/group`);
    const group = groupRaw?.data ?? groupRaw ?? {};
    const season = group?.season;
    if (!season) return null;

    const fullRaw = await getClashKing(`/cwl/${encoded}/${encodeURIComponent(season)}`);
    const fullGroup = fullRaw?.data ?? fullRaw ?? {};
    const rounds = Array.isArray(fullGroup?.rounds) ? fullGroup.rounds : [];

    const wars = rounds.flatMap(round => Array.isArray(round?.warTags) ? round.warTags : [])
      .filter(war => war && typeof war === 'object' && (war?.clan?.tag === CLAN_TAG || war?.opponent?.tag === CLAN_TAG));

    const active = wars.filter(war => ['inwar', 'inWar', 'preparation'].includes(String(war?.state || '')));
    if (!active.length) return null;

    active.sort((a, b) => String(b?.startTime || b?.preparationStartTime || '').localeCompare(String(a?.startTime || a?.preparationStartTime || '')));
    return active[0];
  } catch (error) {
    console.warn(`CWL über ClashKing konnte nicht geladen werden: ${error.message}`);
    return null;
  }
}

let current = null;
let source = 'ClashKing';
let currentError = '';

// CWL first: ClashKing provides the public CWL group and hydrated round data,
// avoiding the IP restriction of the official CoC API on GitHub runners.
const cwlCurrent = await getCurrentCwl();
if (cwlCurrent) {
  current = mapCurrentWar(cwlCurrent, true);
  source = 'ClashKing – CWL';
}

// Normal war fallback through ClashKing's current-war pointer.
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
    currentError = error.message;
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
