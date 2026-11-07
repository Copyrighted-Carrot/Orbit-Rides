-- Forward-only checkout integrity. Historical snapshots remain unchanged.
ALTER TABLE public.quotes ADD COLUMN hold_seconds integer CHECK(hold_seconds>0);
CREATE OR REPLACE FUNCTION private.quote_pickup_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT jsonb_build_object('name',name,'city',city,'address',address)
 INTO NEW.pickup_location_snapshot FROM public.pickup_location WHERE singleton;
 IF NEW.pickup_location_snapshot IS NULL THEN
  RAISE EXCEPTION 'Configure the demo pickup location before quoting' USING ERRCODE='55000';
 END IF;
 SELECT ceil(extract(epoch FROM hold_lifetime))::integer INTO STRICT NEW.hold_seconds FROM private.rental_settings;
 RETURN NEW;
END $$;
CREATE FUNCTION private.reject_quote_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Quote snapshots are immutable' USING ERRCODE='55000'; END $$;
REVOKE ALL ON FUNCTION private.reject_quote_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER quote_immutable BEFORE UPDATE OR DELETE ON public.quotes FOR EACH ROW EXECUTE FUNCTION private.reject_quote_change();

CREATE FUNCTION private.assert_checkout_binding(b public.bookings,s public.payment_sessions,q public.quotes)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF b.id IS NULL OR s.id IS NULL OR q.id IS NULL
  OR (b.quote_id,b.vehicle_id,b.customer_id) IS DISTINCT FROM (q.id,q.vehicle_id,q.customer_id)
  OR s.booking_id IS DISTINCT FROM b.id OR s.amount_minor IS DISTINCT FROM q.total_minor OR s.currency IS DISTINCT FROM q.currency
  OR b.created_at<q.created_at OR b.created_at>=q.expires_at OR s.created_at IS DISTINCT FROM b.created_at OR b.hold_expires_at<=b.created_at
  OR (q.hold_seconds IS NOT NULL AND b.hold_expires_at IS DISTINCT FROM least(b.created_at+make_interval(secs=>q.hold_seconds),q.starts_at))
  OR NOT EXISTS(SELECT FROM private.payment_providers WHERE name=s.provider)
 THEN RAISE EXCEPTION 'Checkout binding is inconsistent' USING ERRCODE='55000'; END IF;
END $$;
CREATE FUNCTION private.assert_checkout_allocation(b public.bookings,q public.quotes)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT FROM public.vehicle_allocations a WHERE a.booking_id=b.id AND a.vehicle_id=q.vehicle_id
  AND a.created_by=b.customer_id AND a.released_at IS NULL AND a.occupied=tstzrange(q.starts_at,q.ends_at+q.turnaround,'[)'))
  OR NOT EXISTS(SELECT FROM public.vehicles WHERE id=b.vehicle_id AND operational_state='available')
 THEN RAISE EXCEPTION 'Reservation allocation is unavailable' USING ERRCODE='55000'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.assert_checkout_binding(public.bookings,public.payment_sessions,public.quotes),
 private.assert_checkout_allocation(public.bookings,public.quotes) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.start_checkout(p_quote_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); q public.quotes; b uuid; s uuid; t timestamptz; deadline timestamptz; provider_name text;
