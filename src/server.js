import express from "express"
import cors from "cors"
import { authRoutes } from "./routes/auth.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)

app.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Backend rodando",
    api: "Upaon Services",
    version: "1.0.0"
  })
})

app.listen(3333, () => {
  console.log("Backend rodando")
})
