import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export const handler: Handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '').replace('/api', '');
  const method = event.httpMethod;

  console.log(`Netlify Function: ${method} ${path}`);

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check first run
    if (path === '/admin/check-first-run' && method === 'GET') {
      if (!supabaseAdmin) return { statusCode: 200, headers, body: JSON.stringify({ isFirstRun: true }) };
      const { count, error } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ isFirstRun: count === 0 }) };
    }

    // Create user
    if (path === '/admin/create-user' && method === 'POST') {
      if (!supabaseAdmin) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin not configured' }) };
      const { email, password, name, role, status, grupo_comissao } = JSON.parse(event.body || '{}');
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (authError) return { statusCode: 400, headers, body: JSON.stringify({ error: authError.message }) };

      const userId = authData.user.id;
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        nome: name,
        email: email,
        perfil: role,
        grupo_comissao: grupo_comissao,
        ativo: status === 'Ativo',
        meta_diaria: 0
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: authData.user }) };
    }

    // Reset password
    if (path === '/admin/reset-password' && method === 'POST') {
      if (!supabaseAdmin) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin not configured' }) };
      const { userId, newPassword } = JSON.parse(event.body || '{}');
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not Found' }) };
  } catch (error: any) {
    console.error('Function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
