import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Save, 
  X, 
  CheckCircle, 
  XCircle, 
  Users, 
  FileText, 
  Link as LinkIcon, 
  Settings,
  Building2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Bot,
  Key,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  LayoutDashboard,
  Bell,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { parseFile } from '@/lib/importer';
import { User, CommissionGroup, AccessRequest, Bank, CommissionTable } from '@/types';
import * as XLSX from 'xlsx';
import { runImportTests } from '@/tests/importTests';
import { Loader2, Database, UserPlus } from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'commission_groups' | 'integrations' | 'contract' | 'settings' | 'banks' | 'ai_training'>('users');

  // Sidebar Helper Components
  const SidebarItem = ({ id, icon: Icon, label, badge, active, onClick }: { id: string, icon: any, label: string, badge?: number, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-blue-900 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:pl-5'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <Badge variant="destructive" className="h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full text-[10px] bg-red-500 border-none">
            {badge}
          </Badge>
        )}
        <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'rotate-90 opacity-100' : 'opacity-0'}`} />
      </div>
    </button>
  );

  const SidebarCategory = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-1 mb-6">
      <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
  
  // Banks State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankFormData, setBankFormData] = useState<Partial<Bank>>({
    nome: '', status: 'Ativo'
  });
  const [selectedBankForConfig, setSelectedBankForConfig] = useState<string>('');
  
  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'vendedor', status: 'Ativo', grupo_comissao: 'OURO', password: ''
  });

  // Commission Groups State
  const [commissionGroups, setCommissionGroups] = useState<CommissionGroup[]>([]);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState<Partial<CommissionGroup>>({
    name: '', type: 'FGTS', status: 'Ativo'
  });

  // Access Requests State
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);

  // Integrations State
  const [apiKey, setApiKey] = useState('sk_live_51M...');
  const [webhookUrl, setWebhookUrl] = useState('https://meusistema.com/webhook');
  const [isWebhookActive, setIsWebhookActive] = useState(true);

  // Contract State
  const [contractTerms, setContractTerms] = useState('');
  const [signatureLink, setSignatureLink] = useState('');

  // Settings State
  const [canvaLink, setCanvaLink] = useState('https://www.canva.com/');
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');

  // Password Modal State
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    password: '';
    userName: '';
    type: 'create' | 'reset';
  }>({
    isOpen: false,
    password: '',
    userName: '',
    type: 'create'
  });
  const [copied, setCopied] = useState(false);

  const [isTesting, setIsTesting] = useState(false);

  const handleRunTests = async () => {
    if (!confirm('Deseja rodar os testes de integridade do sistema? Isso criará dados de teste.')) return;
    setIsTesting(true);
    const success = await runImportTests();
    setIsTesting(false);
    if (success) {
      alert('Testes concluídos com sucesso! Verifique o console para detalhes.');
      loadData();
    } else {
      alert('Falha nos testes. Verifique o console para erros.');
    }
  };

  const loadData = async () => {
    const [allUsers, allRequests, allGroups, allBanks] = await Promise.all([
      db.users.getAll(),
      db.requests.getAll(),
      db.commissionGroups.getAll(),
      db.bancos.getAll()
    ]);
    setUsers(allUsers);
    setAccessRequests(allRequests);
    setCommissionGroups(allGroups);
    setBanks(allBanks);
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      
      const params = new URLSearchParams(location.search);
      if (params.get('action') === 'new') {
        setActiveTab('users');
        setIsFormOpen(true);
        setEditingUser(null);
        setFormData({ name: '', email: '', role: 'vendedor', status: 'Ativo' });
      }
      if (params.get('tab') === 'requests') {
        setActiveTab('requests');
      }

      // Load contract config
      const settings = await db.settings.get();
      if (settings.contractTerms) setContractTerms(settings.contractTerms);
      if (settings.signatureLink) setSignatureLink(settings.signatureLink);
      if (settings.canvaLink) setCanvaLink(settings.canvaLink);
      
      // Load AI config
      if (settings.aiSystemPrompt) {
        setAiSystemPrompt(settings.aiSystemPrompt);
      } else {
        setAiSystemPrompt("Você é um assistente útil e experiente da empresa AgoraQ, especializado em ajudar vendedores de crédito consignado. Você responde dúvidas sobre comissões, uso do CRM, captura de leads e roteiros operacionais. Seja conciso, profissional e motivador.");
      }
    };
    init();
  }, [location.search]);

  const handleSaveContract = async () => {
    await db.settings.update({ contractTerms, signatureLink });
    alert('Configurações do contrato salvas com sucesso!');
  };

  const handleSaveSettings = async () => {
    await db.settings.update({ canvaLink });
    alert('Configurações do sistema salvas com sucesso!');
  };

  const handleSaveAiConfig = async () => {
    await db.settings.update({ aiSystemPrompt });
    alert('Configurações da IA salvas com sucesso!');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Acesso Restrito</h2>
          <p className="text-slate-500">Apenas administradores e supervisores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({ ...userToEdit, password: '' });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      await db.users.delete(id);
      await loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updates = { ...formData };
      if (!updates.password) {
        delete updates.password;
      }
      await db.users.update(editingUser.id, updates);
      alert('Usuário atualizado com sucesso!');
    } else {
      // Use provided password or generate one
      const finalPassword = formData.password || db.utils.generatePassword(12);
      
      try {
        await db.users.create({
          name: formData.name,
          email: formData.email,
          password: finalPassword,
          role: formData.role,
          status: formData.status,
          grupo_comissao: formData.grupo_comissao
        });

        setPasswordModal({
          isOpen: true,
          password: finalPassword as any,
          userName: formData.name,
          type: 'create'
        });
      } catch (error: any) {
        console.error('Error creating user:', error);
        alert('Erro ao criar usuário: ' + error.message);
        return;
      }
    }
    await loadData();
    setIsFormOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'vendedor', status: 'Ativo', grupo_comissao: 'OURO', password: '' });
  };

  const handleTestEmail = async () => {
    alert("O serviço de e-mail foi desativado. As senhas agora são geradas localmente.");
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.nome) return;
    
    if (editingBank) {
      await db.bancos.update(editingBank.id, {
        nome: bankFormData.nome,
        cor: bankFormData.cor,
        status: bankFormData.status as any
      });
      alert('Banco atualizado com sucesso!');
    } else {
      await db.bancos.create({
        nome: bankFormData.nome,
        cor: bankFormData.cor,
        status: bankFormData.status as any
      });
      alert('Banco cadastrado com sucesso!');
    }
    
    await loadData();
    setIsBankFormOpen(false);
    setEditingBank(null);
    setBankFormData({ nome: '', status: 'Ativo' });
  };

  const handleDeleteBank = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este banco? Todos os grupos vinculados também serão afetados.')) {
      await db.bancos.delete(id);
      await loadData();
    }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name || !groupFormData.banco_id) {
      alert('Nome do grupo e Banco são obrigatórios.');
      return;
    }
    
    await db.commissionGroups.create({
      name: groupFormData.name,
      type: groupFormData.type as 'FGTS' | 'CLT' | 'Outros',
      banco_id: groupFormData.banco_id,
      status: groupFormData.status as 'Ativo' | 'Inativo'
    });
    
    await loadData();
    setIsGroupFormOpen(false);
    setGroupFormData({ name: '', type: 'FGTS', status: 'Ativo', banco_id: '' });
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Remover este grupo?')) {
      await db.commissionGroups.delete(id);
      await loadData();
    }
  };

  const handleApproveRequest = async (req: AccessRequest) => {
    let finalPassword = db.utils.generatePassword(12);
    const manualPassword = prompt(`Defina uma senha para ${req.name} (ou deixe em branco para gerar automaticamente):`);
    
    if (manualPassword !== null && manualPassword !== '') {
      finalPassword = manualPassword;
    }
    
    // Approve request: Create user and update request status
    try {
      const newUser = await db.users.create({
        name: req.name,
        email: req.email,
        role: 'vendedor',
        status: 'Ativo',
        password: finalPassword,
        grupo_comissao: 'OURO' // Default group for new requests
      });
      
      if (newUser) {
        await db.requests.updateStatus(req.id, 'Aprovado');
        await loadData();
        
        setPasswordModal({
          isOpen: true,
          password: finalPassword as any,
          userName: newUser.name,
          type: 'create'
        });
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.message || 'Erro ao aprovar solicitação.');
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (confirm('Rejeitar esta solicitação?')) {
      await db.requests.updateStatus(id, 'Rejeitado');
      await loadData();
    }
  };

  const handleResetPassword = async (userToReset: User) => {
    const newPassword = prompt(`Digite a nova senha para ${userToReset.name}:`);
    
    if (newPassword) {
      try {
        await db.users.resetPassword(userToReset.id, newPassword);

        setPasswordModal({
          isOpen: true,
          password: newPassword as any,
          userName: userToReset.name,
          type: 'reset'
        });
        await loadData();
      } catch (error: any) {
        console.error('Error resetting password:', error);
        alert(error.message || 'Erro ao resetar senha.');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 -m-4 md:-m-8 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-900 rounded-xl flex items-center justify-center text-white shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel de Administração</h1>
              <p className="text-slate-500 text-sm">Controle total sobre usuários, comissões e configurações do sistema.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-slate-900">{user?.name}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Administrador Master</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
              <UserIcon className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
                <SidebarCategory label="Gestão de Pessoas">
                  <SidebarItem 
                    id="users" 
                    icon={Users} 
                    label="Usuários do Sistema" 
                    active={activeTab === 'users'} 
                    onClick={() => setActiveTab('users')} 
                  />
                  <SidebarItem 
                    id="requests" 
                    icon={FileText} 
                    label="Solicitações de Acesso" 
                    badge={accessRequests.filter(r => r.status === 'Pendente').length} 
                    active={activeTab === 'requests'} 
                    onClick={() => setActiveTab('requests')} 
                  />
                </SidebarCategory>
                
                <SidebarCategory label="Comissões e Bancos">
                  <SidebarItem 
                    id="banks" 
                    icon={Building2} 
                    label="Bancos Parceiros" 
                    active={activeTab === 'banks'} 
                    onClick={() => setActiveTab('banks')} 
                  />
                  <SidebarItem 
                    id="commission_groups" 
                    icon={DollarSign} 
                    label="Grupos de Comissão" 
                    active={activeTab === 'commission_groups'} 
                    onClick={() => setActiveTab('commission_groups')} 
                  />
                </SidebarCategory>

                <SidebarCategory label="Configurações">
                  <SidebarItem 
                    id="settings" 
                    icon={Settings} 
                    label="Configurações Gerais" 
                    active={activeTab === 'settings'} 
                    onClick={() => setActiveTab('settings')} 
                  />
                  <SidebarItem 
                    id="contract" 
                    icon={FileText} 
                    label="Contrato Digital" 
                    active={activeTab === 'contract'} 
                    onClick={() => setActiveTab('contract')} 
                  />
                </SidebarCategory>

                <SidebarCategory label="Avançado">
                  <SidebarItem 
                    id="integrations" 
                    icon={LinkIcon} 
                    label="Integrações API" 
                    active={activeTab === 'integrations'} 
                    onClick={() => setActiveTab('integrations')} 
                  />
                  <SidebarItem 
                    id="ai_training" 
                    icon={Bot} 
                    label="Treinamento da IA" 
                    active={activeTab === 'ai_training'} 
                    onClick={() => setActiveTab('ai_training')} 
                  />
                </SidebarCategory>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
            {/* Tab Content Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-blue-600 font-medium capitalize">
                  {activeTab.replace('_', ' ')}
                </span>
              </div>
            </div>

      {activeTab === 'ai_training' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                Treinamento do Assistente Virtual
              </CardTitle>
              <CardDescription>
                Configure como a IA deve se comportar e quais informações ela deve priorizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Dica:</strong> Defina a "persona" da IA, o tom de voz e as regras de negócio principais. 
                  Quanto mais específico for o prompt do sistema, melhores serão as respostas.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prompt do Sistema (Instruções Principais)</label>
                  <textarea
                    className="flex min-h-[300px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 font-mono"
                    placeholder="Você é um assistente útil..."
                    value={aiSystemPrompt}
                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveAiConfig} className="bg-blue-900 hover:bg-blue-800">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Treinamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Bancos e Comissões</h2>
            <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
              setEditingBank(null);
              setBankFormData({ nome_banco: '', tipo_produto: 'Ambos', percentual_maximo: 15, status: 'Ativo' });
              setIsBankFormOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Banco
            </Button>
          </div>

          {isBankFormOpen && (
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
                <CardTitle>{editingBank ? 'Editar Banco' : 'Cadastrar Novo Banco'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBankFormOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome do Banco</label>
                      <Input required value={bankFormData.nome} onChange={e => setBankFormData({...bankFormData, nome: e.target.value})} placeholder="Ex: Banco Pan" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cor (Hex)</label>
                      <div className="flex gap-2">
                        <Input value={bankFormData.cor} onChange={e => setBankFormData({...bankFormData, cor: e.target.value})} placeholder="#000000" />
                        <div className="w-10 h-10 rounded border" style={{ backgroundColor: bankFormData.cor || '#000' }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={bankFormData.status}
                        onChange={e => setBankFormData({...bankFormData, status: e.target.value as any})}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsBankFormOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Banco
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {banks.map(bank => (
              <Card key={bank.id} className={`cursor-pointer transition-all border-2 ${selectedBankForConfig === bank.id ? 'border-blue-600 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'}`} onClick={() => setSelectedBankForConfig(bank.id)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-bold text-lg text-slate-900">{bank.nome}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bank.cor || '#000' }} />
                          <Badge variant={bank.status === 'Ativo' ? 'success' : 'secondary'} className="text-[10px]">{bank.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={(e) => {
                        e.stopPropagation();
                        setEditingBank(bank);
                        setBankFormData({
                          nome: bank.nome,
                          cor: bank.cor,
                          status: bank.status
                        });
                        setIsBankFormOpen(true);
                      }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBank(bank.id);
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedBankForConfig && (
            <Card className="animate-in slide-in-from-top-4">
              <CardHeader className="border-b bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Configuração: {banks.find(b => b.id === selectedBankForConfig)?.nome}</CardTitle>
                    <CardDescription>Gerencie grupos e tabelas de comissão vinculados a este banco.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx, .xls';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          try {
                            const { data: jsonData, errors } = await parseFile(file);
                            
                            if (errors.length > 0) {
                              alert(errors[0]);
                              return;
                            }

                            const bank = banks.find(b => b.id === selectedBankForConfig);
                            if (!bank) return;

                            const commsToImport = jsonData.map(row => {
                              // Helper to parse percentages that might be 0.15 or 15
                              const parsePct = (val: any) => {
                                const n = Number(val || 0);
                                if (n > 0 && n < 1) return n * 100;
                                return n;
                              };

                              return {
                                banco: bank.nome_banco,
                                produto: row.produto || row.product || bank.tipo_produto,
                                operacao: row.operacao || row.operation || 'Normal',
                                parcelas: String(row.parcelas || row.term || '84x'),
                                codigo_tabela: row.codigo_tabela || row.code || 'TAB_' + Math.random().toString(36).substring(7),
                                nome_tabela: row.nome_tabela || row.table_name || 'Tabela Importada',
                                faixa_valor_min: Number(row.faixa_valor_min || 0),
                                faixa_valor_max: Number(row.faixa_valor_max || 999999),
                                percentual_total_empresa: parsePct(row.percentual_empresa || row.percentual_total_empresa),
                                comissao_master: parsePct(row.comissao_master),
                                comissao_ouro: parsePct(row.comissao_ouro),
                                comissao_prata: parsePct(row.comissao_prata),
                                comissao_plus: parsePct(row.comissao_plus),
                                status: 'Ativo' as const,
                                criado_por: user?.id || 'admin'
                              };
                            });

                            await db.commissions.import(commsToImport, user?.role || 'admin', user?.id || '1');
                            alert(`${commsToImport.length} tabelas importadas com sucesso!`);
                            loadData();
                          } catch (error) {
                            console.error('Error importing commissions:', error);
                            alert('Erro ao processar o arquivo. Verifique o formato.');
                          }
                        }
                      };
                      input.click();
                    }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Planilha
                    </Button>
                    <Button size="sm" className="bg-blue-900" onClick={() => setIsGroupFormOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Grupo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Badge className="bg-blue-600">FGTS</Badge>
                      Grupos Vinculados
                    </h4>
                    <div className="space-y-2">
                      {commissionGroups.filter(g => g.banco_id === selectedBankForConfig && g.type === 'FGTS').map(g => (
                        <div key={g.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                          <span className="font-medium">{g.name}</span>
                          <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleDeleteGroup(g.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Badge className="bg-emerald-600">CLT</Badge>
                      Grupos Vinculados
                    </h4>
                    <div className="space-y-2">
                      {commissionGroups.filter(g => g.banco_id === selectedBankForConfig && g.type === 'CLT').map(g => (
                        <div key={g.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                          <span className="font-medium">{g.name}</span>
                          <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleDeleteGroup(g.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Badge className="bg-amber-600">Outros</Badge>
                      Grupos Vinculados
                    </h4>
                    <div className="space-y-2">
                      {commissionGroups.filter(g => g.banco_id === selectedBankForConfig && g.type === 'Outros').map(g => (
                        <div key={g.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                          <span className="font-medium">{g.name}</span>
                          <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleDeleteGroup(g.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configurações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link do Canva (Foto WhatsApp)</label>
                  <Input 
                    placeholder="https://www.canva.com/..." 
                    value={canvaLink}
                    onChange={(e) => setCanvaLink(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Este é o link que será aberto quando o vendedor clicar no card "Foto WhatsApp" no Dashboard.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveSettings} className="bg-blue-900 hover:bg-blue-800">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <RefreshCw className="w-5 h-5" />
                Sincronização de Dados
              </CardTitle>
              <CardDescription>
                O sistema está sincronizado com o servidor central.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Conectado ao servidor oficial: <strong>{db.API_URL}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Ferramentas de Sistema
              </CardTitle>
              <CardDescription>
                Ferramentas para manutenção e backup de dados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="outline" 
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar o cache do sistema?')) {
                      localStorage.clear();
                      alert('Cache limpo com sucesso! O sistema será reiniciado.');
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Cache do Sistema
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    const data: any = {
                      export_date: new Date().toISOString(),
                      app: 'AgoraQ'
                    };
                    // Export relevant settings or logs if needed
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `agoraq_system_export_${new Date().toISOString()}.json`;
                    a.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Exportar Relatório de Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'contract' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Configuração do Contrato de Prestação de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  Configure aqui os termos que o vendedor deve aceitar e o link para assinatura digital.
                  O vendedor será bloqueado de usar o sistema até que confirme a assinatura.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Termos do Contrato (Texto)</label>
                  <textarea
                    className="flex min-h-[200px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    placeholder="Cole aqui os termos do contrato que serão exibidos para o vendedor..."
                    value={contractTerms}
                    onChange={(e) => setContractTerms(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Link para Assinatura Digital (DocuSign, ClickSign, etc.)</label>
                  <Input 
                    placeholder="https://..." 
                    value={signatureLink}
                    onChange={(e) => setSignatureLink(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    O usuário será redirecionado para este link para realizar a assinatura.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveContract} className="bg-blue-900 hover:bg-blue-800">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Usuários do Sistema</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRunTests} 
                disabled={isTesting}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                Rodar Testes
              </Button>
              <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
                setEditingUser(null);
                setFormData({ name: '', email: '', role: 'vendedor', status: 'Ativo' });
                setIsFormOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>

          {isFormOpen && (
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
                <CardTitle>{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome Completo</label>
                      <Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">E-mail</label>
                      <Input type="email" required value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Senha {editingUser ? '(Deixe em branco para manter)' : ''}</label>
                      <Input 
                        type="text" 
                        placeholder={editingUser ? "Nova senha..." : "Defina uma senha ou deixe em branco para gerar"} 
                        value={formData.password || ''} 
                        onChange={e => handleInputChange('password', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Perfil de Acesso</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={formData.role}
                        onChange={e => handleInputChange('role', e.target.value)}
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={formData.status}
                        onChange={e => handleInputChange('status', e.target.value)}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grupo de Comissão</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={formData.grupo_comissao}
                        onChange={e => handleInputChange('grupo_comissao', e.target.value)}
                        required
                      >
                        <option value="MASTER">MASTER</option>
                        <option value="OURO">OURO</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                      <Save className="w-4 h-4 mr-2" />
                      {editingUser ? 'Salvar Alterações' : 'Criar Usuário e Gerar Senha'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Buscar usuário..." 
                    className="pl-9" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Último Acesso</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      return (
                        <tr key={u.id} className="border-b hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <UserIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{u.name}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize bg-slate-50">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.status === 'Ativo' ? 'success' : 'secondary'}>
                              {u.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {u.lastAccess}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleResetPassword(u)} title="Resetar Senha">
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(u)} title="Editar Usuário">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(u.id)} title="Remover Usuário">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'commission_groups' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Grupos de Comissão</h2>
            <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setIsGroupFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
          </div>

          {isGroupFormOpen && (
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
                <CardTitle>Cadastrar Novo Grupo de Comissão</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsGroupFormOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Banco Vinculado</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={groupFormData.banco_id || ''}
                        onChange={e => setGroupFormData({...groupFormData, banco_id: e.target.value})}
                        required
                      >
                        <option value="">Selecione um banco...</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.id}>{b.nome_banco}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome do Grupo</label>
                      <Input required value={groupFormData.name} onChange={e => setGroupFormData({...groupFormData, name: e.target.value})} placeholder="Ex: DIAMANTE" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={groupFormData.type}
                        onChange={e => setGroupFormData({...groupFormData, type: e.target.value as any})}
                      >
                        <option value="FGTS">FGTS</option>
                        <option value="CLT">CLT</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={groupFormData.status}
                        onChange={e => setGroupFormData({...groupFormData, status: e.target.value as any})}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsGroupFormOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Grupo
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grupos FGTS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commissionGroups.filter(g => g.type === 'FGTS').map(group => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="font-medium text-slate-900">{group.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={group.status === 'Ativo' ? 'success' : 'secondary'}>{group.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {commissionGroups.filter(g => g.type === 'FGTS').length === 0 && (
                    <p className="text-center text-slate-500 py-4">Nenhum grupo FGTS cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grupos CLT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commissionGroups.filter(g => g.type === 'CLT').map(group => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="font-medium text-slate-900">{group.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={group.status === 'Ativo' ? 'success' : 'secondary'}>{group.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {commissionGroups.filter(g => g.type === 'CLT').length === 0 && (
                    <p className="text-center text-slate-500 py-4">Nenhum grupo CLT cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-slate-900">Solicitações de Acesso</h2>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
              <div>
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Link Público para Cadastro
                </h3>
                <p className="text-sm text-blue-700">Envie este link para novos vendedores solicitarem acesso ao sistema.</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2 items-center">
                <code className="flex-1 sm:flex-none bg-white px-3 py-2 rounded border border-blue-200 text-sm text-slate-600 font-mono truncate max-w-[200px] sm:max-w-xs">
                  {window.location.origin}/solicitar-acesso
                </code>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-blue-100 text-blue-700 border-blue-200"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/solicitar-acesso`);
                    alert('Link copiado para a área de transferência!');
                  }}
                >
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Cadastro (Novos Vendedores)</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Local</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-slate-50/50">
                      <td className="px-4 py-3">{req.date}</td>
                      <td className="px-4 py-3 font-medium">{req.name}</td>
                      <td className="px-4 py-3">
                        <div>{req.email}</div>
                        <div className="text-xs text-slate-500">{req.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        {req.city}/{req.state}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={
                          req.status === 'Aprovado' ? 'success' : 
                          req.status === 'Pendente' ? 'warning' : 'destructive'
                        }>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'Pendente' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApproveRequest(req)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleRejectRequest(req.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {accessRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma solicitação pendente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                Integração via API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-4">
                  Utilize esta chave de API para integrar o AgoraQ com outros sistemas (CRM, ERP, etc.).
                  Mantenha esta chave segura e não a compartilhe publicamente.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 font-mono text-sm text-slate-600">
                    {apiKey}
                  </div>
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    alert('Chave de API copiada!');
                  }}>
                    Copiar
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                    if(confirm('Tem certeza? A chave antiga deixará de funcionar imediatamente.')) {
                      setApiKey('sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
                    }
                  }}>
                    Gerar Nova
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-slate-900">Ativar Webhooks</label>
                    <p className="text-sm text-slate-500">Receba notificações em tempo real sobre eventos do sistema.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="toggle" 
                      checked={isWebhookActive} 
                      onChange={(e) => setIsWebhookActive(e.target.checked)}
                    />
                    <span className="text-sm font-medium">{isWebhookActive ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL do Webhook</label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrl} 
                      onChange={(e) => setWebhookUrl(e.target.value)} 
                      placeholder="https://seu-sistema.com/webhook"
                      disabled={!isWebhookActive}
                    />
                    <Button disabled={!isWebhookActive} onClick={async () => {
                      await db.settings.update({ webhookUrl, isWebhookActive });
                      alert('Configurações de Webhook salvas!');
                    }}>
                      Salvar
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                  <h4 className="font-medium text-sm mb-2">Eventos Disparados:</h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    <li><code>sale.created</code> - Nova venda cadastrada</li>
                    <li><code>sale.updated</code> - Status de venda atualizado</li>
                    <li><code>user.created</code> - Novo usuário cadastrado</li>
                    <li><code>commission.paid</code> - Pagamento de comissão realizado</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Password Display Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-blue-200">
            <CardHeader className="bg-slate-50 rounded-t-xl border-b">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Key className="w-5 h-5" />
                {passwordModal.type === 'create' ? 'Usuário Criado com Sucesso!' : 'Senha Resetada com Sucesso!'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-slate-600">
                  A senha para <strong>{passwordModal.userName}</strong> foi gerada:
                </p>
                <div className="relative group">
                  <div className="bg-slate-100 p-4 rounded-lg font-mono text-2xl font-bold tracking-wider text-blue-900 border-2 border-dashed border-blue-200 select-all">
                    {passwordModal.password}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(passwordModal.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Senha
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Aviso de Segurança:</p>
                  <p>Envie esta senha ao usuário de forma segura. Por segurança, ela não será exibida novamente.</p>
                </div>
              </div>

              <Button 
                className="w-full bg-slate-900 hover:bg-slate-800" 
                onClick={() => setPasswordModal({ ...passwordModal, isOpen: false })}
              >
                Entendido, já salvei a senha
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}

