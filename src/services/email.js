import { Resend } from 'resend';

// Inicializa o Resend com a chave
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, code) {
  try {
    const data = await resend.emails.send({
      from: 'Equipe UpaonServices <nao-responda@send.upaonservices.com.br>', 
      to: email, 
      
      subject: 'Seu código de verificação',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Bem-vindo a UpaonServices!</h2>
          <p>Para ativar sua conta, use o código abaixo:</p>
          <h1 style="color: #4F46E5; letter-spacing: 5px; font-size: 32px;">${code}</h1>
          <p>Este código expira em 10 minutos.</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888;">Se você não solicitou este código, ignore este email.</p>
        </div>
      `
    });

    console.log(`📧 Email enviado com sucesso! ID: ${data.id}`);
  } catch (error) {
    console.error("Erro ao enviar email via Resend:", error);
  }
}