import { Router } from "express"
import { prisma } from "../prisma.js"
import { cloudinary, upload } from "../lib/cloudinary.js"
import { ensureAuthenticated } from "../middlewares/auth.js"
import fs from "fs"

const userRoutes = Router() 

// Listar os usuários
userRoutes.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      avatarUrl: true,
    },
  })
  return res.json(users)
})



// Atualizar perfil de usuário
userRoutes.patch("/profile", ensureAuthenticated, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.userId
    const { name, description, category, phone, city, neighborhood } = req.body

    let avatarUrl = null

    // Lógica da Imagem
    if (req.file) {
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
    }

    const hasCategory = category && category.trim() !== ""

    // Só cria/atualiza o Provider se tiver categoria válida
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: avatarUrl || undefined,
        
        // Dados do Usuário (Cliente e Prestador têm)
        name: name || undefined, 
        phone: phone || undefined,
        city: city || undefined, 
        neighborhood: neighborhood || undefined,

        // Dados do Prestador (Só roda se providerUpdate não for undefined)
        provider: providerUpdate,
      },
      include: {
        provider: true, 
      },
    })

    return res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        provider: updatedUser.provider,
        city: updatedUser.city,
        neighborhood: updatedUser.neighborhood,
        phone: updatedUser.phone
    })

  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return res.status(500).json({ message: "Erro interno ao atualizar perfil." })
  }
})



// Histórico de serviços
userRoutes.get("/:id/history", async (req, res) => {
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