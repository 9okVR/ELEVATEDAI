-- Class Stream & Resources
-- Run as role postgres in SQL Editor

-- Announcements
create table if not exists announcements (
  id bigserial primary key,
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
alter table announcements enable row level security;

-- Members and teacher can read announcements
drop policy if exists "announcements select" on announcements;
create policy "announcements select" on announcements for select using (
  exists (select 1 from class_members m where m.class_id = announcements.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id = announcements.class_id and c.teacher_id = auth.uid())
);

-- Members or teacher can create announcements
drop policy if exists "announcements insert" on announcements;
create policy "announcements insert" on announcements for insert with check (
  exists (select 1 from class_members m where m.class_id = announcements.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id = announcements.class_id and c.teacher_id = auth.uid())
);

-- Author or teacher can update/delete
drop policy if exists "announcements update" on announcements;
create policy "announcements update" on announcements for update using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = announcements.class_id and c.teacher_id = auth.uid())
) with check (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = announcements.class_id and c.teacher_id = auth.uid())
);
drop policy if exists "announcements delete" on announcements;
create policy "announcements delete" on announcements for delete using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = announcements.class_id and c.teacher_id = auth.uid())
);

-- Comments
create table if not exists comments (
  id bigserial primary key,
  announcement_id bigint not null references announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;

-- Members of the announcement's class (or teacher) can read
drop policy if exists "comments select" on comments;
create policy "comments select" on comments for select using (
  exists (
    select 1 from announcements a
    join class_members m on m.class_id = a.class_id and m.user_id = auth.uid()
    where a.id = comments.announcement_id
  )
  or exists (
    select 1 from announcements a
    join classes c on c.id = a.class_id
    where a.id = comments.announcement_id and c.teacher_id = auth.uid()
  )
);

-- Members or teacher can add comments
drop policy if exists "comments insert" on comments;
create policy "comments insert" on comments for insert with check (
  exists (
    select 1 from announcements a
    join class_members m on m.class_id = a.class_id and m.user_id = auth.uid()
    where a.id = comments.announcement_id
  )
  or exists (
    select 1 from announcements a
    join classes c on c.id = a.class_id
    where a.id = comments.announcement_id and c.teacher_id = auth.uid()
  )
);

-- Author or teacher can update/delete
drop policy if exists "comments update" on comments;
create policy "comments update" on comments for update using (
  user_id = auth.uid() or exists (
    select 1 from announcements a join classes c on c.id = a.class_id
    where a.id = comments.announcement_id and c.teacher_id = auth.uid()
  )
) with check (
  user_id = auth.uid() or exists (
    select 1 from announcements a join classes c on c.id = a.class_id
    where a.id = comments.announcement_id and c.teacher_id = auth.uid()
  )
);
drop policy if exists "comments delete" on comments;
create policy "comments delete" on comments for delete using (
  user_id = auth.uid() or exists (
    select 1 from announcements a join classes c on c.id = a.class_id
    where a.id = comments.announcement_id and c.teacher_id = auth.uid()
  )
);

-- Resources
create table if not exists resources (
  id bigserial primary key,
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);
alter table resources enable row level security;

drop policy if exists "resources select" on resources;
create policy "resources select" on resources for select using (
  exists (select 1 from class_members m where m.class_id = resources.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id = resources.class_id and c.teacher_id = auth.uid())
);

drop policy if exists "resources insert" on resources;
create policy "resources insert" on resources for insert with check (
  exists (select 1 from class_members m where m.class_id = resources.class_id and m.user_id = auth.uid())
  or exists (select 1 from classes c where c.id = resources.class_id and c.teacher_id = auth.uid())
);

drop policy if exists "resources update" on resources;
create policy "resources update" on resources for update using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = resources.class_id and c.teacher_id = auth.uid())
) with check (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = resources.class_id and c.teacher_id = auth.uid())
);

drop policy if exists "resources delete" on resources;
create policy "resources delete" on resources for delete using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = resources.class_id and c.teacher_id = auth.uid())
);

