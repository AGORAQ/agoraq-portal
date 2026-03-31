import { supabase } from '@/lib/supabase';
import { User, CommissionTable, AccessRequest, PlatformCredential, Sale, Bank, PaymentRequest, Announcement, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Lead, FinancialEntry } from '@/types';

// Helper for timeouts
const withTimeout = <T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 120000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Tempo limite da operação excedido (Timeout)')), timeoutMs)
    )
  ]);
};

// Retry helper
const withRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// Helper functions for data normalization
const parseNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  // Basic cleanup
  let clean = String(val).trim().replace(/[R$\s%]/g, '');
  
  // Handle BR format: 1.234,56 -> 1234.56
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes('.')) {
    // Check if it's thousands separator: 1.234
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3 && parseFloat(clean.replace('.', '')) > 100) {
      clean = clean.replace('.', '');
    }
  }
  
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  
  // Percentage logic: 0.39 -> 39
  if (parsed > 0 && parsed < 1) return parsed * 100;
  
  return parsed;
};

const parseParcelas = (val: any): number => {
  if (!val) return 1;
  const str = String(val);
  // Handle ranges like "1 até 15" or "1-120"
  const matches = str.match(/(\d+)\s*(?:até|to|-)\s*(\d+)/i);
  if (matches && matches[2]) return parseInt(matches[2]) || 1;
  // Just numbers
  const num = parseInt(str.replace(/\D/g, ''));
  return isNaN(num) ? 1 : num;
};

