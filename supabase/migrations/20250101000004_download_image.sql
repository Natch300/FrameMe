-- Store framed photo preview in download history

ALTER TABLE public.downloads 
  ADD COLUMN IF NOT EXISTS image_data text;
