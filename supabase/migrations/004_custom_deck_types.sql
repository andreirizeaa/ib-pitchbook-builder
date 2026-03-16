-- Migration: Custom deck types with slide layouts per user
-- Run this in your Supabase SQL Editor

-- Custom deck types table
create table if not exists public.custom_deck_types (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,              -- internal key e.g. 'company_overview'
  label text not null,             -- display name e.g. 'Company Overview'
  description text,                -- short description
  display_order integer not null default 0,
  is_default boolean not null default false,  -- seeded from system defaults
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Slide layout entries for each deck type
create table if not exists public.deck_type_slides (
  id uuid primary key default uuid_generate_v4(),
  deck_type_id uuid references public.custom_deck_types(id) on delete cascade not null,
  slide_index integer not null,    -- ordering within the deck
  title text not null,             -- e.g. 'Executive Summary'
  layout_type text not null,       -- e.g. 'Executive Summary', 'Content Slide', 'Chart Slide'
  description text,                -- what this slide should contain
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_custom_deck_types_user_id on public.custom_deck_types(user_id);
create index if not exists idx_deck_type_slides_deck_type_id on public.deck_type_slides(deck_type_id);

-- Row Level Security
alter table public.custom_deck_types enable row level security;
alter table public.deck_type_slides enable row level security;

-- User policies
create policy "Users can view own deck types" on public.custom_deck_types
  for select using (auth.uid() = user_id);

create policy "Users can create own deck types" on public.custom_deck_types
  for insert with check (auth.uid() = user_id);

create policy "Users can update own deck types" on public.custom_deck_types
  for update using (auth.uid() = user_id);

create policy "Users can delete own deck types" on public.custom_deck_types
  for delete using (auth.uid() = user_id);

create policy "Users can view own deck type slides" on public.deck_type_slides
  for select using (
    deck_type_id in (select id from public.custom_deck_types where user_id = auth.uid())
  );

create policy "Users can create deck type slides" on public.deck_type_slides
  for insert with check (
    deck_type_id in (select id from public.custom_deck_types where user_id = auth.uid())
  );

create policy "Users can update own deck type slides" on public.deck_type_slides
  for update using (
    deck_type_id in (select id from public.custom_deck_types where user_id = auth.uid())
  );

create policy "Users can delete own deck type slides" on public.deck_type_slides
  for delete using (
    deck_type_id in (select id from public.custom_deck_types where user_id = auth.uid())
  );

-- Service role policies
create policy "Service role full access custom_deck_types" on public.custom_deck_types
  for all using (auth.role() = 'service_role');

create policy "Service role full access deck_type_slides" on public.deck_type_slides
  for all using (auth.role() = 'service_role');

-- Updated_at trigger
create trigger custom_deck_types_updated_at
  before update on public.custom_deck_types
  for each row execute function public.handle_updated_at();
