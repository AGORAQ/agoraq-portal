import { supabase } from '@/lib/supabase';
import { User, CommissionTable, AccessRequest, PlatformCredential, Sale, Bank, PaymentRequest, Announcement, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Lead, FinancialEntry } from '@/types';

// Helper for timeouts
const withTimeout = <T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 90000): Promise<T> => {
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
        // Aumentado para 45 segundos e com 3 tentativas
        const result = await withRetry(async () => {
          return await withTimeout(supabase.from('profiles').select('id').limit(1), 45000);
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
      const result = await withTimeout(supabase
        .from('profiles')
        .select('*')
        .order('nome')) as any;
      if (result.error) throw result.error;
      return result.data.map(mapProfileToUser);
    },
    getById: async (id: string) => {
      const result = await withTimeout(supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()) as any;
      if (result.error) throw result.error;
      return mapProfileToUser(result.data);
    },
    getByAuthId: async (authId: string) => {
      try {
        // Voltando para busca por 'id' pois a coluna 'auth_user_id' não existe no banco atual
        const result = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .eq('id', authId)
          .maybeSingle(), 60000) as any;
        
        if (result.error) throw result.error;
        if (!result.data) throw new Error('Perfil não encontrado para o ID fornecido');
        
        return mapProfileToUser(result.data);
      } catch (e: any) {
        console.error('Error in getByAuthId:', e);
        throw e;
      }
    },
    create: async (user: any) => {
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
      const { data, error } = await supabase
        .from('profiles')
        .update(mapUserToProfile(updates))
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('DB Error (users.update):', error);
        throw error;
      }
      return mapProfileToUser(data);
    },
    resetPassword: async (userId: string, newPassword: string) => {
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  commissions: {
    getAll: async (role?: string, userGroup?: string) => {
      const { data, error } = await supabase
        .from('commission_tables')
        .select('*')
        .order('banco');
      if (error) throw error;
      return data.map(mapTableToCommission);
    },
    create: async (comm: any, userRole?: string, userId?: string) => {
      const { data, error } = await supabase
        .from('commission_tables')
        .insert([mapCommissionToTable(comm)])
        .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
        .single();
      if (error) throw error;
      return mapTableToCommission(data);
    },
    update: async (id: string, updates: any, userRole?: string, userId?: string) => {
      const { data, error } = await supabase
        .from('commission_tables')
        .update(mapCommissionToTable(updates))
        .eq('id', id)
        .select('id, banco, produto, tabela, parcelas, comissao_total_empresa, grupo_master, grupo_ouro, grupo_prata, grupo_plus, status, vigencia')
        .single();
      if (error) throw error;
      return mapTableToCommission(data);
    },
    delete: async (id: string, userRole?: string, userId?: string) => {
      const { error } = await supabase
        .from('commission_tables')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    deleteMany: async (ids: string[], userRole?: string, userId?: string) => {
      const { error } = await supabase
        .from('commission_tables')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    deleteAll: async (userRole?: string, userId?: string) => {
      const { error } = await supabase
        .from('commission_tables')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
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
    getAll: async () => {
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false }), 45000);
        }, 2) as any;
        
        if (result.error) {
          console.error('Error in leads.getAll:', result.error);
          throw result.error;
        }
        
        console.log(`leads.getAll returned ${result.data?.length || 0} records`);
        return (result.data || []).map(mapTableToLead);
      } catch (err) {
        console.error('Fatal error in leads.getAll:', err);
        throw err;
      }
    },
    getAvailable: async () => {
      try {
        const result = await withRetry(async () => {
          return await withTimeout(supabase
            .from('leads')
            .select('*')
            .eq('status', 'Disponível')
            .order('created_at', { ascending: false }), 45000);
        }, 2) as any;
        
        if (result.error) throw result.error;
        return (result.data || []).map(mapTableToLead);
      } catch (err) {
        console.error('Error in leads.getAvailable:', err);
        throw err;
      }
    },
    getAvailableForUser: async (userId: string) => {
      // 0. Check if user can capture leads (Resilient check)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('can_capture_leads')
          .eq('id', userId)
          .single();
        
        // If column doesn't exist (PGRST204), we ignore and assume true
        if (profileError && profileError.code !== 'PGRST204') {
          console.warn('Erro ao verificar permissão de captura (pode ser coluna ausente):', profileError);
        }
        
        if (profile && profile.can_capture_leads === false) {
          return [];
        }
      } catch (err) {
        console.warn('Falha silenciosa na verificação de can_capture_leads:', err);
      }

      // 1. Get user's already captured leads to avoid duplicates
      const { data: userLeads, error: userError } = await withRetry(async () => {
        return await withTimeout(supabase
          .from('leads')
          .select('cpf, telefone')
          .eq('capturado_por', userId), 30000);
      }, 2) as any;
      
      if (userError) throw userError;

      const userCpfs = new Set((userLeads || []).map((l: any) => l.cpf).filter(Boolean));
      const userPhones = new Set((userLeads || []).map((l: any) => l.telefone).filter(Boolean));

      // 2. Get available leads
      const { data, error } = await withRetry(async () => {
        return await withTimeout(supabase
          .from('leads')
          .select('*')
          .eq('status', 'Disponível')
          .order('created_at', { ascending: false }), 45000);
      }, 2) as any;
      
      if (error) throw error;

      // 3. Filter out leads that have same CPF or Phone as user's existing leads
      const filtered = (data || []).filter((l: any) => {
        const hasDuplicateCpf = l.cpf && userCpfs.has(l.cpf);
        const hasDuplicatePhone = l.telefone && userPhones.has(l.telefone);
        return !hasDuplicateCpf && !hasDuplicatePhone;
      });

      return filtered.map(mapTableToLead);
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
        .eq('status', 'Disponível')
        .select()
        .single()) as any;
      if (result.error) throw result.error;
      return mapTableToLead(result.data);
    },
    bulkCapture: async (leadIds: string[], userId: string) => {
      if (!leadIds || leadIds.length === 0) {
        return { capturedCount: 0, leads: [] };
      }

      // 1. Capture the leads
      const result = await withTimeout(supabase
        .from('leads')
        .update({
          capturado_por: userId,
          capturado_em: new Date().toISOString(),
          status: 'Capturado'
        })
        .in('id', leadIds)
        .eq('status', 'Disponível')
        .select()) as any;
      
      if (result.error) throw result.error;
      const capturedCount = result.data?.length || 0;

      if (capturedCount === 0) {
        throw new Error('Nenhum lead disponível pôde ser capturado. Eles podem ter sido capturados por outro usuário.');
      }

      if (capturedCount > 0) {
        // 2. Update user's daily count
        const today = new Date().toISOString().split('T')[0];
        
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

        await withTimeout(supabase
          .from('profiles')
          .update({
            daily_lead_count: newCount,
            last_lead_date: today
          })
          .eq('id', userId)) as any;
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
      console.log('Starting leads import:', leads.length, 'records');
      
      console.log(`Starting import of ${leads.length} leads...`);
      // 1. Initial normalization and internal deduplication
      const phoneMap = new Map();
      const uniqueLeads = [];
      
      for (const l of leads) {
        const mapped = mapLeadToTable(l);
        let phone = String(mapped.telefone || '').replace(/[^\d]/g, '');
        
        if (!phone) continue; // Skip if no phone

        // Normalize with 55 if missing
        if (phone.length === 10 || phone.length === 11) {
          phone = '55' + phone;
        }
        
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, true);
          uniqueLeads.push({
            ...mapped,
            telefone: phone,
            nome: String(mapped.nome || 'Sem Nome').substring(0, 255),
            email: String(mapped.email || '').substring(0, 255),
            cpf: String(mapped.cpf || '').replace(/\D/g, '').substring(0, 11),
            banco_origem: String(mapped.banco_origem || '').substring(0, 100),
            importado_por: String(mapped.importado_por || 'Admin').substring(0, 100),
            status: 'Disponível', // Force available status on import
            metadata: {
              ...mapped.metadata,
              import_date: new Date().toISOString()
            },
            created_at: mapped.created_at || new Date().toISOString()
          });
        }
      }

      console.log(`Unique leads after normalization: ${uniqueLeads.length}`);

      const SELECT_CHUNK_SIZE = 500; // Larger chunk for checking existing
      const INSERT_CHUNK_SIZE = 100; // Smaller chunk for inserting
      const total = uniqueLeads.length;
      let processed = 0;
      const results = [];
      const errors: string[] = [];

      if (total === 0) {
        console.warn('Import called with empty or duplicate-only leads array');
        return { count: 0, data: [], errors: [] };
      }

      // First, get all existing phones in larger batches to reduce query count
      const existingPhones = new Set<string>();
      for (let i = 0; i < total; i += SELECT_CHUNK_SIZE) {
        const chunk = uniqueLeads.slice(i, i + SELECT_CHUNK_SIZE);
        const chunkPhones = chunk.map(l => l.telefone);
        
        try {
          const result = await withRetry(async () => {
            return await withTimeout(supabase
              .from('leads')
              .select('telefone')
              .in('telefone', chunkPhones), 60000);
          }, 2) as any;
          
          if (result.data) {
            result.data.forEach((l: any) => existingPhones.add(l.telefone));
          }
        } catch (err) {
          console.error('Error checking existing phones:', err);
        }
      }

      // Filter out existing leads
      const finalLeadsToInsert = uniqueLeads.filter(l => !existingPhones.has(l.telefone));
      const toInsertCount = finalLeadsToInsert.length;
      console.log(`Leads to insert after database deduplication: ${toInsertCount}`);

      if (toInsertCount === 0) {
        return { count: 0, data: [], errors: [] };
      }

      // Now insert in smaller chunks
      for (let i = 0; i < toInsertCount; i += INSERT_CHUNK_SIZE) {
        const chunk = finalLeadsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
        
        try {
          const result = await withRetry(async () => {
            return await withTimeout(supabase
              .from('leads')
              .insert(chunk)
              .select(), 90000);
          }, 2) as any;

          if (result.error) {
            console.error('Error inserting leads chunk:', result.error);
            errors.push(`Lote ${i / INSERT_CHUNK_SIZE + 1}: ${result.error.message}`);
          } else if (result.data) {
            results.push(...result.data);
          }
        } catch (chunkError: any) {
          console.error('Fatal error in leads insert chunk:', chunkError);
          errors.push(`Erro fatal no lote ${i / INSERT_CHUNK_SIZE + 1}: ${chunkError.message || 'Erro desconhecido'}`);
        }

        processed += chunk.length;
        if (onProgress) {
          onProgress(Math.round((processed / toInsertCount) * 100));
        }
      }

      console.log('Leads import finished. Total results:', results.length);
      return {
        count: results.length,
        data: results.map(mapTableToLead),
        errors
      };
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    deleteAllAvailable: async () => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('status', 'Disponível');
      if (error) throw error;
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

      const result = await withTimeout(query) as any;
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
      console.log('DB: Criando venda:', sale);
      // 1. Create the sale
      const mappedSale = mapSaleToTable({ 
        ...sale, 
        vendedor_id: user.id,
        vendedor_nome: user.name,
        grupo_vendedor: user.grupo_comissao 
      });
      
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([mappedSale])
        .select('*')
        .single();
      
      if (saleError) throw saleError;

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

      const { error: finError } = await supabase.from('financial_entries').insert([financialEntry]);
      if (finError) {
        console.error('Erro ao criar entrada financeira:', finError);
      }
      
      // 3. Update user's accumulated balance (fetch latest first to avoid race conditions)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('saldo_acumulado')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        const currentBalance = profile.saldo_acumulado || 0;
        const newCommission = sale.commission || 0;
        await db.users.update(user.id, { 
          saldo_acumulado: currentBalance + newCommission 
        });
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
      let query = supabase.from('financial_entries').select('*');
      if (vendedorId) query = query.eq('vendedor_id', vendedorId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    create: async (entry: Partial<FinancialEntry>) => {
      const { data, error } = await supabase
        .from('financial_entries')
        .insert([entry])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: string, status: string) => {
      const { data, error } = await supabase
        .from('financial_entries')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('access_requests')
        .insert([req])
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('nome_banco');
      
      if (error) {
        console.error('Error fetching banks:', error);
        throw error;
      }
      
      return data.map(b => ({
        id: b.id,
        nome: b.nome_banco,
        tipo: b.tipo_produto,
        percentual: b.percentual_maximo,
        status: b.status
      }));
    },
    create: async (bank: any) => {
      const { data, error } = await supabase
        .from('banks')
        .insert([{
          nome_banco: bank.nome,
          tipo_produto: bank.tipo || 'Crédito',
          percentual_maximo: bank.percentual || 100,
          status: bank.status || 'Ativo'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        nome: data.nome_banco,
        tipo: data.tipo_produto,
        percentual: data.percentual_maximo,
        status: data.status
      };
    },
    update: async (id: string, updates: any) => {
      const mapped: any = {};
      if (updates.nome) mapped.nome_banco = updates.nome;
      if (updates.tipo) mapped.tipo_produto = updates.tipo;
      if (updates.percentual) mapped.percentual_maximo = updates.percentual;
      if (updates.status) mapped.status = updates.status;

      const { data, error } = await supabase
        .from('banks')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        nome: data.nome_banco,
        tipo: data.tipo_produto,
        percentual: data.percentual_maximo,
        status: data.status
      };
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('commission_groups')
        .insert([{
          name: group.name,
          type: group.type,
          banco_id: group.banco_id,
          status: group.status || 'Ativo'
        }])
        .select()
        .single();
      
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
      const { data, error } = await supabase
        .from('commission_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
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
      const { error } = await supabase
        .from('commission_groups')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('DB Error (commissionGroups.delete):', error);
        throw error;
      }
    }
  },

  credentials: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('platform_credentials')
        .select('*')
        .order('banco_nome');
      if (error) throw error;
      return data;
    },
    getByUser: async (userId: string) => {
      const { data, error } = await supabase
        .from('platform_credentials')
        .select('*')
        .eq('usuario_id', userId)
        .order('banco_nome');
      if (error) throw error;
      return data;
    },
    create: async (cred: any) => {
      const { data, error } = await supabase
        .from('platform_credentials')
        .insert([cred])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('platform_credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('platform_credentials')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
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
  }
};

// Mappers
function mapProfileToUser(p: any): User {
  return {
    id: p.id,
    name: p.nome,
    email: p.email,
    role: p.perfil,
    status: p.ativo ? 'Ativo' : 'Inativo',
    lastAccess: p.created_at,
    grupo_comissao: p.grupo_comissao,
    meta_diaria: p.meta_diaria,
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
  // Legacy fields
  if (u.daily_goal !== undefined) p.meta_diaria = u.daily_goal;
  if (u.daily_lead_count !== undefined) p.daily_lead_count = u.daily_lead_count;
  if (u.last_lead_date !== undefined) p.last_lead_date = u.last_lead_date;
  // can_capture_leads removed as column might not exist in profiles table
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
