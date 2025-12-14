import express from "express"
import cors from "cors"
import { authRoutes } from "./routes/auth.js"
import { userRoutes } from "./routes/users.js"
import https from "https";

const app = express()
const URL = "https://upaonservicesbackprototipo.onrender.com/"

app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)
app.use("/users", userRoutes)

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

setInterval(() => {
  https
    .get(URL, res => {
      console.log("Ping OK:", res.statusCode);
    })
    .on("error", err => {
      console.error("Erro no ping:", err.message);
    });
}, 14 * 60 * 1000);