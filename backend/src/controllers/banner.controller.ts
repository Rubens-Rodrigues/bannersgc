import { Request, Response } from 'express';
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { processCSV, generateBanner } from '../services/banner.service';

// const BASE_URL = "http://localhost:3000/public/";
const BASE_URL = "https://api-bannersgc.onrender.com/public/";

// Gera múltiplos banners a partir de um arquivo TSV
export const generateBannersFromCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Arquivo TSV não foi enviado" });
      return;
    }

    const io = req.app.get("socketio");

    const banners = await processCSV(req.file.path, io);

    console.log(`✅ Banners gerados com sucesso! Total: ${banners.length}`);

    // Criar um arquivo ZIP contendo todas as pastas dentro de `public/`
    const zipPath = path.join(__dirname, "../../public/banners.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err) => {
      console.warn("⚠️ Aviso do Archiver:", err);
    });

    archive.on("error", (err) => {
      console.error("❌ Erro ao criar o ZIP:", err);
      res.status(500).json({ error: "Erro ao criar o ZIP dos banners" });
      return;
    });

    archive.pipe(output);

    const publicDir = path.join(__dirname, "../../public");

    fs.readdir(publicDir, (err, folders) => {
      if (err) {
        console.error("❌ Erro ao listar pastas:", err);
        res.status(500).json({ error: "Erro ao acessar pastas de banners" });
        return;
      }

      folders.forEach((folder) => {
        const folderPath = path.join(publicDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
          console.log(`📂 Adicionando pasta: ${folder}`);
          archive.directory(folderPath, folder);
        }
      });

      archive.finalize();
    });

    output.on("close", () => {
      console.log(`📦 ZIP criado com sucesso! Tamanho: ${archive.pointer()} bytes`);

      // ✅ Envia evento WebSocket para informar que o ZIP foi criado
      io.emit("banner_status", { status: "FINALIZADO", zipUrl: `${BASE_URL}banners.zip` });

      // ✅ Envia resposta para o frontend
      res.status(200).json({ message: "Banners gerados!", zipUrl: `${BASE_URL}banners.zip` });
    });

  } catch (error) {
    console.error("❌ Erro ao gerar os banners:", error);
    res.status(500).json({ error: "Erro ao gerar os banners" });
  }
};

// Gera um banner individual
export const generateSingleBanner = async (req: Request, res: Response) => {
  try {
    const { nome, dia, horario, bairro, endereco, lideres, telefone, feedTemplate, storyTemplate } = req.body;

    if (!nome || !dia || !horario || !bairro || !endereco || !lideres || !telefone || !feedTemplate || !storyTemplate) {
      res.status(400).json({ error: "Todos os campos são obrigatórios." });
      return;
    }

    // salva os banners individuais diretamente na pasta `public/`
    const publicDir = path.join(__dirname, "../../public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const feedPath = await generateBanner({ nome, dia, horario, bairro, endereco, lideres, telefone }, "feed", feedTemplate);
    const storyPath = await generateBanner({ nome, dia, horario, bairro, endereco, lideres, telefone }, "story", storyTemplate);

    console.log("✅ Banner individual gerado com sucesso!");

    res.status(200).json({
      message: "Banners gerados!",
      banners: [
        `${BASE_URL}${feedPath}`,
        `${BASE_URL}${storyPath}`
      ],
    });

  } catch (error) {
    console.error("❌ Erro ao gerar banner:", error);
    res.status(500).json({ error: "Erro ao gerar o banner" });
  }
};