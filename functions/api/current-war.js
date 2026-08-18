export async function onRequestGet() {
  const clanTag = '#C89CVRCP';
  const url = `https://api.clashk.ing/war/${encodeURIComponent(clanTag)}/basic`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `ClashKing API antwortet mit HTTP ${response.status}`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const raw = await response.json();
    const war = raw?.data ?? raw;
    const clan = war?.clan ?? war?.ourClan ?? {};
    const opponent = war?.opponent ?? war?.enemyClan ?? {};

    const players = Array.isArray(clan?.members) ? clan.members.map(p => ({
      name: p.name ?? p.playerName ?? 'Unbekannt',
      attacks: p.attacksUsed ?? p.attacks ?? 0,
      stars: p.stars ?? p.attackStars ?? 0
    })) : [];

    const payload = {
      ok: true,
      source: 'ClashKing',
      clanTag,
      status: war?.state ?? war?.status ?? 'unknown',
      opponent: opponent?.name ?? war?.opponentName ?? '–',
      ourStars: clan?.stars ?? clan?.clanStars ?? 0,
      enemyStars: opponent?.stars ?? opponent?.clanStars ?? 0,
      attacks: clan?.attacksUsed ?? war?.attacksUsed ?? 0,
      participants: clan?.members?.length ?? war?.participants ?? players.length,
      players,
      fetchedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'ClashKing konnte nicht erreicht werden.'
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
}
