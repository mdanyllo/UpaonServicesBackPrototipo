import nodemailer from 'nodemailer';

// Configure com seu email real ou use o Mailtrap para testes
const transporter = nodemailer.createTransport({
  service: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  
  },
  connectionTimeout: 10000,
});

export async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: '"UpaonServices Security" <noreply@upaonservices.com>',
    to: email,
    subject: 'Seu código de verificação',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Bem-vindo a UpaonServices!</h2>
        <p>Para ativar sua conta, use o código abaixo:</p>
        <h1 style="color: #4F46E5; letter-spacing: 5px;">${code}</h1>
        <p>Este código expira em 10 minutos.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email enviado para ${email}`);
  } catch (error) {
    console.error("Erro ao enviar email:", error);
  }
}