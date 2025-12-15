import { Router } from "express"
import { prisma } from "../prisma.js"

const router = Router()

// LISTAR PRESTADORES POR CATEGORIA
router.get("/providers", async (req, res) => {
  const { category } = req.query

  try {
    const providers = await prisma.provider.findMany({
      where: category
        ? { category }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    return res.json(providers)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erro ao buscar prestadores" })
  }
})

export { router as userRoutes }
