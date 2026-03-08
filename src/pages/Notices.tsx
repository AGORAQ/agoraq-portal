import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Bell, AlertTriangle, Info, CheckCircle2, Plus, X, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const initialNotices = [
  { 
    id: 1, 
    title: 'Nova Tabela INSS - Vigência Imediata', 
    description: 'A partir de hoje, entra em vigor a nova tabela de coeficientes para empréstimo consignado INSS. Favor consultar a aba de Comissões.', 
    category: 'Urgente', 
    date: '06 Mar 2024', 
    priority: 'high', 
    author: 'Diretoria Comercial' 
  },
  { 
    id: 2, 
    title: 'Manutenção Programada - Sistema Pan', 
    description: 'O sistema do Banco Pan passará por manutenção neste sábado, das 14h às 18h. O acesso ficará indisponível durante este período.', 
    category: 'Aviso', 
    date: '05 Mar 2024', 
    priority: 'medium', 
    author: 'TI' 
  },
  { 
    id: 3, 
    title: 'Treinamento de Vendas - FGTS', 
    description: 'Convidamos todos para o treinamento sobre antecipação de Saque Aniversário FGTS. Link disponível na aba de Treinamentos.', 
    category: 'Treinamento', 
    date: '04 Mar 2024', 
    priority: 'low', 
    author: 'RH' 
  },
  { 
    id: 4, 
    title: 'Alteração na Política de Portabilidade', 
    description: 'Houve uma atualização nas regras de portabilidade do Banco Itaú. Verifique o novo roteiro operacional.', 
    category: 'Comercial', 
    date: '03 Mar 2024', 
    priority: 'medium', 
    author: 'Supervisão' 
  },
];

export default function Notices() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  
  const [notices, setNotices] = useState(initialNotices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Aviso',
    priority: 'medium',
    author: user?.name || 'Administrador'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotice = {
      id: notices.length + 1,
      ...formData,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setNotices([newNotice, ...notices]);
    setIsFormOpen(false);
    setFormData({
      title: '',
      description: '',
      category: 'Aviso',
      priority: 'medium',
      author: user?.name || 'Administrador'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Informativos</h1>
          <p className="text-slate-500">Mural de comunicados e avisos importantes.</p>
        </div>
        {isAdmin && (
          <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Informativo
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>Novo Informativo</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <Input required value={formData.title} onChange={e => handleInputChange('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={formData.category}
                    onChange={e => handleInputChange('category', e.target.value)}
                  >
                    <option value="Aviso">Aviso</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Treinamento">Treinamento</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={formData.priority}
                    onChange={e => handleInputChange('priority', e.target.value)}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Autor</label>
                  <Input required value={formData.author} onChange={e => handleInputChange('author', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    required
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Save className="w-4 h-4 mr-2" />
                  Publicar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {notices.map((notice) => (
          <Card key={notice.id} className={`border-l-4 ${
            notice.priority === 'high' ? 'border-l-red-500' : 
            notice.priority === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {notice.priority === 'high' ? <AlertTriangle className="text-red-500 h-6 w-6" /> :
                   notice.priority === 'medium' ? <Info className="text-amber-500 h-6 w-6" /> :
                   <CheckCircle2 className="text-blue-500 h-6 w-6" />}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{notice.title}</h3>
                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                      <span>{notice.date}</span>
                      <span>•</span>
                      <span>Por: {notice.author}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={
                  notice.category === 'Urgente' ? 'destructive' : 
                  notice.category === 'Aviso' ? 'warning' : 'secondary'
                }>
                  {notice.category}
                </Badge>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {notice.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
