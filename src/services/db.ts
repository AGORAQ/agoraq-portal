import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, CommissionTable, AccessRequest, PlatformCredential, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Bank, PaymentRequest, Announcement } from '@/types';

// Password Hashing Helper
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// Initial Data (Passwords are hashed)
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador Demo', email: 'agoraq@agoraqoficial.com', role: 'admin', status: 'Ativo', lastAccess: new Date().toISOString(), password: hashPassword('admin'), saldo_acumulado: 0, saldo_pago: 0, grupo_comissao: 'MASTER' },
  { id: '2', name: 'Supervisor Vendas', email: 'supervisor@agoraqoficial.com.br', role: 'supervisor', status: 'Ativo', lastAccess: new Date().toISOString(), password: hashPassword('sup'), saldo_acumulado: 0, saldo_pago: 0, grupo_comissao: 'MASTER' },
  { id: '3', name: 'Vendedor Exemplo', email: 'vendedor@agoraqoficial.com.br', role: 'vendedor', status: 'Ativo', lastAccess: new Date().toISOString(), password: hashPassword('vend'), saldo_acumulado: 1500, saldo_pago: 500, pix_key: 'vendedor@pix.com', grupo_comissao: 'MASTER' },
];

const INITIAL_BANKS: Bank[] = [
  { id: 'b1', nome_banco: 'Banco Pan', tipo_produto: 'Ambos', percentual_maximo: 15, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b2', nome_banco: 'Itaú', tipo_produto: 'Ambos', percentual_maximo: 12, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b3', nome_banco: 'BMG', tipo_produto: 'FGTS', percentual_maximo: 18, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b4', nome_banco: 'Prata', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b5', nome_banco: 'C6', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b6', nome_banco: 'HUB', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b7', nome_banco: 'Presença Bank', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b8', nome_banco: 'Taquitado', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b9', nome_banco: 'Granapix', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b10', nome_banco: 'Novo Saque', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b11', nome_banco: 'Qualibank', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b12', nome_banco: 'Grandino', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b13', nome_banco: 'DI+', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b14', nome_banco: 'Unno', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b15', nome_banco: 'Crefaz', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b16', nome_banco: 'Crefisa', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b17', nome_banco: 'PAN', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b18', nome_banco: 'PH Tech', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b19', nome_banco: 'V8', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b20', nome_banco: 'Top Mais', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
  { id: 'b21', nome_banco: 'DSV', tipo_produto: 'Ambos', percentual_maximo: 0, status: 'Ativo', criado_em: new Date().toISOString() },
];

const INITIAL_COMMISSIONS: CommissionTable[] = [
  { 
    id: '1', 
    banco: 'Banco Pan', 
    produto: 'Empréstimo Consignado', 
    operacao: 'INSS Normal',
    parcelas: '84x',
    codigo_tabela: 'PAN_INSS_01',
    nome_tabela: 'INSS Normal', 
    faixa_valor_min: 1000,
    faixa_valor_max: 50000,
    percentual_total_empresa: 12, 
    comissao_master: 10,
    comissao_ouro: 9,
    comissao_prata: 8,
    comissao_plus: 7,
    status: 'Ativo', 
    criado_por: 'sistema',
    data_criacao: new Date().toISOString(),
    data_atualizacao: new Date().toISOString(),
  },
];

const INITIAL_SALES = [
  { id: '1', date: '2024-03-01', proposal: '123456', client: 'Carlos Oliveira', cpf: '123.456.789-00', phone: '(11) 99999-9999', bank: 'Banco Pan', table: 'INSS Normal', value: 5000.00, commission: 0.10, companyCommission: 0.15, bankCommission: 0.18, status: 'Pago', seller: 'Vendedor Exemplo' },
  { id: '2', date: '2024-03-02', proposal: '123457', client: 'Ana Souza', cpf: '222.333.444-55', phone: '(11) 98888-8888', bank: 'Itaú', table: 'Portabilidade', value: 12000.00, commission: 0.08, companyCommission: 0.12, bankCommission: 0.15, status: 'Aguardando', seller: 'Ana Vendedora' },
  { id: '3', date: '2024-03-03', proposal: '123458', client: 'Roberto Lima', cpf: '555.666.777-88', phone: '(21) 97777-7777', bank: 'BMG', table: 'Cartão Benefício', value: 3500.00, commission: 0.12, companyCommission: 0.18, bankCommission: 0.22, status: 'Pago', seller: 'Vendedor Exemplo' },
  { id: '4', date: '2024-03-04', proposal: '123459', client: 'Fernanda Costa', cpf: '999.888.777-66', phone: '(31) 96666-6666', bank: 'C6 Bank', table: 'Refinanciamento', value: 8900.00, commission: 0.09, companyCommission: 0.14, bankCommission: 0.17, status: 'Em Análise', seller: 'Carlos Vendedor' },
];

const INITIAL_LEADS = [
  { id: '1', name: 'José Silva', phone: '(11) 91234-5678', email: 'jose@email.com', city: 'São Paulo', status: 'Novo', createdAt: new Date().toISOString() },
  { id: '2', name: 'Maria Oliveira', phone: '(21) 98765-4321', email: 'maria@email.com', city: 'Rio de Janeiro', status: 'Novo', createdAt: new Date().toISOString() },
];

const INITIAL_REQUESTS: AccessRequest[] = [
  { id: '1', usuario_id: '3', name: 'João Silva', email: 'joao@email.com', bank: 'Banco Pan', banco_nome: 'Banco Pan', sellerName: 'Vendedor Exemplo', cpf: '111.222.333-44', status: 'Pendente', createdAt: new Date().toISOString(), data_criacao: new Date().toISOString(), fgtsGroup: 'DIAMANTE', cltGroup: 'Fortuna 8D' },
  { id: '2', usuario_id: '3', name: 'Maria Santos', email: 'maria@email.com', bank: 'Itaú', banco_nome: 'Itaú', sellerName: 'Ana Vendedora', cpf: '555.666.777-88', status: 'Aprovado', createdAt: new Date().toISOString(), data_criacao: new Date().toISOString(), fgtsGroup: 'OURO', cltGroup: 'Líder CLT' },
];

const INITIAL_COMMISSION_GROUPS: CommissionGroup[] = [
  { id: '1', name: 'DIAMANTE', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '2', name: 'OURO', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '3', name: 'PRATA', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '4', name: 'Fortuna 8D', type: 'CLT', banco_id: 'b2', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '5', name: 'Líder CLT', type: 'CLT', banco_id: 'b2', status: 'Ativo', createdAt: new Date().toISOString() },
];

const API_URL = '/api';

// Database Service
export const db = {
  users: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/users`);
      return res.json();
    },
    getById: async (id: string) => {
      const res = await fetch(`${API_URL}/users`);
      const users = await res.json();
      return users.find((u: any) => u.id === id);
    },
    create: async (user: Omit<User, 'id' | 'lastAccess'>) => {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<User>) => {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    },
    incrementLeads: async (id: string) => {
      const res = await fetch(`${API_URL}/users/${id}/increment-leads`, { method: 'POST' });
      return res.json();
    }
  },

  commissions: {
    getAll: async (role: string = 'vendedor', userGroup?: string) => {
      const res = await fetch(`${API_URL}/commissions`);
      const commissions = await res.json();
      
      if (role === 'admin' || role === 'supervisor') {
        return commissions;
      }

      // Filter by group for sellers and hide sensitive fields
      return commissions
        .map((c: any) => {
          let sellerCommission = 0;
          if (userGroup === 'MASTER') sellerCommission = c.comissao_master;
          else if (userGroup === 'OURO') sellerCommission = c.comissao_ouro;
          else if (userGroup === 'PRATA') sellerCommission = c.comissao_prata;
          else if (userGroup === 'PLUS') sellerCommission = c.comissao_plus;

          return {
            id: c.id,
            banco: c.banco,
            produto: c.produto,
            operacao: c.operacao,
            parcelas: c.parcelas,
            codigo_tabela: c.codigo_tabela,
            nome_tabela: c.nome_tabela,
            faixa_valor_min: c.faixa_valor_min,
            faixa_valor_max: c.faixa_valor_max,
            percentual_vendedor: sellerCommission,
            status: c.status,
          };
        });
    },
    create: async (comm: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>, userRole: string, userId: string) => {
      const res = await fetch(`${API_URL}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...comm, criado_por: userId }),
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<CommissionTable>, userRole: string, userId: string) => {
      const res = await fetch(`${API_URL}/commissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string, userRole: string, userId: string) => {
      await fetch(`${API_URL}/commissions/${id}`, { method: 'DELETE' });
    },
    deleteMany: async (ids: string[], userRole: string, userId: string) => {
      await fetch(`${API_URL}/commissions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    },
    deleteAll: async (userRole: string, userId: string) => {
      const all = await fetch(`${API_URL}/commissions`);
      const commissions = await all.json();
      const ids = commissions.map((c: any) => c.id);
      if (ids.length > 0) {
        await db.commissions.deleteMany(ids, userRole, userId);
      }
    },
    import: async (comms: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[], userRole: string, userId: string) => {
      for (const comm of comms) {
        await db.commissions.create(comm, userRole, userId);
      }
      return comms;
    }
  },

  sales: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/sales`);
      return res.json();
    },
    create: async (sale: any, user: User) => {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sale, seller: user.name }),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => {
      const res = await fetch(`${API_URL}/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/sales/${id}`, { method: 'DELETE' });
    }
  },

  leads: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/leads`);
      return res.json();
    },
    create: async (lead: any) => {
      const res = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/leads/${id}`, { method: 'DELETE' });
    },
    import: async (leadsData: any[]) => {
      for (const lead of leadsData) {
        await db.leads.create(lead);
      }
      return leadsData;
    }
  },

  requests: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/access-requests`);
      return res.json();
    },
    getByUser: async (userId: string) => {
      const res = await fetch(`${API_URL}/access-requests`);
      const requests = await res.json();
      return requests.filter((r: any) => r.usuario_id === userId);
    },
    create: async (req: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>) => {
      const res = await fetch(`${API_URL}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: AccessRequest['status'], adminObservation?: string, adminId?: string) => {
      const res = await fetch(`${API_URL}/access-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, observacao_admin: adminObservation, criado_por_admin: adminId }),
      });
      return res.json();
    }
  },

  credentials: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/credentials`);
      return res.json();
    },
    getByUser: async (userId: string) => {
      const res = await fetch(`${API_URL}/credentials`);
      const credentials = await res.json();
      return credentials.filter((c: any) => c.usuario_id === userId);
    },
    create: async (cred: Omit<PlatformCredential, 'id' | 'data_criacao' | 'data_atualizacao'>) => {
      const res = await fetch(`${API_URL}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<PlatformCredential>) => {
      const res = await fetch(`${API_URL}/credentials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/credentials/${id}`, { method: 'DELETE' });
    }
  },

  logs: {
    getAll: async () => [],
    add: async (log: any) => ({}),
    getSecurityLogs: async () => [],
    addSecurityLog: async (log: any) => ({}),
    getImportLogs: async () => [],
    addImportLog: async (log: any) => ({})
  },

  commissionGroups: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/commission-groups`);
      return res.json();
    },
    getByBank: async (bankId: string) => {
      const all = await fetch(`${API_URL}/commission-groups`);
      const groups = await all.json();
      return groups.filter((g: any) => g.banco_id === bankId);
    },
    create: async (group: any) => {
      const res = await fetch(`${API_URL}/commission-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/commission-groups/${id}`, { method: 'DELETE' });
    }
  },

  bancos: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/banks`);
      return res.json();
    },
    create: async (bank: Omit<Bank, 'id' | 'criado_em'>) => {
      const res = await fetch(`${API_URL}/banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bank),
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<Bank>) => {
      const res = await fetch(`${API_URL}/banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/banks/${id}`, { method: 'DELETE' });
    }
  },

  payment_requests: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/payment-requests`);
      return res.json();
    },
    create: async (req: any) => {
      const res = await fetch(`${API_URL}/payment-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => {
      const res = await fetch(`${API_URL}/payment-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    }
  },

  settings: {
    get: async () => {
      const res = await fetch(`${API_URL}/settings`);
      return res.json();
    },
    update: async (newSettings: any) => {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      return res.json();
    }
  },
  academy: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/academy`);
      return res.json();
    },
    create: async (content: any) => {
      const res = await fetch(`${API_URL}/academy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => {
      // Not implemented on backend yet
    },
    delete: async (id: string) => {
      await fetch(`${API_URL}/academy/${id}`, { method: 'DELETE' });
    },
    trackView: async (conteudo_id: string, usuario_id: string) => {
      await fetch(`${API_URL}/academy/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo_id, usuario_id }),
      });
    }
  },
  academyViews: {
    getAll: async () => [],
    register: async (conteudo_id: string, usuario_id: string) => {
      await db.academy.trackView(conteudo_id, usuario_id);
    },
    getUserViews: async (usuario_id: string) => []
  },
  announcements: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/announcements`);
      return res.json();
    },
    create: async (announcement: any) => {
      const res = await fetch(`${API_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => {
      await fetch(`${API_URL}/announcements/${id}`, { method: 'DELETE' });
    }
  },
  campaigns: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/campaigns`);
      return res.json();
    },
    create: async (campaign: any) => {
      const res = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });
      return res.json();
    },
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => {
      await fetch(`${API_URL}/campaigns/${id}`, { method: 'DELETE' });
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
    },
    comparePassword: (password: string, hash: string) => {
      return bcrypt.compareSync(password, hash);
    }
  }
};;
