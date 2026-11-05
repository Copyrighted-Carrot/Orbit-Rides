-- Fresh Supabase project only. Do not combine this chain with supabase/migrations.
do $guard$ begin
  if exists (select 1 from pg_tables where schemaname='public') or exists (select 1 from auth.users)
  then raise exception 'Clean foundation requires an empty project'; end if;
end $guard$;

create extension if not exists btree_gist with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','admin'))
);
create function private.is_admin() returns boolean language sql stable security definer
set search_path='' as $$
  select exists(select from public.user_roles where user_id=(select auth.uid()) and role='admin')
$$;
revoke all on function private.is_admin() from public,anon,authenticated;
grant execute on function private.is_admin() to authenticated,anon;

create function private.bootstrap_account() returns trigger language plpgsql security definer
set search_path='' as $$
declare label text;
begin
  label := left(btrim(regexp_replace(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),
      nullif(btrim(new.raw_user_meta_data->>'full_name'),''), 'Customer'),'[[:cntrl:]]','','g')),80);
  insert into public.user_profiles(user_id,display_name) values(new.id,coalesce(nullif(label,''),'Customer'));
  insert into public.user_roles(user_id,role) values(new.id,'customer');
  return new;
end $$;
revoke all on function private.bootstrap_account() from public,anon,authenticated;
create trigger orbit_account_created after insert on auth.users for each row execute function private.bootstrap_account();
create function public.update_my_profile(p_display_name text) returns text language plpgsql security definer
set search_path='' as $$
declare label text:=btrim(p_display_name);
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if label is null or length(label) not between 1 and 80 or label ~ '[[:cntrl:]]' then raise exception 'Invalid display name' using errcode='22023'; end if;
  update public.user_profiles set display_name=label,updated_at=now() where user_id=auth.uid();
  if not found then raise exception 'Account profile unavailable'; end if;
  return label;
end $$;
revoke all on function public.update_my_profile(text) from public,anon,authenticated;
grant execute on function public.update_my_profile(text) to authenticated;
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
revoke all on public.user_profiles,public.user_roles from public,anon,authenticated;
grant select on public.user_profiles,public.user_roles to authenticated;
create policy profile_read on public.user_profiles for select to authenticated using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy role_read on public.user_roles for select to authenticated using (user_id=(select auth.uid()) or (select private.is_admin()));

