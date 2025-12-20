import { Router } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const payRoutes = Router();

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN
});

payRoutes.post('/', async (req, res) => {
  try {
    const { formData, providerId } = req.body;
    const payment = new Payment(client);

    const precoReal = 2.00; 

const paymentResponse = await payment.create({
  body: {
    transaction_amount: precoReal,
    description: "Pagamento de Destaque Premium",
    payment_method_id: formData.payment_method_id,
    token: formData.token, // O SDK ignora se for PIX
    installments: formData.installments,
    payer: {
      email: formData.payer.email || 'test_user_123@testuser.com',
      identification: {
        type: 'CPF',
        number: formData.payer.identification.number.replace(/\D/g, '') // Remove pontos e traços
      }
    },
  },
});

    // Salvar no banco
    const savedPayment = await prisma.payment.create({
      data: {
        externalId: String(paymentResponse.id),
        status: paymentResponse.status || 'pending',
        amount: precoReal, // Salva o valor real cobrado
        method: formData.payment_method_id,
        providerId: providerId,
      },
    });

    // Lógica: Se aprovado na hora (Cartão), ativa o destaque
    if (paymentResponse.status === 'approved') {
      await prisma.provider.update({
        where: { id: providerId },
        data: { isFeatured: true }
      });
    }

    res.status(201).json({
      status: paymentResponse.status,
      status_detail: paymentResponse.status_detail,
      id: paymentResponse.id,
      // Dados necessários para o PIX aparecer no Front
      qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      ticket_url: paymentResponse.point_of_interaction?.transaction_data?.ticket_url
    });

  }catch (error) {
    // Log detalhado para ver no painel do Render
    console.error('--- INÍCIO DO ERRO DETALHADO ---');
    if (error.api_response && error.api_response.content) {
      console.error('MENSAGEM DO MERCADO PAGO:', JSON.stringify(error.api_response.content, null, 2));
    } else {
      console.error('ERRO DO SISTEMA:', error.message || error);
    }
    console.error('--- FIM DO ERRO DETALHADO ---');

    res.status(500).json({ 
      error: 'Erro no processamento', 
      message: error.api_response?.content?.message || error.message 
    });
  }
});

payRoutes.post('/webhook', async (req, res) => {
  const { action, data } = req.body;

  if ((action === 'payment.updated' || action === 'payment.created') && data.id) {
    try {
      const payment = new Payment(client);
      const mpPayment = await payment.get({ id: data.id });

      // Atualiza o status do pagamento
      await prisma.payment.updateMany({
        where: { externalId: String(mpPayment.id) },
        data: { status: mpPayment.status },
      });

      // Se o status mudou para aprovado no Webhook (PIX pago depois)
      if (mpPayment.status === 'approved') {
        const paymentRecord = await prisma.payment.findFirst({
            where: { externalId: String(mpPayment.id) }
        });
        
        if (paymentRecord) {
            await prisma.provider.update({
                where: { id: paymentRecord.providerId },
                data: { isFeatured: true }
            });
        }
      }
    } catch (err) {
      console.error('Erro no processamento do webhook:', err);
    }
  }

  res.sendStatus(200);
});

export default payRoutes;