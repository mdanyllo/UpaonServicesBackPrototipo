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
    city,
    neighborhood,
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
        category,
        description: description || null,
        city: city || "São Luís - MA",
        neighborhood: neighborhood || null,

        user: {
          connect: {
            id: user.id,
          },
        },
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
  try {
    const { email, password } = req.body

    // Validação
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" })
    }

    // Busca User + Dados do Provider (Join)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        provider: true, // <--- O Prisma busca os dados da tabela Provider aqui
      },
    })

    if (!user) {
      return res.status(401).json({ message: "Email ou senha incorretos" })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: "Email ou senha incorretos" })
    }

    // Gera o Token
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

    // Retorna os dados organizados
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl, // Se tiver implementado a foto

        // AQUI ESTÁ A CORREÇÃO:
        // O '?' (interrogação) é vital. Se for um Cliente logando,
        // user.provider é null. O '?' impede o código de quebrar.
        city: user.provider?.city || "São Luís - MA", 
        neighborhood: user.provider?.neighborhood || null,

        // Dados extras do prestador, se existirem
        provider: user.provider
          ? {
              id: user.provider.id,
              description: user.provider.description,
              rating: user.provider.rating,
              category: user.provider.category, // Adicionei caso queira mostrar a categoria
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Erro no login:", error)
    return res.status(500).json({ message: "Erro interno no servidor" })
  }
})

export default authRoutes