// Database Service - Supabase Driven
export const db = {
  // Use Netlify Functions for admin actions
  API_URL: '/api',
  
  health: {
    check: async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) return { error: error.message };
        return { status: 'ok' };
      } catch (e: any) {
        return { error: e.message };
      }
    }
  },

  status: {
    check: async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        return !error;
      } catch (e) {
        return false;
      }
    }
  },
  
  users: {
    getAll: async (): Promise<User[]> => {
      console.log('db.users.getAll: Fetching from Supabase...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');
      
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        // Fallback to API if Supabase fails
        try {
          const response = await fetch(`${db.API_URL}/users`);
          if (!response.ok) return [];
          return response.json();
        } catch (e) {
          return [];
        }
      }
      
      return data.map(mapProfileToUser);
    },
    getById: async (id: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching user from Supabase:', error);
        // Fallback to API
        try {
          const response = await fetch(`${db.API_URL}/users/${id}`);
          if (!response.ok) return null;
          return response.json();
        } catch (e) {
          return null;
        }
      }
      
      return mapProfileToUser(data);
    },
    getByAuthId: async (authId: string) => {
      console.log('DB: Buscando perfil por Auth ID:', authId);
      try {
        // Aumentado timeout e adicionado retry para maior resiliência
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('profiles')
            .select('*')
            .eq('id', authId)
            .maybeSingle(), 90000); // 90 segundos
        }, 3) as any;
        
        if (result.error) {
          console.error('DB Error in getByAuthId:', result.error);
          throw result.error;
        }
        
        if (!result.data) {
          console.warn('DB: Perfil não encontrado para ID:', authId);
          // Tentar buscar por auth_user_id caso o schema seja diferente
          const fallbackResult = await withTimeout(supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', authId)
            .maybeSingle(), 30000) as any;
            
          if (fallbackResult.data) {
            console.log('DB: Perfil encontrado via fallback auth_user_id');
            return mapProfileToUser(fallbackResult.data);
          }
          
          return null; // Return null instead of throwing to avoid breaking the app
        }
        
        return mapProfileToUser(result.data);
      } catch (e: any) {
        console.error('Error in getByAuthId:', e);
        return null;
      }
    },
    create: async (user: any) => {
      console.log('DB: Criando novo usuário via API:', user.email);
      try {
        const response = await fetch(`${db.API_URL}/admin/create-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');
          console.log('DB: Usuário criado com sucesso via API:', data.user.id);
          return data.user;
        } else {
          const text = await response.text();
          console.error('API returned non-JSON response:', text.substring(0, 100));
          throw new Error('O servidor retornou uma resposta inválida (HTML). Verifique se o backend está rodando corretamente.');
        }
      } catch (e: any) {
        console.error('Create user error:', e);
        throw e;
      }
    },
    update: async (id: string, updates: Partial<User>) => {
      console.log('DB: Atualizando usuário:', id, updates);
      try {
        const mapped = mapUserToProfile(updates);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('profiles')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (users.update):', result.error);
          throw result.error;
        }
        
        return mapProfileToUser(result.data);
      } catch (e: any) {
        console.error('Fatal Error in users.update:', e);
        throw e;
      }
    },
    resetPassword: async (userId: string, newPassword: string) => {
      console.log('DB: Resetando senha para usuário:', userId);
      try {
        const response = await fetch(`${db.API_URL}/admin/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, newPassword })
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Erro ao resetar senha');
          console.log('DB: Senha resetada com sucesso via API');
          return data;
        } else {
          throw new Error('O servidor retornou uma resposta inválida (HTML).');
        }
      } catch (e: any) {
        console.error('Reset password error:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando usuário:', id);
      const { error } = await withTimeout(supabase
        .from('profiles')
        .delete()
        .eq('id', id)) as any;
      if (error) {
        console.error('DB Error (users.delete):', error);
        throw error;
      }
    },
    incrementLeads: async (id: string): Promise<boolean> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current count
      const { data: profile, error: getError } = await supabase
        .from('profiles')
        .select('daily_lead_count, last_lead_date')
        .eq('id', id)
        .single();
      
      if (getError) return false;
      
      let count = profile.daily_lead_count || 0;
      if (profile.last_lead_date !== today) {
        count = 0;
      }
      
      if (count >= 100) return false;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          daily_lead_count: count + 1,
          last_lead_date: today
        })
        .eq('id', id);
      
      return !updateError;
    }
  },

  commissions: {
    getAll: async (role?: string, userGroup?: string) => {
      console.log('DB: Buscando todas as tabelas de comissão...', role ? `para papel: ${role}` : '', userGroup ? `e grupo: ${userGroup}` : '');
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('commission_tables')
          .select('*')
          .order('banco'), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error('DB Error (commissions.getAll):', result.error);
        throw result.error;
      }
      
      return result.data.map(mapTableToCommission);
    },
    create: async (comm: any, userRole?: string, userId?: string) => {
      console.log('DB: Criando tabela de comissão:', comm);
      try {
        const mapped = mapCommissionToTable(comm);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_tables')
            .insert([mapped])
            .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissions.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Tabela de comissão criada com sucesso:', result.data.id);
        return mapTableToCommission(result.data);
      } catch (e: any) {
        console.error('Fatal Error in commissions.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any, userRole?: string, userId?: string) => {
      console.log('DB: Atualizando tabela de comissão:', id, updates);
      try {
        const mapped = mapCommissionToTable(updates);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_tables')
            .update(mapped)
            .eq('id', id)
            .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissions.update):', result.error);
          throw result.error;
        }
        
        console.log('DB: Tabela de comissão atualizada com sucesso:', id);
        return mapTableToCommission(result.data);
      } catch (e: any) {
        console.error('Fatal Error in commissions.update:', e);
        throw e;
      }
    },
    delete: async (id: string, userRole?: string, userId?: string) => {
      console.log('DB: Deletando tabela de comissão:', id);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_tables')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissions.delete):', result.error);
          throw result.error;
        }
        
        console.log('DB: Tabela de comissão deletada com sucesso:', id);
        return true;
      } catch (e: any) {
        console.error('Fatal Error in commissions.delete:', e);
        throw e;
      }
    },
    deleteMany: async (ids: string[], userRole?: string, userId?: string) => {
      console.log('DB: Deletando múltiplas tabelas de comissão:', ids.length);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_tables')
            .delete()
            .in('id', ids), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissions.deleteMany):', result.error);
          throw result.error;
        }
        
        console.log('DB: Múltiplas tabelas de comissão deletadas com sucesso');
        return true;
      } catch (e: any) {
        console.error('Fatal Error in commissions.deleteMany:', e);
        throw e;
      }
    },
    deleteAll: async (userRole?: string, userId?: string) => {
      console.log('DB: Deletando TODAS as tabelas de comissão');
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_tables')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'), 90000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissions.deleteAll):', result.error);
          throw result.error;
        }
        
        console.log('DB: TODAS as tabelas de comissão deletadas com sucesso');
        return true;
      } catch (e: any) {
        console.error('Fatal Error in commissions.deleteAll:', e);
        throw e;
      }
    },
    import: async (comms: any[], userRole?: string, userId?: string, onProgress?: (p: number) => void) => {
      console.log('DB: Iniciando importação de comissões:', comms.length, 'registros');
      const CHUNK_SIZE = 50; // Smaller chunks for better reliability
      const total = comms.length;
      let processed = 0;
      const results = [];
      const errors: string[] = [];

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = comms.slice(i, i + CHUNK_SIZE);
        console.log(`DB: Processando lote ${i / CHUNK_SIZE + 1} de ${Math.ceil(total / CHUNK_SIZE)}`);
        
        const normalizedChunk = chunk.map(c => {
          const mapped = mapCommissionToTable(c);
          
          // Official schema fields
          const cleanObj: any = {
            banco: String(mapped.banco || 'BANCO').substring(0, 100),
            produto: String(mapped.produto || 'PRODUTO').substring(0, 100),
            tabela: String(mapped.tabela || mapped.nome_tabela || 'TABELA').substring(0, 255),
            parcelas: parseParcelas(mapped.parcelas),
            comissao_total_empresa: parseNum(mapped.comissao_total_empresa),
            grupo_master: parseNum(mapped.grupo_master),
            grupo_ouro: parseNum(mapped.grupo_ouro),
            grupo_prata: parseNum(mapped.grupo_prata),
            grupo_plus: parseNum(mapped.grupo_plus),
            status: mapped.status || 'Ativo',
            origem_importacao: mapped.origem_importacao || 'Importação Manual'
          };

          if (mapped.vigencia) cleanObj.vigencia = mapped.vigencia;
          
          return cleanObj;
        });

        try {
          console.log(`DB: Enviando lote de comissões ${i / CHUNK_SIZE + 1} para o Supabase...`);
          const result = await withTimeout(supabase
            .from('commission_tables')
            .insert(normalizedChunk)
            .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')) as any;

          if (result.error) {
            console.error('DB: Erro no lote de comissões:', result.error);
            errors.push(`Lote ${i / CHUNK_SIZE + 1}: ${result.error.message}`);
            continue;
          } else if (result.data) {
            console.log(`DB: Lote ${i / CHUNK_SIZE + 1} processado com sucesso. ${result.data.length} registros salvos.`);
            results.push(...result.data);
          }
        } catch (chunkError: any) {
          console.error('DB: Erro fatal no lote:', chunkError);
          errors.push(`Erro fatal no lote ${i / CHUNK_SIZE + 1}: ${chunkError.message || 'Erro desconhecido'}`);
        }

        processed += chunk.length;
        if (onProgress) {
          onProgress(Math.round((processed / total) * 100));
        }
      }

      console.log('DB: Importação de comissões finalizada com sucesso. Total:', results.length);
      return {
        count: results.length,
        data: results.map(mapTableToCommission),
        errors
      };
    }
  },

  leads: {
    getAll: async (limit = 1000) => {
      try {
        console.log(`DB: Buscando todos os leads (limite ${limit})...`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit), 120000); // Aumentado para 120s
        }, 3) as any; // Aumentado para 3 retries

        if (result.error) {
          console.error('DB Error (leads.getAll):', result.error);
          return [];
        }

        const data = result.data || [];
        console.log(`DB: ${data.length} leads encontrados.`);
        return data.map(mapTableToLead);
      } catch (err) {
        console.error('DB Fatal Error (leads.getAll):', err);
        return [];
      }
    },
    getAvailable: async (limit = 1000) => {
      try {
        console.log(`DB: Buscando leads disponíveis (limite ${limit})...`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .eq('status', 'Disponível')
            .is('capturado_por', null)
            .order('created_at', { ascending: false })
            .limit(limit), 120000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.getAvailable):', result.error);
          return [];
        }

        const data = result.data || [];
        console.log(`DB: ${data.length} leads disponíveis encontrados.`);
        return data.map(mapTableToLead);
      } catch (err) {
        console.error('DB Fatal Error (leads.getAvailable):', err);
        return [];
      }
    },
    getTotalCount: async () => {
      try {
        console.log('DB: Buscando contagem total de leads...');
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*', { count: 'exact', head: true }), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.getTotalCount):', result.error);
          return 0;
        }
        return result.count || 0;
      } catch (err) {
        console.error('DB Fatal Error (leads.getTotalCount):', err);
        return 0;
      }
    },
    getAvailableCount: async () => {
      try {
        console.log('DB: Buscando contagem de leads disponíveis...');
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .is('capturado_por', null), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.getAvailableCount):', result.error);
          return 0;
        }
        return result.count || 0;
      } catch (err) {
        console.error('DB Fatal Error (leads.getAvailableCount):', err);
        return 0;
      }
    },
    getById: async (id: string) => {
      try {
        console.log(`DB: Buscando lead por ID: ${id}`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single(), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.getById):', result.error);
          return null;
        }

        return result.data ? mapTableToLead(result.data) : null;
      } catch (err) {
        console.error('DB Fatal Error (leads.getById):', err);
        return null;
      }
    },
    getByUser: async (userId: string) => {
      try {
        console.log(`DB: Buscando leads do usuário: ${userId}`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .eq('capturado_por', userId)
            .order('capturado_em', { ascending: false }), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.getByUser):', result.error);
          return [];
        }

        const data = result.data || [];
        console.log(`DB: ${data.length} leads encontrados para o usuário.`);
        return data.map(mapTableToLead);
      } catch (err) {
        console.error('DB Fatal Error (leads.getByUser):', err);
        return [];
      }
    },
    getAvailableForUser: async (userId: string, limit = 500) => {
      console.log(`[DEBUG] getAvailableForUser: Iniciando para usuário ${userId}, limite ${limit}`);
      
      try {
        // 0. Check if user can capture leads (Resilient check)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('can_capture_leads, daily_lead_count, last_lead_date') 
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.error('[DEBUG] getAvailableForUser: Erro ao buscar perfil:', profileError);
          // Se o erro for de coluna inexistente, tentamos buscar apenas o básico
          if (profileError.message.includes('column') || profileError.message.includes('does not exist')) {
            console.log('[DEBUG] getAvailableForUser: Tentando busca simplificada de perfil...');
            const { data: simpleProfile } = await supabase
              .from('profiles')
              .select('can_capture_leads')
              .eq('id', userId)
              .single();
            
            if (simpleProfile && simpleProfile.can_capture_leads === false) {
              console.warn(`[DEBUG] getAvailableForUser: Usuário ${userId} está BLOQUEADO para captura.`);
              return [];
            }
          }
        } else {
          console.log('[DEBUG] getAvailableForUser: Perfil do usuário:', profile);
          if (profile && profile.can_capture_leads === false) {
            console.warn(`[DEBUG] getAvailableForUser: Usuário ${userId} está BLOQUEADO para captura.`);
            return [];
          }
        }

        // 1. Get user's already captured leads to avoid duplicates
        console.log('[DEBUG] getAvailableForUser: Buscando leads já capturados pelo usuário para evitar duplicidade...');
        const { data: userLeads, error: userError } = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('cpf, telefone')
            .eq('capturado_por', userId)
            .limit(5000), 60000);
        }, 3) as any;
        
        if (userError) {
          console.error('[DEBUG] getAvailableForUser: Erro ao buscar leads do usuário:', userError);
        }

        const userCpfs = new Set((userLeads || []).map((l: any) => l.cpf).filter(Boolean));
        const userPhones = new Set((userLeads || []).map((l: any) => l.telefone).filter(Boolean));
        console.log(`[DEBUG] getAvailableForUser: Usuário já possui ${userLeads?.length || 0} leads. (CPFs únicos: ${userCpfs.size}, Telefones únicos: ${userPhones.size})`);

        // 2. Get available leads
        console.log('[DEBUG] getAvailableForUser: Buscando leads com status "Disponível" e capturado_por IS NULL...');
        const { data, error } = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .eq('status', 'Disponível')
            .is('capturado_por', null)
            .is('usuario_id', null)
            .order('created_at', { ascending: false })
            .limit(limit), 90000);
        }, 3) as any;
        
        if (error) {
          console.error('[DEBUG] getAvailableForUser: Erro ao buscar leads disponíveis:', error);
          throw error;
        }

        console.log(`[DEBUG] getAvailableForUser: Encontrados ${data?.length || 0} leads brutos disponíveis.`);

        // 3. Filter out leads that have same CPF or Phone as user's existing leads
        const filtered = (data || []).filter((l: any) => {
          const hasDuplicateCpf = l.cpf && userCpfs.has(l.cpf);
          const hasDuplicatePhone = l.telefone && userPhones.has(l.telefone);
          return !hasDuplicateCpf && !hasDuplicatePhone;
        });

        console.log(`[DEBUG] getAvailableForUser: Resultado final: ${filtered.length} leads após filtragem de duplicidade.`);

        return filtered.map(mapTableToLead);
      } catch (err) {
        console.error('[DEBUG] getAvailableForUser: Erro fatal:', err);
        throw err;
      }
    },
    capture: async (leadId: string, userId: string) => {
      const result = await withTimeout(supabase
        .from('leads')
        .update({
          capturado_por: userId,
          capturado_em: new Date().toISOString(),
          status: 'Capturado'
        })
        .eq('id', leadId)
        .is('capturado_por', null)
        .select()
        .single()) as any;
      if (result.error) throw result.error;
      return mapTableToLead(result.data);
    },
    bulkCapture: async (leadIds: string[], userId: string) => {
      console.log(`[DEBUG] bulkCapture: Iniciando captura de ${leadIds.length} leads para usuário ${userId}`);
      if (!leadIds || leadIds.length === 0) {
        console.warn('[DEBUG] bulkCapture: Nenhum ID de lead fornecido.');
        return { capturedCount: 0, leads: [] };
      }

      // 1. Capture the leads
      console.log('[DEBUG] bulkCapture: Executando UPDATE no Supabase...');
      const result = await withTimeout(supabase
        .from('leads')
        .update({
          capturado_por: userId,
          capturado_em: new Date().toISOString(),
          status: 'Capturado'
        })
        .in('id', leadIds)
        .is('capturado_por', null)
        .select()) as any;
      
      if (result.error) {
        console.error('[DEBUG] bulkCapture: Erro no UPDATE:', result.error);
        throw result.error;
      }
      
      const capturedCount = result.data?.length || 0;
      console.log(`[DEBUG] bulkCapture: ${capturedCount} leads capturados com sucesso.`);

      if (capturedCount === 0) {
        console.warn('[DEBUG] bulkCapture: Nenhum lead foi atualizado (pode ter sido capturado por outro usuário).');
        throw new Error('Nenhum lead disponível pôde ser capturado. Eles podem ter sido capturados por outro usuário.');
      }

      if (capturedCount > 0) {
        // 2. Update user's daily count
        const today = new Date().toISOString().split('T')[0];
        console.log(`[DEBUG] bulkCapture: Atualizando contagem diária para ${today}...`);
        
        // Get current count
        const profileResult = await withTimeout(supabase
          .from('profiles')
          .select('daily_lead_count, last_lead_date')
          .eq('id', userId)
          .single()) as any;
        
        const profile = profileResult.data;
        let newCount = capturedCount;
        if (profile && profile.last_lead_date === today) {
          newCount += (profile.daily_lead_count || 0);
        }

        console.log(`[DEBUG] bulkCapture: Nova contagem diária: ${newCount}`);

        const updateProfileResult = await withTimeout(supabase
          .from('profiles')
          .update({
            daily_lead_count: newCount,
            last_lead_date: today
          })
          .eq('id', userId)) as any;
        
        if (updateProfileResult.error) {
          console.error('[DEBUG] bulkCapture: Erro ao atualizar perfil:', updateProfileResult.error);
        } else {
          console.log('[DEBUG] bulkCapture: Perfil atualizado com sucesso.');
        }
      }

      return { capturedCount, leads: result.data.map(mapTableToLead) };
    },
    getCapturedToday: async (userId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const result = await withTimeout(supabase
        .from('leads')
        .select('id')
        .eq('capturado_por', userId)
        .eq('status', 'Capturado')
        .gte('capturado_em', today)) as any;
      if (result.error) throw result.error;
      return result.data?.length || 0;
    },
    create: async (lead: any) => {
      console.log('DB: Criando lead:', lead);
      try {
        // Check for duplicate phone number
        let cleanPhone = String(lead.phone || '').replace(/[^\d]/g, '');
        
        // Normalize with 55 if missing
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone;
        }
        
        if (cleanPhone) {
          const existingResult = await withTimeout(supabase
            .from('leads')
            .select('id')
            .eq('telefone', cleanPhone)
            .maybeSingle(), 30000) as any;
          
          if (existingResult.data) {
            throw new Error('Já existe um lead cadastrado com este número de telefone.');
          }
        }

        const mapped = mapLeadToTable(lead);
        mapped.telefone = cleanPhone;

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .insert([mapped])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Lead criado com sucesso:', result.data.id);
        return mapTableToLead(result.data);
      } catch (e: any) {
        console.error('Fatal Error in leads.create:', e);
        throw e;
      }
    },
    import: async (leads: any[], onProgress?: (progress: number) => void) => {
      console.log('[DEBUG] import: Iniciando importação de leads:', leads.length, 'registros');
      
      let skippedEmptyPhone = 0;
      let skippedInternalDuplicate = 0;
      const phoneMap = new Map();
      const uniqueLeads = [];
      
      for (const l of leads) {
        const mapped = mapLeadToTable(l);
        let phone = String(mapped.telefone || '').replace(/[^\d]/g, '');
        
        if (!phone) {
          skippedEmptyPhone++;
          continue;
        }

        // Normalizar com 55 se faltar (Brasil)
        if (phone.length === 10 || phone.length === 11) {
          phone = '55' + phone;
        }
        
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, true);
          uniqueLeads.push({
            nome: String(mapped.nome || 'Sem Nome').substring(0, 255),
            telefone: phone,
            email: String(mapped.email || '').substring(0, 255),
            cpf: String(mapped.cpf || '').replace(/\D/g, '').substring(0, 11),
            cidade: String(mapped.cidade || '').substring(0, 100),
            banco_origem: String(mapped.banco_origem || '').substring(0, 100),
            importado_por: String(mapped.importado_por || 'Admin').substring(0, 100),
            status: 'Disponível',
            capturado_por: null,
            usuario_id: null,
            metadata: {
              ...(mapped.metadata || {}),
              import_date: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          });
        } else {
          skippedInternalDuplicate++;
        }
      }

      console.log(`[DEBUG] import: Estatísticas Iniciais:
        - Total recebido: ${leads.length}
        - Pulados (Telefone vazio): ${skippedEmptyPhone}
        - Pulados (Duplicados na planilha): ${skippedInternalDuplicate}
        - Únicos para verificar no banco: ${uniqueLeads.length}`);

      if (uniqueLeads.length === 0) {
        console.warn('[DEBUG] import: Nenhum lead válido para importar.');
        return { 
          count: 0, 
          data: [], 
          errors: [`Nenhum lead válido encontrado. (Vazios: ${skippedEmptyPhone}, Duplicados: ${skippedInternalDuplicate})`],
          stats: {
            total: leads.length,
            skippedEmpty: skippedEmptyPhone,
            skippedDuplicate: skippedInternalDuplicate,
            skippedExisting: 0,
            inserted: 0
          }
        };
      }

      const SELECT_CHUNK_SIZE = 1000;
      const INSERT_CHUNK_SIZE = 50; // Reduzido para maior estabilidade
      const total = uniqueLeads.length;
      const results = [];
      const errors: string[] = [];

      // Verificar telefones existentes
      console.log('[DEBUG] import: Verificando telefones já existentes no banco...');
      const existingPhones = new Set<string>();
      for (let i = 0; i < total; i += SELECT_CHUNK_SIZE) {
        const chunk = uniqueLeads.slice(i, i + SELECT_CHUNK_SIZE);
        const chunkPhones = chunk.map(l => l.telefone);
        
        try {
          const result = await withRetry(async () => {
            return await withTimeout(supabase
              .from('leads')
              .select('telefone')
              .in('telefone', chunkPhones), 90000);
          }, 3) as any;
          
          if (result.data) {
            result.data.forEach((l: any) => existingPhones.add(l.telefone));
          }
        } catch (err) {
          console.error('[DEBUG] import: Erro ao verificar telefones existentes:', err);
        }
      }

      // Filtrar leads que já existem
      const finalLeadsToInsert = uniqueLeads.filter(l => !existingPhones.has(l.telefone));
      const skippedByDb = uniqueLeads.length - finalLeadsToInsert.length;
      const toInsertCount = finalLeadsToInsert.length;
      
      console.log(`[DEBUG] import: Estatísticas de Banco:
        - Já existem no banco: ${skippedByDb}
        - Novos para inserir: ${toInsertCount}`);

      if (toInsertCount === 0) {
        console.log('[DEBUG] import: Todos os leads já existem no banco.');
        return { 
          count: 0, 
          data: [], 
          errors: [`Todos os ${uniqueLeads.length} leads já existem no banco de dados.`],
          stats: {
            total: leads.length,
            skippedEmpty: skippedEmptyPhone,
            skippedDuplicate: skippedInternalDuplicate,
            skippedExisting: skippedByDb,
            inserted: 0
          }
        };
      }

      console.log(`[DEBUG] import: Iniciando inserção de ${toInsertCount} leads em lotes...`);

      // Inserir em lotes
      let processed = 0;
      for (let i = 0; i < toInsertCount; i += INSERT_CHUNK_SIZE) {
        const chunk = finalLeadsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
        console.log(`[DEBUG] import: Inserindo lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1} (${chunk.length} leads)...`);
        
        try {
          const result = await withRetry(async () => {
            let insertResult = await withTimeout(supabase
              .from('leads')
              .insert(chunk)
              .select(), 180000);
            
            if (insertResult.error) {
              console.warn(`[DEBUG] import: Erro no lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}, tentando fallback individual...`);
              // Fallback individual dentro do retry para ser mais resiliente
              const batchResults = [];
              for (const l of chunk) {
                try {
                  let singleResult = await supabase.from('leads').insert([l]).select();
                  
                  // Se erro de coluna 'cidade', tentar sem ela
                  if (singleResult.error && singleResult.error.message?.includes('cidade')) {
                    const { cidade, ...rest } = l;
                    singleResult = await supabase.from('leads').insert([rest]).select();
                  }

                  if (!singleResult.error && singleResult.data) {
                    batchResults.push(...singleResult.data);
                  } else if (singleResult.error) {
                    console.error(`[DEBUG] import: Erro individual (tel: ${l.telefone}):`, singleResult.error);
                  }
                } catch (e) {}
              }
              return { data: batchResults, error: null };
            }
            
            return insertResult;
          }, 2) as any;

          if (result.error) {
            console.error(`[DEBUG] import: Erro persistente no lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}:`, result.error);
            errors.push(`Lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}: ${result.error.message || JSON.stringify(result.error)}`);
          } else if (result.data) {
            console.log(`[DEBUG] import: Lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1} processado: ${result.data.length} registros salvos.`);
            results.push(...result.data);
          }
        } catch (chunkError: any) {
          console.error('[DEBUG] import: Erro fatal no lote:', chunkError);
          errors.push(`Erro fatal no lote ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}: ${chunkError.message || 'Erro desconhecido'}`);
        }

        processed += chunk.length;
        if (onProgress) {
          onProgress(Math.round((processed / toInsertCount) * 100));
        }
      }

      console.log('[DEBUG] import: Importação finalizada. Total inserido:', results.length);
      return {
        count: results.length,
        data: results.map(mapTableToLead),
        errors,
        stats: {
          total: leads.length,
          skippedEmpty: skippedEmptyPhone,
          skippedDuplicate: skippedInternalDuplicate,
          skippedExisting: skippedByDb,
          inserted: results.length
        }
      };
    },
    update: async (id: string, updates: any) => {
      try {
        console.log(`DB: Atualizando lead ${id}:`, updates);
        const mapped = mapLeadToTable(updates);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.update):', result.error);
          throw result.error;
        }

        return mapTableToLead(result.data);
      } catch (err) {
        console.error('DB Fatal Error (leads.update):', err);
        throw err;
      }
    },
    delete: async (id: string) => {
      try {
        console.log(`DB: Deletando lead: ${id}`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.delete):', result.error);
          throw result.error;
        }
        console.log('DB: Lead deletado com sucesso.');
      } catch (err) {
        console.error('DB Fatal Error (leads.delete):', err);
        throw err;
      }
    },
    deleteMany: async (ids: string[]) => {
      try {
        console.log(`DB: Deletando múltiplos leads: ${ids.length} registros`);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .delete()
            .in('id', ids), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.deleteMany):', result.error);
          throw result.error;
        }
        console.log('DB: Leads deletados com sucesso.');
      } catch (err) {
        console.error('DB Fatal Error (leads.deleteMany):', err);
        throw err;
      }
    },
    deleteAllAvailable: async () => {
      try {
        console.log('DB: Deletando todos os leads disponíveis...');
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .delete()
            .is('capturado_por', null), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (leads.deleteAllAvailable):', result.error);
          throw result.error;
        }
        console.log('DB: Todos os leads disponíveis foram deletados.');
      } catch (err) {
        console.error('DB Fatal Error (leads.deleteAllAvailable):', err);
        throw err;
      }
    }
  },

  sales: {
    getAll: async (user?: User) => {
      let query = supabase
        .from('sales')
        // Explicitly specify the relationship 'vendedor'
        .select('*, profiles!vendedor(nome, grupo_comissao)')
        .order('created_at', { ascending: false });
      
      if (user && user.role !== 'admin') {
        if (user.role === 'supervisor') {
          // Supervisor sees everyone in their group
          query = query.eq('grupo_vendedor', user.grupo_comissao);
        } else {
          // Seller sees only their own
          query = query.eq('vendedor', user.id);
        }
      }

      const result = await withRetry(async () => {
        return await withTimeout(query, 120000); // Aumentado para 120s
      }, 3) as any;
      
      if (result.error) throw result.error;
      return result.data.map(mapTableToSale);
    },
    subscribe: (user: User, callback: (sales: Sale[]) => void) => {
      let filter = '';
      if (user.role === 'vendedor') {
        filter = `vendedor=eq.${user.id}`;
      } else if (user.role === 'supervisor') {
        filter = `grupo_vendedor=eq.${user.grupo_comissao}`;
      }

      return supabase
        .channel('sales_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'sales',
            filter: filter || undefined
          }, 
          async () => {
            const data = await db.sales.getAll(user);
            callback(data);
          }
        )
        .subscribe();
    },
    create: async (sale: any, user: User) => {
      console.log('[DEBUG] sales.create: Iniciando criação de venda');
      console.log('[DEBUG] sales.create: Usuário Auth ID:', user.id);
      console.log('[DEBUG] sales.create: Usuário Nome:', user.name);
      console.log('[DEBUG] sales.create: Usuário Role:', user.role);
      console.log('[DEBUG] sales.create: Usuário Grupo:', user.grupo_comissao);
      console.log('[DEBUG] sales.create: Dados da venda recebidos:', sale);
      
      if (!user.id) {
        console.error('[DEBUG] sales.create: ID do usuário ausente (vendedor_id)');
        throw new Error('ID do usuário ausente. Por favor, faça login novamente.');
      }

      // Hard validation for vendedor_id
      const vendedorId = user.id;
      if (!vendedorId || vendedorId === 'null' || vendedorId === 'undefined') {
        console.error('[DEBUG] sales.create: vendedor_id inválido detectado:', vendedorId);
        throw new Error('Erro de identificação do vendedor. Por favor, recarregue a página.');
      }

      // 1. Create the sale
      const mappedSale = mapSaleToTable({ 
        ...sale, 
        vendedor_id: vendedorId,
        vendedor_nome: user.name,
        grupo_vendedor: user.grupo_comissao 
      });
      
      console.log('[DEBUG] sales.create: Payload final antes do insert:', mappedSale);
      
      // Double check if vendedor is present in mappedSale
      if (!mappedSale.vendedor && !mappedSale.vendedor_id) {
        console.error('[DEBUG] sales.create: Falha crítica no mapeamento - vendedor_id está nulo no payload final');
        throw new Error('Falha ao mapear identificação do vendedor.');
      }
      
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('sales')
            .insert([mappedSale])
            .select('*')
            .single(), 60000);
        }, 3) as any;
        
        if (result.error) {
          console.error('[DEBUG] sales.create: Erro ao inserir venda no Supabase:', result.error);
          console.error('[DEBUG] sales.create: Detalhes do erro:', {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint
          });
          throw new Error(`Erro ao inserir venda: ${result.error.message || 'Erro desconhecido'}`);
        }
        
        if (!result.data) {
          console.error('[DEBUG] sales.create: Nenhuma dado retornado após inserção da venda');
          throw new Error('Nenhum dado retornado após inserção da venda');
        }
        
        console.log('[DEBUG] sales.create: Venda inserida com sucesso:', result.data.id);
        const saleData = result.data;
        
        // 2. Create corresponding financial entry (Credit for the seller)
        const financialEntry = {
          vendedor_id: user.id,
          vendedor_nome: user.name,
          sale_id: saleData.id,
          tipo: 'Crédito' as const,
          valor: saleData.valor_comissao || 0,
          descricao: `Comissão da venda: ${saleData.cliente || 'Cliente'}`,
          status: 'Pendente' as const,
          data_vencimento: new Date().toISOString()
        };
        
        console.log('[DEBUG] sales.create: Criando entrada financeira:', financialEntry);
        await db.financial.create(financialEntry);
        
        // 3. Update user's accumulated balance (fetch latest first to avoid race conditions)
        console.log('[DEBUG] sales.create: Atualizando saldo do usuário...');
        try {
          const { data: profile, error: profileError } = await withRetry(async () => {
            return await withTimeout(supabase
              .from('profiles')
              .select('saldo_acumulado')
              .eq('id', user.id)
              .single(), 30000);
          }, 3) as any;

          if (profileError) {
            console.error('[DEBUG] sales.create: Erro ao buscar perfil para atualizar saldo:', profileError);
          } else {
            const currentBalance = profile?.saldo_acumulado || 0;
            const newBalance = currentBalance + (saleData.comissao_vendedor || 0);
            
            const { error: updateError } = await withRetry(async () => {
              return await withTimeout(supabase
                .from('profiles')
                .update({ saldo_acumulado: newBalance })
                .eq('id', user.id), 30000);
            }, 3) as any;

            if (updateError) {
              console.error('[DEBUG] sales.create: Erro ao atualizar saldo acumulado:', updateError);
            } else {
              console.log('[DEBUG] sales.create: Saldo acumulado atualizado com sucesso:', newBalance);
            }
          }
        } catch (balanceErr) {
          console.error('[DEBUG] sales.create: Exceção ao atualizar saldo:', balanceErr);
        }

        return mapTableToSale(saleData);
      } catch (e: any) {
        console.error('[DEBUG] sales.create: Exceção fatal:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando venda:', id, updates);
      const result = await withTimeout(supabase
        .from('sales')
        .update(mapSaleToTable(updates))
        .eq('id', id)
        .select('*')
        .single()) as any;
      if (result.error) {
        console.error('DB Error (sales.update):', result.error);
        throw result.error;
      }
      return mapTableToSale(result.data);
    },
    delete: async (id: string) => {
      console.log('DB: Deletando venda:', id);
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('DB Error (sales.delete):', error);
        throw error;
      }
    },
    import: async (sales: any[], user: User, onProgress?: (p: number) => void) => {
      console.log('DB: Iniciando importação de vendas:', sales.length, 'registros');
      const CHUNK_SIZE = 50;
      const total = sales.length;
      let processed = 0;
      const results = [];
      const errors: string[] = [];

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = sales.slice(i, i + CHUNK_SIZE);
        console.log(`DB: Processando lote de vendas ${i / CHUNK_SIZE + 1} de ${Math.ceil(total / CHUNK_SIZE)}`);
        
        const mappedChunk = chunk.map(s => mapSaleToTable({ ...s, vendedor_id: user.id }));

        try {
          const result = await withTimeout(supabase
            .from('sales')
            .insert(mappedChunk)
            .select('*')) as any;

          if (result.error) {
            console.error('DB: Erro no lote de vendas:', result.error);
            errors.push(`Lote ${i / CHUNK_SIZE + 1}: ${result.error.message}`);
            continue;
          }

          if (result.data) {
            results.push(...result.data);
            
            // Create financial entries for these sales
            const financialEntries = result.data.map((sale: any) => ({
              vendedor_id: user.id,
              vendedor_nome: user.name,
              sale_id: sale.id,
              tipo: 'Crédito',
              valor: sale.valor_comissao || 0,
              status: 'Pendente',
              descricao: `Importação Venda: ${sale.cliente || 'Cliente'} - Proposta: ${sale.proposal || 'S/N'}`,
              data_vencimento: new Date().toISOString().split('T')[0]
            }));

            const { error: finError } = await withTimeout(supabase.from('financial_entries').insert(financialEntries)) as any;
            if (finError) console.error('DB: Erro ao criar entradas financeiras para lote:', finError);

            // Update user's accumulated balance
            const batchCommission = financialEntries.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0);
            const currentProfile = await db.users.getById(user.id);
            if (currentProfile) {
              await db.users.update(user.id, { 
                saldo_acumulado: (currentProfile.saldo_acumulado || 0) + batchCommission 
              });
            }
          }
        } catch (err: any) {
          console.error('DB: Erro fatal no lote de vendas:', err);
          errors.push(`Erro fatal no lote ${i / CHUNK_SIZE + 1}: ${err.message}`);
        }

        processed += chunk.length;
        if (onProgress) onProgress(Math.round((processed / total) * 100));
      }

      return {
        count: results.length,
        data: results.map(mapTableToSale),
        errors
      };
    }
  },

  financial: {
    getAll: async (vendedorId?: string) => {
      console.log('DB: Buscando lançamentos financeiros...', vendedorId ? `para vendedor: ${vendedorId}` : 'todos');
      let query = supabase.from('financial_entries').select('*');
      if (vendedorId) query = query.eq('vendedor_id', vendedorId);
      const { data, error } = await withTimeout(query.order('created_at', { ascending: false })) as any;
      if (error) {
        console.error('DB Error (financial.getAll):', error);
        throw error;
      }
      return data.map(mapTableToFinancial);
    },
    create: async (entry: Partial<FinancialEntry>) => {
      console.log('DB: Criando lançamento financeiro:', entry);
      const { data, error } = await withTimeout(supabase
        .from('financial_entries')
        .insert([mapFinancialToTable(entry)])
        .select()
        .single()) as any;
      if (error) {
        console.error('DB Error (financial.create):', error);
        throw error;
      }
      return mapTableToFinancial(data);
    },
    updateStatus: async (id: string, status: string) => {
      console.log('DB: Atualizando status financeiro:', id, status);
      const { data, error } = await withTimeout(supabase
        .from('financial_entries')
        .update({ status })
        .eq('id', id)
        .select()
        .single()) as any;
      if (error) {
        console.error('DB Error (financial.updateStatus):', error);
        throw error;
      }
      return mapTableToFinancial(data);
    }
  },

  access_requests: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getByUser: async (userId: string) => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    create: async (req: any) => {
      console.log('[DEBUG] db.access_requests.create - Iniciando com dados:', req);
      try {
        const mappedData = mapAccessRequestToTable(req);
        console.log('[DEBUG] db.access_requests.create - Dados mapeados para Supabase:', mappedData);
        
        // Add a trace to see where this is being called from
        console.trace('[DEBUG] db.access_requests.create trace');

        const result = await withRetry(async () => {
          console.log('[DEBUG] db.access_requests.create - Executando insert no Supabase...');
          return await withTimeout(
            supabase
              .from('access_requests')
              .insert([mappedData])
              .select()
              .single(),
            30000 // 30 seconds timeout
          );
        }, 2) as any;
          
        if (result.error) {
          console.error('[DEBUG] db.access_requests.create - Erro retornado pelo Supabase:', result.error);
          throw result.error;
        }
        
        console.log('[DEBUG] db.access_requests.create - Sucesso:', result.data);
        return result.data;
      } catch (err: any) {
        console.error('[DEBUG] db.access_requests.create - Exceção fatal capturada:', err);
        // Log full error object for debugging
        if (err && typeof err === 'object') {
          console.error('[DEBUG] db.access_requests.create - Detalhes do erro:', JSON.stringify(err, null, 2));
        }
        throw err;
      }
    },
    updateStatus: async (id: string, status: string, observation?: string, adminId?: string) => {
      const { data, error } = await supabase
        .from('access_requests')
        .update({ status, observation, criado_por_admin: adminId })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  bancos: {
    getAll: async () => {
      console.log('DB: Buscando bancos...');
      const { data, error } = await withTimeout(supabase
        .from('banks')
        .select('*')
        .order('nome_banco')) as any;
      
      if (error) {
        console.error('DB Error (bancos.getAll):', error);
        throw error;
      }
      
      return data.map(mapTableToBank);
    },
    create: async (bank: any) => {
      console.log('DB: Criando banco:', bank);
      try {
        const mapped = mapBankToTable(bank);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('banks')
            .insert([mapped])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (bancos.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Banco criado com sucesso:', result.data.id);
        return mapTableToBank(result.data);
      } catch (e: any) {
        console.error('Fatal Error in banks.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando banco:', id, updates);
      try {
        const mapped: any = {};
        if (updates.nome_banco !== undefined || updates.nome !== undefined) 
          mapped.nome_banco = updates.nome_banco || updates.nome;
        if (updates.tipo_produto !== undefined || updates.tipo !== undefined) 
          mapped.tipo_produto = updates.tipo_produto || updates.tipo;
        if (updates.percentual_maximo !== undefined || updates.percentual !== undefined) 
          mapped.percentual_maximo = parseNumber(updates.percentual_maximo !== undefined ? updates.percentual_maximo : updates.percentual);
        if (updates.status !== undefined) mapped.status = updates.status;

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('banks')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (bancos.update):', result.error);
          throw result.error;
        }
        
        return mapTableToBank(result.data);
      } catch (e: any) {
        console.error('Fatal Error in banks.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando banco:', id);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('banks')
            .delete()
            .eq('id', id), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (bancos.delete):', result.error);
          throw result.error;
        }
      } catch (e: any) {
        console.error('Fatal Error in banks.delete:', e);
        throw e;
      }
    }
  },

  commissionGroups: {
    getAll: async () => {
      console.log('DB: Buscando grupos de comissão...');
      const { data, error } = await supabase
        .from('commission_groups')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('DB Error (commissionGroups.getAll):', error);
        // Fallback to defaults if table doesn't exist yet
        return [
          { id: '1', name: 'MASTER', type: 'FGTS', status: 'Ativo', createdAt: new Date().toISOString() },
          { id: '2', name: 'OURO', type: 'FGTS', status: 'Ativo', createdAt: new Date().toISOString() },
          { id: '3', name: 'PRATA', type: 'FGTS', status: 'Ativo', createdAt: new Date().toISOString() },
          { id: '4', name: 'PLUS', type: 'FGTS', status: 'Ativo', createdAt: new Date().toISOString() }
        ];
      }
      
      return data.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        banco_id: g.banco_id,
        status: g.status,
        createdAt: g.created_at
      }));
    },
    create: async (group: any) => {
      console.log('DB: Criando grupo de comissão:', group);
      const payload = mapCommissionGroupToTable(group);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_groups')
            .insert([payload])
            .select()
            .single(), 60000);
        }, 3) as any;
        
        if (result.error) {
          console.error('DB Error (commissionGroups.create):', result.error);
          throw result.error;
        }
        
        return {
          id: result.data.id,
          name: result.data.name,
          type: result.data.type,
          banco_id: result.data.banco_id,
          status: result.data.status,
          createdAt: result.data.created_at
        };
      } catch (e: any) {
        console.error('Fatal Error in commissionGroups.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando grupo de comissão:', id, updates);
      try {
        const mapped: any = {};
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.type !== undefined) mapped.type = updates.type;
        if (updates.banco_id !== undefined || updates.bankId !== undefined) 
          mapped.banco_id = updates.banco_id || updates.bankId;
        if (updates.status !== undefined) mapped.status = updates.status;

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('commission_groups')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (commissionGroups.update):', result.error);
          throw result.error;
        }
        
        return {
          id: result.data.id,
          name: result.data.name,
          type: result.data.type,
          banco_id: result.data.banco_id,
          status: result.data.status,
          createdAt: result.data.created_at
        };
      } catch (e: any) {
        console.error('Fatal Error in commissionGroups.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando grupo de comissão:', id);
      const { error } = await withTimeout(supabase
        .from('commission_groups')
        .delete()
        .eq('id', id)) as any;
      if (error) {
        console.error('DB Error (commissionGroups.delete):', error);
        throw error;
      }
    }
  },

  credentials: {
    getAll: async () => {
      console.log('DB: Buscando todas as credenciais');
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('platform_credentials')
          .select('*')
          .order('banco_nome'), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error('DB: Erro ao buscar credenciais:', result.error);
        throw result.error;
      }
      
      return (result.data || []).map(mapTableToCredential);
    },
    getByUser: async (userId: string) => {
      console.log(`DB: Buscando credenciais para o usuário: ${userId}`);
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('platform_credentials')
          .select('*')
          .eq('usuario_id', userId)
          .order('banco_nome'), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error(`DB: Erro ao buscar credenciais para usuário ${userId}:`, result.error);
        throw result.error;
      }
      
      return (result.data || []).map(mapTableToCredential);
    },
    create: async (cred: any) => {
      console.log('DB: Criando nova credencial:', cred);
      try {
        const mappedData = mapCredentialToTable(cred);
        console.log('DB: Dados mapeados para inserção:', mappedData);

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('platform_credentials')
            .insert([mappedData])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB: Erro ao criar credencial:', result.error);
          throw result.error;
        }
        
        console.log('DB: Credencial criada com sucesso:', result.data.id);
        return mapTableToCredential(result.data);
      } catch (e: any) {
        console.error('Fatal Error in credentials.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log(`DB: Atualizando credencial ${id}:`, updates);
      try {
        const mappedUpdates = mapCredentialToTable(updates);
        console.log('DB: Atualizações mapeadas:', mappedUpdates);

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('platform_credentials')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error(`DB: Erro ao atualizar credencial ${id}:`, result.error);
          throw result.error;
        }
        
        console.log('DB: Credencial atualizada com sucesso:', id);
        return mapTableToCredential(result.data);
      } catch (e: any) {
        console.error('Fatal Error in credentials.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log(`DB: Deletando credencial ${id}`);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('platform_credentials')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error(`DB: Erro ao deletar credencial ${id}:`, result.error);
          throw result.error;
        }
        
        console.log(`DB: Credencial ${id} deletada com sucesso`);
        return true;
      } catch (e: any) {
        console.error('Fatal Error in credentials.delete:', e);
        throw e;
      }
    }
  },

  payment_requests: {
    getAll: async (user?: User) => {
      console.log('DB: Buscando solicitações de pagamento...');
      let query = supabase
        .from('financial_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (user && user.role !== 'admin') {
        if (user.role === 'supervisor') {
          // Supervisor sees entries for their group members
          const groupUsersResult = await withRetry(async () => {
            return await withTimeout(supabase
              .from('profiles')
              .select('id')
              .eq('grupo_comissao', user.grupo_comissao), 30000);
          }, 3) as any;
          
          const userIds = groupUsersResult.data?.map((u: any) => u.id) || [];
          query = query.in('vendedor_id', userIds);
        } else {
          query = query.eq('vendedor_id', user.id);
        }
      }

      const result = await withRetry(async () => {
        return await withTimeout(query, 60000);
      }, 3) as any;

      if (result.error) {
        console.error('DB Error (payment_requests.getAll):', result.error);
        throw result.error;
      }
      
      return (result.data || []).map((d: any) => ({
        ...d,
        usuario_id: d.usuario_id || d.vendedor_id,
        data_solicitacao: d.data_solicitacao || d.created_at,
        chave_pix: d.chave_pix || d.pix_key
      }));
    },
    subscribe: (user: User, callback: (entries: any[]) => void) => {
      return supabase
        .channel('financial_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'financial_entries' }, 
          async () => {
            const data = await db.payment_requests.getAll(user);
            callback(data);
          }
        )
        .subscribe();
    },
    create: async (req: any) => {
      console.log('DB: Criando solicitação de pagamento:', req);
      try {
        const mappedReq = mapFinancialToTable({
          ...req,
          vendedor_id: req.usuario_id || req.vendedor_id,
          tipo: req.tipo || 'Débito',
          pix_key: req.chave_pix || req.pix_key
        });
        console.log('DB: Solicitação mapeada:', mappedReq);

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('financial_entries')
            .insert([mappedReq])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (payment_requests.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Solicitação de pagamento criada com sucesso:', result.data.id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in payment_requests.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando solicitação de pagamento:', id, updates);
      try {
        const { usuario_id, chave_pix, ...rest } = updates;
        const mappedUpdates: any = { ...rest };
        if (usuario_id) mappedUpdates.vendedor_id = usuario_id;
        if (chave_pix) mappedUpdates.pix_key = chave_pix;

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('financial_entries')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (payment_requests.update):', result.error);
          throw result.error;
        }
        
        console.log('DB: Solicitação de pagamento atualizada com sucesso:', id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in payment_requests.update:', e);
        throw e;
      }
    }
  },
  // Aliases for compatibility
  get requests() { return this.payment_requests; },
  get financial_entries() { return this.payment_requests; },


  announcements: {
    getAll: async () => {
      console.log('DB: Buscando anúncios...');
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false }), 30000);
        }, 3) as any;

        if (result.error) {
          console.warn('DB Warning (announcements.getAll - order failed):', result.error);
          // Try without order if created_at fails
          const result2 = await withRetry(async () => {
            return await withTimeout(supabase
              .from('announcements')
              .select('*'), 30000);
          }, 3) as any;
          
          if (result2.error) return [];
          return result2.data;
        }
        return result.data;
      } catch (e) {
        console.error('Error fetching announcements:', e);
        return [];
      }
    },
    create: async (ann: any) => {
      console.log('DB: Criando anúncio:', ann);
      const payload = mapAnnouncementToTable(ann);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('announcements')
            .insert([payload])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (announcements.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Anúncio criado com sucesso:', result.data.id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in announcements.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando anúncio:', id, updates);
      try {
        const mapped: any = {};
        if (updates.titulo !== undefined || updates.title !== undefined) 
          mapped.titulo = updates.titulo || updates.title;
        if (updates.conteudo !== undefined || updates.content !== undefined) 
          mapped.conteudo = updates.conteudo || updates.content;
        if (updates.categoria !== undefined || updates.category !== undefined) 
          mapped.categoria = updates.categoria || updates.category;
        if (updates.prioridade !== undefined || updates.priority !== undefined) 
          mapped.prioridade = updates.prioridade || updates.priority;
        if (updates.data_expiracao !== undefined || updates.expiryDate !== undefined) 
          mapped.data_expiracao = formatDateToISO(updates.data_expiracao || updates.expiryDate);
        if (updates.status !== undefined) mapped.status = updates.status;

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('announcements')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (announcements.update):', result.error);
          throw result.error;
        }
        
        console.log('DB: Anúncio atualizado com sucesso:', id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in announcements.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando anúncio:', id);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('announcements')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (announcements.delete):', result.error);
          throw result.error;
        }
        
        console.log('DB: Anúncio deletado com sucesso:', id);
        return true;
      } catch (e: any) {
        console.error('Fatal Error in announcements.delete:', e);
        throw e;
      }
    }
  },

  academy: {
    getAll: async () => {
      console.log('DB: Buscando conteúdos academy...');
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('academy_content')
          .select('*')
          .order('ordem', { ascending: true })
          .order('titulo'), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error('DB Error (academy.getAll):', result.error);
        throw result.error;
      }
      
      return (result.data || []).map(mapTableToAcademy);
    },
    create: async (content: any) => {
      console.log('DB: Criando conteúdo academy:', content);
      try {
        const mapped = mapAcademyToTable(content);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('academy_content')
            .insert([mapped])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (academy.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Conteúdo academy criado com sucesso:', result.data.id);
        return mapTableToAcademy(result.data);
      } catch (e: any) {
        console.error('Fatal Error in academy.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando conteúdo academy:', id, updates);
      try {
        const mapped = mapAcademyToTable(updates);
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('academy_content')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (academy.update):', result.error);
          throw result.error;
        }
        
        console.log('DB: Conteúdo academy atualizado com sucesso:', id);
        return mapTableToAcademy(result.data);
      } catch (e: any) {
        console.error('Fatal Error in academy.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando conteúdo academy:', id);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('academy_content')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (academy.delete):', result.error);
          throw result.error;
        }
        
        console.log('DB: Conteúdo academy deletado com sucesso:', id);
        return true;
      } catch (e: any) {
        console.error('Fatal Error in academy.delete:', e);
        throw e;
      }
    },
    trackView: async (conteudo_id: string, usuario_id: string) => {
      const { data, error } = await supabase
        .from('academy_views')
        .insert([{ conteudo_id, usuario_id, data_visualizacao: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  academyViews: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('academy_views')
        .select('*');
      if (error) throw error;
      return data;
    },
    register: async (conteudo_id: string, usuario_id: string) => {
      await db.academy.trackView(conteudo_id, usuario_id);
    },
    getUserViews: async (usuario_id: string) => {
      const { data, error } = await supabase
        .from('academy_views')
        .select('*')
        .eq('usuario_id', usuario_id);
      if (error) throw error;
      return data;
    }
  },

  campaigns: {
    getAll: async () => {
      console.log('DB: Buscando campanhas...');
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false }), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error('DB Error (campaigns.getAll):', result.error);
        throw result.error;
      }
      
      return result.data || [];
    },
    create: async (campaign: any) => {
      console.log('DB: Criando campanha:', campaign);
      const payload = mapCampaignToTable(campaign);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('campaigns')
            .insert([payload])
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (campaigns.create):', result.error);
          throw result.error;
        }
        
        console.log('DB: Campanha criada com sucesso:', result.data.id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in campaigns.create:', e);
        throw e;
      }
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando campanha:', id, updates);
      try {
        const mapped: any = {};
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.description !== undefined) mapped.description = updates.description;
        if (updates.type !== undefined) mapped.type = updates.type;
        if (updates.status !== undefined) mapped.status = updates.status;
        if (updates.start_date !== undefined || updates.startDate !== undefined) 
          mapped.start_date = formatDateToISO(updates.start_date || updates.startDate);
        if (updates.end_date !== undefined || updates.endDate !== undefined) 
          mapped.end_date = formatDateToISO(updates.end_date || updates.endDate);
        if (updates.budget !== undefined) mapped.budget = Number(updates.budget);

        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('campaigns')
            .update(mapped)
            .eq('id', id)
            .select()
            .single(), 60000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (campaigns.update):', result.error);
          throw result.error;
        }
        
        console.log('DB: Campanha atualizada com sucesso:', id);
        return result.data;
      } catch (e: any) {
        console.error('Fatal Error in campaigns.update:', e);
        throw e;
      }
    },
    delete: async (id: string) => {
      console.log('DB: Deletando campanha:', id);
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('campaigns')
            .delete()
            .eq('id', id), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('DB Error (campaigns.delete):', result.error);
          throw result.error;
        }
        
        console.log('DB: Campanha deletada com sucesso:', id);
        return true;
      } catch (e: any) {
        console.error('Fatal Error in campaigns.delete:', e);
        throw e;
      }
    }
  },

  settings: {
    get: async () => {
      console.log('DB: Buscando configurações globais...');
      const result = await withRetry(async () => {
        return await withTimeout(supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'global_settings')
          .maybeSingle(), 30000);
      }, 3) as any;
      
      if (result.error) {
        console.error('Error fetching settings:', result.error);
        return { canvaLink: 'https://www.canva.com/' };
      }
      
      return {
        canvaLink: 'https://www.canva.com/',
        aiSystemPrompt: "Você é um assistente útil e experiente da empresa AgoraQ, especializado em ajudar vendedores de crédito consignado. Você responde dúvidas sobre comissões, uso do CRM, captura de leads e roteiros operacionais. Seja conciso, profissional e motivador.",
        ...(result.data?.value || {})
      };
    },
    update: async (newSettings: any) => {
      console.log('DB: Atualizando configurações:', newSettings);
      try {
        const current = await db.settings.get();
        const updated = { ...current, ...newSettings };
        
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('app_settings')
            .upsert({ 
              key: 'global_settings', 
              value: updated,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
            .select()
            .single(), 60000);
        }, 3) as any;
          
        if (result.error) {
          console.error('DB Error (settings.update):', result.error);
          throw result.error;
        }
        return result.data.value;
      } catch (e: any) {
        console.error('Fatal Error in settings.update:', e);
        throw e;
      }
    }
  },

  logs: {
    add: async (log: any) => {
      console.log('DB: Adicionando log de importação:', log.fileName);
      try {
        const mappedLog = {
          file_name: log.fileName,
          user_name: log.user,
          lines_processed: log.linesProcessed,
          errors_found: log.errorsFound,
          errors: log.errors
        };
        const result = await withRetry(async () => {
          return await withTimeout(supabase.from('import_logs').insert([mappedLog]), 30000);
        }, 3) as any;

        if (result.error) {
          console.error('Log error:', result.error);
        }
      } catch (e: any) {
        console.error('Fatal Error in logs.add:', e);
      }
    }
  },

  utils: {
    generatePassword: (length: number = 10) => {
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let retVal = "";
      for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
      }
      return retVal;
    }
  },
  mapProfileToUser
};

