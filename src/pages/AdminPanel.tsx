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
  Mail, 
  Users, 
  FileText, 
  Link as LinkIcon, 
  Settings,
  Building2,
  Upload,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Bot,
  Key,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { emailService } from '@/services/emailService';
import { User, CommissionGroup, AccessRequest, Bank, CommissionTable } from '@/types';

export default function AdminPanel() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'commission_groups' | 'integrations' | 'contract' | 'settings' | 'banks' | 'ai_training'>('users');
  
  // Banks State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [bankFormData, setBankFormData] = useState<Partial<Bank>>({
    nome_banco: '', tipo_produto: 'Ambos', percentual_maximo: 15, status: 'Ativo'
  });
  const [selectedBankForConfig, setSelectedBankForConfig] = useState<string>('');
  
  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'vendedor', status: 'Ativo', fgtsGroup: '', cltGroup: '', password: ''
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

  const loadData = () => {
    setUsers(db.users.getAll());
    setAccessRequests(db.requests.getAll());
    setCommissionGroups(db.commissionGroups.getAll());
    setBanks(db.bancos.getAll());
  };

  useEffect(() => {
    loadData();
    
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
    const savedTerms = localStorage.getItem('admin_contract_terms');
    const savedLink = localStorage.getItem('admin_contract_link');
    if (savedTerms) setContractTerms(savedTerms);
    if (savedLink) setSignatureLink(savedLink);

    // Load settings
    const settings = db.settings.get();
    if (settings.canvaLink) setCanvaLink(settings.canvaLink);
    
    // Load AI config
    const savedPrompt = localStorage.getItem('ai_system_prompt');
    if (savedPrompt) {
      setAiSystemPrompt(savedPrompt);
    } else {
      setAiSystemPrompt("Você é um assistente útil e experiente da empresa AgoraQ, especializado em ajudar vendedores de crédito consignado. Você responde dúvidas sobre comissões, uso do CRM, captura de leads e roteiros operacionais. Seja conciso, profissional e motivador.");
    }
  }, [location.search]);

  const handleSaveContract = () => {
    localStorage.setItem('admin_contract_terms', contractTerms);
    localStorage.setItem('admin_contract_link', signatureLink);
    alert('Configurações do contrato salvas com sucesso!');
  };

  const handleSaveSettings = () => {
    db.settings.update({ canvaLink });
    alert('Configurações do sistema salvas com sucesso!');
  };

  const handleSaveAiConfig = () => {
    localStorage.setItem('ai_system_prompt', aiSystemPrompt);
    alert('Configurações da IA salvas com sucesso!');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Acesso Restrito</h2>
          <p className="text-slate-500">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData(userToEdit);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      db.users.delete(id);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      db.users.update(editingUser.id, formData);
      alert('Usuário atualizado com sucesso!');
    } else {
      const password = formData.password || '123456';
      
      db.users.create({
        name: formData.name || '',
        email: formData.email || '',
        role: formData.role as any,
        status: formData.status as any,
        password: password,
        fgtsGroup: formData.fgtsGroup,
        cltGroup: formData.cltGroup,
        bancos_permitidos: formData.bancos_permitidos
      });
      
      // Send credentials via email
      const emailResult = await emailService.sendCredentials(
        formData.email || '',
        formData.name || '',
        formData.email || '',
        password
      );

      if (emailResult.success) {
        if (emailResult.simulated) {
          alert(`Usuário criado com sucesso!\n\nNota: O sistema está em MODO DEMO. O e-mail para ${formData.email} foi SIMULADO no console. Configure o EmailJS para envio real.`);
        } else {
          alert(`Usuário criado com sucesso!\n\nAs credenciais foram enviadas para: ${formData.email}`);
        }
      } else {
        alert(`Usuário criado, mas houve um erro ao enviar o e-mail.\n\nVerifique as configurações do EmailJS no menu de configurações.`);
      }
    }
    loadData();
    setIsFormOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'vendedor', status: 'Ativo', fgtsGroup: '', cltGroup: '', password: '' });
  };

  // ... (existing code)

  const handleTestEmail = async () => {
    const email = prompt("Digite um e-mail para receber o teste:");
    if (email) {
      alert("Enviando e-mail de teste...");
      const result = await emailService.sendPasswordReset(email); // Reusing reset template for test
      alert(result.message);
    }
  };

  // ... (render code)

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configurações do Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="font-medium mb-2">Status da Configuração de E-mail</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    {import.meta.env.VITE_EMAILJS_SERVICE_ID ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>Service ID: {import.meta.env.VITE_EMAILJS_SERVICE_ID ? 'Configurado' : 'Não configurado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {import.meta.env.VITE_EMAILJS_PUBLIC_KEY ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>Public Key: {import.meta.env.VITE_EMAILJS_PUBLIC_KEY ? 'Configurado' : 'Não configurado'}</span>
                  </div>
                </div>
                
                <h3 className="font-medium mb-2">Teste de E-mail (EmailJS)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Verifique se as chaves de API estão configuradas corretamente enviando um e-mail de teste.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleTestEmail} variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar E-mail de Teste
                  </Button>
                </div>
              </div>

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
        </div>
      )}
  
  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.nome_banco) return;
    
    db.bancos.create({
      nome_banco: bankFormData.nome_banco,
      tipo_produto: bankFormData.tipo_produto as any,
      percentual_maximo: bankFormData.percentual_maximo || 15,
      status: bankFormData.status as any
    });
    
    loadData();
    setIsBankFormOpen(false);
    setBankFormData({ nome_banco: '', tipo_produto: 'Ambos', percentual_maximo: 15, status: 'Ativo' });
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name || !groupFormData.banco_id) {
      alert('Nome do grupo e Banco são obrigatórios.');
      return;
    }
    
    db.commissionGroups.create({
      name: groupFormData.name,
      type: groupFormData.type as 'FGTS' | 'CLT',
      banco_id: groupFormData.banco_id,
      status: groupFormData.status as 'Ativo' | 'Inativo'
    });
    
    loadData();
    setIsGroupFormOpen(false);
    setGroupFormData({ name: '', type: 'FGTS', status: 'Ativo', banco_id: '' });
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm('Remover este grupo?')) {
      db.commissionGroups.delete(id);
      loadData();
    }
  };

  const handleApproveRequest = async (req: AccessRequest) => {
    const password = '123'; // Default password
    
    // Approve request: Create user and update request status
    db.users.create({
      name: req.name,
      email: req.email,
      role: 'vendedor',
      status: 'Ativo',
      password: password,
      fgtsGroup: req.fgtsGroup,
      cltGroup: req.cltGroup
    });
    
    db.requests.updateStatus(req.id, 'Aprovado');
    
    // Send credentials via email
    const emailResult = await emailService.sendCredentials(
      req.email,
      req.name,
      req.email,
      password
    );

    loadData();
    
    if (emailResult.success) {
      if (emailResult.simulated) {
        alert(`Solicitação aprovada!\n\nUsuário criado. Nota: E-mail para ${req.email} SIMULADO (Modo Demo). Configure EmailJS para envio real.`);
      } else {
        alert(`Solicitação aprovada!\n\nUsuário criado e credenciais enviadas para: ${req.email}`);
      }
    } else {
      alert(`Solicitação aprovada e usuário criado, mas houve um erro ao enviar o e-mail.\n\nVerifique as configurações do EmailJS.`);
    }
  };

  const handleRejectRequest = (id: string) => {
    if (confirm('Rejeitar esta solicitação?')) {
      db.requests.updateStatus(id, 'Rejeitado');
      loadData();
    }
  };

  const handleResetPassword = async (email: string) => {
    if (confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) {
      const result = await emailService.sendPasswordReset(email);
      alert(result.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administração do Sistema</h1>
          <p className="text-slate-500">Gerencie usuários e solicitações de acesso.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'users' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários do Sistema
          </div>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'requests' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Solicitações de Cadastro
            {accessRequests.filter(r => r.status === 'Pendente').length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {accessRequests.filter(r => r.status === 'Pendente').length}
              </Badge>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'banks' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Configuração por Banco
          </div>
        </button>
        <button
          onClick={() => setActiveTab('commission_groups')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'commission_groups' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Grupos de Comissões
          </div>
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'integrations' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Integrações
          </div>
        </button>
        <button
          onClick={() => setActiveTab('contract')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'contract' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contrato de Serviço
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'settings' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ai_training')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'ai_training' 
              ? 'bg-white text-blue-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Treinamento IA
          </div>
        </button>
        <button
          onClick={() => navigate('/admin/avisos')}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-600 hover:text-slate-900"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Avisos e Notificações
          </div>
        </button>
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
            <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setIsBankFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Banco
            </Button>
          </div>

          {isBankFormOpen && (
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
                <CardTitle>Cadastrar Novo Banco</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBankFormOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome do Banco</label>
                      <Input required value={bankFormData.nome_banco} onChange={e => setBankFormData({...bankFormData, nome_banco: e.target.value})} placeholder="Ex: Banco Pan" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Produto</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={bankFormData.tipo_produto}
                        onChange={e => setBankFormData({...bankFormData, tipo_produto: e.target.value as any})}
                      >
                        <option value="FGTS">FGTS</option>
                        <option value="CLT">CLT</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Percentual Máximo (%)</label>
                      <Input type="number" step="0.01" value={bankFormData.percentual_maximo} onChange={e => setBankFormData({...bankFormData, percentual_maximo: parseFloat(e.target.value)})} />
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
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <Badge variant={bank.status === 'Ativo' ? 'success' : 'secondary'}>{bank.status}</Badge>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{bank.nome_banco}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Produto:</span>
                      <span className="font-medium">{bank.tipo_produto}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Máximo:</span>
                      <span className="font-bold text-blue-600">{bank.percentual_maximo}%</span>
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
                    <CardTitle>Configuração: {banks.find(b => b.id === selectedBankForConfig)?.nome_banco}</CardTitle>
                    <CardDescription>Gerencie grupos e tabelas de comissão vinculados a este banco.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx, .xls';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          alert(`Simulando processamento de: ${file.name}\n\n- Validando percentuais...\n- Criando grupos vinculados...\n- Sincronizando tabelas...\n\nImportação concluída com sucesso!`);
                          loadData();
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                Configurações do Dashboard
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
          <div className="flex justify-end">
            <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'vendedor', status: 'Ativo' });
              setIsFormOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
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
                    
                    {!editingUser && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Senha Inicial</label>
                        <Input 
                          type="text" 
                          required 
                          placeholder="Defina uma senha provisória"
                          value={formData.password || ''} 
                          onChange={e => handleInputChange('password', e.target.value)} 
                        />
                        <p className="text-xs text-slate-500">O usuário poderá alterar esta senha no primeiro acesso.</p>
                      </div>
                    )}
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
                      <label className="text-sm font-medium">Banco</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={formData.bancos_permitidos?.[0] || ''}
                        onChange={e => {
                          const bankId = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            bancos_permitidos: [bankId],
                            fgtsGroup: '',
                            cltGroup: ''
                          }));
                        }}
                      >
                        <option value="">Selecione um banco...</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.id}>{b.nome_banco}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tabela FGTS</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                        value={formData.fgtsGroup || ''}
                        onChange={e => handleInputChange('fgtsGroup', e.target.value)}
                        disabled={!formData.bancos_permitidos?.[0]}
                      >
                        <option value="">Nenhum</option>
                        {commissionGroups
                          .filter(g => g.type === 'FGTS' && g.banco_id === formData.bancos_permitidos?.[0])
                          .map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tabela CLT</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                        value={formData.cltGroup || ''}
                        onChange={e => handleInputChange('cltGroup', e.target.value)}
                        disabled={!formData.bancos_permitidos?.[0]}
                      >
                        <option value="">Nenhum</option>
                        {commissionGroups
                          .filter(g => g.type === 'CLT' && g.banco_id === formData.bancos_permitidos?.[0])
                          .map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar e Enviar Acesso
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
                      <th className="px-4 py-3 text-center">Contrato</th>
                      <th className="px-4 py-3">Último Acesso</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const contractKey = `contract_signed_${u.email}`;
                      const isContractSigned = localStorage.getItem(contractKey) === 'true';

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
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Badge variant={isContractSigned ? 'success' : 'warning'}>
                                {isContractSigned ? 'Assinado' : 'Pendente'}
                              </Badge>
                              
                              {!isContractSigned ? (
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white w-full max-w-[100px]"
                                  onClick={() => {
                                    if(confirm(`Deseja liberar o acesso ao sistema para ${u.name} sem a assinatura do contrato?`)) {
                                      localStorage.setItem(contractKey, 'true');
                                      // Forçar atualização da interface
                                      setUsers([...users]);
                                    }
                                  }}
                                >
                                  Liberar Acesso
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs px-3 border-red-200 text-red-600 hover:bg-red-50 w-full max-w-[100px]"
                                  onClick={() => {
                                    if(confirm(`Deseja revogar a assinatura de contrato de ${u.name}? O usuário será bloqueado no próximo acesso.`)) {
                                      localStorage.removeItem(contractKey);
                                      // Forçar atualização da interface
                                      setUsers([...users]);
                                    }
                                  }}
                                >
                                  Revogar
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {u.lastAccess}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleResetPassword(u.email)} title="Enviar Reset de Senha">
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
          <div className="flex justify-end">
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
                    <Button disabled={!isWebhookActive} onClick={() => alert('Configurações de Webhook salvas!')}>
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
    </div>
  );
}

