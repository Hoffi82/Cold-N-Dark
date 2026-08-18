export async function onRequestGet() {
  const clanTag = '#C89CVRCP';
  // ClashKing caches responses for a few minutes. We use a 5-minute bucket
  // so the same URL is reused briefly, while avoiding an old edge response.
  const cacheBucket = Math.floor(Date.now() / 300000);
  const url = `https://api.clashk.ing/clan/${encodeURIComponent(clanTag)}/basic?refresh=${cacheBucket}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cf: { cacheTtl: 60, cacheEverything: true }
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

    // ClashKing's clan/basic response contains the current member list as
    // memberList. Keep a fallback for compatible response shapes.
    const members = Array.isArray(clan?.memberList)
      ? clan.memberList
      : Array.isArray(clan?.members)
        ? clan.members
        : Array.isArray(raw?.memberList)
          ? raw.memberList
          : [];

    if (!members.length) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'ClashKing hat keine aktuelle Mitgliederliste geliefert.'
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

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
        'Cache-Control': 'no-store, max-age=0'
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
