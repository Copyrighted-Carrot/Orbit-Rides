create function public.archive_vehicle(p_vehicle_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 perform 1 from public.vehicles where id=p_vehicle_id for update;
 if not found then raise exception 'Vehicle unavailable'; end if;
 perform private.expire_vehicle_holds(p_vehicle_id);
 if exists(select from public.bookings where vehicle_id=p_vehicle_id and state in ('held','awaiting_confirmation','confirmed','ready','active','returned','inspection'))
 then raise exception 'Finish or cancel outstanding reservations before archiving' using errcode='55000'; end if;
 update public.vehicles set operational_state='archived',published=false where id=p_vehicle_id;
end $$;

create function public.update_vehicle_catalogue(p_vehicle_id uuid,p_vehicle_type_id uuid,p_manufacturer text,p_model text,p_daily_rate_minor bigint)
returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_admin();
 update public.vehicles set vehicle_type_id=p_vehicle_type_id,manufacturer=btrim(p_manufacturer),model=btrim(p_model),daily_rate_minor=p_daily_rate_minor
 where id=p_vehicle_id and operational_state<>'archived';
 if not found then raise exception 'Vehicle unavailable'; end if;
end $$;

-- End a failed upload after the Storage API has removed its object. Published
-- versions remain recoverable and attached inspection evidence is never purged.
create function public.finish_discarded_upload(p_media_id uuid,p_inspection boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare path text; bucket text; status text;
begin
 perform private.require_admin();
 if p_inspection then
   select object_path,state into path,status from public.inspection_media where id=p_media_id for update;
   bucket:='rental-inspections';
 else
   select object_path,state into path,status from public.vehicle_media where id=p_media_id for update;
   bucket:='fleet-gallery';
 end if;
 if status is null then return; end if;
 if status<>'discarded' or exists(select from storage.objects where bucket_id=bucket and name=path)
 then raise exception 'Discard the unfinished upload and remove its object first' using errcode='55000'; end if;
 if p_inspection then delete from public.inspection_media where id=p_media_id;
 else delete from public.vehicle_media where id=p_media_id; end if;
end $$;

create function public.booking_receipt(p_booking_id uuid)
returns table(booking_id uuid,booking_reference text,booking_state text,vehicle_id uuid,vehicle_label text,
 customer_name text,starts_at timestamptz,ends_at timestamptz,billable_days integer,rate_minor bigint,
 total_minor bigint,currency text,provider text,payment_state text,confirmed_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select b.id,b.reference,b.state,b.vehicle_id,q.vehicle_label,q.customer_name,q.starts_at,q.ends_at,q.billable_days,
 q.rate_minor,q.total_minor,q.currency,s.provider,s.state,e.occurred_at from public.bookings b join public.quotes q on q.id=b.quote_id
 join public.payment_sessions s on s.booking_id=b.id join public.booking_events e on e.booking_id=b.id and e.event_type='confirmed'
 where b.id=p_booking_id
$$;
create function public.my_rental_summary()
returns table(confirmed_rentals bigint,completed_rentals bigint,completed_demo_rental_value_minor numeric,currency text)
language sql stable security invoker set search_path='' as $$
 select count(*),count(*) filter(where b.state='completed'),
 coalesce(sum(s.amount_minor) filter(where b.state='completed' and s.provider='demo' and s.state='succeeded'),0),'INR'::text
 from public.bookings b join public.payment_sessions s on s.booking_id=b.id
 where b.customer_id=(select auth.uid()) and exists(select from public.booking_events e where e.booking_id=b.id and e.event_type='confirmed')
$$;
revoke all on function public.archive_vehicle(uuid),public.update_vehicle_catalogue(uuid,uuid,text,text,bigint),public.finish_discarded_upload(uuid,boolean),
 public.booking_receipt(uuid),public.my_rental_summary() from public,anon,authenticated;
grant execute on function public.archive_vehicle(uuid),public.update_vehicle_catalogue(uuid,uuid,text,text,bigint),public.finish_discarded_upload(uuid,boolean),
 public.booking_receipt(uuid),public.my_rental_summary() to authenticated;

