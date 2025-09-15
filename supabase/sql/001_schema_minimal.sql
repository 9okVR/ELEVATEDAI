-- Essentials (safe to re-run)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gemini_api_key_ciphertext text not null,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy if not exists "read own settings" on user_settings for select using (auth.uid() = user_id);
create policy if not exists "upsert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy if not exists "update own settings" on user_settings for update using (auth.uid() = user_id);

create table if not exists usage_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  model text,
  items int,
  doc_bytes int,
  status text default 'ok',
  error text,
  created_at timestamptz default now()
);
alter table usage_logs enable row level security;
create policy if not exists "read own logs" on usage_logs for select using (auth.uid() = user_id);

-- Minimal adds to persist AI outputs and attempts
create table if not exists artifacts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('syllabus','adaptive-quiz','distractor-analysis')),
  title text,
  content jsonb not null,
  created_at timestamptz default now()
);
alter table artifacts enable row level security;
create policy if not exists "artifacts select own" on artifacts for select using (auth.uid() = user_id);
create policy if not exists "artifacts insert own" on artifacts for insert with check (auth.uid() = user_id);
create policy if not exists "artifacts update own" on artifacts for update using (auth.uid() = user_id);
create policy if not exists "artifacts delete own" on artifacts for delete using (auth.uid() = user_id);

create table if not exists quiz_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  score numeric,
  total int,
  breakdown jsonb,
  class_id uuid references classes(id) on delete set null,
  assignment_id bigint references assignments(id) on delete set null,
  created_at timestamptz default now()
);
alter table quiz_attempts enable row level security;
create policy if not exists "quiz attempts select own" on quiz_attempts for select using (auth.uid() = user_id);
create policy if not exists "quiz attempts insert own" on quiz_attempts for insert with check (auth.uid() = user_id);

-- Teacher sharing (optional)
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text unique,
  created_at timestamptz default now()
);
alter table classes enable row level security;
create policy if not exists "classes teacher read" on classes for select using (teacher_id = auth.uid());
create policy if not exists "classes teacher write" on classes for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
-- Allow students to read classes they are a member of
create policy if not exists "classes members read" on classes for select using (
  exists (select 1 from class_members m where m.class_id = classes.id and m.user_id = auth.uid())
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student','ta')),
  joined_at timestamptz default now(),
  primary key (class_id, user_id)
);
alter table class_members enable row level security;
create policy if not exists "members read own classes" on class_members for select using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id=class_members.class_id and c.teacher_id = auth.uid())
);
create policy if not exists "teacher manage members" on class_members for all using (
  exists (select 1 from classes c where c.id=class_members.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classes c where c.id=class_members.class_id and c.teacher_id = auth.uid())
);

create table if not exists lesson_plans (
  id bigserial primary key,
  class_id uuid not null references classes(id) on delete cascade,
  title text,
  plan jsonb not null,
  created_at timestamptz default now()
);
alter table lesson_plans enable row level security;
create policy if not exists "plans read by members" on lesson_plans for select using (
  exists (select 1 from class_members m where m.class_id = lesson_plans.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id=lesson_plans.class_id and c.teacher_id=auth.uid())
);
create policy if not exists "plans write by teacher" on lesson_plans for all using (
  exists (select 1 from classes c where c.id=lesson_plans.class_id and c.teacher_id=auth.uid())
) with check (
  exists (select 1 from classes c where c.id=lesson_plans.class_id and c.teacher_id=auth.uid())
);

create table if not exists assignments (
  id bigserial primary key,
  class_id uuid not null references classes(id) on delete cascade,
  type text not null check (type in ('syllabus-week','quiz','practice')),
  title text,
  payload jsonb,
  due_at timestamptz,
  created_at timestamptz default now()
);
alter table assignments enable row level security;
create policy if not exists "assignments read by members" on assignments for select using (
  exists (select 1 from class_members m where m.class_id = assignments.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id=assignments.class_id and c.teacher_id=auth.uid())
);
create policy if not exists "assignments write by teacher" on assignments for all using (
  exists (select 1 from classes c where c.id=assignments.class_id and c.teacher_id=auth.uid())
) with check (
  exists (select 1 from classes c where c.id=assignments.class_id and c.teacher_id=auth.uid())
);

-- Allow teachers to read quiz attempts tied to their class
create policy if not exists "quiz attempts teacher read" on quiz_attempts for select using (
  exists (select 1 from classes c where c.id = quiz_attempts.class_id and c.teacher_id = auth.uid())
);
