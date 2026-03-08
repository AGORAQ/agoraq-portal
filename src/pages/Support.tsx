import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HeadphonesIcon, Phone, MessageSquare, Globe, Instagram, Mail } from 'lucide-react';

export default function Support() {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5517991280211', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suporte</h1>
          <p className="text-slate-500">Canal de atendimento exclusivo ao vendedor.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow border-blue-200">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-900">
              <HeadphonesIcon className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Suporte ao Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              Canal único para todas as suas solicitações: dúvidas técnicas, comerciais, RH e administrativo.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                <Mail className="h-5 w-5 mr-3 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">E-mail Oficial</p>
                  <p className="text-sm text-slate-600">agoraq@agoraqoficial.com.br</p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                <Phone className="h-5 w-5 mr-3 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">WhatsApp Suporte</p>
                  <p className="text-sm text-slate-600">(17) 99128-0211</p>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg"
              onClick={handleWhatsAppClick}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Falar no WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Úteis e Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Site Oficial</p>
                  <a href="https://agoraqoficial.com/" target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    agoraqoficial.com
                  </a>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.open('https://agoraqoficial.com/', '_blank')}>
                Acessar
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Instagram</p>
                  <a href="https://instagram.com/AGORAQOFICIAL" target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    @AGORAQOFICIAL
                  </a>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.open('https://instagram.com/AGORAQOFICIAL', '_blank')}>
                Seguir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
