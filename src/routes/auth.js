import { Router } from "express"
import { prisma } from "../prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const authRoutes = Router()

//cadastro
authRoutes.post("/register", async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    role,
    category,
    description,
  } = req.body

  if (!name || !email || !password || !role) {
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
      phone,
      role,
    },
  })

  if (role === "PROVIDER") {
    if (!category) {
      return res.status(400).json({ message: "Categoria obrigatória" })
    }

    await prisma.provider.create({
      data: {
        userId: user.id,
        category,
        description: description || null,
      },
    })
  }

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
})


//Login

authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios" })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      provider: true,
    },
  })

  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas" })
  }

  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    return res.status(401).json({ message: "Credenciais inválidas" })
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  )

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      provider: user.provider
        ? {
            id: user.provider.id,
            description: user.provider.description,
            rating: user.provider.rating,
          }
        : null,
    },
  })
})

export default authRoutes

