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
  API_URL: import.meta.env.VITE_SUPABASE_URL || 'Supabase',
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

  health: {
    check: async () => {
      try {
        // Aumentado para 60 segundos e com 3 tentativas
        const result = await withRetry(async () => {
          return await withTimeout(supabase.from('profiles').select('id').limit(1), 60000);
        }, 3) as any;
        
        if (result.error) return { ok: false, error: result.error.message };
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }
  },

  users: {
    getAll: async () => {
      console.log('DB: Buscando todos os usuários...');
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao buscar usuários');
        }
        const users = await response.json();
        console.log(`DB: ${users.length} usuários encontrados via API.`);
        return users;
      } catch (error) {
        console.error('DB: Erro ao buscar usuários via API, tentando fallback Supabase:', error);
        // Fallback to direct Supabase if API fails
        const result = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .order('nome')) as any;
        if (result.error) {
          console.error('DB Error (users.getAll - fallback):', result.error);
          throw result.error;
        }
        return result.data.map(mapProfileToUser);
      }
    },
    getById: async (id: string) => {
      console.log('DB: Buscando usuário por ID:', id);
      try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao buscar usuário');
        }
        const user = await response.json();
        console.log('DB: Usuário encontrado via API:', user.id);
        return user;
      } catch (error) {
        console.error('DB: Erro ao buscar usuário via API, tentando fallback Supabase:', error);
        // Fallback to direct Supabase if API fails
        const result = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()) as any;
        if (result.error) {
          console.error('DB Error (users.getById - fallback):', result.error);
          throw result.error;
        }
        return mapProfileToUser(result.data);
      }
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
          
          throw new Error('Perfil não encontrado para o ID fornecido');
        }
        
        return mapProfileToUser(result.data);
      } catch (e: any) {
        console.error('Error in getByAuthId:', e);
        throw e;
      }
    },
    create: async (user: any) => {
      console.log('DB: Criando novo usuário via API:', user.email);
      try {
        const response = await fetch('/api/admin/create-user', {
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
      const { data, error } = await withTimeout(supabase
        .from('profiles')
        .update(mapUserToProfile(updates))
        .eq('id', id)
        .select()
        .single()) as any;
      if (error) {
        console.error('DB Error (users.update):', error);
        throw error;
      }
      return mapProfileToUser(data);
    },
    resetPassword: async (userId: string, newPassword: string) => {
      console.log('DB: Resetando senha para usuário:', userId);
      try {
        const response = await fetch('/api/admin/reset-password', {
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
    }
  },

  commissions: {
    getAll: async (role?: string, userGroup?: string) => {
      console.log('DB: Buscando todas as tabelas de comissão...', role ? `para papel: ${role}` : '', userGroup ? `e grupo: ${userGroup}` : '');
      const { data, error } = await withTimeout(supabase
        .from('commission_tables')
        .select('*')
        .order('banco')) as any;
      if (error) {
        console.error('DB Error (commissions.getAll):', error);
        throw error;
      }
      return data.map(mapTableToCommission);
    },
    create: async (comm: any, userRole?: string, userId?: string) => {
      console.log('DB: Criando tabela de comissão:', comm);
      const { data, error } = await withTimeout(supabase
        .from('commission_tables')
        .insert([mapCommissionToTable(comm)])
        .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
        .single()) as any;
      if (error) {
        console.error('DB Error (commissions.create):', error);
        throw error;
      }
      return mapTableToCommission(data);
    },
    update: async (id: string, updates: any, userRole?: string, userId?: string) => {
      console.log('DB: Atualizando tabela de comissão:', id, updates);
      const { data, error } = await withTimeout(supabase
        .from('commission_tables')
        .update(mapCommissionToTable(updates))
        .eq('id', id)
        .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
        .single()) as any;
      if (error) {
        console.error('DB Error (commissions.update):', error);
        throw error;
      }
      return mapTableToCommission(data);
    },
    delete: async (id: string, userRole?: string, userId?: string) => {
      console.log('DB: Deletando tabela de comissão:', id);
      const { error } = await withTimeout(supabase
        .from('commission_tables')
        .delete()
        .eq('id', id)) as any;
      if (error) {
        console.error('DB Error (commissions.delete):', error);
        throw error;
      }
    },
    deleteMany: async (ids: string[], userRole?: string, userId?: string) => {
      console.log('DB: Deletando múltiplas tabelas de comissão:', ids.length);
      const { error } = await withTimeout(supabase
        .from('commission_tables')
        .delete()
        .in('id', ids)) as any;
      if (error) {
        console.error('DB Error (commissions.deleteMany):', error);
        throw error;
      }
    },
    deleteAll: async (userRole?: string, userId?: string) => {
      console.log('DB: Deletando TODAS as tabelas de comissão');
      const { error } = await withTimeout(supabase
        .from('commission_tables')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')) as any;
      if (error) {
        console.error('DB Error (commissions.deleteAll):', error);
        throw error;
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
      // Check for duplicate phone number
      let cleanPhone = String(lead.phone || '').replace(/[^\d]/g, '');
      
      // Normalize with 55 if missing
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone;
      }
      
      if (cleanPhone) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', cleanPhone)
          .maybeSingle();
        
        if (existing) {
          throw new Error('Já existe um lead cadastrado com este número de telefone.');
        }
      }

      const mapped = mapLeadToTable(lead);
      // Ensure the mapped object has the normalized phone
      mapped.telefone = cleanPhone;

      const { data, error } = await supabase
        .from('leads')
        .insert([mapped])
        .select()
        .single();
      if (error) throw error;
      return mapTableToLead(data);
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
      console.log('[DEBUG] sales.create: Usuário:', { id: user.id, name: user.name, role: user.role, group: user.grupo_comissao });
      console.log('[DEBUG] sales.create: Dados da venda recebidos:', sale);
      
      if (!user.id) {
        console.error('[DEBUG] sales.create: ID do usuário ausente');
        throw new Error('ID do usuário ausente. Por favor, faça login novamente.');
      }

      // 1. Create the sale
      const mappedSale = mapSaleToTable({ 
        ...sale, 
        vendedor_id: user.id,
        vendedor_nome: user.name,
        grupo_vendedor: user.grupo_comissao 
      });
      
      console.log('[DEBUG] sales.create: Dados mapeados para o banco:', mappedSale);
      
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([mappedSale])
        .select('*')
        .single();
      
      if (saleError) {
        console.error('[DEBUG] sales.create: Erro ao inserir venda no Supabase:', saleError);
        throw new Error(`Erro ao inserir venda: ${saleError.message || 'Erro desconhecido'}`);
      }
      
      if (!saleData) {
        console.error('[DEBUG] sales.create: Nenhuma dado retornado após inserção da venda');
        throw new Error('Nenhum dado retornado após inserção da venda');
      }
      
      console.log('[DEBUG] sales.create: Venda inserida com sucesso:', saleData.id);

      // 2. Create corresponding financial entry (Credit for the seller)
      const financialEntry = {
        vendedor_id: user.id,
        vendedor_nome: user.name,
        sale_id: saleData.id,
        tipo: 'Crédito',
        valor: sale.commission || 0,
        status: 'Pendente',
        descricao: `Comissão Venda: ${sale.client || 'Cliente'} - Proposta: ${sale.proposal || 'S/N'}`,
        data_vencimento: new Date().toISOString().split('T')[0]
      };

      console.log('[DEBUG] sales.create: Criando entrada financeira:', financialEntry);
      const { error: finError } = await supabase.from('financial_entries').insert([financialEntry]);
      if (finError) {
        console.error('[DEBUG] sales.create: Erro ao criar entrada financeira:', finError);
        // Não lançamos erro aqui para não invalidar a venda, mas logamos
      }
      
      // 3. Update user's accumulated balance (fetch latest first to avoid race conditions)
      console.log('[DEBUG] sales.create: Atualizando saldo do usuário...');
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('saldo_acumulado')
          .eq('id', user.id)
          .single();
        
        if (!profileError && profile) {
          const currentBalance = profile.saldo_acumulado || 0;
          const newCommission = sale.commission || 0;
          console.log(`[DEBUG] sales.create: Saldo atual: ${currentBalance}, Nova comissão: ${newCommission}, Novo saldo: ${currentBalance + newCommission}`);
          
          await db.users.update(user.id, { 
            saldo_acumulado: currentBalance + newCommission 
          });
          console.log('[DEBUG] sales.create: Saldo atualizado com sucesso');
        } else if (profileError) {
          console.error('[DEBUG] sales.create: Erro ao buscar perfil para atualizar saldo:', profileError);
        }
      } catch (updateError) {
        console.error('[DEBUG] sales.create: Erro crítico ao atualizar saldo:', updateError);
      }

      return mapTableToSale(saleData);
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
      const { data, error } = await withTimeout(supabase
        .from('banks')
        .insert([mapBankToTable(bank)])
        .select()
        .single()) as any;
      
      if (error) {
        console.error('DB Error (bancos.create):', error);
        throw error;
      }
      return mapTableToBank(data);
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando banco:', id, updates);
      const { data, error } = await withTimeout(supabase
        .from('banks')
        .update(mapBankToTable(updates))
        .eq('id', id)
        .select()
        .single()) as any;
      
      if (error) {
        console.error('DB Error (bancos.update):', error);
        throw error;
      }
      return mapTableToBank(data);
    },
    delete: async (id: string) => {
      console.log('DB: Deletando banco:', id);
      const { error } = await withTimeout(supabase
        .from('banks')
        .delete()
        .eq('id', id)) as any;
      if (error) {
        console.error('DB Error (bancos.delete):', error);
        throw error;
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
      const { data, error } = await withTimeout(supabase
        .from('commission_groups')
        .insert([{
          name: group.name,
          type: group.type,
          banco_id: group.banco_id,
          status: group.status || 'Ativo'
        }])
        .select()
        .single()) as any;
      
      if (error) {
        console.error('DB Error (commissionGroups.create):', error);
        throw error;
      }
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        banco_id: data.banco_id,
        status: data.status,
        createdAt: data.created_at
      };
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando grupo de comissão:', id, updates);
      const mapped: any = {};
      if (updates.name) mapped.name = updates.name;
      if (updates.type) mapped.type = updates.type;
      if (updates.banco_id) mapped.banco_id = updates.banco_id;
      if (updates.status) mapped.status = updates.status;

      const { data, error } = await withTimeout(supabase
        .from('commission_groups')
        .update(mapped)
        .eq('id', id)
        .select()
        .single()) as any;
      
      if (error) {
        console.error('DB Error (commissionGroups.update):', error);
        throw error;
      }
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        banco_id: data.banco_id,
        status: data.status,
        createdAt: data.created_at
      };
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
      const { data, error } = await withTimeout(supabase
        .from('platform_credentials')
        .select('*')
        .order('banco_nome')) as any;
      
      if (error) {
        console.error('DB: Erro ao buscar credenciais:', error);
        throw error;
      }
      
      return (data || []).map(mapTableToCredential);
    },
    getByUser: async (userId: string) => {
      console.log(`DB: Buscando credenciais para o usuário: ${userId}`);
      const { data, error } = await withTimeout(supabase
        .from('platform_credentials')
        .select('*')
        .eq('usuario_id', userId)
        .order('banco_nome')) as any;
      
      if (error) {
        console.error(`DB: Erro ao buscar credenciais para usuário ${userId}:`, error);
        throw error;
      }
      
      return (data || []).map(mapTableToCredential);
    },
    create: async (cred: any) => {
      console.log('DB: Criando nova credencial:', cred);
      const mappedData = mapCredentialToTable(cred);
      console.log('DB: Dados mapeados para inserção:', mappedData);

      const { data, error } = await withTimeout(supabase
        .from('platform_credentials')
        .insert([mappedData])
        .select()
        .single()) as any;
      
      if (error) {
        console.error('DB: Erro ao criar credencial:', error);
        throw error;
      }
      
      console.log('DB: Credencial criada com sucesso:', data);
      return mapTableToCredential(data);
    },
    update: async (id: string, updates: any) => {
      console.log(`DB: Atualizando credencial ${id}:`, updates);
      const mappedUpdates = mapCredentialToTable(updates);
      console.log('DB: Atualizações mapeadas:', mappedUpdates);

      const { data, error } = await withTimeout(supabase
        .from('platform_credentials')
        .update(mappedUpdates)
        .eq('id', id)
        .select()
        .single()) as any;
      
      if (error) {
        console.error(`DB: Erro ao atualizar credencial ${id}:`, error);
        throw error;
      }
      
      console.log('DB: Credencial atualizada com sucesso:', data);
      return mapTableToCredential(data);
    },
    delete: async (id: string) => {
      console.log(`DB: Deletando credencial ${id}`);
      const { error } = await withTimeout(supabase
        .from('platform_credentials')
        .delete()
        .eq('id', id)) as any;
      
      if (error) {
        console.error(`DB: Erro ao deletar credencial ${id}:`, error);
        throw error;
      }
      console.log(`DB: Credencial ${id} deletada com sucesso`);
    }
  },

  payment_requests: {
    getAll: async (user?: User) => {
      let query = supabase
        .from('financial_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (user && user.role !== 'admin') {
        if (user.role === 'supervisor') {
          // Supervisor sees entries for their group members
          const groupUsersResult = await withTimeout(supabase
            .from('profiles')
            .select('id')
            .eq('grupo_comissao', user.grupo_comissao)) as any;
          
          const userIds = groupUsersResult.data?.map((u: any) => u.id) || [];
          query = query.in('vendedor_id', userIds);
        } else {
          query = query.eq('vendedor_id', user.id);
        }
      }

      const result = await withTimeout(query) as any;
      if (result.error) throw result.error;
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
      const { data, error } = await supabase
        .from('financial_entries')
        .insert([{
          ...req,
          vendedor_id: req.usuario_id || req.vendedor_id,
          tipo: req.tipo || 'Débito',
          pix_key: req.chave_pix || req.pix_key
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { usuario_id, chave_pix, ...rest } = updates;
      const mappedUpdates: any = { ...rest };
      if (usuario_id) mappedUpdates.vendedor_id = usuario_id;
      if (chave_pix) mappedUpdates.pix_key = chave_pix;

      const { data, error } = await supabase
        .from('financial_entries')
        .update(mappedUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },
  // Aliases for compatibility
  get requests() { return this.payment_requests; },
  get financial_entries() { return this.payment_requests; },


  announcements: {
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false }); // Use created_at which is more standard
        if (error) {
          // Try without order if date/created_at fails
          const { data: data2, error: error2 } = await supabase
            .from('announcements')
            .select('*');
          if (error2) return [];
          return data2;
        }
        return data;
      } catch (e) {
        console.error('Error fetching announcements:', e);
        return [];
      }
    },
    create: async (ann: any) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert([ann])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  academy: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('academy_content')
        .select('*')
        .order('ordem', { ascending: true })
        .order('titulo');
      if (error) throw error;
      return (data || []).map(mapTableToAcademy);
    },
    create: async (content: any) => {
      console.log('DB: Criando conteúdo academy:', content);
      const { data, error } = await supabase
        .from('academy_content')
        .insert([mapAcademyToTable(content)])
        .select()
        .single();
      if (error) {
        console.error('DB Error (academy.create):', error);
        throw error;
      }
      return mapTableToAcademy(data);
    },
    update: async (id: string, updates: any) => {
      console.log('DB: Atualizando conteúdo academy:', id, updates);
      const { data, error } = await supabase
        .from('academy_content')
        .update(mapAcademyToTable(updates))
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('DB Error (academy.update):', error);
        throw error;
      }
      return mapTableToAcademy(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('academy_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    create: async (campaign: any) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaign])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  settings: {
    get: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'global_settings')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching settings:', error);
        return { canvaLink: 'https://www.canva.com/' };
      }
      
      return {
        canvaLink: 'https://www.canva.com/',
        aiSystemPrompt: "Você é um assistente útil e experiente da empresa AgoraQ, especializado em ajudar vendedores de crédito consignado. Você responde dúvidas sobre comissões, uso do CRM, captura de leads e roteiros operacionais. Seja conciso, profissional e motivador.",
        ...(data?.value || {})
      };
    },
    update: async (newSettings: any) => {
      console.log('DB: Atualizando configurações:', newSettings);
      const current = await db.settings.get();
      const updated = { ...current, ...newSettings };
      
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ 
          key: 'global_settings', 
          value: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
        .select()
        .single();
        
      if (error) {
        console.error('DB Error (settings.update):', error);
        throw error;
      }
      return data.value;
    }
  },

  logs: {
    add: async (log: any) => {
      const mappedLog = {
        file_name: log.fileName,
        user_name: log.user,
        lines_processed: log.linesProcessed,
        errors_found: log.errorsFound,
        errors: log.errors
      };
      const { error } = await supabase.from('import_logs').insert([mappedLog]);
      if (error) console.error('Log error:', error);
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
    name: p.nome,
    email: p.email,
    role: p.perfil,
    status: p.ativo ? 'Ativo' : 'Inativo',
    lastAccess: p.created_at,
    grupo_comissao: p.grupo_comissao,
    meta_diaria: p.meta_diaria,
    saldo_acumulado: p.saldo_acumulado || 0,
    // Legacy fields for compatibility
    daily_goal: p.meta_diaria,
    monthly_goal: p.monthly_goal,
    daily_lead_count: p.daily_lead_count,
    last_lead_date: p.last_lead_date,
    can_capture_leads: p.can_capture_leads ?? true
  };
}

function mapUserToProfile(u: any): any {
  const p: any = {};
  if (u.id) p.id = u.id;
  if (u.auth_user_id) p.id = u.auth_user_id; // Handle both cases
  if (u.name) p.nome = u.name;
  if (u.email) p.email = u.email;
  if (u.role) p.perfil = u.role;
  if (u.status) p.ativo = u.status === 'Ativo';
  if (u.grupo_comissao) p.grupo_comissao = u.grupo_comissao;
  if (u.meta_diaria !== undefined) p.meta_diaria = u.meta_diaria;
  if (u.saldo_acumulado !== undefined) p.saldo_acumulado = u.saldo_acumulado;
  // Legacy fields
  if (u.daily_goal !== undefined) p.meta_diaria = u.daily_goal;
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
    bank: req.bank || '',
    banco_nome: req.banco_nome || '',
    sellerName: req.sellerName || '',
    cpf: req.cpf || '',
    rg: req.rg || '',
    phone: req.phone || '',
    birthDate: req.birthDate || '',
    userEmail: req.userEmail || req.email || '',
    address: req.address || '',
    cep: req.cep || '',
    street: req.street || '',
    number: req.number || '',
    complement: req.complement || '',
    neighborhood: req.neighborhood || '',
    city: req.city || '',
    state: req.state || '',
    requestedAccessType: req.requestedAccessType || '',
    pixKey: req.pixKey || '',
    status: req.status || 'Pendente',
    observation: req.observation || '',
    created_at: new Date().toISOString()
  };
}

function mapCredentialToTable(c: any) {
  return {
    usuario_id: c.usuario_id,
    banco_nome: c.banco_nome || c.bank,
    login: c.login || c.username,
    senha: c.senha || c.password,
    link_acesso: c.link_acesso || c.link,
    status: c.status || 'Ativo',
    criado_por_admin: c.criado_por_admin,
    observation: c.observation
  };
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
    date: formatDateToISO(t.data || t.created_at),
    client: t.cliente || t.leads?.nome || 'Cliente',
    cpf: t.cpf || t.leads?.cpf,
    phone: t.phone,
    proposal: t.proposal,
    bank: t.banco,
    produto: t.produto,
    tabela: t.tabela,
    parcelas: t.parcelas,
    valor_venda: t.valor_venda,
    valor_comissao: t.valor_comissao,
    percentual_empresa: t.percentual_empresa,
    percentual_vendedor: t.percentual_vendedor,
    grupo_vendedor: t.grupo_vendedor,
    status: t.status,
    // Legacy mapping
    value: t.valor_venda,
    commission: t.valor_comissao,
    companyCommission: t.percentual_empresa,
    bankCommission: t.percentual_empresa,
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
  if (sellerId) t.vendedor = sellerId; // Match DB column name
  
  if (s.vendedor_nome || s.seller) {
    t.vendedor_nome = s.vendedor_nome || s.seller;
  }

  // Core fields
  if (s.banco !== undefined || s.bank !== undefined) t.banco = s.banco || s.bank;
  if (s.produto !== undefined || s.product !== undefined) t.produto = s.produto || s.product;
  if (s.tabela !== undefined || s.operacao !== undefined) t.tabela = s.tabela || s.operacao;
  if (s.cliente !== undefined || s.client !== undefined) t.cliente = s.cliente || s.client;
  if (s.cpf !== undefined) t.cpf = s.cpf;
  if (s.phone !== undefined) t.phone = s.phone;
  if (s.proposal !== undefined) t.proposal = s.proposal;
  if (s.data !== undefined || s.date !== undefined) t.data = s.data || s.date;
  
  // Numeric fields
  if (s.valor_venda !== undefined || s.value !== undefined) {
    t.valor_venda = parseNumber(s.valor_venda !== undefined ? s.valor_venda : s.value);
  }
  if (s.valor_comissao !== undefined || s.commission !== undefined) {
    t.valor_comissao = parseNumber(s.valor_comissao !== undefined ? s.valor_comissao : s.commission);
  }
  if (s.percentual_empresa !== undefined || s.companyCommission !== undefined || s.bankCommission !== undefined) {
    t.percentual_empresa = parseNumber(s.percentual_empresa !== undefined ? s.percentual_empresa : (s.companyCommission !== undefined ? s.companyCommission : (s.bankCommission !== undefined ? s.bankCommission : 0)));
  }
  if (s.percentual_vendedor !== undefined) {
    t.percentual_vendedor = parseNumber(s.percentual_vendedor);
  }
  
  // Optional fields
  if (s.parcelas !== undefined) t.parcelas = parseInt(s.parcelas) || 0;
  if (s.grupo_vendedor !== undefined) t.grupo_vendedor = s.grupo_vendedor;
  if (s.status !== undefined) t.status = s.status;
  if (s.lead_id !== undefined) t.lead_id = s.lead_id;
  if (s.metadata !== undefined) t.metadata = s.metadata;

  return t;
}

function mapTableToAcademy(t: any): AcademyContent {
  return {
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
}

function mapAcademyToTable(a: any): any {
  const t: any = {};
  if (a.titulo) t.titulo = a.titulo;
  if (a.categoria) t.categoria = a.categoria;
  if (a.descricao !== undefined) t.descricao = a.descricao;
  if (a.arquivo_url) t.arquivo_url = a.arquivo_url;
  if (a.tipo_arquivo) t.tipo_arquivo = a.tipo_arquivo;
  if (a.visibilidade) t.visibilidade = a.visibilidade;
  if (a.grupo_id !== undefined) t.grupo_id = a.grupo_id;
  if (a.versao) t.versao = a.versao;
  if (a.criado_por) t.criado_por = a.criado_por;
  if (a.status) t.status = a.status;
  if (a.links_relacionados !== undefined) t.links_relacionados = a.links_relacionados;
  if (a.ordem !== undefined) t.ordem = a.ordem;
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
  const t: any = {};
  if (f.sale_id) t.sale_id = f.sale_id;
  if (f.vendedor_id) t.vendedor_id = f.vendedor_id;
  if (f.vendedor_nome) t.vendedor_nome = f.vendedor_nome;
  if (f.tipo) t.tipo = f.tipo;
  if (f.valor !== undefined) t.valor = parseNumber(f.valor);
  if (f.descricao) t.descricao = f.descricao;
  if (f.pix_key) t.pix_key = f.pix_key;
  if (f.status) t.status = f.status;
  if (f.data_vencimento) t.data_vencimento = f.data_vencimento;
  return t;
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
