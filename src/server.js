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

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const SELF_PING_URL = "https://apiupaonservices.ddns.net" 

const app = express()
const prisma = new PrismaClient()

const PORT = process.env.PORT || 3333

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://upaonservices.vercel.app",
        "https://upaonservices.com.br",
        "https://www.upaonservices.com.br",
        "https://upaonservices-dztrwykxe-mdanyllos-projects.vercel.app",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
    // === LÓGICA DE DESTAQUE (AVISO 3 DIAS) ===
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
            <a href="https://upaonservices.com.br/dashboard/prestador" 
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

    // === LIMPEZA E DESATIVAÇÃO (EXPIRADOS HOJE) ===
    
    // 1. Primeiro, buscamos quem está com destaque vencido para pegar os dados
    const expiradosDestaque = await prisma.provider.findMany({
      where: { 
        featuredUntil: { lt: hoje }, 
        isFeatured: true 
      },
      include: { user: true } // Para pegar o nome e email do Markus
    });

    if (expiradosDestaque.length > 0) {
      // 2. Criamos a lista de texto para o seu email
      const listaPrestadores = expiradosDestaque
        .map(p => `- ${p.user.name} (${p.user.email})`)
        .join('<br>');

      // 3. Removemos o destaque deles no banco
      await prisma.provider.updateMany({
        where: { 
          id: { in: expiradosDestaque.map(p => p.id) } 
        },
        data: { isFeatured: false }
      });

      // 4. Enviamos o relatório para o seu email
      await resend.emails.send({
        from: 'Sistema UpaonServices <nao-responda@upaonservices.com.br>',
        to: 'contatoupaonservices@gmail.com',
        subject: `📊 Relatório de Destaques Expirados - ${hoje.toLocaleDateString('pt-BR')}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Relatório de Destaques Removidos</h2>
            <p>Os seguintes prestadores tiveram o destaque expirado hoje e voltaram para a listagem comum:</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
              ${listaPrestadores}
            </div>
            <p><strong>Total:</strong> ${expiradosDestaque.length} prestadores.</p>
            <hr>
            <p style="font-size: 12px; color: #999;">UpaonServices - Maranhão</p>
          </div>
        `
      });
      
      console.log(`[CRON] Relatório enviado para o admin. ${expiradosDestaque.length} destaques removidos.`);
    } else {
      console.log(`[CRON] Nenhum destaque expirou hoje.`);
    }

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