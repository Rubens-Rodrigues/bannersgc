import express from 'express';
import cors from 'cors';
import path from 'path';
import bannerRoutes from './routes/banner.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware para JSON
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos da pasta "public"
app.use('/public', express.static(path.join(__dirname, '../public')));

// Rotas
app.use('/api/banners', bannerRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});