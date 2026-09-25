-- spec:
--   tables_added: []
--   columns_added: []
--   breaking: true
--   description: "Alta/unión a familias solo vía RPC (get_or_create_family, join_family); storage de boletas por familia; plantillas con status 'template'."
-- /spec

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Membresías: sin INSERT directo.
--    Antes cualquier usuario podía insertarse en cualquier familia, incluso como
--    'owner'. Un chequeo "familia sin miembros" dentro de la policy no sirve: la
--    policy de SELECT oculta las membresías ajenas, así que siempre daría vacío.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Create families" ON public.families;

-- Devuelve la familia del usuario; si no tiene, crea "Mi Familia" y lo deja como owner.
CREATE OR REPLACE FUNCTION public.get_or_create_family()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_family_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Serializa llamadas concurrentes del mismo usuario (evita crear dos familias).
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  SELECT family_id INTO v_family_id
  FROM family_members
  WHERE user_id = v_uid
  ORDER BY created_at
  LIMIT 1;

  IF v_family_id IS NOT NULL THEN
    RETURN v_family_id;
  END IF;

  INSERT INTO families (name) VALUES ('Mi Familia') RETURNING id INTO v_family_id;
  INSERT INTO family_members (family_id, user_id, role) VALUES (v_family_id, v_uid, 'owner');

  RETURN v_family_id;
END;
$$;

-- Une al usuario a otra familia (el "código" es el id de la familia).
-- El usuario queda con una sola membresía: se quitan las anteriores.
-- Las familias que quedan sin miembros no se borran (conservan sus datos) y ya no
-- aceptan uniones.
CREATE OR REPLACE FUNCTION public.join_family(p_family_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id) THEN
    RAISE EXCEPTION 'invalid_family_code' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = '23505';
  END IF;

  DELETE FROM family_members WHERE user_id = v_uid;
  INSERT INTO family_members (family_id, user_id, role) VALUES (p_family_id, v_uid, 'member');

  RETURN p_family_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_family() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_family(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_family() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Storage de boletas: solo bajo la carpeta "<family_id>/" de tu familia.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Family members upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Family members view receipts" ON storage.objects;

CREATE POLICY "Family members upload receipts" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (SELECT f::text FROM public.get_user_family_ids() AS f)
);

CREATE POLICY "Family members view receipts" ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (SELECT f::text FROM public.get_user_family_ids() AS f)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Plantillas: 'archived' + prefijo "[TEMPLATE] " → status 'template'.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.shopping_lists
SET status = 'template',
    name = substr(name, length('[TEMPLATE] ') + 1)
WHERE status = 'archived'
  AND name LIKE '[TEMPLATE] %';
