-- Cold N' Dark: separate fields for attack 1 and attack 2
-- Run this once in Supabase SQL Editor.

alter table public.clan_war_members
  add column if not exists attack1_used boolean not null default false,
  add column if not exists attack1_stars int8 not null default 0,
  add column if not exists attack1_destruction numeric not null default 0,
  add column if not exists attack2_used boolean not null default false,
  add column if not exists attack2_stars int8 not null default 0,
  add column if not exists attack2_destruction numeric not null default 0;

-- Keep the existing summary fields in sync with the two attacks.
update public.clan_war_members
set
  attacks = (case when attack1_used then 1 else 0 end) + (case when attack2_used then 1 else 0 end),
  stars = coalesce(attack1_stars,0) + coalesce(attack2_stars,0),
  destruction = coalesce(attack1_destruction,0) + coalesce(attack2_destruction,0);
