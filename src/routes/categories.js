import { Router } from "express"
import { prisma } from "../prisma.js"

const router = Router()

// Lista categorias únicas dos prestadores
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.provider.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    })

    return res.json(categories.map(c => c.category))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erro ao buscar categorias" })
  }
})

export default router
