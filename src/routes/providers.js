import { Router } from "express"
import { prisma } from "../prisma.js"

const providersRoutes = Router()

// --- FUNÇÃO AUXILIAR: Normaliza texto (Tira acentos, minusculo) ---
const normalizeText = (text) => {
  if (!text) return ""
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

// 🔍 BUSCA AVANÇADA DE PRESTADORES
providersRoutes.get("/", async (req, res) => {
  // Adicionei 'neighborhood' aqui para usarmos na ordenação inteligente
  const { category, q, city, neighborhood } = req.query

  try {
    // 1. BUSCA NO BANCO DE DADOS (Sua lógica original intacta)
    const providers = await prisma.provider.findMany({
      where: {
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

          // Filtro por Cidade (Buscando dentro de USER)
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

          // Busca Geral (Texto 'q')
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
            // Dados de endereço do User
            city: true,
            neighborhood: true,
          },
        },
      },
    })

    // 2. ORDENAÇÃO INTELIGENTE (PÓS-BUSCA)
    // Se o cliente enviou o bairro dele (neighborhood), ordenamos por proximidade
    if (neighborhood) {
      const termoBusca = normalizeText(neighborhood)

      providers.sort((a, b) => {
        const bairroA = normalizeText(a.user.neighborhood)
        const bairroB = normalizeText(b.user.neighborhood)

        // Verifica se o bairro do prestador contém o que o cliente busca (ou vice-versa)
        const matchA = bairroA.includes(termoBusca) || (termoBusca && termoBusca.includes(bairroA))
        const matchB = bairroB.includes(termoBusca) || (termoBusca && termoBusca.includes(bairroB))

        // Lógica de Sort:
        // Se A tem match e B não, A vem primeiro (-1)
        if (matchA && !matchB) return -1
        // Se B tem match e A não, B vem primeiro (1)
        if (!matchA && matchB) return 1
        // Se empatar, mantém a ordem original (0)
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


// ROTA GRAVAR CLIQUE ZAP
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

// 2. ROTA DE LER
providersRoutes.get("/:id/stats", async (req, res) => {
  const { id } = req.params

  try {
    // Conta quantos registros tem no banco para esse prestador
    const contactCount = await prisma.contactLog.count({
      where: { providerId: id }
    })
    
    return res.json({ contacts: contactCount })
  } catch (error) {
    return res.status(500).json({ contacts: 0 })
  }
})

export default providersRoutes