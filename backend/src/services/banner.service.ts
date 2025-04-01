import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { Server } from 'socket.io';
import { createCanvas, loadImage } from "canvas";

/* Processa um arquivo TSV e gera múltiplos banners */
export const processCSV = async (filePath: string, io: Server): Promise<string[]> => {
  const banners: string[] = [];
  const batchSize = 20;

  return new Promise<string[]>((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(filePath, { highWaterMark: 1024 * 64 })
      .pipe(csvParser({ separator: "\t" }))
      .on("data", (data) => {
        const gc = {
          nome: (data["Nome"] || "").trim(),
          dia: (data["Dia"] || "").trim(),
          horario: (data["Horário"] || "").trim(),
          bairro: (data["Bairro"] || "").trim(),
          endereco: (data["Endereço"] || "").trim(),
          lideres: (data["Líderes"] || "").trim(),
          telefone: (data["Telefone"] || "").trim(),
          supervisor: (data["Supervisor"] || "Sem Supervisor").trim(),
        };

        if (!gc.nome || !gc.dia || !gc.horario || !gc.bairro || !gc.endereco || !gc.lideres || !gc.telefone) {
          const msg = `⚠️ Banner ignorado: ${gc.nome} - Dados incompletos`;
          console.warn(msg);
          io.emit("banner_status", { nome: gc.nome, status: "IGNORADO", motivo: "Dados incompletos", log: msg });
          return;
        }

        results.push(gc);
      })
      .on("end", async () => {
        try {
          for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            const bannerPromises = batch.map(async (gc) => {
              const feedTemplate = getTemplateFileName(gc.dia, "feed");
              const storyTemplate = getTemplateFileName(gc.dia, "story");

              if (!feedTemplate || !storyTemplate) {
                const msg = `⚠️ Template não encontrado para ${gc.dia}, pulando...`;
                console.warn(msg);
                io.emit("banner_status", { nome: gc.nome, status: "IGNORADO", motivo: "Template não encontrado", log: msg });
                return [];
              }

              const feedPath = await generateBanner(gc, "feed", feedTemplate);
              const storyPath = await generateBanner(gc, "story", storyTemplate);

              const msg = `✅ Banner gerado: ${gc.nome}`;
              console.log(msg);
              io.emit("banner_status", { nome: gc.nome, status: "GERADO", log: msg });

              return [feedPath, storyPath];
            });

            const batchResults = await Promise.all(bannerPromises);
            banners.push(...batchResults.flat());
          }

          fs.unlinkSync(filePath); 
          resolve(banners);
        } catch (error) {
          console.error("Erro ao gerar banners:", error);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("❌ Erro ao ler o TSV:", error);
        reject(error);
      });
  });
};

/* Função que retorna o caminho do template baseado no dia */
const getTemplateFileName = (dia: string, format: "feed" | "story"): string | null => {
  const fileNames: { [key: string]: string } = {
    "Segunda-feira": "gcsegunda",
    "Terça-feira": "gcterca",
    "Quarta-feira": "gcquarta",
    "Quinta-feira": "gcquinta",
    "Sexta-feira": "gcsexta",
    "Sábado": "gcsabado",
  };

  return fileNames[dia] ? `/templates/${fileNames[dia]}${format === "story" ? "story" : "feed"}.png` : null;
};

const textPositions = {
  feed: {
    title: { x: 540, y: 720, size: 60, color: "#fff", align: "center" },
    dia: { x: 480, y: 856, size: 40, color: "#000", align: "left" },
    hora: { x: 655, y: 856, size: 40, color: "#000", align: "left" },
    bairro: { x: 540, y: 920, size: 25, color: "#000", align: "center" },
    endereco: { x: 540, y: 980, size: 25, color: "#000", align: "center" },
    lideres: { x: 540, y: 1010, size: 25, color: "#000", align: "center" },
  },
  story: {
    title: { x: 540, y: 1095, size: 60, color: "#fff", align: "center" },
    dia: { x: 465, y: 1460, size: 48, color: "#000", align: "left" },
    hora: { x: 655, y: 1460, size: 48, color: "#000", align: "left" },
    bairro: { x: 540, y: 1540, size: 35, color: "#000", align: "center" },
    endereco: { x: 540, y: 1590, size: 35, color: "#000", align: "center" },
    lideres: { x: 540, y: 1635, size: 35, color: "#000", align: "center" },
  },
};

