import { Router } from "express"
import { prisma } from "../prisma.js"
import { ensureAuthenticated } from "../middlewares/auth.js"

const reviewsRoutes = Router()

// 1. CRIAR AVALIAÇÃO E ATUALIZAR MÉDIA
reviewsRoutes.post("/", ensureAuthenticated, async (req, res) => {
  const { providerId, rating, comment } = req.body
  const authorId = req.userId // Quem está avaliando (vem do token)

  // Validação simples
  if (!providerId || !rating) {
    return res.status(400).json({ message: "Prestador e nota são obrigatórios." })
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "A nota deve ser entre 1 e 5." })
  }

  try {
    // A. Verifica se o usuário não está se auto-avaliando (Opcional, mas recomendado)
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      return res.status(404).json({ message: "Prestador não encontrado." })
    }

    if (provider.userId === authorId) {
      return res.status(400).json({ message: "Você não pode avaliar a si mesmo." })
    }

    // B. Cria a Avaliação
    const newReview = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment: comment || null,
        providerId,
        authorId
      }
    })

    // C. CALCULA A NOVA MÉDIA (A Mágica acontece aqui ✨)
    const aggregations = await prisma.review.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        providerId,
      },
    })

    const newAverage = aggregations._avg.rating || rating

    // D. Atualiza a tabela do Prestador com a nota nova
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        rating: newAverage
      }
    })

    return res.status(201).json(newReview)

  } catch (error) {
    console.error("Erro ao avaliar:", error)
    return res.status(500).json({ message: "Erro ao salvar avaliação." })
  }
})

// 2. LISTAR AVALIAÇÕES DE UM PRESTADOR
reviewsRoutes.get("/:providerId", async (req, res) => {
  const { providerId } = req.params

  try {
    const reviews = await prisma.review.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" }, // Mais recentes primeiro
      include: {
        author: {
          select: {
            name: true,
            avatarUrl: true,
          }
        }
      }
    })

    return res.json(reviews)

  } catch (error) {
    console.error("Erro ao buscar avaliações:", error)
    return res.status(500).json({ message: "Erro ao buscar avaliações." })
  }
})

export default reviewsRoutes