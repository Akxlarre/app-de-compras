-- 1. Tablas Base
CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.family_members (
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (family_id, user_id)
);

-- 2. Catálogo Inteligente
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    last_price NUMERIC(10, 2),
    estimated_duration_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Listas y Elementos
CREATE TABLE public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) DEFAULT 1,
    notes TEXT,
    is_checked BOOLEAN DEFAULT false NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE,
    checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. OCR y Finanzas
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT,
    total_amount NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'pending_ocr' CHECK (status IN ('pending_ocr', 'processed', 'error')),
    date TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security (RLS)
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Helper RLS function: Obtiene las familias a las que pertenece el usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_family_ids()
RETURNS SETOF UUID 
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- Políticas
CREATE POLICY "View own families" ON public.families FOR SELECT USING (id IN (SELECT public.get_user_family_ids()));
CREATE POLICY "Update own families" ON public.families FOR UPDATE USING (id IN (SELECT public.get_user_family_ids()));
CREATE POLICY "Create families" ON public.families FOR INSERT WITH CHECK (true);

CREATE POLICY "View family members" ON public.family_members FOR SELECT USING (family_id IN (SELECT public.get_user_family_ids()));
CREATE POLICY "Insert family members" ON public.family_members FOR INSERT WITH CHECK (user_id = auth.uid() OR family_id IN (SELECT public.get_user_family_ids()));

CREATE POLICY "Products access" ON public.products FOR ALL USING (family_id IN (SELECT public.get_user_family_ids()));
CREATE POLICY "Shopping lists access" ON public.shopping_lists FOR ALL USING (family_id IN (SELECT public.get_user_family_ids()));
CREATE POLICY "Receipts access" ON public.receipts FOR ALL USING (family_id IN (SELECT public.get_user_family_ids()));

CREATE POLICY "List items access" ON public.list_items FOR ALL USING (
    list_id IN (SELECT id FROM public.shopping_lists WHERE family_id IN (SELECT public.get_user_family_ids()))
);

-- 6. Storage para las boletas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view receipts" ON storage.objects FOR SELECT 
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- 7. Privilegios explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_family_ids() TO authenticated;