create table public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(btrim(name)) between 1 and 60)
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  fleet_code text unique not null check(fleet_code ~ '^[A-Z0-9-]{2,30}$'),
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete restrict,
  manufacturer text not null check(length(btrim(manufacturer)) between 1 and 80),
  model text not null check(length(btrim(model)) between 1 and 100),
  daily_rate_minor bigint not null check(daily_rate_minor between 1 and 100000000),
  currency text not null default 'INR' check(currency='INR'),
  published boolean not null default false,
  operational_state text not null default 'available' check(operational_state in ('available','maintenance','inspection','archived')),
  created_at timestamptz not null default now(),
  check(operational_state!='archived' or not published)
);
create index vehicles_type_rate on public.vehicles(vehicle_type_id,daily_rate_minor) where published;
create table public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  category text not null check(category in ('exterior','interior','cockpit','rear','detail')),
  position smallint not null check(position between 0 and 31),
  object_path text not null unique,
  content_type text not null check(content_type in ('image/jpeg','image/png','image/webp')),
  byte_length integer not null check(byte_length between 1 and 8388608),
  state text not null default 'pending' check(state in ('pending','current','retired','discarded')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index vehicle_media_current_slot on public.vehicle_media(vehicle_id,category,position) where state='current';

alter table public.vehicle_types enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_media enable row level security;
revoke all on public.vehicle_types,public.vehicles,public.vehicle_media from public,anon,authenticated;
grant select on public.vehicle_types,public.vehicles to anon,authenticated;
-- Gallery reads only need the public media attributes, not the staff member's identity.
grant select (id,vehicle_id,category,position,object_path,content_type,byte_length,state) on public.vehicle_media to anon,authenticated;
create policy type_read on public.vehicle_types for select to anon,authenticated using (true);
create policy vehicle_read on public.vehicles for select to anon,authenticated using (published or (select private.is_admin()));
create policy media_read on public.vehicle_media for select to anon,authenticated using (
 (state='current' and exists(select 1 from public.vehicles v where v.id=vehicle_id and v.published))
 or (select private.is_admin()));

create function private.require_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin if not private.is_admin() then raise exception 'Staff access required' using errcode='42501'; end if; end $$;
revoke all on function private.require_admin() from public,anon,authenticated;

create function public.create_vehicle(p_fleet_code text,p_vehicle_type_id uuid,p_manufacturer text,p_model text,p_daily_rate_minor bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform private.require_admin();
 insert into public.vehicles(fleet_code,vehicle_type_id,manufacturer,model,daily_rate_minor)
 values(upper(btrim(p_fleet_code)),p_vehicle_type_id,btrim(p_manufacturer),btrim(p_model),p_daily_rate_minor) returning id into result;
 return result;
end $$;
create function public.set_vehicle_publication(p_vehicle_id uuid,p_published boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_admin();
 update public.vehicles set published=p_published where id=p_vehicle_id and operational_state<>'archived';
 if not found then raise exception 'Vehicle unavailable'; end if;
end $$;
revoke all on function public.create_vehicle(text,uuid,text,text,bigint), public.set_vehicle_publication(uuid,boolean) from public,anon,authenticated;
grant execute on function public.create_vehicle(text,uuid,text,text,bigint), public.set_vehicle_publication(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('fleet-gallery','fleet-gallery',false,8388608,array['image/jpeg','image/png','image/webp']),
 ('rental-inspections','rental-inspections',false,8388608,array['image/jpeg','image/png','image/webp']);

create function public.prepare_vehicle_media(p_vehicle_id uuid,p_category text,p_position smallint,p_content_type text,p_byte_length integer)
returns public.vehicle_media language plpgsql security definer set search_path='' as $$
declare media public.vehicle_media; media_id uuid:=gen_random_uuid(); extension text;
begin perform private.require_admin();
 if not exists(select from public.vehicles where id=p_vehicle_id and operational_state<>'archived') then raise exception 'Vehicle unavailable'; end if;
 extension:=case p_content_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;
 insert into public.vehicle_media(id,vehicle_id,category,position,object_path,content_type,byte_length,created_by)
 values(media_id,p_vehicle_id,p_category,p_position,p_vehicle_id::text||'/'||media_id::text||'.'||extension,p_content_type,p_byte_length,auth.uid()) returning * into media;
 return media;
end $$;
create function public.publish_vehicle_media(p_media_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.vehicle_media;
begin perform private.require_admin();
 select * into strict m from public.vehicle_media where id=p_media_id;
 perform 1 from public.vehicles where id=m.vehicle_id and operational_state<>'archived' for update;
 if not found then raise exception 'Vehicle unavailable'; end if;
 select * into strict m from public.vehicle_media where id=p_media_id for update;
 if m.state='current' then return; end if;
 if m.state not in ('pending','retired') then raise exception 'Media unavailable'; end if;
 if not exists(select from storage.objects o where o.bucket_id='fleet-gallery' and o.name=m.object_path
   and (o.metadata->>'size')::bigint=m.byte_length and o.metadata->>'mimetype'=m.content_type) then raise exception 'Uploaded object failed validation'; end if;
 update public.vehicle_media set state='retired' where vehicle_id=m.vehicle_id and category=m.category and position=m.position and state='current';
 update public.vehicle_media set state='current' where id=m.id;
end $$;
create function public.discard_vehicle_upload(p_media_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_admin();
 update public.vehicle_media set state='discarded' where id=p_media_id and state in ('pending','discarded');
 if not found then raise exception 'Only unfinished uploads may be discarded'; end if;
end $$;
revoke all on function public.prepare_vehicle_media(uuid,text,smallint,text,integer),public.publish_vehicle_media(uuid),public.discard_vehicle_upload(uuid) from public,anon,authenticated;
grant execute on function public.prepare_vehicle_media(uuid,text,smallint,text,integer),public.publish_vehicle_media(uuid),public.discard_vehicle_upload(uuid) to authenticated;
create policy fleet_read on storage.objects for select to anon,authenticated using (
 bucket_id='fleet-gallery' and exists(select 1 from public.vehicle_media m where m.object_path=name));
create policy fleet_insert on storage.objects for insert to authenticated with check (
 bucket_id='fleet-gallery' and (select private.is_admin()) and exists(select 1 from public.vehicle_media m where m.object_path=name and m.state='pending'));
create policy fleet_discard on storage.objects for delete to authenticated using (
 bucket_id='fleet-gallery' and (select private.is_admin()) and exists(select 1 from public.vehicle_media m where m.object_path=name and m.state='discarded'));

