-- Optional explicit rotation of the short-lived DEMO-06 checkout example.
-- Run only in isolated staging with SET orbit.demo_seed='enabled'.
-- Repeated calls reuse an unexpired hold. Expired attempts remain in history.
BEGIN;
DO $refresh$
DECLARE actor uuid; vehicle uuid; candidate record; session_id uuid; booking uuid; quote_id uuid;
 now_at timestamptz:=clock_timestamp(); new_request uuid;
BEGIN
 IF current_setting('orbit.demo_seed',true) IS DISTINCT FROM 'enabled'
  OR EXISTS(SELECT FROM auth.users WHERE email NOT LIKE '%@orbit-demo.example.invalid') THEN
  RAISE EXCEPTION 'Explicitly enabled synthetic staging required';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('orbit:demo:lifecycle',0));
 SELECT u.id INTO STRICT actor FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id
  WHERE u.email='customer-a@orbit-demo.example.invalid' AND r.role='customer';
 SELECT id INTO STRICT vehicle FROM public.vehicles WHERE fleet_code='DEMO-06' AND published;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 FOR candidate IN SELECT b.id,p.id AS session_id FROM public.bookings b JOIN public.quotes q ON q.id=b.quote_id
   JOIN public.payment_sessions p ON p.booking_id=b.id WHERE q.customer_id=actor AND q.vehicle_id=vehicle
   AND (q.request_id='d0000000-0000-4000-8000-000000000006'
     OR q.request_id::text LIKE 'd1000000-0000-4000-8000-%')
   AND b.state IN('held','awaiting_confirmation','confirmed','ready','active','returned','inspection')
 LOOP
  PERFORM public.reconcile_checkout(candidate.session_id);
  IF EXISTS(SELECT FROM public.bookings WHERE id=candidate.id AND state='held' AND hold_expires_at>clock_timestamp()) THEN
   RAISE NOTICE 'Current pending checkout reused. Booking %, session %',candidate.id,candidate.session_id;
   RETURN;
  END IF;
  IF EXISTS(SELECT FROM public.bookings WHERE id=candidate.id AND state<>'expired') THEN
   RAISE EXCEPTION 'Demo example already progressed beyond pending. Complete its lifecycle before rotating.';
  END IF;
 END LOOP;
 new_request:=('d1000000-0000-4000-8000-'||left(replace(gen_random_uuid()::text,'-',''),12))::uuid;
 quote_id:=public.create_quote(vehicle,now_at+interval '4 days',now_at+interval '5 days',new_request);
 booking:=public.start_checkout(quote_id);
 SELECT id INTO STRICT session_id FROM public.payment_sessions WHERE booking_id=booking;
 RAISE NOTICE 'New pending demo checkout. Booking %, session %',booking,session_id;
END $refresh$;
COMMIT;

