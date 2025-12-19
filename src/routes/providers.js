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



// Busca avançada de prestadores
providersRoutes.get("/", async (req, res) => {
  const { category, q, city, neighborhood } = req.query

  try {
    const providers = await prisma.provider.findMany({
      where: {
        AND: [
          // Filtro por categoria
          category
            ? {
                category: {
                  equals: category,
                  mode: "insensitive",
                },
              }
            : {},

          // Filtro por cidade
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

          // Busca geral com texto
          q
            ? {
                OR: [
                  { description: { contains: q, mode: "insensitive" } },
                  { user: { name: { contains: q, mode: "insensitive" } } },
                  { user: { neighborhood: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {},
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            // Dados de endereço do usuário cliente
            city: true,
            neighborhood: true,
          },
        },
      },
    })



    // Se o cliente enviou o bairro dele, ordenamos por proximidade
    if (neighborhood) {
      const termoBusca = normalizeText(neighborhood)

      providers.sort((a, b) => {
        const bairroA = normalizeText(a.user.neighborhood)
        const bairroB = normalizeText(b.user.neighborhood)

        const matchA = bairroA.includes(termoBusca) || (termoBusca && termoBusca.includes(bairroA))
        const matchB = bairroB.includes(termoBusca) || (termoBusca && termoBusca.includes(bairroB))

        // Lógica de Sort
        if (matchA && !matchB) return -1
        if (!matchA && matchB) return 1
        return 0
      })
    }

    return res.json(providers)

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