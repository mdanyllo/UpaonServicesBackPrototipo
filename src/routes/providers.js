import { Router } from "express"
import { prisma } from "../prisma.js"

const providersRoutes = Router()

// 🔍 BUSCA AVANÇADA DE PRESTADORES
providersRoutes.get("/", async (req, res) => {
  const { category, q } = req.query

  try {
    const providers = await prisma.provider.findMany({
      where: {
        AND: [
          category
            ? {
                category: {
                  equals: category,
                  mode: "insensitive",
                },
              }
            : {},

          q
            ? {
                OR: [
                  {
                    description: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                  {
                    user: {
                      name: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
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
