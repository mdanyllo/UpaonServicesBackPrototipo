import { Router } from "express"
import { prisma } from "../prisma.js"

export const providersRoutes = Router()

// Prestadores por categoria
providersRoutes.get("/:category", async (req, res) => {
  const { category } = req.params

  const providers = await prisma.provider.findMany({
    where: {
      category: {
        equals: category,
        mode: "insensitive",
      },
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
})
