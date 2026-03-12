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
  'nome banco': 'banco',
  
  'produto': 'produto',
  'product': 'produto',
  'servico': 'produto',
  'convenio': 'produto',
  'operacao': 'produto',
  
  'codigo da tabela': 'codigo_tabela',
  'cod tabela': 'codigo_tabela',
  'codigo tabela': 'codigo_tabela',
  'codigo': 'codigo_tabela',
  'cod': 'codigo_tabela',
  'id tabela': 'codigo_tabela',
  
  'nome da tabela': 'nome_tabela',
  'tabela': 'nome_tabela',
  'nome tabela': 'nome_tabela',
  'descricao': 'nome_tabela',
  'descricao da tabela': 'nome_tabela',
  
  'prazo': 'parcelas',
  'term': 'parcelas',
  'meses': 'parcelas',
  'parcelas': 'parcelas',
  'n parcelas': 'parcelas',
  'numero de parcelas': 'parcelas',
  'prazo meses': 'parcelas',
  'qtd parcelas': 'parcelas',
  
  'tipo': 'operacao',
  'tipo de operacao': 'operacao',
  'modalidade': 'operacao',
  'tipo operacao': 'operacao',

  'valor min': 'faixa_valor_min',
  'valor minimo': 'faixa_valor_min',
  'min': 'faixa_valor_min',
  'valor inicial': 'faixa_valor_min',
  'faixa min': 'faixa_valor_min',
  
  'valor max': 'faixa_valor_max',
  'valor maximo': 'faixa_valor_max',
  'max': 'faixa_valor_max',
  'valor final': 'faixa_valor_max',
  'faixa max': 'faixa_valor_max',
  
  'comissao empresa': 'comissao_total_empresa',
  'comissao total empresa': 'comissao_total_empresa',
  'comissao total (%)': 'comissao_total_empresa',
  'comissao total': 'comissao_total_empresa',
  'total %': 'comissao_total_empresa',
  '% total': 'comissao_total_empresa',
  '% empresa': 'comissao_total_empresa',
  'comissao empresa %': 'comissao_total_empresa',
  'percentual total empresa': 'comissao_total_empresa',
  'total empresa': 'comissao_total_empresa',
  'comissao_total_empresa': 'comissao_total_empresa',

  'grupo master': 'grupo_master',
  'master': 'grupo_master',
  'comissao master': 'grupo_master',
  '% master': 'grupo_master',
  'master %': 'grupo_master',
  'comissao master %': 'grupo_master',
  'grupo_master': 'grupo_master',

  'grupo ouro': 'grupo_ouro',
  'ouro': 'grupo_ouro',
  'comissao ouro': 'grupo_ouro',
  '% ouro': 'grupo_ouro',
  'ouro %': 'grupo_ouro',
  'comissao ouro %': 'grupo_ouro',
  'grupo_ouro': 'grupo_ouro',

  'grupo prata': 'grupo_prata',
  'prata': 'grupo_prata',
  'comissao prata': 'grupo_prata',
  '% prata': 'grupo_prata',
  'prata %': 'grupo_prata',
  'comissao prata %': 'grupo_prata',
  'grupo_prata': 'grupo_prata',

  'grupo plus': 'grupo',
  'plus': 'grupo',
  'comissao plus': 'grupo',
  '% plus': 'grupo',
  'plus %': 'grupo',
  'comissao plus %': 'grupo',
  'grupo': 'grupo',
  
  'percentual vendedor (%)': 'percentual_vendedor',
  'comissao vendedor': 'percentual_vendedor',
  'vendedor %': 'percentual_vendedor',
  '% vendedor': 'percentual_vendedor',
  'percentual vendedor': 'percentual_vendedor',
  
  'percentual empresa (%)': 'percentual_empresa',
  'empresa %': 'percentual_empresa',
  'percentual empresa': 'percentual_empresa',
  
  'grupo de comissao': 'grupo_comissao',
  'categoria': 'grupo_comissao',
  'perfil': 'grupo_comissao',

  'vigencia': 'vigencia',
  'data vigencia': 'vigencia',
  'validade': 'vigencia',
  'inicio': 'vigencia',
  'data inicio': 'vigencia',
  
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
  'tel': 'phone',
  
  'email': 'email',
  'e mail': 'email',
  
  'cidade': 'city',
  'city': 'city',
  'municipio': 'city',
  'uf': 'state',
  'estado': 'state',
  'cpf': 'cpf',
  'documento': 'cpf',
  'cpf cliente': 'cpf',
  'banco de origem': 'banco_origem',
  'banco origem': 'banco_origem',
  'origem': 'banco_origem',
  'importado por': 'importado_por',

  // Sales
  'valor da venda': 'valor_venda',
  'valor venda': 'valor_venda',
  'valor': 'valor_venda',
  'venda': 'valor_venda',
  'montante': 'valor_venda',
  
  'nome do cliente': 'cliente',
  'cliente nome': 'cliente',
  
  'data': 'data',
  'data da venda': 'data',
  'periodo': 'data',
  'data venda': 'data',
  
  'proposta': 'proposta',
  'n proposta': 'proposta',
  'numero proposta': 'proposta',
  'contrato': 'proposta',
  
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

  // If it's already snake_case and matches a known field, return it
  const asSnake = normalized.replace(/\s+/g, '_');
  if (Object.values(COLUMN_SYNONYMS).includes(asSnake)) return asSnake;

  return asSnake;
};

