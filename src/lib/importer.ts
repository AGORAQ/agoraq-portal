import * as XLSX from 'xlsx';

export interface NormalizedData {
  [key: string]: any;
}

export interface ImportResult {
  data: NormalizedData[];
  errors: string[];
  headers: string[];
}

const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const COLUMN_SYNONYMS: { [key: string]: string } = {
  // Commissions
  'banco': 'banco',
  'bank': 'banco',
  'instituicao': 'banco',
  'nome do banco': 'banco',
  
  'produto': 'produto',
  'product': 'produto',
  'servico': 'produto',
  'convenio': 'produto',
  
  'codigo da tabela': 'codigo_tabela',
  'cod tabela': 'codigo_tabela',
  'codigo_tabela': 'codigo_tabela',
  'codigo': 'codigo_tabela',
  'cod': 'codigo_tabela',
  
  'nome da tabela': 'nome_tabela',
  'tabela': 'nome_tabela',
  'nome_tabela': 'nome_tabela',
  'nome tabela': 'nome_tabela',
  
  'prazo': 'parcelas',
  'term': 'parcelas',
  'meses': 'parcelas',
  'parcelas': 'parcelas',
  'n parcelas': 'parcelas',
  'numero de parcelas': 'parcelas',
  'prazo meses': 'parcelas',
  'prazo_meses': 'parcelas',
  
  'operacao': 'operacao',
  'tipo': 'operacao',
  'tipo de operacao': 'operacao',
  'modalidade': 'operacao',

  'valor min': 'faixa_valor_min',
  'valor minimo': 'faixa_valor_min',
  'min': 'faixa_valor_min',
  'valor inicial': 'faixa_valor_min',
  
  'valor max': 'faixa_valor_max',
  'valor maximo': 'faixa_valor_max',
  'max': 'faixa_valor_max',
  'valor final': 'faixa_valor_max',
  
  'comissao empresa': 'percentual_total_empresa',
  'comissao total empresa': 'percentual_total_empresa',
  'comissao_total_empresa': 'percentual_total_empresa',
  'comissao total (%)': 'percentual_total_empresa',
  'comissao total': 'percentual_total_empresa',
  'total %': 'percentual_total_empresa',
  '% total': 'percentual_total_empresa',
  'percentual_total_empresa': 'percentual_total_empresa',
  '% empresa': 'percentual_total_empresa',
  'comissao_empresa': 'percentual_total_empresa',
  'total_empresa': 'percentual_total_empresa',

  'grupo master': 'comissao_master',
  'master': 'comissao_master',
  'comissao_master': 'comissao_master',
  'comissao master': 'comissao_master',
  '% master': 'comissao_master',
  'master %': 'comissao_master',

  'grupo ouro': 'comissao_ouro',
  'ouro': 'comissao_ouro',
  'comissao_ouro': 'comissao_ouro',
  'comissao ouro': 'comissao_ouro',
  '% ouro': 'comissao_ouro',
  'ouro %': 'comissao_ouro',

  'grupo prata': 'comissao_prata',
  'prata': 'comissao_prata',
  'comissao_prata': 'comissao_prata',
  'comissao prata': 'comissao_prata',
  '% prata': 'comissao_prata',
  'prata %': 'comissao_prata',

  'grupo plus': 'comissao_plus',
  'plus': 'comissao_plus',
  'comissao_plus': 'comissao_plus',
  'comissao plus': 'comissao_plus',
  '% plus': 'comissao_plus',
  'plus %': 'comissao_plus',
  
  'percentual vendedor (%)': 'percentual_vendedor',
  'comissao vendedor': 'percentual_vendedor',
  'vendedor %': 'percentual_vendedor',
  '% vendedor': 'percentual_vendedor',
  'percentual_vendedor': 'percentual_vendedor',
  
  'percentual empresa (%)': 'percentual_empresa',
  'empresa %': 'percentual_empresa',
  'percentual_empresa': 'percentual_empresa',
  
  'grupo de comissao': 'grupo_comissao',
  'grupo': 'grupo_comissao',
  'categoria': 'grupo_comissao',
  'perfil': 'grupo_comissao',
  'grupo_comissao': 'grupo_comissao',

  'vigencia': 'vigencia',
  'data vigencia': 'vigencia',
  'validade': 'vigencia',
  'inicio': 'vigencia',
  
  'status': 'status',
  'situacao': 'status',
  'ativo': 'status',

  // Leads
  'nome': 'name',
  'name': 'name',
  'contato': 'name',
  'cliente': 'name',
  'nome completo': 'name',
  
  'telefone': 'phone',
  'celular': 'phone',
  'phone': 'phone',
  'whatsapp': 'phone',
  
  'email': 'email',
  'e-mail': 'email',
  
  'cidade': 'city',
  'city': 'city',
  'municipio': 'city',
  'uf': 'state',
  'estado': 'state',
  'cpf': 'cpf',
  'documento': 'cpf',
  'banco de origem': 'banco_origem',
  'banco origem': 'banco_origem',
  'origem': 'banco_origem',
  'importado por': 'importado_por',
  'importado_por': 'importado_por',

  // Sales
  'valor da venda': 'valor_venda',
  'valor venda': 'valor_venda',
  'valor': 'valor_venda',
  'venda': 'valor_venda',
  
  'nome do cliente': 'cliente',
  
  'data': 'data',
  'data da venda': 'data',
  'periodo': 'data',
  
  'proposta': 'proposta',
  'n proposta': 'proposta',
  'numero proposta': 'proposta',
  
  'cpf do cliente': 'cpf',
};