// Mappers
export function mapProfileToUser(p: any): User {
  return {
    id: p.id,
    name: p.nome || p.name || 'Usuário',
    email: p.email || '',
    role: p.perfil || p.role || 'vendedor',
    status: p.ativo === false ? 'Inativo' : 'Ativo',
    lastAccess: p.created_at || p.last_access || new Date().toISOString(),
    grupo_comissao: p.grupo_comissao || 'OURO',
    pix_key: p.pix_key || '',
    saldo_acumulado: p.saldo_acumulado || 0,
    saldo_pago: p.saldo_pago || 0,
    meta_diaria: p.daily_goal || p.meta_diaria || 0,
    daily_goal: p.daily_goal || p.meta_diaria || 0,
    daily_lead_count: p.daily_lead_count || 0,
    last_lead_date: p.last_lead_date,
    can_capture_leads: p.can_capture_leads ?? true
  };
}

function mapUserToProfile(u: any): any {
  const p: any = {};
  if (u.id) p.id = u.id;
  if (u.name) p.nome = u.name;
  if (u.email) p.email = u.email;
  if (u.role) p.perfil = u.role;
  if (u.status) p.ativo = u.status === 'Ativo';
  if (u.grupo_comissao) p.grupo_comissao = u.grupo_comissao;
  if (u.pix_key !== undefined) p.pix_key = u.pix_key;
  if (u.saldo_acumulado !== undefined) p.saldo_acumulado = u.saldo_acumulado;
  if (u.saldo_pago !== undefined) p.saldo_pago = u.saldo_pago;
  if (u.meta_diaria !== undefined) p.daily_goal = u.meta_diaria;
  if (u.daily_goal !== undefined) p.daily_goal = u.daily_goal;
  if (u.daily_lead_count !== undefined) p.daily_lead_count = u.daily_lead_count;
  if (u.last_lead_date !== undefined) p.last_lead_date = u.last_lead_date;
  if (u.can_capture_leads !== undefined) p.can_capture_leads = u.can_capture_leads;
  return p;
}

