-- Staff commands retain the canonical booking identity and inspection history.
ALTER TABLE public.vehicles DROP CONSTRAINT vehicles_operational_state_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_operational_state_check
 CHECK(operational_state IN('available','occupied','maintenance','inspection','archived'));
-- Reconcile only valid clean-staging active rentals, not archived production data.
UPDATE public.vehicles v SET operational_state='occupied' WHERE operational_state='available'
 AND EXISTS(SELECT FROM public.bookings b WHERE b.vehicle_id=v.id AND b.state='active');

CREATE OR REPLACE FUNCTION public.mark_ready(p_booking_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
 b:=private.lock_booking(p_booking_id,true);
 IF b.state='ready' THEN RETURN; END IF;
 IF b.state<>'confirmed' OR NOT EXISTS(SELECT FROM public.vehicles WHERE id=b.vehicle_id AND operational_state='available') THEN
  RAISE EXCEPTION 'Booking or vehicle cannot be marked ready' USING ERRCODE='55000'; END IF;
 UPDATE public.bookings SET state='ready',updated_at=private.rental_now() WHERE id=b.id;
 PERFORM private.emit_booking_event(b.id,'ready','Vehicle ready for this booking at the demo pickup location');
END $$;

CREATE OR REPLACE FUNCTION private.record_handover(p_booking uuid,p_kind text,p_condition text,p_fuel integer,p_odometer integer,p_damage text,p_notes text)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE b public.bookings; q public.quotes; i public.inspections; t timestamptz; op text;
BEGIN
  b:=private.lock_booking(p_booking,true);
  SELECT * INTO i FROM public.inspections WHERE booking_id=b.id AND kind=p_kind;
  IF FOUND THEN
    IF (p_kind='pickup' AND b.state<>'active') OR (p_kind='return' AND b.state<>'returned') THEN
      RAISE EXCEPTION 'Handover is not valid in the current state' USING ERRCODE='55000'; END IF;
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
    UPDATE public.vehicles SET operational_state='occupied' WHERE id=b.vehicle_id;
    PERFORM private.emit_booking_event(b.id,'picked_up','Pickup inspection recorded and vehicle handed over');
    PERFORM private.emit_booking_event(b.id,'active','Rental started');
  ELSE
    UPDATE public.bookings SET state='returned',updated_at=t WHERE id=b.id;
    UPDATE public.vehicles SET operational_state='inspection' WHERE id=b.vehicle_id;
    PERFORM private.emit_booking_event(b.id,'returned','Vehicle returned and awaiting inspection');
  END IF;
  RETURN i.id;
END $$;

CREATE OR REPLACE FUNCTION public.start_inspection(p_booking_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings;
BEGIN
 b:=private.lock_booking(p_booking_id,true);
 IF b.state='inspection' THEN RETURN; END IF;
 IF b.state<>'returned' THEN RAISE EXCEPTION 'Return is required before inspection' USING ERRCODE='55000'; END IF;
 UPDATE public.bookings SET state='inspection',updated_at=private.rental_now() WHERE id=b.id;
 PERFORM private.emit_booking_event(b.id,'inspection_started','Return inspection started');
END $$;

CREATE OR REPLACE FUNCTION public.finish_inspection(p_booking_id uuid,p_passed boolean,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; i uuid; previous_reason text; t timestamptz;
BEGIN
 b:=private.lock_booking(p_booking_id,true);
 IF p_passed IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Inspection result and staff reason required' USING ERRCODE='22023'; END IF;
 SELECT id INTO i FROM public.inspections WHERE booking_id=b.id AND kind='return';
 SELECT reason INTO previous_reason FROM public.inspection_outcomes WHERE inspection_id=i AND passed=p_passed;
 IF FOUND THEN
  IF previous_reason<>trim(p_reason) THEN RAISE EXCEPTION 'Inspection result already recorded with different details' USING ERRCODE='22023'; END IF;
  RETURN b.state;
 END IF;
 IF b.state<>'inspection' OR i IS NULL OR EXISTS(SELECT FROM public.inspection_outcomes WHERE inspection_id=i AND passed) THEN
  RAISE EXCEPTION 'Inspection is not open' USING ERRCODE='55000'; END IF;
 t:=private.rental_now();
 INSERT INTO public.inspection_outcomes(inspection_id,passed,reason,inspected_by,inspected_at) VALUES(i,p_passed,trim(p_reason),auth.uid(),t);
 IF p_passed THEN
  UPDATE public.vehicles SET operational_state='inspection' WHERE id=b.vehicle_id;
  PERFORM private.emit_booking_event(b.id,'inspection_completed','Return inspection cleared; awaiting rental completion');
 ELSE
  UPDATE public.vehicles SET operational_state='maintenance' WHERE id=b.vehicle_id;
  PERFORM private.emit_booking_event(b.id,'inspection_failed','Vehicle remains unavailable pending inspection clearance');
 END IF;
 RETURN 'inspection';
END $$;

CREATE FUNCTION public.complete_booking(p_booking_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings; t timestamptz;
BEGIN
 b:=private.lock_booking(p_booking_id,true);
 IF b.state='completed' THEN RETURN b.id; END IF;
 IF b.state<>'inspection' OR NOT EXISTS(
  SELECT FROM public.inspections i JOIN public.inspection_outcomes o ON o.inspection_id=i.id
  WHERE i.booking_id=b.id AND i.kind='return' AND o.passed)
  OR NOT EXISTS(SELECT FROM public.vehicles WHERE id=b.vehicle_id AND operational_state='inspection')
 THEN RAISE EXCEPTION 'A cleared return inspection is required' USING ERRCODE='55000'; END IF;
 t:=private.rental_now();
 UPDATE public.bookings SET state='completed',updated_at=t WHERE id=b.id;
 UPDATE public.vehicles SET operational_state='available' WHERE id=b.vehicle_id;
 UPDATE public.vehicle_allocations SET released_at=t WHERE booking_id=b.id AND released_at IS NULL;
 -- Actual-return turnaround remains enforced by private.interval_open. Other
 -- bookings and maintenance allocations remain independent constraints.
 PERFORM private.emit_booking_event(b.id,'completed','Rental completed after return inspection clearance');
 RETURN b.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_booking(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking(uuid) TO authenticated;
