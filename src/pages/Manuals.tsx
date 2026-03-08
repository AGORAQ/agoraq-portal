import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, BookOpen, ChevronRight } from 'lucide-react';

const manuals = [
  { id: 1, title: 'Roteiro de Portabilidade Itaú', category: 'Operacional', description: 'Guia completo para realizar portabilidade de contratos para o Itaú.', responsible: 'Equipe de Produtos', date: '2024-03-01' },
  { id: 2, title: 'Esteira de Contratação Pan', category: 'Sistema', description: 'Fluxo de aprovação e documentos necessários para o Banco Pan.', responsible: 'Suporte Técnico', date: '2024-02-25' },
  { id: 3, title: 'Script de Vendas - Abordagem Inicial', category: 'Vendas', description: 'Roteiro de abordagem para clientes novos e base.', responsible: 'Gerência Comercial', date: '2024-02-10' },
  { id: 4, title: 'Manual de Prevenção a Fraudes', category: 'Segurança', description: 'Procedimentos para identificação e prevenção de fraudes.', responsible: 'Compliance', date: '2024-01-15' },
];

export default function Manuals() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredManuals = manuals.filter(manual => 
    manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manual.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roteiros Operacionais</h1>
          <p className="text-slate-500">Manuais e procedimentos internos.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar roteiros por título ou conteúdo..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredManuals.map((manual) => (
              <div key={manual.id} className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors">{manual.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{manual.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <Badge variant="secondary" className="text-xs font-normal">{manual.category}</Badge>
                      <span>Atualizado em: {manual.date}</span>
                      <span>Responsável: {manual.responsible}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
