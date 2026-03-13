import React, { useState, useEffect } from 'react';
import { Target, Trophy, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { db } from '@/services/db';

export function DailyGoalModal() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (!user) return;

    // Check if user already has a daily goal set in their profile
    // We'll use the daily_goal field in the profiles table
    if (!user.daily_goal) {
      setIsOpen(true);
    }
  }, [user]);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !goal) return;

    try {
      await db.users.update(user.id, { daily_goal: Number(goal) });
      setIsOpen(false);
      
      // Optional: Trigger a custom event so other components know the goal changed
      window.dispatchEvent(new Event('goalUpdated'));
    } catch (error) {
      console.error('Error saving daily goal:', error);
      notify('error', 'Erro ao salvar meta diária.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-indigo-500 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <CardHeader className="text-center pt-8 pb-2">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <Target className="w-8 h-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900">
            Qual é sua meta para hoje?
          </CardTitle>
          <p className="text-slate-500 mt-2">
            Defina um objetivo claro. Quem não sabe onde quer chegar, não chega a lugar nenhum.
          </p>
        </CardHeader>
        
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSaveGoal} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium text-slate-700 block text-center">
                Número de Vendas
              </label>
              <div className="relative max-w-xs mx-auto">
                <Input
                  id="goal"
                  type="number"
                  min="1"
                  placeholder="Ex: 5"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="text-center text-2xl h-14 font-bold border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                  autoFocus
                  required
                />
                <Trophy className="absolute right-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-6 h-6 opacity-50" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
            >
              Definir Meta <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <p className="text-xs text-center text-slate-400">
              "A única maneira de fazer um excelente trabalho é amar o que você faz."
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
