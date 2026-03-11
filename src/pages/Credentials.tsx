import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Eye, EyeOff, Copy, ExternalLink, Edit, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { PlatformCredential, Bank, User } from '@/types';

export default function Credentials() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PlatformCredential>>({
    status: 'Ativo'
  });

  const refreshData = () => {
    if (isAdmin) {
      setCredentials(db.credentials.getAll());
      setUsers(db.users.getAll().filter(u => u.role === 'vendedor'));
    } else if (user?.id) {
      setCredentials(db.credentials.getByUser(user.id));
    }
    setBanks(db.bancos.getAll());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredCredentials = credentials.filter(cred => 
    (cred.banco_nome || cred.bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cred.login || cred.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePassword = (id: string) => {
    setShowPassword(showPassword === id ? null : id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const handleInputChange = (field: keyof PlatformCredential, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.banco_nome || !formData.login || !formData.link_acesso || !formData.usuario_id) {
      alert('Preencha os campos obrigatórios (Banco, Link, Usuário e Vendedor).');
      return;
    }

    const credData: Omit<PlatformCredential, 'id' | 'data_criacao' | 'data_atualizacao'> = {
      usuario_id: formData.usuario_id!,
      banco_nome: formData.banco_nome!,
      link_acesso: formData.link_acesso!,
      login: formData.login!,
      senha: formData.senha || '',
      status: formData.status as 'Ativo' | 'Inativo' || 'Ativo',
      criado_por_admin: user?.id || '1',
      observation: formData.observation || ''
    };

    if (editingId) {
      db.credentials.update(editingId, credData as any);
    } else {
      db.credentials.create(credData);
    }

    refreshData();
    setIsFormOpen(false);
    setFormData({ status: 'Ativo' });
    setEditingId(null);
  };

  const handleEdit = (cred: PlatformCredential) => {
    setFormData({
      ...cred,
      banco_nome: cred.banco_nome || cred.bank,
      link_acesso: cred.link_acesso || cred.link,
      login: cred.login || cred.username,
      senha: cred.senha || cred.password
    });
    setEditingId(cred.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este acesso?')) {
      db.credentials.delete(id);
    refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuário Bancos</h1>
          <p className="text-slate-500">Central de acessos aos sistemas.</p>
        </div>
        {isAdmin && (
          <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
            setEditingId(null);
            setFormData({ status: 'Ativo' });
            setIsFormOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Acesso
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>{editingId ? 'Editar Acesso' : 'Novo Acesso'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendedor <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.usuario_id || ''}
                    onChange={e => handleInputChange('usuario_id', e.target.value)}
                  >
                    <option value="">Selecione um Vendedor</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco / Plataforma <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.banco_nome || ''}
                    onChange={e => handleInputChange('banco_nome', e.target.value)}
                  >
                    <option value="">Selecione um Banco</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.nome_banco}>{bank.nome_banco}</option>
                    ))}
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link de Acesso <span className="text-red-500">*</span></label>
                  <Input required value={formData.link_acesso || ''} onChange={e => handleInputChange('link_acesso', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário <span className="text-red-500">*</span></label>
                  <Input required value={formData.login || ''} onChange={e => handleInputChange('login', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input 
                    type="text" 
                    value={formData.senha || ''} 
                    onChange={e => handleInputChange('senha', e.target.value)} 
                    placeholder="Deixe em branco se não houver"
                  />
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
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Observação</label>
                  <Input value={formData.observation || ''} onChange={e => handleInputChange('observation', e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar por banco ou usuário..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Banco</th>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Observação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredentials.map((cred) => {
                    const seller = users.find(u => u.id === cred.usuario_id);
                    return (
                      <tr key={cred.id} className="border-b hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium">{cred.banco_nome || cred.bank}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{seller?.name || 'Desconhecido'}</div>
                          <div className="text-xs text-slate-500">{seller?.email}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{cred.login || cred.username}</td>
                        <td className="px-4 py-3">
                          <Badge variant={cred.status === 'Ativo' ? 'success' : 'secondary'}>
                            {cred.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                          {cred.observation || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cred)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cred.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCredentials.map((cred) => (
                <Card key={cred.id} className={`overflow-hidden border-slate-200 hover:shadow-md transition-shadow ${cred.status === 'Inativo' ? 'opacity-70 bg-slate-50' : ''}`}>
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{cred.banco_nome || cred.bank}</h3>
                        <p className="text-xs text-slate-500">Atualizado: {new Date(cred.data_atualizacao || cred.updatedAt || '').toLocaleDateString()}</p>
                      </div>
                      <Badge variant={cred.status === 'Ativo' ? 'success' : 'secondary'}>
                        {cred.status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Usuário</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-slate-50 px-2 py-1 rounded text-sm border border-slate-100 font-mono text-slate-700 truncate">
                            {cred.login || cred.username}
                          </code>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(cred.login || cred.username || '')} title="Copiar Usuário">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Senha</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-slate-50 px-2 py-1 rounded text-sm border border-slate-100 font-mono text-slate-700 truncate">
                            {showPassword === cred.id ? (cred.senha || cred.password) : '••••••••'}
                          </code>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePassword(cred.id)} title={showPassword === cred.id ? "Ocultar" : "Mostrar"}>
                            {showPassword === cred.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(cred.senha || cred.password || '')} title="Copiar Senha">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {cred.observation && (
                      <div className="bg-amber-50 p-2 rounded text-xs text-amber-800 border border-amber-100">
                        <span className="font-semibold">Obs:</span> {cred.observation}
                      </div>
                    )}

                    <div className="pt-2">
                      <Button className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" onClick={() => window.open(cred.link_acesso || cred.link, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir Link
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {filteredCredentials.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500">
              Nenhum acesso encontrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
