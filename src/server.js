import express from "express"
import cors from "cors"
import https from "https"

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import statsRoutes from "./routes/stats.js"
import categoriesRoutes from "./routes/categories.js"
import providersRoutes from "./routes/providers.js"


const app = express()

const PORT = process.env.PORT || 3333
const SELF_PING_URL = "https://upaonservicesbackprototipo.onrender.com"

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:3000",
      "http://localhost:5173",
      "https://upaonservices.vercel.app",
      "https://upaonservices.com.br",
      "https://www.upaonservices.com.br",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
)

app.use(express.json())

// Rotas
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/stats", statsRoutes)
app.use("/categories", categoriesRoutes)
app.use("/providers", providersRoutes)


// Health check
app.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Backend rodando 🚀",
    api: "Upaon Services",
    version: "1.0.0",
  })
})

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`)
})

// mantém o Render acordado
setInterval(() => {
  https
    .get(SELF_PING_URL, (res) => {
      console.log("Ping OK:", res.statusCode)
    })
    .on("error", (err) => {
      console.error("Erro no ping:", err.message)
    })
}, 14 * 60 * 1000)
