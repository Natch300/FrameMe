-- Frame categories

ALTER TABLE public.frames ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';