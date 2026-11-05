-- The same exclusion index protects checkout holds, rentals and planned maintenance.
-- Run after the clean identity/fleet migration, on PostgreSQL 17 with btree_gist.
SET LOCAL search_path = pg_catalog, public, extensions;

CREATE FUNCTION private.rental_now() RETURNS timestamptz
LANGUAGE sql VOLATILE SET search_path = '' AS $$ SELECT clock_timestamp() $$;

CREATE TABLE private.payment_providers (name text PRIMARY KEY);
INSERT INTO private.payment_providers VALUES ('demo');
CREATE TABLE private.rental_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  checkout_provider text NOT NULL DEFAULT 'demo' REFERENCES private.payment_providers(name),
  quote_lifetime interval NOT NULL DEFAULT interval '10 minutes' CHECK (quote_lifetime > interval '0'),
  hold_lifetime interval NOT NULL DEFAULT interval '10 minutes' CHECK (hold_lifetime > interval '0'),
  turnaround interval NOT NULL DEFAULT interval '2 hours' CHECK (turnaround >= interval '0')
);
INSERT INTO private.rental_settings DEFAULT VALUES;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  vehicle_label text NOT NULL,
  customer_name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (isfinite(ends_at) AND ends_at > starts_at AND isfinite(starts_at)),
  rate_minor bigint NOT NULL CHECK (rate_minor > 0),
  billable_days integer NOT NULL CHECK (billable_days > 0),
  total_minor bigint GENERATED ALWAYS AS (rate_minor * billable_days) STORED,
  currency text NOT NULL CHECK (currency = 'INR'),
  turnaround interval NOT NULL CHECK (turnaround >= interval '0'),
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  UNIQUE (customer_id, request_id),
  UNIQUE (id, vehicle_id, customer_id)
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('ORB-' || replace(gen_random_uuid()::text,'-','')),
  quote_id uuid NOT NULL UNIQUE,
  vehicle_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('held','awaiting_confirmation','confirmed','ready','active','returned','inspection','completed','expired','cancelled','failed')),
  hold_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (quote_id,vehicle_id,customer_id) REFERENCES public.quotes(id,vehicle_id,customer_id) ON DELETE RESTRICT,
  UNIQUE (id,vehicle_id)
);
CREATE INDEX bookings_customer_history ON public.bookings(customer_id,created_at DESC);
CREATE INDEX bookings_vehicle_state ON public.bookings(vehicle_id,state);
CREATE INDEX bookings_due_holds ON public.bookings(hold_expires_at) WHERE state='held';

CREATE TABLE public.vehicle_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  booking_id uuid UNIQUE,
  occupied tstzrange NOT NULL CHECK (NOT isempty(occupied) AND lower_inc(occupied) AND NOT upper_inc(occupied)
    AND NOT lower_inf(occupied) AND NOT upper_inf(occupied) AND isfinite(lower(occupied)) AND isfinite(upper(occupied))),
  maintenance_reason text,
  request_id uuid UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL, released_at timestamptz,
  FOREIGN KEY (booking_id,vehicle_id) REFERENCES public.bookings(id,vehicle_id) ON DELETE RESTRICT,
  CHECK ((booking_id IS NOT NULL AND maintenance_reason IS NULL AND request_id IS NULL)
      OR (booking_id IS NULL AND length(trim(maintenance_reason)) BETWEEN 1 AND 500 AND maintenance_reason IS NOT NULL AND request_id IS NOT NULL)),
  EXCLUDE USING gist (vehicle_id WITH =, occupied WITH &&) WHERE (released_at IS NULL)
);

CREATE TABLE public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  provider text NOT NULL REFERENCES private.payment_providers(name),
  state text NOT NULL CHECK (state IN ('pending','succeeded','failed','expired','cancelled')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency='INR'),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  UNIQUE(id,provider,amount_minor,currency)
);

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('pending','succeeded','failed','expired','cancelled')),
  provider text NOT NULL,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL, occurred_at timestamptz NOT NULL,
  UNIQUE(session_id,event_type),
  FOREIGN KEY (session_id,provider,amount_minor,currency) REFERENCES public.payment_sessions(id,provider,amount_minor,currency) ON DELETE RESTRICT
);

