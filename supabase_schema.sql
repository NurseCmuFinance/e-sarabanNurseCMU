
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ✅ Enable pgcrypto for password hashing
create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;

-- Documents Table
create table if not exists documents (
  id uuid default uuid_generate_v4() primary key,
  book_no integer,
  book_year integer,
  external_book_no text,
  doc_date date,
  registration_date date default CURRENT_DATE,
  from_origin text,
  to_recipient_id uuid,
  recipient_name text,
  subject text,
  status text,
  priority text default 'normal',
  remark text,
  attachment_url text,
  approved_attachment_url text,
  is_cancelled boolean default false,
  tracking_code text,
  sender_type text,
  creator_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  role text,
  department_id text,
  department_name text,
  is_approved boolean default false,
  is_locked boolean default false,
  ban_reason text,
  login_attempts integer default 0,
  email text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Add ban_reason column if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'ban_reason') then
    alter table profiles add column ban_reason text;
  end if;
end $$;

-- ✅ Function for Admin to Update User (Structure Enforcer & Email Sync)
drop function if exists admin_update_user(uuid, text, text);

create or replace function admin_update_user(
  target_user_id uuid, 
  new_password text default null, 
  new_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  updated_count int;
  final_email text;
begin
  -- 1. Determine the correct email to use
  -- If new_email is provided, use it.
  -- If NOT provided, fetch the email from the public.profiles table (Self-Healing)
  if new_email is not null and new_email <> '' then
    final_email := lower(new_email);
  else
    select email into final_email from public.profiles where id = target_user_id;
    -- If profile has no email, fallback to existing auth email (do nothing to variable)
  end if;

  -- 2. Update Auth User
  update auth.users
  set 
    encrypted_password = case 
        when new_password is not null and new_password <> '' 
        then crypt(new_password, gen_salt('bf', 10)) 
        else encrypted_password 
    end,
    -- FORCE Update email to match what we expect
    email = case 
        when final_email is not null 
        then final_email 
        else email 
    end,
    updated_at = now(),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    aud = 'authenticated',
    role = 'authenticated',
    banned_until = null, 
    deleted_at = null,
    is_sso_user = false,
    raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{provider}',
      '"email"'
    ) || '{"providers": ["email"]}'::jsonb,
    recovery_token = '',
    recovery_sent_at = null
  where id = target_user_id;
  
  get diagnostics updated_count = row_count;

  -- 3. Sync Profile unlock status
  if updated_count > 0 then
    update public.profiles
    set 
        is_locked = false,
        login_attempts = 0,
        ban_reason = null,
        -- Ensure profile email matches auth email if we changed it
        email = coalesce(final_email, email)
    where id = target_user_id;
  end if;

  return updated_count > 0;
end;
$$;

-- Migration to add priority column if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'priority') then
    alter table documents add column priority text default 'normal';
  end if;
end $$;

-- Migration to add registration_date column if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'registration_date') then
    alter table documents add column registration_date date default CURRENT_DATE;
    update documents set registration_date = created_at::date where registration_date is null;
  end if;
end $$;
