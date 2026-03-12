import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    import.meta.env.VITE_SUPABASE_UR || 
                    import.meta.env.VITE_SUPABASE_U;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        import.meta.env.VITE_SUPABASE_ANON || 
                        import.meta.env.VITE_SUPABASE_ANO ||
                        import.meta.env.VITE_SUPABASE_AN;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: URL ou Chave Anon do Supabase não configuradas!');
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.supabaseConfigError = true;
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
