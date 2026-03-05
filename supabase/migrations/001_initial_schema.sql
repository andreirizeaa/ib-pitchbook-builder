-- Migration: Create core tables for AI Pitch Deck Builder
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Pitch Books table
create table if not exists public.pitch_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  company text not null,
  ticker text,
  transaction_type text not null check (transaction_type in ('ma', 'capital_raising', 'restructuring', 'ipo', 'debt_financing')),
  pb_type text not null check (pb_type in ('company_overview', 'market_update', 'transaction_summary')),
  status text not null default 'draft' check (status in ('draft', 'generating', 'completed', 'failed')),
  slides_data jsonb default '[]'::jsonb,
  template_id uuid,
  additional_context text,
  file_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Templates table
create table if not exists public.templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  file_url text,
  analysis_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Chat Messages table
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  pitch_book_id uuid references public.pitch_books(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Generations table (tracks generation pipeline progress)
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  pitch_book_id uuid references public.pitch_books(id) on delete cascade not null,
  status text not null default 'queued' check (status in ('queued', 'analyzing_template', 'fetching_data', 'planning_content', 'building_slides', 'completed', 'failed')),
  progress integer default 0 check (progress >= 0 and progress <= 100),
  current_step text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  error text
);

-- Indexes
create index if not exists idx_pitch_books_user_id on public.pitch_books(user_id);
create index if not exists idx_pitch_books_status on public.pitch_books(status);
create index if not exists idx_templates_user_id on public.templates(user_id);
create index if not exists idx_chat_messages_pitch_book_id on public.chat_messages(pitch_book_id);
create index if not exists idx_generations_pitch_book_id on public.generations(pitch_book_id);

-- Row Level Security
alter table public.pitch_books enable row level security;
alter table public.templates enable row level security;
alter table public.chat_messages enable row level security;
alter table public.generations enable row level security;

-- Policies: Users can only access their own data
create policy "Users can view own pitch books" on public.pitch_books
  for select using (auth.uid() = user_id);

create policy "Users can create own pitch books" on public.pitch_books
  for insert with check (auth.uid() = user_id);

create policy "Users can update own pitch books" on public.pitch_books
  for update using (auth.uid() = user_id);

create policy "Users can delete own pitch books" on public.pitch_books
  for delete using (auth.uid() = user_id);

create policy "Users can view own templates" on public.templates
  for select using (auth.uid() = user_id);

create policy "Users can create own templates" on public.templates
  for insert with check (auth.uid() = user_id);

create policy "Users can view own chat messages" on public.chat_messages
  for select using (
    pitch_book_id in (select id from public.pitch_books where user_id = auth.uid())
  );

create policy "Users can create chat messages for own pitch books" on public.chat_messages
  for insert with check (
    pitch_book_id in (select id from public.pitch_books where user_id = auth.uid())
  );

create policy "Users can view own generations" on public.generations
  for select using (
    pitch_book_id in (select id from public.pitch_books where user_id = auth.uid())
  );

-- Service role policies (for backend server)
create policy "Service role full access pitch_books" on public.pitch_books
  for all using (auth.role() = 'service_role');

create policy "Service role full access templates" on public.templates
  for all using (auth.role() = 'service_role');

create policy "Service role full access chat_messages" on public.chat_messages
  for all using (auth.role() = 'service_role');

create policy "Service role full access generations" on public.generations
  for all using (auth.role() = 'service_role');

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pitch_books_updated_at
  before update on public.pitch_books
  for each row execute function public.handle_updated_at();
