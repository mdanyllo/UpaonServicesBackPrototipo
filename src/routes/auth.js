import { Router } from "express"
import { prisma } from "../prisma.js"
import bcrypt from "bcryptjs"

export const authRoutes = Router()

authRoutes.post("/register", async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Dados obrigatórios" })
  }

  const userExists = await prisma.user.findUnique({
    where: { email },
  })

  if (userExists) {
    return res.status(400).json({ message: "Email já cadastrado" })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  })

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
  })
})
