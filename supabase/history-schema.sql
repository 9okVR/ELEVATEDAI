-- Tables for per-user history of flashcards, quizzes, chat sessions and messages

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  created_at timestamptz default now()
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  results jsonb,
  created_at timestamptz default now()
);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_set_id uuid references flashcard_sets(id) on delete set null,
  quiz_id uuid references quizzes(id) on delete set null,
  grade_level integer,
  topics text,
  topics_sources jsonb,
  documents jsonb,
  -- Optional display title and lightweight activity summary
  title text,
  last_message_at timestamptz,
  message_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Optional external identifier for deduplication on import (unique per user)
  external_id text
);

-- In case the table already exists, ensure new columns are present
alter table if exists chat_sessions add column if not exists title text;
alter table if exists chat_sessions add column if not exists last_message_at timestamptz;
alter table if exists chat_sessions add column if not exists message_count integer not null default 0;
alter table if exists chat_sessions add column if not exists grade_level integer;
alter table if exists chat_sessions add column if not exists topics text;
alter table if exists chat_sessions add column if not exists topics_sources jsonb;
alter table if exists chat_sessions add column if not exists documents jsonb;
alter table if exists chat_sessions add column if not exists updated_at timestamptz default now();
alter table if exists chat_sessions add column if not exists external_id text;

create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- Optional normalized documents table (used by imports with attachments)
create table if not exists session_documents (
  id bigserial primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mime text,
  size_bytes integer,
  text_content text,
  storage_path text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table flashcard_sets enable row level security;
alter table quizzes enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table session_documents enable row level security;

-- Policies: user can manage own rows
do $$ begin
  create policy "flashcards_own" on flashcard_sets
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "quizzes_own" on quizzes
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sessions_own" on chat_sessions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "messages_own" on chat_messages
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Documents policies
do $$ begin
  create policy "documents_own" on session_documents
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Triggers to maintain last_message_at, message_count, updated_at
do $$ begin
  create or replace function set_updated_at()
  returns trigger as $$
  begin
    new.updated_at := now();
    return new;
  end $$ language plpgsql;
exception when duplicate_function then null; end $$;

do $$ begin
  drop trigger if exists trg_chat_sessions_set_updated on chat_sessions;
  create trigger trg_chat_sessions_set_updated
  before update on chat_sessions
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create or replace function chat_messages_after_ins()
  returns trigger as $$
  begin
    update chat_sessions
      set message_count = coalesce(message_count,0) + 1,
          last_message_at = new.created_at,
          updated_at = now()
      where id = new.session_id;
    return null;
  end $$ language plpgsql;
exception when duplicate_function then null; end $$;

do $$ begin
  create or replace function chat_messages_after_del()
  returns trigger as $$
  begin
    update chat_sessions s
      set message_count = greatest(coalesce(message_count,0) - 1, 0),
          last_message_at = (
            select max(m.created_at) from chat_messages m where m.session_id = s.id
          ),
          updated_at = now()
      where id = old.session_id;
    return null;
  end $$ language plpgsql;
exception when duplicate_function then null; end $$;

do $$ begin
  drop trigger if exists trg_chat_messages_after_ins on chat_messages;
  create trigger trg_chat_messages_after_ins
  after insert on chat_messages
  for each row execute function chat_messages_after_ins();
exception when duplicate_object then null; end $$;

do $$ begin
  drop trigger if exists trg_chat_messages_after_del on chat_messages;
  create trigger trg_chat_messages_after_del
  after delete on chat_messages
  for each row execute function chat_messages_after_del();
exception when duplicate_object then null; end $$;

-- Indexes for performance
create index if not exists idx_chat_sessions_user_created on chat_sessions(user_id, created_at desc);
create index if not exists idx_chat_sessions_user_last on chat_sessions(user_id, last_message_at desc);
create index if not exists idx_chat_messages_session_created on chat_messages(session_id, created_at);
create index if not exists idx_chat_sessions_title_trgm on chat_sessions using gin (title gin_trgm_ops);
create unique index if not exists uq_chat_sessions_user_external on chat_sessions(user_id, external_id) where external_id is not null;