function mapTableToLead(t: any): Lead {
  return {
    id: t.id,
    name: t.nome,
    phone: t.telefone,
    email: t.email,
    cpf: t.cpf,
    city: t.cidade,
    banco_origem: t.banco_origem,
    status: t.status,
    usuario_id: t.capturado_por,
    importado_por: t.importado_por,
    capturedAt: t.capturado_em,
    createdAt: t.created_at,
    metadata: t.metadata || {}
  };
}

function mapLeadToTable(l: any): any {
  return {
    nome: l.name || l.nome,
    telefone: l.phone || l.telefone,
    email: l.email,
    cpf: l.cpf,
    cidade: l.city || l.cidade,
    banco_origem: l.banco_origem,
    status: l.status || 'Disponível',
    capturado_por: l.usuario_id || l.capturado_por,
    capturado_em: l.capturedAt || l.capturado_em,
    importado_por: l.importado_por,
    metadata: l.metadata || {}
  };
}

function mapTableToCommission(t: any): CommissionTable {
  return {
    id: t.id,
    banco: t.banco,
    produto: t.produto,
    operacao: t.tabela,
    parcelas: t.parcelas,
    codigo_tabela: t.tabela,
    nome_tabela: t.tabela,
    faixa_valor_min: 0,
    faixa_valor_max: 9999999,
    percentual_total_empresa: t.comissao_total_empresa,
    comissao_master: t.grupo_master,
    comissao_ouro: t.grupo_ouro,
    comissao_prata: t.grupo_prata,
    comissao_plus: t.grupo_plus,
    vigencia: t.vigencia,
    status: t.status,
    criado_por: '',
    data_criacao: t.created_at,
    data_atualizacao: t.updated_at
  };
}

