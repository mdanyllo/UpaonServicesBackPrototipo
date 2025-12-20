import { Router } from "express"
import { prisma } from "../prisma.js"
import { ensureAdmin } from "../middlewares/ensureAdmin.js"
import { ensureAuthenticated } from "../middlewares/auth.js"

const adminRoutes = Router()

adminRoutes.use(ensureAuthenticated, ensureAdmin)

// 1. STATS (Mantive igual)
adminRoutes.get("/stats", async (req, res) => {
  const [totalUsers, totalProviders, totalContacts] = await Promise.all([
    prisma.user.count(),
    prisma.provider.count(),
    prisma.contactLog.count() 
  ])

  return res.json({
    users: totalUsers,
    providers: totalProviders,
    totalContacts: totalContacts
  })
})

// 2. LISTAR USUÁRIOS (COM PAGINAÇÃO E BUSCA)
adminRoutes.get("/users", async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query
    
    // Converte para números
    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    const skip = (pageInt - 1) * limitInt

    const where = q ? {
        OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } }
        ]
    } : {}

    // Roda duas queries: uma pra contar o total (pra saber quantas páginas tem) e outra pra pegar os dados
    const [count, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            take: limitInt,
            skip: skip,
            orderBy: { createdAt: 'desc' },
            include: { 
                provider: true // Importante para ver se é Featured
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

    // Busca o status atual
    const provider = await prisma.provider.findUnique({ where: { id: providerId } })

    if (!provider) return res.status(404).json({ error: "Prestador não encontrado" })

    // Inverte o status (se ta true vira false, se ta false vira true)
    const updated = await prisma.provider.update({
        where: { id: providerId },
        data: { isFeatured: !provider.isFeatured }
    })

    return res.json(updated)
})

// 4. DELETAR USUÁRIO
adminRoutes.patch("/users/:id/toggle-active", async (req, res) => {
    const { id } = req.params
    try {
        await prisma.user.delete({ where: { id } })
        return res.json({ message: "Usuário deletado." })
    } catch (error) {
        return res.status(500).json({ message: "Erro ao deletar." })
    }
})

export default adminRoutes