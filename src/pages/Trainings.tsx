import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, PlayCircle, Filter, Plus, X, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const initialTrainings = [
  { id: 1, title: 'Técnicas de Venda Consignado', url: '#', category: 'Vendas', description: 'Aprenda as melhores técnicas para fechar vendas de crédito consignado.', bank: 'Geral', level: 'Iniciante', date: '2024-03-01' },
  { id: 2, title: 'Sistema Banco Pan - Passo a Passo', url: '#', category: 'Sistema', description: 'Tutorial completo de como operar o sistema do Banco Pan.', bank: 'Banco Pan', level: 'Intermediário', date: '2024-02-20' },
  { id: 3, title: 'Portabilidade: Como Ofertar', url: '#', category: 'Produto', description: 'Estratégias para ofertar portabilidade de crédito com sucesso.', bank: 'Itaú', level: 'Avançado', date: '2024-02-15' },
  { id: 4, title: 'Compliance e LGPD', url: '#', category: 'Jurídico', description: 'Normas de compliance e proteção de dados para correspondentes.', bank: 'Geral', level: 'Obrigatório', date: '2024-01-10' },
];

export default function Trainings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [trainings, setTrainings] = useState(initialTrainings);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '#',
    category: 'Vendas',
    bank: 'Geral',
    level: 'Iniciante'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTraining = {
      id: trainings.length + 1,
      ...formData,
      date: new Date().toISOString().split('T')[0],
    };
    setTrainings([newTraining, ...trainings]);
    setIsFormOpen(false);
    setFormData({
      title: '',
      description: '',
      url: '#',
      category: 'Vendas',
      bank: 'Geral',
      level: 'Iniciante'
    });
  };

  const filteredTrainings = trainings.filter(training => 
    training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    training.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treinamentos</h1>
          <p className="text-slate-500">Capacitação e desenvolvimento profissional.</p>
        </div>
        {isAdmin && (
          <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Treinamento
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>Novo Treinamento</CardTitle>
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
                    <option value="Vendas">Vendas</option>
                    <option value="Sistema">Sistema</option>
                    <option value="Produto">Produto</option>
                    <option value="Jurídico">Jurídico</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco</label>
                  <Input required value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={formData.level}
                    onChange={e => handleInputChange('level', e.target.value)}
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Obrigatório">Obrigatório</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">URL do Vídeo/Material</label>
                  <Input required value={formData.url} onChange={e => handleInputChange('url', e.target.value)} />
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
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar treinamentos..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.map((training) => (
          <Card key={training.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-slate-100 relative group cursor-pointer overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transform group-hover:scale-110 transition-all" />
              </div>
              <img 
                src={`https://picsum.photos/seed/${training.id}/400/225`} 
                alt={training.title} 
                className="w-full h-full object-cover mix-blend-multiply"
              />
            </div>
            <CardContent className="flex-1 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="text-xs">{training.category}</Badge>
                <span className="text-xs text-slate-500">{training.date}</span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">{training.title}</h3>
              <p className="text-sm text-slate-600 mb-4 flex-1 line-clamp-3">{training.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <div className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Nível:</span> {training.level}
                </div>
                <Button size="sm" className="bg-blue-900 hover:bg-blue-800">
                  Assistir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