function mapCommissionToTable(c: any): any {
  return {
    banco: c.banco,
    produto: c.produto,
    tabela: c.tabela || c.nome_tabela || c.operacao,
    parcelas: c.parcelas,
    comissao_total_empresa: c.comissao_total_empresa || c.percentual_total_empresa,
    grupo_master: c.grupo_master || c.comissao_master,
    grupo_ouro: c.grupo_ouro || c.comissao_ouro,
    grupo_prata: c.grupo_prata || c.comissao_prata,
    grupo_plus: c.grupo_plus || c.comissao_plus || c.grupo,
    vigencia: c.vigencia,
    status: c.status || 'Ativo',
    origem_importacao: c.origem_importacao
  };
}

function formatDateToISO(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  // If DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try native parse
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return dateStr;
}

function mapAccessRequestToTable(req: any): any {
  return {
    usuario_id: req.usuario_id || '00000000-0000-0000-0000-000000000000',
    name: req.name || '',
    email: req.email || '',
    phone: req.phone || '',
    cpf: req.cpf || '',
    rg: req.rg || '',
    birth_date: formatDateToISO(req.birthDate || req.birth_date),
    address: req.address || '',
    cep: req.cep || '',
    street: req.street || '',
    number: req.number || '',
    complement: req.complement || '',
    neighborhood: req.neighborhood || '',
    city: req.city || '',
    state: req.state || '',
    requested_access_type: req.requestedAccessType || req.requested_access_type || '',
    seller_name: req.sellerName || req.seller_name || '',
    observation: req.observation || '',
    status: req.status || 'Pendente',
    created_at: new Date().toISOString()
  };
}

