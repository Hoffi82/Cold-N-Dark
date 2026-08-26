-- Cold N' Dark – gespeicherte Web-Push-Subscriptions
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Der Zugriff erfolgt ausschließlich serverseitig über den Service-Role-Key.
-- Es werden bewusst keine öffentlichen RLS-Policies angelegt.
