import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const API = 'https://api.clashk.ing';
const encoded = encodeURIComponent(CLAN_TAG);

async function get(path) {
  const response = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClashKing HTTP ${response.status} for ${path}`);
  return response.json();
}

const basicRaw = await get(`/v2/war/${encoded}/basic`);

const basic = basicRaw?.data ?? basicRaw ?? {};
const clan = basic?.clan ?? basic?.ourClan ?? {};
const opponent = basic?.opponent ?? basic?.enemyClan ?? {};
const state = basic?.state ?? basic?.status ?? 'notInWar';
const hasWar = state !== 'notInWar' && state !== 'unknown' && Object.keys(basic).length > 0;

const current = hasWar ? {
  state,
  opponent: opponent?.name ?? basic?.opponentName ?? '–',
  opponentTag: opponent?.tag ?? '',
  ourStars: clan?.stars ?? clan?.clanStars ?? 0,
  enemyStars: opponent?.stars ?? opponent?.clanStars ?? 0,
  ourAttacks: clan?.attacksUsed ?? clan?.attacks ?? basic?.attacksUsed ?? 0,
  enemyAttacks: opponent?.attacksUsed ?? opponent?.attacks ?? 0,
  warSize: basic?.teamSize ?? basic?.warSize ?? clan?.members?.length ?? 0,
  players: Array.isArray(clan?.members) ? clan.members.map(p => {
    const attacks = Array.isArray(p.attacks) ? p.attacks : [];
    return {
      name: p.name ?? p.playerName ?? 'Unbekannt',
      attacks: p.attacksUsed ?? p.attacksCount ?? attacks.length,
      stars: p.stars ?? attacks.reduce((sum, a) => sum + Number(a?.stars || 0), 0),
      destruction: p.destructionPercentage ?? p.destruction ?? attacks.reduce((max, a) => Math.max(max, Number(a?.destructionPercentage || 0)), 0)
    };
  }) : []
} : null;

let previous = [];
try {
  const warsRaw = await get(`/v2/clan/${encoded}/wars?limit=15`);
  previous = Array.isArray(warsRaw)
    ? warsRaw
    : (warsRaw?.items ?? warsRaw?.data ?? []);
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
