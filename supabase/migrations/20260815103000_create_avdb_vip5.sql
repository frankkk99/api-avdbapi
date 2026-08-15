create table if not exists public.avdb_vip5_runs (
  id uuid primary key default gen_random_uuid(),
  vip_bucket text not null default 'VIP5' check (vip_bucket = 'VIP5'),
  source text not null default 'avdbapi',
  start_page integer not null check (start_page >= 1),
  end_page integer not null check (end_page >= start_page),
  current_page integer not null default 1 check (current_page >= 1),
  pages_scanned integer not null default 0 check (pages_scanned >= 0),
  items_found integer not null default 0 check (items_found >= 0),
  items_upserted integer not null default 0 check (items_upserted >= 0),
  failed_pages integer not null default 0 check (failed_pages >= 0),
  status text not null default 'queued' check (status in ('queued','running','paused','completed','failed','cancelled')),
  last_page_url text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.avdb_vip5_items (
  id uuid primary key default gen_random_uuid(),
  vip_bucket text not null default 'VIP5' check (vip_bucket = 'VIP5'),
  source text not null default 'avdbapi',
  source_page_url text,
  source_page_number integer check (source_page_number is null or source_page_number >= 1),
  api_url text not null,
  external_id text not null,
  movie_code text,
  name text not null default '',
  original_name text,
  slug text,
  type_name text,
  category jsonb not null default '[]'::jsonb,
  year text,
  quality text,
  duration text,
  description text,
  poster_url text,
  thumb_url text,
  player_page_url text,
  player_provider text not null default 'upload18',
  player_origin text,
  player_referer text,
  player_status text not null default 'unverified' check (player_status in ('unverified','active','broken','expired','missing')),
  is_active boolean not null default true,
  raw_data jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vip_bucket, external_id)
);

create index if not exists avdb_vip5_items_active_updated_idx
  on public.avdb_vip5_items (is_active, updated_at desc);
create index if not exists avdb_vip5_items_page_idx
  on public.avdb_vip5_items (source_page_number);
create index if not exists avdb_vip5_items_type_idx
  on public.avdb_vip5_items (type_name);
create index if not exists avdb_vip5_runs_status_updated_idx
  on public.avdb_vip5_runs (status, updated_at desc);

alter table public.avdb_vip5_items enable row level security;
alter table public.avdb_vip5_runs enable row level security;

grant select on public.avdb_vip5_items to anon, authenticated;
grant all on public.avdb_vip5_items to service_role;
grant all on public.avdb_vip5_runs to service_role;
revoke all on public.avdb_vip5_runs from anon, authenticated;

drop policy if exists "public can read active vip5 items" on public.avdb_vip5_items;
create policy "public can read active vip5 items"
  on public.avdb_vip5_items
  for select
  to anon, authenticated
  using (vip_bucket = 'VIP5' and is_active = true);