export const normalizeHeader = (header: string): string => {
  if (!header) return '';
  // Remove accents, special characters and multiple spaces for better matching
  const normalized = removeAccents(String(header).trim().toLowerCase())
    .replace(/[._\-\s]+/g, ' ') // Normalize separators to single space
    .trim();
  
  // Try direct match first
  if (COLUMN_SYNONYMS[normalized]) return COLUMN_SYNONYMS[normalized];
  
  // Try matching without spaces
  const noSpaces = normalized.replace(/\s/g, '');
  if (COLUMN_SYNONYMS[noSpaces]) return COLUMN_SYNONYMS[noSpaces];

  return normalized.replace(/\s+/g, '_');
};

export const normalizeValue = (value: any): any => {
  if (value === null || value === undefined || value === '') return null;
  
  // If it's already a number, just return it
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    let cleanValue = value.trim();
    if (cleanValue === '') return null;
    
    // If it contains letters (other than R, $, %) or ranges, keep as string
    // This handles "1 a 12", "84x", "Acima de 12", etc.
    if (/[a-df-qs-z]/i.test(cleanValue.replace(/R\$|%/gi, '')) || /\b(a|ate|de|x|acima|abaixo)\b/i.test(cleanValue)) {
      return cleanValue;
    }

    // Remove currency and spaces
    let numStr = cleanValue.replace('R$', '').replace(/\s/g, '');
    
    // Check if it's a percentage
    const isPercentage = numStr.includes('%');
    if (isPercentage) numStr = numStr.replace('%', '');

    // Brazilian number logic
    if (numStr.includes(',')) {
      // Has comma: definitely BR format. Dots are thousands, comma is decimal.
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      // No comma: could be US format or plain number
      // If there's exactly one dot and it's followed by 3 digits, 
      // it's highly likely a thousands separator in BR context.
      const dots = (numStr.match(/\./g) || []).length;
      if (dots === 1) {
        const parts = numStr.split('.');
        if (parts[1].length === 3) {
          const val = parseFloat(numStr.replace('.', ''));
          if (val > 100) { 
             numStr = numStr.replace('.', '');
          }
        }
      } else if (dots > 1) {
        numStr = numStr.replace(/\./g, '');
      }
    }

    const parsed = parseFloat(numStr);
    if (!isNaN(parsed) && /^-?\d*\.?\d*$/.test(numStr)) {
      return parsed;
    }
    
    return cleanValue;
  }
  
  return value;
};

export const parseData = (data: any, type: 'binary' | 'string' | 'array' = 'binary'): ImportResult => {
  try {
    const workbook = XLSX.read(data, { type });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (json.length === 0) {
      return { data: [], errors: ['Arquivo vazio'], headers: [] };
    }
    
    const rawHeaders = json[0] as string[];
    const normalizedHeaders = rawHeaders.map(h => normalizeHeader(String(h)));
    
    const rows = json.slice(1);
    const normalizedData: NormalizedData[] = rows.map((row) => {
      const obj: NormalizedData = {};
      normalizedHeaders.forEach((header, colIndex) => {
        obj[header] = normalizeValue(row[colIndex]);
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== null && v !== ''));
    
    return {
      data: normalizedData,
      errors: [],
      headers: normalizedHeaders
    };
  } catch (error) {
    return { data: [], errors: [`Erro ao processar dados: ${error}`], headers: [] };
  }
};

export const parseFile = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      resolve(parseData(data, 'binary'));
    };
    
    reader.onerror = () => {
      resolve({ data: [], errors: ['Erro ao carregar arquivo'], headers: [] });
    };
    
    reader.readAsBinaryString(file);
  });
};

export const parseFromUrl = async (url: string): Promise<ImportResult> => {
  try {
    let targetUrl = url.trim();
    
    // Auto-convert Google Sheets links to CSV if possible
    if (targetUrl.includes('docs.google.com/spreadsheets') && !targetUrl.includes('output=csv')) {
      if (targetUrl.includes('/edit')) {
        targetUrl = targetUrl.replace(/\/edit.*$/, '/export?format=csv');
      } else if (targetUrl.includes('/pubhtml')) {
        targetUrl = targetUrl.replace('/pubhtml', '/pub?output=csv');
      }
    }

    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`Falha ao buscar URL: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return parseData(data, 'array');
  } catch (error) {
    return { data: [], errors: [`Erro ao buscar dados da URL: ${error}`], headers: [] };
  }
};

export const validateCommissions = (data: NormalizedData[]): string[] => {
  const errors: string[] = [];
  const requiredFields = ['banco', 'produto', 'nome_tabela', 'percentual_total_empresa', 'comissao_master', 'comissao_ouro'];
  
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        errors.push(`Linha ${index + 2}: Campo obrigatório '${field}' ausente.`);
      }
    });
    
    ['percentual_total_empresa', 'comissao_master', 'comissao_ouro', 'comissao_prata', 'comissao_plus'].forEach(field => {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '' && typeof row[field] !== 'number') {
        errors.push(`Linha ${index + 2}: '${field}' deve ser um número.`);
      }
    });
  });
  
  return errors;
};

export const validateLeads = (data: NormalizedData[]): string[] => {
  const errors: string[] = [];
  const requiredFields = ['name', 'phone'];
  
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        errors.push(`Linha ${index + 2}: Campo obrigatório '${field}' ausente.`);
      }
    });
  });
  
  return errors;
};
