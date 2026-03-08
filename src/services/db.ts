import { v4 as uuidv4 } from 'uuid';
import { User, CommissionTable, AccessRequest, PlatformCredential, ExcelImportLog, CommissionGroup, AcademyContent, AcademyView, Bank, PaymentRequest, Announcement } from '@/types';

// Initial Data
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador Demo', email: 'agoraq@agoraqoficial.com', role: 'admin', status: 'Ativo', lastAccess: new Date().toISOString(), password: 'admin', saldo_acumulado: 0, saldo_pago: 0 },
  { id: '2', name: 'Supervisor Vendas', email: 'supervisor@agoraqoficial.com.br', role: 'supervisor', status: 'Ativo', lastAccess: new Date().toISOString(), password: 'sup', saldo_acumulado: 0, saldo_pago: 0 },
  { id: '3', name: 'Vendedor Exemplo', email: 'vendedor@agoraqoficial.com.br', role: 'vendedor', status: 'Ativo', lastAccess: new Date().toISOString(), password: 'vend', saldo_acumulado: 1500, saldo_pago: 500, pix_key: 'vendedor@pix.com' },
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
  { id: '1', name: 'INSS Normal', bank: 'Banco Pan', product: 'Empréstimo Consignado', term: '84x', range: 'R$ 1.000 - R$ 50.000', totalCommission: 12, maxPercent: 12, sellerPercent: 12, status: 'Ativo', updatedAt: new Date().toISOString() },
  { id: '2', name: 'Portabilidade', bank: 'Itaú', product: 'Portabilidade', term: '72x', range: 'Qualquer valor', totalCommission: 6, maxPercent: 6, sellerPercent: 6, status: 'Ativo', updatedAt: new Date().toISOString() },
];

const INITIAL_SALES = [
  { id: '1', date: '2024-03-01', proposal: '123456', client: 'Carlos Oliveira', cpf: '123.456.789-00', phone: '(11) 99999-9999', bank: 'Banco Pan', table: 'INSS Normal', value: 5000.00, commission: 0.10, companyCommission: 0.15, bankCommission: 0.18, status: 'Pago', seller: 'Vendedor Exemplo' },
  { id: '2', date: '2024-03-02', proposal: '123457', client: 'Ana Souza', cpf: '222.333.444-55', phone: '(11) 98888-8888', bank: 'Itaú', table: 'Portabilidade', value: 12000.00, commission: 0.08, companyCommission: 0.12, bankCommission: 0.15, status: 'Aguardando', seller: 'Ana Vendedora' },
  { id: '3', date: '2024-03-03', proposal: '123458', client: 'Roberto Lima', cpf: '555.666.777-88', phone: '(21) 97777-7777', bank: 'BMG', table: 'Cartão Benefício', value: 3500.00, commission: 0.12, companyCommission: 0.18, bankCommission: 0.22, status: 'Pago', seller: 'Vendedor Exemplo' },
  { id: '4', date: '2024-03-04', proposal: '123459', client: 'Fernanda Costa', cpf: '999.888.777-66', phone: '(31) 96666-6666', bank: 'C6 Bank', table: 'Refinanciamento', value: 8900.00, commission: 0.09, companyCommission: 0.14, bankCommission: 0.17, status: 'Em Análise', seller: 'Carlos Vendedor' },
];

const INITIAL_REQUESTS: AccessRequest[] = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', bank: 'Banco Pan', sellerName: 'Vendedor Exemplo', cpf: '111.222.333-44', status: 'Pendente', createdAt: new Date().toISOString(), fgtsGroup: 'DIAMANTE', cltGroup: 'Fortuna 8D' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', bank: 'Itaú', sellerName: 'Ana Vendedora', cpf: '555.666.777-88', status: 'Aprovado', createdAt: new Date().toISOString(), fgtsGroup: 'OURO', cltGroup: 'Líder CLT' },
];

const INITIAL_COMMISSION_GROUPS: CommissionGroup[] = [
  { id: '1', name: 'DIAMANTE', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '2', name: 'OURO', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '3', name: 'PRATA', type: 'FGTS', banco_id: 'b1', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '4', name: 'Fortuna 8D', type: 'CLT', banco_id: 'b2', status: 'Ativo', createdAt: new Date().toISOString() },
  { id: '5', name: 'Líder CLT', type: 'CLT', banco_id: 'b2', status: 'Ativo', createdAt: new Date().toISOString() },
];

// Helper to get/set from localStorage
const getStorage = <T>(key: string, initial: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    localStorage.removeItem(key);
  }
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

