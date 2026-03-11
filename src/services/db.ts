import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, CommissionTable, AccessRequest, PlatformCredential, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Bank, PaymentRequest, Announcement } from '@/types';

// Password Hashing Helper
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// Initial Data (Passwords are hashed)
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador', email: 'agoraq@agoraqoficial.com', role: 'admin', status: 'Ativo', lastAccess: new Date().toISOString(), password: hashPassword('admin'), saldo_acumulado: 0, saldo_pago: 0, grupo_comissao: 'MASTER' },
];

const INITIAL_BANKS: Bank[] = [];

const INITIAL_COMMISSIONS: CommissionTable[] = [];

const INITIAL_SALES: any[] = [];

const INITIAL_LEADS: any[] = [];

const INITIAL_REQUESTS: AccessRequest[] = [];

const INITIAL_COMMISSION_GROUPS: CommissionGroup[] = [];

const API_URL = '/api';

// Helper for safe fetching with fallback for static environments like Netlify
const safeFetch = async (url: string, options?: RequestInit, fallbackData: any = []) => {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res.json();
    if (res.status === 404 && window.location.hostname.includes('netlify.app')) {
      console.warn(`API route ${url} not found on Netlify. Using fallback data.`);
      return fallbackData;
    }
    return fallbackData;
  } catch (e) {
    console.error(`Fetch error for ${url}:`, e);
    return fallbackData;
  }
};

