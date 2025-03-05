import { Request, Response } from 'express';
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

    const bannerUrls = banners.map(fileName => `${BASE_URL}${fileName}`);

    console.log(`✅ Banners gerados com sucesso! Total: ${banners.length}`);
    
    res.status(200).json({
      message: "Banners gerados!",
      banners: bannerUrls,
    });

  } catch (error) {
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
      banners: [`${BASE_URL}${feedPath}`, `${BASE_URL}${storyPath}`],
    });

  } catch (error) {
    console.error("❌ Erro ao gerar banner:", error);
    res.status(500).json({ error: "Erro ao gerar o banner" });
  }
};