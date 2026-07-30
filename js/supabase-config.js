// ==========================================================================
// SUPABASE REALTIME & POSTGRESQL CLOUD CONFIGURATION
// Project URL: https://woqotssnklsarpvkalrw.supabase.co
// Publishable Key: sb_publishable_RIIwAnyfoXiAL_kFUVDGoQ_RUftl-1W
// Account: waterain8n@gmail.com
// ==========================================================================

const SUPABASE_URL = "https://woqotssnklsarpvkalrw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RIIwAnyfoXiAL_kFUVDGoQ_RUftl-1W";

let supabaseClient = null;
let isSupabaseLive = false;

try {
  if (typeof supabase !== 'undefined' && SUPABASE_URL.includes('.supabase.co')) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    isSupabaseLive = true;
    console.log("⚡ Supabase Live Cloud Services initialized for project:", SUPABASE_URL);
  } else {
    console.warn("ℹ️ Supabase SDK client initialized with persistent Local + Realtime fallback mode.");
  }
} catch (err) {
  console.warn("⚠️ Supabase initialization notice:", err.message);
}

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.supabaseClient = supabaseClient;
window.isSupabaseLive = isSupabaseLive;
