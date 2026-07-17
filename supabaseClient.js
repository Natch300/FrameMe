(function () {
  if (typeof window.supabase === 'undefined') return;

  window.FrameMe = window.FrameMe || {};
  window.FrameMe.supabase = window.supabase.createClient(
    'https://sjncbiftyecyzreyadax.supabase.co',
    'sb_publishable_nxyves5eJ0RfxqxXnnLT5A_sXUOX8Ux'
  );
})();
