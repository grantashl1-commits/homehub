-- Home Hub family accounts.
--
-- A household is one family. Grown-ups sign in with Supabase Auth and belong
-- to a household through household_members. Kids are not accounts: they live
-- inside the household's hub_state like before.
--
--   households          one row per family
--   household_members   which sign-ins belong to which family (owner / adult)
--   household_invites   short codes so a second grown-up can join
--   hub_state           the hub's own data (notes, habits, family, settings…)
--                       as one JSON document per family, synced across screens
--   household_secrets   per-family private connection values (iCal links,
--                       Notion token, Drive folder). Encrypted by the /api
--                       functions. RLS on with no policies: browsers can never
--                       read them, only the server with the secret key.
--
-- Apply with the Supabase SQL editor or `supabase db push` (docs/ACCOUNTS.md).

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'adult' check (role in ('owner', 'adult')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

create table public.household_invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index household_invites_household_idx on public.household_invites (household_id);

create table public.hub_state (
  household_id uuid primary key references public.households (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- Bumped on every save; screens use it to ignore their own echoes.
  revision bigint not null default 1,
  updated_by_device text,
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table public.household_secrets (
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  -- "v1.<iv>.<tag>.<ciphertext>" (AES-256-GCM, key = HUB_SECRETS_KEY in Vercel)
  value text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (household_id, name)
);

-- ── Helpers ─────────────────────────────────────────────────────────────

-- security definer so policies on household_members don't recurse.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- Create a family and make the caller its owner, in one step.
create or replace function public.create_household(family_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'Sign in first';
  end if;
  insert into public.households (name, created_by) values (trim(family_name), uid) returning id into hid;
  insert into public.household_members (household_id, user_id, role) values (hid, uid, 'owner');
  insert into public.hub_state (household_id, data, revision, updated_by) values (hid, '{}'::jsonb, 0, uid);
  return hid;
end;
$$;

-- An owner makes a 6-character code for another grown-up (valid 7 days).
create or replace function public.create_household_invite(hid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if not public.is_household_owner(hid) then
    raise exception 'Only the family owner can invite';
  end if;
  -- No 0/O/1/I so it reads cleanly off a screen.
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    into new_code from generate_series(1, 6);
  insert into public.household_invites (code, household_id) values (new_code, hid);
  return new_code;
end;
$$;

-- Join a family with an invite code.
create or replace function public.join_household(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.household_invites%rowtype;
begin
  if uid is null then
    raise exception 'Sign in first';
  end if;
  select * into inv from public.household_invites
    where code = upper(trim(invite_code)) and used_at is null and expires_at > now()
    for update;
  if not found then
    raise exception 'That code isn''t right or has expired';
  end if;
  insert into public.household_members (household_id, user_id, role)
    values (inv.household_id, uid, 'adult')
    on conflict do nothing;
  update public.household_invites set used_by = uid, used_at = now() where code = inv.code;
  return inv.household_id;
end;
$$;

-- Saves bump the revision server-side so two screens can't reuse a number.
create or replace function public.bump_hub_state_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger hub_state_bump
  before update on public.hub_state
  for each row execute function public.bump_hub_state_revision();

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.create_household_invite(uuid) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

-- ── Row level security ──────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.hub_state enable row level security;
alter table public.household_secrets enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "owners rename their household" on public.households
  for update to authenticated using (public.is_household_owner(id)) with check (public.is_household_owner(id));

create policy "members see who is in the family" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));
create policy "owners remove grown-ups" on public.household_members
  for delete to authenticated using (public.is_household_owner(household_id) and user_id <> (select auth.uid()));

create policy "owners see invites" on public.household_invites
  for select to authenticated using (public.is_household_owner(household_id));
create policy "owners cancel invites" on public.household_invites
  for delete to authenticated using (public.is_household_owner(household_id));

create policy "members read hub state" on public.hub_state
  for select to authenticated using (public.is_household_member(household_id));
create policy "members save hub state" on public.hub_state
  for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- household_secrets: deliberately no policies. Only the service role (the
-- /api functions) can read or write it.
revoke all on public.household_secrets from anon, authenticated;

-- ── Realtime: screens hear each other's saves ───────────────────────────

alter publication supabase_realtime add table public.hub_state;
