const COC_API_BASE = 'https://api.clashofclans.com/v1';
const CLAN_TAG = '#C89CVRCP';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://hoffi82.github.io',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname !== '/api/members' || request.method !== 'GET') {
      return json({ ok: false, error: 'Not found' }, 404);
    }

    if (!env.CLASH_API_TOKEN) {
      return json({ ok: false, error: 'CLASH_API_TOKEN fehlt in den Worker-Secrets.' }, 500);
    }

    try {
      const response = await fetch(`${COC_API_BASE}/clans/${encodeURIComponent(CLAN_TAG)}`, {
        headers: { Authorization: `Bearer ${env.CLASH_API_TOKEN}` }
      });

      const data = await response.json();

      if (!response.ok) {
        return json({
          ok: false,
          error: data?.message || `Clash API Fehler (${response.status})`
        }, response.status);
      }

      const members = Array.isArray(data.memberList) ? data.memberList.map(member => ({
        tag: member.tag,
        name: member.name,
        role: member.role,
        townHallLevel: member.townHallLevel,
        expLevel: member.expLevel,
        trophies: member.trophies,
        clanRank: member.clanRank,
        previousClanRank: member.previousClanRank
      })) : [];

      return json({
        ok: true,
        source: 'clash-of-clans-api',
        clanTag: CLAN_TAG,
        clanName: data.name,
        clanLevel: data.clanLevel,
        memberCount: data.members,
        members,
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      return json({ ok: false, error: error?.message || 'Unbekannter Fehler' }, 500);
    }
  }
};
