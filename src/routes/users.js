import { Router } from "express"
import { prisma } from "../prisma.js"
import { cloudinary, upload } from "../lib/cloudinary.js"
import { ensureAuthenticated } from "../middlewares/auth.js"
import fs from "fs"

const userRoutes = Router() 

// Lista os usuários
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
      city: true,       
      neighborhood: true,  
      provider: true       
    },
  })
  return res.json(users)
})



// Lista um único usuário por ID
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

    delete user.password

    return res.json(user)
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar usuário" })
  }
})



// Atualizar perfil de usuário
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
        // Deleta o arquivo local após upload
        fs.unlinkSync(req.file.path)
      } catch (uploadError) {
        console.error("Erro no Cloudinary:", uploadError)
        // Não trava o resto da atualização se a imagem falhar
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

    // Preparar dados do User (Objeto limpo)
    const cleanName = name && name !== "undefined" && name !== "null" ? name : undefined
    const cleanPhone = phone && phone !== "undefined" && phone !== "null" ? phone : undefined
    const cleanCity = city && city !== "undefined" && city !== "null" ? city : undefined
    const cleanNeighborhood = neighborhood && neighborhood !== "undefined" && neighborhood !== "null" ? neighborhood : undefined

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        // Se avatarUrl for null, não atualiza (undefined). Se tiver url, atualiza.
        avatarUrl: avatarUrl || undefined,
        
        // Dados Básicos
        name: cleanName, 
        phone: cleanPhone,
        city: cleanCity, 
        neighborhood: cleanNeighborhood,

        // Dados do Prestador
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
    console.error("Erro CRÍTICO ao atualizar perfil:", error)
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