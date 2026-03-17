console.log('Server process starting...');
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  console.log('Initializing database...');
  db = new Database('database.sqlite');
  db.pragma('journal_mode = WAL');
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('CRITICAL: Failed to open database:', error);
}

// Initialize Database Schema
function initDb() {
  if (!db) {
    console.error('Cannot initialize schema: Database not available');
    return;
  }
  try {
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
        last_lead_date TEXT,
        monthly_goal REAL DEFAULT 0,
        can_capture_leads INTEGER DEFAULT 1,
        deleted_at TEXT
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
      data_atualizacao TEXT NOT NULL,
      deleted_at TEXT
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
      seller TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      usuario_id TEXT
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

    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      vendedor_id TEXT NOT NULL,
      vendedor_nome TEXT,
      sale_id TEXT,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      descricao TEXT,
      pix_key TEXT,
      status TEXT NOT NULL,
      data_vencimento TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(vendedor_id) REFERENCES users(id),
      FOREIGN KEY(sale_id) REFERENCES sales(id)
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

  // Seed Initial Admin - Force reset to ensure access
  const adminEmail = 'agoraq@agoraqoficial.com';
  const hashedPassword = bcrypt.hashSync('admin', 10);
  
  // Delete existing by email AND by ID to avoid any conflicts
  db.prepare('DELETE FROM users WHERE email = ?').run(adminEmail);
  db.prepare('DELETE FROM users WHERE id = ?').run('1');
  
  db.prepare(`
    INSERT INTO users (id, name, email, role, status, lastAccess, password, grupo_comissao, can_capture_leads)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('1', 'Administrador', adminEmail, 'admin', 'Ativo', new Date().toISOString(), hashedPassword, 'MASTER', 1);


  // Seed Initial Banks if not exists
  const bankCount = db.prepare('SELECT COUNT(*) as count FROM banks').get() as { count: number };
  if (bankCount.count === 0) {
    // No initial banks for production-ready state
    }
  } catch (e) {
    console.error('Error during initDb execution:', e);
  }
}

try {
  initDb();
} catch (error) {
  console.error('Failed to initialize database:', error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Test route
  app.get('/api/test-alive', (req, res) => {
    res.send('Server is alive and responding');
  });

  // Health check
  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.setHeader('Content-Type', 'application/json');
    res.json({ status: 'ok' });
  });

  // API routes
  app.get('/api/db-status', (req, res) => {
    res.json({ initialized: !!db });
  });

  // Supabase Admin Client
  const supabaseAdmin = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

  if (!supabaseAdmin) {
    console.warn('Supabase Admin NOT configured. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  // --- API ROUTES ---

  // Supabase Admin Routes
  app.post('/api/admin/create-user', async (req, res) => {
    console.log('POST /api/admin/create-user', req.body.email);
    try {
      if (!supabaseAdmin) {
        console.error('Supabase Admin not configured');
        return res.status(500).json({ error: 'Supabase Admin not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Settings.' });
      }

      const { email, password, name, role, status, grupo_comissao, can_capture_leads } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

  // 1. Create user in auth.users
      console.log('Creating user in Supabase Auth:', email);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (authError) {
        // If user already exists, try to update their profile
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          console.log('User already exists in Auth, checking profile for:', email);
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
          
          if (existingProfile) {
            console.log('Updating existing profile:', existingProfile.id);
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                nome: name || 'Usuário',
                perfil: role || 'vendedor',
                grupo_comissao: grupo_comissao || 'OURO',
                ativo: status === 'Ativo',
                can_capture_leads: can_capture_leads !== false
              })
              .eq('id', existingProfile.id);
            
            if (updateError) {
              console.error('Error updating existing profile:', updateError);
              throw updateError;
            }
            return res.json({ success: true, message: 'Perfil atualizado com sucesso' });
          }
        }
        console.error('Auth Error:', authError);
        return res.status(400).json({ error: authError.message });
      }

      const userId = authData.user.id;
      console.log('User created in Auth with ID:', userId);

      // 2. Create/Update profile in profiles table
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          auth_user_id: userId,
          nome: name || 'Usuário',
          email: email.trim().toLowerCase(),
          perfil: role || 'vendedor',
          grupo_comissao: grupo_comissao || 'OURO',
          ativo: status === 'Ativo',
          can_capture_leads: can_capture_leads !== false,
          meta_diaria: 0
        }, { onConflict: 'email' });

      if (profileError) {
        console.error('Profile Upsert Error:', profileError);
      }

      // 3. Sync to local SQLite for redundancy
      try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, role, status, password, grupo_comissao, can_capture_leads)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, name, email.trim().toLowerCase(), role, status, hashedPassword, grupo_comissao, can_capture_leads !== false ? 1 : 0);
      } catch (sqliteError) {
        console.warn('SQLite sync error:', sqliteError);
      }

      // 4. Fetch the final profile to return
      const { data: finalProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching final profile:', fetchError);
        return res.json({ success: true, user: { id: userId, email, name, role, status, can_capture_leads } });
      }

      return res.json({ 
        success: true, 
        user: {
          id: finalProfile.id,
          name: finalProfile.nome,
          email: finalProfile.email,
          role: finalProfile.perfil,
          status: finalProfile.ativo ? 'Ativo' : 'Inativo',
          grupo_comissao: finalProfile.grupo_comissao,
          can_capture_leads: finalProfile.can_capture_leads !== false,
          lastAccess: finalProfile.updated_at || finalProfile.created_at
        } 
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Admin reset password
  app.post('/api/admin/reset-password', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin not configured.' });
      }

      const { userId, newPassword } = req.body;
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Admin reset password error:', error);
      res.status(500).json({ error: error.message || 'Erro ao resetar senha' });
    }
  });

  // Check if first run
  app.get('/api/admin/check-first-run', async (req, res) => {
    console.log('GET /api/admin/check-first-run');
    res.setHeader('Content-Type', 'application/json');
    try {
      if (!supabaseAdmin) {
        console.log('No supabaseAdmin, returning isFirstRun: true');
        return res.json({ isFirstRun: true });
      }
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Check first run DB error:', error);
        throw error;
      }
      console.log('First run check count:', count);
      res.json({ isFirstRun: count === 0 });
    } catch (error: any) {
      console.error('Check first run error:', error);
      res.json({ isFirstRun: true }); 
    }
  });

  // Auth
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      if (bcrypt.compareSync(password, user.password)) {
        const lastAccess = new Date().toISOString();
        db.prepare('UPDATE users SET lastAccess = ? WHERE id = ?').run(lastAccess, user.id);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, lastAccess });
      } else {
        res.status(401).json({ error: 'Senha incorreta' });
      }
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({ error: 'Erro interno no servidor de autenticação' });
    }
  });

  // Users
  app.get('/api/users', async (req, res) => {
    console.log('GET /api/users - Request received');
    try {
      if (supabaseAdmin) {
        console.log('GET /api/users - Fetching from Supabase profiles...');
        const { data: profiles, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('nome');
        
        if (error) {
          console.error('GET /api/users - Supabase error:', error);
          // Don't throw, try fallback
        } else if (profiles) {
          console.log(`GET /api/users - Found ${profiles.length} users in Supabase.`);
          return res.json(profiles.map(p => ({
            id: p.id,
            name: p.nome || 'Sem Nome',
            email: p.email,
            role: p.perfil || 'vendedor',
            status: p.ativo !== false ? 'Ativo' : 'Inativo',
            grupo_comissao: p.grupo_comissao || 'OURO',
            can_capture_leads: p.can_capture_leads !== false,
            monthly_goal: p.monthly_goal || 0,
            daily_lead_count: p.daily_lead_count || 0,
            last_lead_date: p.last_lead_date,
            lastAccess: p.updated_at || p.created_at
          })));
        } else {
          console.log('GET /api/users - No profiles found in Supabase.');
        }
      }
      
      // Fallback to SQLite
      console.log('GET /api/users - Falling back to SQLite...');
      const users = db.prepare('SELECT id, name, email, role, status, lastAccess, grupo_comissao, saldo_acumulado, saldo_pago, monthly_goal, can_capture_leads FROM users WHERE deleted_at IS NULL').all();
      console.log(`GET /api/users - Found ${users.length} users in SQLite.`);
      res.json(users.map((u: any) => ({ 
        ...u, 
        can_capture_leads: u.can_capture_leads !== 0,
        status: u.status || 'Ativo'
      })));
    } catch (error: any) {
      console.error('GET /api/users - Fatal error:', error);
      res.status(500).json({ error: error.message || 'Erro interno ao buscar usuários' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    console.log('GET /api/users/:id', id);
    try {
      if (supabaseAdmin) {
        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (profile) {
          return res.json({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: profile.perfil,
            status: profile.ativo ? 'Ativo' : 'Inativo',
            grupo_comissao: profile.grupo_comissao,
            can_capture_leads: profile.can_capture_leads !== false,
            monthly_goal: profile.monthly_goal || 0,
            daily_lead_count: profile.daily_lead_count || 0,
            last_lead_date: profile.last_lead_date
          });
        }
      }
      
      const user = db.prepare('SELECT id, name, email, role, status, lastAccess, grupo_comissao, saldo_acumulado, saldo_pago, monthly_goal, can_capture_leads FROM users WHERE id = ?').get(id) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ ...user, can_capture_leads: user.can_capture_leads === 1 });
    } catch (error: any) {
      console.error('Error fetching user by ID:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role, status, grupo_comissao, password, can_capture_leads } = req.body;
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password || '123456', 10);
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, role, status, lastAccess, password, grupo_comissao, can_capture_leads)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, email.trim().toLowerCase(), role, status, new Date().toISOString(), hashedPassword, grupo_comissao, can_capture_leads !== false ? 1 : 0);
      res.json({ id, name, email, role, status, grupo_comissao, can_capture_leads: can_capture_leads !== false });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    
    if (updates.can_capture_leads !== undefined) {
      updates.can_capture_leads = updates.can_capture_leads ? 1 : 0;
    }

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
    db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
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
    const { role, group } = req.query;
    const commissions = db.prepare('SELECT * FROM commissions WHERE deleted_at IS NULL').all() as any[];
    
    // If not admin/supervisor, strip sensitive data
    if (role !== 'admin' && role !== 'supervisor') {
      return res.json(commissions.map(c => {
        let sellerRate = 0;
        if (group === 'MASTER') sellerRate = c.comissao_master;
        else if (group === 'OURO') sellerRate = c.comissao_ouro;
        else if (group === 'PRATA') sellerRate = c.comissao_prata;
        else if (group === 'PLUS') sellerRate = c.comissao_plus;

        return {
          id: c.id,
          banco: c.banco,
          produto: c.produto,
          operacao: c.operacao,
          parcelas: c.parcelas,
          codigo_tabela: c.codigo_tabela,
          nome_tabela: c.nome_tabela,
          percentual_vendedor: sellerRate,
          status: c.status
        };
      }));
    }
    
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

  app.put('/api/commissions/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => updates[f]);
      db.prepare(`UPDATE commissions SET ${setClause}, data_atualizacao = ? WHERE id = ?`).run(...values, new Date().toISOString(), id);
    }
    res.json({ success: true });
  });

  app.delete('/api/commissions/:id', (req, res) => {
    db.prepare('UPDATE commissions SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
    res.json({ success: true });
  });

  app.post('/api/commissions/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Invalid IDs' });
    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();
    db.prepare(`UPDATE commissions SET deleted_at = ? WHERE id IN (${placeholders})`).run(now, ...ids);
    res.json({ success: true });
  });

  app.post('/api/commissions/delete-all', (req, res) => {
    const now = new Date().toISOString();
    db.prepare('UPDATE commissions SET deleted_at = ? WHERE deleted_at IS NULL').run(now);
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', (req, res) => {
    const sales = db.prepare('SELECT * FROM sales WHERE deleted_at IS NULL ORDER BY date DESC').all();
    res.json(sales);
  });

  app.post('/api/sales', (req, res) => {
    const sale = req.body;
    const id = uuidv4();
    
    // Server-side validation/calculation could be added here if we had the tables accessible easily
    // For now, we ensure the structure is correct
    db.prepare(`
      INSERT INTO sales (
        id, date, proposal, client, cpf, phone, bank, operacao, table_name, 
        value, commission, companyCommission, bankCommission, status, seller
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sale.date, sale.proposal, sale.client, sale.cpf, sale.phone, sale.bank, sale.operacao, sale.table_name || sale.table,
      sale.value, sale.commission || 0, sale.companyCommission || 0, sale.bankCommission || 0, sale.status, sale.seller
    );

    // Update user balance if status is Paga
    if (sale.status === 'Paga') {
      db.prepare('UPDATE users SET saldo_acumulado = saldo_acumulado + ? WHERE name = ?').run(sale.commission || 0, sale.seller);
    }

    res.json({ id, ...sale });
  });

  app.delete('/api/sales/:id', (req, res) => {
    db.prepare('UPDATE sales SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
    res.json({ success: true });
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
      INSERT INTO leads (id, name, phone, email, city, status, createdAt, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, lead.name, lead.phone, lead.email, lead.city, lead.status || 'Novo', new Date().toISOString(), lead.usuario_id);
    res.json({ id, ...lead });
  });

  // Commissions Import
  app.post('/api/commissions/import', (req, res) => {
    const { comms, userId } = req.body;
    if (!Array.isArray(comms)) return res.status(400).json({ error: 'Dados inválidos' });

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO commissions (
        id, banco, produto, operacao, parcelas, codigo_tabela, nome_tabela, 
        faixa_valor_min, faixa_valor_max, percentual_total_empresa, 
        comissao_master, comissao_ouro, comissao_prata, comissao_plus, 
        status, criado_por, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const comm of items) {
        insert.run(
          uuidv4(), comm.banco, comm.produto, comm.operacao, comm.parcelas, comm.codigo_tabela, comm.nome_tabela,
          comm.faixa_valor_min || 0, comm.faixa_valor_max || 9999999, comm.percentual_total_empresa || 0,
          comm.comissao_master || 0, comm.comissao_ouro || 0, comm.comissao_prata || 0, comm.comissao_plus || 0,
          'Ativo', userId, now, now
        );
      }
    });

    try {
      transaction(comms);
      res.json({ success: true, count: comms.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Leads Available
  app.get('/api/leads/available', (req, res) => {
    const leads = db.prepare('SELECT * FROM leads WHERE usuario_id IS NULL OR usuario_id = ""').all();
    res.json(leads);
  });

  app.delete('/api/leads/available', (req, res) => {
    db.prepare('DELETE FROM leads WHERE usuario_id IS NULL OR usuario_id = ""').run();
    res.json({ success: true });
  });

  app.post('/api/leads/:id/capture', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Check user limit
    const user = db.prepare('SELECT daily_lead_count, last_lead_date FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    let count = user.daily_lead_count || 0;
    if (user.last_lead_date !== today) {
      count = 0;
    }

    if (count >= 100) {
      return res.status(403).json({ error: 'Você já atingiu o limite diário de 100 leads.' });
    }

    // Capture lead
    const result = db.prepare('UPDATE leads SET usuario_id = ?, status = ?, capturedAt = ? WHERE id = ? AND (usuario_id IS NULL OR usuario_id = "")')
      .run(userId, 'Em Atendimento', now, id);

    if (result.changes === 0) {
      return res.status(409).json({ error: 'Este lead já foi capturado por outro vendedor.' });
    }

    // Update user count
    db.prepare('UPDATE users SET daily_lead_count = ?, last_lead_date = ? WHERE id = ?').run(count + 1, today, userId);

    res.json({ success: true });
  });

  app.post('/api/leads/bulk-capture', (req, res) => {
    const { leadIds, userId } = req.body;
    if (!Array.isArray(leadIds) || !userId) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Check user limit
    const user = db.prepare('SELECT daily_lead_count, last_lead_date FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    let count = user.daily_lead_count || 0;
    if (user.last_lead_date !== today) {
      count = 0;
    }

    const remainingLimit = 100 - count;
    if (remainingLimit <= 0) {
      return res.status(403).json({ error: 'Você já atingiu o limite diário de 100 leads.' });
    }

    const toCapture = leadIds.slice(0, remainingLimit);
    let capturedCount = 0;

    const transaction = db.transaction((ids) => {
      for (const id of ids) {
        const result = db.prepare('UPDATE leads SET usuario_id = ?, status = ?, capturedAt = ? WHERE id = ? AND (usuario_id IS NULL OR usuario_id = "")')
          .run(userId, 'Em Atendimento', now, id);
        if (result.changes > 0) {
          capturedCount++;
        }
      }
      db.prepare('UPDATE users SET daily_lead_count = ?, last_lead_date = ? WHERE id = ?').run(count + capturedCount, today, userId);
    });

    try {
      transaction(toCapture);
      res.json({ success: true, capturedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/leads/import', (req, res) => {
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ error: 'Dados inválidos' });

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO leads (id, name, phone, email, city, status, createdAt, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const lead of items) {
        insert.run(uuidv4(), lead.name, lead.phone, lead.email, lead.city, 'Novo', now, null);
      }
    });

    try {
      transaction(leads);
      res.json({ success: true, count: leads.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
    // API 404 handler - MUST be before static files to avoid returning index.html for missing API routes
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
    });

    const distPath = path.resolve('dist');
    console.log('Serving static files from:', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  console.log('Starting server on port', PORT);
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

console.log('Calling startServer()...');
startServer().catch(err => {
  console.error('Failed to start server:', err);
});
