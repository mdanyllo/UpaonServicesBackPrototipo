import { Router } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const client = new MercadoPagoConfig({ accessToken: 'TEST-52cee956-dbcc-49fe-9cbd-e4ca68daf56a' });

const payRoutes = Router()

// A Rota que o Front chama
payRoutes.post('/', async (req, res) => {})
export default payRoutes