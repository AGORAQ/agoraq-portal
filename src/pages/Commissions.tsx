import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, Plus, Edit, Trash2, Save, X, Download, Upload, RefreshCw, FileSpreadsheet, History, Link as LinkIcon, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCommission } from '@/context/CommissionContext';
import { CommissionTable } from '@/types';
import * as XLSX from 'xlsx';
import { BANK_OPTIONS } from '@/constants';

export default function Commissions() {
  const { user } = useAuth();
  const { commissions, addCommission, updateCommission, deleteCommission, importCommissions } = useCommission();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CommissionTable>>({
    status: 'Ativo'
  });

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const filteredCommissions = commissions.filter(comm => 
    (searchTerm === '' || 
      comm.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.product.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (bankFilter === '' || comm.bank.toLowerCase().includes(bankFilter.toLowerCase())) &&
    (productFilter === '' || comm.product.toLowerCase().includes(productFilter.toLowerCase()))
  );

  const handleInputChange = (field: keyof CommissionTable, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (comm: CommissionTable) => {
    setFormData(comm);
    setEditingId(comm.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.bank || !formData.name || !formData.product || !formData.term || !formData.range) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const sellerPercent = Number(formData.sellerPercent) || 0;
    const maxPercent = Number(formData.maxPercent) || 0;

    if (sellerPercent > maxPercent) {
      alert('O percentual do vendedor não pode ser maior que o percentual máximo da tabela.');
      return;
    }

    const commissionData = {
      name: formData.name!,
      bank: formData.bank!,
      product: formData.product!,
      term: formData.term!,
      range: formData.range!,
      totalCommission: Number(formData.totalCommission) || 0,
      maxPercent: maxPercent,
      sellerPercent: sellerPercent,
      group: formData.group || '',
      seller: formData.seller || '',
      observation: formData.observation || '',
      status: formData.status as 'Ativo' | 'Inativo' || 'Ativo'
    };

    if (editingId) {
      updateCommission(editingId, commissionData);
    } else {
      addCommission(commissionData);
    }
    
    setIsFormOpen(false);
    setFormData({ status: 'Ativo' });
    setEditingId(null);
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCommissions.map(c => ({
      'Banco': c.bank,
      'Nome Tabela': c.name,
      'Produto': c.product,
      'Prazo': c.term,
      'Faixa de Valor': c.range,
      'Comissão Total (%)': c.totalCommission,
      'Máximo (%)': c.maxPercent,
      'Vendedor (%)': c.sellerPercent,
      'Grupo': c.group,
      'Vendedor': c.seller,
      'Status': c.status,
      'Observação': c.observation,
      'Atualizado em': new Date(c.updatedAt).toLocaleDateString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissões");
    XLSX.writeFile(wb, "tabela_comissoes.xlsx");
  };

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const parsedData: any[] = [];
        const errors: string[] = [];

        data.forEach((row: any, index) => {
          const name = row['nome_tabela'] || row['Nome Tabela'] || row['Tabela'];
          const bank = row['banco'] || row['Banco'];
          const maxPercent = Number(row['percentual_maximo'] || row['Máximo (%)']) || 0;
          const sellerPercent = Number(row['percentual_vendedor'] || row['Vendedor (%)']) || 0;

          if (!name || !bank) {
             errors.push(`Linha ${index + 2}: Nome da tabela ou Banco faltando.`);
          } else if (sellerPercent > maxPercent) {
             errors.push(`Linha ${index + 2}: Percentual do vendedor (${sellerPercent}%) maior que o máximo (${maxPercent}%) na tabela "${name}".`);
          }

          if (name && bank) {
             parsedData.push({
               name: name,
               bank: bank,
               product: row['produto'] || row['Produto'] || '',
               range: row['faixa_valor'] || row['Faixa de Valor'] || '',
               term: row['prazo'] || row['Prazo'] || '',
               totalCommission: Number(row['comissao_total'] || row['Comissão Total (%)']) || 0,
               maxPercent: maxPercent,
               sellerPercent: sellerPercent,
               status: (row['status'] || row['Status']) === 'Inativo' ? 'Inativo' : 'Ativo',
               observation: row['observacao'] || row['Observação'] || '',
               group: row['grupo'] || row['Grupo'] || '',
               seller: row['vendedor'] || row['Vendedor'] || ''
             });
          }
        });

        setPreviewData(parsedData);
        setImportErrors(errors);
        setIsImportModalOpen(true);
      };
      reader.readAsBinaryString(file);
    }
  };

  const confirmImport = () => {
    if (importErrors.length > 0) {
      if (!confirm('Existem erros na importação. As linhas com erro serão ignoradas ou podem causar problemas. Deseja continuar mesmo assim?')) {
        return;
      }
    }
    
    if (previewData.length > 0) {
      // Filter out invalid ones if needed, but here we just pass them and let db handle or assume preview was enough
      // Ideally we should filter out the ones that caused errors if we mapped them back, but for now let's just try to import valid-looking ones
      // Actually, let's filter based on the validation logic again to be safe
      const validData = previewData.filter(d => d.sellerPercent <= d.maxPercent);
      
      if (validData.length === 0) {
        alert('Nenhum dado válido para importar.');
        return;
      }

      importCommissions(validData);
      setIsImportModalOpen(false);
      setPreviewData([]);
      setImportErrors([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tabela de Comissão</h1>
          <p className="text-slate-500">Gerencie as tabelas de comissionamento e regras de negócio.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          {isAdmin && (
            <>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileRead}
                />
                <Button variant="outline" className="bg-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
              </div>
              <Button variant="outline" onClick={() => alert('Funcionalidade de Histórico em desenvolvimento')}>
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Button>
              <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
                setEditingId(null);
                setFormData({ status: 'Ativo' });
                setIsFormOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tabela
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Import Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
              <CardTitle>Pré-visualização da Importação</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsImportModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-auto flex-1">
              {importErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <p className="font-bold mb-2">Erros Encontrados ({importErrors.length}):</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-2">Banco</th>
                      <th className="px-4 py-2">Tabela</th>
                      <th className="px-4 py-2">Produto</th>
                      <th className="px-4 py-2">Máximo (%)</th>
                      <th className="px-4 py-2">Vendedor (%)</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className={`border-b ${row.sellerPercent > row.maxPercent ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2">{row.bank}</td>
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.product}</td>
                        <td className="px-4 py-2">{row.maxPercent}%</td>
                        <td className={`px-4 py-2 font-bold ${row.sellerPercent > row.maxPercent ? 'text-red-600' : 'text-emerald-600'}`}>
                          {row.sellerPercent}%
                        </td>
                        <td className="px-4 py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-900 hover:bg-blue-800" onClick={confirmImport} disabled={importErrors.length > 0 && previewData.length === 0}>
                Confirmar Importação
              </Button>
            </div>
          </Card>
        </div>
      )}

      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>{editingId ? 'Editar Tabela' : 'Nova Tabela de Comissão'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco / Plataforma</label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={formData.bank || ''}
                    onChange={e => handleInputChange('bank', e.target.value)}
                  >
                    <option value="">Selecione um banco</option>
                    {BANK_OPTIONS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Código da Tabela</label>
                  <Input value={formData.code || ''} onChange={e => handleInputChange('code', e.target.value)} placeholder="Ex: TAB-001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Tabela</label>
                  <Input required value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ex: INSS Normal" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto</label>
                  <Input required value={formData.product || ''} onChange={e => handleInputChange('product', e.target.value)} placeholder="Ex: Consignado" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prazo</label>
                  <Input required value={formData.term || ''} onChange={e => handleInputChange('term', e.target.value)} placeholder="Ex: 84x" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Faixa de Valor</label>
                  <Input required value={formData.range || ''} onChange={e => handleInputChange('range', e.target.value)} placeholder="Ex: R$ 1.000 a R$ 50.000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.status || 'Ativo'}
                    onChange={e => handleInputChange('status', e.target.value)}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Comissão Total (%)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.totalCommission || ''} 
                    onChange={e => handleInputChange('totalCommission', e.target.value)} 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Percentual Máximo (%)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.maxPercent || ''} 
                    onChange={e => handleInputChange('maxPercent', e.target.value)} 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-emerald-700 font-bold">Percentual Vendedor (%)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.sellerPercent || ''} 
                    onChange={e => handleInputChange('sellerPercent', e.target.value)} 
                    className="border-emerald-200 focus:ring-emerald-500 bg-emerald-50/30"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-slate-500">Não pode ser maior que o Máximo.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700 font-bold">Comissão Empresa (%)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    readOnly
                    value={((Number(formData.totalCommission) || 0) - (Number(formData.sellerPercent) || 0)).toFixed(2)} 
                    className="border-blue-200 bg-blue-50/30 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Calculado automaticamente (Total - Vendedor).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> Vincular Grupo (Opcional)
                  </label>
                  <Input value={formData.group || ''} onChange={e => handleInputChange('group', e.target.value)} placeholder="Ex: Grupo A" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Vincular Vendedor (Opcional)
                  </label>
                  <Input value={formData.seller || ''} onChange={e => handleInputChange('seller', e.target.value)} placeholder="Ex: João Silva" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observação Interna</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={formData.observation || ''}
                  onChange={e => handleInputChange('observation', e.target.value)}
                  placeholder="Detalhes adicionais sobre esta tabela..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Tabela
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar por banco, tabela ou produto..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Input 
                placeholder="Filtrar Banco" 
                className="w-full md:w-[150px]"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
              />
              <Input 
                placeholder="Filtrar Produto" 
                className="w-full md:w-[150px]"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Cód.</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Tabela</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Faixa</th>
                  {isAdmin && (
                    <>
                      <th className="px-4 py-3 text-center">Total (%)</th>
                      <th className="px-4 py-3 text-center">Empresa (%)</th>
                      <th className="px-4 py-3 text-center">Máximo (%)</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center bg-emerald-50/50">Vendedor (%)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className={`border-b hover:bg-slate-50/50 transition-colors ${comm.status === 'Inativo' ? 'opacity-60 bg-slate-50' : ''}`}>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{comm.code || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{comm.bank}</td>
                    <td className="px-4 py-3">{comm.name}</td>
                    <td className="px-4 py-3">{comm.product}</td>
                    <td className="px-4 py-3 text-slate-500">{comm.term}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={comm.range}>{comm.range}</td>
                    {isAdmin && (
                      <>
                        <td className="px-4 py-3 text-center text-slate-600">{comm.totalCommission}%</td>
                        <td className="px-4 py-3 text-center text-blue-600 font-medium">{(comm.totalCommission - comm.sellerPercent).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center text-slate-400 text-xs">{comm.maxPercent}%</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{comm.sellerPercent}%</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={comm.status === 'Ativo' ? 'success' : 'secondary'} className="text-[10px]">
                        {comm.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => handleEdit(comm)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600" onClick={() => deleteCommission(comm.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredCommissions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma tabela encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
