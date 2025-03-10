import { Request, Response } from 'express';
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { processCSV, generateBanner } from '../services/banner.service';

// const BASE_URL = "http://localhost:4000/public/";
const BASE_URL = "https://api-bannersgc.onrender.com/public/";

// Gera múltiplos banners a partir de um arquivo CSV
export const generateBannersFromCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Arquivo CSV não foi enviado" });
      return;
    }

    const banners = await processCSV(req.file.path);

    const feedBanners = banners.filter(fileName => fileName.includes("-feed"));
    const storyBanners = banners.filter(fileName => fileName.includes("-story"));

    console.log(`✅ Banners gerados com sucesso! Total: ${banners.length}`);

    // Criar um arquivo ZIP para download
    const zipPath = path.join(__dirname, "../../public/banners.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`📦 ZIP criado: ${archive.pointer()} bytes`);
      res.status(200).json({ message: "Banners gerados!", zipUrl: `${BASE_URL}banners.zip` });
    });

    archive.on("error", (err) => {
      console.error("❌ Erro ao criar ZIP:", err);
      res.status(500).json({ error: "Erro ao criar o ZIP dos banners" });
    });

    archive.pipe(output);

    // Adicionar arquivos ao ZIP
    feedBanners.forEach(fileName => archive.file(`./public/BannersFeed/${fileName}`, { name: `BannersFeed/${fileName}` }));
    storyBanners.forEach(fileName => archive.file(`./public/BannersStory/${fileName}`, { name: `BannersStory/${fileName}` }));

    archive.finalize();
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

    const feedPath = await generateBanner({ nome, dia, horario, bairro, endereco, lideres, telefone }, "feed", feedTemplate);
    const storyPath = await generateBanner({ nome, dia, horario, bairro, endereco, lideres, telefone }, "story", storyTemplate);
    
    console.log("✅ Banner individual gerado com sucesso!");

    res.status(200).json({
      message: "Banners gerados!",
      banners: [
        `${BASE_URL}BannersFeed/${feedPath}`,
        `${BASE_URL}BannersStory/${storyPath}`
      ],
    });

  } catch (error) {
    console.error("❌ Erro ao gerar banner:", error);
    res.status(500).json({ error: "Erro ao gerar o banner" });
  }
};