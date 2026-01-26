import { Router } from "express"
import { prisma } from "../prisma.js"
import { cloudinary, upload } from "../lib/cloudinary.js"
import { ensureAuthenticated } from "../middlewares/auth.js"
import { exclude } from "../middlewares/exclude.js"
import fs from "fs"

const userRoutes = Router()

// 1. LISTAR TODOS OS USUÁRIOS (PÚBLICO/RESTRITO)
userRoutes.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        avatarUrl: true,
        city: true,
        neighborhood: true,
        provider: true
      },
    })
    return res.json(users)
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar usuários" })
  }
})

// 2. LISTAR UM ÚNICO USUÁRIO POR ID
userRoutes.get("/:id", ensureAuthenticated, async (req, res) => {
  const { id } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        provider: true,
      }
    })

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }

    // Usando a função exclude que você importou para limpar o objeto
    const safeUser = exclude(user, ['password', 'cpf'])

    return res.json(safeUser)
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar usuário" })
  }
})

// 3. ATUALIZAR PERFIL DE USUÁRIO
userRoutes.patch("/profile", ensureAuthenticated, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.userId
    const { name, description, category, phone, city, neighborhood } = req.body

    let avatarUrl = null

    // Lógica da Imagem (Cloudinary)
    if (req.file) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "upaon_avatars",
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" }
          ],
          quality: "auto:good",
          fetch_format: "auto",
        })
        avatarUrl = uploadResult.secure_url
        fs.unlinkSync(req.file.path)
      } catch (uploadError) {
        console.error("Erro no Cloudinary:", uploadError)
      }
    }

    // Preparar dados do Provider 
    const hasCategory = category && category.trim() !== "" && category !== "undefined"
    
    const providerUpdate = hasCategory ? {
      upsert: {
        create: {
          category: category,
          description: description || "",
        },
        update: {
          category: category,
          description: description || undefined,
        },
      },
    } : undefined 

    // Higienização de inputs básicos
    const cleanName = name && name !== "undefined" && name !== "null" ? name : undefined
    const cleanPhone = phone && phone !== "undefined" && phone !== "null" ? phone : undefined
    const cleanCity = city && city !== "undefined" && city !== "null" ? city : undefined
    const cleanNeighborhood = neighborhood && neighborhood !== "undefined" && neighborhood !== "null" ? neighborhood : undefined

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: avatarUrl || undefined,
        name: cleanName, 
        phone: cleanPhone,
        city: cleanCity, 
        neighborhood: cleanNeighborhood,
        provider: providerUpdate,
      },
      include: {
        provider: true, 
      },
    })

    // Retorna apenas o necessário (Segurança)
    return res.json(exclude(updatedUser, ['password', 'cpf']))

  } catch (error) {
    console.error("Erro CRÍTICO ao atualizar perfil:", error)
    return res.status(500).json({ message: "Erro interno ao atualizar perfil." })
  }
})

// 4. HISTÓRICO DE SERVIÇOS
userRoutes.get("/:id/history", ensureAuthenticated, async (req, res) => {
  const { id } = req.params

  try {
    const history = await prisma.contactLog.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          include: {
            user: {
              select: { name: true, avatarUrl: true, phone: true, city: true }
            }
          }
        }
      }
    })
    
    return res.json({ count: history.length, logs: history })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ count: 0, logs: [] })
  }
})

export default userRoutes