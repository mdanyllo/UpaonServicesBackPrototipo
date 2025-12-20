import { Router } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const payRoutes = Router();

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN
});

// FUNÇÃO AUXILIAR DE ENTREGA
async function aplicarVantagem(providerId, type) {
  const trintaDias = new Date();
  trintaDias.setDate(trintaDias.getDate() + 30);

  if (type === 'ACTIVATION') {
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        isActive: true, 
        activatedUntil: trintaDias
      }
    });
  } else {
    await prisma.provider.update({
      where: { id: providerId },
      data: { 
        isFeatured: true, 
        featuredUntil: trintaDias
      }
    });
  }
}

payRoutes.post('/', async (req, res) => {
  try {
    const { formData, providerId, type } = req.body;
    const payment = new Payment(client);

    // TABELA DE PREÇOS NO BACKEND (A palavra final é daqui)
    const tabelaPrecos = {
      'FEATURED': 19.90,
      'ACTIVATION': 1.99
    };

    const precoReal = tabelaPrecos[type] || 2.00; 

    const paymentResponse = await payment.create({
      body: {
        transaction_amount: precoReal, 
        token: formData.token,
        description: type === 'ACTIVATION' ? "Ativação UpaonServices" : "Destaque UpaonServices",
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        payer: {
          email: formData.payer?.email,
          identification: {
            type: formData.payer?.identification?.type || 'CPF',
            number: String(formData.payer?.identification?.number || '').replace(/\D/g, '') 
          },
        },
      },
    });

    await prisma.payment.create({
      data: {
        externalId: String(paymentResponse.id),
        status: paymentResponse.status || 'pending',
        amount: precoReal,
        method: formData.payment_method_id,
        providerId: providerId,
        type: type, 
      },
    });

    if (paymentResponse.status === 'approved') {
      await aplicarVantagem(providerId, type);
    }

    res.status(201).json({
      status: paymentResponse.status,
      status_detail: paymentResponse.status_detail,
      id: paymentResponse.id,
      qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      ticket_url: paymentResponse.point_of_interaction?.transaction_data?.ticket_url
    });

  } catch (error) {
    console.error('Erro no processamento:', error.api_response?.content || error);
    res.status(500).json({ error: 'Erro ao processar' });
  }
});

payRoutes.post('/webhook', async (req, res) => {
  const { action, data } = req.body;
  if ((action === 'payment.updated' || action === 'payment.created') && data.id) {
    try {
      const payment = new Payment(client);
      const mpPayment = await payment.get({ id: data.id });
      const paymentRecord = await prisma.payment.findFirst({
          where: { externalId: String(mpPayment.id) }
      });

      if (paymentRecord) {
          await prisma.payment.update({
            where: { id: paymentRecord.id },
            data: { status: mpPayment.status },
          });

          if (mpPayment.status === 'approved') {
              await aplicarVantagem(paymentRecord.providerId, paymentRecord.type);
          }
      }
    } catch (err) {
      console.error('Erro Webhook:', err);
    }
  }
  res.sendStatus(200);
});

export default payRoutes;