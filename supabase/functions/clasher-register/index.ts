import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

function emailFor(name: string) {
  return 'clasher+' + encodeURIComponent(name.trim().toLowerCase()).replace(/%/g, '') + '@coldndark.de'
}

async function isClanMember(name: string) {
  const response = await fetch('https://raw.githubusercontent.com/Hoffi82/Cold-N-Dark/main/members-data.js', {
    headers: { 'Accept': 'text/plain' },
  })
  if (!response.ok) return false
  const text = await response.text()
  const wanted = name.trim().toLowerCase()
  const names = [...text.matchAll(/name:\s*['"]([^'"]+)['"]/g)].map(m => m[1].trim().toLowerCase())
  return names.includes(wanted)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      throw new Error('Supabase server configuration is missing.')
    }

    const { name, password } = await req.json()
    const memberName = String(name ?? '').trim()
    const memberPassword = String(password ?? '')

    if (!memberName) throw new Error('In-Game-Name fehlt.')
    if (memberPassword.length < 6) throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.')

    const memberExists = await isClanMember(memberName)
    if (!memberExists) {
      return new Response(JSON.stringify({ error: 'Dieser In-Game-Name ist nicht in der zentralen Mitgliederliste.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = emailFor(memberName)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: memberPassword,
      email_confirm: true,
      user_metadata: {
        display_name: memberName,
        member_role: 'clasher',
      },
    })

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return new Response(JSON.stringify({ error: 'Für diesen In-Game-Namen existiert bereits ein Login.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw error
    }

    return new Response(JSON.stringify({ ok: true, user_id: data.user?.id ?? null, email }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Registrierung fehlgeschlagen.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