// Database Service
export const db = {
  users: {
    getAll: async () => safeFetch(`${API_URL}/users`, undefined, INITIAL_USERS),
    getById: async (id: string) => {
      const users = await safeFetch(`${API_URL}/users`, undefined, INITIAL_USERS);
      return users.find((u: any) => u.id === id);
    },
    create: async (user: Omit<User, 'id' | 'lastAccess'>) => safeFetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }, { ...user, id: uuidv4() }),
    update: async (id: string, updates: Partial<User>) => safeFetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string) => safeFetch(`${API_URL}/users/${id}`, { method: 'DELETE' }),
    incrementLeads: async (id: string) => safeFetch(`${API_URL}/users/${id}/increment-leads`, { method: 'POST' }, { success: true })
  },

  commissions: {
    getAll: async (role: string = 'vendedor', userGroup?: string) => {
      const params = new URLSearchParams({ role });
      if (userGroup) params.append('group', userGroup);
      return safeFetch(`${API_URL}/commissions?${params.toString()}`, undefined, INITIAL_COMMISSIONS);
    },
    create: async (comm: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...comm, criado_por: userId }),
    }, { ...comm, id: uuidv4() }),
    update: async (id: string, updates: Partial<CommissionTable>, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/${id}`, { method: 'DELETE' }),
    deleteMany: async (ids: string[], userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }),
    deleteAll: async (userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/delete-all`, { method: 'POST' }),
    import: async (comms: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[], userRole: string, userId: string) => {
      if (window.location.hostname.includes('netlify.app')) return comms;
      for (const comm of comms) {
        await db.commissions.create(comm, userRole, userId);
      }
      return comms;
    }
  },

  sales: {
    getAll: async () => safeFetch(`${API_URL}/sales`, undefined, INITIAL_SALES),
    create: async (sale: any, user: User) => safeFetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sale, seller: user.name }),
    }, { ...sale, id: uuidv4() }),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string) => safeFetch(`${API_URL}/sales/${id}`, { method: 'DELETE' })
  },

  leads: {
    getAll: async () => safeFetch(`${API_URL}/leads`, undefined, INITIAL_LEADS),
    create: async (lead: any) => safeFetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    }, { ...lead, id: uuidv4() }),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string) => safeFetch(`${API_URL}/leads/${id}`, { method: 'DELETE' }),
    import: async (leadsData: any[]) => {
      if (window.location.hostname.includes('netlify.app')) return leadsData;
      for (const lead of leadsData) {
        await db.leads.create(lead);
      }
      return leadsData;
    }
  },

  requests: {
    getAll: async () => safeFetch(`${API_URL}/access-requests`, undefined, INITIAL_REQUESTS),
    getByUser: async (userId: string) => {
      const requests = await safeFetch(`${API_URL}/access-requests`, undefined, INITIAL_REQUESTS);
      return requests.filter((r: any) => r.usuario_id === userId);
    },
    create: async (req: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>) => safeFetch(`${API_URL}/access-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }, { ...req, id: uuidv4(), status: 'Pendente', createdAt: new Date().toISOString() }),
    updateStatus: async (id: string, status: AccessRequest['status'], adminObservation?: string, adminId?: string) => safeFetch(`${API_URL}/access-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, observacao_admin: adminObservation, criado_por_admin: adminId }),
    }, { status })
  },

  credentials: {
    getAll: async () => safeFetch(`${API_URL}/credentials`),
    getByUser: async (userId: string) => {
      const credentials = await safeFetch(`${API_URL}/credentials`);
      return credentials.filter((c: any) => c.usuario_id === userId);
    },
    create: async (cred: Omit<PlatformCredential, 'id' | 'data_criacao' | 'data_atualizacao'>) => safeFetch(`${API_URL}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    }, { ...cred, id: uuidv4() }),
    update: async (id: string, updates: Partial<PlatformCredential>) => safeFetch(`${API_URL}/credentials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string) => safeFetch(`${API_URL}/credentials/${id}`, { method: 'DELETE' })
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
    getAll: async () => safeFetch(`${API_URL}/commission-groups`, undefined, INITIAL_COMMISSION_GROUPS),
    getByBank: async (bankId: string) => {
      const groups = await safeFetch(`${API_URL}/commission-groups`, undefined, INITIAL_COMMISSION_GROUPS);
      return groups.filter((g: any) => g.banco_id === bankId);
    },
    create: async (group: any) => safeFetch(`${API_URL}/commission-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    }, { ...group, id: uuidv4() }),
    delete: async (id: string) => safeFetch(`${API_URL}/commission-groups/${id}`, { method: 'DELETE' })
  },

  bancos: {
    getAll: async () => safeFetch(`${API_URL}/banks`, undefined, INITIAL_BANKS),
    create: async (bank: Omit<Bank, 'id' | 'criado_em'>) => safeFetch(`${API_URL}/banks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bank),
    }, { ...bank, id: uuidv4(), criado_em: new Date().toISOString() }),
    update: async (id: string, updates: Partial<Bank>) => safeFetch(`${API_URL}/banks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates),
    delete: async (id: string) => safeFetch(`${API_URL}/banks/${id}`, { method: 'DELETE' })
  },

  payment_requests: {
    getAll: async () => safeFetch(`${API_URL}/payment-requests`),
    create: async (req: any) => safeFetch(`${API_URL}/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }, { ...req, id: uuidv4() }),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/payment-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, updates)
  },

  settings: {
    get: async () => safeFetch(`${API_URL}/settings`, undefined, {}),
    update: async (newSettings: any) => safeFetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }, newSettings)
  },
  academy: {
    getAll: async () => safeFetch(`${API_URL}/academy`),
    create: async (content: any) => safeFetch(`${API_URL}/academy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    }, { ...content, id: uuidv4() }),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/academy/${id}`, { method: 'DELETE' }),
    trackView: async (conteudo_id: string, usuario_id: string) => safeFetch(`${API_URL}/academy/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo_id, usuario_id }),
    })
  },
  academyViews: {
    getAll: async () => [],
    register: async (conteudo_id: string, usuario_id: string) => {
      await db.academy.trackView(conteudo_id, usuario_id);
    },
    getUserViews: async (usuario_id: string) => []
  },
  announcements: {
    getAll: async () => safeFetch(`${API_URL}/announcements`),
    create: async (announcement: any) => safeFetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcement),
    }, { ...announcement, id: uuidv4() }),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/announcements/${id}`, { method: 'DELETE' })
  },
  campaigns: {
    getAll: async () => safeFetch(`${API_URL}/campaigns`),
    create: async (campaign: any) => safeFetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    }, { ...campaign, id: uuidv4() }),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/campaigns/${id}`, { method: 'DELETE' })
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
