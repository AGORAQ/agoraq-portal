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

// Determine the API URL
// In production/Netlify, we can point this to the Cloud Run backend URL
const CLOUD_RUN_URL = 'https://ais-dev-w47zxljbghf6tucdlbhe2z-410044833253.us-east1.run.app';
const API_URL_OVERRIDE = localStorage.getItem('agoraq_api_url');
const API_URL = API_URL_OVERRIDE || import.meta.env.VITE_API_URL || (window.location.hostname.includes('netlify.app') ? `${CLOUD_RUN_URL}/api` : '/api');

// Local Storage Persistence for Static Environments (Netlify/Demo)
const localStore = {
  get: (key: string, fallback: any = []) => {
    try {
      const data = localStorage.getItem(`agoraq_${key}`);
      if (!data) {
        // If no data in localStorage, check if we should seed it with initial data
        let initialData = fallback;
        if (key === 'users') initialData = [...INITIAL_USERS];
        if (key === 'commissions') initialData = [...INITIAL_COMMISSIONS];
        if (key === 'banks') initialData = [...INITIAL_BANKS];
        if (key === 'leads') initialData = [...INITIAL_LEADS];
        if (key === 'sales') initialData = [...INITIAL_SALES];
        if (key === 'requests') initialData = [...INITIAL_REQUESTS];
        
        // Seed it so it's there for next time
        if (initialData !== fallback) {
          localStorage.setItem(`agoraq_${key}`, JSON.stringify(initialData));
        }
        return initialData;
      }
      return JSON.parse(data);
    } catch (e) {
      return fallback;
    }
  },
  set: (key: string, data: any) => {
    localStorage.setItem(`agoraq_${key}`, JSON.stringify(data));
  },
  addItem: (key: string, item: any, fallbackData: any = []) => {
    const items = localStore.get(key, fallbackData);
    const newItem = { ...item, id: item.id || uuidv4(), createdAt: item.createdAt || new Date().toISOString() };
    const newItems = [...items, newItem];
    localStore.set(key, newItems);
    return newItem;
  },
  updateItem: (key: string, id: string, updates: any, fallbackData: any = []) => {
    const items = localStore.get(key, fallbackData);
    const newItems = items.map((item: any) => item.id === id ? { ...item, ...updates } : item);
    localStore.set(key, newItems);
    return { success: true, ...updates };
  },
  deleteItem: (key: string, id: string, fallbackData: any = []) => {
    const items = localStore.get(key, fallbackData);
    const newItems = items.filter((item: any) => item.id !== id);
    localStore.set(key, newItems);
    return { success: true };
  }
};

// Helper for safe fetching with fallback for static environments
const safeFetch = async (url: string, options?: RequestInit, fallbackKey?: string, fallbackData: any = []) => {
  // Determine if we should use local storage as fallback
  // We use it if we are on a known static host OR if the API call fails
  const isKnownStatic = window.location.hostname.includes('netlify.app') || 
                        window.location.hostname.includes('github.io') || 
                        window.location.hostname.includes('vercel.app');
  
  try {
    const res = await fetch(url, options);
    
    // If API is working, use it
    if (res.ok) {
      const data = await res.json();
      // Optionally sync to local storage for offline support
      if (fallbackKey && options?.method === undefined) {
        localStore.set(fallbackKey, data);
      }
      return data;
    }
    
    // If API returns 404 or other error, and we have a fallback key, use localStorage
    if (fallbackKey) {
      console.warn(`API error (${res.status}) for ${url}. Falling back to localStorage[${fallbackKey}].`);
      return handleLocalStorageFallback(options, fallbackKey, fallbackData, url);
    }
    
    return fallbackData;
  } catch (e) {
    // Network error (API unreachable)
    if (fallbackKey) {
      console.warn(`API unreachable for ${url}. Falling back to localStorage[${fallbackKey}].`);
      return handleLocalStorageFallback(options, fallbackKey, fallbackData, url);
    }
    return fallbackData;
  }
};

const handleLocalStorageFallback = (options: RequestInit | undefined, key: string, fallbackData: any, url: string) => {
  if (options?.method === 'POST') {
    try {
      let body = JSON.parse(options.body as string);
      
      // Hash password if creating a user locally
      if (key === 'users' && body.password) {
        body = { ...body, password: hashPassword(body.password) };
      }
      
      return localStore.addItem(key, body, fallbackData);
    } catch (e) {
      return fallbackData;
    }
  }
  if (options?.method === 'PUT') {
    try {
      const id = url.split('/').pop() || '';
      let body = JSON.parse(options.body as string);

      // Hash password if updating a user password locally
      if (key === 'users' && body.password) {
        body = { ...body, password: hashPassword(body.password) };
      }

      return localStore.updateItem(key, id, body, fallbackData);
    } catch (e) {
      return fallbackData;
    }
  }
  if (options?.method === 'DELETE') {
    const id = url.split('/').pop() || '';
    return localStore.deleteItem(key, id, fallbackData);
  }
  // Default GET
  return localStore.get(key, fallbackData);
};

