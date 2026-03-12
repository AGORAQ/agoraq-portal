import React, { createContext, useContext, useState, useEffect } from 'react';
import { CommissionTable } from '@/types';
import { db } from '@/services/db';
import { useAuth } from './AuthContext';

interface CommissionContextType {
  commissions: CommissionTable[];
  addCommission: (commission: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao' | 'status'>) => Promise<void>;
  updateCommission: (id: string, updates: Partial<CommissionTable>) => Promise<void>;
  deleteCommission: (id: string) => Promise<void>;
  deleteManyCommissions: (ids: string[]) => Promise<void>;
  deleteAllCommissions: () => Promise<void>;
  importCommissions: (newCommissions: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[]) => Promise<void>;
  refreshCommissions: () => Promise<void>;
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

export function CommissionProvider({ children }: { children: React.ReactNode }) {
  const [commissions, setCommissions] = useState<CommissionTable[]>([]);
  const { user } = useAuth();

  const refreshCommissions = async () => {
    const userGroup = user?.grupo_comissao || 'PLUS';
    const all = await db.commissions.getAll(user?.role, userGroup);
    
    // Calculate percentual_vendedor for each table based on user's group
    const mapped = all.map(c => {
      let percentual_vendedor = 0;
      switch (userGroup) {
        case 'MASTER': percentual_vendedor = c.comissao_master; break;
        case 'OURO': percentual_vendedor = c.comissao_ouro; break;
        case 'PRATA': percentual_vendedor = c.comissao_prata; break;
        case 'PLUS': percentual_vendedor = c.comissao_plus; break;
        default: percentual_vendedor = c.comissao_plus;
      }
      return { ...c, percentual_vendedor };
    });

    setCommissions(mapped);
  };

  useEffect(() => {
    if (user) {
      refreshCommissions();
    }
  }, [user]);

  const addCommission = async (commission: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao' | 'status'>) => {
    if (!user) return;
    try {
      await db.commissions.create({ ...commission, status: 'Ativo' }, user.role, user.id);
      await refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateCommission = async (id: string, updates: Partial<CommissionTable>) => {
    if (!user) return;
    try {
      await db.commissions.update(id, updates, user.role, user.id);
      await refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const deleteCommission = async (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta tabela?')) {
      try {
        await db.commissions.delete(id, user.role, user.id);
        await refreshCommissions();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const deleteManyCommissions = async (ids: string[]) => {
    if (!user) return;
    if (confirm(`Tem certeza que deseja excluir ${ids.length} tabelas selecionadas?`)) {
      try {
        await db.commissions.deleteMany(ids, user.role, user.id);
        await refreshCommissions();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const deleteAllCommissions = async () => {
    if (!user) return;
    if (confirm('ATENÇÃO: Tem certeza que deseja excluir TODAS as tabelas de comissão? Esta ação não pode ser desfeita.')) {
      try {
        await db.commissions.deleteAll(user.role, user.id);
        await refreshCommissions();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const importCommissions = async (newCommissions: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[]) => {
    if (!user) return;
    try {
      const imported = await db.commissions.import(newCommissions, user.role, user.id);
      
      // Log the import
      await db.logs.add({
        user: user.name,
        linesProcessed: newCommissions.length,
        errorsFound: 0,
        fileName: 'Importação Excel'
      });

      await refreshCommissions();
      alert(`${imported.length} tabelas importadas com sucesso!`);
    } catch (error: any) {
      alert(error.message);
      // Log the error
      await db.logs.add({
        user: user.name,
        linesProcessed: newCommissions.length,
        errorsFound: newCommissions.length,
        fileName: 'Falha na Importação'
      });
    }
  };

  return (
    <CommissionContext.Provider value={{ 
      commissions, 
      addCommission, 
      updateCommission, 
      deleteCommission, 
      deleteManyCommissions,
      deleteAllCommissions,
      importCommissions, 
      refreshCommissions 
    }}>
      {children}
    </CommissionContext.Provider>
  );
}

export function useCommission() {
  const context = useContext(CommissionContext);
  if (context === undefined) {
    throw new Error('useCommission must be used within a CommissionProvider');
  }
  return context;
}
