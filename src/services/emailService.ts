import emailjs from '@emailjs/browser';

// These should ideally be in .env
// VITE_EMAILJS_SERVICE_ID
// VITE_EMAILJS_TEMPLATE_ID
// VITE_EMAILJS_PUBLIC_KEY

export const emailService = {
  /**
   * Initialize EmailJS (optional if you just pass public key in send)
   */
  init: () => {
    // emailjs.init("YOUR_PUBLIC_KEY");
  },

  /**
   * Send a password reset email
   */
  sendPasswordReset: async (email: string) => {
    const env = import.meta.env as any;
    const serviceId = env.VITE_EMAILJS_SERVICE_ID;
    const templateId = env.VITE_EMAILJS_TEMPLATE_ID_RESET;
    const publicKey = env.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, {
          to_email: email,
          reset_link: `${window.location.origin}/reset-password?token=demo123`, // Simulated link
        }, publicKey);
        return { success: true, message: 'E-mail enviado com sucesso via EmailJS.' };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false, message: 'Erro ao enviar e-mail real. Verifique as configurações.' };
      }
    } else {
      console.log('--- SIMULAÇÃO DE E-MAIL (RESET SENHA) ---');
      console.log('Para:', email);
      console.log('Link:', `${window.location.origin}/reset-password?token=demo123`);
      console.log('-----------------------------------------');
      return { 
        success: true, 
        message: 'Ambiente de demonstração: E-mail simulado (configure EmailJS para envio real).' 
      };
    }
  },
  /**
   * Send access request confirmation to user
   */
  sendAccessRequestConfirmation: async (data: any) => {
    const env = import.meta.env as any;
    const serviceId = env.VITE_EMAILJS_SERVICE_ID;
    const templateId = env.VITE_EMAILJS_TEMPLATE_ID_REQUEST;
    const publicKey = env.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, {
          to_name: data.name,
          to_email: data.email,
          request_type: data.type,
          bank: data.bank,
        }, publicKey);
        return { success: true };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false };
      }
    }
    return { success: true, simulated: true };
  },

  /**
   * Send credentials to user after approval
   */
  sendCredentials: async (email: string, name: string, login: string, pass: string) => {
    const env = import.meta.env as any;
    const serviceId = env.VITE_EMAILJS_SERVICE_ID;
    const templateId = env.VITE_EMAILJS_TEMPLATE_ID_CREDENTIALS;
    const publicKey = env.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, {
          to_name: name,
          to_email: email,
          login_url: window.location.origin,
          user_login: login,
          user_pass: pass,
        }, publicKey);
        return { success: true };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false };
      }
    }
    return { success: true, simulated: true };
  }
};
