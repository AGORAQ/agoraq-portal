-- SQL para configurar o banco de dados no Supabase SQL Editor

-- 1. Tabela de Perfis (Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  perfil TEXT DEFAULT 'vendedor', -- 'admin', 'supervisor', 'vendedor'
  ativo BOOLEAN DEFAULT true,
  grupo_comissao TEXT DEFAULT 'MASTER',
  monthly_goal NUMERIC DEFAULT 0,
  daily_goal NUMERIC DEFAULT 0,
  daily_lead_count INTEGER DEFAULT 0,
  last_lead_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Bancos
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_banco TEXT NOT NULL,
  tipo_produto TEXT,
  percentual_maximo NUMERIC,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Tabelas de Comissão
CREATE TABLE IF NOT EXISTS commission_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco TEXT NOT NULL,
  produto TEXT NOT NULL,
  tabela TEXT NOT NULL,
  parcelas INTEGER,
  comissao_total_empresa NUMERIC,
  grupo_master NUMERIC,
  grupo_ouro NUMERIC,
  grupo_prata NUMERIC,
  grupo_plus NUMERIC,
  status TEXT DEFAULT 'Ativo',
  origem_importacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  cidade TEXT,
  status TEXT DEFAULT 'Disponível',
  capturado_por UUID REFERENCES profiles(id),
  capturado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente TEXT NOT NULL,
  cpf TEXT,
  valor_venda NUMERIC NOT NULL,
  banco TEXT,
  produto TEXT,
  tabela TEXT,
  parcelas INTEGER,
  vendedor UUID REFERENCES profiles(id),
  vendedor_nome TEXT,
  status TEXT DEFAULT 'Pendente',
  data DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Logs de Importação
CREATE TABLE IF NOT EXISTS excel_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  user_name TEXT,
  lines_processed INTEGER,
  errors_found INTEGER,
  errors_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Avisos (Announcements)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Solicitações de Acesso
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  address TEXT,
  requested_access_type TEXT,
  seller_name TEXT,
  observation TEXT,
  status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Configurações do App
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir configurações padrão se não existirem
INSERT INTO app_settings (key, value) 
VALUES ('contract_settings', '{"title": "Contrato de Prestação de Serviços", "content": "Conteúdo do contrato..."}')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS (Opcional, mas recomendado)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ... adicione políticas conforme necessário
