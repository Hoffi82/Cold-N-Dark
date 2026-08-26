const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanMember(input: any) {
  const name = String(input?.name ?? "").trim();
  const role = String(input?.role ?? "member").trim();
  const trophies = Number.isFinite(Number(input?.trophies)) ? Number(input.trophies) : 0;
  const townHallLevel = Number.isFinite(Number(input?.town_hall_level ?? input?.townHallLevel))
    ? Number(input?.town_hall_level ?? input?.townHallLevel)
    : 18;
  const sortOrder = Number.isFinite(Number(input?.sort_order ?? input?.sortOrder))
    ? Number(input?.sort_order ?? input?.sortOrder)
    : 0;

  if (!name) throw new Error("Mitgliedsname fehlt.");
  if (!["leader", "coLeader", "admin", "member"].includes(role)) throw new Error("Ungültige Rolle.");

  return {
    name,
    role,
    trophies: Math.max(0, Math.round(trophies)),
    town_hall_level: Math.min(18, Math.max(1, Math.round(townHallLevel))),
    sort_order: Math.round(sortOrder),
    active: input?.active !== false,
  };
}

async function supabaseRequest(path: string, method: string, body?: unknown) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase-Service-Konfiguration fehlt.");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.hint || "Datenbankfehler.");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    // Öffentliche Mitgliederanzeige: nur aktive Mitglieder.
    if (req.method === "GET") {
      const data = await supabaseRequest(
        "clan_members?select=id,name,role,trophies,town_hall_level,sort_order,active&active=eq.true&order=sort_order.asc,name.asc",
        "GET",
      );
      return json({ ok: true, members: data });
    }

    const payload = await req.json();
    const adminPassword = String(payload?.adminPassword ?? "");
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD") || "";

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return json({ ok: false, error: "Nicht autorisiert." }, 401);
    }

    if (req.method === "POST") {
      const member = cleanMember(payload.member);
      const data = await supabaseRequest("clan_members", "POST", member);
      return json({ ok: true, member: data?.[0] ?? data, message: "Mitglied hinzugefügt." });
    }

    if (req.method === "PUT") {
      const id = String(payload?.id ?? "");
      if (!id) return json({ ok: false, error: "Mitglied-ID fehlt." }, 400);
      const member = cleanMember(payload.member);
      const data = await supabaseRequest(`clan_members?id=eq.${encodeURIComponent(id)}`, "PATCH", member);
      return json({ ok: true, member: data?.[0] ?? data, message: "Mitglied gespeichert." });
    }

    if (req.method === "DELETE") {
      const id = String(payload?.id ?? "");
      if (!id) return json({ ok: false, error: "Mitglied-ID fehlt." }, 400);
      await supabaseRequest(`clan_members?id=eq.${encodeURIComponent(id)}`, "PATCH", { active: false });
      return json({ ok: true, message: "Mitglied entfernt." });
    }

    return json({ ok: false, error: "Methode nicht unterstützt." }, 405);
  } catch (error) {
    console.error("Mitgliederverwaltung fehlgeschlagen:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unbekannter Fehler." }, 500);
  }
});
