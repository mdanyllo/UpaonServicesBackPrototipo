import express from "express"
import cors from "cors"
import https from "https"
import cron from "node-cron" // Adicionado
import { PrismaClient } from "@prisma/client" // Adicionado

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import adminRoutes from "./routes/admin.js"
import statsRoutes from "./routes/stats.js"
import categoriesRoutes from "./routes/categories.js"
import providersRoutes from "./routes/providers.js"
import reviewsRoutes from "./routes/reviews.js"
import payRoutes from "./routes/payment.js"

const app = express()
const prisma = new PrismaClient() // Adicionado

const PORT = process.env.PORT || 3333
const SELF_PING_URL = "https://upaonservicesbackprototipo.onrender.com"

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://upaonservices.vercel.app",
        "https://upaonservices.com.br",
        "https://www.upaonservices.com.br",
        "https://upaonservices-dztrwykxe-mdanyllos-projects.vercel.app",
      ]
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Não permitido por CORS"))
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

app.options("*", cors())
app.use(express.json())

// Rotas
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/admin", adminRoutes)
app.use("/payment", payRoutes)
app.use("/stats", statsRoutes)
app.use("/categories", categoriesRoutes)
app.use("/providers", providersRoutes)
app.use("/reviews", reviewsRoutes)


// Health check
app.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Backend rodando",
    api: "Upaon Services",
    version: "1.0.0",
  })
})




// cron rodando
cron.schedule("0 8 * * *", async () => {
  const hoje = new Date();
  
  // Datas de alvo para avisos
  const cincoDiasPraFrente = new Date();
  cincoDiasPraFrente.setDate(hoje.getDate() + 5);
  
  const tresDiasPraFrente = new Date();
  tresDiasPraFrente.setDate(hoje.getDate() + 3);

  try {
    // === 1. LÓGICA DE ATIVAÇÃO (AVISO 5 DIAS) ===
    const prestadoresAtivacao = await prisma.provider.findMany({
      where: {
        activatedUntil: {
          gte: new Date(cincoDiasPraFrente.setHours(0, 0, 0, 0)),
          lte: new Date(cincoDiasPraFrente.setHours(23, 59, 59, 999))
        },
        isActive: true
      },
      include: { user: true }
    });

    for (const p of prestadoresAtivacao) {
      await resend.emails.send({
        from: 'Equipe UpaonServices <nao-responda@upaonservices.com.br>',
        to: p.user.email,
        subject: 'Sua ativação vence em 5 dias! ⏳',
        html: `
          <div style="background-color: #09090b; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px;">
            <h1 style="color: #22c55e; font-size: 24px;">Olá, ${p.user.name}!</h1>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
              Notamos que sua ativação na <strong>UpaonServices</strong> expira em breve. 
              Para continuar recebendo contatos e manter seu perfil visível, renove sua assinatura.
            </p>
            <div style="margin-top: 30px; padding: 20px; background: #18181b; border: 1px solid #27272a; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">Data de vencimento:</p>
              <p style="margin: 5px 0 0 0; color: #ef4444; font-size: 18px; font-weight: bold;">
                ${cincoDiasPraFrente.toLocaleDateString('pt-BR')}
              </p>
            </div>
            <a href="https://upaonservices.com.br/dashboard" 
               style="display: block; margin-top: 30px; background: #22c55e; color: #ffffff; text-align: center; padding: 15px; border-radius: 8px; text-decoration: none; font-weight: bold;">
               RENOVAR MINHA CONTA
            </a>
            <p style="margin-top: 20px; color: #71717a; font-size: 12px; text-align: center;">
              Se você já realizou o pagamento, desconsidere este aviso.
            </p>
          </div>
        `
      });
    }

    // === 2. LÓGICA DE DESTAQUE (AVISO 3 DIAS) ===
    const prestadoresDestaque = await prisma.provider.findMany({
      where: {
        featuredUntil: {
          gte: new Date(tresDiasPraFrente.setHours(0, 0, 0, 0)),
          lte: new Date(tresDiasPraFrente.setHours(23, 59, 59, 999))
        },
        isFeatured: true
      },
      include: { user: true }
    });

    for (const p of prestadoresDestaque) {
      await resend.emails.send({
        from: 'Equipe UpaonServices <nao-responda@upaonservices.com.br>',
        to: p.user.email,
        subject: 'O seu destaque na página inicial está a expirar! 🚀',
        html: `
          <div style="background-color: #09090b; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; border: 1px solid #27272a;">
            <h1 style="color: #eab308; font-size: 24px;">Atenção ao seu Destaque, ${p.user.name}!</h1>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
              O seu perfil deixará de aparecer no topo das pesquisas em <strong>3 dias</strong>. 
              Mantenha-se em evidência para garantir mais cliques e contatos.
            </p>
            <div style="margin-top: 30px; padding: 20px; background: #1c1917; border: 1px solid #eab308; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #eab308; font-size: 14px; font-weight: bold;">EXPIRA EM:</p>
              <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 20px;">
                ${tresDiasPraFrente.toLocaleDateString('pt-BR')}
              </p>
            </div>
            <a href="https://upaonservices.com.br/dashboard" 
               style="display: block; margin-top: 30px; background: #eab308; color: #000000; text-align: center; padding: 15px; border-radius: 8px; text-decoration: none; font-weight: bold;">
               RENOVAR DESTAQUE AGORA
            </a>
             <p style="margin-top: 20px; color: #71717a; font-size: 12px; text-align: center;">
              Se você já realizou o pagamento, desconsidere este aviso.
            </p>
          </div>
        `
      });
    }

    // === 3. LIMPEZA E DESATIVAÇÃO (EXPIRADOS HOJE) ===
    
    // Desativar Ativações expiradas
    const expirados = await prisma.provider.updateMany({
      where: { activatedUntil: { lt: hoje }, isActive: true },
      data: { isActive: false, isFeatured: false }
    });

    // Desativar apenas Destaques expirados
    const destaquesVencidos = await prisma.provider.updateMany({
      where: { featuredUntil: { lt: hoje }, isFeatured: true },
      data: { isFeatured: false }
    });

    console.log(`[CRON] Sucesso: Avisos enviados. Contas suspensas: ${expirados.count}. Destaques removidos: ${destaquesVencidos.count}.`);

  } catch (err) {
    console.error("Erro no fluxo do Resend/Cron:", err);
  }
});
// ==========================================



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