export async function onRequestGet() {
  const clanTag = '#C89CVRCP';
  const url = `https://api.clashk.ing/clan/${encodeURIComponent(clanTag)}/basic`;

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
    const clan = raw?.data ?? raw;
    const members = Array.isArray(clan?.memberList)
      ? clan.memberList
      : Array.isArray(clan?.members)
        ? clan.members
        : [];

    const payload = {
      ok: true,
      source: 'ClashKing',
      clanTag,
      clanName: clan?.name ?? "Cold N' Dark",
      clanLevel: clan?.clanLevel ?? null,
      memberCount: members.length,
      members: members.map((member, index) => ({
        rank: member.clanRank ?? member.rank ?? index + 1,
        name: member.name ?? 'Unbekannt',
        tag: member.tag ?? '',
        role: member.role ?? 'member',
        trophies: member.trophies ?? 0,
        builderTrophies: member.builderBaseTrophies ?? member.versusTrophies ?? 0,
        donations: member.donations ?? 0,
        donationsReceived: member.donationsReceived ?? 0
      })),
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
