import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Database,
  RefreshCw,
  History
} from 'lucide-react';
import { parseFile, parseFromUrl, validateCommissions, validateLeads, NormalizedData } from '@/lib/importer';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Input } from '@/components/ui/Input';

interface GlobalImporterProps {
  type: 'comissoes' | 'vendas' | 'leads';
  onImportComplete: () => void;
  onClose: () => void;
}

export default function GlobalImporter({ type, onImportComplete, onClose }: GlobalImporterProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<NormalizedData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'incremental' | 'replace'>('incremental');
  const [importSource, setImportSource] = useState<'file' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-xl font-bold">Acesso Negado</h3>
            <p className="text-slate-500">Apenas administradores podem realizar importações globais.</p>
            <Button onClick={onClose}>Fechar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setLoading(true);
      setFile(selectedFile);
      const result = await parseFile(selectedFile);
      
      let validationErrors: string[] = [];
      if (type === 'comissoes') {
        validationErrors = validateCommissions(result.data);
      } else if (type === 'leads') {
        validationErrors = validateLeads(result.data);
      }
      
      setPreview(result.data);
      setErrors([...result.errors, ...validationErrors]);
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setLoading(true);
    const result = await parseFromUrl(url);
    
    let validationErrors: string[] = [];
    if (type === 'comissoes') {
      validationErrors = validateCommissions(result.data);
    } else if (type === 'leads') {
      validationErrors = validateLeads(result.data);
    }
    
    setPreview(result.data);
    setErrors([...result.errors, ...validationErrors]);
    setLoading(false);
    if (result.data.length > 0) {
      setFile({ name: 'Planilha Remota' } as any);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    
    setLoading(true);
    try {
      if (type === 'comissoes') {
        if (importMode === 'replace') {
          // In a real app, we'd have a specific replace method. 
          // For this mock db, we'll just clear and import.
          const existing = await db.commissions.getAll('admin', undefined);
          for (const c of existing) {
            await db.commissions.delete(c.id, 'admin', user?.id || '');
          }
        }
        
        await db.commissions.import(preview as any, 'admin', user?.id || '');
      } else if (type === 'vendas' && user) {
        // Implement sales import if needed
        for (const sale of preview) {
          await db.sales.create(sale, user);
        }
      } else if (type === 'leads') {
        const leadsWithAssignment = preview.map(l => ({
          ...l,
          usuario_id: null // Admins import to the general pool
        }));
        await db.leads.import(leadsWithAssignment);
      }

      // Log the import
      await db.logs.add({
        fileName: file?.name || 'import_global',
        user: user?.name || 'Admin',
        linesProcessed: preview.length,
        errorsFound: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });

      alert(`Importação concluída! ${preview.length} registros processados.`);
      onImportComplete();
      onClose();
    } catch (error) {
      alert(`Erro na importação: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-900 text-white rounded-t-xl shrink-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Importador Inteligente Global
            </CardTitle>
            <CardDescription className="text-slate-400">
              Normalização automática e sincronização entre módulos.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto flex-1 space-y-6">
          {!file ? (
            <div className="space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-lg w-fit mx-auto">
                <button 
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importSource === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setImportSource('file')}
                >
                  Upload de Arquivo
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importSource === 'url' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setImportSource('url')}
                >
                  Link do Google Drive / Sheets
                </button>
              </div>

              {importSource === 'file' ? (
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleFileChange}
                  />
                  <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Selecione sua Planilha</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    Arraste ou clique para carregar arquivos .xlsx, .xls ou .csv.
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 space-y-4">
                  <div className="text-center">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Importar via Link</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                      Cole o link da sua planilha publicada como CSV no Google Sheets.
                    </p>
                  </div>
                  <div className="flex gap-2 max-w-lg mx-auto">
                    <Input 
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <Button 
                      className="bg-blue-900 hover:bg-blue-800" 
                      disabled={loading || !url}
                      onClick={handleUrlImport}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
                    </Button>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 max-w-lg mx-auto">
                    <p className="text-xs text-blue-800">
                      <strong>Como obter o link:</strong> No Google Sheets, vá em <em>Arquivo &gt; Compartilhar &gt; Publicar na Web</em>. Selecione "Valores separados por vírgula (.csv)" e clique em Publicar. Copie o link gerado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • {preview.length} linhas detectadas</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setPreview([]); setErrors([]); }}>
                  Trocar Arquivo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`cursor-pointer transition-all ${importMode === 'incremental' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`} onClick={() => setImportMode('incremental')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RefreshCw className={`w-5 h-5 ${importMode === 'incremental' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-bold text-sm">Atualização Incremental</p>
                      <p className="text-xs text-slate-500">Adiciona novos e atualiza existentes pelo código.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`cursor-pointer transition-all ${importMode === 'replace' ? 'border-red-500 bg-red-50' : 'hover:bg-slate-50'}`} onClick={() => setImportMode('replace')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <History className={`w-5 h-5 ${importMode === 'replace' ? 'text-red-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-bold text-sm">Substituição Total</p>
                      <p className="text-xs text-slate-500">Remove todos os registros atuais e importa os novos.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Inconsistências Detectadas ({errors.length})
                  </div>
                  <ul className="text-xs text-red-600 space-y-1 list-disc pl-4 max-h-32 overflow-y-auto">
                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Prévia da Normalização</h4>
                  <Badge variant="outline" className="text-[10px] uppercase">Dicionário Ativo</Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        {preview.length > 0 && Object.keys(preview[0]).slice(0, 6).map(h => (
                          <th key={h} className="px-3 py-2 font-bold text-slate-600 uppercase"><span>{h}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {Object.values(row).slice(0, 6).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-slate-600 truncate max-w-[120px]">
                              <span>{typeof val === 'number' ? val.toLocaleString('pt-BR') : String(val)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <div className="p-2 text-center bg-slate-50 text-[10px] text-slate-400 border-t">
                      <span>Exibindo 5 de {preview.length} registros...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardContent className="p-6 bg-slate-50 border-t flex justify-between items-center rounded-b-xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Registros Prontos</span>
              <span className="text-lg font-bold text-slate-900">{preview.length}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Status</span>
              <span className={`text-sm font-bold ${errors.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {errors.length > 0 ? 'Requer Atenção' : 'Validado'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]" 
              disabled={loading || preview.length === 0}
              onClick={handleImport}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
