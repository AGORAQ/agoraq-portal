import React, { useState, useEffect } from 'react';
import { X, Coffee, Droplets, Sun, Smile, Star, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const HEALTH_TIPS = [
  // Morning
  { icon: Sun, text: "Bom dia, {name}! Comece com energia: revise seus leads quentes e faça as ligações mais importantes agora.", color: "text-orange-500", bg: "bg-orange-50", time: "morning" },
  { icon: Coffee, text: "{name}, o café já fez efeito? Aproveite a manhã para organizar sua agenda e definir metas do dia.", color: "text-amber-500", bg: "bg-amber-50", time: "morning" },
  
  // Afternoon
  { icon: Droplets, text: "Hora de se hidratar, {name}! A tarde pede foco. Tome um copo d'água e respire fundo.", color: "text-blue-500", bg: "bg-blue-50", time: "afternoon" },
  { icon: Smile, text: "Xô, desânimo pós-almoço! {name}, ligue para aquele cliente que estava indeciso. Sua energia vai contagiá-lo.", color: "text-pink-500", bg: "bg-pink-50", time: "afternoon" },
  
  // Evening
  { icon: Star, text: "Ótimo trabalho hoje, {name}! Antes de encerrar, organize a lista de amanhã para começar o dia voando.", color: "text-purple-500", bg: "bg-purple-50", time: "evening" },
  { icon: Heart, text: "{name}, desacelere. O descanso é parte da alta performance. Amanhã tem mais conquistas!", color: "text-red-500", bg: "bg-red-50", time: "evening" },
  
  // General
  { icon: Sun, text: "Postura de campeão, {name}! Coluna reta projeta confiança na voz. Seus clientes sentem isso.", color: "text-yellow-500", bg: "bg-yellow-50", time: "any" },
  { icon: Smile, text: "Sorria ao falar, {name}! O sorriso é audível e abre portas, mesmo por telefone.", color: "text-emerald-500", bg: "bg-emerald-50", time: "any" },
];

const ASTRO_PHRASES = [
  "Os astros indicam, {name}: Sua comunicação está magnética. Use isso para reverter objeções!",
  "Previsão para {name}: A lua em Touro favorece a persistência. Não desista daquele lead difícil.",
  "Energia cósmica, {name}: Mercúrio retrógrado acabou! É o momento ideal para assinar contratos.",
  "Horóscopo de Vendas: O sol ilumina sua casa da prosperidade, {name}. Peça indicações hoje!",
  "Sua aura hoje, {name}: Dourada! Transmita essa segurança e o 'sim' virá naturalmente.",
  "{name}, Marte te dá coragem. Ligue para o cliente que você tem medo. O 'não' você já tem!",
  "Alinhamento favorável, {name}: Júpiter expande seus horizontes. Ofereça um produto complementar.",
  "Dica do Universo para {name}: A intuição está afiada. Se sentir que deve ligar agora, ligue!",
];

export function WellnessCompanion() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'Campeão';
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState(HEALTH_TIPS[0]);

  useEffect(() => {
    const showTip = () => {
      const hour = new Date().getHours();
      let timeOfDay = 'any';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';

      const relevantTips = HEALTH_TIPS.filter(t => t.time === timeOfDay || t.time === 'any');
      const randomTip = relevantTips[Math.floor(Math.random() * relevantTips.length)];
      
      setCurrentTip(randomTip);
      setIsVisible(true);
    };

    // Show first tip after 5 seconds
    const initialTimer = setTimeout(showTip, 5000);

    // Then every 45 minutes
    const interval = setInterval(showTip, 1000 * 60 * 45);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) return null;

  const Icon = currentTip.icon;
  const personalizedText = currentTip.text.replace('{name}', userName);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500 max-w-sm">
      <Card className="shadow-xl border-l-4 border-l-emerald-500 overflow-hidden">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1 h-6 w-6 text-slate-400 hover:text-slate-600"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="p-4 flex items-start gap-4">
            <div className={`p-3 rounded-full ${currentTip.bg} ${currentTip.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Cuide de você, {userName}! 🌿</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {personalizedText}
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

export function DailyWisdom() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'Vendedor';
  const [quote, setQuote] = useState("");

  useEffect(() => {
    // Deterministic selection based on date
    const today = new Date();
    const dateString = today.toDateString(); // "Fri Mar 06 2026"
    
    // Simple hash function for the date string
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use positive hash to pick index
    const index = Math.abs(hash) % ASTRO_PHRASES.length;
    
    const selectedQuote = ASTRO_PHRASES[index].replace('{name}', userName);
    setQuote(selectedQuote);
  }, [userName]);

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-lg mb-6 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
        <Star className="w-24 h-24" />
      </div>
      <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
      </div>
      <div className="z-10">
        <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider mb-1">Mensagem dos Astros para {userName} ✨</p>
        <p className="font-medium text-lg leading-tight">"{quote}"</p>
      </div>
    </div>
  );
}
