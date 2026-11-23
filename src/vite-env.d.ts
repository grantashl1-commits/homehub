/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SIGNAL_SUPABASE_URL?: string;
  readonly VITE_SIGNAL_SUPABASE_KEY?: string;
  readonly VITE_SIGNAL_SITE_URL?: string;
  readonly VITE_POINTPALS_SUPABASE_URL?: string;
  readonly VITE_POINTPALS_SUPABASE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