//  Garante que a pasta public exista antes de salvar os banners
const publicDir = path.join(__dirname, "../../public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Função para quebrar o texto do endereço em várias linhas
const wrapText = (ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  lines.forEach((line, index) => {
    ctx.fillText(line.trim(), x, y + index * lineHeight);
  });

  return lines.length * lineHeight;
};

const loadImageWithRetry = async (url: string, retries = 5, delay = 1000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const image = await loadImage(url);
      return image;
    } catch (error) {
      console.warn(`Erro ao carregar imagem (${url}), tentativa ${i + 1}/${retries}`);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error(`Falha ao carregar a imagem após ${retries} tentativas: ${url}`);
};


// Gera um banner com base nos dados enviados
export const generateBanner = async (gc: any, format: "feed" | "story", templatePath: string): Promise<string> => {
  // const templateURL = `http://localhost:3000${templatePath}`;
  const templateURL = `https://bannersgc.vercel.app${templatePath}`;

  //Verifica se é um banner individual (não tem supervisor)
  const isIndividual = !gc.supervisor;

  let outputDir;

  if (isIndividual) {
    //Banners individuais serão salvos diretamente na pasta `public/`
    outputDir = path.join(__dirname, "../../public");
  } else {
    //Banners normais serão organizados por supervisor
    const supervisorName = gc.supervisor.replace(/\s+/g, "-");
    const supervisorDir = path.join(__dirname, `../../public/${supervisorName}`);

    // Cria subpastas Feed e Story
    const feedDir = path.join(supervisorDir, "Feed");
    const storyDir = path.join(supervisorDir, "Story");

    if (!fs.existsSync(supervisorDir)) fs.mkdirSync(supervisorDir, { recursive: true });
    if (!fs.existsSync(feedDir)) fs.mkdirSync(feedDir, { recursive: true });
    if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });

    outputDir = format === "feed" ? feedDir : storyDir;
  }

  // Define o nome do arquivo do banner
  const fileName = `${gc.nome.replace(/\s+/g, "_")}-${format}.png`;
  const outputPath = path.join(outputDir, fileName);

  try {
    const image = await loadImageWithRetry(templateURL);

    const width = format === "feed" ? 1080 : 1080;
    const height = format === "feed" ? 1080 : 1920;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as any;

    ctx.drawImage(image, 0, 0, width, height);

    // Define posições do texto
    const positions = textPositions[format];
    ctx.textAlign = "center";

    const tituloCor = gc.dia === "Segunda-feira" ? "#fff" : "#000";
    ctx.font = `bold ${positions.title.size}px Arial`;
    ctx.fillStyle = tituloCor;
    ctx.fillText(gc.nome.toUpperCase(), positions.title.x, positions.title.y);

    const diaFormatado = gc.dia.split("-")[0].split(" ")[0].toUpperCase() + ",";
    ctx.font = `bold ${positions.dia.size}px Arial`;
    ctx.fillStyle = positions.dia.color;
    ctx.fillText(diaFormatado, positions.dia.x, positions.dia.y);

    ctx.font = `bold ${positions.hora.size}px Arial`;
    ctx.fillStyle = positions.hora.color;
    ctx.fillText(gc.horario, positions.hora.x, positions.hora.y);

    ctx.font = `bold ${positions.bairro.size}px Arial`;
    ctx.fillStyle = positions.bairro.color;
    ctx.fillText(gc.bairro, positions.bairro.x, positions.bairro.y);

    ctx.font = `bold ${positions.endereco.size}px Arial`;
    ctx.fillStyle = positions.endereco.color;
    const textoLocal = "Local: " + gc.endereco;
    const enderecoHeight = wrapText(ctx, textoLocal, positions.endereco.x, positions.endereco.y, 800, 36);

    ctx.font = `bold ${positions.lideres.size}px Arial`;
    ctx.fillStyle = positions.lideres.color;
    ctx.fillText(`${gc.lideres} - ${gc.telefone}`, positions.lideres.x, positions.endereco.y + enderecoHeight + 10);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);

    console.log(`Banner gerado: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error(`Erro ao gerar banner para ${gc.nome}:`, error);
    throw error;
  }
};