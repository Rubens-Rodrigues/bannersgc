import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import bannerRoutes from './routes/banner.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Criar um servidor HTTP com o Express
const server = http.createServer(app);

// Configurar o WebSocket com o servidor HTTP
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware para JSON
app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos da pasta "public"
app.use('/public', express.static(path.join(__dirname, '../public')));

// Middleware para adicionar o socket.io a todas as requisições
app.use((req, res, next) => {
    req.app.set("socketio", io);
    next();
});

// Rotas
app.use('/api/banners', bannerRoutes);

// WebSocket: Escutando conexões
io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado ao WebSocket");

    socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado");
    });
});

// Iniciar o servidor HTTP (não `app.listen`)
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});