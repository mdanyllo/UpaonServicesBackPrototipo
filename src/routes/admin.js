import { Router } from "express"
import { prisma } from "../prisma.js"
import { ensureAuthenticated } from "../middlewares/auth.js"
import { ensureAdmin } from "../middlewares/ensureAdmin.js"

const adminRoutes = Router()

// Middleware duplo: Tem que estar logado E ser admin
adminRoutes.use(ensureAuthenticated, ensureAdmin)

// 1. MÉTRICAS GERAIS (DASHBOARD)
adminRoutes.get("/stats", async (req, res) => {
  // Executa tudo em paralelo pra ser rápido
  const [totalUsers, totalProviders, totalVisits] = await Promise.all([
    prisma.user.count(),
    prisma.provider.count(),
    prisma.provider.aggregate({
        _sum: { appearances: true } // Soma todas as impressões
    })
  ])

  // Busca os 5 usuários mais recentes
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  })

  return res.json({
    users: totalUsers,
    providers: totalProviders,
    impressions: totalVisits._sum.appearances || 0,
    recentUsers
  })
})

// 2. LISTAR TODOS OS USUÁRIOS (COM BUSCA)
adminRoutes.get("/users", async (req, res) => {
    const { q } = req.query // Busca por nome ou email

    const where = q ? {
        OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } }
        ]
    } : {}

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Mais novos primeiro
        include: { provider: true } // Traz dados de provider se tiver
    })

    return res.json(users)
})

// 3. BANIR/DESBANIR USUÁRIO (Toggle)
adminRoutes.patch("/users/:id/toggle-active", async (req, res) => {
    const { id } = req.params
    
    // Aqui assumimos que você vai criar um campo 'active' no futuro.
    // Por enquanto, vamos simular deletando ou apenas retornando sucesso.
    // Para o MVP, vamos DELETAR o usuário (Use com cuidado!)
    
    try {
        await prisma.user.delete({ where: { id } })
        return res.json({ message: "Usuário deletado com sucesso." })
    } catch (error) {
        return res.status(500).json({ message: "Erro ao deletar usuário." })
    }
})

export default adminRoutes