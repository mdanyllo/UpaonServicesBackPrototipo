// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken"

export function ensureAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: "Token não informado" })
  }

  // O header vem como "Bearer eyJhbGc..."
  // A gente separa pelo espaço e pega só o token
  const [, token] = authHeader.split(" ")

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Injeta o ID do usuário dentro da requisição
    req.user = {
      id: decoded.sub,
      role: decoded.role
    }

    return next()
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" })
  }
}