import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Filter, X, Save, History, Trash2, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { db } from '@/services/db';
import { AccessRequest, CommissionGroup } from '@/types';
import { BANK_OPTIONS } from '@/constants';

export default function UserRequests() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const isAdmin = user?.role === 'admin';

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResetFormOpen, setIsResetFormOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  // Bank Management State
  const [availableBanks, setAvailableBanks] = useState<string[]>([]);
  const [newBankName, setNewBankName] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);

  // Commission Groups State
  const [fgtsGroups, setFgtsGroups] = useState<CommissionGroup[]>([]);
  const [cltGroups, setCltGroups] = useState<CommissionGroup[]>([]);
  const [othersGroups, setOthersGroups] = useState<CommissionGroup[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<AccessRequest>>({
    status: 'Aguardando Documentos',
    // Initialize address fields
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    requestedAccessType: ''
  });
  
  const [resetFormData, setResetFormData] = useState({
    bank: '',
    reason: ''
  });

  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [adminObservation, setAdminObservation] = useState('');
  
  // Approval Modal State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalFormData, setApprovalFormData] = useState({
    login: '',
    senha: '',
    link_acesso: '',
    observation: ''
  });

  const refreshRequests = async () => {
    if (isAdmin) {
      const all = await db.requests.getAll();
      setRequests(all);
    } else if (user?.id) {
      const userRequests = await db.requests.getByUser(user.id);
      setRequests(userRequests);
    }
    const allGroups = await db.commissionGroups.getAll();
    setFgtsGroups(allGroups);
    setCltGroups(allGroups);
    setOthersGroups(allGroups);
    const allBanks = await db.bancos.getAll();
    setAvailableBanks(allBanks.map(b => b.nome));
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  const pendingCount = requests.filter(req => 
    req.status !== 'Finalizado' && req.status !== 'Recusado' && req.status !== 'Aprovado' && req.status !== 'Rejeitado'
  ).length;

  const handleInputChange = (field: keyof AccessRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCepBlur = async () => {
    const cep = formData.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
        // Optional: focus on number field
        document.getElementById('number')?.focus();
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.bank || !formData.sellerName || !formData.cpf || !formData.fgtsGroup || !formData.cltGroup) {
      notify('error', 'Preencha os campos obrigatórios (incluindo grupos de comissão).');
      return;
    }

    // Check for pending requests
    const pendingRequest = requests.find(r => 
      r.bank === formData.bank && 
      r.cpf === formData.cpf && 
      r.status !== 'Finalizado' && 
      r.status !== 'Recusado' &&
      r.status !== 'Aprovado' &&
      r.status !== 'Rejeitado'
    );

    if (pendingRequest) {
      notify('error', 'Já existe uma solicitação pendente para este banco e CPF.');
      return;
    }

    // Construct full address string
    const fullAddress = `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}, ${formData.cep}`;

    await db.requests.create({
      usuario_id: user?.id || '',
      name: formData.name!,
      email: formData.email!,
      bank: formData.bank!,
      banco_nome: formData.bank!,
      sellerName: formData.sellerName!,
      cpf: formData.cpf!,
      rg: formData.rg || '',
      phone: formData.phone || '',
      birthDate: formData.birthDate || '',
      userEmail: formData.userEmail || '',
      address: fullAddress,
      
      // Save individual address fields
      cep: formData.cep,
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,

      requestedAccessType: formData.requestedAccessType,

      pixKey: formData.pixKey || '',
      observation: formData.observation || '',
      fgtsGroup: formData.fgtsGroup,
      cltGroup: formData.cltGroup,
      othersGroup: formData.othersGroup,
      tipo_solicitacao: 'novo_usuario'
    });

    await refreshRequests();
    setIsFormOpen(false);
    setFormData({ 
      status: 'Aguardando Documentos',
      cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', requestedAccessType: ''
    });

    notify('success', `Solicitação enviada com sucesso!\n\nUm e-mail de notificação foi enviado para: agoraq@agoraqoficial.com.br`);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetFormData.bank || !resetFormData.reason) {
      notify('error', 'Preencha todos os campos.');
      return;
    }

    // Check if user has credentials for this bank (Simulated check)
    // In a real app, we would check db.credentials.getAll() filtered by user
    
    // Check for pending requests
    const pendingRequest = requests.find(r => 
      r.bank === resetFormData.bank && 
      r.userEmail === user?.email && // Assuming userEmail is the seller's email
      r.status !== 'Finalizado' && 
      r.status !== 'Recusado' &&
      r.status !== 'Aprovado' &&
      r.status !== 'Rejeitado'
    );

    if (pendingRequest) {
      notify('error', 'Já existe uma solicitação pendente para este banco.');
      return;
    }

    await db.requests.create({
      usuario_id: user?.id || '',
      name: user?.name || 'Vendedor',
      email: user?.email || '',
      bank: resetFormData.bank,
      banco_nome: resetFormData.bank,
      sellerName: user?.name || '',
      cpf: '', // Not needed for reset? Or fetch from user profile
      tipo_solicitacao: 'reset_senha',
      motivo_reset: resetFormData.reason,
      status: 'Aguardando Criação/Liberação'
    } as any); // Type assertion for partial data

    await refreshRequests();
    setIsResetFormOpen(false);
    setResetFormData({ bank: '', reason: '' });
    notify('success', 'Solicitação de reset de senha enviada com sucesso!');
  };

  const updateStatus = async (id: string, newStatus: AccessRequest['status']) => {
    if (newStatus === 'Recusado' && !adminObservation) {
      notify('error', 'Para recusar, é obrigatório informar o motivo na observação.');
      return;
    }
    
    await db.requests.updateStatus(id, newStatus, adminObservation, user?.id);

    // Send email if finalized/approved
    if (newStatus === 'Finalizado' || newStatus === 'Aprovado') {
      const req = requests.find(r => r.id === id);
      if (req) {
        notify('info', `Status atualizado para ${newStatus}. O usuário deve ser informado manualmente ou via Admin Panel.`);
      }
    }

    setAdminObservation('');
    await refreshRequests();
    if (selectedRequest) setSelectedRequest(null);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    // 1. Create the credential
    await db.credentials.create({
      usuario_id: selectedRequest.usuario_id,
      banco_nome: selectedRequest.banco_nome,
      login: approvalFormData.login,
      senha: approvalFormData.senha,
      link_acesso: approvalFormData.link_acesso,
      status: 'Ativo',
      criado_por_admin: user?.id || '',
      observation: approvalFormData.observation
    });

    // 2. Update request status to 'Finalizado' (or 'Aprovado')
    await db.requests.updateStatus(selectedRequest.id, 'Finalizado', approvalFormData.observation, user?.id);

    // 3. Cleanup
    setIsApprovalModalOpen(false);
    setSelectedRequest(null);
    setApprovalFormData({ login: '', senha: '', link_acesso: '', observation: '' });
    await refreshRequests();
    notify('success', 'Credencial cadastrada e solicitação finalizada com sucesso!');
  };

  const handleAddBank = () => {
    if (newBankName && !availableBanks.includes(newBankName)) {
      setAvailableBanks([...availableBanks, newBankName]);
      setNewBankName('');
      setIsAddingBank(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (req.bank && req.bank.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Admin sees all, Seller sees only theirs (simulated by email check or just all for now if no auth filter implemented in db)
    // Assuming db returns all, we filter for seller if needed. 
    // But for this demo, let's assume db.requests.getAll() returns what the user is allowed to see or we filter here.
    const isOwner = isAdmin || req.userEmail === user?.email || req.email === user?.email;
    
    return matchesSearch && isOwner;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Dashboard Counters
  const statusCounts = {
    'Aguardando Criação': filteredRequests.filter(r => r.status === 'Aguardando Criação/Liberação' || r.status === 'Aguardando Documentos' || r.status === 'Solicitação com Pendência' || r.status === 'Aguardando Banco').length,
    'Recusado': filteredRequests.filter(r => r.status === 'Recusado' || r.status === 'Rejeitado').length,
    'Finalizado': filteredRequests.filter(r => r.status === 'Finalizado' || r.status === 'Aprovado').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Documentos': 
      case 'Aguardando Criação/Liberação': 
      case 'Solicitação com Pendência': 
      case 'Aguardando Banco': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Finalizado': 
      case 'Aprovado': return 'bg-green-100 text-green-800 border-green-200';
      case 'Recusado': 
      case 'Rejeitado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitação Usuário Banco</h1>
          <p className="text-slate-500">Gerencie acessos e senhas dos bancos parceiros.</p>
          <div className="mt-1 text-xs text-slate-400">
            Dúvidas ou problemas? Suporte: <a href="https://wa.me/5517991280211" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline hover:text-blue-700">(17) 99128-0211</a>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setIsResetFormOpen(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Solicitar Reset de Senha
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Usuário Banco
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className={`border-l-4 ${getStatusColor(status).replace('bg-', 'border-l-').split(' ')[2] || 'border-l-slate-400'}`}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <span className="text-2xl font-bold text-slate-900">{count}</span>
              <span className="text-xs font-medium text-slate-500 mt-1 uppercase">{status}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">Atenção Administrador:</span> Existem {pendingCount} solicitações pendentes de atenção.
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
              <CardTitle>Solicitar Reset de Senha</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsResetFormOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco <span className="text-red-500">*</span></label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    required
                    value={resetFormData.bank}
                    onChange={e => setResetFormData({...resetFormData, bank: e.target.value})}
                  >
                    <option value="">Selecione o Banco</option>
                    {availableBanks.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo da Solicitação <span className="text-red-500">*</span></label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    required
                    placeholder="Descreva o motivo..."
                    value={resetFormData.reason}
                    onChange={e => setResetFormData({...resetFormData, reason: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsResetFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                    Enviar Solicitação
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New User Form Modal */}
      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>Nova Solicitação de Acesso</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Correspondente</label>
                  <Input required value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input type="email" required value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Banco / Plataforma</label>
                  </div>
                  
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    required
                    value={formData.bank || ''} 
                    onChange={e => handleInputChange('bank', e.target.value)}
                  >
                    <option value="">Selecione um banco...</option>
                    {BANK_OPTIONS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">Dados do Vendedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo</label>
                    <Input required value={formData.sellerName || ''} onChange={e => handleInputChange('sellerName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CPF</label>
                    <Input required value={formData.cpf || ''} onChange={e => handleInputChange('cpf', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">RG</label>
                    <Input required value={formData.rg || ''} onChange={e => handleInputChange('rg', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input required value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Nascimento</label>
                    <Input type="date" required value={formData.birthDate || ''} onChange={e => handleInputChange('birthDate', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail do Vendedor</label>
                    <Input type="email" required value={formData.userEmail || ''} onChange={e => handleInputChange('userEmail', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Acesso</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                      value={formData.requestedAccessType || ''}
                      onChange={e => handleInputChange('requestedAccessType', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="Vendedor">Vendedor</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Operacional">Operacional</option>
                      <option value="Backoffice">Backoffice</option>
                    </select>
                  </div>
                  
                  {/* Address Fields */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-12 gap-4 border-t pt-4 mt-2">
                    <div className="md:col-span-12 mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">Endereço Completo</h4>
                    </div>
                    
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-sm font-medium">CEP</label>
                      <div className="relative">
                        <Input 
                          value={formData.cep || ''} 
                          onChange={e => handleInputChange('cep', e.target.value)}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        <div className="absolute right-3 top-2.5 text-slate-400">
                          {isLoadingCep ? <span className="animate-spin">⌛</span> : <Search className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-6 space-y-2">
                      <label className="text-sm font-medium">Rua / Logradouro</label>
                      <Input value={formData.street || ''} onChange={e => handleInputChange('street', e.target.value)} />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-sm font-medium">Número</label>
                      <Input id="number" value={formData.number || ''} onChange={e => handleInputChange('number', e.target.value)} />
                    </div>

                    <div className="md:col-span-4 space-y-2">
                      <label className="text-sm font-medium">Complemento</label>
                      <Input value={formData.complement || ''} onChange={e => handleInputChange('complement', e.target.value)} />
                    </div>

                    <div className="md:col-span-4 space-y-2">
                      <label className="text-sm font-medium">Bairro</label>
                      <Input value={formData.neighborhood || ''} onChange={e => handleInputChange('neighborhood', e.target.value)} />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-sm font-medium">Cidade</label>
                      <Input value={formData.city || ''} onChange={e => handleInputChange('city', e.target.value)} />
                    </div>

                    <div className="md:col-span-1 space-y-2">
                      <label className="text-sm font-medium">UF</label>
                      <Input value={formData.state || ''} onChange={e => handleInputChange('state', e.target.value)} maxLength={2} />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-3 mt-4">
                    <label className="text-sm font-medium">Chave Pix</label>
                    <Input required value={formData.pixKey || ''} onChange={e => handleInputChange('pixKey', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-4">Grupos de Comissão</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tabela FGTS <span className="text-red-500">*</span></label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      required
                      value={formData.fgtsGroup || ''} 
                      onChange={e => handleInputChange('fgtsGroup', e.target.value)}
                    >
                      <option value="">Selecionar Grupo FGTS</option>
                      {fgtsGroups.map(group => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tabela CLT <span className="text-red-500">*</span></label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      required
                      value={formData.cltGroup || ''} 
                      onChange={e => handleInputChange('cltGroup', e.target.value)}
                    >
                      <option value="">Selecionar Grupo CLT</option>
                      {cltGroups.map(group => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Outros Produtos</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      value={formData.othersGroup || ''} 
                      onChange={e => handleInputChange('othersGroup', e.target.value)}
                    >
                      <option value="">Selecionar Grupo Outros</option>
                      {othersGroups.map(group => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observação Interna</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.observation || ''}
                    onChange={e => handleInputChange('observation', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Mail className="w-4 h-4 mr-2" />
                  Solicitar Acesso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card id="requests-table">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Histórico de Solicitações</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 w-[200px]" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data Finalização</th>
                  <th className="px-4 py-3">Observação Admin</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium">
                      {new Date(req.createdAt).toLocaleDateString()}
                      <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{req.bank}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={req.tipo_solicitacao === 'reset_senha' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-blue-200 bg-blue-50 text-blue-700'}>
                        {req.tipo_solicitacao === 'reset_senha' ? 'Reset Senha' : 'Novo Usuário'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {req.data_finalizacao ? new Date(req.data_finalizacao).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={req.observacao_admin}>
                      {req.observacao_admin || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>Detalhes</Button>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b sticky top-0 z-10">
              <CardTitle>Detalhes da Solicitação</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase">Tipo</label>
                  <div>
                    <Badge variant="outline" className={selectedRequest.tipo_solicitacao === 'reset_senha' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-blue-200 bg-blue-50 text-blue-700'}>
                      {selectedRequest.tipo_solicitacao === 'reset_senha' ? 'Reset Senha' : 'Novo Usuário'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
                
                {selectedRequest.tipo_solicitacao === 'reset_senha' ? (
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Dados do Reset</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Banco</label>
                        <p className="font-medium text-lg">{selectedRequest.bank}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Motivo</label>
                        <p className="bg-slate-50 p-3 rounded border text-slate-700">{selectedRequest.motivo_reset}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Dados do Correspondente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Nome</label>
                        <p>{selectedRequest.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">E-mail</label>
                        <p>{selectedRequest.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Banco Solicitado</label>
                        <p className="font-medium text-blue-700">{selectedRequest.bank}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Tabela FGTS</label>
                        <p className="font-medium text-emerald-700">{selectedRequest.fgtsGroup || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Tabela CLT</label>
                        <p className="font-medium text-emerald-700">{selectedRequest.cltGroup || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Outros Produtos</label>
                        <p className="font-medium text-emerald-700">{selectedRequest.othersGroup || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedRequest.tipo_solicitacao === 'novo_usuario' && (
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Dados do Vendedor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Nome Completo</label>
                        <p>{selectedRequest.sellerName}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">CPF</label>
                        <p>{selectedRequest.cpf}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">RG</label>
                        <p>{selectedRequest.rg || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Data de Nascimento</label>
                        <p>{selectedRequest.birthDate ? new Date(selectedRequest.birthDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Telefone</label>
                        <p>{selectedRequest.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">E-mail Pessoal</label>
                        <p>{selectedRequest.userEmail || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Endereço</label>
                        <p>{selectedRequest.address || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Chave PIX</label>
                        <p className="font-mono bg-slate-50 p-2 rounded border">{selectedRequest.pixKey || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedRequest.observation && (
                  <div className="md:col-span-2 border-t pt-4">
                    <label className="text-xs font-medium text-slate-500 uppercase">Observação Interna</label>
                    <p className="bg-amber-50 p-3 rounded-md text-amber-900 border border-amber-100 mt-1">
                      {selectedRequest.observation}
                    </p>
                  </div>
                )}

                {selectedRequest.observacao_admin && (
                  <div className="md:col-span-2 border-t pt-4">
                    <label className="text-xs font-medium text-slate-500 uppercase">Observação do Admin</label>
                    <p className="bg-slate-100 p-3 rounded-md text-slate-900 border border-slate-200 mt-1">
                      {selectedRequest.observacao_admin}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-4 pt-4 border-t">
                {isAdmin && selectedRequest.status !== 'Finalizado' && selectedRequest.status !== 'Recusado' && selectedRequest.status !== 'Aprovado' && selectedRequest.status !== 'Rejeitado' && (
                  <div className="bg-slate-50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Ações Administrativas</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Motivo da Recusa (Obrigatório para recusar)</label>
                        <textarea 
                          className="w-full min-h-[80px] rounded-md border border-slate-300 p-2 text-sm"
                          placeholder="Digite o motivo da recusa..."
                          value={adminObservation}
                          onChange={e => setAdminObservation(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                          onClick={() => updateStatus(selectedRequest.id, 'Aguardando Criação/Liberação')}
                        >
                          Aguardando Criação
                        </Button>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white ml-auto" 
                          onClick={() => updateStatus(selectedRequest.id, 'Recusado')}
                        >
                          Recusar
                        </Button>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                          onClick={() => {
                            if (selectedRequest.tipo_solicitacao === 'reset_senha') {
                              updateStatus(selectedRequest.id, 'Finalizado');
                            } else {
                              setApprovalFormData({
                                ...approvalFormData,
                                link_acesso: selectedRequest.bank === 'Banco Pan' ? 'https://contas.bancopan.com.br/' : ''
                              });
                              setIsApprovalModalOpen(true);
                            }
                          }}
                        >
                          {selectedRequest.tipo_solicitacao === 'reset_senha' ? 'Senha Atualizada' : 'Aprovar e Cadastrar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>Fechar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Modal */}
      {isApprovalModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
              <CardTitle>Cadastrar Credenciais - {selectedRequest.bank}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsApprovalModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleApprove} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 mb-4">
                  Vendedor: <strong>{selectedRequest.sellerName}</strong><br/>
                  Banco: <strong>{selectedRequest.bank}</strong>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Login / Usuário <span className="text-red-500">*</span></label>
                  <Input 
                    required 
                    value={approvalFormData.login} 
                    onChange={e => setApprovalFormData({...approvalFormData, login: e.target.value})}
                    placeholder="Digite o login de acesso"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha <span className="text-red-500">*</span></label>
                  <Input 
                    required 
                    type="text"
                    value={approvalFormData.senha} 
                    onChange={e => setApprovalFormData({...approvalFormData, senha: e.target.value})}
                    placeholder="Digite a senha temporária"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link de Acesso</label>
                  <Input 
                    value={approvalFormData.link_acesso} 
                    onChange={e => setApprovalFormData({...approvalFormData, link_acesso: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observação (Opcional)</label>
                  <textarea 
                    className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={approvalFormData.observation}
                    onChange={e => setApprovalFormData({...approvalFormData, observation: e.target.value})}
                    placeholder="Instruções adicionais..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsApprovalModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Finalizar e Ativar
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
