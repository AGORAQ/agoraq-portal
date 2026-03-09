import emailjs from '@emailjs/browser';

/**
 * Serviço de E-mail utilizando EmailJS
 * Configurado para compatibilidade total com Vite e ambientes de deploy como Netlify.
 */
export const emailService = {
  /**
   * Envia um e-mail de redefinição de senha
   */
  sendPasswordReset: async (email: string) => {
    const ambiente = import.meta.env;
    const serviceID = ambiente.VITE_EMAILJS_SERVICE_ID;
    const templateID = ambiente.VITE_EMAILJS_TEMPLATE_ID_RESET;
    const publicKey = ambiente.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceID && templateID && publicKey) {
      try {
        const templateParams = {
          to_email: email,
          reset_link: `${window.location.origin}/reset-password?token=demo${Date.now()}`,
        };

        await emailjs.send(
          serviceID,
          templateID,
          templateParams,
          publicKey
        );
        
        return { success: true, message: 'E-mail de redefinição enviado com sucesso.' };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false, message: 'Erro ao enviar e-mail. Verifique as credenciais do EmailJS.' };
      }
    } else {
      // Fallback para modo demonstração
      console.log('--- MODO DEMONSTRAÇÃO: RESET DE SENHA ---');
      console.log('Destinatário:', email);
      console.log('Variáveis ausentes:', { serviceID: !!serviceID, templateID: !!templateID, publicKey: !!publicKey });
      return { 
        success: true, 
        message: 'Modo demonstração: E-mail simulado no console (configure as variáveis VITE_EMAILJS no Netlify/Vite).' 
      };
    }
  },

  /**
   * Envia confirmação de solicitação de acesso
   */
  sendAccessRequestConfirmation: async (data: any) => {
    const ambiente = import.meta.env;
    const serviceID = ambiente.VITE_EMAILJS_SERVICE_ID;
    const templateID = ambiente.VITE_EMAILJS_TEMPLATE_ID_REQUEST;
    const publicKey = ambiente.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceID && templateID && publicKey) {
      try {
        const templateParams = {
          to_name: data.name,
          to_email: data.email,
          request_type: data.type,
          bank: data.bank,
        };

        await emailjs.send(
          serviceID,
          templateID,
          templateParams,
          publicKey
        );
        return { success: true };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false };
      }
    }
    return { success: true, simulated: true };
  },

  /**
   * Envia as credenciais de acesso após aprovação
   */
  sendCredentials: async (email: string, name: string, login: string, pass: string) => {
    const ambiente = import.meta.env;
    const serviceID = ambiente.VITE_EMAILJS_SERVICE_ID;
    const templateID = ambiente.VITE_EMAILJS_TEMPLATE_ID_CREDENTIALS;
    const publicKey = ambiente.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceID && templateID && publicKey) {
      try {
        const templateParams = {
          to_name: name,
          to_email: email,
          login_url: window.location.origin,
          user_login: login,
          user_pass: pass,
        };

        await emailjs.send(
          serviceID,
          templateID,
          templateParams,
          publicKey
        );
        return { success: true };
      } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false };
      }
    }
    return { success: true, simulated: true };
  }
};
