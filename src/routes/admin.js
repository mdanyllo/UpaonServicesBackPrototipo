import { Router } from "express"
import { prisma } from "../prisma.js"
import { ensureAdmin } from "../middlewares/ensureAdmin.js"
import { ensureAuthenticated } from "../middlewares/auth.js"

const adminRoutes = Router()

adminRoutes.use(ensureAuthenticated, ensureAdmin)


// 1. STATS (Mantive igual)
adminRoutes.get("/stats", async (req, res) => {
  const [totalUsers, totalProviders, totalContacts, paymentsSum] = await Promise.all([
    prisma.user.count(),
    prisma.provider.count(),
    prisma.contactLog.count(),
    prisma.payment.aggregate({
      where: { status: "approved" },
      _sum: { amount: true }
    })
  ])

  return res.json({
    users: totalUsers,
    providers: totalProviders,
    totalContacts: totalContacts,
    revenue: paymentsSum._sum.amount || 0 
  })
})



// 2. LISTAR USUÁRIOS (COM PAGINAÇÃO E BUSCA)
adminRoutes.get("/users", async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query
    
    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    const skip = (pageInt - 1) * limitInt

    const where = q ? {
        OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } }
        ]
    } : {}

    const [count, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            take: limitInt,
            skip: skip,
            orderBy: { createdAt: 'desc' },
            include: { 
                provider: true 
            }
        })
    ])

    return res.json({
        data: users,
        meta: {
            total: count,
            page: pageInt,
            lastPage: Math.ceil(count / limitInt)
        }
    })
})



// 3. ALTERAR STATUS DE "DESTAQUE" (FEATURED)
adminRoutes.patch("/providers/:providerId/toggle-feature", async (req, res) => {
    const { providerId } = req.params

    const provider = await prisma.provider.findUnique({ where: { id: providerId } })

    if (!provider) return res.status(404).json({ error: "Prestador não encontrado" })

    const updated = await prisma.provider.update({
        where: { id: providerId },
        data: { isFeatured: !provider.isFeatured }
    })

    return res.json(updated)
})



// 4. ALTERAR STATUS (ATIVA / DESATIVA)
adminRoutes.patch("/users/:id/toggle-active", async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Primeiro buscamos o estado atual do provider
        const user = await prisma.user.findUnique({
            where: { id },
            include: { provider: true }
        });

        if (!user || !user.provider) {
            return res.status(404).json({ message: "Prestador não encontrado." });
        }

        // 2. Invertemos o valor de isActive
        const novoStatus = !user.provider.isActive;

        // 3. Se estivermos ATIVANDO, definimos uma data de expiração (ex: +30 dias)
        // Se estivermos DESATIVANDO, removemos o destaque também
        const dataUpdate = {
            isActive: novoStatus,
            isFeatured: novoStatus ? user.provider.isFeatured : false
        };

        // Se estiver ativando agora e não tiver data, damos 30 dias de bônus ou mantemos a atual
        if (novoStatus && !user.provider.activatedUntil) {
            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);
            dataUpdate.activatedUntil = dataExpiracao;
        }

        await prisma.provider.update({
            where: { userId: id },
            data: dataUpdate
        });

        return res.json({ message: `Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso.` });
    } catch (error) {
        console.error("Erro ao alternar status:", error);
        return res.status(500).json({ message: "Erro ao processar alteração de status." });
    }
})



// Mapa de calor
adminRoutes.get("/heatmap", async (req, res) => {
  try {
    const usersLocation = await prisma.user.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true, 
        name: true,
        latitude: true,
        longitude: true,
        role: true,
        neighborhood: true,
        city: true
      }
    });
    return res.json(usersLocation);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao carregar mapa" });
  }
});

export default adminRoutes