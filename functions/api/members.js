export async function onRequestGet() {
  const clanTag = '#C89CVRCP';
  const encodedTag = encodeURIComponent(clanTag);
  const url = `https://api.clashk.ing/clan/${encodedTag}/basic`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cf: { cacheTtl: 60, cacheEverything: true }
    });

    const text = await response.text();
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: `ClashKing hat keine gültige JSON-Antwort geliefert (HTTP ${response.status}).`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `ClashKing API antwortet mit HTTP ${response.status}.`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const members = Array.isArray(raw?.memberList)
      ? raw.memberList
      : Array.isArray(raw?.members)
        ? raw.members
        : [];

    if (!members.length) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'ClashKing hat für Cold N\' Dark momentan keine Mitgliederliste geliefert.'
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const payload = {
      ok: true,
      source: 'ClashKing',
      clanTag,
      clanName: raw?.name ?? "Cold N' Dark",
      clanLevel: raw?.clanLevel ?? null,
      memberCount: raw?.memberCount ?? members.length,
      members: members.map((member, index) => ({
        rank: member.clanRank ?? member.rank ?? index + 1,
        name: member.name ?? 'Unbekannt',
        tag: member.tag ?? '',
        role: member.role ?? 'member',
        trophies: member.trophies ?? 0,
        builderTrophies: member.builderBaseTrophies?.versusTrophies ?? member.builderBaseTrophies ?? 0,
        donations: member.donations ?? 0,
        donationsReceived: member.donationsReceived ?? 0,
        expLevel: member.expLevel ?? null,
        league: member.league?.name ?? member.league ?? null,
        townHallLevel: member.townHallLevel ?? member.townHallLevel ?? null
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
      error: `Verbindung zu ClashKing fehlgeschlagen${error?.message ? `: ${error.message}` : '.'}`
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
}
