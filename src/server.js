import express from "express"
import cors from "cors"
import { authRoutes } from "./routes/auth.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)

app.get("/", (req, res) => {
  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
  })
})

app.listen(3333, () => {
  console.log("Backend rodando")
})
