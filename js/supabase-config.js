// ==========================================================================
// SUPABASE REALTIME & POSTGRESQL CLOUD CONFIGURATION
// Active Account: waterain8n@gmail.com / letuananh18@gmail.com
// ==========================================================================

const SUPABASE_URL = window.SUPABASE_PROJECT_URL || "https://your-supabase-project.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_PUBLIC_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample";

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