export const normalizeValue = (value: any): any => {
  if (value === null || value === undefined || value === '') return null;
  
  // If it's already a number from XLSX
  if (typeof value === 'number') {
    // XLSX often reads percentages as decimals (e.g. 0.39 for 39%)
    // If the value is <= 1 and > 0, we treat it as a decimal percentage and multiply by 100
    // However, if it's a very small number like 0.003, it should become 0.3
    if (value > 0 && value < 1) {
      return parseFloat((value * 100).toFixed(4));
    }
    return value;
  }

  if (typeof value === 'string') {
    let cleanValue = value.trim();
    if (cleanValue === '') return null;
    
    // If it's a range or has letters, keep as string (e.g. "1 a 12", "84x")
    // But allow R$ and % to be stripped for numeric conversion
    const stripped = cleanValue.replace(/R\$|%/gi, '').trim();
    
    // Check if it's strictly numeric (allowing for BR separators)
    const isNumericCandidate = /^[0-9.,\s\-]+$/.test(stripped);
    
    if (!isNumericCandidate) {
      return cleanValue;
    }

    // Remove currency and spaces
    let numStr = stripped.replace(/\s/g, '');
    
    // Brazilian number logic
    if (numStr.includes(',') && numStr.includes('.')) {
      // Both separators: 1.234,56 -> 1234.56
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else if (numStr.includes(',')) {
      // Only comma: 1,23 -> 1.23 OR 1.234 (thousands)
      // If there are 3 digits after comma, it's ambiguous.
      // But usually comma is decimal in BR.
      numStr = numStr.replace(',', '.');
    } else if (numStr.includes('.')) {
      // Only dot: 1.234 -> 1234 (thousands) OR 1.23 (decimal)
      const parts = numStr.split('.');
      if (parts[parts.length - 1].length === 3 && parseFloat(numStr.replace('.', '')) > 100) {
        numStr = numStr.replace('.', '');
      }
    }

    const parsed = parseFloat(numStr);
    if (!isNaN(parsed)) {
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
  const requiredFields = ['banco', 'produto', 'nome_tabela', 'comissao_total_empresa', 'grupo_master', 'grupo_ouro'];
  
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        errors.push(`Linha ${index + 2}: Campo obrigatório '${field}' ausente.`);
      }
    });
    
    ['comissao_total_empresa', 'grupo_master', 'grupo_ouro', 'grupo_prata', 'grupo'].forEach(field => {
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
