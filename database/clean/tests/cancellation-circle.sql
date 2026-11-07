-- Isolated staging only; rollback all fixtures and clock changes.
BEGIN;
CREATE FUNCTION pg_temp.check_cancel(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',message; END IF; END $$;
CREATE FUNCTION pg_temp.deny_cancel(statement text,code text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE; END;
 IF actual IS DISTINCT FROM code THEN RAISE EXCEPTION 'Expected %, received %',code,actual; END IF; END $$;
DO $$
DECLARE a uuid; c uuid; other uuid; v uuid; q uuid; b uuid; s uuid; r uuid; second uuid; t timestamptz:=clock_timestamp(); n bigint; payment jsonb;
BEGIN
 SELECT id INTO STRICT a FROM auth.users WHERE email='operator@orbit-demo.example.invalid';
 SELECT id INTO STRICT c FROM auth.users WHERE email='customer-a@orbit-demo.example.invalid';
 SELECT id INTO STRICT other FROM auth.users WHERE email='customer-b@orbit-demo.example.invalid';
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 v:=public.create_vehicle('CANCEL-'||left(gen_random_uuid()::text,8),(SELECT id FROM public.vehicle_types LIMIT 1),'Cancellation','Fixture',10000);
 PERFORM public.set_vehicle_publication(v,true);
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 q:=public.create_quote(v,t+interval '40 days',t+interval '41 days',gen_random_uuid());
 b:=public.start_checkout(q); SELECT id INTO STRICT s FROM public.payment_sessions WHERE booking_id=b;
 PERFORM public.approve_demo_payment(s); PERFORM public.finalize_booking(s);
 SELECT to_jsonb(p) INTO payment FROM public.payment_sessions p WHERE id=s;
 PERFORM set_config('request.jwt.claim.sub',other::text,true);
 PERFORM pg_temp.deny_cancel(format('SELECT public.request_cancellation(%L,%L,%L)',b,'Other owner',gen_random_uuid()),'42501');
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 r:=public.request_cancellation(b,'Plans changed',gen_random_uuid());
 PERFORM pg_temp.check_cancel(public.request_cancellation(b,'Plans changed',r)=r,'Request retry changed ID');
 PERFORM pg_temp.check_cancel(public.request_cancellation(b,'Plans changed',gen_random_uuid())=r,'Concurrent equivalent request was not deduplicated');
 PERFORM pg_temp.check_cancel((SELECT count(*) FROM public.booking_events WHERE booking_id=b AND event_type='cancel_requested')=1,'Duplicate request event');
 PERFORM pg_temp.check_cancel(NOT EXISTS(SELECT FROM public.available_vehicles(t+interval '40 days',t+interval '41 days') WHERE vehicle_id=v),'Pending cancellation released inventory');
 PERFORM pg_temp.deny_cancel(format('SELECT public.decide_cancellation(%L,true,%L)',r,'Approved'),'42501');
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM public.decide_cancellation(r,false,'Please retain this demo booking');
 PERFORM public.decide_cancellation(r,false,'Please retain this demo booking');
 PERFORM pg_temp.deny_cancel(format('SELECT public.decide_cancellation(%L,true,%L)',r,'Changed decision'),'55000');
 PERFORM pg_temp.check_cancel((SELECT state FROM public.bookings WHERE id=b)='confirmed','Rejection changed booking state');
 PERFORM pg_temp.check_cancel(NOT EXISTS(SELECT FROM public.available_vehicles(t+interval '40 days',t+interval '41 days') WHERE vehicle_id=v),'Rejected cancellation released inventory');
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 second:=public.request_cancellation(b,'Please reconsider',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM public.decide_cancellation(second,true,'Demo cancellation accepted');
 PERFORM public.decide_cancellation(second,true,'Demo cancellation accepted');
 PERFORM pg_temp.check_cancel((SELECT state FROM public.bookings WHERE id=b)='cancelled','Acceptance did not cancel booking');
 PERFORM pg_temp.check_cancel(EXISTS(SELECT FROM public.available_vehicles(t+interval '40 days',t+interval '41 days') WHERE vehicle_id=v),'Accepted cancellation did not release interval');
 PERFORM pg_temp.check_cancel((SELECT to_jsonb(p) FROM public.payment_sessions p WHERE id=s)=payment,'Cancellation altered demo payment history');
 PERFORM pg_temp.check_cancel((SELECT count(*) FROM public.booking_events WHERE booking_id=b AND event_type='cancellation_accepted')=1,'Duplicate acceptance event');
 PERFORM pg_temp.check_cancel((SELECT count(*) FROM public.notifications x JOIN public.booking_events e ON e.id=x.event_id WHERE e.booking_id=b AND e.event_type IN('cancellation_accepted','cancellation_rejected'))=2,'Cancellation notification duplication');
 PERFORM pg_temp.check_cancel(EXISTS(SELECT FROM public.booking_events e JOIN public.bookings b2 ON b2.id=e.booking_id WHERE e.booking_id=b AND e.event_type='cancellation_accepted' AND e.previous_state='confirmed' AND e.new_state='cancelled' AND e.booking_reference=b2.reference AND e.actor_id=a),'Transition evidence missing');
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 PERFORM pg_temp.check_cancel(public.request_cancellation(b,'Please reconsider',second)=second,'Lost response request retry failed');
 PERFORM pg_temp.deny_cancel(format('SELECT public.request_cancellation(%L,%L,%L)',b,'Another request',gen_random_uuid()),'55000');
 RAISE NOTICE 'Cancellation circle SQL passed: authorization, retry, rejection, acceptance, inventory, payment preservation and event/notification evidence.';
END $$;
ROLLBACK;
