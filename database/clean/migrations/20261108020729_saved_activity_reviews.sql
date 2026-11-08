-- Extend canonical reads without changing booking or payment lifecycle commands.
CREATE INDEX wishlist_by_time ON public.wishlist(customer_id,created_at DESC,vehicle_id);
CREATE INDEX reviews_by_time ON public.reviews(created_at DESC,booking_id);

CREATE FUNCTION private.can_read_vehicle_reviews(p_vehicle_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM public.vehicles v WHERE v.id=p_vehicle_id AND (
  v.published OR private.is_admin() OR EXISTS(
   SELECT FROM public.bookings b WHERE b.vehicle_id=v.id AND b.customer_id=(SELECT auth.uid()) AND b.state='completed')))
$$;
REVOKE ALL ON FUNCTION private.can_read_vehicle_reviews(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.vehicle_review_summary(p_vehicle_id uuid)
RETURNS TABLE(review_count bigint,average_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(*),round(avg(r.rating),2) FROM public.reviews r JOIN public.bookings b ON b.id=r.booking_id
 WHERE b.vehicle_id=p_vehicle_id AND b.state='completed' AND private.can_read_vehicle_reviews(p_vehicle_id)
$$;
CREATE OR REPLACE FUNCTION public.vehicle_reviews(p_vehicle_id uuid,p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(rating smallint,comment text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.rating,r.comment,r.created_at FROM public.reviews r JOIN public.bookings b ON b.id=r.booking_id
 WHERE b.vehicle_id=p_vehicle_id AND b.state='completed' AND private.can_read_vehicle_reviews(p_vehicle_id)
 ORDER BY r.created_at DESC,r.booking_id LIMIT least(greatest(coalesce(p_limit,20),1),50) OFFSET greatest(coalesce(p_offset,0),0)
$$;

-- One SQL snapshot for the visible review list and its aggregate.
CREATE FUNCTION public.vehicle_review_overview(p_vehicle_id uuid,p_limit integer DEFAULT 10,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('review_count',s.review_count,'average_rating',s.average_rating,
  'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('rating',r.rating,'comment',r.comment,'created_at',r.created_at) ORDER BY r.ordinality)
   FROM public.vehicle_reviews(p_vehicle_id,p_limit,p_offset) WITH ORDINALITY r),'[]'::jsonb))
 FROM public.vehicle_review_summary(p_vehicle_id) s
$$;
CREATE FUNCTION public.vehicle_review_summaries(p_vehicle_ids uuid[])
RETURNS TABLE(vehicle_id uuid,review_count bigint,average_rating numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_vehicle_ids IS NULL OR cardinality(p_vehicle_ids)>24 OR array_position(p_vehicle_ids,NULL) IS NOT NULL THEN
  RAISE EXCEPTION 'Provide up to 24 vehicle references' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT ids.id,s.review_count,s.average_rating FROM (SELECT DISTINCT unnest(p_vehicle_ids) id) ids
 CROSS JOIN LATERAL public.vehicle_review_summary(ids.id) s;
END $$;

-- Retained associations authorize only this customer's minimal catalogue read.
-- Archived/draft vehicles stay out of discovery and expose no private media.
CREATE FUNCTION public.my_vehicle_activity(p_kind text,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); result jsonb;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN('saved','recent') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 THEN
  RAISE EXCEPTION 'Choose a valid activity view and page' USING ERRCODE='22023'; END IF;
 WITH activity AS (
  SELECT w.vehicle_id,w.created_at observed_at FROM public.wishlist w WHERE w.customer_id=u AND p_kind='saved'
  UNION ALL
  SELECT r.vehicle_id,r.viewed_at FROM public.recently_viewed r WHERE r.customer_id=u AND p_kind='recent'
 ), page_items AS (
  SELECT a.vehicle_id,a.observed_at,v.manufacturer,v.model,v.daily_rate_minor,v.currency,v.operational_state,
   coalesce(v.published,false) published,t.name type_name,
   coalesce(v.published AND v.operational_state<>'archived',false) catalogue_visible,
   CASE WHEN v.published THEN (SELECT m.object_path FROM public.vehicle_media m WHERE m.vehicle_id=v.id
    AND m.state='current' AND m.validated_at IS NOT NULL ORDER BY (m.category='exterior') DESC,m.position,m.id LIMIT 1) END cover_path
  FROM activity a LEFT JOIN public.vehicles v ON v.id=a.vehicle_id LEFT JOIN public.vehicle_types t ON t.id=v.vehicle_type_id
  ORDER BY a.observed_at DESC,a.vehicle_id LIMIT 12 OFFSET (p_page-1)*12
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM activity),'items',
  coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.observed_at DESC,p.vehicle_id) FROM page_items p),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.my_activity_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer();
BEGIN
 RETURN jsonb_build_object('saved_count',(SELECT count(*) FROM public.wishlist WHERE customer_id=u),
  'recent_count',(SELECT count(*) FROM public.recently_viewed WHERE customer_id=u),
  'review_count',(SELECT count(*) FROM public.reviews r JOIN public.bookings b ON b.id=r.booking_id WHERE b.customer_id=u AND b.state='completed'));
END $$;
REVOKE ALL ON FUNCTION public.vehicle_review_overview(uuid,integer,integer),public.vehicle_review_summaries(uuid[]),
 public.my_vehicle_activity(text,integer),public.my_activity_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vehicle_review_overview(uuid,integer,integer),public.vehicle_review_summaries(uuid[]) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_vehicle_activity(text,integer),public.my_activity_summary() TO authenticated;
