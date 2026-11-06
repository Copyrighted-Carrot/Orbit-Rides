BEGIN;
SELECT set_config('request.jwt.claim.sub','d87a4c9a-0ef7-4d3a-96f8-d7c4802e92d4',true);
SELECT public.configure_pickup_location('Test pickup','Test city','Test address');
CREATE TEMP TABLE fleet_probe(cheap uuid,expensive uuid,draft uuid,starts_at timestamptz,ends_at timestamptz);
INSERT INTO fleet_probe SELECT
 public.create_vehicle('QUERY-CHEAP-'||substr(gen_random_uuid()::text,1,8),id,'SearchFixture','Ordinary',5000),
 public.create_vehicle('QUERY-HIGH-'||substr(gen_random_uuid()::text,1,8),id,'SearchFixture','Higher',15000),
 public.create_vehicle('QUERY-DRAFT-'||substr(gen_random_uuid()::text,1,8),id,'SearchFixture','Hidden',1000),
 clock_timestamp()+interval '80 days',clock_timestamp()+interval '81 days'
 FROM public.vehicle_types ORDER BY id LIMIT 1;
SELECT public.set_vehicle_publication(cheap,true),public.set_vehicle_publication(expensive,true) FROM fleet_probe;
GRANT SELECT ON fleet_probe TO anon,authenticated;
CREATE TEMP TABLE quote_probe(id uuid);
GRANT SELECT,INSERT ON quote_probe TO authenticated;
SET LOCAL ROLE anon;
DO $$DECLARE result jsonb; BEGIN
 result:=public.search_fleet(p_query=>'SearchFixture',p_max_rate_minor=>6000);
 IF (result->>'total')::int<>1 OR result->'vehicles'->0->>'model'<>'Ordinary' THEN RAISE EXCEPTION 'Normal price filtering failed'; END IF;
 result:=public.search_fleet(p_query=>'SearchFixture',p_page_size=>1,p_page=>2);
 IF (result->>'total')::int<>2 OR jsonb_array_length(result->'vehicles')<>1 OR result->'vehicles'->0->>'model'<>'Higher' THEN RAISE EXCEPTION 'Filter before pagination failed'; END IF;
 result:=public.search_fleet(p_query=>'SearchFixture',p_page=>99999);
 IF (result->>'total')::int<>2 OR jsonb_array_length(result->'vehicles')<>0 THEN RAISE EXCEPTION 'Empty page lost count'; END IF;
 BEGIN PERFORM public.search_fleet(p_starts_at=>now()+interval '1 day'); RAISE EXCEPTION 'Accepted unpaired dates'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.search_fleet(p_starts_at=>now()-interval '1 day',p_ends_at=>now()); RAISE EXCEPTION 'Accepted past dates'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.search_fleet(p_starts_at=>now()+interval '2 days',p_ends_at=>now()+interval '1 day'); RAISE EXCEPTION 'Accepted reversed dates'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.search_fleet(p_page_size=>100); RAISE EXCEPTION 'Accepted unbounded page'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','0ddceac2-685c-4174-ba1c-f321177c1fca',true);
DO $$BEGIN
 BEGIN PERFORM public.configure_pickup_location('Forged','Forged','Forged'); RAISE EXCEPTION 'Customer configured location'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.retire_vehicle_media(gen_random_uuid()); RAISE EXCEPTION 'Customer changed gallery'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.pickup_location SET address='Forged'; RAISE EXCEPTION 'Customer wrote location'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO quote_probe SELECT public.create_quote(cheap,starts_at,ends_at,gen_random_uuid()) FROM fleet_probe;
DO $$BEGIN
 IF (SELECT pickup_location_snapshot->>'address' FROM public.quotes WHERE id=(SELECT id FROM quote_probe))<>'Test address' THEN RAISE EXCEPTION 'Quote pickup snapshot missing'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','d87a4c9a-0ef7-4d3a-96f8-d7c4802e92d4',true);
SELECT public.configure_pickup_location('New pickup','New city','New address');
SELECT set_config('request.jwt.claim.sub','0ddceac2-685c-4174-ba1c-f321177c1fca',true);
DO $$BEGIN
 IF (SELECT pickup_location_snapshot->>'address' FROM public.quotes WHERE id=(SELECT id FROM quote_probe))<>'Test address' THEN RAISE EXCEPTION 'Location edit rewrote historical quote'; END IF;
END $$;
SELECT public.start_checkout(id) FROM quote_probe;
SET LOCAL ROLE anon;
DO $$DECLARE result jsonb; probe record; BEGIN
 SELECT * INTO probe FROM fleet_probe;
 result:=public.search_fleet(probe.starts_at,probe.ends_at,'SearchFixture');
 IF (result->>'total')::int<>1 OR result->'vehicles'->0->>'model'<>'Higher' THEN RAISE EXCEPTION 'Held vehicle remained available'; END IF;
 result:=public.search_fleet(probe.starts_at-interval '20 days',probe.ends_at-interval '20 days','SearchFixture');
 IF (result->>'total')::int<>2 THEN RAISE EXCEPTION 'Future hold blocked a separate interval'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
