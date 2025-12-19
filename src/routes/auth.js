import { Router } from "express"
import { prisma } from "../prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { sendVerificationEmail } from "../services/email.js"

const authRoutes = Router()



// ROTA CADASTRO
authRoutes.post("/register", async (req, res) => {
  try {
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

    // Validações básicas
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Dados obrigatórios" })
    }

    // Verifica se usuário já existe
    const userExists = await prisma.user.findUnique({
      where: { email },
    })

    if (userExists) {
      return res.status(400).json({ message: "Email já cadastrado" })
    }

    // 1. Gera código de verificação
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const hashedPassword = await bcrypt.hash(password, 10)

    // 2. CRIAÇÃO ATÔMICA (User + Endereço + Provider se necessário)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        
        // --- MUDANÇA: O ENDEREÇO AGORA É AQUI NO USER ---
        city: city || "São Luís - MA",
        neighborhood: neighborhood || "",
        
        // Dados de Verificação
        isEmailVerified: false,
        verificationCode: code,
        codeExpiresAt: expiresAt,

        // --- MUDANÇA: CRIA O PRESTADOR JUNTO (SE FOR UM) ---
        provider: role === "PROVIDER" ? {
          create: {
            category: category || "Outros",
            description: description || null,
            rating: 5.0,
            // OBS: Não tem mais city/neighborhood aqui dentro!
          }
        } : undefined
      },
    })

    // 3. Envia o email
    await sendVerificationEmail(email, code);

    return res.status(201).json({
      message: "Usuário criado! Verifique seu email.",
      userId: user.id,
      email: user.email
    })

  } catch (error) {
    console.error("Erro no registro:", error)
    return res.status(500).json({ message: "Erro ao criar usuário" })
  }
})



// ROTA VERIFICAR EMAIL
authRoutes.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    if (user.isEmailVerified) return res.json({ message: "Conta já verificada!" });

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Código inválido" });
    }

    if (new Date() > user.codeExpiresAt) {
      return res.status(400).json({ message: "Código expirado." });
    }

    // Ativa a conta
    const userUpdated = await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null
      }
    });

    // Gera o Token para Auto-Login
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    return res.status(200).json({ 
      message: "Email verificado com sucesso!",
      token, 
      user: {
        id: userUpdated.id,
        name: userUpdated.name,
        email: userUpdated.email,
        role: userUpdated.role,
        city: userUpdated.city, 
        neighborhood: userUpdated.neighborhood,
      }
    })

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao verificar conta" });
  }
})



// ROTA REENVIAR CÓDIGO
authRoutes.post("/resend-code", async (req, res) => {
  const { email } = req.body

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Esta conta já foi verificada. Faça login." })
    }

    // 1. Gera novo código e nova validade
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // +10 min

    // 2. Atualiza no banco
    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: code,
        codeExpiresAt: expiresAt
      }
    })

    // 3. Reenvia o email
    await sendVerificationEmail(email, code)

    return res.json({ message: "Novo código enviado! Verifique seu email." })

  } catch (error) {
    console.error("Erro ao reenviar código:", error)
    return res.status(500).json({ message: "Erro ao reenviar código." })
  }
})



// ROTA DE LOGIN
authRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        provider: true, // Traz os dados extras se for prestador
      },
    })

    if (!user) {
      return res.status(401).json({ message: "Email ou senha incorretos" })
    }

    // Trava de verificação
    if (!user.isEmailVerified) {
       return res.status(403).json({ 
         message: "Conta não verificada.",
         needsVerification: true 
       })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: "Email ou senha incorretos" })
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        
        // --- MUDANÇA: LÊ A CIDADE DO PRÓPRIO USER ---
        city: user.city, 
        neighborhood: user.neighborhood,
        
        provider: user.provider
          ? {
              id: user.provider.id,
              description: user.provider.description,
              rating: user.provider.rating,
              category: user.provider.category,
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