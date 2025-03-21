import { Request, Response } from 'express';
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { processCSV, generateBanner } from '../services/banner.service';

// const BASE_URL = "http://localhost:4000/public/";
const BASE_URL = "https://api-bannersgc.onrender.com/public/";

// Gera múltiplos banners a partir de um arquivo TSV
export const generateBannersFromCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Arquivo TSV não foi enviado" });
      return;
    }

    const io = req.app.get("socketio"); // Obtém a instância do WebSocket

    const banners = await processCSV(req.file.path, io);

    const feedBanners = banners.filter(fileName => fileName.includes("-feed"));
    const storyBanners = banners.filter(fileName => fileName.includes("-story"));

    console.log(`Banners gerados com sucesso! Total: ${banners.length}`);

    // Criar um arquivo ZIP para download
    const zipPath = path.join(__dirname, "../../public/banners.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`ZIP criado com sucesso! Tamanho final: ${archive.pointer()} bytes`);
      res.status(200).json({ message: "Banners gerados!", zipUrl: `${BASE_URL}banners.zip` });
    });

    archive.on("error", (err) => {
      console.error("Erro ao criar ZIP:", err);
      res.status(500).json({ error: "Erro ao criar o ZIP dos banners" });
    });

    archive.pipe(output);

    // Diretório principal onde estão todas as pastas dos supervisores
    const publicDir = path.join(__dirname, "../../public");

    // Ler todas as pastas dos supervisores dentro de `public/`
    fs.readdir(publicDir, async (err, folders) => {
      if (err) {
        console.error("Erro ao listar as pastas dos supervisores:", err);
        return res.status(500).json({ error: "Erro ao acessar as pastas dos banners" });
      }

      const supervisorFolders = folders.filter(folder => folder.startsWith("Banners-")); // Filtra apenas pastas de supervisores

      // Lista todas as promessas de adição de arquivos ao ZIP
      const addToZipPromises: Promise<void>[] = [];

      for (const supervisorFolder of supervisorFolders) {
        const supervisorPath = path.join(publicDir, supervisorFolder);

        for (const subfolder of ["Feed", "Story"]) {
          const subfolderPath = path.join(supervisorPath, subfolder);

          if (fs.existsSync(subfolderPath)) {
            const files = fs.readdirSync(subfolderPath);

            files.forEach(file => {
              const filePath = path.join(subfolderPath, file);
              addToZipPromises.push(new Promise<void>((resolve) => {
                archive.file(filePath, { name: `${supervisorFolder}/${subfolder}/${file}` });
                resolve();
              }));
            });
          }
        }
      }

      // Aguarda todos os arquivos serem adicionados antes de finalizar o ZIP
      await Promise.all(addToZipPromises);
      archive.finalize(); // Finaliza apenas quando todos os arquivos foram adicionados
    });
  } catch (error) {
    console.error("Erro ao gerar os banners:", error);
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