CREATE TABLE public.booking_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('hold_created','payment_pending','payment_succeeded','payment_failed',
    'payment_expired','payment_cancelled','hold_expired','confirmed','ready','picked_up','active','returned',
    'inspection_started','inspection_completed','completed','cancel_requested','cancel_rejected','cancelled')),
  actor_kind text NOT NULL CHECK(actor_kind IN ('system','customer','admin')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
  occurred_at timestamptz NOT NULL,
  CHECK ((actor_kind='system')=(actor_id IS NULL))
);
CREATE INDEX booking_events_timeline ON public.booking_events(booking_id,id);
CREATE TABLE public.notifications (
  event_id bigint PRIMARY KEY REFERENCES public.booking_events(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL, read_at timestamptz
);
CREATE INDEX notifications_inbox ON public.notifications(customer_id,created_at DESC);

CREATE FUNCTION private.reject_event_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Event history is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER booking_event_immutable BEFORE UPDATE OR DELETE ON public.booking_events
FOR EACH ROW EXECUTE FUNCTION private.reject_event_change();
CREATE TRIGGER payment_event_immutable BEFORE UPDATE OR DELETE ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION private.reject_event_change();

CREATE FUNCTION private.notify_booking_event() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.event_type IN ('hold_expired','payment_succeeded','payment_failed','payment_expired','confirmed',
     'ready','active','returned','completed','cancel_rejected','cancelled') THEN
    INSERT INTO public.notifications(event_id,customer_id,created_at)
    SELECT NEW.id,b.customer_id,NEW.occurred_at FROM public.bookings b WHERE b.id=NEW.booking_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_event_notification AFTER INSERT ON public.booking_events
FOR EACH ROW EXECUTE FUNCTION private.notify_booking_event();

CREATE FUNCTION private.emit_booking_event(p_booking uuid,p_type text,p_reason text,p_system boolean DEFAULT false)
RETURNS void LANGUAGE sql VOLATILE SET search_path='' AS $$
  INSERT INTO public.booking_events(booking_id,event_type,actor_kind,actor_id,reason,occurred_at)
  VALUES (p_booking,p_type,CASE WHEN p_system THEN 'system' WHEN private.is_admin() THEN 'admin' ELSE 'customer' END,
    CASE WHEN NOT p_system THEN auth.uid() END,p_reason,private.rental_now())
$$;

CREATE FUNCTION private.require_customer() RETURNS uuid LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF NOT EXISTS(SELECT FROM public.user_roles WHERE user_id=v_user AND role='customer') THEN
    RAISE EXCEPTION 'Customer login required' USING ERRCODE='42501';
  END IF;
  RETURN v_user;
END $$;

-- Always lock vehicle -> booking -> payment. All writers, including maintenance, use this order.
CREATE FUNCTION private.lock_booking(p_booking uuid,p_admin_only boolean DEFAULT false) RETURNS public.bookings
LANGUAGE plpgsql VOLATILE SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking;
  IF b.id IS NULL OR auth.uid() IS NULL OR (p_admin_only AND NOT private.is_admin())
     OR (b.customer_id IS DISTINCT FROM auth.uid() AND NOT private.is_admin()) THEN
    RAISE EXCEPTION 'Booking inaccessible' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.vehicles WHERE id=b.vehicle_id FOR UPDATE;
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking FOR UPDATE;
  RETURN b;
END $$;

CREATE FUNCTION private.expire_vehicle_holds(p_vehicle uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE b record; s public.payment_sessions; t timestamptz:=private.rental_now();
BEGIN
  FOR b IN UPDATE public.bookings SET state='expired',updated_at=t
      WHERE vehicle_id=p_vehicle AND state='held' AND hold_expires_at<=t RETURNING id LOOP
    UPDATE public.payment_sessions SET state='expired',updated_at=t WHERE booking_id=b.id AND state='pending' RETURNING * INTO STRICT s;
    INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,reason,occurred_at)
      VALUES(s.id,'expired',s.provider,s.amount_minor,s.currency,'Checkout hold expired',t);
    UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id AND released_at IS NULL;
    PERFORM private.emit_booking_event(b.id,'payment_expired','Payment session expired',true);
    PERFORM private.emit_booking_event(b.id,'hold_expired','Checkout hold expired; inventory released',true);
  END LOOP;
END $$;

CREATE FUNCTION private.interval_open(p_vehicle uuid,p_start timestamptz,p_end_with_buffer timestamptz,p_now timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT EXISTS(SELECT FROM public.vehicles WHERE id=p_vehicle AND published AND operational_state='available')
    AND NOT EXISTS (
      SELECT FROM public.vehicle_allocations a LEFT JOIN public.bookings b ON b.id=a.booking_id
      WHERE a.vehicle_id=p_vehicle AND a.released_at IS NULL
        AND a.occupied && tstzrange(p_start,p_end_with_buffer,'[)')
        AND (a.booking_id IS NULL OR b.state<>'held' OR b.hold_expires_at>p_now))
    AND NOT EXISTS (
      SELECT FROM public.bookings b JOIN public.quotes q ON q.id=b.quote_id
      WHERE b.vehicle_id=p_vehicle AND b.state IN ('active','returned','inspection') AND q.ends_at<=p_now)
$$;

CREATE FUNCTION public.available_vehicles(p_starts_at timestamptz,p_ends_at timestamptz)
RETURNS TABLE(vehicle_id uuid) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE t timestamptz:=private.rental_now(); buffer interval;
BEGIN
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR NOT isfinite(p_starts_at) OR NOT isfinite(p_ends_at)
    OR p_starts_at<t OR p_ends_at<=p_starts_at THEN RAISE EXCEPTION 'Invalid future rental interval' USING ERRCODE='22023'; END IF;
  SELECT turnaround INTO STRICT buffer FROM private.rental_settings;
  RETURN QUERY SELECT v.id FROM public.vehicles v WHERE v.published AND v.operational_state='available'
    AND private.interval_open(v.id,p_starts_at,p_ends_at+buffer,t) ORDER BY v.id;
END $$;

CREATE FUNCTION public.create_quote(p_vehicle_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); q public.quotes; v public.vehicles; cfg private.rental_settings; t timestamptz;
BEGIN
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Request ID required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('quote:'||u::text||p_request_id::text,0));
  SELECT * INTO q FROM public.quotes WHERE customer_id=u AND request_id=p_request_id;
  IF FOUND THEN
    IF (q.vehicle_id,q.starts_at,q.ends_at) IS DISTINCT FROM (p_vehicle_id,p_starts_at,p_ends_at) THEN
      RAISE EXCEPTION 'Request ID reused with different rental' USING ERRCODE='22023';
    END IF;
    RETURN q.id;
  END IF;
  t:=private.rental_now();
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR NOT isfinite(p_starts_at) OR NOT isfinite(p_ends_at)
    OR p_starts_at<t OR p_ends_at<=p_starts_at THEN RAISE EXCEPTION 'Invalid future rental interval' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT cfg FROM private.rental_settings;
  SELECT * INTO v FROM public.vehicles WHERE id=p_vehicle_id;
  IF v.id IS NULL OR NOT private.interval_open(p_vehicle_id,p_starts_at,p_ends_at+cfg.turnaround,t) THEN
    RAISE EXCEPTION 'Vehicle unavailable' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.quotes(customer_id,request_id,vehicle_id,vehicle_label,customer_name,starts_at,ends_at,rate_minor,billable_days,currency,turnaround,created_at,expires_at)
    VALUES(u,p_request_id,v.id,concat_ws(' ',v.manufacturer,v.model),
      COALESCE((SELECT nullif(btrim(display_name),'') FROM public.user_profiles WHERE user_id=u),'Customer'),
      p_starts_at,p_ends_at,v.daily_rate_minor,greatest(1,ceil(extract(epoch FROM (p_ends_at-p_starts_at))/86400)::int),
      v.currency,cfg.turnaround,t,least(t+cfg.quote_lifetime,p_starts_at)) RETURNING id INTO q.id;
  RETURN q.id;
END $$;

CREATE FUNCTION public.start_checkout(p_quote_id uuid) RETURNS uuid
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
  IF q.expires_at<=t OR q.starts_at<=t THEN RAISE EXCEPTION 'Quote expired' USING ERRCODE='22023'; END IF;
  IF NOT private.interval_open(q.vehicle_id,q.starts_at,q.ends_at+q.turnaround,t) THEN RAISE EXCEPTION 'Vehicle unavailable' USING ERRCODE='23P01'; END IF;
  SELECT least(t+hold_lifetime,q.starts_at),checkout_provider INTO STRICT deadline,provider_name FROM private.rental_settings;
  INSERT INTO public.bookings(quote_id,vehicle_id,customer_id,state,hold_expires_at,created_at,updated_at)
    VALUES(q.id,q.vehicle_id,u,'held',deadline,t,t) RETURNING id INTO b;
  INSERT INTO public.vehicle_allocations(vehicle_id,booking_id,occupied,created_by,created_at)
    VALUES(q.vehicle_id,b,tstzrange(q.starts_at,q.ends_at+q.turnaround,'[)'),u,t);
  INSERT INTO public.payment_sessions(booking_id,provider,state,amount_minor,currency,created_at,updated_at)
    VALUES(b,provider_name,'pending',q.total_minor,q.currency,t,t) RETURNING id INTO s;
  INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,actor_id,reason,occurred_at)
    VALUES(s,'pending',provider_name,q.total_minor,q.currency,u,'Payment session opened',t);
  PERFORM private.emit_booking_event(b,'hold_created','Vehicle held for checkout');
  PERFORM private.emit_booking_event(b,'payment_pending','Awaiting payment approval');
  RETURN b;
