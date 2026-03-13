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
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  user_name TEXT,
  lines_processed INTEGER,
  errors_found INTEGER,
  errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Avisos (Announcements)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Solicitações de Acesso
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  address TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  requested_access_type TEXT,
  seller_name TEXT,
  observation TEXT,
  status TEXT DEFAULT 'Pendente',
  criado_por_admin UUID REFERENCES profiles(id),
  data_finalizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Credenciais de Plataforma
CREATE TABLE IF NOT EXISTS platform_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  banco_nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT,
  link_acesso TEXT,
  status TEXT DEFAULT 'Ativo',
  criado_por_admin UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Entradas Financeiras (Comissões e Pagamentos)
CREATE TABLE IF NOT EXISTS financial_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vendedor_nome TEXT,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- 'Crédito', 'Débito', 'Estorno'
  valor NUMERIC NOT NULL,
  descricao TEXT,
  pix_key TEXT,
  status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Pago', 'Cancelado'
  data_vencimento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Tabela de Conteúdo da Academia
CREATE TABLE IF NOT EXISTS academy_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'Informativo', 'Treinamento', 'Roteiro'
  descricao TEXT,
  arquivo_url TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL, -- 'pdf', 'doc', 'link', 'video'
  visibilidade TEXT DEFAULT 'todos',
  grupo_id UUID,
  versao TEXT DEFAULT '1.0',
  criado_por UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Tabela de Visualizações da Academia
CREATE TABLE IF NOT EXISTS academy_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conteudo_id UUID REFERENCES academy_content(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data_visualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Tabela de Campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Tabela de Configurações do App
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
