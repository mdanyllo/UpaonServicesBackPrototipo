import { Router } from "express"
import { prisma } from "../prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { sendVerificationEmail } from "../services/email.js"

const authRoutes = Router()

// --- ROTA DE CADASTRO (Agora com envio de código) ---
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

    // 1. GERA O CÓDIGO DE VERIFICAÇÃO (NOVO)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expira em 10 min

    const hashedPassword = await bcrypt.hash(password, 10)

    // 2. CRIA O USUÁRIO COM OS CAMPOS DE VERIFICAÇÃO (ATUALIZADO)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        isEmailVerified: false, // Começa falso
        verificationCode: code, // Salva o código
        codeExpiresAt: expiresAt // Salva validade
      },
    })

    // Lógica do Prestador (Mantida igual ao seu código original)
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

    // 3. ENVIA O EMAIL (NOVO)
    await sendVerificationEmail(email, code);

    // Retorna mensagem pedindo verificação
    return res.status(201).json({
      message: "Usuário criado com sucesso. Verifique seu email para ativar a conta.",
      userId: user.id,
      email: user.email
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erro ao criar usuário" })
  }
})




// --- NOVA ROTA: VERIFICAR CÓDIGO ---
authRoutes.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    // Se já verificado, retorna ok
    if (user.isEmailVerified) return res.json({ message: "Conta já verificada!" });

    // Verifica código e validade
    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Código inválido" });
    }

    if (new Date() > user.codeExpiresAt) {
      return res.status(400).json({ message: "Código expirado. Solicite um novo." });
    }

    // Sucesso: Ativa a conta
    await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null
      }
    });

        // 1. Gera o token (igualzinho no Login)
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    // 2. Retorna o token e os dados do usuário
    return res.status(200).json({ 
      message: "Email verificado com sucesso!",
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role // IMPORTANTE: Precisamos disso pra saber pra onde redirecionar
      }
    })

  } catch (error) {
    return res.status(500).json({ message: "Erro ao verificar conta" });
  }
})




// --- LOGIN (Com verificação se está ativo) ---
authRoutes.post("/login", async (req, res) => {
  try {
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
      return res.status(401).json({ message: "Email ou senha incorretos" })
    }

    // TRAVA DE SEGURANÇA (NOVO): Impede login se não verificou
    // Se quiser permitir login sem verificar, remova este bloco IF
    if (!user.isEmailVerified) {
       return res.status(403).json({ 
         message: "Conta não verificada. Verifique seu email.",
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
        avatarUrl: user.avatarUrl,
        city: user.provider?.city || "São Luís - MA", 
        neighborhood: user.provider?.neighborhood || null,
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