import { Router } from "express"
import { prisma } from "../prisma.js"
import { cloudinary, upload } from "../lib/cloudinary.js"
import { ensureAuthenticated } from "../middlewares/auth.js"
import fs from "fs"

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
      avatarUrl: true,
    },
  })
  return res.json(users)
})

userRoutes.patch("/profile", ensureAuthenticated, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.userId
    
    // --- CORREÇÃO AQUI 👇 ---
    // Você precisa receber 'phone', 'city' e 'neighborhood' do front-end
    const { description, category, phone, city, neighborhood } = req.body
    // ------------------------

    let avatarUrl = null

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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: avatarUrl || undefined,
        
        // Agora essas variáveis existem!
        phone: phone || undefined,
        city: city || undefined, 
        neighborhood: neighborhood || undefined,

        provider: {
          upsert: {
            create: {
              category: category || "Outros",
              description: description || "",
            },
            update: {
              category: category || undefined,
              description: description || undefined,
            },
          },
        },
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
        
        // Retorna os dados novos
        city: updatedUser.city,
        neighborhood: updatedUser.neighborhood,
        phone: updatedUser.phone
    })

  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return res.status(500).json({ message: "Erro interno ao atualizar perfil." })
  }
})

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