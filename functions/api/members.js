const COC_API_BASE = 'https://api.clashofclans.com/v1';
const CLAN_TAG = '#C89CVRCP';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

export async function onRequestGet({ env }) {
  if (!env?.CLASH_API_TOKEN) {
    return json({ ok: false, error: 'CLASH_API_TOKEN ist in Cloudflare nicht konfiguriert.' }, 503);
  }

  try {
    // Token von versehentlich mitkopierten Leerzeichen/Zeilenumbrüchen bereinigen.
    const token = String(env.CLASH_API_TOKEN).replace(/\s+/g, '').trim();

    if (!token) {
      return json({ ok: false, error: 'CLASH_API_TOKEN ist leer.' }, 503);
    }

    const encodedTag = encodeURIComponent(CLAN_TAG);
    const response = await fetch(`${COC_API_BASE}/clans/${encodedTag}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    const text = await response.text();
    let raw = null;
    try {
      raw = JSON.parse(text);
    } catch {
      return json({
        ok: false,
        error: `Die offizielle Clash-of-Clans-API hat keine gültige JSON-Antwort geliefert (HTTP ${response.status}).`
      }, 502);
    }

    if (!response.ok) {
      const reason = raw?.reason || raw?.message || 'Unbekannter API-Fehler';
      const detail = raw?.message ? `: ${raw.message}` : '';
      return json({
        ok: false,
        error: `Clash-of-Clans-API HTTP ${response.status}: ${reason}${detail}`,
        upstreamStatus: response.status
      }, response.status);
    }

    const members = Array.isArray(raw?.memberList) ? raw.memberList : [];

    return json({
      ok: true,
      source: 'clash-of-clans-api',
      clanTag: CLAN_TAG,
      clanName: raw?.name ?? "Cold N' Dark",
      clanLevel: raw?.clanLevel ?? null,
      memberCount: raw?.members ?? members.length,
      members: members.map((member, index) => ({
        rank: member.clanRank ?? member.rank ?? index + 1,
        name: member.name ?? 'Unbekannt',
        tag: member.tag ?? '',
        role: member.role ?? 'member',
        trophies: member.trophies ?? 0,
        builderTrophies: member.builderBaseTrophies ?? 0,
        donations: member.donations ?? 0,
        donationsReceived: member.donationsReceived ?? 0,
        expLevel: member.expLevel ?? null,
        league: member.league?.name ?? null,
        townHallLevel: member.townHallLevel ?? null
      })),
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return json({
      ok: false,
      error: `Verbindung zur offiziellen Clash-of-Clans-API fehlgeschlagen${error?.message ? `: ${error.message}` : '.'}`
    }, 502);
  }
}
