import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, Plus, Edit, Trash2, Save, X, Download, Upload, RefreshCw, FileSpreadsheet, History, Link as LinkIcon, Users, Trophy, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCommission } from '@/context/CommissionContext';
import { CommissionTable, CommissionGroup } from '@/types';
import { BANK_OPTIONS } from '@/constants';
import GlobalImporter from '@/components/GlobalImporter';
import { db } from '@/services/db';
import * as XLSX from 'xlsx';

export default function Commissions() {
  const { user } = useAuth();
  const { commissions, addCommission, updateCommission, deleteCommission, importCommissions } = useCommission();
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const canEdit = isAdmin || isSupervisor;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [operacaoFilter, setOperacaoFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGlobalImporterOpen, setIsGlobalImporterOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTop3, setShowTop3] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CommissionTable; direction: 'asc' | 'desc' } | null>(null);
  const [availableGroups, setAvailableGroups] = useState<CommissionGroup[]>([]);

  useEffect(() => {
    setAvailableGroups(db.commissionGroups.getAll());
  }, []);

  const [formData, setFormData] = useState<Partial<CommissionTable>>({
    status: 'Ativo',
    banco: '',
    produto: '',
    operacao: '',
    parcelas: '',
    codigo_tabela: '',
    nome_tabela: '',
    faixa_valor_min: 0,
    faixa_valor_max: 0,
    percentual_total_empresa: 0,
    comissao_master: 0,
    comissao_ouro: 0,
    comissao_prata: 0,
    comissao_plus: 0,
  });

  // Import State

  // Filter and Sort Logic
  const uniqueBanks = useMemo(() => Array.from(new Set(commissions.map(c => c.banco).filter(Boolean))).sort(), [commissions]);
  const uniqueProducts = useMemo(() => Array.from(new Set(commissions.map(c => c.produto).filter(Boolean))).sort(), [commissions]);
  const uniqueOperacoes = useMemo(() => Array.from(new Set(commissions.map(c => c.operacao).filter(Boolean))).sort(), [commissions]);

  const filteredCommissions = useMemo(() => {
    let result = commissions.filter(comm => {
      // 1. Search and Filters
      const matchesSearch = searchTerm === '' || 
        comm.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.nome_tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.codigo_tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (comm.operacao && comm.operacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        comm.produto.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBank = bankFilter === '' || comm.banco === bankFilter;
      const matchesOperacao = operacaoFilter === '' || comm.operacao === operacaoFilter;

      return matchesSearch && matchesBank && matchesOperacao;
    });

    // 3. Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 4. Top 3 Logic
    if (showTop3) {
      return [...result]
        .sort((a, b) => b.percentual_vendedor - a.percentual_vendedor)
        .slice(0, 3);
    }

    return result;
  }, [commissions, searchTerm, bankFilter, operacaoFilter, isAdmin, user, sortConfig, showTop3]);

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
    
    if (!formData.banco || !formData.nome_tabela || !formData.produto || !formData.codigo_tabela) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const commissionData = {
      banco: formData.banco!,
      produto: formData.produto!,
      operacao: formData.operacao || '',
      parcelas: formData.parcelas || '',
      codigo_tabela: formData.codigo_tabela!,
      nome_tabela: formData.nome_tabela!,
      faixa_valor_min: Number(formData.faixa_valor_min) || 0,
      faixa_valor_max: Number(formData.faixa_valor_max) || 0,
      percentual_total_empresa: Number(formData.percentual_total_empresa) || 0,
      comissao_master: Number(formData.comissao_master) || 0,
      comissao_ouro: Number(formData.comissao_ouro) || 0,
      comissao_prata: Number(formData.comissao_prata) || 0,
      comissao_plus: Number(formData.comissao_plus) || 0,
      status: formData.status as 'Ativo' | 'Inativo' || 'Ativo',
      criado_por: user?.name || 'Sistema'
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
    const ws = XLSX.utils.json_to_sheet(filteredCommissions.map(c => {
      const row: any = {
        'Banco': c.banco,
        'Produto': c.produto,
        'Operação': c.operacao,
        'Parcelas': c.parcelas,
        'Código': c.codigo_tabela,
        'Nome Tabela': c.nome_tabela,
        'Faixa Min': c.faixa_valor_min,
        'Faixa Max': c.faixa_valor_max,
        'Status': c.status
      };
      if (isAdmin) {
        row['Comissão Empresa (%)'] = c.percentual_total_empresa;
        row['Master (%)'] = c.comissao_master;
        row['Ouro (%)'] = c.comissao_ouro;
        row['Prata (%)'] = c.comissao_prata;
        row['Plus (%)'] = c.comissao_plus;
      } else {
        row['Minha Comissão (%)'] = c.percentual_vendedor;
      }
      return row;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissões");
    XLSX.writeFile(wb, "tabela_comissoes.xlsx");
  };

  const requestSort = (key: keyof CommissionTable) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tabela de Comissão</h1>
          <p className="text-slate-500">Consulte as taxas e regras de comissionamento vigentes.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={showTop3 ? "default" : "outline"} 
            className={showTop3 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            onClick={() => setShowTop3(!showTop3)}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Ver Top 3 Tabelas
          </Button>
          
          {isAdmin && (
            <>
              <Button variant="outline" className="bg-white" onClick={() => setIsGlobalImporterOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
              <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
                setEditingId(null);
                setFormData({ status: 'Ativo', banco: '', produto: '', codigo_tabela: '', nome_tabela: '' });
                setIsFormOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tabela
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleDownloadExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Global Importer Modal */}
      {isGlobalImporterOpen && (
        <GlobalImporter 
          type="comissoes" 
          onImportComplete={() => {
            // refresh happens automatically via context
          }} 
          onClose={() => setIsGlobalImporterOpen(false)} 
        />
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
                    value={formData.banco || ''}
                    onChange={e => handleInputChange('banco', e.target.value)}
                  >
                    <option value="">Selecione um banco</option>
                    {BANK_OPTIONS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto</label>
                  <div className="relative">
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                      value={formData.produto || ''}
                      onChange={e => handleInputChange('produto', e.target.value)}
                    >
                      <option value="">Selecione ou digite...</option>
                      {uniqueProducts.map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                      <option value="NEW_PRODUCT">+ Novo Produto</option>
                    </select>
                    {formData.produto === 'NEW_PRODUCT' && (
                      <Input 
                        className="mt-2"
                        placeholder="Digite o novo produto"
                        onChange={e => handleInputChange('produto', e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Código da Tabela</label>
                  <Input required value={formData.codigo_tabela || ''} onChange={e => handleInputChange('codigo_tabela', e.target.value)} placeholder="Ex: PAN_01" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Tabela</label>
                  <Input required value={formData.nome_tabela || ''} onChange={e => handleInputChange('nome_tabela', e.target.value)} placeholder="Ex: INSS Normal" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operação</label>
                  <Input value={formData.operacao || ''} onChange={e => handleInputChange('operacao', e.target.value)} placeholder="Ex: INSS Normal" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parcelas</label>
                  <Input value={formData.parcelas || ''} onChange={e => handleInputChange('parcelas', e.target.value)} placeholder="Ex: 84x" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Faixa Valor Mín.</label>
                  <Input type="number" value={formData.faixa_valor_min || ''} onChange={e => handleInputChange('faixa_valor_min', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Faixa Valor Máx.</label>
                  <Input type="number" value={formData.faixa_valor_max || ''} onChange={e => handleInputChange('faixa_valor_max', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Comissão Empresa (%)</label>
                  <Input type="number" step="0.01" required value={formData.percentual_total_empresa || ''} onChange={e => handleInputChange('percentual_total_empresa', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700 font-bold">MASTER (%)</label>
                  <Input type="number" step="0.01" required value={formData.comissao_master || ''} onChange={e => handleInputChange('comissao_master', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700 font-bold">OURO (%)</label>
                  <Input type="number" step="0.01" required value={formData.comissao_ouro || ''} onChange={e => handleInputChange('comissao_ouro', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700 font-bold">PRATA (%)</label>
                  <Input type="number" step="0.01" required value={formData.comissao_prata || ''} onChange={e => handleInputChange('comissao_prata', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-700 font-bold">PLUS (%)</label>
                  <Input type="number" step="0.01" required value={formData.comissao_plus || ''} onChange={e => handleInputChange('comissao_plus', e.target.value)} />
                </div>
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
                placeholder="Buscar por banco, tabela ou código..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select 
                className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
              >
                <option value="">Todos Bancos</option>
                {uniqueBanks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
              </select>
              <select 
                className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                value={operacaoFilter}
                onChange={(e) => setOperacaoFilter(e.target.value)}
              >
                <option value="">Todas Operações</option>
                {uniqueOperacoes.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('banco')}>
                    <div className="flex items-center gap-1">Banco <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3">Parcelas</th>
                  {isAdmin && <th className="px-4 py-3 text-center">Empresa (%)</th>}
                  {isAdmin && <th className="px-4 py-3 text-center">MASTER (%)</th>}
                  {isAdmin && <th className="px-4 py-3 text-center">OURO (%)</th>}
                  {isAdmin && <th className="px-4 py-3 text-center">PRATA (%)</th>}
                  {isAdmin && <th className="px-4 py-3 text-center">PLUS (%)</th>}
                  {!isAdmin && (
                    <th className="px-4 py-3 text-center bg-emerald-50/50 cursor-pointer hover:bg-emerald-100/50" onClick={() => requestSort('percentual_vendedor')}>
                      <div className="flex items-center justify-center gap-1">Minha Comissão (%) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  )}
                  {canEdit && <th className="px-4 py-3 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className={`border-b hover:bg-slate-50/50 transition-colors ${comm.status === 'Inativo' ? 'opacity-60 bg-slate-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{comm.banco}</td>
                    <td className="px-4 py-3">{comm.produto}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{comm.operacao}</div>
                      <div className="text-[10px] text-slate-400">Faixa: R$ {comm.faixa_valor_min} - R$ {comm.faixa_valor_max}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{comm.parcelas}</td>
                    {isAdmin && <td className="px-4 py-3 text-center text-slate-600">{comm.percentual_total_empresa}%</td>}
                    {isAdmin && <td className="px-4 py-3 text-center text-slate-600">{comm.comissao_master}%</td>}
                    {isAdmin && <td className="px-4 py-3 text-center text-slate-600">{comm.comissao_ouro}%</td>}
                    {isAdmin && <td className="px-4 py-3 text-center text-slate-600">{comm.comissao_prata}%</td>}
                    {isAdmin && <td className="px-4 py-3 text-center text-slate-600">{comm.comissao_plus}%</td>}
                    {!isAdmin && <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{comm.percentual_vendedor}%</td>}
                    {canEdit && (
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
                      Nenhuma tabela encontrada para os filtros aplicados.
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