BEGIN
 SELECT * INTO q FROM public.quotes WHERE id=p_quote_id AND customer_id=u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quote inaccessible' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.vehicles WHERE id=q.vehicle_id FOR UPDATE;
 PERFORM private.expire_vehicle_holds(q.vehicle_id);
 SELECT id INTO b FROM public.bookings WHERE quote_id=q.id;
 IF FOUND THEN RETURN b; END IF;
 t:=private.rental_now();
 IF q.expires_at<=t OR q.starts_at<=t OR q.hold_seconds IS NULL THEN RAISE EXCEPTION 'Request a current quote' USING ERRCODE='22023'; END IF;
 IF NOT private.interval_open(q.vehicle_id,q.starts_at,q.ends_at+q.turnaround,t) THEN RAISE EXCEPTION 'Vehicle unavailable' USING ERRCODE='23P01'; END IF;
 deadline:=least(t+make_interval(secs=>q.hold_seconds),q.starts_at);
 SELECT checkout_provider INTO STRICT provider_name FROM private.rental_settings;
 INSERT INTO public.bookings(quote_id,vehicle_id,customer_id,state,hold_expires_at,created_at,updated_at)
 VALUES(q.id,q.vehicle_id,u,'held',deadline,t,t) RETURNING id INTO b;
 INSERT INTO public.vehicle_allocations(vehicle_id,booking_id,occupied,created_by,created_at)
 VALUES(q.vehicle_id,b,tstzrange(q.starts_at,q.ends_at+q.turnaround,'[)'),u,t);
 INSERT INTO public.payment_sessions(booking_id,provider,state,amount_minor,currency,created_at,updated_at)
 VALUES(b,provider_name,'pending',q.total_minor,q.currency,t,t) RETURNING id INTO s;
 INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,actor_id,reason,occurred_at)
 VALUES(s,'pending',provider_name,q.total_minor,q.currency,u,'Payment session opened',t);
 PERFORM private.emit_booking_event(b,'hold_created','Vehicle held for checkout');
 PERFORM private.emit_booking_event(b,'payment_pending','Awaiting explicit demo payment approval');
 RETURN b;
END $$;

CREATE OR REPLACE FUNCTION private.demo_result(p_session uuid,p_result text) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); s public.payment_sessions; b public.bookings; q public.quotes; t timestamptz;
BEGIN
 SELECT * INTO s FROM public.payment_sessions WHERE id=p_session;
 b:=private.lock_booking(s.booking_id);
 IF b.customer_id<>u THEN RAISE EXCEPTION 'Session inaccessible' USING ERRCODE='42501'; END IF;
 PERFORM private.expire_vehicle_holds(b.vehicle_id);
 SELECT * INTO STRICT b FROM public.bookings WHERE id=b.id;
 SELECT * INTO STRICT s FROM public.payment_sessions WHERE id=p_session FOR UPDATE;
 SELECT * INTO STRICT q FROM public.quotes WHERE id=b.quote_id;
 PERFORM private.assert_checkout_binding(b,s,q);
 IF s.provider<>'demo' THEN RAISE EXCEPTION 'Demo provider required' USING ERRCODE='55000'; END IF;
 IF s.state<>'pending' THEN RETURN s.state; END IF;
 IF p_result IS NULL OR p_result NOT IN ('succeeded','failed','cancelled') THEN RAISE EXCEPTION 'Invalid demo action' USING ERRCODE='22023'; END IF;
 IF b.state<>'held' THEN RAISE EXCEPTION 'Invalid checkout state' USING ERRCODE='55000'; END IF;
 t:=private.rental_now();
 IF b.hold_expires_at<=t THEN PERFORM private.expire_vehicle_holds(b.vehicle_id); RETURN 'expired'; END IF;
 IF p_result='succeeded' THEN PERFORM private.assert_checkout_allocation(b,q); END IF;
 UPDATE public.payment_sessions SET state=p_result,updated_at=t WHERE id=s.id;
 INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,actor_id,reason,occurred_at)
 VALUES(s.id,p_result,'demo',q.total_minor,q.currency,u,CASE p_result WHEN 'succeeded' THEN 'Customer explicitly approved simulation; no money transferred'
 WHEN 'failed' THEN 'Customer declined demo payment' ELSE 'Customer abandoned checkout' END,t);
 UPDATE public.bookings SET state=CASE p_result WHEN 'succeeded' THEN 'awaiting_confirmation' ELSE p_result END,updated_at=t WHERE id=b.id;
 PERFORM private.emit_booking_event(b.id,'payment_'||p_result,CASE p_result WHEN 'succeeded' THEN 'Demo payment approved; no money transferred'
 WHEN 'failed' THEN 'Demo payment declined' ELSE 'Demo checkout abandoned' END);
 IF p_result<>'succeeded' THEN UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id; END IF;
 IF p_result='cancelled' THEN PERFORM private.emit_booking_event(b.id,'cancelled','Checkout cancelled before confirmation'); END IF;
 RETURN p_result;
