-- Decoded content validation is recorded only by the bounded server validator.
ALTER TABLE public.vehicle_media
 ADD COLUMN validated_object_id uuid,
 ADD COLUMN content_sha256 text,
 ADD COLUMN width integer,
 ADD COLUMN height integer,
 ADD COLUMN validated_at timestamptz,
 ADD CONSTRAINT vehicle_media_validation_complete CHECK (
   (validated_object_id IS NULL AND content_sha256 IS NULL AND width IS NULL AND height IS NULL AND validated_at IS NULL)
   OR (validated_object_id IS NOT NULL AND content_sha256 IS NOT NULL AND content_sha256 ~ '^[0-9a-f]{64}$'
     AND width IS NOT NULL AND width BETWEEN 1 AND 10000 AND height IS NOT NULL AND height BETWEEN 1 AND 10000
     AND width::bigint*height<=20000000 AND validated_at IS NOT NULL));
ALTER TABLE public.inspection_media
 ADD COLUMN validated_object_id uuid,
 ADD COLUMN content_sha256 text,
 ADD COLUMN width integer,
 ADD COLUMN height integer,
 ADD COLUMN validated_at timestamptz,
 ADD CONSTRAINT inspection_media_validation_complete CHECK (
   (validated_object_id IS NULL AND content_sha256 IS NULL AND width IS NULL AND height IS NULL AND validated_at IS NULL)
   OR (validated_object_id IS NOT NULL AND content_sha256 IS NOT NULL AND content_sha256 ~ '^[0-9a-f]{64}$'
     AND width IS NOT NULL AND width BETWEEN 1 AND 10000 AND height IS NOT NULL AND height BETWEEN 1 AND 10000
     AND width::bigint*height<=20000000 AND validated_at IS NOT NULL));
GRANT SELECT(width,height) ON public.vehicle_media TO anon,authenticated;

-- The upload holds this shared row lock through its Storage INSERT transaction.
-- Discard/cleanup update or delete the same row and must wait for it to finish.
CREATE FUNCTION private.authorize_media_insert(p_bucket text,p_path text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.is_admin() THEN RETURN false; END IF;
 IF p_bucket='fleet-gallery' THEN
  PERFORM 1 FROM public.vehicle_media WHERE object_path=p_path AND state='pending' FOR SHARE;
 ELSIF p_bucket='rental-inspections' THEN
  PERFORM 1 FROM public.inspection_media WHERE object_path=p_path AND state='pending' FOR SHARE;
 ELSE RETURN false; END IF;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION private.authorize_media_insert(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.authorize_media_insert(text,text) TO authenticated;
DROP POLICY fleet_insert ON storage.objects;
CREATE POLICY fleet_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='fleet-gallery' AND private.authorize_media_insert(bucket_id,name));
DROP POLICY inspection_object_insert ON storage.objects;
CREATE POLICY inspection_object_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='rental-inspections' AND private.authorize_media_insert(bucket_id,name));

