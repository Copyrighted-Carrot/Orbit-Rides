-- Run as database owner in isolated clean staging. All fixture changes roll back.
BEGIN;
CREATE OR REPLACE FUNCTION private.rental_now() RETURNS timestamptz
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT current_setting('orbit.checkout_test_time')::timestamptz
$$;
CREATE FUNCTION pg_temp.checkout_assert(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',message; END IF; END $$;
CREATE FUNCTION pg_temp.checkout_expect_failure(statement text,expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE; END;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Expected SQLSTATE %, received %',expected,actual; END IF;
END $$;

DO $test$
<<test_case>>
DECLARE
 staff uuid; owner_id uuid; other_id uuid; vehicle uuid; type_id uuid;
 t timestamptz:=clock_timestamp(); starts timestamptz; ends timestamptz;
 q public.quotes; b public.bookings; s public.payment_sessions; altered public.payment_sessions;
 before_snapshot jsonb; booking uuid; second_booking uuid; quote_id uuid; session_id uuid;
 event_total bigint; notice_total bigint; allocation uuid; request uuid:=gen_random_uuid();
 notification_id bigint; old_rejection bigint; canonical_rejection bigint;
BEGIN
 SELECT u.id INTO STRICT staff FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
 WHERE u.email='operator@orbit-demo.example.invalid' AND r.role='admin';
 SELECT u.id INTO STRICT owner_id FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
 WHERE u.email='customer-a@orbit-demo.example.invalid' AND r.role='customer';
 SELECT u.id INTO STRICT other_id FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
 WHERE u.email='customer-b@orbit-demo.example.invalid' AND r.role='customer';
 SELECT id INTO STRICT type_id FROM public.vehicle_types ORDER BY name LIMIT 1;
 PERFORM set_config('orbit.checkout_test_time',t::text,true);
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 UPDATE private.rental_settings SET hold_lifetime=interval '10 minutes';
 PERFORM public.configure_pickup_location('Orbit Rides','Coimbatore, Tamil Nadu, India','Demo pickup location');
 vehicle:=public.create_vehicle('CHECKOUT-'||left(replace(gen_random_uuid()::text,'-',''),15),type_id,'CheckoutFixture','Integrity',125000);
 PERFORM public.set_vehicle_publication(vehicle,true);
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 starts:=t+interval '30 days'; ends:=starts+interval '25 hours';
 quote_id:=public.create_quote(vehicle,starts,ends,request);
 SELECT * INTO STRICT q FROM public.quotes WHERE id=quote_id;
 before_snapshot:=to_jsonb(q);
 PERFORM pg_temp.checkout_assert(q.hold_seconds=600 AND q.total_minor=250000 AND q.billable_days=2 AND q.currency='INR','Server quote snapshot incorrect');
 PERFORM pg_temp.checkout_assert(q.pickup_location_snapshot->>'city'='Coimbatore, Tamil Nadu, India','Demo pickup snapshot missing');
 PERFORM pg_temp.checkout_assert(public.create_quote(vehicle,starts,ends,request)=quote_id,'Quote retry changed identity');
 PERFORM pg_temp.checkout_expect_failure(format('UPDATE public.quotes SET rate_minor=1 WHERE id=%L',quote_id),'55000');
 PERFORM pg_temp.checkout_expect_failure(format('DELETE FROM public.quotes WHERE id=%L',quote_id),'55000');

 -- Configuration/profile/catalogue edits must not change an already issued quote.
 PERFORM public.update_my_profile('Changed synthetic customer');
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM public.configure_pickup_location('Changed demo name','Changed demo city','Changed virtual label');
 PERFORM public.update_vehicle_catalogue(vehicle,type_id,'ChangedFixture','New label',999999);
 UPDATE private.rental_settings SET hold_lifetime=interval '1 minute';
 PERFORM pg_temp.checkout_assert((SELECT to_jsonb(x) FROM public.quotes x WHERE x.id=quote_id)=before_snapshot,'Historical quote changed with current configuration');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 booking:=public.start_checkout(quote_id);
 SELECT * INTO STRICT b FROM public.bookings WHERE id=booking;
 SELECT * INTO STRICT s FROM public.payment_sessions WHERE booking_id=booking;
 session_id:=s.id;
 PERFORM pg_temp.checkout_assert(b.hold_expires_at=b.created_at+interval '10 minutes','Checkout ignored quoted hold duration');
 PERFORM pg_temp.checkout_assert(s.amount_minor=q.total_minor AND s.currency=q.currency AND s.provider='demo','Session did not bind quote amount/currency/provider');
 PERFORM pg_temp.checkout_assert(public.start_checkout(quote_id)=booking,'Lost-response checkout retry changed booking');
 PERFORM pg_temp.checkout_assert(public.finalize_booking(session_id) IS NULL,'Unapproved checkout finalized');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.payment_events pe WHERE pe.session_id=s.id AND event_type='succeeded')=0,'Read/pending finalization created successful payment');

 -- Exercise binding validation with deliberately inconsistent composite inputs.
 altered:=s; altered.amount_minor:=s.amount_minor+1;
 BEGIN PERFORM private.assert_checkout_binding(b,altered,q); RAISE EXCEPTION 'Accepted forged amount binding'; EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
 altered:=s; altered.currency:='USD';
 BEGIN PERFORM private.assert_checkout_binding(b,altered,q); RAISE EXCEPTION 'Accepted forged currency binding'; EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
 altered:=s; altered.booking_id:=gen_random_uuid();
 BEGIN PERFORM private.assert_checkout_binding(b,altered,q); RAISE EXCEPTION 'Accepted wrong booking binding'; EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
 altered:=s; altered.provider:='unregistered-provider';
 BEGIN PERFORM private.assert_checkout_binding(b,altered,q); RAISE EXCEPTION 'Accepted unregistered provider'; EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;

 PERFORM set_config('request.jwt.claim.sub',other_id::text,true);
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.start_checkout(%L)',quote_id),'42501');
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.approve_demo_payment(%L)',session_id),'42501');
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.finalize_booking(%L)',session_id),'42501');
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.approve_demo_payment(%L)',session_id),'42501');
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.finalize_booking(%L)',session_id),'42501');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);

 -- An invalid allocation must block approval/finalization, without weakening RLS or triggers.
 SELECT id INTO STRICT allocation FROM public.vehicle_allocations WHERE booking_id=booking;
 UPDATE public.vehicle_allocations SET created_by=other_id WHERE id=allocation;
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.approve_demo_payment(%L)',session_id),'55000');
 UPDATE public.vehicle_allocations SET created_by=owner_id WHERE id=allocation;
 PERFORM pg_temp.checkout_assert(public.approve_demo_payment(session_id)='succeeded','Explicit demo approval failed');
 UPDATE public.vehicle_allocations SET occupied=tstzrange(starts,ends+q.turnaround+interval '1 minute','[)') WHERE id=allocation;
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.finalize_booking(%L)',session_id),'55000');
 UPDATE public.vehicle_allocations SET occupied=tstzrange(starts,ends+q.turnaround,'[)') WHERE id=allocation;
 UPDATE public.vehicle_allocations SET released_at=t WHERE id=allocation;
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.finalize_booking(%L)',session_id),'55000');
 UPDATE public.vehicle_allocations SET released_at=NULL WHERE id=allocation;

 -- Timely approval retained the allocation; a delayed explicit finalization is safe.
 PERFORM set_config('orbit.checkout_test_time',(t+interval '11 minutes')::text,true);
 PERFORM pg_temp.checkout_assert(public.reconcile_checkout(session_id)='succeeded','Timely approved payment expired');
 PERFORM pg_temp.checkout_assert(public.finalize_booking(session_id)=booking,'Late finalization changed booking');
 PERFORM pg_temp.checkout_assert((SELECT array_agg(event_type ORDER BY id) FROM public.booking_events WHERE booking_id=booking)=ARRAY['hold_created','payment_pending','payment_succeeded','confirmed'],'Canonical checkout sequence incorrect');
 SELECT count(*) INTO event_total FROM public.booking_events WHERE booking_id=booking;
 SELECT count(*) INTO notice_total FROM public.notifications n JOIN public.booking_events e ON e.id=n.event_id WHERE e.booking_id=booking;
 PERFORM pg_temp.checkout_assert(notice_total=2,'Payment/confirmation notification projection missing');
 PERFORM public.approve_demo_payment(session_id); PERFORM public.finalize_booking(session_id);
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_events WHERE booking_id=booking)=event_total,'Duplicate finalization added event');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.notifications n JOIN public.booking_events e ON e.id=n.event_id WHERE e.booking_id=booking)=notice_total,'Retry duplicated notification');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.payment_events pe WHERE pe.session_id=s.id AND event_type='succeeded')=1,'Duplicate successful payment event');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_receipt(booking))=1,'Confirmed receipt missing');
 PERFORM pg_temp.checkout_assert(NOT EXISTS(SELECT FROM public.available_vehicles(starts,ends) WHERE vehicle_id=vehicle),'Confirmed reservation did not affect availability');
 SELECT id INTO notification_id FROM public.booking_events WHERE booking_id=booking AND event_type='confirmed';
 PERFORM public.mark_notification_read(notification_id); PERFORM public.mark_notification_read(notification_id);
 PERFORM pg_temp.checkout_assert((SELECT read_at IS NOT NULL FROM public.notifications WHERE event_id=notification_id),'Notification read state not persisted');

 -- Expired unpaid sessions release inventory once and cannot later be approved.
 UPDATE private.rental_settings SET hold_lifetime=interval '10 minutes';
 starts:=t+interval '33 days'; ends:=starts+interval '1 day';
 quote_id:=public.create_quote(vehicle,starts,ends,gen_random_uuid());
 second_booking:=public.start_checkout(quote_id);
 SELECT id INTO session_id FROM public.payment_sessions WHERE booking_id=second_booking;
 PERFORM set_config('orbit.checkout_test_time',(t+interval '22 minutes')::text,true);
 PERFORM pg_temp.checkout_assert(EXISTS(SELECT FROM public.available_vehicles(starts,ends) WHERE vehicle_id=vehicle),'Stale hold blocked discovery');
 PERFORM pg_temp.checkout_assert(public.approve_demo_payment(session_id)='expired','Expired session accepted approval');
 PERFORM pg_temp.checkout_assert(public.reconcile_checkout(session_id)='expired','Expired reconciliation inconsistent');
 PERFORM pg_temp.checkout_assert(public.finalize_booking(session_id) IS NULL,'Expired session finalized');
 PERFORM pg_temp.checkout_assert((SELECT state FROM public.bookings WHERE id=second_booking)='expired','Hold state not expired');
 PERFORM pg_temp.checkout_assert((SELECT released_at IS NOT NULL FROM public.vehicle_allocations WHERE booking_id=second_booking),'Expired allocation not released');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_events WHERE booking_id=second_booking AND event_type='hold_expired')=1,'Duplicate hold expiry event');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_events WHERE booking_id=second_booking AND event_type='payment_expired')=1,'Duplicate payment expiry event');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.payment_events pe WHERE pe.session_id=test_case.session_id AND pe.event_type='expired')=1,'Duplicate expired payment event');

 -- The expired allocation cannot prevent a new valid checkout for that interval.
 quote_id:=public.create_quote(vehicle,starts,ends,gen_random_uuid());
 second_booking:=public.start_checkout(quote_id);
 SELECT id INTO session_id FROM public.payment_sessions WHERE booking_id=second_booking;
 PERFORM pg_temp.checkout_assert(public.abandon_checkout(session_id)='cancelled','Cleanup checkout abandonment failed');

 -- Tamper only fresh fixture state in this rollback transaction: a late provider event is invalid.
 starts:=t+interval '36 days'; ends:=starts+interval '1 day';
 quote_id:=public.create_quote(vehicle,starts,ends,gen_random_uuid());
 second_booking:=public.start_checkout(quote_id);
 SELECT * INTO STRICT b FROM public.bookings WHERE id=second_booking;
 SELECT * INTO STRICT s FROM public.payment_sessions WHERE booking_id=second_booking;
 UPDATE public.payment_sessions SET state='succeeded' WHERE id=s.id;
 UPDATE public.bookings SET state='awaiting_confirmation' WHERE id=second_booking;
 INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,actor_id,reason,occurred_at)
 VALUES(s.id,'succeeded',s.provider,s.amount_minor,s.currency,owner_id,'Invalid timestamp fixture',b.hold_expires_at);
 PERFORM pg_temp.checkout_expect_failure(format('SELECT public.finalize_booking(%L)',s.id),'55000');

 -- Historical rejection spelling remains readable; new emissions use the agreed name.
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 INSERT INTO public.booking_events(booking_id,event_type,actor_kind,actor_id,reason,occurred_at)
 VALUES(booking,'cancel_rejected','admin',staff,'Historical spelling fixture',private.rental_now()) RETURNING id INTO old_rejection;
 PERFORM private.emit_booking_event(booking,'cancel_rejected','Canonical spelling fixture');
 SELECT id INTO canonical_rejection FROM public.booking_events WHERE booking_id=booking AND event_type='cancellation_rejected';
 PERFORM pg_temp.checkout_assert(canonical_rejection IS NOT NULL AND canonical_rejection<>old_rejection,'Rejection event compatibility failed');
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.notifications WHERE event_id IN(old_rejection,canonical_rejection))=2,'Rejection notification projection failed');

 -- Actual API role read/write boundaries, using only synthetic fixture records.
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_receipt(booking))=1,'Admin receipt visibility failed');
 PERFORM set_config('request.jwt.claim.sub',other_id::text,true);
 PERFORM pg_temp.checkout_assert((SELECT count(*) FROM public.booking_receipt(booking))=0,'Wrong customer read receipt');
 PERFORM pg_temp.checkout_assert(NOT EXISTS(SELECT FROM public.notifications WHERE event_id=notification_id),'Wrong customer read notification');
 PERFORM pg_temp.checkout_expect_failure(format('UPDATE public.payment_sessions SET state=%L WHERE id=%L','succeeded',s.id),'42501');
 EXECUTE 'RESET ROLE';
 RAISE NOTICE 'Checkout integrity passed: snapshots, hold binding, actor scope, verified payment, allocation, expiry, retries, notification and receipt consistency.';
END $test$;
ROLLBACK;
