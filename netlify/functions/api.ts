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
      const { email, password, name, role, status, grupo_comissao, can_capture_leads } = JSON.parse(event.body || '{}');
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (authError) {
        // If user already exists, try to update their profile
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
          
          if (existingProfile) {
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                nome: name || 'Usuário',
                perfil: role || 'vendedor',
                grupo_comissao: grupo_comissao || 'OURO',
                ativo: status === 'Ativo',
                can_capture_leads: can_capture_leads !== false
              })
              .eq('id', existingProfile.id);
            
            if (updateError) throw updateError;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Perfil atualizado' }) };
          }
        }
        return { statusCode: 400, headers, body: JSON.stringify({ error: authError.message }) };
      }

      const userId = authData.user.id;
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        auth_user_id: userId,
        nome: name || 'Usuário',
        email: email.trim().toLowerCase(),
        perfil: role || 'vendedor',
        grupo_comissao: grupo_comissao || 'OURO',
        ativo: status === 'Ativo',
        can_capture_leads: can_capture_leads !== false,
        daily_goal: 0
      }, { onConflict: 'email' });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { 
          statusCode: 500, 
          headers, 
          body: JSON.stringify({ 
            error: 'Usuário criado no Auth, mas erro ao criar perfil no banco de dados.',
            details: profileError.message 
          }) 
        };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: authData.user }) };
    }

    // Get users
    if (path === '/users' && method === 'GET') {
      if (!supabaseAdmin) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin not configured' }) };
      const { data, error } = await supabaseAdmin.from('profiles').select('*').order('nome');
      if (error) throw error;
      
      const mappedUsers = data.map(p => ({
        id: p.id,
        name: p.nome,
        email: p.email,
        role: p.perfil,
        grupo_comissao: p.grupo_comissao,
        status: p.ativo ? 'Ativo' : 'Inativo',
        daily_goal: p.daily_goal,
        pix_key: p.pix_key
      }));

      return { statusCode: 200, headers, body: JSON.stringify(mappedUsers) };
    }

    // Get user by ID
    if (path.startsWith('/users/') && method === 'GET') {
      if (!supabaseAdmin) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin not configured' }) };
      const id = path.split('/')[2];
      const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      
      const user = {
        id: data.id,
        name: data.nome,
        email: data.email,
        role: data.perfil,
        grupo_comissao: data.grupo_comissao,
        status: data.ativo ? 'Ativo' : 'Inativo',
        daily_goal: data.daily_goal,
        pix_key: data.pix_key
      };

      return { statusCode: 200, headers, body: JSON.stringify(user) };
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
