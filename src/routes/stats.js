import { Router } from "express"
import { prisma } from "../prisma.js"

const statsRoutes = Router()

// Estatísticas públicas da plataforma
statsRoutes.get("/", async (req, res) => {
  try {
    const totalProviders = await prisma.provider.count()
    const totalClients = await prisma.user.count({
      where: { role: "CLIENT" },
    })

    res.json({
      providers: totalProviders,
      clients: totalClients,
    })
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar estatísticas" })
  }
})

export default statsRoutes
