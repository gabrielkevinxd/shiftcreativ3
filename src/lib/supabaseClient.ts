import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.devlopereu.com';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key_for_build';

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable — Supabase client will not work at runtime until it is set.');
}

// Cliente público padrão para uso no frontend (respeita as RLS Policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Cliente com privilégios de administrador (bypassa RLS) para uso EXCLUSIVO no servidor (API Routes)
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable on the server');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
