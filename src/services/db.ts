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
      // Hash password if provided
      const password = user.password ? hashPassword(user.password) : hashPassword('123456');
      const newUser = { ...user, password, id: uuidv4(), lastAccess: new Date().toISOString() };
      users.push(newUser);
      setStorage('users', users);
      return newUser;
    },
    update: (id: string, updates: Partial<User>) => {
      const users = getStorage<User[]>('users', INITIAL_USERS);
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        const finalUpdates = { ...updates };
        if (updates.password) {
          finalUpdates.password = hashPassword(updates.password);
        }
        users[index] = { ...users[index], ...finalUpdates };
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
    getAll: (role: string = 'vendedor', userGroup?: string) => {
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      
      if (role === 'admin' || role === 'supervisor') {
        return commissions;
      }

      // Filter by group for sellers and hide sensitive fields
      return commissions
        .map(c => {
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
        }) as any[];
    },
    create: (comm: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>, userRole: string, userId: string) => {
      if (userRole !== 'admin') {
        throw new Error('Acesso negado. Apenas administradores podem criar tabelas.');
      }

      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      
      if (commissions.some(c => c.codigo_tabela === comm.codigo_tabela)) {
        throw new Error(`O código de tabela ${comm.codigo_tabela} já existe.`);
      }

      const now = new Date().toISOString();
      const newComm: CommissionTable = { 
        ...comm, 
        id: uuidv4(), 
        data_criacao: now, 
        data_atualizacao: now,
      };
      commissions.push(newComm);
      setStorage('commissions', commissions);
      return newComm;
    },
    update: (id: string, updates: Partial<CommissionTable>, userRole: string, userId: string) => {
      if (userRole !== 'admin') {
        throw new Error('Acesso negado. Apenas administradores podem atualizar tabelas.');
      }
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const index = commissions.findIndex(c => c.id === id);
      if (index !== -1) {
        const currentComm = commissions[index];
        const updatedComm = { ...currentComm, ...updates };

        updatedComm.data_atualizacao = new Date().toISOString();
        commissions[index] = updatedComm;
        setStorage('commissions', commissions);
        return updatedComm;
      }
      return null;
    },
    delete: (id: string, userRole: string, userId: string) => {
      if (userRole !== 'admin') {
        db.logs.addSecurityLog({
          userId,
          action: 'UNAUTHORIZED_DELETE_COMMISSION',
          resource: `commissions/${id}`,
          details: 'Tentativa de exclusão de tabela por não-admin'
        });
        throw new Error('Acesso negado. Apenas administradores podem excluir tabelas.');
      }
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const filtered = commissions.filter(c => c.id !== id);
      setStorage('commissions', filtered);
    },
    import: (comms: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[], userRole: string, userId: string) => {
      if (userRole !== 'admin') {
        db.logs.addSecurityLog({
          userId,
          action: 'UNAUTHORIZED_IMPORT_COMMISSION',
          resource: 'commissions/import',
          details: 'Tentativa de importação de tabelas por não-admin'
        });
        throw new Error('Acesso negado. Apenas administradores podem importar tabelas.');
      }
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      const now = new Date().toISOString();
      
      const newComms = comms.map(c => {
        return { 
          ...c, 
          id: uuidv4(), 
          data_criacao: now, 
          data_atualizacao: now,
        };
      });
      
      // Filter out duplicates (code + group combination)
      const existingKeys = new Set(commissions.map(c => `${c.codigo_tabela}_${c.grupo_comissao}`));
      const filteredNewComms = newComms.filter(c => !existingKeys.has(`${c.codigo_tabela}_${c.grupo_comissao}`));
      
      commissions.push(...filteredNewComms);
      setStorage('commissions', commissions);
      return filteredNewComms;
    }
  },

  sales: {
    getAll: () => getStorage<any[]>('sales', INITIAL_SALES),
    create: (sale: any, user: User) => {
      const sales = getStorage<any[]>('sales', INITIAL_SALES);
      const commissions = getStorage<CommissionTable[]>('commissions', INITIAL_COMMISSIONS);
      
      // Automatic Commission Calculation based on seller's group
      const userGroup = user.grupo_comissao;
      const table = commissions.find(c => 
        c.banco === sale.bank && 
        c.operacao === sale.operacao &&
        sale.value >= c.faixa_valor_min &&
        sale.value <= c.faixa_valor_max
      );

      let sellerCommissionPercent = 0;
      let companyCommissionPercent = 0;
      let bankCommissionPercent = 0;

      if (table) {
        if (userGroup === 'MASTER') sellerCommissionPercent = table.comissao_master;
        else if (userGroup === 'OURO') sellerCommissionPercent = table.comissao_ouro;
        else if (userGroup === 'PRATA') sellerCommissionPercent = table.comissao_prata;
        else if (userGroup === 'PLUS') sellerCommissionPercent = table.comissao_plus;
        
        bankCommissionPercent = table.percentual_total_empresa;
        companyCommissionPercent = bankCommissionPercent - sellerCommissionPercent;
      }

      const newSale = { 
        ...sale, 
        id: uuidv4(),
        commission: (sale.value * sellerCommissionPercent) / 100,
        companyCommission: (sale.value * companyCommissionPercent) / 100,
        bankCommission: (sale.value * bankCommissionPercent) / 100,
        table: table ? table.nome_tabela : sale.table,
        seller: user.name
      };
      
      sales.push(newSale);
      setStorage('sales', sales);

      // Update user balance
      const users = getStorage<User[]>('users', INITIAL_USERS);
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].saldo_acumulado = (users[userIndex].saldo_acumulado || 0) + newSale.commission;
        setStorage('users', users);
      }

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

  leads: {
    getAll: () => getStorage<any[]>('leads', INITIAL_LEADS),
    create: (lead: any) => {
      const leads = getStorage<any[]>('leads', INITIAL_LEADS);
      const newLead = { ...lead, id: uuidv4(), createdAt: new Date().toISOString(), status: lead.status || 'Novo' };
      leads.push(newLead);
      setStorage('leads', leads);
      return newLead;
    },
    import: (leadsData: any[]) => {
      const leads = getStorage<any[]>('leads', INITIAL_LEADS);
      const now = new Date().toISOString();
      const newLeads = leadsData.map(l => ({
        ...l,
        id: uuidv4(),
        createdAt: now,
        status: l.status || 'Novo'
      }));
      leads.push(...newLeads);
      setStorage('leads', leads);
      return newLeads;
    }
  },

  requests: {
    getAll: () => getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS),
    getByUser: (userId: string) => getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS).filter(r => r.usuario_id === userId),
    create: (req: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>) => {
      const requests = getStorage<AccessRequest[]>('access_requests', INITIAL_REQUESTS);
      const now = new Date().toISOString();
      const newReq: AccessRequest = { 
        ...req, 
        id: uuidv4(), 
        createdAt: now, 
        data_criacao: now,
        status: 'Pendente', // Default status for new requests
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
        if (status === 'Finalizado' || status === 'Aprovado' || status === 'Recusado') {
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
    getByUser: (userId: string) => getStorage<PlatformCredential[]>('credentials', []).filter(c => c.usuario_id === userId),
    create: (cred: Omit<PlatformCredential, 'id' | 'data_criacao' | 'data_atualizacao'>) => {
      const credentials = getStorage<PlatformCredential[]>('credentials', []);
      const now = new Date().toISOString();
      const newCred: PlatformCredential = { 
        ...cred, 
        id: uuidv4(), 
        data_criacao: now, 
        data_atualizacao: now,
        // Map old fields if provided for backward compatibility
        bank: cred.banco_nome,
        link: cred.link_acesso,
        username: cred.login,
        password: cred.senha,
        updatedAt: now
      };
      credentials.push(newCred);
      setStorage('credentials', credentials);
      return newCred;
    },
    update: (id: string, updates: Partial<PlatformCredential>) => {
      const credentials = getStorage<PlatformCredential[]>('credentials', []);
      const index = credentials.findIndex(c => c.id === id);
      if (index !== -1) {
        const now = new Date().toISOString();
        const updated = { 
          ...credentials[index], 
          ...updates, 
          data_atualizacao: now,
          updatedAt: now
        };
        
        // Sync old fields
        if (updates.banco_nome) updated.bank = updates.banco_nome;
        if (updates.link_acesso) updated.link = updates.link_acesso;
        if (updates.login) updated.username = updates.login;
        if (updates.senha) updated.password = updates.senha;

        credentials[index] = updated;
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
    },
    getSecurityLogs: () => getStorage<any[]>('security_logs', []),
    addSecurityLog: (log: { userId: string; action: string; resource: string; details?: string }) => {
      const logs = getStorage<any[]>('security_logs', []);
      const newLog = { ...log, id: uuidv4(), date: new Date().toISOString() };
      logs.push(newLog);
      setStorage('security_logs', logs);
      return newLog;
    },
    getImportLogs: () => getStorage<any[]>('log_importacoes', []),
    addImportLog: (log: any) => {
      const logs = getStorage<any[]>('log_importacoes', []);
      const newLog = { ...log, id: uuidv4(), data: new Date().toISOString() };
      logs.push(newLog);
      setStorage('log_importacoes', logs);
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
        const oldStatus = requests[index].status;
        requests[index] = { ...requests[index], ...updates };
        setStorage('payment_requests', requests);

        if (oldStatus !== 'Pago' && updates.status === 'Pago') {
          const users = getStorage<User[]>('users', INITIAL_USERS);
          const userIndex = users.findIndex(u => u.id === requests[index].usuario_id);
          if (userIndex !== -1) {
            users[userIndex].saldo_pago = (users[userIndex].saldo_pago || 0) + requests[index].valor;
            setStorage('users', users);
          }
        }
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
};