// Database Service
export const db = {
  status: {
    check: async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        return res.ok;
      } catch (e) {
        return false;
      }
    }
  },
  users: {
    getAll: async () => safeFetch(`${API_URL}/users`, undefined, 'users', INITIAL_USERS),
    getById: async (id: string) => {
      const users = await safeFetch(`${API_URL}/users`, undefined, 'users', INITIAL_USERS);
      return users.find((u: any) => u.id === id);
    },
    create: async (user: Omit<User, 'id' | 'lastAccess'>) => safeFetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }, 'users'),
    update: async (id: string, updates: Partial<User>) => safeFetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'users'),
    delete: async (id: string) => safeFetch(`${API_URL}/users/${id}`, { method: 'DELETE' }, 'users'),
    incrementLeads: async (id: string) => {
      try {
        const res = await fetch(`${API_URL}/users/${id}/increment-leads`, { method: 'POST' });
        if (res.ok) return res.json();
      } catch (e) {
        // Fallback
      }
      
      const users = localStore.get('users', INITIAL_USERS);
      const today = new Date().toISOString().split('T')[0];
      const updatedUsers = users.map((u: any) => {
        if (u.id === id) {
          const count = u.last_lead_date === today ? (u.daily_lead_count || 0) + 1 : 1;
          return { ...u, daily_lead_count: count, last_lead_date: today };
        }
        return u;
      });
      localStore.set('users', updatedUsers);
      return { success: true };
    }
  },

  commissions: {
    getAll: async (role: string = 'vendedor', userGroup?: string) => {
      const params = new URLSearchParams({ role });
      if (userGroup) params.append('group', userGroup);
      return safeFetch(`${API_URL}/commissions?${params.toString()}`, undefined, 'commissions', INITIAL_COMMISSIONS);
    },
    create: async (comm: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...comm, criado_por: userId }),
    }, 'commissions'),
    update: async (id: string, updates: Partial<CommissionTable>, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'commissions'),
    delete: async (id: string, userRole: string, userId: string) => safeFetch(`${API_URL}/commissions/${id}`, { method: 'DELETE' }, 'commissions'),
    deleteMany: async (ids: string[], userRole: string, userId: string) => {
      try {
        const res = await fetch(`${API_URL}/commissions/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) return res.json();
      } catch (e) {
        // Fallback
      }
      
      const items = localStore.get('commissions');
      localStore.set('commissions', items.filter((i: any) => !ids.includes(i.id)));
      return { success: true };
    },
    deleteAll: async (userRole: string, userId: string) => {
      try {
        const res = await fetch(`${API_URL}/commissions/delete-all`, { method: 'POST' });
        if (res.ok) return res.json();
      } catch (e) {
        // Fallback
      }
      
      localStore.set('commissions', []);
      return { success: true };
    },
    import: async (comms: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[], userRole: string, userId: string) => {
      // Try API first
      try {
        // For bulk import, we might want a specific endpoint, but for now we'll try to loop or just use local if it fails
        // Actually, let's just use local if we're in a static-ish environment to be safe
        const isStatic = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('vercel.app');
        
        if (!isStatic) {
          for (const comm of comms) {
            await db.commissions.create(comm, userRole, userId);
          }
          return comms;
        }
      } catch (e) {
        // Fallback to local
      }

      const existing = localStore.get('commissions');
      const now = new Date().toISOString();
      const newComms = comms.map(c => ({ 
        ...c, 
        id: uuidv4(),
        status: 'Ativo',
        data_criacao: now,
        data_atualizacao: now,
        criado_por: userId
      }));
      localStore.set('commissions', [...existing, ...newComms]);
      return newComms;
    }
  },

  sales: {
    getAll: async () => safeFetch(`${API_URL}/sales`, undefined, 'sales', INITIAL_SALES),
    create: async (sale: any, user: User) => safeFetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sale, seller: user.name }),
    }, 'sales'),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'sales'),
    delete: async (id: string) => safeFetch(`${API_URL}/sales/${id}`, { method: 'DELETE' }, 'sales')
  },

  leads: {
    getAll: async () => safeFetch(`${API_URL}/leads`, undefined, 'leads', INITIAL_LEADS),
    create: async (lead: any) => safeFetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    }, 'leads'),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'leads'),
    delete: async (id: string) => safeFetch(`${API_URL}/leads/${id}`, { method: 'DELETE' }, 'leads'),
    import: async (leadsData: any[]) => {
      try {
        const isStatic = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('vercel.app');
        
        if (!isStatic) {
          for (const lead of leadsData) {
            await db.leads.create(lead);
          }
          return leadsData;
        }
      } catch (e) {
        // Fallback
      }

      const existing = localStore.get('leads');
      const now = new Date().toISOString();
      const newLeads = leadsData.map(l => ({ 
        ...l, 
        id: uuidv4(),
        createdAt: now,
        status: l.status || 'Novo'
      }));
      localStore.set('leads', [...existing, ...newLeads]);
      return newLeads;
    }
  },

  requests: {
    getAll: async () => safeFetch(`${API_URL}/access-requests`, undefined, 'requests', INITIAL_REQUESTS),
    getByUser: async (userId: string) => {
      const requests = await safeFetch(`${API_URL}/access-requests`, undefined, 'requests', INITIAL_REQUESTS);
      return requests.filter((r: any) => r.usuario_id === userId);
    },
    create: async (req: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>) => safeFetch(`${API_URL}/access-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }, 'requests'),
    updateStatus: async (id: string, status: AccessRequest['status'], adminObservation?: string, adminId?: string) => safeFetch(`${API_URL}/access-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, observacao_admin: adminObservation, criado_por_admin: adminId }),
    }, 'requests')
  },

  credentials: {
    getAll: async () => safeFetch(`${API_URL}/credentials`, undefined, 'credentials'),
    getByUser: async (userId: string) => {
      const credentials = await safeFetch(`${API_URL}/credentials`, undefined, 'credentials');
      return credentials.filter((c: any) => c.usuario_id === userId);
    },
    create: async (cred: Omit<PlatformCredential, 'id' | 'data_criacao' | 'data_atualizacao'>) => safeFetch(`${API_URL}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    }, 'credentials'),
    update: async (id: string, updates: Partial<PlatformCredential>) => safeFetch(`${API_URL}/credentials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'credentials'),
    delete: async (id: string) => safeFetch(`${API_URL}/credentials/${id}`, { method: 'DELETE' }, 'credentials')
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
    getAll: async () => safeFetch(`${API_URL}/commission-groups`, undefined, 'commissionGroups', INITIAL_COMMISSION_GROUPS),
    getByBank: async (bankId: string) => {
      const groups = await safeFetch(`${API_URL}/commission-groups`, undefined, 'commissionGroups', INITIAL_COMMISSION_GROUPS);
      return groups.filter((g: any) => g.banco_id === bankId);
    },
    create: async (group: any) => safeFetch(`${API_URL}/commission-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    }, 'commissionGroups'),
    delete: async (id: string) => safeFetch(`${API_URL}/commission-groups/${id}`, { method: 'DELETE' }, 'commissionGroups')
  },

  bancos: {
    getAll: async () => safeFetch(`${API_URL}/banks`, undefined, 'banks', INITIAL_BANKS),
    create: async (bank: Omit<Bank, 'id' | 'criado_em'>) => safeFetch(`${API_URL}/banks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bank),
    }, 'banks'),
    update: async (id: string, updates: Partial<Bank>) => safeFetch(`${API_URL}/banks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'banks'),
    delete: async (id: string) => safeFetch(`${API_URL}/banks/${id}`, { method: 'DELETE' }, 'banks')
  },

  payment_requests: {
    getAll: async () => safeFetch(`${API_URL}/payment-requests`, undefined, 'payment_requests'),
    create: async (req: any) => safeFetch(`${API_URL}/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }, 'payment_requests'),
    update: async (id: string, updates: any) => safeFetch(`${API_URL}/payment-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 'payment_requests')
  },

  settings: {
    get: async () => safeFetch(`${API_URL}/settings`, undefined, 'settings', {}),
    update: async (newSettings: any) => safeFetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }, 'settings')
  },
  academy: {
    getAll: async () => safeFetch(`${API_URL}/academy`, undefined, 'academy'),
    create: async (content: any) => safeFetch(`${API_URL}/academy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    }, 'academy'),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/academy/${id}`, { method: 'DELETE' }, 'academy'),
    trackView: async (conteudo_id: string, usuario_id: string) => safeFetch(`${API_URL}/academy/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo_id, usuario_id }),
    }, 'academyViews')
  },
  academyViews: {
    getAll: async () => safeFetch(`${API_URL}/academy/views`, undefined, 'academyViews'),
    register: async (conteudo_id: string, usuario_id: string) => {
      await db.academy.trackView(conteudo_id, usuario_id);
    },
    getUserViews: async (usuario_id: string) => {
      const views = await safeFetch(`${API_URL}/academy/views`, undefined, 'academyViews');
      return views.filter((v: any) => v.usuario_id === usuario_id);
    }
  },
  announcements: {
    getAll: async () => safeFetch(`${API_URL}/announcements`, undefined, 'announcements'),
    create: async (announcement: any) => safeFetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcement),
    }, 'announcements'),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/announcements/${id}`, { method: 'DELETE' }, 'announcements')
  },
  campaigns: {
    getAll: async () => safeFetch(`${API_URL}/campaigns`, undefined, 'campaigns'),
    create: async (campaign: any) => safeFetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    }, 'campaigns'),
    update: async (id: string, updates: any) => ({}),
    delete: async (id: string) => safeFetch(`${API_URL}/campaigns/${id}`, { method: 'DELETE' }, 'campaigns')
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
