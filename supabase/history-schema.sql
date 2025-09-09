-- Tables for per-user history of flashcards, quizzes, chat sessions and messages

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
  created_at timestamptz default now()
);

-- In case the table already exists, ensure new columns are present
alter table if exists chat_sessions add column if not exists title text;
alter table if exists chat_sessions add column if not exists last_message_at timestamptz;
alter table if exists chat_sessions add column if not exists message_count integer not null default 0;
alter table if exists chat_sessions add column if not exists grade_level integer;
alter table if exists chat_sessions add column if not exists topics text;
alter table if exists chat_sessions add column if not exists topics_sources jsonb;
alter table if exists chat_sessions add column if not exists documents jsonb;

create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table flashcard_sets enable row level security;
alter table quizzes enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

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
