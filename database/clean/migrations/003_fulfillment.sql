-- Staff-only inspection details. The customer timeline contains safe event descriptions.
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK(kind IN ('pickup','return')),
  condition text NOT NULL CHECK(length(trim(condition)) BETWEEN 1 AND 500),
  fuel_percent smallint NOT NULL CHECK(fuel_percent BETWEEN 0 AND 100),
  odometer_km integer NOT NULL CHECK(odometer_km>=0),
  damage text NOT NULL CHECK(length(damage)<=2000),
  staff_notes text NOT NULL CHECK(length(staff_notes)<=2000),
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL,
  UNIQUE(booking_id,kind)
);
CREATE TABLE public.inspection_outcomes (
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE RESTRICT,
  passed boolean NOT NULL,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
  inspected_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  inspected_at timestamptz NOT NULL,
  PRIMARY KEY(inspection_id,passed)
);
CREATE TABLE public.inspection_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE RESTRICT,
  object_path text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
  byte_length integer NOT NULL CHECK(byte_length BETWEEN 1 AND 8388608),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','attached','discarded')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL
);
CREATE INDEX inspection_media_parent ON public.inspection_media(inspection_id);
CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
  requested_at timestamptz NOT NULL,
  decision text CHECK(decision IN ('accepted','rejected')),
  decision_reason text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  CHECK ((decision IS NULL AND decision_reason IS NULL AND decided_by IS NULL AND decided_at IS NULL)
     OR (decision IS NOT NULL AND decision_reason IS NOT NULL AND length(trim(decision_reason)) BETWEEN 1 AND 500
          AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE UNIQUE INDEX cancellation_open_request ON public.cancellation_requests(booking_id) WHERE decision IS NULL;
CREATE INDEX cancellation_history ON public.cancellation_requests(booking_id,requested_at DESC);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY inspection_read ON public.inspections FOR SELECT TO authenticated USING((SELECT private.is_admin()));
CREATE POLICY inspection_outcome_read ON public.inspection_outcomes FOR SELECT TO authenticated USING((SELECT private.is_admin()));
CREATE POLICY inspection_media_read ON public.inspection_media FOR SELECT TO authenticated USING((SELECT private.is_admin()));
CREATE POLICY cancellation_history_read ON public.cancellation_requests FOR SELECT TO authenticated USING(requested_by=(SELECT auth.uid()) OR (SELECT private.is_admin()));
REVOKE ALL ON TABLE public.inspections,public.inspection_outcomes,public.inspection_media,public.cancellation_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.inspections,public.inspection_outcomes,public.inspection_media,public.cancellation_requests TO authenticated;

-- Extend eligibility to enforce the turnaround after an actual late return too.
ALTER FUNCTION private.interval_open(uuid,timestamptz,timestamptz,timestamptz) RENAME TO calendar_interval_open;
CREATE FUNCTION private.interval_open(p_vehicle uuid,p_start timestamptz,p_end_with_buffer timestamptz,p_now timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT private.calendar_interval_open(p_vehicle,p_start,p_end_with_buffer,p_now)
    AND NOT EXISTS(SELECT FROM public.bookings b JOIN public.quotes q ON q.id=b.quote_id
      JOIN public.inspections i ON i.booking_id=b.id AND i.kind='return' WHERE b.vehicle_id=p_vehicle
      AND i.recorded_at < p_end_with_buffer AND i.recorded_at+q.turnaround>p_start)
$$;
REVOKE ALL ON FUNCTION private.interval_open(uuid,timestamptz,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.block_vehicle(p_vehicle_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.vehicle_allocations; t timestamptz;
BEGIN
  PERFORM private.require_admin();
  PERFORM 1 FROM public.vehicles WHERE id=p_vehicle_id AND operational_state<>'archived' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle unavailable'; END IF;
  IF p_request_id IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR NOT isfinite(p_starts_at)
    OR NOT isfinite(p_ends_at) OR p_ends_at<=p_starts_at OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Invalid maintenance interval or reason' USING ERRCODE='22023'; END IF;
  SELECT * INTO a FROM public.vehicle_allocations WHERE request_id=p_request_id;
  IF FOUND THEN
    IF (a.vehicle_id,a.occupied,a.maintenance_reason) IS DISTINCT FROM (p_vehicle_id,tstzrange(p_starts_at,p_ends_at,'[)'),trim(p_reason)) THEN
      RAISE EXCEPTION 'Maintenance request ID reused' USING ERRCODE='22023'; END IF;
    RETURN a.id;
  END IF;
  t:=private.rental_now();
  IF p_ends_at<=t THEN RAISE EXCEPTION 'Maintenance block has already ended' USING ERRCODE='22023'; END IF;
  PERFORM private.expire_vehicle_holds(p_vehicle_id);
  INSERT INTO public.vehicle_allocations(vehicle_id,occupied,maintenance_reason,request_id,created_by,created_at)
    VALUES(p_vehicle_id,tstzrange(p_starts_at,p_ends_at,'[)'),trim(p_reason),p_request_id,auth.uid(),t) RETURNING id INTO a.id;
  RETURN a.id;
END $$;
CREATE FUNCTION public.release_maintenance_block(p_allocation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v uuid;
BEGIN
  PERFORM private.require_admin();
  SELECT vehicle_id INTO STRICT v FROM public.vehicle_allocations WHERE id=p_allocation_id AND booking_id IS NULL;
  PERFORM 1 FROM public.vehicles WHERE id=v FOR UPDATE;
  UPDATE public.vehicle_allocations SET released_at=coalesce(released_at,private.rental_now()) WHERE id=p_allocation_id;
END $$;

CREATE FUNCTION public.request_cancellation(p_booking_id uuid,p_reason text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); b public.bookings; r public.cancellation_requests;
BEGIN
  b:=private.lock_booking(p_booking_id);
  IF b.customer_id<>u THEN RAISE EXCEPTION 'Booking inaccessible' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Cancellation reason and request ID required' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM public.cancellation_requests WHERE id=p_request_id;
  IF FOUND THEN
    IF (r.requested_by,r.booking_id,r.reason) IS DISTINCT FROM (u,b.id,trim(p_reason)) THEN RAISE EXCEPTION 'Request ID unavailable' USING ERRCODE='22023'; END IF;
    RETURN r.id;
  END IF;
  IF b.state NOT IN ('confirmed','ready') THEN RAISE EXCEPTION 'Cancellation is only available before pickup' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT FROM public.cancellation_requests WHERE booking_id=b.id AND decision IS NULL) THEN RAISE EXCEPTION 'Cancellation already requested' USING ERRCODE='55000'; END IF;
  INSERT INTO public.cancellation_requests(id,booking_id,requested_by,reason,requested_at) VALUES(p_request_id,b.id,u,trim(p_reason),private.rental_now());
  PERFORM private.emit_booking_event(b.id,'cancel_requested','Customer requested cancellation');
  RETURN p_request_id;
END $$;
CREATE FUNCTION public.decide_cancellation(p_request_id uuid,p_accept boolean,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; r public.cancellation_requests; decision_name text; t timestamptz;
BEGIN
  PERFORM private.require_admin();
  SELECT booking_id INTO STRICT r.booking_id FROM public.cancellation_requests WHERE id=p_request_id;
  b:=private.lock_booking(r.booking_id,true);
  SELECT * INTO STRICT r FROM public.cancellation_requests WHERE id=p_request_id FOR UPDATE;
  IF p_accept IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Cancellation decision and reason required' USING ERRCODE='22023'; END IF;
  decision_name:=CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;
  IF r.decision IS NOT NULL THEN
    IF (r.decision,r.decision_reason) IS DISTINCT FROM (decision_name,trim(p_reason)) THEN RAISE EXCEPTION 'Request already decided' USING ERRCODE='55000'; END IF;
    RETURN r.decision;
  END IF;
  IF b.state NOT IN ('confirmed','ready') THEN RAISE EXCEPTION 'Rental has already begun' USING ERRCODE='55000'; END IF;
  t:=private.rental_now();
  UPDATE public.cancellation_requests SET decision=decision_name,decision_reason=trim(p_reason),decided_by=auth.uid(),decided_at=t WHERE id=r.id;
  IF p_accept THEN
    UPDATE public.bookings SET state='cancelled',updated_at=t WHERE id=b.id;
    UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id;
    PERFORM private.emit_booking_event(b.id,'cancelled','Staff accepted the cancellation request');
  ELSE PERFORM private.emit_booking_event(b.id,'cancel_rejected','Staff declined the cancellation request'); END IF;
  RETURN decision_name;
END $$;

CREATE FUNCTION public.mark_ready(p_booking_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
  b:=private.lock_booking(p_booking_id,true);
  IF EXISTS(SELECT FROM public.booking_events WHERE booking_id=b.id AND event_type='ready') THEN RETURN; END IF;
  IF b.state<>'confirmed' OR NOT EXISTS(SELECT FROM public.vehicles WHERE id=b.vehicle_id AND operational_state='available') THEN
    RAISE EXCEPTION 'Booking or vehicle cannot be marked ready' USING ERRCODE='55000'; END IF;
  UPDATE public.bookings SET state='ready',updated_at=private.rental_now() WHERE id=b.id;
  PERFORM private.emit_booking_event(b.id,'ready','Vehicle marked ready for pickup');
END $$;

CREATE FUNCTION private.record_handover(p_booking uuid,p_kind text,p_condition text,p_fuel integer,p_odometer integer,p_damage text,p_notes text)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE b public.bookings; q public.quotes; i public.inspections; t timestamptz; op text;
BEGIN
  b:=private.lock_booking(p_booking,true);
  SELECT * INTO i FROM public.inspections WHERE booking_id=b.id AND kind=p_kind;
  IF FOUND THEN
    IF (i.condition,i.fuel_percent,i.odometer_km,i.damage,i.staff_notes) IS DISTINCT FROM
       (trim(p_condition),p_fuel,p_odometer,trim(p_damage),trim(p_notes)) THEN
      RAISE EXCEPTION 'Inspection already recorded with different details' USING ERRCODE='22023'; END IF;
    RETURN i.id;
  END IF;
  IF p_condition IS NULL OR length(trim(p_condition)) NOT BETWEEN 1 AND 500 OR p_fuel IS NULL OR p_fuel NOT BETWEEN 0 AND 100
     OR p_odometer IS NULL OR p_odometer<0 OR p_damage IS NULL OR length(trim(p_damage))>2000
     OR p_notes IS NULL OR length(trim(p_notes))>2000 THEN RAISE EXCEPTION 'Invalid inspection details' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT q FROM public.quotes WHERE id=b.quote_id;
  SELECT operational_state INTO STRICT op FROM public.vehicles WHERE id=b.vehicle_id;
  t:=private.rental_now();
  IF p_kind='pickup' THEN
    IF b.state<>'ready' OR op<>'available' OR t<q.starts_at OR t>=q.ends_at OR EXISTS(
      SELECT FROM public.cancellation_requests WHERE booking_id=b.id AND decision IS NULL)
      OR EXISTS(SELECT FROM public.bookings WHERE vehicle_id=b.vehicle_id AND id<>b.id AND state IN ('active','returned','inspection'))
      OR EXISTS(SELECT FROM public.inspections last_return JOIN public.bookings prev ON prev.id=last_return.booking_id
          JOIN public.quotes prev_q ON prev_q.id=prev.quote_id WHERE prev.vehicle_id=b.vehicle_id AND last_return.kind='return'
          AND last_return.recorded_at+prev_q.turnaround>t) THEN
      RAISE EXCEPTION 'Pickup unavailable for this booking or vehicle' USING ERRCODE='55000'; END IF;
  ELSIF p_kind='return' THEN
    IF b.state<>'active' THEN RAISE EXCEPTION 'Only an active rental can be returned' USING ERRCODE='55000'; END IF;
    IF p_odometer < (SELECT odometer_km FROM public.inspections WHERE booking_id=b.id AND kind='pickup') THEN
      RAISE EXCEPTION 'Return mileage is below pickup mileage' USING ERRCODE='22023'; END IF;
  ELSE RAISE EXCEPTION 'Invalid handover type' USING ERRCODE='22023'; END IF;
  INSERT INTO public.inspections(booking_id,kind,condition,fuel_percent,odometer_km,damage,staff_notes,recorded_by,recorded_at)
    VALUES(b.id,p_kind,trim(p_condition),p_fuel,p_odometer,trim(p_damage),trim(p_notes),auth.uid(),t) RETURNING id INTO i.id;
  IF p_kind='pickup' THEN
    UPDATE public.bookings SET state='active',updated_at=t WHERE id=b.id;
    PERFORM private.emit_booking_event(b.id,'picked_up','Pickup inspection recorded and vehicle handed over');
    PERFORM private.emit_booking_event(b.id,'active','Rental started');
  ELSE
    UPDATE public.bookings SET state='returned',updated_at=t WHERE id=b.id;
    UPDATE public.vehicles SET operational_state='inspection' WHERE id=b.vehicle_id;
    PERFORM private.emit_booking_event(b.id,'returned','Vehicle returned and awaiting inspection');
  END IF;
  RETURN i.id;
END $$;
CREATE FUNCTION public.pick_up(p_booking_id uuid,p_condition text,p_fuel_percent integer,p_odometer_km integer,p_damage text DEFAULT '',p_staff_notes text DEFAULT '')
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.record_handover(p_booking_id,'pickup',p_condition,p_fuel_percent,p_odometer_km,p_damage,p_staff_notes)
$$;
CREATE FUNCTION public.return_vehicle(p_booking_id uuid,p_condition text,p_fuel_percent integer,p_odometer_km integer,p_damage text DEFAULT '',p_staff_notes text DEFAULT '')
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.record_handover(p_booking_id,'return',p_condition,p_fuel_percent,p_odometer_km,p_damage,p_staff_notes)
$$;
CREATE FUNCTION public.start_inspection(p_booking_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
  b:=private.lock_booking(p_booking_id,true);
  IF EXISTS(SELECT FROM public.booking_events WHERE booking_id=b.id AND event_type='inspection_started') THEN RETURN; END IF;
  IF b.state<>'returned' THEN RAISE EXCEPTION 'Return is required before inspection' USING ERRCODE='55000'; END IF;
  UPDATE public.bookings SET state='inspection',updated_at=private.rental_now() WHERE id=b.id;
  PERFORM private.emit_booking_event(b.id,'inspection_started','Return inspection started');
END $$;
-- A failed inspection leaves the booking in inspection and the vehicle in maintenance.
-- Only a subsequent recorded pass can complete it and restore vehicle eligibility.
ALTER TABLE public.booking_events DROP CONSTRAINT booking_events_event_type_check;
ALTER TABLE public.booking_events ADD CHECK (event_type IN ('hold_created','payment_pending','payment_succeeded','payment_failed','payment_expired',
 'payment_cancelled','hold_expired','confirmed','ready','picked_up','active','returned','inspection_started','inspection_failed','inspection_completed',
 'completed','cancel_requested','cancel_rejected','cancelled'));
CREATE FUNCTION public.finish_inspection(p_booking_id uuid,p_passed boolean,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; i uuid; previous_reason text; t timestamptz;
BEGIN
  b:=private.lock_booking(p_booking_id,true);
  IF p_passed IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Inspection result and reason required' USING ERRCODE='22023'; END IF;
  SELECT id INTO i FROM public.inspections WHERE booking_id=b.id AND kind='return';
  SELECT reason INTO previous_reason FROM public.inspection_outcomes WHERE inspection_id=i AND passed=p_passed;
  IF FOUND THEN
    IF previous_reason<>trim(p_reason) THEN RAISE EXCEPTION 'Inspection result already recorded' USING ERRCODE='22023'; END IF;
    RETURN b.state;
  END IF;
  IF b.state<>'inspection' OR i IS NULL THEN RAISE EXCEPTION 'Inspection has not started' USING ERRCODE='55000'; END IF;
  t:=private.rental_now();
  INSERT INTO public.inspection_outcomes(inspection_id,passed,reason,inspected_by,inspected_at) VALUES(i,p_passed,trim(p_reason),auth.uid(),t);
  IF NOT p_passed THEN
    UPDATE public.vehicles SET operational_state='maintenance' WHERE id=b.vehicle_id;
    PERFORM private.emit_booking_event(b.id,'inspection_failed','Further inspection required before vehicle release');
    RETURN 'inspection';
  END IF;
  UPDATE public.vehicles SET operational_state='available' WHERE id=b.vehicle_id;
  UPDATE public.bookings SET state='completed',updated_at=t WHERE id=b.id;
  -- Retain the booked allocation through its scheduled turnaround; range bounds
  -- naturally release it. Late actual returns have a separate turnaround check.
  PERFORM private.emit_booking_event(b.id,'inspection_completed','Return inspection passed');
  PERFORM private.emit_booking_event(b.id,'completed','Rental completed');
  RETURN 'completed';
END $$;

CREATE FUNCTION public.prepare_inspection_media(p_inspection_id uuid,p_content_type text,p_byte_length integer) RETURNS public.inspection_media
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.inspection_media; b uuid; media_id uuid:=gen_random_uuid(); ext text;
BEGIN
  PERFORM private.require_admin();
  SELECT booking_id INTO STRICT b FROM public.inspections WHERE id=p_inspection_id;
  ext:=CASE p_content_type WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' END;
  IF ext IS NULL OR p_byte_length IS NULL OR p_byte_length NOT BETWEEN 1 AND 8388608 THEN RAISE EXCEPTION 'Invalid image metadata' USING ERRCODE='22023'; END IF;
  INSERT INTO public.inspection_media(id,inspection_id,object_path,content_type,byte_length,created_by,created_at)
  VALUES(media_id,p_inspection_id,b::text||'/'||p_inspection_id::text||'/'||media_id::text||'.'||ext,p_content_type,p_byte_length,auth.uid(),private.rental_now()) RETURNING * INTO m;
  RETURN m;
END $$;
CREATE FUNCTION public.attach_inspection_media(p_media_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.inspection_media;
BEGIN
  PERFORM private.require_admin();
  SELECT * INTO STRICT m FROM public.inspection_media WHERE id=p_media_id FOR UPDATE;
  IF m.state='attached' THEN RETURN; END IF;
  IF m.state<>'pending' OR NOT EXISTS(SELECT FROM storage.objects o WHERE o.bucket_id='rental-inspections' AND o.name=m.object_path
    AND (o.metadata->>'size')::bigint=m.byte_length AND o.metadata->>'mimetype'=m.content_type) THEN RAISE EXCEPTION 'Inspection upload incomplete or invalid'; END IF;
  UPDATE public.inspection_media SET state='attached' WHERE id=m.id;
END $$;
CREATE FUNCTION public.discard_inspection_upload(p_media_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.inspection_media SET state='discarded' WHERE id=p_media_id AND state IN('pending','discarded');
  IF NOT FOUND THEN RAISE EXCEPTION 'Only unfinished inspection uploads may be discarded'; END IF;
END $$;
CREATE POLICY inspection_object_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='rental-inspections' AND (SELECT private.is_admin()));
CREATE POLICY inspection_object_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='rental-inspections' AND (SELECT private.is_admin())
  AND EXISTS(SELECT FROM public.inspection_media m WHERE m.state='pending' AND m.object_path=storage.objects.name));
CREATE POLICY inspection_object_discard ON storage.objects FOR DELETE TO authenticated USING(bucket_id='rental-inspections' AND (SELECT private.is_admin())
  AND EXISTS(SELECT FROM public.inspection_media m WHERE m.state='discarded' AND m.object_path=storage.objects.name));

REVOKE ALL ON FUNCTION private.record_handover(uuid,text,text,integer,integer,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.block_vehicle(uuid,timestamptz,timestamptz,text,uuid),public.release_maintenance_block(uuid),
  public.request_cancellation(uuid,text,uuid),public.decide_cancellation(uuid,boolean,text),public.mark_ready(uuid),
  public.pick_up(uuid,text,integer,integer,text,text),public.return_vehicle(uuid,text,integer,integer,text,text),public.start_inspection(uuid),
  public.finish_inspection(uuid,boolean,text),public.prepare_inspection_media(uuid,text,integer),public.attach_inspection_media(uuid),
  public.discard_inspection_upload(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.block_vehicle(uuid,timestamptz,timestamptz,text,uuid),public.release_maintenance_block(uuid),
  public.request_cancellation(uuid,text,uuid),public.decide_cancellation(uuid,boolean,text),public.mark_ready(uuid),
  public.pick_up(uuid,text,integer,integer,text,text),public.return_vehicle(uuid,text,integer,integer,text,text),public.start_inspection(uuid),
  public.finish_inspection(uuid,boolean,text),public.prepare_inspection_media(uuid,text,integer),public.attach_inspection_media(uuid),
  public.discard_inspection_upload(uuid) TO authenticated;

