-- Isolated staging only. Enable explicitly with SET orbit.demo_seed='enabled'.
-- A single transaction hides the fixture clock from all other sessions. The normal
-- server clock is restored before commit. Fresh Auth users must already exist.
-- DEMO-11 is reserved for the independent concurrent-checkout test.
BEGIN;
DO $guard$
BEGIN
 IF current_setting('orbit.demo_seed',true) IS DISTINCT FROM 'enabled' THEN
  RAISE EXCEPTION 'Demo seed must be enabled explicitly';
 END IF;
 IF EXISTS(SELECT FROM auth.users WHERE email NOT LIKE '%@orbit-demo.example.invalid') THEN
  RAISE EXCEPTION 'Lifecycle seed requires exclusively synthetic staging identities';
 END IF;
END $guard$;
CREATE OR REPLACE FUNCTION private.rental_now() RETURNS timestamptz
LANGUAGE sql VOLATILE SET search_path='' AS $clock$
 SELECT current_setting('orbit.fixture_time')::timestamptz
$clock$;
DO $seed$
DECLARE
 staff uuid; customer_a uuid; customer_b uuid; actor uuid; vehicle uuid; item record;
 base_time timestamptz:=clock_timestamp(); starts timestamptz; ends timestamptz;
 quote_id uuid; booking uuid; session_id uuid; existing public.bookings; cancel_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('orbit:demo:lifecycle',0));
 SELECT u.id INTO STRICT staff FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='operator@orbit-demo.example.invalid' AND r.role='admin';
 SELECT u.id INTO STRICT customer_a FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='customer-a@orbit-demo.example.invalid' AND r.role='customer';
 SELECT u.id INTO STRICT customer_b FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='customer-b@orbit-demo.example.invalid' AND r.role='customer';
 FOR item IN SELECT * FROM (VALUES
  ('DEMO-01','completed',interval '-7 days',interval '-5 days','d0000000-0000-4000-8000-000000000001'::uuid),
  ('DEMO-02','active',interval '-1 day',interval '1 day','d0000000-0000-4000-8000-000000000002'::uuid),
  ('DEMO-03','confirmed',interval '2 days',interval '3 days','d0000000-0000-4000-8000-000000000003'::uuid),
  ('DEMO-04','cancelled',interval '3 days',interval '4 days','d0000000-0000-4000-8000-000000000004'::uuid),
  ('DEMO-08','inspection',interval '-3 days',interval '-1 day','d0000000-0000-4000-8000-000000000008'::uuid)
 ) AS examples(code,target_state,start_offset,end_offset,request_id)
 LOOP
  actor:=CASE WHEN item.code IN('DEMO-02','DEMO-04') THEN customer_b ELSE customer_a END;
  SELECT id INTO STRICT vehicle FROM public.vehicles WHERE fleet_code=item.code AND published;
  SELECT b.* INTO existing FROM public.bookings b JOIN public.quotes q ON q.id=b.quote_id
   WHERE q.customer_id=actor AND q.request_id=item.request_id;
  IF FOUND THEN
   IF existing.vehicle_id<>vehicle THEN RAISE EXCEPTION 'Existing fixture has different vehicle'; END IF;
   RAISE NOTICE 'Preserved % booking %, current state %',item.code,existing.reference,existing.state;
   CONTINUE;
  END IF;
  starts:=base_time+item.start_offset; ends:=base_time+item.end_offset;
  PERFORM set_config('orbit.fixture_time',least(base_time-interval '1 minute',starts-interval '1 hour')::text,true);
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  quote_id:=public.create_quote(vehicle,starts,ends,item.request_id);
  booking:=public.start_checkout(quote_id);
  SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=booking;
  PERFORM public.approve_demo_payment(session_id);
  IF public.finalize_booking(session_id)<>booking THEN RAISE EXCEPTION 'Fixture finalization failed'; END IF;
  IF item.target_state='cancelled' THEN
   cancel_id:=public.request_cancellation(booking,'Synthetic customer changed plans','d0000000-0000-4000-8000-000000000014');
   PERFORM set_config('request.jwt.claim.sub',staff::text,true);
   PERFORM public.decide_cancellation(cancel_id,true,'Demo cancellation approved without financial adjustments');
  ELSIF item.target_state IN('active','completed','inspection') THEN
   PERFORM set_config('request.jwt.claim.sub',staff::text,true);
   PERFORM public.mark_ready(booking);
   PERFORM set_config('orbit.fixture_time',(starts+interval '5 minutes')::text,true);
   PERFORM public.pick_up(booking,'Synthetic fixture: good condition',90,10000,'','Demo pickup record');
   IF item.target_state IN('completed','inspection') THEN
    PERFORM set_config('orbit.fixture_time',(ends-interval '20 minutes')::text,true);
    PERFORM public.return_vehicle(booking,'Synthetic fixture: returned for inspection',65,10250,'','Demo return record');
    PERFORM public.start_inspection(booking);
    PERFORM set_config('orbit.fixture_time',(ends+interval '10 minutes')::text,true);
    PERFORM public.finish_inspection(booking,item.target_state='completed',
     CASE WHEN item.target_state='completed' THEN 'Synthetic checks passed' ELSE 'Synthetic tyre check requires staff attention' END);
   END IF;
  END IF;
  IF (SELECT state FROM public.bookings WHERE id=booking)<>item.target_state THEN
   RAISE EXCEPTION 'Fixture % did not reach %',item.code,item.target_state;
  END IF;
  RAISE NOTICE 'Created % demo booking in state %',item.code,item.target_state;
 END LOOP;
 -- Maintenance uses the same inventory exclusion boundary as reservations.
 PERFORM set_config('request.jwt.claim.sub',staff::text,true);
 PERFORM set_config('orbit.fixture_time',base_time::text,true);
 SELECT id INTO STRICT vehicle FROM public.vehicles WHERE fleet_code='DEMO-05' AND published;
 IF NOT EXISTS(SELECT FROM public.vehicle_allocations WHERE request_id='d0000000-0000-4000-8000-000000000005') THEN
  PERFORM public.block_vehicle(vehicle,base_time-interval '1 day',base_time+interval '7 days',
   'Synthetic scheduled maintenance','d0000000-0000-4000-8000-000000000005');
 END IF;
 -- Create the short-lived pending checkout last. A rerun preserves the original
 -- reference and reconciles expiry instead of creating another durable booking.
 PERFORM set_config('request.jwt.claim.sub',customer_a::text,true);
 PERFORM set_config('orbit.fixture_time',clock_timestamp()::text,true);
 SELECT id INTO STRICT vehicle FROM public.vehicles WHERE fleet_code='DEMO-06' AND published;
 SELECT b.* INTO existing FROM public.bookings b JOIN public.quotes q ON q.id=b.quote_id
  WHERE q.customer_id=customer_a AND q.request_id='d0000000-0000-4000-8000-000000000006';
 IF FOUND THEN
  SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=existing.id;
  PERFORM public.reconcile_checkout(session_id);
  RAISE NOTICE 'Preserved initial demo checkout %. Use 003_refresh_demo_checkout.sql for a new pending example after expiry.',existing.reference;
 ELSE
  quote_id:=public.create_quote(vehicle,base_time+interval '4 days',base_time+interval '5 days',
   'd0000000-0000-4000-8000-000000000006');
  booking:=public.start_checkout(quote_id);
  IF NOT EXISTS(SELECT FROM public.bookings b JOIN public.payment_sessions p ON p.booking_id=b.id
    WHERE b.id=booking AND b.state='held' AND p.state='pending' AND b.hold_expires_at>private.rental_now()) THEN
   RAISE EXCEPTION 'Pending demo checkout was not initialized';
  END IF;
 END IF;
END $seed$;
CREATE OR REPLACE FUNCTION private.rental_now() RETURNS timestamptz
LANGUAGE sql VOLATILE SET search_path='' AS $clock$ SELECT clock_timestamp() $clock$;
COMMIT;
SELECT v.fleet_code,b.reference,b.state,p.state AS demo_payment_state,b.hold_expires_at
FROM public.bookings b JOIN public.vehicles v ON v.id=b.vehicle_id
JOIN public.quotes q ON q.id=b.quote_id JOIN public.payment_sessions p ON p.booking_id=b.id
WHERE q.request_id IN('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',
 'd0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',
 'd0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000008')
ORDER BY v.fleet_code;

