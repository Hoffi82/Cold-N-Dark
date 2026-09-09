import { writeFile } from 'node:fs/promises';

const CLAN_TAG = '#C89CVRCP';
const API = 'https://api.clashk.ing';
const encoded = encodeURIComponent(CLAN_TAG);

async function get(path) {
  const response = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ClashKing HTTP ${response.status} for ${path}`);
  return response.json();
}

// Der aktuelle Krieg läuft bei ClashKing über den dokumentierten v2-Endpunkt.
const basicRaw = await get(`/v2/war/${encoded}/basic`);
// Für die bisherigen Kriege bleibt der dokumentierte Legacy-Endpunkt verfügbar.
const previousRaw = await get(`/war/${encoded}/previous`);

const basic = basicRaw?.data ?? basicRaw ?? {};
const clan = basic?.clan ?? basic?.ourClan ?? {};
const opponent = basic?.opponent ?? basic?.enemyClan ?? {};
const state = basic?.state ?? basic?.status ?? 'notInWar';
const hasWar = state !== 'notInWar' && state !== 'unknown';

const current = hasWar ? {
  state,
  opponent: opponent?.name ?? basic?.opponentName ?? '–',
  opponentTag: opponent?.tag ?? '',
  ourStars: clan?.stars ?? clan?.clanStars ?? 0,
  enemyStars: opponent?.stars ?? opponent?.clanStars ?? 0,
  ourAttacks: clan?.attacksUsed ?? basic?.attacksUsed ?? 0,
  enemyAttacks: opponent?.attacksUsed ?? 0,
  warSize: basic?.teamSize ?? basic?.warSize ?? clan?.members?.length ?? 0,
  players: Array.isArray(clan?.members) ? clan.members.map(p => ({
    name: p.name ?? p.playerName ?? 'Unbekannt',
    attacks: p.attacksUsed ?? p.attacks ?? 0,
    stars: p.stars ?? p.attackStars ?? 0,
    destruction: p.destructionPercentage ?? p.destruction ?? 0
  })) : []
} : null;

const previous = Array.isArray(previousRaw)
  ? previousRaw
  : (previousRaw?.items ?? previousRaw?.data ?? []);

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
