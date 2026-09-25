ALTER TABLE public.shopping_lists DROP CONSTRAINT shopping_lists_status_check;
ALTER TABLE public.shopping_lists ADD CONSTRAINT shopping_lists_status_check CHECK (status IN ('active', 'completed', 'archived', 'template'));