function mapAnnouncementToTable(ann: any): any {
  return {
    title: ann.title || '',
    message: ann.message || '',
    type: ann.type || 'Aviso',
    link: ann.link || '',
    date: ann.date || new Date().toISOString().split('T')[0],
    active: ann.active !== false
  };
}

function mapAcademyToTable(a: any): any {
  return {
    titulo: a.titulo || a.title || '',
    categoria: a.categoria || a.category || 'Geral',
    descricao: a.descricao || a.description || '',
    arquivo_url: a.arquivo_url || a.video_url || a.videoUrl || '',
    tipo_arquivo: a.tipo_arquivo || a.type || 'Vídeo',
    visibilidade: a.visibilidade || 'todos',
    grupo_id: a.grupo_id || null,
    versao: a.versao || '1.0',
    criado_por: a.criado_por || a.usuario_id || null,
    status: a.status || (a.active !== false ? 'Ativo' : 'Inativo'),
    links_relacionados: a.links_relacionados || '',
    ordem: a.ordem || 0
  };
}

function mapTableToAcademy(t: any): AcademyContent {
  const content: AcademyContent = {
    id: t.id,
    titulo: t.titulo,
    categoria: t.categoria,
    descricao: t.descricao,
    arquivo_url: t.arquivo_url,
    tipo_arquivo: t.tipo_arquivo,
    visibilidade: t.visibilidade,
    grupo_id: t.grupo_id,
    versao: t.versao,
    criado_por: t.criado_por,
    criado_em: t.created_at,
    atualizado_em: t.updated_at,
    status: t.status,
    links_relacionados: t.links_relacionados,
    ordem: t.ordem || 0
  };
  
  // Add legacy fields for UI compatibility (using any to bypass type check)
  const legacyContent = content as any;
  legacyContent.title = t.titulo;
  legacyContent.description = t.descricao;
  legacyContent.type = t.tipo_arquivo;
  legacyContent.category = t.categoria;
  legacyContent.video_url = t.arquivo_url;
  legacyContent.active = t.status === 'Ativo';
  
  return content;
}

