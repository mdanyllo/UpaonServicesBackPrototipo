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

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true }
    });

    if (provider) {
      await prisma.user.update({
        where: { id: provider.userId },
        data: { isActivated: true }
      });
    }
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
    let { formData, providerId, type } = req.body;
    const payment = new Payment(client);

    let validProvider = await prisma.provider.findUnique({ where: { id: providerId } });

    if (!validProvider) {
      validProvider = await prisma.provider.findFirst({ where: { userId: providerId } });
      if (!validProvider) {
        return res.status(400).json({ error: 'Prestador não localizado.' });
      }
      providerId = validProvider.id;
    }

    const tabelaPrecos = { 'FEATURED': 19.90, 'ACTIVATION': 1.99 };
    const precoReal = tabelaPrecos[type] || 2.00; 
    const tituloItem = type === 'ACTIVATION' ? "Ativação de Conta" : "Destaque no Site";

    const paymentResponse = await payment.create({
      body: {
        transaction_amount: precoReal,
        external_reference: `PROV_${providerId}_${type}_${Date.now()}`,
        token: formData.token,
        description: `Upaon Services - ${tituloItem}`,
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,

        notification_url: 'https://apiupaonservices.ddns.net/payment/webhook',

        statement_descriptor: 'UPAONSERVICES',

        additional_info: {
             items: [
                {
                    id: type,
                    title: tituloItem,
                    description: type === 'ACTIVATION' ? 'Liberação de acesso a serviços' : 'Destaque na lista de profissionais',
                    quantity: 1,
                    category_id: 'services' || 'others',
                    unit_price: Number(precoReal),
                }
             ]
        },

        payer: {
          email: formData.payer?.email,
          first_name: formData.payer?.firstName || 'Cliente',
          last_name: formData.payer?.lastName || 'Sobrenome',
          identification: {
            type: formData.payer?.identification?.type || 'CPF',
            number: String(formData.payer?.identification?.number || formData.identification?.number || '').replace(/\D/g, ''),
            registration_date: new Date().toISOString()
          },
        },
      },
    });

    console.log(`Pagamento MP: ${paymentResponse.status} - ${paymentResponse.status_detail}`);

    // Cria registro no banco
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
    console.error('Erro no processamento:', error); // Log mais limpo
    res.status(500).json({ error: 'Erro interno ao processar' });
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