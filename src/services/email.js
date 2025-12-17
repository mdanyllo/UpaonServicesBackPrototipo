import { Resend } from 'resend';

// Log para ver se a chave existe (mas esconde os caracteres do meio por segurança)
const apiKey = process.env.RESEND_API_KEY;
console.log("🔑 Verificando API Key no início:", apiKey ? `Existe (Começa com ${apiKey.substring(0, 5)}...)` : "NÃO EXISTE/UNDEFINED");

const resend = new Resend(apiKey);

export async function sendVerificationEmail(email, code) {
  console.log("==============================================");
  console.log(`🚀 INICIANDO ENVIO DE EMAIL PARA: ${email}`);
  console.log(`🔑 Chave sendo usada: ${process.env.RESEND_API_KEY ? "Carregada" : "FALTANDO"}`);

  // Tente usar o email de teste do Resend primeiro para isolar problema de domínio
  // Se funcionar, depois trocamos para o seu domínio
  const fromEmail = 'onboarding@resend.dev'; 
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email, // LEMBRETE: Em Sandbox, isso só funciona se for SEU email de cadastro no Resend
      subject: 'Teste de Debug Upaon',
      html: `<p>Seu código é: <strong>${code}</strong></p>`
    });

    if (error) {
      console.error("❌ O RESEND RECUSOU O ENVIO:");
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    console.log("✅ O RESEND ACEITOU O PEDIDO!");
    console.log("ID do Email:", data?.id);
    console.log("==============================================");

  } catch (err) {
    console.error("💥 ERRO DE CONEXÃO/CÓDIGO:");
    console.error(err);
  }
}