function mapCampaignToTable(c: any): any {
  return {
    name: c.name || '',
    description: c.description || '',
    type: c.type || 'Geral',
    status: c.status || 'Ativo',
    start_date: formatDateToISO(c.start_date || c.startDate),
    end_date: formatDateToISO(c.end_date || c.endDate),
    budget: Number(c.budget) || 0,
    criado_por: c.criado_por || c.usuario_id || null
  };
}

function mapCommissionGroupToTable(g: any): any {
  return {
    banco_id: g.banco_id || g.bankId,
    name: g.name || '',
    type: g.type || 'FGTS',
    status: g.status || 'Ativo'
  };
}

function mapCredentialToTable(c: any) {
  const t: any = {
    usuario_id: c.usuario_id,
    banco_nome: c.banco_nome || c.bank,
    login: c.login || c.username,
    senha: c.senha || c.password,
    link_acesso: c.link_acesso || c.link,
    status: c.status || 'Ativo',
    criado_por_admin: c.criado_por_admin
  };
  return t;
}

function mapTableToCredential(t: any): PlatformCredential {
  return {
    id: t.id,
    usuario_id: t.usuario_id,
    banco_nome: t.banco_nome,
    login: t.login,
    senha: t.senha,
    link_acesso: t.link_acesso,
    status: t.status,
    criado_por_admin: t.criado_por_admin,
    data_criacao: t.data_criacao || t.created_at,
    data_atualizacao: t.data_atualizacao || t.updated_at,
    observation: t.observation,
    // Legacy fields for UI compatibility
    bank: t.banco_nome,
    link: t.link_acesso,
    username: t.login,
    password: t.senha,
    updatedAt: t.data_atualizacao || t.updated_at
  };
}

