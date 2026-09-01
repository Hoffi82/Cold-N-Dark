-- Cold N' Dark: zentrale Clasher-Registrierung
-- Einmal im Supabase SQL Editor ausführen.

create table if not exists public.member_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  role text not null default 'clasher' check (role in ('clasher','admin')),
  registered_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.member_accounts enable row level security;

-- Ein angemeldeter Clasher darf nur seinen eigenen Datensatz lesen.
drop policy if exists "member_accounts_self_select" on public.member_accounts;
create policy "member_accounts_self_select"
on public.member_accounts for select
to authenticated
using (id = auth.uid());

-- Der Browser darf bei der Erstregistrierung seinen eigenen Datensatz anlegen.
drop policy if exists "member_accounts_self_insert" on public.member_accounts;
create policy "member_accounts_self_insert"
on public.member_accounts for insert
to authenticated
with check (id = auth.uid() and role = 'clasher');

-- Änderungen bleiben dem Admin vorbehalten; Admin-Policies können ergänzt werden,
-- sobald die bestehende Admin-Struktur endgültig mit diesem System verbunden wird.

create or replace function public.register_member_account(p_display_name text)
returns public.member_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.member_accounts;
begin
  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'In-Game-Name fehlt';
  end if;

  insert into public.member_accounts(id, display_name, role)
  values (auth.uid(), trim(p_display_name), 'clasher')
  on conflict (id) do update set display_name = excluded.display_name
  returning * into result;

  return result;
end;
$$;

grant execute on function public.register_member_account(text) to authenticated;

-- Hinweis: Die zentrale Namensliste liegt aktuell in members-data.js.
-- Sie bleibt die Quelle dafür, welche In-Game-Namen sich registrieren dürfen.
