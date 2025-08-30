Supabase Edge Functions for Elevated AI
======================================

This folder contains two Deno Edge Functions to enable per‑user API keys and usage logging:

1) save-key
   - Validates the current Supabase session
   - Encrypts the submitted Gemini API key with AES‑GCM (server secret)
   - Upserts into `user_settings`

2) ai-generate
   - Validates the current Supabase session
   - Decrypts the user’s stored API key
   - Calls Gemini (`@google/generative-ai`) with the user’s key
   - Logs a row in `usage_logs`
   - Returns `{ text }`

Prerequisites
-------------
- Supabase project with Auth enabled
- Tables and RLS policies (run in SQL Editor):

```
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gemini_api_key_ciphertext text not null,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "read own settings" on user_settings for select using (auth.uid() = user_id);
create policy "upsert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "update own settings" on user_settings for update using (auth.uid() = user_id);

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
create policy "read own logs" on usage_logs for select using (auth.uid() = user_id);
```

Deploy
------
1. Install Supabase CLI and login
2. Set function secrets for both functions:

```
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ENCRYPTION_KEY=$(openssl rand -base64 32) --env=prod
```

3. Deploy

```
supabase functions deploy save-key --project-ref <ref>
supabase functions deploy ai-generate --project-ref <ref>
```

Client Env Vars
---------------
Add to `.env.local` in the frontend:

```
VITE_SUPABASE_URL=...        # Project URL
VITE_SUPABASE_ANON_KEY=...   # Anon key
```

Usage in App
------------
- Settings → Account:
  - Sign in/up with Supabase Auth
  - Save your Gemini API key (stored server‑side, encrypted)
- Flashcards/Quiz generation:
  - If logged in, the app calls `ai-generate` with your key and logs usage
  - Otherwise, it falls back to the built‑in client/demo flow

