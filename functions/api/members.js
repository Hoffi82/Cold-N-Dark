export async function onRequestGet(context) {
  const clanTag = '#C89CVRCP';
  const token = typeof context.env.CLASH_API_TOKEN === 'string'
    ? context.env.CLASH_API_TOKEN.trim()
    : '';

  if (!token) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'CLASH_API_TOKEN ist in Cloudflare noch nicht eingerichtet.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const encodedTag = encodeURIComponent(clanTag);
  const url = `https://cocproxy.royaleapi.dev/v1/clans/${encodedTag}/members`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'auth': token
      }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let detail = '';
      try {
        const errorBody = JSON.parse(text);
        detail = errorBody?.message || errorBody?.reason || errorBody?.statusText || '';
      } catch {
        detail = text.slice(0, 200);
      }

      return new Response(JSON.stringify({
        ok: false,
        error: `Clash of Clans API antwortet mit HTTP ${response.status}${detail ? `: ${detail}` : ''}`
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const raw = await response.json();
    const members = Array.isArray(raw?.items) ? raw.items : [];

    if (!members.length) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Die offizielle Clash-of-Clans-API hat keine Mitglieder geliefert.'
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const payload = {
      ok: true,
      source: 'Clash of Clans API',
      clanTag,
      memberCount: members.length,
      members: members.map((member, index) => ({
        rank: member.clanRank ?? index + 1,
        name: member.name ?? 'Unbekannt',
        tag: member.tag ?? '',
        role: member.role ?? 'member',
        trophies: member.trophies ?? 0,
        builderTrophies: member.builderBaseTrophies?.versusTrophies ?? member.builderBaseTrophies ?? 0,
        donations: member.donations ?? 0,
        donationsReceived: member.donationsReceived ?? 0,
        expLevel: member.expLevel ?? null,
        league: member.league?.name ?? null,
        townHallLevel: member.townHallLevel ?? null
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
      error: `Verbindung zum Clash-of-Clans-Proxy fehlgeschlagen${error?.message ? `: ${error.message}` : '.'}`
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
}
