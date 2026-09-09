import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const API = 'https://api.clashk.ing';
const encoded = encodeURIComponent(CLAN_TAG);

async function get(path) {
  const response = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClashKing HTTP ${response.status} for ${path}`);
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

const basicRaw = await get(`/v2/war/${encoded}/basic`);
const basic = basicRaw?.data ?? basicRaw ?? {};
let current = null;

const basicState = basic?.state ?? basic?.status ?? 'notInWar';
if (basicState !== 'notInWar' && basicState !== 'unknown' && Object.keys(basic).length > 0) {
  current = mapCurrentWar(basic);
} else {
  // ClashKing's basic endpoint covers normal wars. During CWL it can report
  // notInWar, so also check the stored CWL wars for an active round.
  try {
    const cwlRaw = await get(`/v2/clan/${encoded}/wars?type=cwl&limit=5`);
    const cwlWars = itemsOf(cwlRaw);
    const activeCwl = cwlWars
      .filter(w => {
        const clanTag = w?.clan?.tag ?? w?.ourClan?.tag ?? '';
        const state = String(w?.state ?? '').toLowerCase();
        return clanTag === CLAN_TAG && (state === 'inwar' || state === 'preparation');
      })
      .sort((a, b) => String(b?.endTime ?? '').localeCompare(String(a?.endTime ?? '')))[0];
    if (activeCwl) current = mapCurrentWar(activeCwl);
  } catch (error) {
    console.warn(`Aktuelle CWL konnte nicht geladen werden: ${error.message}`);
  }
}

let previous = [];
try {
  const warsRaw = await get(`/v2/clan/${encoded}/wars?limit=15`);
  previous = itemsOf(warsRaw);
} catch (error) {
  console.warn(`Kriegsverlauf konnte nicht geladen werden: ${error.message}`);
}

const payload = {
  ok: true,
  clanTag: CLAN_TAG,
  source: 'ClashKing',
  fetchedAt: new Date().toISOString(),
  current,
  previous
};

await writeFile('war-data.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`War data updated: current=${current ? current.state : 'notInWar'}, previous=${previous.length}`);
