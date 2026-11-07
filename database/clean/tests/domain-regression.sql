-- Run on an isolated clean database as its owner. Every change is rolled back.
BEGIN;
CREATE OR REPLACE FUNCTION private.rental_now() RETURNS timestamptz
LANGUAGE sql VOLATILE SET search_path='' AS $clock$
 SELECT current_setting('orbit.fixture_time')::timestamptz
$clock$;
CREATE FUNCTION pg_temp.expect_failure(p_sql text,p_state text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN
 BEGIN EXECUTE p_sql; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE; END;
 IF actual IS DISTINCT FROM p_state THEN RAISE EXCEPTION 'Expected SQLSTATE %, received % for %',p_state,actual,p_sql; END IF;
END $$;
DO $tests$
<<test_case>>
DECLARE
 staff uuid; owner_id uuid; stranger uuid; vehicle uuid; type_id uuid;
 baseline timestamptz:=clock_timestamp(); start_at timestamptz; end_at timestamptz;
 quote_id uuid; other_quote uuid; booking uuid; session_id uuid; request uuid:=gen_random_uuid();
 inspection uuid; return_inspection uuid; image public.inspection_media; cancellation uuid:=gen_random_uuid();
 before_events bigint; before_notifications bigint; allocation uuid;
BEGIN
 SELECT u.id INTO STRICT staff FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='operator@orbit-demo.example.invalid' AND r.role='admin';
 SELECT u.id INTO STRICT owner_id FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='customer-a@orbit-demo.example.invalid' AND r.role='customer';
 SELECT u.id INTO STRICT stranger FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='customer-b@orbit-demo.example.invalid' AND r.role='customer';
 SELECT id INTO STRICT type_id FROM public.vehicle_types ORDER BY name LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM public.configure_pickup_location('Regression pickup','Test city','Virtual regression location');
 PERFORM set_config('orbit.fixture_time',baseline::text,true);
 vehicle:=public.create_vehicle('TEST-'||left(replace(gen_random_uuid()::text,'-',''),15),type_id,'Test','Domain regression',125000);
 PERFORM public.set_vehicle_publication(vehicle,true);
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 start_at:=baseline+interval '1 day'; end_at:=start_at+interval '25 hours';
 quote_id:=public.create_quote(vehicle,start_at,end_at,request);
 IF (SELECT total_minor FROM public.quotes WHERE id=quote_id)<>250000 THEN RAISE EXCEPTION 'Started 24-hour pricing failed'; END IF;
 IF public.create_quote(vehicle,start_at,end_at,request)<>quote_id THEN RAISE EXCEPTION 'Quote retry changed identity'; END IF;
 PERFORM pg_temp.expect_failure(format('SELECT public.create_quote(%L,%L,%L,%L)',vehicle,start_at,end_at+interval '1 hour',request),'22023');
 PERFORM pg_temp.expect_failure(format('SELECT public.create_quote(%L,%L,%L,%L)',gen_random_uuid(),start_at,end_at,gen_random_uuid()),'P0001');
 PERFORM pg_temp.expect_failure(format('SELECT public.create_quote(%L,%L,%L,%L)',vehicle,end_at,start_at,gen_random_uuid()),'22023');
 PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
 other_quote:=public.create_quote(vehicle,start_at,end_at,gen_random_uuid());
 PERFORM pg_temp.expect_failure(format('SELECT public.start_checkout(%L)',quote_id),'42501');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 booking:=public.start_checkout(quote_id);
 SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=booking;
 IF public.finalize_booking(session_id) IS NOT NULL THEN RAISE EXCEPTION 'Unapproved checkout finalized'; END IF;
 IF public.start_checkout(quote_id)<>booking THEN RAISE EXCEPTION 'Checkout retry duplicated booking'; END IF;
 PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
 PERFORM pg_temp.expect_failure(format('SELECT public.start_checkout(%L)',other_quote),'23P01');
 PERFORM pg_temp.expect_failure(format('SELECT public.approve_demo_payment(%L)',session_id),'42501');
 PERFORM pg_temp.expect_failure(format('SELECT public.finalize_booking(%L)',session_id),'42501');
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM pg_temp.expect_failure(format('SELECT public.block_vehicle(%L,%L,%L,%L,%L)',vehicle,start_at,end_at,'Collision test',gen_random_uuid()),'23P01');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 IF public.approve_demo_payment(session_id)<>'succeeded' THEN RAISE EXCEPTION 'Demo approval failed'; END IF;
 PERFORM set_config('orbit.fixture_time',(baseline+interval '11 minutes')::text,true);
 IF public.reconcile_checkout(session_id)<>'succeeded' THEN RAISE EXCEPTION 'Paid reservation expired'; END IF;
 IF public.finalize_booking(session_id)<>booking THEN RAISE EXCEPTION 'Finalization changed booking'; END IF;
 SELECT count(*) INTO before_events FROM public.booking_events WHERE booking_id=booking;
 SELECT count(*) INTO before_notifications FROM public.notifications WHERE customer_id=owner_id;
 PERFORM public.approve_demo_payment(session_id);
 PERFORM public.finalize_booking(session_id);
 IF (SELECT count(*) FROM public.booking_events WHERE booking_id=booking)<>before_events
 OR (SELECT count(*) FROM public.notifications WHERE customer_id=owner_id)<>before_notifications THEN
  RAISE EXCEPTION 'Retry duplicated events or notifications'; END IF;
 IF (SELECT count(*) FROM public.payment_events e WHERE e.session_id=test_case.session_id AND e.event_type='succeeded')<>1 THEN RAISE EXCEPTION 'Duplicate provider event'; END IF;
 PERFORM pg_temp.expect_failure(format('SELECT public.mark_ready(%L)',booking),'42501');
 PERFORM public.request_cancellation(booking,'Test request',cancellation);
 IF EXISTS(SELECT FROM public.available_vehicles(start_at,end_at) WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Request released inventory'; END IF;
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM public.decide_cancellation(cancellation,false,'Rental retained');
 PERFORM public.mark_ready(booking);
 PERFORM pg_temp.expect_failure(format('SELECT public.pick_up(%L,%L,80,1000)',booking,'Good'),'55000');
 PERFORM set_config('orbit.fixture_time',(start_at+interval '1 minute')::text,true);
 inspection:=public.pick_up(booking,'Good',80,1000,'Existing scuff','Staff-only fixture');
 IF public.pick_up(booking,'Good',80,1000,'Existing scuff','Staff-only fixture')<>inspection THEN RAISE EXCEPTION 'Pickup retry failed'; END IF;
 PERFORM pg_temp.expect_failure(format('SELECT public.pick_up(%L,%L,80,1001,%L,%L)',booking,'Good','Existing scuff','Staff-only fixture'),'22023');
 PERFORM pg_temp.expect_failure(format('SELECT public.return_vehicle(%L,%L,60,999)',booking,'Good'),'22023');
 PERFORM pg_temp.expect_failure(format('SELECT public.finish_inspection(%L,true,%L)',booking,'Premature'),'55000');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM pg_temp.expect_failure(format('SELECT public.request_cancellation(%L,%L,%L)',booking,'After pickup',gen_random_uuid()),'55000');
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM set_config('orbit.fixture_time',(end_at+interval '5 hours')::text,true);
 return_inspection:=public.return_vehicle(booking,'Needs checks',45,1234,'Check tyre','Internal note');
 PERFORM public.start_inspection(booking);
 IF public.finish_inspection(booking,false,'Tyre requires attention')<>'inspection' THEN RAISE EXCEPTION 'Failed inspection completed booking'; END IF;
 IF (SELECT operational_state FROM public.vehicles WHERE id=vehicle)<>'maintenance' THEN RAISE EXCEPTION 'Failed inspection released vehicle'; END IF;
 IF EXISTS(SELECT FROM public.available_vehicles(end_at+interval '1 day',end_at+interval '2 days') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Failed inspection vehicle discoverable'; END IF;
 image:=public.prepare_inspection_media(return_inspection,'image/png',100);
 PERFORM pg_temp.expect_failure(format('SELECT public.attach_inspection_media(%L)',image.id),'55000');
 PERFORM public.discard_inspection_upload(image.id);
 IF public.finish_inspection(booking,true,'Tyre corrected and checks passed')<>'inspection' THEN RAISE EXCEPTION 'Inspection must await explicit completion'; END IF;
 PERFORM public.complete_booking(booking);
 PERFORM public.finish_inspection(booking,true,'Tyre corrected and checks passed');
 IF EXISTS(SELECT FROM public.available_vehicles(end_at+interval '6 hours',end_at+interval '1 day') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Actual-return turnaround ignored'; END IF;
 IF NOT EXISTS(SELECT FROM public.available_vehicles(end_at+interval '8 hours',end_at+interval '1 day') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Completed vehicle unavailable after turnaround'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 IF public.finalize_booking(session_id)<>booking THEN RAISE EXCEPTION 'Historical receipt retry changed booking'; END IF;
 PERFORM pg_temp.expect_failure(format('UPDATE public.booking_events SET reason=%L WHERE booking_id=%L','Changed',booking),'55000');
 -- New hold expiry and explicit cancellation each release their own interval.
 start_at:=end_at+interval '2 days'; end_at:=start_at+interval '1 day';
 quote_id:=public.create_quote(vehicle,start_at,end_at,gen_random_uuid());
 booking:=public.start_checkout(quote_id);
 SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=booking;
 PERFORM set_config('orbit.fixture_time',(private.rental_now()+interval '11 minutes')::text,true);
 IF NOT EXISTS(SELECT FROM public.available_vehicles(start_at,end_at) WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Expired hold still visible as blocker'; END IF;
 IF public.approve_demo_payment(session_id)<>'expired' THEN RAISE EXCEPTION 'Expired payment accepted'; END IF;
 PERFORM public.reconcile_checkout(session_id);
 IF (SELECT count(*) FROM public.booking_events WHERE booking_id=booking AND event_type='hold_expired')<>1 THEN RAISE EXCEPTION 'Expiry retry duplicated event'; END IF;
 quote_id:=public.create_quote(vehicle,start_at,end_at,gen_random_uuid()); booking:=public.start_checkout(quote_id);
 SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=booking;
 PERFORM public.approve_demo_payment(session_id); PERFORM public.finalize_booking(session_id);
 cancellation:=gen_random_uuid(); PERFORM public.request_cancellation(booking,'No longer required',cancellation);
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM public.decide_cancellation(cancellation,true,'Accepted by operator');
 PERFORM public.decide_cancellation(cancellation,true,'Accepted by operator');
 IF NOT EXISTS(SELECT FROM public.available_vehicles(start_at,end_at) WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Accepted cancellation retained inventory'; END IF;
 IF (SELECT state FROM public.payment_sessions WHERE id=session_id)<>'succeeded' THEN RAISE EXCEPTION 'Cancellation fabricated payment reversal'; END IF;
 allocation:=public.block_vehicle(vehicle,start_at,end_at,'Maintenance fixture',gen_random_uuid());
 IF EXISTS(SELECT FROM public.available_vehicles(start_at,end_at) WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Maintenance ignored'; END IF;
 PERFORM public.release_maintenance_block(allocation); PERFORM public.release_maintenance_block(allocation);
 IF NOT EXISTS(SELECT FROM public.available_vehicles(start_at,end_at) WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Maintenance release failed'; END IF;
 -- RLS and table privilege checks under the actual database client role.
 PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT FROM public.bookings WHERE id=booking) THEN RAISE EXCEPTION 'Wrong owner read booking'; END IF;
 IF EXISTS(SELECT FROM public.inspections WHERE id=return_inspection) THEN RAISE EXCEPTION 'Customer read staff notes'; END IF;
 PERFORM pg_temp.expect_failure(format('UPDATE public.payment_sessions SET state=%L WHERE id=%L','succeeded',session_id),'42501');
 PERFORM pg_temp.expect_failure(format('UPDATE public.bookings SET customer_id=%L WHERE id=%L',stranger,booking),'42501');
 PERFORM pg_temp.expect_failure(format('UPDATE public.quotes SET rate_minor=1 WHERE id=%L',quote_id),'42501');
 EXECUTE 'RESET ROLE';
 RAISE NOTICE 'Domain regression passed: price, identity, overlap, expiry, retries, cancellation, fulfillment, inspection, media failure, RLS.';
END $tests$;
ROLLBACK;