const setStorage = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Database Service
export const db = {
  users: {
    getAll: () => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      
      // Ensure admin exists and has correct email (migration/recovery fix)
      const adminIndex = users.findIndex(u => u.id === '1');
      
      if (adminIndex === -1) {
        // Admin missing, restore it
        const adminUser = INITIAL_USERS.find(u => u.id === '1');
        if (adminUser) {
          users.push(adminUser);
          setStorage('users', users);
        }
      } else if (users[adminIndex].email !== 'agoraq@agoraqoficial.com') {
        // Fix email if incorrect
        users[adminIndex].email = 'agoraq@agoraqoficial.com';
        setStorage('users', users);
      }
      
      return users;
    },
    getById: (id: string) => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      
      // Ensure admin exists and has correct email (migration/recovery fix)
      const adminIndex = users.findIndex(u => u.id === '1');
      
      if (adminIndex === -1) {
        const adminUser = INITIAL_USERS.find(u => u.id === '1');
        if (adminUser) {
          users.push(adminUser);
          setStorage('users', users);
        }
      } else if (users[adminIndex].email !== 'agoraq@agoraqoficial.com') {
        users[adminIndex].email = 'agoraq@agoraqoficial.com';
        setStorage('users', users);
      }
      
      return users.find(u => u.id === id);
    },
    create: (user: Omit<User, 'id' | 'lastAccess'>) => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      const newUser = { ...user, id: uuidv4(), lastAccess: new Date().toISOString() };
      users.push(newUser);
      setStorage('users', users);
      return newUser;
    },
    update: (id: string, updates: Partial<User>) => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        setStorage('users', users);
        return users[index];
      }
      return null;
    },
    delete: (id: string) => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      const filtered = users.filter(u => u.id !== id);
      setStorage('users', filtered);
    }
  },

  commissions: {
    getAll: () => getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS),
    create: (comm: Omit<CommissionTable, 'id' | 'updatedAt'>) => {
      // Validation: Seller Percent <= Max Percent
      if (comm.sellerPercent > comm.maxPercent) {
        throw new Error('O percentual do vendedor não pode ser maior que o percentual máximo da tabela.');
      }
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const newComm = { ...comm, id: uuidv4(), updatedAt: new Date().toISOString() };
      commissions.push(newComm);
      setStorage('commissions', commissions);
      return newComm;
    },
    update: (id: string, updates: Partial<CommissionTable>) => {
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const index = commissions.findIndex(c => c.id === id);
      if (index !== -1) {
        const currentComm = commissions[index];
        const updatedComm = { ...currentComm, ...updates, updatedAt: new Date().toISOString() };
        
        // Validation
        if (updatedComm.sellerPercent > updatedComm.maxPercent) {
          throw new Error('O percentual do vendedor não pode ser maior que o percentual máximo da tabela.');
        }
        
        commissions[index] = updatedComm;
        setStorage('commissions', commissions);
        return updatedComm;
      }
      return null;
    },
    delete: (id: string) => {
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const filtered = commissions.filter(c => c.id !== id);
      setStorage('commissions', filtered);
    },
    import: (comms: Omit<CommissionTable, 'id' | 'updatedAt'>[]) => {
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const newComms = comms.map(c => {
        if (c.sellerPercent > c.maxPercent) {
          throw new Error(`Erro na importação: O percentual do vendedor (${c.sellerPercent}%) não pode ser maior que o máximo (${c.maxPercent}%) na tabela ${c.name}.`);
        }
        return { ...c, id: uuidv4(), updatedAt: new Date().toISOString() };
      });
      commissions.push(...newComms);
      setStorage('commissions', commissions);
      return newComms;
    }
  },

  sales: {
    getAll: () => getStorage<any[]>('sales', INITIAL_SALES),
    create: (sale: any) => {
      const sales = getStorage<any[]>('sales', INITIAL_SALES);
      const newSale = { ...sale, id: uuidv4() };
      sales.push(newSale);
      setStorage('sales', sales);
      return newSale;
    },
    update: (id: string, updates: any) => {
      const sales = getStorage<any[]>('sales', INITIAL_SALES);
      const index = sales.findIndex(s => s.id === id);
      if (index !== -1) {
        sales[index] = { ...sales[index], ...updates };
        setStorage('sales', sales);
        return sales[index];
      }
      return null;
    },
    delete: (id: string) => {
      const sales = getStorage<any[]>('sales', INITIAL_SALES);
      const filtered = sales.filter(s => s.id !== id);
      setStorage('sales', filtered);
    }
  },

  requests: {
    getAll: () => getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS),
    create: (req: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>) => {
      const requests = getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS);
      const newReq: AccessRequest = { 
        ...req, 
        id: uuidv4(), 
        createdAt: new Date().toISOString(), 
        status: 'Aguardando Documentos', // Default status for new requests
        tipo_solicitacao: req.tipo_solicitacao || 'novo_usuario'
      };
      requests.push(newReq);
      setStorage('access_requests', requests);
      return newReq;
    },
    updateStatus: (id: string, status: AccessRequest['status'], adminObservation?: string, adminId?: string) => {
      const requests = getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS);
      const index = requests.findIndex(r => r.id === id);
      if (index !== -1) {
        requests[index].status = status;
        if (adminObservation) requests[index].observacao_admin = adminObservation;
        if (adminId) requests[index].criado_por_admin = adminId;
        if (status === 'Finalizado' || status === 'Recusado') {
          requests[index].data_finalizacao = new Date().toISOString();
        }
        setStorage('access_requests', requests);
        return requests[index];
      }
      return null;
    }
  },

  credentials: {
    getAll: () => getStorage<PlatformCredential[]>('credentials', []),
    create: (cred: Omit<PlatformCredential, 'id' | 'updatedAt'>) => {
      const credentials = getStorage<PlatformCredential[]>('credentials', []);
      const newCred = { ...cred, id: uuidv4(), updatedAt: new Date().toISOString() };
      credentials.push(newCred);
      setStorage('credentials', credentials);
      return newCred;
    },
    update: (id: string, updates: Partial<PlatformCredential>) => {
      const credentials = getStorage<PlatformCredential[]>('credentials', []);
      const index = credentials.findIndex(c => c.id === id);
      if (index !== -1) {
        credentials[index] = { ...credentials[index], ...updates, updatedAt: new Date().toISOString() };
        setStorage('credentials', credentials);
        return credentials[index];
      }
      return null;
    },
    delete: (id: string) => {
      const credentials = getStorage<PlatformCredential[]>('credentials', []);
      const filtered = credentials.filter(c => c.id !== id);
      setStorage('credentials', filtered);
    }
  },

  logs: {
    getAll: () => getStorage<ExcelImportLog[]>('import_logs', []),
    add: (log: Omit<ExcelImportLog, 'id' | 'date'>) => {
      const logs = getStorage<ExcelImportLog[]>('import_logs', []);
      const newLog = { ...log, id: uuidv4(), date: new Date().toISOString() };
      logs.push(newLog);
      setStorage('import_logs', logs);
      return newLog;
    }
  },

  commissionGroups: {
    getAll: () => getStorage<CommissionGroup[]>('commission_groups', INITIAL_COMMISSION_GROUPS),
    getByBank: (bankId: string) => getStorage<CommissionGroup[]>('commission_groups', INITIAL_COMMISSION_GROUPS).filter(g => g.banco_id === bankId),
    create: (group: Omit<CommissionGroup, 'id' | 'createdAt'>) => {
      const groups = getStorage<CommissionGroup[]>('commission_groups', INITIAL_COMMISSION_GROUPS);
      const newGroup = { ...group, id: uuidv4(), createdAt: new Date().toISOString() };
      groups.push(newGroup);
      setStorage('commission_groups', groups);
      return newGroup;
    },
    delete: (id: string) => {
      const groups = getStorage<CommissionGroup[]>('commission_groups', INITIAL_COMMISSION_GROUPS);
      const filtered = groups.filter(g => g.id !== id);
      setStorage('commission_groups', filtered);
    }
  },

  bancos: {
    getAll: () => getStorage<Bank[]>('bancos_v1', INITIAL_BANKS),
    create: (bank: Omit<Bank, 'id' | 'criado_em'>) => {
      const bancos = getStorage<Bank[]>('bancos_v1', INITIAL_BANKS);
      const newBank = { ...bank, id: uuidv4(), criado_em: new Date().toISOString() };
      bancos.push(newBank);
      setStorage('bancos_v1', bancos);
      return newBank;
    },
    update: (id: string, updates: Partial<Bank>) => {
      const bancos = getStorage<Bank[]>('bancos_v1', INITIAL_BANKS);
      const index = bancos.findIndex(b => b.id === id);
      if (index !== -1) {
        bancos[index] = { ...bancos[index], ...updates };
        setStorage('bancos_v1', bancos);
        return bancos[index];
      }
      return null;
    }
  },

  payment_requests: {
    getAll: () => getStorage<PaymentRequest[]>('payment_requests', []),
    create: (req: Omit<PaymentRequest, 'id' | 'data_solicitacao' | 'status'>) => {
      const requests = getStorage<PaymentRequest[]>('payment_requests', []);
      const newReq: PaymentRequest = { 
        ...req, 
        id: uuidv4(), 
        data_solicitacao: new Date().toISOString(),
        status: 'Pendente'
      };
      requests.push(newReq);
      setStorage('payment_requests', requests);
      return newReq;
    },
    update: (id: string, updates: Partial<PaymentRequest>) => {
      const requests = getStorage<PaymentRequest[]>('payment_requests', []);
      const index = requests.findIndex(r => r.id === id);
      if (index !== -1) {
        requests[index] = { ...requests[index], ...updates };
        setStorage('payment_requests', requests);
        return requests[index];
      }
      return null;
    }
  },

  settings: {
    get: () => {
      const stored = localStorage.getItem('agoraq_settings');
      if (stored) return JSON.parse(stored);
      const initial = { canvaLink: 'https://www.canva.com/' };
      localStorage.setItem('agoraq_settings', JSON.stringify(initial));
      return initial;
    },
    update: (newSettings: { canvaLink?: string }) => {
      const current = db.settings.get();
      const updated = { ...current, ...newSettings };
      localStorage.setItem('agoraq_settings', JSON.stringify(updated));
      return updated;
    }
  },
  academy: {
    getAll: (): AcademyContent[] => {
      const data = localStorage.getItem('academy_conteudos');
      if (!data) {
        const initial: AcademyContent[] = [
          {
            id: uuidv4(),
            titulo: 'Manual de Boas Vindas',
            categoria: 'Informativo',
            descricao: 'Bem-vindo ao AgoraQ! Conheça nossa cultura e processos básicos.',
            arquivo_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            tipo_arquivo: 'pdf',
            visibilidade: 'todos',
            versao: '1.0',
            criado_por: 'sistema',
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            status: 'Ativo'
          },
          {
            id: uuidv4(),
            titulo: 'Treinamento de Vendas FGTS',
            categoria: 'Treinamento',
            descricao: 'Aprenda a vender antecipação de FGTS com as melhores taxas.',
            arquivo_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            tipo_arquivo: 'video',
            visibilidade: 'vendedores',
            versao: '2.1',
            criado_por: 'sistema',
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            status: 'Ativo'
          }
        ];
        localStorage.setItem('academy_conteudos', JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    },
    create: (content: Omit<AcademyContent, 'id' | 'criado_em' | 'atualizado_em'>) => {
      const all = db.academy.getAll();
      const now = new Date().toISOString();
      const newContent: AcademyContent = {
        ...content,
        id: uuidv4(),
        criado_em: now,
        atualizado_em: now
      };
      localStorage.setItem('academy_conteudos', JSON.stringify([...all, newContent]));
      return newContent;
    },
    update: (id: string, updates: Partial<AcademyContent>) => {
      const all = db.academy.getAll();
      const updated = all.map(item => 
        item.id === id ? { ...item, ...updates, atualizado_em: new Date().toISOString() } : item
      );
      localStorage.setItem('academy_conteudos', JSON.stringify(updated));
    },
    delete: (id: string) => {
      const all = db.academy.getAll();
      localStorage.setItem('academy_conteudos', JSON.stringify(all.filter(i => i.id !== id)));
    }
  },
  academyViews: {
    getAll: (): AcademyView[] => {
      const data = localStorage.getItem('academy_visualizacoes');
      return data ? JSON.parse(data) : [];
    },
    register: (conteudo_id: string, usuario_id: string) => {
      const all = db.academyViews.getAll();
      const exists = all.find(v => v.conteudo_id === conteudo_id && v.usuario_id === usuario_id);
      if (exists) return;

      const newView: AcademyView = {
        id: uuidv4(),
        conteudo_id,
        usuario_id,
        data_visualizacao: new Date().toISOString()
      };
      localStorage.setItem('academy_visualizacoes', JSON.stringify([...all, newView]));
    },
    getUserViews: (usuario_id: string): string[] => {
      return db.academyViews.getAll()
        .filter(v => v.usuario_id === usuario_id)
        .map(v => v.conteudo_id);
    }
  },
  announcements: {
    getAll: () => getStorage<Announcement[]>('announcements', []),
    create: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
      const announcements = getStorage<Announcement[]>('announcements', []);
      const newAnnouncement = { 
        ...announcement, 
        id: uuidv4(), 
        createdAt: new Date().toISOString() 
      };
      announcements.push(newAnnouncement);
      setStorage('announcements', announcements);
      return newAnnouncement;
    },
    update: (id: string, updates: Partial<Announcement>) => {
      const announcements = getStorage<Announcement[]>('announcements', []);
      const index = announcements.findIndex(a => a.id === id);
      if (index !== -1) {
        announcements[index] = { ...announcements[index], ...updates };
        setStorage('announcements', announcements);
        return announcements[index];
      }
      return null;
    },
    delete: (id: string) => {
      const announcements = getStorage<Announcement[]>('announcements', []);
      const filtered = announcements.filter(a => a.id !== id);
      setStorage('announcements', filtered);
    }
  }
};
