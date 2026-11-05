create table public.wishlist (
 customer_id uuid not null references auth.users(id) on delete cascade,
 vehicle_id uuid not null references public.vehicles(id) on delete restrict,
 created_at timestamptz not null default now(),
 primary key(customer_id,vehicle_id)
);
create table public.recently_viewed (
 customer_id uuid not null references auth.users(id) on delete cascade,
 vehicle_id uuid not null references public.vehicles(id) on delete restrict,
 viewed_at timestamptz not null,
 primary key(customer_id,vehicle_id)
);
create index recently_viewed_by_time on public.recently_viewed(customer_id,viewed_at desc);
-- The booking provides the reviewer and vehicle. Only one review can exist per completed rental.
create table public.reviews (
 booking_id uuid primary key references public.bookings(id) on delete restrict,
 rating smallint not null check(rating between 1 and 5),
 comment text not null check(length(btrim(comment)) between 1 and 1000),
 created_at timestamptz not null default now()
);
alter table public.wishlist enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.reviews enable row level security;
revoke all on public.wishlist,public.recently_viewed,public.reviews from public,anon,authenticated;
grant select on public.wishlist,public.recently_viewed,public.reviews to authenticated;
create policy wishlist_owner on public.wishlist for select to authenticated using(customer_id=(select auth.uid()));
create policy recently_viewed_owner on public.recently_viewed for select to authenticated using(customer_id=(select auth.uid()));
create policy review_owner_or_admin on public.reviews for select to authenticated using(
 exists(select from public.bookings b where b.id=booking_id));

create function public.set_wishlist(p_vehicle_id uuid,p_saved boolean) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_customer();
begin
 if p_saved is null then raise exception 'Choose add or remove' using errcode='22023'; end if;
 if not p_saved then delete from public.wishlist where customer_id=u and vehicle_id=p_vehicle_id; return; end if;
 if not exists(select from public.vehicles where id=p_vehicle_id and published) then raise exception 'Vehicle unavailable'; end if;
 insert into public.wishlist(customer_id,vehicle_id) values(u,p_vehicle_id) on conflict do nothing;
end $$;

create function public.record_vehicle_view(p_vehicle_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_customer();
begin
 if not exists(select from public.vehicles where id=p_vehicle_id and published) then raise exception 'Vehicle unavailable'; end if;
 perform 1 from public.user_profiles where user_id=u for update;
 insert into public.recently_viewed(customer_id,vehicle_id,viewed_at) values(u,p_vehicle_id,clock_timestamp())
 on conflict(customer_id,vehicle_id) do update set viewed_at=excluded.viewed_at;
 delete from public.recently_viewed where customer_id=u and vehicle_id in
 (select vehicle_id from public.recently_viewed where customer_id=u order by viewed_at desc,vehicle_id offset 20);
end $$;

create function public.submit_review(p_booking_id uuid,p_rating smallint,p_comment text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_customer(); existing public.reviews;
begin
 if not exists(select from public.bookings where id=p_booking_id and customer_id=u and state='completed' for update)
 then raise exception 'A completed rental is required' using errcode='42501'; end if;
 select * into existing from public.reviews where booking_id=p_booking_id;
 if found then
   if (existing.rating,existing.comment) is not distinct from (p_rating,btrim(p_comment)) then return; end if;
   raise exception 'This rental already has a review' using errcode='23505';
 end if;
 insert into public.reviews(booking_id,rating,comment) values(p_booking_id,p_rating,btrim(p_comment));
end $$;
create function public.vehicle_review_summary(p_vehicle_id uuid)
returns table(review_count bigint,average_rating numeric)
language sql stable security definer set search_path='' as $$
 select count(*),round(avg(r.rating),2) from public.reviews r join public.bookings b on b.id=r.booking_id
 join public.vehicles v on v.id=b.vehicle_id where v.id=p_vehicle_id and v.published and b.state='completed'
$$;
create function public.vehicle_reviews(p_vehicle_id uuid,p_limit integer default 20,p_offset integer default 0)
returns table(rating smallint,comment text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select r.rating,r.comment,r.created_at from public.reviews r join public.bookings b on b.id=r.booking_id
 join public.vehicles v on v.id=b.vehicle_id where v.id=p_vehicle_id and v.published and b.state='completed'
 order by r.created_at desc,r.booking_id limit least(greatest(coalesce(p_limit,20),1),50) offset greatest(coalesce(p_offset,0),0)
$$;
revoke all on function public.set_wishlist(uuid,boolean),public.record_vehicle_view(uuid),public.submit_review(uuid,smallint,text),public.vehicle_review_summary(uuid),public.vehicle_reviews(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.set_wishlist(uuid,boolean),public.record_vehicle_view(uuid),public.submit_review(uuid,smallint,text) to authenticated;
grant execute on function public.vehicle_review_summary(uuid),public.vehicle_reviews(uuid,integer,integer) to anon,authenticated;