END $$;

-- A scan or SELECT never calls this mutation. Approval before the deadline changes
-- the temporary hold to an allocated, awaiting-confirmation reservation.
CREATE FUNCTION private.demo_result(p_session uuid,p_result text) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE u uuid:=private.require_customer(); s public.payment_sessions; b public.bookings; t timestamptz;
BEGIN
  SELECT * INTO s FROM public.payment_sessions WHERE id=p_session;
  b:=private.lock_booking(s.booking_id);
  IF b.customer_id<>u THEN RAISE EXCEPTION 'Session inaccessible' USING ERRCODE='42501'; END IF;
  PERFORM private.expire_vehicle_holds(b.vehicle_id);
  SELECT * INTO STRICT s FROM public.payment_sessions WHERE id=p_session FOR UPDATE;
  IF s.state<>'pending' THEN RETURN s.state; END IF;
  IF p_result IS NULL OR p_result NOT IN ('succeeded','failed','cancelled') THEN RAISE EXCEPTION 'Invalid demo action' USING ERRCODE='22023'; END IF;
  IF b.state<>'held' OR s.provider<>'demo' THEN RAISE EXCEPTION 'Invalid checkout state' USING ERRCODE='55000'; END IF;
  t:=private.rental_now();
  IF b.hold_expires_at<=t THEN PERFORM private.expire_vehicle_holds(b.vehicle_id); RETURN 'expired'; END IF;
  UPDATE public.payment_sessions SET state=p_result,updated_at=t WHERE id=s.id;
  INSERT INTO public.payment_events(session_id,event_type,provider,amount_minor,currency,actor_id,reason,occurred_at)
    VALUES(s.id,p_result,'demo',s.amount_minor,s.currency,u,CASE p_result WHEN 'succeeded' THEN 'Customer explicitly approved simulation; no money transferred'
      WHEN 'failed' THEN 'Customer declined demo payment' ELSE 'Customer abandoned checkout' END,t);
  UPDATE public.bookings SET state=CASE p_result WHEN 'succeeded' THEN 'awaiting_confirmation' ELSE p_result END,updated_at=t WHERE id=b.id;
  PERFORM private.emit_booking_event(b.id,'payment_'||p_result,CASE p_result WHEN 'succeeded' THEN 'Demo payment approved; no money transferred'
       WHEN 'failed' THEN 'Demo payment declined' ELSE 'Demo checkout abandoned' END);
  IF p_result<>'succeeded' THEN UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id; END IF;
  IF p_result='cancelled' THEN PERFORM private.emit_booking_event(b.id,'cancelled','Checkout cancelled before confirmation'); END IF;
  RETURN p_result;
