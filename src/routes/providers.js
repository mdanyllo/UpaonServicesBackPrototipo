import { Router } from "express"
import { prisma } from "../prisma.js"

const providersRoutes = Router()

// Trata os textos enviados pelos usuários
const normalizeText = (text) => {
  if (!text) return ""
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

// 1. BUSCA AVANÇADA (LISTA)
providersRoutes.get("/", async (req, res) => {
  try {
    // Configuração da Paginação
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Filtros da Requisição
    const { category, q, city, neighborhood } = req.query

    // Montagem do WHERE
    const where = {
      AND: [
        // Filtro por Categoria
        category ? { category: { equals: category, mode: "insensitive" } } : {},

        // Filtro por Cidade
        city ? { user: { city: { contains: city, mode: "insensitive" } } } : {},
      
        // Filtro por Bairro
        neighborhood ? { user: { neighborhood: { contains: neighborhood, mode: "insensitive" } } } : {},

        // Busca Geral (Texto)
        q ? {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { neighborhood: { contains: q, mode: "insensitive" } } },
              { category: { contains: q, mode: "insensitive" } }
            ],
          } : {},
      ],
    }

    // Executa as consultas
    const [totalCount, providers] = await Promise.all([
      prisma.provider.count({ where }),
      prisma.provider.findMany({
        where,
        take: limit,
        skip: skip,
        include: {
          user: {
            select: {
              id: true, name: true, phone: true, avatarUrl: true, 
              city: true, neighborhood: true
            },
          },
        },
        orderBy: [
            { isFeatured: 'desc' }, // 1º Destaques
            { rating: 'desc' },     // 2º Melhores avaliados
            { createdAt: 'desc' }   // 3º Mais novos
        ]
      })
    ])

    return res.json({
      data: providers,
      meta: {
        total: totalCount,
        page,
        lastPage: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error("Erro providers:", error)
    return res.status(500).json({ message: "Erro ao buscar prestadores" })
  }
})

// 2. BUSCAR UM ÚNICO PRESTADOR (ESSENCIAL PARA O PERFIL)
providersRoutes.get("/:id", async (req, res) => {
    const { id } = req.params
    try {
        const provider = await prisma.provider.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true, name: true, avatarUrl: true, 
                        city: true, neighborhood: true, phone: true
                    }
                }
            }
        })

        if (!provider) return res.status(404).json({ error: "Não encontrado" })

        // Incrementa visualização (sem travar a resposta)
        prisma.provider.update({
            where: { id },
            data: { appearances: { increment: 1 } }
        }).catch(() => {}) // Ignora erro se o campo ainda não existir

        return res.json(provider)
    } catch (error) {
        return res.status(500).json({ error: "Erro interno" })
    }
})

// 3. REGISTRAR CLIQUE NO WHATSAPP
providersRoutes.post("/:id/contact", async (req, res) => {
  const { id } = req.params 
  const { clientId } = req.body 

  try {
    await prisma.contactLog.create({
      data: { providerId: id, clientId: clientId }
    })
    return res.status(201).json({ message: "Clique registrado" })
  } catch (error) {
    return res.status(500).json({ message: "Erro ao registrar" })
  }
})

// 4. ESTATÍSTICAS DO PRESTADOR
providersRoutes.get("/:id/stats", async (req, res) => {
  const { id } = req.params
  try {
    const logs = await prisma.contactLog.findMany({
      where: { providerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { name: true, avatarUrl: true, phone: true, email: true }
        }
      }
    })
    return res.json({ contacts: logs.length, logs: logs })
  } catch (error) {
    return res.status(500).json({ contacts: 0, logs: [] })
  }
})

export default providersRoutes