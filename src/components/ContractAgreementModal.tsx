import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export function ContractAgreementModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [contractTerms, setContractTerms] = useState('');
  const [signatureLink, setSignatureLink] = useState('');
  const [hasVisitedLink, setHasVisitedLink] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if contract is configured
    const terms = localStorage.getItem('admin_contract_terms');
    const link = localStorage.getItem('admin_contract_link');

    if (!terms || !link) return; // No contract configured, skip

    setContractTerms(terms);
    setSignatureLink(link);

    // Check if user has already signed
    // Use email as the primary key for consistency with Admin Panel
    const signedKey = `contract_signed_${user.email}`;
    const hasSigned = localStorage.getItem(signedKey);

    if (!hasSigned) {
      setIsOpen(true);
    }
  }, [user]);

  const handleVisitLink = () => {
    window.open(signatureLink, '_blank');
    setHasVisitedLink(true);
  };

  const handleConfirmSignature = () => {
    if (!user) return;
    const signedKey = `contract_signed_${user.email}`;
    localStorage.setItem(signedKey, 'true');
    setIsOpen(false);
    alert('Contrato assinado com sucesso! Bem-vindo ao sistema.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-blue-600 bg-white relative overflow-hidden max-h-[90vh] flex flex-col">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
        
        <CardHeader className="text-center pt-8 pb-2 bg-slate-50 border-b">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Contrato de Prestação de Serviço
          </CardTitle>
          <p className="text-slate-500 mt-2">
            Para continuar, você precisa ler e assinar o contrato de serviço.
          </p>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto flex-1">
          <div className="prose prose-sm max-w-none bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap font-mono text-xs md:text-sm">
            {contractTerms}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Atenção:</p>
              <p>Você deve clicar no botão abaixo para acessar a plataforma de assinatura digital. Após assinar, retorne aqui e confirme.</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3 justify-end">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handleVisitLink}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            1. Ir para Assinatura Digital
          </Button>
          
          <Button 
            className={`w-full sm:w-auto ${hasVisitedLink ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
            onClick={handleConfirmSignature}
            disabled={!hasVisitedLink}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            2. Confirmar que Assinei
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
