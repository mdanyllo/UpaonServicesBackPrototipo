import { Router } from "express"
import { prisma } from "../prisma.js"

const categoriesRoutes = Router()

// 📌 Lista categorias únicas
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
    return res.status(500).json({
      message: "Erro ao buscar categorias",
    })
  }
})

export default categoriesRoutes
