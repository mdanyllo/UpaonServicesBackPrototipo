import { Router } from "express"
import { prisma } from "../prisma.js"

const userRoutes = Router()

userRoutes.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  })

  return res.json(users)
})

export default userRoutes
