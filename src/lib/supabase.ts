import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: URL ou Chave Anon do Supabase não configuradas no ambiente VITE!');
  console.log('Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas.');
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.supabaseConfigError = true;
  }
}

// Ensure we don't pass undefined to createClient which would throw
const finalUrl = supabaseUrl || 'https://placeholder-url.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);
