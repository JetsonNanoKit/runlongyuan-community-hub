create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('carpool', 'errand', 'housekeeping', 'cleaning', 'lost_found', 'notice')
  ),
  title text not null,
  content text not null,
  contact text not null,
  location text,
  status text not null default 'open' check (status in ('open', 'done', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select profiles.is_admin from public.profiles where profiles.id = user_id),
    false
  );
$$;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and is_admin = false);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and is_admin = public.is_admin(auth.uid()));

drop policy if exists "Community posts are readable by everyone" on public.community_posts;
create policy "Community posts are readable by everyone"
on public.community_posts for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own community posts" on public.community_posts;
create policy "Users can create own community posts"
on public.community_posts for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own community posts" on public.community_posts;
create policy "Users can update own community posts"
on public.community_posts for update
to authenticated
using (auth.uid() = author_id or public.is_admin(auth.uid()))
with check (auth.uid() = author_id or public.is_admin(auth.uid()));

drop policy if exists "Users can delete own community posts" on public.community_posts;
create policy "Users can delete own community posts"
on public.community_posts for delete
to authenticated
using (auth.uid() = author_id or public.is_admin(auth.uid()));

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments"
on public.comments for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
on public.comments for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
on public.comments for delete
to authenticated
using (auth.uid() = author_id or public.is_admin(auth.uid()));
