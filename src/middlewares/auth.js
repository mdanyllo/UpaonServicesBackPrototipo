import jwt from "jsonwebtoken"

export function ensureAuthenticated(req, res, next) {
  const authToken = req.headers.authorization

  if (!authToken) {
    return res.status(401).json({ message: "Token não informado." })
  }

  const [, token] = authToken.split(" ")

  try {
    // Valida o token com a jwt_secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.userId = decoded.sub

    return next()
  } catch (err) {
    return res.status(401).json({ message: "Token inválido." })
  }
}