-- Production OS — auth schema
--
-- Run this once in your Supabase project's SQL Editor (Project -> SQL Editor
-- -> New query -> paste -> Run). It sets up the tables backing real login:
-- profiles (mirrors auth.users), workspaces, and memberships — matching the
-- shapes in src/lib/types.ts.
--
-- Everything else (projects, shoot days, people, etc.) stays on localStorage
-- for now, keyed by workspace.id from these tables. Migrating those is a
-- separate, later step (see the project handoff doc).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  timezone text not null default 'Africa/Lagos',
  owner_id uuid not null references public.profiles(id),
  is_demo boolean not null default false,
  call_sheet_hours_before int not null default 48,
  reminder_hours_before int not null default 24,
  final_reminder_hours_before int not null default 3,
  call_sheet_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  final_reminder_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Owner', 'Producer', 'Member')),
  unique (workspace_id, user_id)
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth,
-- pulling the display name out of the signUp() metadata.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: every table is locked down by default; these policies
-- open exactly the access the app needs.

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Members can view memberships in their workspace"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = memberships.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can create their own membership (used during signup)"
  on public.memberships for insert
  with check (auth.uid() = user_id);

create policy "Members can view their workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create a workspace they own"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

create policy "Members can update their workspace settings"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
    )
  );
