export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'vendedor';
  status: 'Ativo' | 'Inativo';
  lastAccess: string;
  avatar?: string;
  password?: string;
  grupo_comissao: 'MASTER' | 'OURO' | 'PRATA' | 'PLUS'; 
  fgtsGroup?: string; // Kept for backward compatibility
  cltGroup?: string; // Kept for backward compatibility
  othersGroup?: string; // New field for other products
  bancos_permitidos?: string[];
  pix_key?: string;
  saldo_acumulado?: number;
  saldo_pago?: number;
}

export interface Bank {
  id: string;
  nome_banco: string;
  tipo_produto: 'FGTS' | 'CLT' | 'Ambos' | 'Outros';
  percentual_maximo: number;
  status: 'Ativo' | 'Inativo';
  criado_em: string;
}

export interface CommissionGroup {
  id: string;
  name: string;
  type: 'FGTS' | 'CLT' | 'Outros';
  banco_id: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface CommissionTable {
  id: string;
  banco: string;
  produto: string;
  operacao: string;
  parcelas: string;
  codigo_tabela: string;
  nome_tabela: string;
  faixa_valor_min: number;
  faixa_valor_max: number;
  percentual_total_empresa: number; // COMISSÃO EMPRESA
  comissao_master: number;
  comissao_ouro: number;
  comissao_prata: number;
  comissao_plus: number;
  status: 'Ativo' | 'Inativo';
  criado_por: string;
  data_criacao: string;
  data_atualizacao: string;
  
  // Calculated field for Admin only
  margem_empresa?: number; 
  
  // For backward compatibility during migration
  grupo_comissao?: string;
  percentual_vendedor?: number;
  prazo?: string;
}

export interface AccessRequest {
  id: string;
  usuario_id: string; // Referência ao vendedor
  name: string;
  email: string;
  bank?: string;
  banco_nome?: string; // Added for consistency with user request
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
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Aguardando Documentos' | 'Aguardando Criação/Liberação' | 'Solicitação com Pendência' | 'Aguardando Banco' | 'Finalizado' | 'Rejeitado';
  observation?: string;
  createdAt: string;
  data_criacao?: string; // Added for consistency
  fgtsGroup?: string;
  cltGroup?: string;
  othersGroup?: string;
  
  // New fields
  tipo_solicitacao?: 'novo_usuario' | 'reset_senha';
  motivo_reset?: string;
  observacao_admin?: string;
  data_finalizacao?: string;
  criado_por_admin?: string;
}

export interface PlatformCredential {
  id: string;
  usuario_id: string; // Referência obrigatória ao vendedor
  banco_nome: string;
  login: string;
  senha?: string;
  link_acesso: string;
  status: 'Ativo' | 'Inativo';
  criado_por_admin: string;
  data_criacao: string;
  data_atualizacao: string;
  
  // Backward compatibility fields (optional)
  bank?: string;
  link?: string;
  username?: string;
  password?: string;
  observation?: string;
  updatedAt?: string;
}

export interface Sale {
  id: string;
  date: string;
  proposal: string;
  client: string;
  cpf: string;
  phone: string;
  bank: string;
  operacao: string;
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

export interface ImportLog {
  id: string;
  usuario_id: string;
  data: string;
  tipo_importacao: 'comissoes' | 'vendas' | 'outros';
  quantidade_registros: number;
  erros_encontrados: number;
  status: 'Sucesso' | 'Erro' | 'Parcial';
  detalhes_erros?: string[];
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

