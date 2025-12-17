import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
console.log("Verificando API Key no início:", apiKey ? `Existe (Começa com ${apiKey.substring(0, 5)}...)` : "NÃO EXISTE/UNDEFINED");

const resend = new Resend(apiKey);

export async function sendVerificationEmail(email, code) {
  console.log("==============================================");
  console.log(`🚀 INICIANDO ENVIO DE EMAIL PARA: ${email}`);
  console.log(`🔑 Chave sendo usada: ${process.env.RESEND_API_KEY ? "Carregada" : "FALTANDO"}`);
  
const fromEmail = 'Equipe UpaonServices <nao-responda@send.upaonservices.com.br>'; 
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email, 
      subject: 'Seu código de acesso Upaon Services',
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
      console.error("O RESEND RECUSOU O ENVIO:");
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    console.log("O RESEND ACEITOU O PEDIDO!");
    console.log("ID do Email:", data?.id);
    console.log("==============================================");

  } catch (err) {
    console.error("ERRO DE CONEXÃO/CÓDIGO:");
    console.error(err);
  }
}