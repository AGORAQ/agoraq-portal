import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: URL ou Chave Anon do Supabase não configuradas no ambiente VITE!');
  console.log('VITE_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Configurada (oculta)' : 'Não configurada');
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.supabaseConfigError = true;
  }
} else {
  console.log('Supabase configurado com URL:', supabaseUrl);
}

// Ensure we don't pass undefined to createClient which would throw
const finalUrl = supabaseUrl || 'https://placeholder-url.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');
export const supabase = createClient(finalUrl, finalKey);
