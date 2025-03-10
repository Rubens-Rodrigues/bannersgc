import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { createCanvas, loadImage } from "canvas";

/* Processa um arquivo CSV e gera múltiplos banners */
export const processCSV = async (filePath: string): Promise<string[]> => {
  const banners: string[] = [];

  return new Promise<string[]>((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(filePath, { highWaterMark: 1024 * 64 }) // Melhora a performance da leitura
      .pipe(csvParser())
      .on("data", (data) => {
        const gc = {
          nome: data["Nome"]?.trim() || data["nome"]?.trim() || "Sem Nome",
          dia: data["Dia"]?.trim() || data["dia"]?.trim() || "Sem Dia",
          horario: data["Horário"]?.trim() || data["horario"]?.trim() || "Sem Horário",
          bairro: data["Bairro"]?.trim() || data["bairro"]?.trim() || "Sem Bairro",
          endereco: data["Endereço"]?.trim() || data["endereco"]?.trim() || "Sem Endereço",
          lideres: data["Líderes"]?.trim() || data["lideres"]?.trim() || "Sem Líderes",
          telefone: data["Telefone"]?.trim() || data["telefone"]?.trim() || "Sem Telefone",
        };
        results.push(gc);
      })
      .on("end", async () => {
        try {
          const bannerPromises = results.map(async (gc) => {
            const feedTemplate = getTemplateFileName(gc.dia, "feed");
            const storyTemplate = getTemplateFileName(gc.dia, "story");

            if (!feedTemplate || !storyTemplate) {
              console.warn(`⚠️ Template não encontrado para ${gc.dia}, pulando...`);
              return [];
            }

            const feedPath = generateBanner(gc, "feed", feedTemplate);
            const storyPath = generateBanner(gc, "story", storyTemplate);

            return Promise.all([feedPath, storyPath]); // Gera os banners em paralelo
          });

          const generatedBanners = await Promise.all(bannerPromises);
          fs.unlinkSync(filePath); // Remove o CSV após processar
          resolve(generatedBanners.flat()); // Retorna um array plano de banners gerados
        } catch (error) {
          console.error("❌ Erro ao gerar banners:", error);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("❌ Erro ao ler o CSV:", error);
        reject(error);
      });
  });
};
/* Função que retorna o caminho do template baseado no dia */
const getTemplateFileName = (dia: string, format: "feed" | "story"): string | null => {
  const fileNames: { [key: string]: string } = {
    "Segunda-feira": "gcsegunda",
    "Terça-feira": "gcterca",
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
    bairro: { x: 540, y: 940, size: 25, color: "#000", align: "center" },
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

  return lines.length * lineHeight; // Retorna a altura ocupada pelo texto
};

// Gera um banner com base nos dados enviados
export const generateBanner = async (gc: any, format: "feed" | "story", templatePath: string): Promise<string> => {
  // const templateURL = `http://localhost:3000${templatePath}`;
  const templateURL = `https://bannersgc.vercel.app${templatePath}`;
  // Definir a pasta de saída com base no tipo de banner
  const outputDir = path.join(__dirname, `../../public/Banners${format === "feed" ? "Feed" : "Story"}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true }); // Criar a pasta se não existir
  }

  // Caminho final do arquivo dentro da pasta correspondente
  const outputFileName = `${gc.nome.replace(/\s+/g, "_")}-${format}.png`;
  const outputPath = path.join(outputDir, outputFileName);


  try {
    const image = await loadImage(templateURL);
    const width = format === "feed" ? 1080 : 1080;
    const height = format === "feed" ? 1080 : 1920;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as any;

    // Renderiza o template como fundo
    ctx.drawImage(image, 0, 0, width, height);

    //Define as coordenadas e fontes
    const positions = textPositions[format];
    ctx.textAlign = "center";

    ctx.font = `bold ${positions.title.size}px Arial`;
    ctx.fillStyle = positions.title.color;
    ctx.fillText(gc.nome, positions.title.x, positions.title.y);

    // Converte o nome do dia para caixa alta e extrai a primeira palavra
    const diaFormatado = gc.dia.split("-")[0].split(" ")[0].toUpperCase();
    ctx.font = `bold ${positions.dia.size}px Arial`;
    ctx.fillStyle = positions.dia.color;
    ctx.fillText(diaFormatado, positions.dia.x, positions.dia.y);

    ctx.font = `bold ${positions.hora.size}px Arial`;
    ctx.fillStyle = positions.hora.color;
    ctx.fillText(gc.horario, positions.hora.x, positions.hora.y);

    ctx.font = `bold ${positions.bairro.size}px Arial`;
    ctx.fillStyle = positions.bairro.color;
    ctx.fillText(gc.bairro, positions.bairro.x, positions.bairro.y);

    ctx.font = `${positions.endereco.size}px Arial`;
    ctx.fillStyle = positions.endereco.color;
    const textoLocal = "Local: " + gc.endereco;
    const enderecoHeight = wrapText(ctx, textoLocal, positions.endereco.x, positions.endereco.y, 550, 30); // Ajuste o maxWidth conforme necessário



    ctx.font = `${positions.lideres.size}px Arial`;
    ctx.fillStyle = positions.lideres.color;
    ctx.fillText(`${gc.lideres} - ${gc.telefone}`, positions.lideres.x, positions.endereco.y + enderecoHeight + 10);

    //Salva a imagem gerada
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);

    return outputFileName;
  } catch (error) {
    console.error("Erro ao gerar banner:", error);
    throw error;
  }
};