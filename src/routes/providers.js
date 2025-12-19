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



// Busca avançada de prestadores com paginação
providersRoutes.get("/", async (req, res) => {
  // 1. Configuração da Paginação
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const skip = (page - 1) * limit

  // 2. Filtros da Requisição
  const { category, q, city, neighborhood } = req.query

  // 3. Montagem do WHERE (Lógica do Prisma)
  const where = {
    AND: [
      // Filtro por Categoria
      category
        ? {
            category: {
              equals: category,
              mode: "insensitive",
            },
          }
        : {},

      // Filtro por Cidade
      city
        ? {
            user: {
              city: {
                contains: city,
                mode: "insensitive",
              },
            },
          }
        : {},
      
      // Filtro por Bairro (Se informado, filtramos direto no banco para performance)
      neighborhood 
        ? {
            user: {
                neighborhood: {
                    contains: neighborhood,
                    mode: "insensitive"
                }
            }
        }
        : {},

      // Busca Geral (Texto)
      q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { neighborhood: { contains: q, mode: "insensitive" } } },
              { category: { contains: q, mode: "insensitive" } }
            ],
          }
        : {},
    ],
  }

  try {
    // 4. Executa duas consultas em paralelo:
    // A: Contar quantos itens existem no total (para saber o numero de paginas)
    // B: Buscar os itens da página atual
    const [totalCount, providers] = await Promise.all([
      prisma.provider.count({ where }),
      prisma.provider.findMany({
        where,
        take: limit, // Limite por página
        skip: skip,  // Pula os anteriores
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
              city: true,
              neighborhood: true,
            },
          },
        },
        orderBy: {
            rating: 'desc' // Ordena pelos melhores avaliados
        }
      })
    ])

    // 5. Retorna no formato que o Frontend novo espera
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
    return res.status(500).json({
      message: "Erro ao buscar prestadores",
    })
  }
})



// Gravar clique no botão de WhatsApp
providersRoutes.post("/:id/contact", async (req, res) => {
  const { id } = req.params 
  const { clientId } = req.body 

  try {
    await prisma.contactLog.create({
      data: {
        providerId: id,
        clientId: clientId
      }
    })
    return res.status(201).json({ message: "Clique registrado" })
  } catch (error) {
    return res.status(500).json({ message: "Erro ao registrar" })
  }
})



// Ler e mostrar esse clique pro prestador
providersRoutes.get("/:id/stats", async (req, res) => {
  const { id } = req.params

  try {
    // Busca os logs
    const logs = await prisma.contactLog.findMany({
      where: { providerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            name: true,
            avatarUrl: true,
            phone: true,
            email: true
          }
        }
      }
    })
    
    // Retorna a contagem e a lista
    return res.json({ 
      contacts: logs.length, 
      logs: logs 
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ contacts: 0, logs: [] })
  }
})

export default providersRoutes