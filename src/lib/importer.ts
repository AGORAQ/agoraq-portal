import * as XLSX from 'xlsx';

export interface NormalizedData {
  [key: string]: any;
}

export interface ImportResult {
  data: NormalizedData[];
  errors: string[];
  headers: string[];
}

const COLUMN_SYNONYMS: { [key: string]: string } = {
  // Commissions
  'banco': 'banco',
  'bank': 'banco',
  'instituição': 'banco',
  
  'produto': 'produto',
  'product': 'produto',
  'serviço': 'produto',
  
  'código da tabela': 'codigo_tabela',
  'codigo da tabela': 'codigo_tabela',
  'cod tabela': 'codigo_tabela',
  'cód tabela': 'codigo_tabela',
  'codigo_tabela': 'codigo_tabela',
  
  'nome da tabela': 'nome_tabela',
  'tabela': 'nome_tabela',
  'nome_tabela': 'nome_tabela',
  
  'prazo': 'parcelas',
  'term': 'parcelas',
  'meses': 'parcelas',
  'parcelas': 'parcelas',
  
  'operacao': 'operacao',
  'operação': 'operacao',
  'operaÃ§Ã£o': 'operacao',
  
  'comissão empresa': 'percentual_total_empresa',
  'comissÃ£o empresa': 'percentual_total_empresa',
  'comissão total (%)': 'percentual_total_empresa',
  'comissao total': 'percentual_total_empresa',
  'total %': 'percentual_total_empresa',
  '% total': 'percentual_total_empresa',
  'percentual_total_empresa': 'percentual_total_empresa',

  'grupo master': 'comissao_master',
  'master': 'comissao_master',
  'comissao_master': 'comissao_master',

  'grupo ouro': 'comissao_ouro',
  'ouro': 'comissao_ouro',
  'comissao_ouro': 'comissao_ouro',

  'grupo prata': 'comissao_prata',
  'prata': 'comissao_prata',
  'comissao_prata': 'comissao_prata',

  'grupo plus': 'comissao_plus',
  'plus': 'comissao_plus',
  'comissao_plus': 'comissao_plus',
  
  'percentual vendedor (%)': 'percentual_vendedor',
  'comissão vendedor': 'percentual_vendedor',
  'vendedor %': 'percentual_vendedor',
  '% vendedor': 'percentual_vendedor',
  'percentual_vendedor': 'percentual_vendedor',
  
  'percentual empresa (%)': 'percentual_empresa',
  'empresa %': 'percentual_empresa',
  '% empresa': 'percentual_empresa',
  'percentual_empresa': 'percentual_empresa',
  
  'grupo de comissão': 'grupo_comissao',
  'grupo': 'grupo_comissao',
  'categoria': 'grupo_comissao',
  'grupo_comissao': 'grupo_comissao',

  // Leads
  'nome': 'name',
  'name': 'name',
  'contato': 'name',
  
  'telefone': 'phone',
  'celular': 'phone',
  'phone': 'phone',
  'whatsapp': 'phone',
  
  'email': 'email',
  'e-mail': 'email',
  
  'cidade': 'city',
  'city': 'city',
  'município': 'city',
  'municipio': 'city',

  // Sales
  'valor da venda': 'valor_venda',
  'valor venda': 'valor_venda',
  'valor': 'valor_venda',
  'venda': 'valor_venda',
  
  'cliente': 'cliente',
  'nome do cliente': 'cliente',
  
  'data': 'data',
  'data da venda': 'data',
  'período': 'data',
  
  'proposta': 'proposta',
  'nº proposta': 'proposta',
  'numero proposta': 'proposta',
  
  'cpf': 'cpf',
  'cpf do cliente': 'cpf',
  'documento': 'cpf',
};

export const normalizeHeader = (header: string): string => {
  const cleanHeader = header.toLowerCase().trim();
  return COLUMN_SYNONYMS[cleanHeader] || cleanHeader.replace(/\s+/g, '_');
};

export const normalizeValue = (value: any): any => {
  if (value === null || value === undefined) return null;
  
  if (typeof value === 'string') {
    let cleanValue = value.trim();
    
    // Check if it's a percentage
    if (cleanValue.endsWith('%')) {
      return parseFloat(cleanValue.replace('%', '').replace(',', '.')) || 0;
    }
    
    // Check if it's currency (R$ 1.500,00)
    if (cleanValue.startsWith('R$')) {
      return parseFloat(cleanValue.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    // Check if it's a number with comma (1.500,00)
    if (/^-?\d+(\.\d+)*,\d+$/.test(cleanValue)) {
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Try parsing as float if it looks like a number
    const parsed = parseFloat(cleanValue.replace(',', '.'));
    if (!isNaN(parsed) && /^-?\d+([.,]\d+)?$/.test(cleanValue)) {
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
