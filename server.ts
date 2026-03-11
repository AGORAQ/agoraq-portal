import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

// Initialize Database Schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      lastAccess TEXT,
      avatar TEXT,
      password TEXT NOT NULL,
      grupo_comissao TEXT NOT NULL,
      fgtsGroup TEXT,
      cltGroup TEXT,
      othersGroup TEXT,
      pix_key TEXT,
      saldo_acumulado REAL DEFAULT 0,
      saldo_pago REAL DEFAULT 0,
      daily_lead_count INTEGER DEFAULT 0,
      last_lead_date TEXT
    );

    CREATE TABLE IF NOT EXISTS banks (
      id TEXT PRIMARY KEY,
      nome_banco TEXT NOT NULL,
      tipo_produto TEXT NOT NULL,
      percentual_maximo REAL DEFAULT 0,
      status TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commission_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      banco_id TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(banco_id) REFERENCES banks(id)
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      banco TEXT NOT NULL,
      produto TEXT NOT NULL,
      operacao TEXT NOT NULL,
      parcelas TEXT NOT NULL,
      codigo_tabela TEXT NOT NULL,
      nome_tabela TEXT NOT NULL,
      faixa_valor_min REAL NOT NULL,
      faixa_valor_max REAL NOT NULL,
      percentual_total_empresa REAL NOT NULL,
      comissao_master REAL NOT NULL,
      comissao_ouro REAL NOT NULL,
      comissao_prata REAL NOT NULL,
      comissao_plus REAL NOT NULL,
      status TEXT NOT NULL,
      criado_por TEXT NOT NULL,
      data_criacao TEXT NOT NULL,
      data_atualizacao TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      proposal TEXT NOT NULL,
      client TEXT NOT NULL,
      cpf TEXT NOT NULL,
      phone TEXT NOT NULL,
      bank TEXT NOT NULL,
      operacao TEXT NOT NULL,
      table_name TEXT NOT NULL,
      value REAL NOT NULL,
      commission REAL NOT NULL,
      companyCommission REAL NOT NULL,
      bankCommission REAL NOT NULL,
      status TEXT NOT NULL,
      seller TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      bank TEXT,
      banco_nome TEXT,
      sellerName TEXT,
      cpf TEXT,
      rg TEXT,
      phone TEXT,
      birthDate TEXT,
      userEmail TEXT,
      address TEXT,
      cep TEXT,
      street TEXT,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      requestedAccessType TEXT,
      pixKey TEXT,
      status TEXT NOT NULL,
      observation TEXT,
      createdAt TEXT NOT NULL,
      data_criacao TEXT,
      fgtsGroup TEXT,
      cltGroup TEXT,
      othersGroup TEXT,
      tipo_solicitacao TEXT,
      motivo_reset TEXT,
      observacao_admin TEXT,
      data_finalizacao TEXT,
      criado_por_admin TEXT,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS platform_credentials (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      banco_nome TEXT NOT NULL,
      login TEXT NOT NULL,
      senha TEXT,
      link_acesso TEXT NOT NULL,
      status TEXT NOT NULL,
      criado_por_admin TEXT NOT NULL,
      data_criacao TEXT NOT NULL,
      data_atualizacao TEXT NOT NULL,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      fileName TEXT NOT NULL,
      user TEXT NOT NULL,
      linesProcessed INTEGER NOT NULL,
      errorsFound INTEGER NOT NULL,
      errors TEXT
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      banco_id TEXT,
      grupo_id TEXT,
      valor REAL NOT NULL,
      chave_pix TEXT NOT NULL,
      status TEXT NOT NULL,
      data_solicitacao TEXT NOT NULL,
      data_aprovacao TEXT,
      data_pagamento TEXT,
      aprovado_por TEXT,
      observacao_admin TEXT,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academy_content (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT NOT NULL,
      arquivo_url TEXT NOT NULL,
      tipo_arquivo TEXT NOT NULL,
      visibilidade TEXT NOT NULL,
      grupo_id TEXT,
      versao TEXT NOT NULL,
      criado_por TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academy_views (
      id TEXT PRIMARY KEY,
      conteudo_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      data_visualizacao TEXT NOT NULL,
      FOREIGN KEY(conteudo_id) REFERENCES academy_content(id),
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      link TEXT,
      date TEXT NOT NULL,
      active INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      link TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Seed Initial Admin if not exists
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('agoraq@agoraqoficial.com');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, role, status, lastAccess, password, grupo_comissao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('1', 'Administrador Demo', 'agoraq@agoraqoficial.com', 'admin', 'Ativo', new Date().toISOString(), hashedPassword, 'MASTER');
  }

  // Seed Initial Banks if not exists
  const bankCount = db.prepare('SELECT COUNT(*) as count FROM banks').get() as { count: number };
  if (bankCount.count === 0) {
    const initialBanks = [
      ['b1', 'Banco Pan', 'Ambos', 15, 'Ativo', new Date().toISOString()],
      ['b2', 'Itaú', 'Ambos', 12, 'Ativo', new Date().toISOString()],
      ['b3', 'BMG', 'FGTS', 18, 'Ativo', new Date().toISOString()],
    ];
    const insertBank = db.prepare('INSERT INTO banks (id, nome_banco, tipo_produto, percentual_maximo, status, criado_em) VALUES (?, ?, ?, ?, ?, ?)');
    for (const b of initialBanks) {
      insertBank.run(...b);
    }
  }
}

initDb();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const lastAccess = new Date().toISOString();
      db.prepare('UPDATE users SET lastAccess = ? WHERE id = ?').run(lastAccess, user.id);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, lastAccess });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  });

  // Users
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, status, lastAccess, grupo_comissao, saldo_acumulado, saldo_pago FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role, status, grupo_comissao, password } = req.body;
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password || '123456', 10);
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, role, status, lastAccess, password, grupo_comissao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, email.trim().toLowerCase(), role, status, new Date().toISOString(), hashedPassword, grupo_comissao);
      res.json({ id, name, email, role, status, grupo_comissao });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'password');
    
    if (updates.password) {
      const hashedPassword = bcrypt.hashSync(updates.password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    }

    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => updates[f]);
      db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    res.json({ success: true });
  });

  app.post('/api/users/:id/increment-leads', (req, res) => {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const user = db.prepare('SELECT daily_lead_count, last_lead_date FROM users WHERE id = ?').get(id) as any;
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    let count = user.daily_lead_count || 0;
    if (user.last_lead_date !== today) {
      count = 0;
    }

    if (count >= 100) {
      return res.status(403).json({ error: 'Limite diário de 100 leads atingido.' });
    }

    db.prepare('UPDATE users SET daily_lead_count = ?, last_lead_date = ? WHERE id = ?').run(count + 1, today, id);
    res.json({ success: true, count: count + 1 });
  });

  app.delete('/api/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Banks
  app.get('/api/banks', (req, res) => {
    const banks = db.prepare('SELECT * FROM banks').all();
    res.json(banks);
  });

  app.post('/api/banks', (req, res) => {
    const { nome_banco, tipo_produto, percentual_maximo, status } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO banks (id, nome_banco, tipo_produto, percentual_maximo, status, criado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, nome_banco, tipo_produto, percentual_maximo, status, new Date().toISOString());
    res.json({ id, nome_banco, tipo_produto, percentual_maximo, status });
  });

  app.put('/api/banks/:id', (req, res) => {
    const { id } = req.params;
    const { nome_banco, tipo_produto, percentual_maximo, status } = req.body;
    db.prepare(`
      UPDATE banks SET nome_banco = ?, tipo_produto = ?, percentual_maximo = ?, status = ?
      WHERE id = ?
    `).run(nome_banco, tipo_produto, percentual_maximo, status, id);
    res.json({ success: true });
  });

  app.delete('/api/banks/:id', (req, res) => {
    db.prepare('DELETE FROM banks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Commission Groups
  app.get('/api/commission-groups', (req, res) => {
    const groups = db.prepare('SELECT * FROM commission_groups').all();
    res.json(groups);
  });

  app.post('/api/commission-groups', (req, res) => {
    const { name, type, banco_id, status } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO commission_groups (id, name, type, banco_id, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, type, banco_id, status, new Date().toISOString());
    res.json({ id, name, type, banco_id, status });
  });

  app.delete('/api/commission-groups/:id', (req, res) => {
    db.prepare('DELETE FROM commission_groups WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Commissions
  app.get('/api/commissions', (req, res) => {
    const commissions = db.prepare('SELECT * FROM commissions').all();
    res.json(commissions);
  });

  app.post('/api/commissions', (req, res) => {
    const comm = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO commissions (
        id, banco, produto, operacao, parcelas, codigo_tabela, nome_tabela, 
        faixa_valor_min, faixa_valor_max, percentual_total_empresa, 
        comissao_master, comissao_ouro, comissao_prata, comissao_plus, 
        status, criado_por, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, comm.banco, comm.produto, comm.operacao, comm.parcelas, comm.codigo_tabela, comm.nome_tabela,
      comm.faixa_valor_min, comm.faixa_valor_max, comm.percentual_total_empresa,
      comm.comissao_master, comm.comissao_ouro, comm.comissao_prata, comm.comissao_plus,
      comm.status, comm.criado_por, now, now
    );
    res.json({ id, ...comm, data_criacao: now, data_atualizacao: now });
  });

  app.delete('/api/commissions/:id', (req, res) => {
    db.prepare('DELETE FROM commissions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/commissions/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Invalid IDs' });
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM commissions WHERE id IN (${placeholders})`).run(...ids);
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', (req, res) => {
    const sales = db.prepare('SELECT * FROM sales').all();
    res.json(sales);
  });

  app.post('/api/sales', (req, res) => {
    const sale = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO sales (
        id, date, proposal, client, cpf, phone, bank, operacao, table_name, 
        value, commission, companyCommission, bankCommission, status, seller
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sale.date, sale.proposal, sale.client, sale.cpf, sale.phone, sale.bank, sale.operacao, sale.table_name || sale.table,
      sale.value, sale.commission, sale.companyCommission, sale.bankCommission, sale.status, sale.seller
    );

    // Update user balance if status is Pago
    if (sale.status === 'Pago' || sale.status === 'Paga') {
      db.prepare('UPDATE users SET saldo_acumulado = saldo_acumulado + ? WHERE name = ?').run(sale.commission, sale.seller);
    }

    res.json({ id, ...sale });
  });

  // Leads
  app.get('/api/leads', (req, res) => {
    const leads = db.prepare('SELECT * FROM leads').all();
    res.json(leads);
  });

  app.put('/api/leads/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  app.delete('/api/leads/:id', (req, res) => {
    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/leads', (req, res) => {
    const lead = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO leads (id, name, phone, email, city, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, lead.name, lead.phone, lead.email, lead.city, lead.status || 'Novo', new Date().toISOString());
    res.json({ id, ...lead });
  });

  // Access Requests
  app.get('/api/access-requests', (req, res) => {
    const requests = db.prepare('SELECT * FROM access_requests').all();
    res.json(requests);
  });

  app.post('/api/access-requests', (req, res) => {
    const r = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO access_requests (
        id, usuario_id, name, email, bank, banco_nome, sellerName, cpf, rg, phone, 
        birthDate, userEmail, address, cep, street, number, complement, 
        neighborhood, city, state, requestedAccessType, pixKey, status, 
        observation, createdAt, data_criacao, fgtsGroup, cltGroup, othersGroup, 
        tipo_solicitacao, motivo_reset
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, r.usuario_id, r.name, r.email, r.bank, r.banco_nome, r.sellerName, r.cpf, r.rg, r.phone,
      r.birthDate, r.userEmail, r.address, r.cep, r.street, r.number, r.complement,
      r.neighborhood, r.city, r.state, r.requestedAccessType, r.pixKey, r.status || 'Pendente',
      r.observation, now, now, r.fgtsGroup, r.cltGroup, r.othersGroup,
      r.tipo_solicitacao, r.motivo_reset
    );
    res.json({ id, ...r, createdAt: now });
  });

  app.put('/api/access-requests/:id', (req, res) => {
    const { id } = req.params;
    const { status, observacao_admin, criado_por_admin } = req.body;
    const data_finalizacao = new Date().toISOString();
    db.prepare(`
      UPDATE access_requests 
      SET status = ?, observacao_admin = ?, criado_por_admin = ?, data_finalizacao = ?
      WHERE id = ?
    `).run(status, observacao_admin, criado_por_admin, data_finalizacao, id);
    res.json({ success: true });
  });

  // Platform Credentials
  app.get('/api/credentials', (req, res) => {
    const credentials = db.prepare('SELECT * FROM platform_credentials').all();
    res.json(credentials);
  });

  app.post('/api/credentials', (req, res) => {
    const c = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO platform_credentials (
        id, usuario_id, banco_nome, login, senha, link_acesso, status, 
        criado_por_admin, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, c.usuario_id, c.banco_nome, c.login, c.senha, c.link_acesso, c.status,
      c.criado_por_admin, now, now
    );
    res.json({ id, ...c, data_criacao: now, data_atualizacao: now });
  });

  app.delete('/api/credentials/:id', (req, res) => {
    db.prepare('DELETE FROM platform_credentials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/credentials/:id', (req, res) => {
    const { id } = req.params;
    const c = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE platform_credentials 
      SET banco_nome = ?, login = ?, senha = ?, link_acesso = ?, status = ?, observation = ?, data_atualizacao = ?
      WHERE id = ?
    `).run(c.banco_nome, c.login, c.senha, c.link_acesso, c.status, c.observation, now, id);
    res.json({ success: true });
  });

  // Payment Requests
  app.get('/api/payment-requests', (req, res) => {
    const requests = db.prepare('SELECT * FROM payment_requests').all();
    res.json(requests);
  });

  app.post('/api/payment-requests', (req, res) => {
    const r = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO payment_requests (id, usuario_id, valor, chave_pix, status, data_solicitacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, r.usuario_id, r.valor, r.chave_pix, 'Pendente', now);
    res.json({ id, ...r, status: 'Pendente', data_solicitacao: now });
  });

  app.put('/api/payment-requests/:id', (req, res) => {
    const { id } = req.params;
    const { status, observacao_admin, aprovado_por, data_aprovacao, data_pagamento } = req.body;
    db.prepare(`
      UPDATE payment_requests 
      SET status = ?, observacao_admin = ?, aprovado_por = ?, data_aprovacao = ?, data_pagamento = ?
      WHERE id = ?
    `).run(status, observacao_admin, aprovado_por, data_aprovacao, data_pagamento, id);
    res.json({ success: true });
  });

  // Academy
  app.get('/api/academy', (req, res) => {
    const content = db.prepare('SELECT * FROM academy_content').all();
    res.json(content);
  });

  app.post('/api/academy', (req, res) => {
    const c = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO academy_content (
        id, titulo, categoria, descricao, arquivo_url, tipo_arquivo, 
        visibilidade, grupo_id, versao, criado_por, criado_em, atualizado_em, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, c.titulo, c.categoria, c.descricao, c.arquivo_url, c.tipo_arquivo,
      c.visibilidade, c.grupo_id, c.versao || '1.0', c.criado_por, now, now, 'Ativo'
    );
    res.json({ id, ...c, criado_em: now, atualizado_em: now, status: 'Ativo' });
  });

  app.delete('/api/academy/:id', (req, res) => {
    db.prepare('DELETE FROM academy_content WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/academy/views', (req, res) => {
    const { conteudo_id, usuario_id } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO academy_views (id, conteudo_id, usuario_id, data_visualizacao) VALUES (?, ?, ?, ?)').run(
      id, conteudo_id, usuario_id, new Date().toISOString()
    );
    res.json({ success: true });
  });

  // Announcements
  app.get('/api/announcements', (req, res) => {
    const announcements = db.prepare('SELECT * FROM announcements').all();
    res.json(announcements);
  });

  app.post('/api/announcements', (req, res) => {
    const a = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO announcements (id, title, message, type, link, date, active, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, a.title, a.message, a.type, a.link, now, 1, now);
    res.json({ id, ...a, date: now, active: 1, createdAt: now });
  });

  app.delete('/api/announcements/:id', (req, res) => {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Campaigns
  app.get('/api/campaigns', (req, res) => {
    const campaigns = db.prepare('SELECT * FROM campaigns').all();
    res.json(campaigns);
  });

  app.post('/api/campaigns', (req, res) => {
    const c = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO campaigns (id, title, description, image, link, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, c.title, c.description, c.image, c.link, 'Ativo', now);
    res.json({ id, ...c, status: 'Ativo', createdAt: now });
  });

  app.delete('/api/campaigns/:id', (req, res) => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post('/api/settings', (req, res) => {
    const updates = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, String(value));
    }
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
