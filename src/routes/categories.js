import { Router } from "express"
import { prisma } from "../prisma.js"

const categoriesRoutes = Router()

categoriesRoutes.get("/", async (req, res) => {
  try {
    // BUSCA LIMPA: Sem 'where' para não dar conflito com o Prisma
    const categories = await prisma.provider.findMany({
      select: {
        category: true,
      },
      distinct: ["category"], // Isso já garante que não vem repetido
      orderBy: {
        category: "asc",
      },
    })

    // FILTRO NO JAVASCRIPT: Removemos nulos e vazios aqui, é mais seguro agora
    const cleanCategories = categories
      .map(c => c.category)
      .filter(c => c !== null && c !== "")

    return res.json(cleanCategories)
    
  } catch (error) {
    console.error("Erro rota categories:", error)
    return res.status(500).json({ message: "Erro ao buscar categorias" })
  }
})

export default categoriesRoutes