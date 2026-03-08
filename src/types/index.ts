export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'vendedor';
  status: 'Ativo' | 'Inativo';
  lastAccess: string;
  avatar?: string;
  password?: string; // In a real app, this would be hashed. Here, stored for demo.
  fgtsGroup?: string;
  cltGroup?: string;
  bancos_permitidos?: string[]; // IDs of allowed banks
  pix_key?: string;
  saldo_acumulado?: number;
  saldo_pago?: number;
}

export interface Bank {
  id: string;
  nome_banco: string;
  tipo_produto: 'FGTS' | 'CLT' | 'Ambos';
  percentual_maximo: number;
  status: 'Ativo' | 'Inativo';
  criado_em: string;
}

export interface CommissionGroup {
  id: string;
  name: string;
  type: 'FGTS' | 'CLT';
  banco_id: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface CommissionTable {
  id: string;
  code?: string; // Added code field
  name: string;
  bank: string;
  product: string;
  range: string;
  term: string;
  totalCommission: number; // Percentage as number (e.g., 12 for 12%)
  maxPercent: number; // Percentage as number
  sellerPercent: number; // Percentage as number
  group?: string;
  seller?: string;
  status: 'Ativo' | 'Inativo';
  updatedAt: string;
  observation?: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  bank?: string;
  sellerName?: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  birthDate?: string;
  userEmail?: string;
  address?: string;
  
  // Address fields
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  requestedAccessType?: string;

  pixKey?: string;
  status: 'Aguardando Documentos' | 'Aguardando Criação/Liberação' | 'Solicitação com Pendência' | 'Aguardando Banco' | 'Finalizado' | 'Recusado' | 'Pendente' | 'Aprovado' | 'Rejeitado'; // Keeping old statuses for backward compatibility if needed, but UI will use new ones
  observation?: string;
  createdAt: string;
  fgtsGroup?: string;
  cltGroup?: string;
  
  // New fields
  tipo_solicitacao?: 'novo_usuario' | 'reset_senha';
  motivo_reset?: string;
  observacao_admin?: string;
  data_finalizacao?: string;
  criado_por_admin?: string;
}

export interface PlatformCredential {
  id: string;
  bank: string;
  link: string;
  username: string;
  password?: string; // Encrypted or masked in UI
  observation?: string;
  status: 'Ativo' | 'Inativo';
  updatedAt: string;
}

export interface Sale {
  id: string;
  date: string;
  proposal: string;
  client: string;
  cpf: string;
  phone: string;
  bank: string;
  table: string;
  value: number;
  commission: number;
  companyCommission: number;
  bankCommission: number;
  status: 'Pendente' | 'Em Averbação' | 'Aguardando Formalização do Link' | 'Paga' | 'Cancelada';
  seller: string;
}

export interface PaymentRequest {
  id: string;
  usuario_id: string;
  banco_id?: string;
  grupo_id?: string;
  valor: number;
  chave_pix: string;
  status: 'Pendente' | 'Aprovado' | 'Pago' | 'Recusado';
  data_solicitacao: string;
  data_aprovacao?: string;
  data_pagamento?: string;
  aprovado_por?: string;
  observacao_admin?: string;
}

export interface ExcelImportLog {
  id: string;
  date: string;
  fileName: string;
  user: string;
  linesProcessed: number;
  errorsFound: number;
  errors?: string[];
}

export interface AcademyContent {
  id: string;
  titulo: string;
  categoria: 'Informativo' | 'Treinamento' | 'Roteiro';
  descricao: string;
  arquivo_url: string;
  tipo_arquivo: 'pdf' | 'doc' | 'link' | 'video';
  visibilidade: 'todos' | 'vendedores' | 'lideres' | 'grupo_especifico';
  grupo_id?: string;
  versao: string;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  status: 'Ativo' | 'Inativo';
}

export interface AcademyView {
  id: string;
  conteudo_id: string;
  usuario_id: string;
  data_visualizacao: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'Aviso' | 'Reunião' | 'Importante' | 'Manutenção';
  link?: string;
  date: string;
  active: boolean;
  createdAt: string;
}