function mapTableToSale(t: any): Sale {
  return {
    id: t.id,
    vendedor_id: t.vendedor || t.vendedor_id,
    vendedor_nome: t.vendedor_nome || t.profiles?.nome || 'Desconhecido',
    lead_id: t.lead_id,
    date: formatDateToISO(t.data_venda || t.data || t.created_at),
    client: t.cliente_nome || t.cliente || t.leads?.nome || 'Cliente',
    cpf: t.cliente_cpf || t.cpf || t.leads?.cpf,
    phone: t.cliente_telefone || t.phone,
    proposal: t.proposta || t.proposal,
    bank: t.banco_nome || t.banco,
    produto: t.produto,
    operacao: t.operacao,
    tabela: t.tabela_nome || t.tabela,
    parcelas: t.parcelas,
    valor_venda: t.valor_venda,
    valor_comissao: t.comissao_vendedor || t.valor_comissao,
    percentual_empresa: t.comissao_empresa || t.percentual_empresa,
    percentual_vendedor: t.percentual_vendedor,
    grupo_vendedor: t.grupo_vendedor,
    status: t.status,
    // Legacy mapping
    value: t.valor_venda,
    commission: t.comissao_vendedor || t.valor_comissao,
    companyCommission: t.comissao_empresa || t.percentual_empresa,
    bankCommission: t.comissao_banco || t.percentual_empresa,
    seller: t.vendedor_nome || t.profiles?.nome || 'Desconhecido'
  };
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'string') {
    let clean = val.replace(/[R$\s]/g, '');
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function mapSaleToTable(s: any): any {
  const t: any = {};
  
  // Vendedor mapping
  const sellerId = s.vendedor_id || s.vendedor || s.usuario_id;
  if (sellerId) {
    t.vendedor = sellerId;
  }
  
  if (s.vendedor_nome || s.seller) {
    t.vendedor_nome = s.vendedor_nome || s.seller;
  }

  // Core fields
  t.banco_nome = s.bank || s.banco_nome || s.banco;
  t.produto = s.produto || s.product;
  t.operacao = s.operacao || s.tabela;
  t.tabela_nome = s.table_name || s.tabela_nome || s.tabela;
  t.cliente_nome = s.client || s.cliente_nome || s.cliente;
  t.cliente_cpf = s.cpf || s.cliente_cpf;
  t.cliente_telefone = s.phone || s.cliente_telefone;
  t.proposta = s.proposal || s.proposta;
  t.data_venda = formatDateToISO(s.date || s.data_venda || s.data);
  
  // Numeric fields
  t.valor_venda = parseNumber(s.valor_venda !== undefined ? s.valor_venda : s.value);
  t.comissao_vendedor = parseNumber(s.commission !== undefined ? s.commission : (s.valor_comissao !== undefined ? s.valor_comissao : 0));
  t.comissao_empresa = parseNumber(s.companyCommission !== undefined ? s.companyCommission : (s.percentual_empresa !== undefined ? s.percentual_empresa : 0));
  t.comissao_banco = parseNumber(s.bankCommission !== undefined ? s.bankCommission : 0);
  
  // Optional fields
  t.parcelas = parseInt(s.parcelas) || 0;
  t.status = s.status || 'Pendente';
  t.lead_id = s.lead_id;
  t.metadata = s.metadata || {};

  return t;
}



function mapTableToFinancial(t: any): FinancialEntry {
  return {
    id: t.id,
    sale_id: t.sale_id,
    vendedor_id: t.vendedor_id,
    vendedor_nome: t.vendedor_nome,
    tipo: t.tipo,
    valor: t.valor,
    descricao: t.descricao,
    pix_key: t.pix_key,
    status: t.status,
    data_vencimento: t.data_vencimento,
    created_at: t.created_at,
    updated_at: t.updated_at
  };
}

function mapFinancialToTable(f: any): any {
  return {
    vendedor_id: f.vendedor_id || f.usuario_id || null,
    vendedor_nome: f.vendedor_nome || f.userName || '',
    sale_id: f.sale_id || f.venda_id || null,
    tipo: f.tipo || 'Crédito',
    valor: parseNumber(f.valor || f.amount || 0),
    descricao: f.descricao || f.description || '',
    pix_key: f.pix_key || f.chave_pix || '',
    status: f.status || 'Pendente',
    data_vencimento: formatDateToISO(f.data_vencimento || f.dueDate)
  };
}

function mapTableToBank(t: any): Bank {
  return {
    id: t.id,
    nome_banco: t.nome_banco,
    tipo_produto: t.tipo_produto,
    percentual_maximo: t.percentual_maximo,
    status: t.status,
    criado_em: t.created_at
  };
}

function mapBankToTable(b: any): any {
  const t: any = {};
  if (b.nome_banco || b.nome) t.nome_banco = b.nome_banco || b.nome;
  if (b.tipo_produto || b.tipo) t.tipo_produto = b.tipo_produto || b.tipo;
  if (b.percentual_maximo !== undefined || b.percentual !== undefined) {
    t.percentual_maximo = parseNumber(b.percentual_maximo !== undefined ? b.percentual_maximo : b.percentual);
  }
  if (b.status) t.status = b.status;
  return t;
}
