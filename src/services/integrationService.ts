import { Sale } from '@/types';

// Interface for Bank API Integration
export interface BankIntegration {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'Bearer' | 'Basic' | 'ApiKey';
  credentials: Record<string, string>;
  
  // Methods to implement
  syncSalesStatus(sales: Sale[]): Promise<Sale[]>;
  fetchNewProposals(startDate: string): Promise<Sale[]>;
}

// Webhook Payload Structure
export interface WebhookPayload {
  event: 'proposal.created' | 'proposal.updated' | 'proposal.paid' | 'proposal.cancelled';
  data: {
    proposalId: string;
    status: string;
    value?: number;
    bank?: string;
    timestamp: string;
  };
}

// Service to handle integrations
export const integrationService = {
  // Simulate syncing status with a bank API
  async syncStatus(sale: Sale): Promise<Sale> {
    console.log(`Syncing status for sale ${sale.proposal} with bank ${sale.bank}...`);
    
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Randomly change status for demo purposes
        const statuses: Sale['status'][] = ['Pendente', 'Em Averbação', 'Aguardando Formalização do Link', 'Paga', 'Cancelada'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        resolve({
          ...sale,
          status: randomStatus
        });
      }, 1000);
    });
  },

  // Webhook handler endpoint (mock)
  handleWebhook(payload: WebhookPayload) {
    console.log('Received webhook:', payload);
    
    // Logic to update local database based on webhook event
    // db.sales.updateByProposal(payload.data.proposalId, { status: mapStatus(payload.data.status) });
    
    return { success: true };
  },
  
  // Polling mechanism
  startPolling(intervalMs: number = 300000) {
    console.log(`Starting polling service every ${intervalMs}ms`);
    setInterval(() => {
      console.log('Polling for updates...');
      // logic to fetch updates
    }, intervalMs);
  }
};

// Helper to map external statuses to internal ones
function mapStatus(externalStatus: string): Sale['status'] {
  const map: Record<string, Sale['status']> = {
    'PAID': 'Paga',
    'PENDING': 'Pendente',
    'CANCELLED': 'Cancelada',
    'PROCESSING': 'Em Averbação',
    'WAITING_SIGNATURE': 'Aguardando Formalização do Link'
  };
  return map[externalStatus] || 'Pendente';
}