END $$;

CREATE OR REPLACE FUNCTION public.finalize_booking(p_session_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); b public.bookings; s public.payment_sessions; q public.quotes;
BEGIN
 b:=private.lock_booking((SELECT booking_id FROM public.payment_sessions WHERE id=p_session_id));
 IF b.customer_id<>u THEN RAISE EXCEPTION 'Session inaccessible' USING ERRCODE='42501'; END IF;
 PERFORM private.expire_vehicle_holds(b.vehicle_id);
 SELECT * INTO STRICT b FROM public.bookings WHERE id=b.id;
 SELECT * INTO STRICT s FROM public.payment_sessions WHERE id=p_session_id FOR UPDATE;
 SELECT * INTO STRICT q FROM public.quotes WHERE id=b.quote_id;
 PERFORM private.assert_checkout_binding(b,s,q);
 IF s.state<>'succeeded' THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT FROM public.payment_events e WHERE e.session_id=s.id AND e.event_type='succeeded'
  AND e.provider=s.provider AND e.amount_minor=q.total_minor AND e.currency=q.currency
  AND e.occurred_at>=s.created_at AND e.occurred_at<b.hold_expires_at
  AND (s.provider<>'demo' OR e.actor_id=b.customer_id))
 THEN RAISE EXCEPTION 'Timely verified payment event missing' USING ERRCODE='55000'; END IF;
 -- Retries of a previously confirmed booking never recreate an allocation/event.
 IF EXISTS(SELECT FROM public.booking_events WHERE booking_id=b.id AND event_type='confirmed') THEN RETURN b.id; END IF;
 IF b.state<>'awaiting_confirmation' THEN RAISE EXCEPTION 'Unexpected booking state' USING ERRCODE='55000'; END IF;
 PERFORM private.assert_checkout_allocation(b,q);
 UPDATE public.bookings SET state='confirmed',updated_at=private.rental_now() WHERE id=b.id;
 PERFORM private.emit_booking_event(b.id,'confirmed','Reservation confirmed after verified payment event');
 RETURN b.id;
END $$;

-- Keep the historical spelling readable. Future rejection events use the canonical name.
ALTER TABLE public.booking_events DROP CONSTRAINT booking_events_event_type_check;
ALTER TABLE public.booking_events ADD CONSTRAINT booking_events_event_type_check CHECK(event_type IN
 ('hold_created','payment_pending','payment_succeeded','payment_failed','payment_expired','payment_cancelled','hold_expired',
 'confirmed','ready','picked_up','active','returned','inspection_started','inspection_failed','inspection_completed',
 'completed','cancel_requested','cancel_rejected','cancellation_rejected','cancelled'));
CREATE OR REPLACE FUNCTION private.emit_booking_event(p_booking uuid,p_type text,p_reason text,p_system boolean DEFAULT false)
RETURNS void LANGUAGE sql VOLATILE SET search_path='' AS $$
 INSERT INTO public.booking_events(booking_id,event_type,actor_kind,actor_id,reason,occurred_at)
 VALUES(p_booking,CASE p_type WHEN 'cancel_rejected' THEN 'cancellation_rejected' ELSE p_type END,
 CASE WHEN p_system THEN 'system' WHEN private.is_admin() THEN 'admin' ELSE 'customer' END,
 CASE WHEN NOT p_system THEN auth.uid() END,p_reason,private.rental_now())
$$;
CREATE OR REPLACE FUNCTION private.notify_booking_event() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.event_type IN ('hold_expired','payment_succeeded','payment_failed','payment_expired','confirmed',
 'ready','active','returned','completed','cancel_rejected','cancellation_rejected','cancelled') THEN
 INSERT INTO public.notifications(event_id,customer_id,created_at)
 SELECT NEW.id,b.customer_id,NEW.occurred_at FROM public.bookings b WHERE b.id=NEW.booking_id;
 END IF;
 RETURN NEW;
END $$;
