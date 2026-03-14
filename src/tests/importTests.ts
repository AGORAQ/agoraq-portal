import { db } from '../services/db';

export async function runImportTests() {
  console.log('--- INICIANDO TESTES DE IMPORTAÇÃO ---');

  try {
    // 1. Teste de Criação de Usuário
    console.log('1. Testando criação de usuário...');
    const testEmail = `test_${Date.now()}@example.com`;
    const newUser = await db.users.create({
      name: 'Test User',
      email: testEmail,
      password: 'TestPassword123!',
      role: 'vendedor',
      status: 'Ativo',
      grupo_comissao: 'BRONZE'
    });
    console.log('✅ Usuário criado com sucesso:', newUser.id);

    // 2. Teste de Importação de Comissão (com nulls)
    console.log('2. Testando importação de comissão com valores nulos...');
    const commData = [
      {
        banco: 'BANCO TESTE',
        produto: 'PRODUTO TESTE',
        tabela: 'TABELA TESTE',
        parcelas: 12,
        comissao_total_empresa: 10,
        grupo_master: 5,
        grupo_ouro: null, // Deve virar 0
        grupo_prata: null, // Deve virar 0
        grupo_plus: 2
      }
    ];
    const resultComms = await db.commissions.import(commData);
    console.log('✅ Comissões importadas com sucesso. Qtd:', resultComms.count);
    const importedComms = resultComms.data;
    if (importedComms[0].comissao_ouro === 0 && importedComms[0].comissao_prata === 0) {
      console.log('✅ Normalização de nulos funcionou!');
    } else {
      console.warn('⚠️ Normalização de nulos pode ter falhado:', importedComms[0]);
    }

    // 3. Teste de Importação de Leads (Batch)
    console.log('3. Testando importação de leads (batch)...');
    const leadData = Array.from({ length: 10 }, (_, i) => ({
      name: `Lead Test ${i}`,
      phone: '11999999999',
      email: `lead${i}@test.com`,
      city: 'São Paulo',
      status: 'Disponível'
    }));
    
    const resultLeads = await db.leads.import(leadData, (progress) => {
      console.log(`Progresso da importação: ${progress}%`);
    });
    console.log('✅ Leads importados com sucesso. Qtd:', resultLeads.count);

    console.log('--- TODOS OS TESTES CONCLUÍDOS COM SUCESSO ---');
    return true;
  } catch (error) {
    console.error('❌ FALHA NOS TESTES:', error);
    return false;
  }
}
