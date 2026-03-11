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
      const params = new URLSearchParams({ role });
      if (userGroup) params.append('group', userGroup);
      
      const res = await fetch(`${API_URL}/commissions?${params.toString()}`);
      return res.json();
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
      await fetch(`${API_URL}/commissions/delete-all`, { method: 'POST' });
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
