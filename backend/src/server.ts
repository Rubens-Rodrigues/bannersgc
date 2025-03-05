import express from "express";
import cors from "cors";
import path from "path";
import bannerRoutes from "./routes/banner.routes";

const app = express();

// Middleware para JSON
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos da pasta "public"
app.use("/public", express.static(path.join(__dirname, "../public")));

// Rotas
app.use("/api/banners", bannerRoutes);

// Rota inicial para testar o backend no Vercel
app.get("/", (req, res) => {
  res.send("🚀 Backend rodando no Vercel!");
});

// Exporta o app (Vercel precisa disso)
export default app;