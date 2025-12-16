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
    const { description, category } = req.body

    let avatarUrl = null

    if (req.file) {
      // UPLOAD COM TRAVA DE SEGURANÇA (50kb max strategy)
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
        provider: {
          upsert: {
            create: {
              userId: userId,
              category: category || "Outros",
              description: description || "",
              city: "São Luís - MA",
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
        city: updatedUser.provider?.city
    })

  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return res.status(500).json({ message: "Erro interno ao atualizar perfil." })
  }
})

export default userRoutes