END $$;

CREATE FUNCTION public.approve_demo_payment(p_session_id uuid) RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$ SELECT private.demo_result(p_session_id,'succeeded') $$;
CREATE FUNCTION public.decline_demo_payment(p_session_id uuid) RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$ SELECT private.demo_result(p_session_id,'failed') $$;
CREATE FUNCTION public.abandon_checkout(p_session_id uuid) RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$ SELECT private.demo_result(p_session_id,'cancelled') $$;

CREATE FUNCTION public.reconcile_checkout(p_session_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; result text;
BEGIN
  b:=private.lock_booking((SELECT booking_id FROM public.payment_sessions WHERE id=p_session_id));
  PERFORM private.expire_vehicle_holds(b.vehicle_id);
  SELECT state INTO STRICT result FROM public.payment_sessions WHERE id=p_session_id;
  RETURN result;
END $$;

CREATE FUNCTION public.finalize_booking(p_session_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; s public.payment_sessions; q public.quotes;
BEGIN
  b:=private.lock_booking((SELECT booking_id FROM public.payment_sessions WHERE id=p_session_id));
  PERFORM private.expire_vehicle_holds(b.vehicle_id);
  SELECT * INTO STRICT s FROM public.payment_sessions WHERE id=p_session_id FOR UPDATE;
  SELECT * INTO STRICT q FROM public.quotes WHERE id=b.quote_id;
  IF s.state<>'succeeded' THEN RETURN NULL; END IF;
  IF s.amount_minor<>q.total_minor OR s.currency<>q.currency OR NOT EXISTS(
      SELECT FROM public.payment_events e WHERE e.session_id=s.id AND e.event_type='succeeded' AND e.provider=s.provider
        AND e.amount_minor=q.total_minor AND e.currency=q.currency) THEN
    RAISE EXCEPTION 'Verified payment event missing or inconsistent' USING ERRCODE='55000'; END IF;
  IF b.state='awaiting_confirmation' THEN
    UPDATE public.bookings SET state='confirmed',updated_at=private.rental_now() WHERE id=b.id;
    PERFORM private.emit_booking_event(b.id,'confirmed','Reservation confirmed after verified provider event');
  ELSIF NOT EXISTS(SELECT FROM public.booking_events WHERE booking_id=b.id AND event_type='confirmed') THEN
    RAISE EXCEPTION 'Unexpected booking state' USING ERRCODE='55000';
  END IF;
  RETURN b.id;
END $$;

CREATE FUNCTION public.mark_notification_read(p_event_id bigint) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  UPDATE public.notifications SET read_at=coalesce(read_at,private.rental_now()) WHERE event_id=p_event_id AND customer_id=auth.uid()
$$;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_read ON public.quotes FOR SELECT TO authenticated USING(customer_id=(SELECT auth.uid()) OR (SELECT private.is_admin()));
CREATE POLICY bookings_read ON public.bookings FOR SELECT TO authenticated USING(customer_id=(SELECT auth.uid()) OR (SELECT private.is_admin()));
CREATE POLICY allocations_read ON public.vehicle_allocations FOR SELECT TO authenticated USING((SELECT private.is_admin()));
CREATE POLICY sessions_read ON public.payment_sessions FOR SELECT TO authenticated USING(EXISTS(SELECT FROM public.bookings b WHERE b.id=booking_id));
CREATE POLICY payment_events_read ON public.payment_events FOR SELECT TO authenticated USING(EXISTS(SELECT FROM public.payment_sessions s WHERE s.id=session_id));
CREATE POLICY booking_events_read ON public.booking_events FOR SELECT TO authenticated USING(EXISTS(SELECT FROM public.bookings b WHERE b.id=booking_id));
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING(customer_id=(SELECT auth.uid()));

REVOKE ALL ON TABLE public.quotes,public.bookings,public.vehicle_allocations,public.payment_sessions,public.payment_events,public.booking_events,public.notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.quotes,public.bookings,public.vehicle_allocations,public.payment_sessions,public.payment_events,public.booking_events,public.notifications TO authenticated;
REVOKE ALL ON TABLE private.rental_settings,private.payment_providers FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.booking_events_id_seq FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.rental_now(),private.reject_event_change(),private.notify_booking_event(),private.emit_booking_event(uuid,text,text,boolean),
  private.require_customer(),private.lock_booking(uuid,boolean),private.expire_vehicle_holds(uuid),private.interval_open(uuid,timestamptz,timestamptz,timestamptz),
  private.demo_result(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.available_vehicles(timestamptz,timestamptz),public.create_quote(uuid,timestamptz,timestamptz,uuid),
  public.start_checkout(uuid),public.approve_demo_payment(uuid),public.decline_demo_payment(uuid),public.abandon_checkout(uuid),
  public.reconcile_checkout(uuid),public.finalize_booking(uuid),public.mark_notification_read(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.available_vehicles(timestamptz,timestamptz) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote(uuid,timestamptz,timestamptz,uuid),public.start_checkout(uuid),public.approve_demo_payment(uuid),
  public.decline_demo_payment(uuid),public.abandon_checkout(uuid),public.reconcile_checkout(uuid),public.finalize_booking(uuid),public.mark_notification_read(bigint) TO authenticated;

