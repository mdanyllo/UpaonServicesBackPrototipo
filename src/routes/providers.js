import { Router } from "express"
import { prisma } from "../prisma.js"

const providersRoutes = Router()

// ✅ LISTA / FILTRA PRESTADORES
providersRoutes.get("/", async (req, res) => {
  const { category } = req.query

  try {
    const providers = await prisma.provider.findMany({
      where: category
        ? {
            category: {
              equals: category,
              mode: "insensitive",
            },
          }
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
    console.error("Erro providers:", error)
    return res.status(500).json({
      message: "Erro ao buscar prestadores",
    })
  }
})

export default providersRoutes
