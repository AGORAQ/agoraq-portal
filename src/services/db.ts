import { supabase } from '@/lib/supabase';
import { User, CommissionTable, AccessRequest, PlatformCredential, Sale, Bank, PaymentRequest, Announcement, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Lead, FinancialEntry } from '@/types';

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

  users: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data.map(mapProfileToUser);
    },
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return mapProfileToUser(data);
    },
    getByAuthId: async (authId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .single();
      if (error) throw error;
      return mapProfileToUser(data);
    },
    create: async (user: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert([mapUserToProfile(user)])
        .select()
        .single();
      if (error) throw error;
      return mapProfileToUser(data);
    },
    update: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(mapUserToProfile(updates))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapProfileToUser(data);
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
        .select()
        .single();
      if (error) throw error;
      return mapTableToCommission(data);
    },
    update: async (id: string, updates: any, userRole?: string, userId?: string) => {
      const { data, error } = await supabase
        .from('commission_tables')
        .update(mapCommissionToTable(updates))
        .eq('id', id)
        .select()
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
    import: async (comms: any[], userRole?: string, userId?: string) => {
      const { data, error } = await supabase
        .from('commission_tables')
        .insert(comms.map(mapCommissionToTable))
        .select();
      if (error) throw error;
      return data.map(mapTableToCommission);
    }
  },

  leads: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapTableToLead);
    },
    getAvailable: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'Disponível')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapTableToLead);
    },
    capture: async (leadId: string, userId: string) => {
      const { data, error } = await supabase
        .from('leads')
        .update({
          capturado_por: userId,
          capturado_em: new Date().toISOString(),
          status: 'Capturado'
        })
        .eq('id', leadId)
        .eq('status', 'Disponível')
        .select()
        .single();
      if (error) throw error;
      return mapTableToLead(data);
    },
    bulkCapture: async (leadIds: string[], userId: string) => {
      const { data, error } = await supabase
        .from('leads')
        .update({
          capturado_por: userId,
          capturado_em: new Date().toISOString(),
          status: 'Capturado'
        })
        .in('id', leadIds)
        .eq('status', 'Disponível')
        .select();
      if (error) throw error;
      return { capturedCount: data?.length || 0, leads: data.map(mapTableToLead) };
    },
    create: async (lead: any) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([mapLeadToTable(lead)])
        .select()
        .single();
      if (error) throw error;
      return mapTableToLead(data);
    },
    import: async (leads: any[]) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(leads.map(mapLeadToTable))
        .select();
      if (error) throw error;
      return data.map(mapTableToLead);
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
    getAll: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, profiles(nome), leads(nome, cpf)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapTableToSale);
    },
    create: async (sale: any, user: User) => {
      const { data, error } = await supabase
        .from('sales')
        .insert([mapSaleToTable({ ...sale, vendedor_id: user.id })])
        .select()
        .single();
      if (error) throw error;
      return mapTableToSale(data);
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('sales')
        .update(mapSaleToTable(updates))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapTableToSale(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
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

  requests: {
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
        .order('nome');
      if (error) throw error;
      return data;
    },
    create: async (bank: any) => {
      const { data, error } = await supabase
        .from('banks')
        .insert([{
          nome: bank.nome || bank.nome_banco,
          cor: bank.cor || '#000000',
          status: bank.status || 'Ativo'
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const mappedUpdates: any = {};
      if (updates.nome || updates.nome_banco) mappedUpdates.nome = updates.nome || updates.nome_banco;
      if (updates.cor) mappedUpdates.cor = updates.cor;
      if (updates.status) mappedUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('banks')
        .update(mappedUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('commission_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    getByBank: async (bankId: string) => {
      const { data, error } = await supabase
        .from('commission_groups')
        .select('*')
        .eq('banco_id', bankId)
        .order('name');
      if (error) throw error;
      return data;
    },
    create: async (group: any) => {
      const { data, error } = await supabase
        .from('commission_groups')
        .insert([group])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('commission_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
    getAll: async () => {
      const { data, error } = await supabase
        .from('financial_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        usuario_id: d.usuario_id || d.vendedor_id,
        data_solicitacao: d.data_solicitacao || d.created_at,
        chave_pix: d.chave_pix || d.pix_key
      }));
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
        .order('titulo');
      if (error) throw error;
      return data;
    },
    create: async (content: any) => {
      const { data, error } = await supabase
        .from('academy_content')
        .insert([content])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('academy_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
        .select('*')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || { canvaLink: 'https://www.canva.com/' };
    },
    update: async (newSettings: any) => {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ id: 1, ...newSettings })
        .select()
        .single();
      if (error) throw error;
      return data;
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
    contract_signed: p.contract_signed
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
  if (u.contract_signed !== undefined) p.contract_signed = u.contract_signed;
  if (u.monthly_goal !== undefined) p.monthly_goal = u.monthly_goal;
  if (u.daily_goal !== undefined) p.meta_diaria = u.daily_goal;
  if (u.daily_lead_count !== undefined) p.daily_lead_count = u.daily_lead_count;
  if (u.last_lead_date !== undefined) p.last_lead_date = u.last_lead_date;
  return p;
}

function mapTableToLead(t: any): Lead {
  return {
    id: t.id,
    name: t.nome,
    phone: t.telefone,
    email: t.email,
    cpf: t.cpf,
    banco_origem: t.banco_origem,
    status: t.status,
    usuario_id: t.capturado_por,
    importado_por: t.importado_por,
    capturedAt: t.capturado_em,
    createdAt: t.created_at
  };
}

function mapLeadToTable(l: any): any {
  return {
    nome: l.name || l.nome,
    telefone: l.phone || l.telefone,
    email: l.email,
    cpf: l.cpf,
    banco_origem: l.banco_origem,
    status: l.status || 'Disponível',
    capturado_por: l.usuario_id || l.capturado_por,
    capturado_em: l.capturedAt || l.capturado_em,
    importado_por: l.importado_por
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
    tabela: c.operacao || c.nome_tabela,
    parcelas: c.parcelas,
    comissao_total_empresa: c.percentual_total_empresa,
    grupo_master: c.comissao_master,
    grupo_ouro: c.comissao_ouro,
    grupo_prata: c.comissao_prata,
    grupo_plus: c.comissao_plus,
    vigencia: c.vigencia,
    status: c.status || 'Ativo',
    origem_importacao: c.origem_importacao
  };
}

function mapTableToSale(t: any): Sale {
  return {
    id: t.id,
    vendedor_id: t.vendedor_id,
    vendedor_nome: t.profiles?.nome || 'Desconhecido',
    lead_id: t.lead_id,
    date: t.created_at,
    client: t.leads?.nome || 'Cliente', // Try to get from lead join
    cpf: t.leads?.cpf,
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
    seller: t.profiles?.nome || 'Desconhecido'
  };
}

function mapSaleToTable(s: any): any {
  const t: any = {};
  if (s.vendedor_id) t.vendedor_id = s.vendedor_id;
  if (s.lead_id) t.lead_id = s.lead_id;
  if (s.bank) t.banco = s.bank;
  if (s.produto) t.produto = s.produto;
  if (s.tabela) t.tabela = s.tabela;
  if (s.parcelas) t.parcelas = s.parcelas;
  if (s.valor_venda) t.valor_venda = s.valor_venda;
  if (s.valor_comissao) t.valor_comissao = s.valor_comissao;
  if (s.percentual_empresa) t.percentual_empresa = s.percentual_empresa;
  if (s.percentual_vendedor) t.percentual_vendedor = s.percentual_vendedor;
  if (s.grupo_vendedor) t.grupo_vendedor = s.grupo_vendedor;
  if (s.status) t.status = s.status;
  return t;
}
