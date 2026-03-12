import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: URL ou Chave Anon do Supabase não configuradas!');
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.supabaseConfigError = true;
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
