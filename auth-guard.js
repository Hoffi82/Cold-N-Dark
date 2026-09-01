// Cold N' Dark – gemeinsamer Clasher-Zugriffsschutz
(function(){
  const SUPABASE_URL='https://jvgqvtnqncelbhuordzy.supabase.co';
  const SUPABASE_KEY='sb_publishable_4PusmhJVMm0b3Bm-2Y-FPQ__tnZZzZO';
  const LOGIN='clasher-login.html';
  window.COLD_N_DARK_AUTH_READY=(async function(){
    if(!window.supabase){ location.replace(LOGIN); return null; }
    const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await db.auth.getSession();
    if(error||!data.session){ location.replace(LOGIN); return null; }
    window.COLD_N_DARK_SUPABASE=db;
    window.COLD_N_DARK_SESSION=data.session;
    return data.session;
  })();
})();
