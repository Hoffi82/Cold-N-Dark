const COC_API_BASE = "https://api.clashofclans.com/v1";
const CLAN_TAG = "#C89CVRCP";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=10, s-maxage=10",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/current-war") {
      return json({ ok: false, error: "Not found" }, 404);
    }

    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    if (!env.CLASH_API_TOKEN) {
      return json({ ok: false, error: "API secret is not configured" }, 503);
    }

    const encodedTag = encodeURIComponent(CLAN_TAG);
    const upstream = await fetch(`${COC_API_BASE}/clans/${encodedTag}/currentwar`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.CLASH_API_TOKEN}`,
        Accept: "application/json",
      },
      cf: {
        cacheTtl: 10,
        cacheEverything: true,
      },
    });

    if (!upstream.ok) {
      let details = "Clash of Clans API request failed";
      try {
        const body = await upstream.json();
        if (body?.reason) details = body.reason;
      } catch (_) {
        // Keep the generic error if the upstream response is not JSON.
      }
      return json({ ok: false, error: details, upstreamStatus: upstream.status }, upstream.status);
    }

    const data = await upstream.json();
    return json({ ok: true, source: "clash-of-clans-api", fetchedAt: new Date().toISOString(), data });
  },
};
