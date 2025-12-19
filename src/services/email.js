import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = new Resend(apiKey);

export async function sendVerificationEmail(email, code) {
  
const fromEmail = 'Equipe UpaonServices <nao-responda@upaonservices.com.br>'; 
  
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email, 
      subject: 'Seu código de acesso',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Bem-vindo a UpaonServices!</h2>
          <p style="font-size: 16px; color: #555;">Olá,</p>
          <p style="font-size: 16px; color: #555;">Use o código abaixo para verificar sua conta e começar a usar a plataforma:</p>
          
          <div style="background-color: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${code}</span>
          </div>

          <p style="font-size: 14px; color: #888; text-align: center;">Este código expira em 10 minutos.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">Se você não solicitou este código, por favor ignore este e-mail.</p>
        </div>
      `
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

  } catch (err) {
    console.error("ERRO DE CONEXÃO/CÓDIGO:");
    console.error(err);
  }
}



//Função de Recuperação de Senha (NOVA - ADICIONE ISTO)
export async function sendPasswordResetEmail(email, code) {
  try {
    await resend.emails.send({
      from: 'Upaon Services <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperação de Senha - Upaon Services',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1>Recuperação de Senha</h1>
          <p>Você solicitou a redefinição de sua senha.</p>
          <p>Use o código abaixo para criar uma nova senha:</p>
          <div style="background: #fff0f0; border: 1px solid #ffcccc; padding: 20px; border-radius: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #cc0000;">
            ${code}
          </div>
          <p>Este código expira em 10 minutos.</p>
          <p>Se não foi você que pediu, apenas ignore este e-mail.</p>
        </div>
      `
    });
    console.log(`Email de recuperação enviado para ${email}`);
  } catch (error) {
    console.error("Erro ao enviar email de recuperação:", error);
    throw new Error("Falha no envio de email");
  }
}