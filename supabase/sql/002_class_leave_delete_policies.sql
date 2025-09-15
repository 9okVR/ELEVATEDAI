-- Allow students to delete their own membership rows (leave class)
drop policy if exists "class_members delete own" on class_members;
create policy "class_members delete own" on class_members for delete using (user_id = auth.uid());