CREATE FUNCTION public.record_media_validation(
 p_media_id uuid,p_inspection boolean,p_object_id uuid,p_sha256 text,
 p_content_type text,p_byte_length integer,p_width integer,p_height integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE media record; object_record storage.objects; bucket_name text;
BEGIN
 IF p_inspection IS NULL OR p_object_id IS NULL OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
  OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 10000 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 10000
  OR p_width::bigint*p_height>20000000 OR p_byte_length IS NULL OR p_byte_length NOT BETWEEN 1 AND 8388608
  OR p_content_type IS NULL OR p_content_type NOT IN('image/jpeg','image/png','image/webp') THEN
  RAISE EXCEPTION 'Invalid decoded media attributes' USING ERRCODE='22023';
 END IF;
 IF p_inspection THEN
  bucket_name:='rental-inspections';
  SELECT id,object_path,content_type,byte_length,state,validated_object_id,content_sha256,width,height
   INTO STRICT media FROM public.inspection_media WHERE id=p_media_id FOR UPDATE;
 ELSE
  bucket_name:='fleet-gallery';
  SELECT id,object_path,content_type,byte_length,state,validated_object_id,content_sha256,width,height
   INTO STRICT media FROM public.vehicle_media WHERE id=p_media_id FOR UPDATE;
 END IF;
 IF (p_inspection AND media.state NOT IN('pending','attached'))
  OR (NOT p_inspection AND media.state NOT IN('pending','current','retired')) THEN
  RAISE EXCEPTION 'Media association is unavailable for validation' USING ERRCODE='55000';
 END IF;
 SELECT * INTO object_record FROM storage.objects
  WHERE id=p_object_id AND bucket_id=bucket_name AND name=media.object_path FOR SHARE;
 IF NOT FOUND OR (media.content_type,media.byte_length) IS DISTINCT FROM (p_content_type,p_byte_length)
  OR (object_record.metadata->>'mimetype') IS DISTINCT FROM p_content_type
  OR (object_record.metadata->>'size')::bigint IS DISTINCT FROM p_byte_length::bigint THEN
  RAISE EXCEPTION 'Stored object does not match decoded media' USING ERRCODE='22023';
 END IF;
 IF media.validated_object_id IS NOT NULL THEN
  IF (media.validated_object_id,media.content_sha256,media.width,media.height)
   IS DISTINCT FROM (p_object_id,p_sha256,p_width,p_height) THEN
   RAISE EXCEPTION 'Validated content changed; create a new media association' USING ERRCODE='55000';
  END IF;
  RETURN;
 END IF;
 IF p_inspection THEN
  UPDATE public.inspection_media SET validated_object_id=p_object_id,content_sha256=p_sha256,
   width=p_width,height=p_height,validated_at=clock_timestamp() WHERE id=p_media_id;
 ELSE
  UPDATE public.vehicle_media SET validated_object_id=p_object_id,content_sha256=p_sha256,
   width=p_width,height=p_height,validated_at=clock_timestamp() WHERE id=p_media_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_media_validation(uuid,boolean,uuid,text,text,integer,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_media_validation(uuid,boolean,uuid,text,text,integer,integer,integer)
 TO service_role;

CREATE OR REPLACE FUNCTION public.publish_vehicle_media(p_media_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE media public.vehicle_media;
BEGIN
 PERFORM private.require_admin();
 SELECT * INTO STRICT media FROM public.vehicle_media WHERE id=p_media_id;
 PERFORM 1 FROM public.vehicles WHERE id=media.vehicle_id AND operational_state<>'archived' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle unavailable'; END IF;
 SELECT * INTO STRICT media FROM public.vehicle_media WHERE id=p_media_id FOR UPDATE;
 IF media.state NOT IN('pending','current','retired') THEN RAISE EXCEPTION 'Media unavailable'; END IF;
 IF media.validated_at IS NULL OR NOT EXISTS(SELECT FROM storage.objects object_record
  WHERE object_record.id=media.validated_object_id AND object_record.bucket_id='fleet-gallery'
   AND object_record.name=media.object_path AND (object_record.metadata->>'size')::bigint=media.byte_length
   AND object_record.metadata->>'mimetype'=media.content_type) THEN
  RAISE EXCEPTION 'Uploaded object requires successful content validation' USING ERRCODE='55000';
 END IF;
 IF media.state='current' THEN RETURN; END IF;
 UPDATE public.vehicle_media SET state='retired'
  WHERE vehicle_id=media.vehicle_id AND category=media.category AND position=media.position AND state='current';
 UPDATE public.vehicle_media SET state='current' WHERE id=media.id;
END $$;

CREATE OR REPLACE FUNCTION public.attach_inspection_media(p_media_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE media public.inspection_media;
BEGIN
 PERFORM private.require_admin();
 SELECT * INTO STRICT media FROM public.inspection_media WHERE id=p_media_id FOR UPDATE;
 IF media.state NOT IN('pending','attached') THEN RAISE EXCEPTION 'Inspection media unavailable' USING ERRCODE='55000'; END IF;
 IF media.validated_at IS NULL OR NOT EXISTS(SELECT FROM storage.objects object_record
  WHERE object_record.id=media.validated_object_id AND object_record.bucket_id='rental-inspections'
   AND object_record.name=media.object_path AND (object_record.metadata->>'size')::bigint=media.byte_length
   AND object_record.metadata->>'mimetype'=media.content_type) THEN
  RAISE EXCEPTION 'Inspection object requires successful content validation' USING ERRCODE='55000';
 END IF;
 IF media.state='attached' THEN RETURN; END IF;
 UPDATE public.inspection_media SET state='attached' WHERE id=media.id;
END $$;

-- Existing synthetic metadata remains available to staff for validation.
DROP POLICY media_read ON public.vehicle_media;
CREATE POLICY media_read ON public.vehicle_media FOR SELECT TO anon,authenticated USING (
 (state='current' AND validated_at IS NOT NULL
  AND EXISTS(SELECT FROM public.vehicles vehicle WHERE vehicle.id=vehicle_id AND vehicle.published))
 OR (SELECT private.is_admin()));

