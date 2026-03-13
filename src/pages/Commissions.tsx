import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  FileSpreadsheet, 
  Trophy, 
  ArrowUpDown,
  CheckSquare,
  Square,
  Megaphone,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCommission } from '@/context/CommissionContext';
import { CommissionTable } from '@/types';
import { BANK_OPTIONS } from '@/constants';
import GlobalImporter from '@/components/GlobalImporter';
import { db } from '@/services/db';
import * as XLSX from 'xlsx';

export default function Commissions() {
  const { user } = useAuth();
  const { 
    commissions, 
    addCommission, 
    updateCommission, 
    deleteCommission, 
    deleteManyCommissions,
    deleteAllCommissions,
    importCommissions 
  } = useCommission();
  
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const canEdit = isAdmin; // Only admin can edit as per new request
  
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGlobalImporterOpen, setIsGlobalImporterOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CommissionTable; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', message: '', link: '' });

  useEffect(() => {
    const loadCampaigns = async () => {
      const all = await db.campaigns.getAll();
      setCampaigns(all);
    };
    loadCampaigns();
  }, []);

  const [formData, setFormData] = useState<Partial<CommissionTable>>({
    status: 'Ativo',
    banco: '',
    produto: '',
    operacao: '',
    parcelas: '',
    codigo_tabela: '',
    nome_tabela: '',
    percentual_total_empresa: 0,
    comissao_master: 0,
    comissao_ouro: 0,
  });

  // Filter and Sort Logic
  const uniqueBanks = useMemo(() => Array.from(new Set(commissions.map(c => c.banco).filter(Boolean))).sort(), [commissions]);
  const uniqueProducts = useMemo(() => Array.from(new Set(commissions.map(c => c.produto).filter(Boolean))).sort(), [commissions]);

  // Find best commissions per product
  const bestCommissions = useMemo(() => {
    const best: { [product: string]: number } = {};
    commissions.forEach(c => {
      let value = 0;
      if (isAdmin) {
        value = c.percentual_total_empresa;
      } else if (user?.grupo_comissao === 'MASTER') {
        value = c.comissao_master;
      } else if (user?.grupo_comissao === 'OURO') {
        value = c.comissao_ouro;
      } else if (user?.grupo_comissao === 'PRATA') {
        value = c.comissao_prata;
      } else if (user?.grupo_comissao === 'PLUS') {
        value = c.comissao_plus;
      }
      
      if (!best[c.produto] || value > best[c.produto]) {
        best[c.produto] = value;
      }
    });
    return best;
  }, [commissions, isAdmin, user?.grupo_comissao]);

  const filteredCommissions = useMemo(() => {
    let result = commissions.filter(comm => {
      const matchesSearch = searchTerm === '' || 
        comm.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.nome_tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.codigo_tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.produto.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBank = bankFilter === '' || comm.banco === bankFilter;
      const matchesProduct = productFilter === '' || comm.produto === productFilter;

      // Filter by group commission > 0 for sellers
      let matchesGroup = true;
      if (!isAdmin && !isSupervisor) {
        const userGroup = user?.grupo_comissao;
        if (userGroup === 'MASTER') matchesGroup = (comm.comissao_master || 0) > 0;
        else if (userGroup === 'OURO') matchesGroup = (comm.comissao_ouro || 0) > 0;
        else if (userGroup === 'PRATA') matchesGroup = (comm.comissao_prata || 0) > 0;
        else if (userGroup === 'PLUS') matchesGroup = (comm.comissao_plus || 0) > 0;
      }

      return matchesSearch && matchesBank && matchesProduct && matchesGroup;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [commissions, searchTerm, bankFilter, productFilter, sortConfig]);

  const handleInputChange = (field: keyof CommissionTable, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (comm: CommissionTable) => {
    setFormData(comm);
    setEditingId(comm.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.banco || !formData.nome_tabela || !formData.produto) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const commissionData = {
      banco: formData.banco!,
      produto: formData.produto!,
      operacao: formData.operacao || '',
      parcelas: formData.parcelas || '',
      codigo_tabela: formData.codigo_tabela || '',
      nome_tabela: formData.nome_tabela!,
      faixa_valor_min: Number(formData.faixa_valor_min) || 0,
      faixa_valor_max: Number(formData.faixa_valor_max) || 0,
      percentual_total_empresa: Number(formData.percentual_total_empresa) || 0,
      comissao_master: Number(formData.comissao_master) || 0,
      comissao_ouro: Number(formData.comissao_ouro) || 0,
      status: formData.status as 'Ativo' | 'Inativo' || 'Ativo',
      criado_por: user?.name || 'Sistema'
    };

    if (editingId) {
      await updateCommission(editingId, commissionData);
    } else {
      await addCommission(commissionData);
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
        'Tabela': c.nome_tabela,
        'Parcelas': c.parcelas,
      };
      if (isAdmin) {
        row['Comissão Total Empresa (%)'] = c.percentual_total_empresa;
        row['Grupo MASTER (%)'] = c.comissao_master;
        row['Grupo OURO (%)'] = c.comissao_ouro;
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCommissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCommissions.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title || !newCampaign.message) return;
    await db.campaigns.create(newCampaign);
    const all = await db.campaigns.getAll();
    setCampaigns(all);
    setNewCampaign({ title: '', message: '', link: '' });
    setIsCampaignFormOpen(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Excluir esta campanha?')) {
      await db.campaigns.delete(id);
      const all = await db.campaigns.getAll();
      setCampaigns(all);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaigns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tabela de Comissão</h1>
              <p className="text-slate-500">Consulte as taxas e regras de comissionamento vigentes.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
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

          {/* Admin Bulk Actions */}
          {isAdmin && filteredCommissions.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-600">Ações em Massa:</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={selectedIds.length === 0}
                onClick={() => {
                  deleteManyCommissions(selectedIds);
                  setSelectedIds([]);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionados ({selectedIds.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={deleteAllCommissions}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Tudo
              </Button>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Buscar por banco ou tabela..." 
                    className="pl-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <select 
                    className="h-10 w-full md:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                  >
                    <option value="">Todos Bancos</option>
                    {uniqueBanks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                  </select>
                  <select 
                    className="h-10 w-full md:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                  >
                    <option value="">Todos Produtos</option>
                    {uniqueProducts.map(prod => <option key={prod} value={prod}>{prod}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      {isAdmin && (
                        <th className="px-4 py-3 w-10">
                          <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                            {selectedIds.length === filteredCommissions.length && filteredCommissions.length > 0 ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('banco')}>
                        <div className="flex items-center gap-1"><span>BANCO</span> <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-4 py-3"><span>PRODUTO</span></th>
                      <th className="px-4 py-3"><span>TABELA</span></th>
                      <th className="px-4 py-3"><span>PARCELAS</span></th>
                      
                      {isAdmin && (
                        <>
                          <th className="px-4 py-3 text-center"><span>COMISSÃO TOTAL EMPRESA</span></th>
                          <th className="px-4 py-3 text-center"><span>GRUPO MASTER</span></th>
                          <th className="px-4 py-3 text-center"><span>GRUPO OURO</span></th>
                        </>
                      )}

                      {!isAdmin && user?.grupo_comissao === 'MASTER' && (
                        <th className="px-4 py-3 text-center bg-blue-50"><span>GRUPO MASTER (%)</span></th>
                      )}
                      {!isAdmin && user?.grupo_comissao === 'OURO' && (
                        <th className="px-4 py-3 text-center bg-blue-50"><span>GRUPO OURO (%)</span></th>
                      )}
                      {!isAdmin && user?.grupo_comissao === 'PRATA' && (
                        <th className="px-4 py-3 text-center bg-blue-50"><span>GRUPO PRATA (%)</span></th>
                      )}
                      {!isAdmin && user?.grupo_comissao === 'PLUS' && (
                        <th className="px-4 py-3 text-center bg-blue-50"><span>GRUPO PLUS (%)</span></th>
                      )}

                      {isAdmin && <th className="px-4 py-3 text-center"><span>AÇÕES</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommissions.map((comm) => {
                      const isBest = (isAdmin ? comm.percentual_total_empresa : comm.percentual_vendedor) === bestCommissions[comm.produto];
                      
                      return (
                        <tr 
                          key={comm.id} 
                          className={`border-b transition-colors ${
                            selectedIds.includes(comm.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                          } ${isBest ? 'bg-emerald-50/30' : ''}`}
                        >
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <button onClick={() => toggleSelect(comm.id)} className="text-slate-400 hover:text-blue-600">
                                {selectedIds.includes(comm.id) ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium text-slate-900"><span>{comm.banco}</span></td>
                          <td className="px-4 py-3"><span>{comm.produto}</span></td>
                          <td className="px-4 py-3">
                            <div className="font-medium"><span>{comm.nome_tabela}</span></div>
                            {comm.codigo_tabela && <div className="text-[10px] text-slate-400"><span>{comm.codigo_tabela}</span></div>}
                          </td>
                          <td className="px-4 py-3 text-slate-500"><span>{comm.parcelas}</span></td>
                          
                          {isAdmin && (
                            <>
                              <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                <span>{comm.percentual_total_empresa}%</span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                <span>{comm.comissao_master}%</span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                <span>{comm.comissao_ouro}%</span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                <span>{comm.comissao_prata}%</span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                <span>{comm.comissao_plus}%</span>
                              </td>
                            </>
                          )}

                          {!isAdmin && user?.grupo_comissao === 'MASTER' && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-bold ${isBest ? 'text-emerald-600 text-lg' : 'text-slate-700'}`}>
                                  {comm.comissao_master}%
                                </span>
                                {isBest && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                    MELHOR TAXA
                                  </Badge>
                                )}
                              </div>
                            </td>
                          )}
                          {!isAdmin && user?.grupo_comissao === 'OURO' && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-bold ${isBest ? 'text-emerald-600 text-lg' : 'text-slate-700'}`}>
                                  {comm.comissao_ouro}%
                                </span>
                                {isBest && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                    MELHOR TAXA
                                  </Badge>
                                )}
                              </div>
                            </td>
                          )}
                          {!isAdmin && user?.grupo_comissao === 'PRATA' && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-bold ${isBest ? 'text-emerald-600 text-lg' : 'text-slate-700'}`}>
                                  {comm.comissao_prata}%
                                </span>
                                {isBest && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                    MELHOR TAXA
                                  </Badge>
                                )}
                              </div>
                            </td>
                          )}
                          {!isAdmin && user?.grupo_comissao === 'PLUS' && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-bold ${isBest ? 'text-emerald-600 text-lg' : 'text-slate-700'}`}>
                                  {comm.comissao_plus}%
                                </span>
                                {isBest && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                    MELHOR TAXA
                                  </Badge>
                                )}
                              </div>
                            </td>
                          )}

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
                      );
                    })}
                    {filteredCommissions.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <FileSpreadsheet className="w-12 h-12 mb-2 opacity-20" />
                            <span>Nenhuma tabela encontrada para os filtros aplicados.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Campaigns & Ads */}
        <div className="space-y-6">
          <Card className="border-blue-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-blue-900 text-white py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  <span>Campanhas & Avisos</span>
                </CardTitle>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-blue-800 h-8 w-8"
                    onClick={() => setIsCampaignFormOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {campaigns.length > 0 ? campaigns.map((camp) => (
                <div key={camp.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative group">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{camp.title}</span>
                  </h4>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed"><span>{camp.message}</span></p>
                  {camp.link && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-blue-600 text-xs font-semibold hover:text-blue-800"
                      onClick={() => window.open(camp.link, '_blank')}
                    >
                      <span>Saber mais</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  <div className="mt-2 text-[10px] text-slate-400">
                    <span>Publicado em: {new Date(camp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-400">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm"><span>Nenhuma campanha ativa no momento.</span></p>
                </div>
              )}

              {/* Campaign Form Modal (Simplified) */}
              {isCampaignFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle><span>Nova Campanha</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddCampaign} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Título</label>
                          <Input 
                            required 
                            value={newCampaign.title} 
                            onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                            placeholder="Ex: Campanha Banco Pan"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mensagem</label>
                          <textarea 
                            required
                            className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                            value={newCampaign.message}
                            onChange={e => setNewCampaign({...newCampaign, message: e.target.value})}
                            placeholder="Descreva a campanha..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Link (Opcional)</label>
                          <Input 
                            value={newCampaign.link} 
                            onChange={e => setNewCampaign({...newCampaign, link: e.target.value})}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsCampaignFormOpen(false)}>Cancelar</Button>
                          <Button type="submit" className="bg-blue-900 hover:bg-blue-800">Publicar</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Ads / Propaganda */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900"><span>Destaque do Mês</span></h3>
                  <p className="text-xs text-amber-700"><span>Banco Pan com taxas reduzidas!</span></p>
                </div>
              </div>
              <p className="text-sm text-amber-800 mb-4">
                <span>Aproveite a nova tabela do Banco Pan para INSS com comissão MASTER de 12% em até 84x.</span>
              </p>
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none">
                <span>Ver Tabela</span>
              </Button>
            </CardContent>
          </Card>
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

      {/* Edit/New Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
              <CardTitle><span>{editingId ? 'Editar Tabela' : 'Nova Tabela de Comissão'}</span></CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banco / Plataforma</label>
                    <select
                      required
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
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
                    <Input required value={formData.produto || ''} onChange={e => handleInputChange('produto', e.target.value)} placeholder="Ex: Consignado INSS" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Tabela</label>
                    <Input required value={formData.nome_tabela || ''} onChange={e => handleInputChange('nome_tabela', e.target.value)} placeholder="Ex: Tabela 01" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parcelas</label>
                    <Input value={formData.parcelas || ''} onChange={e => handleInputChange('parcelas', e.target.value)} placeholder="Ex: 84x" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
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
        </div>
      )}
    </div>
  );
}
