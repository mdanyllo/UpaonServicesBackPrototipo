import jwt from "jsonwebtoken"

export function ensureAuthenticated(req, res, next) {
  const authToken = req.headers.authorization

  if (!authToken) {
    return res.status(401).json({ message: "Token não informado." })
  }

  // O token geralmente vem como "Bearer <token>"
  // O split separa pelo espaço e pegamos a segunda parte
  const [, token] = authToken.split(" ")

  try {
    // Valida o token com a sua senha secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // AQUI ESTÁ A CORREÇÃO:
    // Salva o ID do usuário (que está no campo 'sub' do token) na requisição
    req.userId = decoded.sub

    return next()
  } catch (err) {
    return res.status(401).json({ message: "Token inválido." })
  }
}