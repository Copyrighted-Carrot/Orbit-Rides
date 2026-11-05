-- Isolated staging with the synthetic lifecycle seed. All changes roll back.
BEGIN;
DO $guard$
BEGIN
 IF EXISTS(SELECT FROM auth.users WHERE email NOT LIKE '%@orbit-demo.example.invalid') THEN
  RAISE EXCEPTION 'Customer regression requires synthetic identities only';
 END IF;
END $guard$;
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',message; END IF; END $$;
CREATE FUNCTION pg_temp.expect_failure(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE; END;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Expected %, received %',expected,actual; END IF;
END $$;
CREATE TEMP TABLE fixture AS
SELECT b.id booking_id,b.customer_id owner_id,b.vehicle_id,
 (SELECT id FROM auth.users WHERE email='customer-b@orbit-demo.example.invalid') stranger_id,
 (SELECT b2.id FROM public.bookings b2 JOIN public.vehicles v2 ON v2.id=b2.vehicle_id
  WHERE v2.fleet_code='DEMO-03' AND b2.state='confirmed' LIMIT 1) uncompleted_id,
 (SELECT count(*) FROM public.booking_events) event_count
FROM public.bookings b JOIN public.vehicles v ON v.id=b.vehicle_id
WHERE v.fleet_code='DEMO-01' AND b.state='completed';
SELECT pg_temp.assert_true((SELECT count(*) FROM fixture)=1,'Completed synthetic rental missing');
-- Extra ephemeral catalogue rows exercise the recently-viewed retention boundary.
INSERT INTO public.vehicles(fleet_code,vehicle_type_id,manufacturer,model,daily_rate_minor,published)
SELECT 'TEST-RECENT-'||i,(SELECT id FROM public.vehicle_types ORDER BY name LIMIT 1),'Test','Temporary '||i,10000,true
FROM generate_series(1,25) i;
GRANT SELECT ON fixture TO authenticated;

SELECT set_config('request.jwt.claim.sub',(SELECT owner_id::text FROM fixture),true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE original_receipt AS SELECT to_jsonb(r) receipt FROM public.booking_receipt((SELECT booking_id FROM fixture)) r;
SELECT pg_temp.assert_true((SELECT count(*) FROM original_receipt)=1,'Receipt unavailable to owner');
DO $customer$
DECLARE f record; item record; before_value numeric; summary record;
BEGIN
 SELECT * INTO STRICT f FROM fixture;
 PERFORM public.set_wishlist(f.vehicle_id,true);
 PERFORM public.set_wishlist(f.vehicle_id,true);
 PERFORM pg_temp.assert_true((SELECT count(*) FROM public.wishlist WHERE vehicle_id=f.vehicle_id)=1,'Wishlist retry duplicated row');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT FROM public.wishlist WHERE customer_id<>f.owner_id),'Wishlist leaked another owner');
 PERFORM public.set_wishlist(f.vehicle_id,false);
 PERFORM public.set_wishlist(f.vehicle_id,false);
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT FROM public.wishlist WHERE vehicle_id=f.vehicle_id),'Wishlist removal failed');

 FOR item IN SELECT id FROM public.vehicles WHERE fleet_code LIKE 'TEST-RECENT-%' ORDER BY fleet_code LOOP
  PERFORM public.record_vehicle_view(item.id);
  PERFORM public.record_vehicle_view(item.id);
 END LOOP;
 PERFORM pg_temp.assert_true((SELECT count(*) FROM public.recently_viewed)=20,'Recently-viewed limit/retry failed');
 PERFORM pg_temp.expect_failure(format('SELECT public.submit_review(%L,5::smallint,%L)',f.uncompleted_id,'Not yet eligible'),'42501');
 PERFORM pg_temp.expect_failure(format('SELECT public.submit_review(%L,6::smallint,%L)',f.booking_id,'Invalid rating'),'23514');
 PERFORM public.submit_review(f.booking_id,5::smallint,'Synthetic completed-rental review');
 PERFORM public.submit_review(f.booking_id,5::smallint,'Synthetic completed-rental review');
 PERFORM pg_temp.expect_failure(format('SELECT public.submit_review(%L,4::smallint,%L)',f.booking_id,'Conflicting retry'),'23505');
 PERFORM pg_temp.assert_true((SELECT count(*) FROM public.reviews WHERE booking_id=f.booking_id)=1,'Review duplicated');
 PERFORM pg_temp.assert_true((SELECT review_count=1 AND average_rating=5 FROM public.vehicle_review_summary(f.vehicle_id)),'Review aggregate incorrect');

 SELECT coalesce(sum(s.amount_minor),0) INTO before_value
 FROM public.bookings b JOIN public.payment_sessions s ON s.booking_id=b.id
 WHERE b.customer_id=f.owner_id AND b.state='completed' AND s.provider='demo' AND s.state='succeeded';
 SELECT * INTO STRICT summary FROM public.my_rental_summary();
 PERFORM pg_temp.assert_true(summary.completed_rentals>=1 AND summary.completed_demo_rental_value_minor=before_value,'Profile total includes unpaid or incomplete rentals');
 PERFORM public.update_my_profile('Temporary profile rename');
 PERFORM pg_temp.assert_true(
   (SELECT to_jsonb(r) FROM public.booking_receipt(f.booking_id) r)=(SELECT receipt FROM original_receipt),
   'Profile edit mutated historical receipt');
 PERFORM pg_temp.assert_true(
   (SELECT to_jsonb(r) FROM public.booking_receipt(f.booking_id) r)=(SELECT receipt FROM original_receipt),
   'Receipt refresh changed identity');
 PERFORM pg_temp.expect_failure(format('INSERT INTO public.reviews(booking_id,rating,comment) VALUES(%L,5,%L)',f.uncompleted_id,'Forged'),'42501');
END $customer$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT stranger_id::text FROM fixture),true);
SET LOCAL ROLE authenticated;
DO $stranger$
DECLARE f record;
BEGIN
 SELECT * INTO STRICT f FROM fixture;
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT FROM public.booking_receipt(f.booking_id)),'Other customer received receipt');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT FROM public.reviews WHERE booking_id=f.booking_id),'Other customer read private review identity');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT FROM public.recently_viewed WHERE customer_id=f.owner_id),'Recently-viewed leaked owner');
 PERFORM pg_temp.expect_failure(format('SELECT public.submit_review(%L,5::smallint,%L)',f.booking_id,'Wrong owner'),'42501');
END $stranger$;
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*) FROM public.booking_events)=(SELECT event_count FROM fixture),'Reads/social/profile actions created booking events');
-- Public output contains only review content, rating and timestamp; never customer or booking IDs.
GRANT SELECT ON fixture TO anon;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(
 (SELECT count(*)=1 FROM public.vehicle_reviews((SELECT vehicle_id FROM fixture))),
 'Anonymous review read failed');
SELECT pg_temp.expect_failure('SELECT public.my_rental_summary()','42501');
RESET ROLE;
ROLLBACK;
SELECT 'PASS customer records: owner scope, review eligibility/retry, wishlist, recent limit, receipt snapshots, demo totals' AS result;

