import { Router } from "express"
import { prisma } from "../prisma.js"

const categoriesRoutes = Router()

// 📌 Lista categorias
categoriesRoutes.get("/", async (req, res) => {
  try {
    const categories = await prisma.provider.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    })

    const cleanCategories = categories
      .map(c => c.category)
      .filter(c => c !== null && c !== "")

    return res.json(cleanCategories)
  } catch (error) {
    console.error("Erro rota categories:", error)
    return res.status(500).json({ message: "Erro ao buscar categorias" })
  }
})

// 📌 Prestadores por categoria
categoriesRoutes.get("/:category", async (req, res) => {
  const { category } = req.params

  try {
    const providers = await prisma.provider.findMany({
      where: {
        category: {
          equals: category,
          mode: "insensitive", // ignora maiúsculas/minúsculas
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
  } catch (error) {
    console.error("Erro rota categoria:", error)
    return res
      .status(500)
      .json({ message: "Erro ao buscar prestadores da categoria" })
  }
})

export default categoriesRoutes
