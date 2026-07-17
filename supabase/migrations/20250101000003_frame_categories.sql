-- Frame categories and usage analytics

ALTER TABLE public.frames ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.frames ADD COLUMN IF NOT EXISTS usage_count bigint DEFAULT 0;