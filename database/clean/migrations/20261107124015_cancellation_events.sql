-- Add transition evidence without inventing snapshots for historical events.
ALTER TABLE public.booking_events ADD COLUMN previous_state text,
 ADD COLUMN new_state text, ADD COLUMN booking_reference text;
ALTER TABLE public.booking_events DROP CONSTRAINT booking_events_event_type_check;
ALTER TABLE public.booking_events ADD CONSTRAINT booking_events_event_type_check CHECK(event_type IN
 ('hold_created','payment_pending','payment_succeeded','payment_failed','payment_expired','payment_cancelled','hold_expired',
 'confirmed','ready','picked_up','active','returned','inspection_started','inspection_failed','inspection_completed',
 'completed','cancel_requested','cancel_rejected','cancellation_accepted','cancellation_rejected','cancelled'));

CREATE FUNCTION private.snapshot_booking_event() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
 SELECT * INTO STRICT b FROM public.bookings WHERE id=NEW.booking_id FOR UPDATE;
 NEW.booking_reference:=b.reference;
 NEW.new_state:=b.state;
 IF NEW.previous_state IS NULL AND NEW.event_type<>'hold_created' THEN
  NEW.previous_state:=CASE NEW.event_type
   WHEN 'payment_pending' THEN 'held' WHEN 'payment_succeeded' THEN 'held'
   WHEN 'payment_failed' THEN 'held' WHEN 'payment_expired' THEN 'held'
   WHEN 'payment_cancelled' THEN 'held' WHEN 'hold_expired' THEN 'expired'
   WHEN 'confirmed' THEN 'awaiting_confirmation' WHEN 'ready' THEN 'confirmed'
   WHEN 'picked_up' THEN 'ready' WHEN 'active' THEN 'active' WHEN 'returned' THEN 'active'
   WHEN 'inspection_started' THEN 'returned' WHEN 'completed' THEN 'inspection'
   ELSE b.state END;
 END IF;
 -- Also version events that leave state unchanged, for consistent read/retry checks.
 UPDATE public.bookings SET updated_at=private.rental_now() WHERE id=b.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.snapshot_booking_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER booking_event_snapshot BEFORE INSERT ON public.booking_events
 FOR EACH ROW EXECUTE FUNCTION private.snapshot_booking_event();

CREATE OR REPLACE FUNCTION public.request_cancellation(p_booking_id uuid,p_reason text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); b public.bookings; r public.cancellation_requests;
BEGIN
 b:=private.lock_booking(p_booking_id);
 IF b.customer_id<>u THEN RAISE EXCEPTION 'Booking inaccessible' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Cancellation reason and request ID required' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.cancellation_requests WHERE id=p_request_id;
 IF FOUND THEN
  IF (r.requested_by,r.booking_id,r.reason) IS DISTINCT FROM (u,b.id,trim(p_reason)) THEN
   RAISE EXCEPTION 'Request ID unavailable' USING ERRCODE='22023'; END IF;
  RETURN r.id;
 END IF;
 IF b.state NOT IN ('confirmed','ready') THEN
  RAISE EXCEPTION 'Cancellation is only available before pickup' USING ERRCODE='55000'; END IF;
 SELECT * INTO r FROM public.cancellation_requests WHERE booking_id=b.id AND decision IS NULL;
 IF FOUND THEN
  IF r.reason=trim(p_reason) THEN RETURN r.id; END IF;
  RAISE EXCEPTION 'A cancellation request is already pending' USING ERRCODE='55000';
 END IF;
 INSERT INTO public.cancellation_requests(id,booking_id,requested_by,reason,requested_at)
 VALUES(p_request_id,b.id,u,trim(p_reason),private.rental_now());
 PERFORM private.emit_booking_event(b.id,'cancel_requested','Customer requested cancellation');
 RETURN p_request_id;
END $$;

CREATE OR REPLACE FUNCTION public.decide_cancellation(p_request_id uuid,p_accept boolean,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; r public.cancellation_requests; outcome text; t timestamptz; actor uuid;
BEGIN
 PERFORM private.require_admin(); actor:=auth.uid();
 SELECT booking_id INTO STRICT r.booking_id FROM public.cancellation_requests WHERE id=p_request_id;
 b:=private.lock_booking(r.booking_id,true);
 SELECT * INTO STRICT r FROM public.cancellation_requests WHERE id=p_request_id FOR UPDATE;
 IF p_accept IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Decision and customer-visible reason required' USING ERRCODE='22023'; END IF;
 outcome:=CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;
 IF r.decision IS NOT NULL THEN
  IF (r.decision,r.decision_reason) IS DISTINCT FROM (outcome,trim(p_reason)) THEN
   RAISE EXCEPTION 'Request already decided differently' USING ERRCODE='55000'; END IF;
  RETURN r.decision;
 END IF;
 IF b.state NOT IN ('confirmed','ready') THEN RAISE EXCEPTION 'Rental has already begun' USING ERRCODE='55000'; END IF;
 t:=private.rental_now();
 UPDATE public.cancellation_requests SET decision=outcome,decision_reason=trim(p_reason),decided_by=actor,decided_at=t WHERE id=r.id;
 IF p_accept THEN
  UPDATE public.bookings SET state='cancelled',updated_at=t WHERE id=b.id;
  UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id AND released_at IS NULL;
 END IF;
 INSERT INTO public.booking_events(booking_id,event_type,actor_kind,actor_id,reason,occurred_at,previous_state)
 VALUES(b.id,CASE WHEN p_accept THEN 'cancellation_accepted' ELSE 'cancellation_rejected' END,'admin',actor,trim(p_reason),t,b.state);
 RETURN outcome;
END $$;

CREATE OR REPLACE FUNCTION private.notify_booking_event() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.event_type IN ('hold_expired','payment_succeeded','payment_failed','payment_expired','confirmed','ready','active',
  'returned','inspection_started','inspection_completed','completed','cancel_rejected','cancellation_rejected','cancellation_accepted','cancelled') THEN
  INSERT INTO public.notifications(event_id,customer_id,created_at)
  SELECT NEW.id,b.customer_id,NEW.occurred_at FROM public.bookings b WHERE b.id=NEW.booking_id;
 END IF;
 RETURN NEW;
END $$;
