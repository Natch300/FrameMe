-- Daily upload limit: max 2 frames per user per day

CREATE OR REPLACE FUNCTION public.enforce_daily_frame_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.frames
      WHERE user_id = NEW.user_id
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day') >= 2 THEN
    RAISE EXCEPTION 'Daily upload limit reached. You can upload up to 2 frames per day.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_daily_frame_limit_trigger ON public.frames;

CREATE TRIGGER enforce_daily_frame_limit_trigger
  BEFORE INSERT ON public.frames
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_frame_limit();