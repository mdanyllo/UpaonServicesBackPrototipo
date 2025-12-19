import { prisma } from "../prisma.js"

export async function ensureAdmin(req, res, next) {
  const { userId } = req

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  // Se não for admin, chuta pra fora
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Acesso negado. Área TOTALMENTE restrita." })
  }

  return next()
}