-- Read facade over the existing reservation rule; no independent availability state.
CREATE FUNCTION public.search_fleet(
 p_starts_at timestamptz DEFAULT NULL, p_ends_at timestamptz DEFAULT NULL,
 p_query text DEFAULT '', p_type_id uuid DEFAULT NULL,
 p_max_rate_minor bigint DEFAULT NULL, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb; eligible_ids uuid[];
BEGIN
 IF (p_starts_at IS NULL) <> (p_ends_at IS NULL)
  OR p_query IS NULL OR length(p_query)>100 OR p_query ~ '[[:cntrl:]]'
  OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 99999
  OR p_page_size IS NULL OR p_page_size NOT BETWEEN 1 AND 24
  OR (p_max_rate_minor IS NOT NULL AND p_max_rate_minor NOT BETWEEN 0 AND 100000000)
 THEN RAISE EXCEPTION 'Invalid catalogue search' USING ERRCODE='22023'; END IF;
 -- Validate intervals even when another filter would produce zero rows.
 IF p_starts_at IS NOT NULL THEN
  IF NOT isfinite(p_starts_at) OR NOT isfinite(p_ends_at)
   OR p_starts_at<=clock_timestamp() OR p_ends_at<=p_starts_at
  THEN RAISE EXCEPTION 'Invalid future rental interval' USING ERRCODE='22023'; END IF;
  SELECT array_agg(a.vehicle_id) INTO eligible_ids FROM public.available_vehicles(p_starts_at,p_ends_at) a;
 END IF;
 WITH matched AS MATERIALIZED (
   SELECT v.id,v.manufacturer,v.model,v.vehicle_type_id,t.name AS type_name,
     v.daily_rate_minor,v.currency,v.operational_state
   FROM public.vehicles v JOIN public.vehicle_types t ON t.id=v.vehicle_type_id
   WHERE v.published AND v.operational_state<>'archived'
     AND (p_starts_at IS NULL OR v.id=ANY(coalesce(eligible_ids,'{}'::uuid[])))
     AND (p_type_id IS NULL OR v.vehicle_type_id=p_type_id)
     AND (p_max_rate_minor IS NULL OR v.daily_rate_minor<=p_max_rate_minor)
     AND strpos(lower(concat_ws(' ',v.manufacturer,v.model)),lower(btrim(p_query)))>0
 ), page_rows AS (
   SELECT * FROM matched ORDER BY daily_rate_minor,manufacturer,model,id
     LIMIT p_page_size OFFSET (p_page-1)*p_page_size
 ), cards AS (
   SELECT p.*,(SELECT m.object_path FROM public.vehicle_media m
     WHERE m.vehicle_id=p.id AND m.state='current' AND m.width IS NOT NULL AND m.height IS NOT NULL
     ORDER BY CASE m.category WHEN 'exterior' THEN 0 ELSE 1 END,m.category,m.position,m.id LIMIT 1) AS cover_path
   FROM page_rows p
 )
 SELECT jsonb_build_object('vehicles',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.daily_rate_minor,c.manufacturer,c.model,c.id) FROM cards c),'[]'::jsonb),
   'total',(SELECT count(*) FROM matched),'page',p_page,'page_size',p_page_size) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.search_fleet(timestamptz,timestamptz,text,uuid,bigint,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_fleet(timestamptz,timestamptz,text,uuid,bigint,integer,integer) TO anon,authenticated;

-- Removing a gallery image preserves the validated version for deliberate recovery.
CREATE FUNCTION public.retire_vehicle_media(p_media_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_vehicle uuid; status text;
BEGIN
 PERFORM private.require_admin();
 SELECT vehicle_id INTO target_vehicle FROM public.vehicle_media WHERE id=p_media_id;
 IF target_vehicle IS NULL THEN RAISE EXCEPTION 'Gallery image unavailable' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.vehicles WHERE id=target_vehicle FOR UPDATE;
 SELECT state INTO status FROM public.vehicle_media WHERE id=p_media_id FOR UPDATE;
 IF status='retired' THEN RETURN; END IF;
 IF status IS DISTINCT FROM 'current' THEN RAISE EXCEPTION 'Only a published gallery image can be removed' USING ERRCODE='55000'; END IF;
 UPDATE public.vehicle_media SET state='retired' WHERE id=p_media_id;
END $$;
REVOKE ALL ON FUNCTION public.retire_vehicle_media(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retire_vehicle_media(uuid) TO authenticated;

CREATE TABLE public.pickup_location (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
 city text NOT NULL CHECK(length(btrim(city)) BETWEEN 1 AND 120),
 address text NOT NULL CHECK(length(btrim(address)) BETWEEN 1 AND 500),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.pickup_location ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pickup_location FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pickup_location TO anon,authenticated;
CREATE POLICY pickup_location_read ON public.pickup_location FOR SELECT TO anon,authenticated USING(true);
CREATE FUNCTION public.configure_pickup_location(p_name text,p_city text,p_address text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.require_admin();
 IF p_name IS NULL OR p_city IS NULL OR p_address IS NULL
  OR p_name ~ '[[:cntrl:]]' OR p_city ~ '[[:cntrl:]]' OR p_address ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Invalid pickup location' USING ERRCODE='22023'; END IF;
 INSERT INTO public.pickup_location(singleton,name,city,address)
 VALUES(true,btrim(p_name),btrim(p_city),btrim(p_address))
 ON CONFLICT(singleton) DO UPDATE SET name=excluded.name,city=excluded.city,address=excluded.address,updated_at=clock_timestamp();
END $$;
REVOKE ALL ON FUNCTION public.configure_pickup_location(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.configure_pickup_location(text,text,text) TO authenticated;

-- Existing synthetic quotes retain their original absence of a pickup snapshot.
-- New quotes cannot be issued until the real operator location is configured.
ALTER TABLE public.quotes ADD COLUMN pickup_location_snapshot jsonb;
CREATE FUNCTION private.quote_pickup_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT jsonb_build_object('name',name,'city',city,'address',address)
  INTO NEW.pickup_location_snapshot FROM public.pickup_location WHERE singleton;
 IF NEW.pickup_location_snapshot IS NULL THEN
  RAISE EXCEPTION 'The operator must configure the pickup location before quoting' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_pickup_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER quote_pickup_snapshot BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION private.quote_pickup_snapshot();
