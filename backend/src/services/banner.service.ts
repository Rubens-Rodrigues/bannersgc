import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { createCanvas, loadImage } from "canvas";
import fetch from 'node-fetch';

/* Processa um arquivo CSV e gera múltiplos banners */
export const processCSV = async (filePath: string): Promise<string[]> => {
  const banners: string[] = [];

  return new Promise<string[]>((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(filePath)
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
          for (const gc of results) {
            // Gerar os caminhos dos templates a partir do dia
            const feedTemplate = getTemplateFileName(gc.dia, "feed");
            const storyTemplate = getTemplateFileName(gc.dia, "story");

            if (!feedTemplate || !storyTemplate) {
              throw new Error(`Template não encontrado para ${gc.dia}`);
            }

            const feedPath = await generateBanner(gc, "feed", feedTemplate);
            const storyPath = await generateBanner(gc, "story", storyTemplate);
            banners.push(feedPath, storyPath);
          }
          // Excluir o arquivo CSV após processá-lo
          fs.unlinkSync(filePath);
          resolve(banners);
        } catch (error) {
          console.error("Erro ao gerar banners:", error);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("Erro ao ler o CSV:", error);
        reject(error);
      });
  });
};

/* Função que retorna o caminho do template baseado no dia */
const getTemplateFileName = (dia: string, format: "feed" | "story"): string | null => {
  const fileNames: { [key: string]: string } = {
    "Segunda-feira": "template_gc_segunda",
    "Terça-feira": "template_gc_terca",
    "Quinta-feira": "template_gc_quinta",
    "Sexta-feira": "template_gc_sexta",
    "Sábado": "template_gc_sabado",
  };

  return fileNames[dia] ? `/templates/${fileNames[dia]}_${format}.jpg` : null;
};

const textPositions = {
  feed: {
    title: { x: 540, y: 720, size: 60, color: "#fff", align: "center" }, 
    hora: { x: 625, y: 856, size: 40, color: "#000", align: "left" }, 
    bairro: { x: 540, y: 940, size: 25, color: "#000", align: "center" },
    endereco: { x: 540, y: 980, size: 25, color: "#000", align: "center" },
    lideres: { x: 540, y: 1010, size: 25, color: "#000", align: "center" },
  },
  story: {
    title: { x: 540, y: 1095, size: 60, color: "#fff", align: "center" }, 
    hora: { x: 627, y: 1460, size: 48, color: "#000", align: "left" }, 
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

// Gera um banner com base nos dados enviados
export const generateBanner = async (gc: any, format: "feed" | "story", templatePath: string): Promise<string> => {
  // const templateURL = `http://localhost:3000${templatePath}`;
  const templateURL = `https://bannersgc.vercel.app/${templatePath}`;
  const outputFileName = `${gc.nome.replace(/\s+/g, "_")}-${format}.png`;
  // const outputPath = path.join(__dirname, "../../public", outputFileName);
  const outputPath = path.resolve("./public", outputFileName);
  const tempImagePath = path.resolve("./public", "template_temp.jpg"); // Caminho temporário para salvar o template


  try {
     // ✅ 1. Baixa a imagem primeiro e salva localmente
     const response = await fetch(templateURL);
     if (!response.ok) throw new Error(`Erro ao buscar imagem: ${response.statusText}`);
     
    console.log("🔹 Tentando carregar imagem do template:", templateURL);

    const buffer = await response.buffer();
    fs.writeFileSync(tempImagePath, buffer); // Salva temporariamente a imagem

    // const image = await loadImage(templateURL);
    const image = await loadImage(tempImagePath);

    const width = format === "feed" ? 1080 : 1080;
    const height = format === "feed" ? 1080 : 1920;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Renderiza o template como fundo
    ctx.drawImage(image, 0, 0, width, height);

    //Define as coordenadas e fontes
    const positions = textPositions[format];
    ctx.textAlign = "center";

    ctx.font = `bold ${positions.title.size}px Arial`;
    ctx.fillStyle = positions.title.color;
    ctx.fillText(gc.nome, positions.title.x, positions.title.y);

    ctx.font = `bold ${positions.hora.size}px Arial`;
    ctx.fillStyle = positions.hora.color;
    ctx.fillText(gc.horario, positions.hora.x, positions.hora.y);

    ctx.font = `bold ${positions.bairro.size}px Arial`;
    ctx.fillStyle = positions.bairro.color;
    ctx.fillText(gc.bairro, positions.bairro.x, positions.bairro.y);

    ctx.font = `${positions.endereco.size}px Arial`;
    ctx.fillStyle = positions.endereco.color;
    const textoLocal = "Local: " + gc.endereco;
    ctx.fillText(textoLocal, positions.endereco.x, positions.endereco.y);

    ctx.font = `${positions.lideres.size}px Arial`;
    ctx.fillStyle = positions.lideres.color;
    ctx.fillText(`${gc.lideres} - ${gc.telefone}`, positions.lideres.x, positions.lideres.y);

      // Salva a imagem gerada
      const outputBuffer = canvas.toBuffer("image/png");
      fs.writeFileSync(outputPath, outputBuffer);
  
      // ✅ 3. Apaga o template temporário depois do uso
      fs.unlinkSync(tempImagePath);
  
    console.log(`✅ Banner salvo com sucesso: ${outputPath}`);
    return outputFileName;
  } catch (error) {
    console.error("❌ Erro ao gerar banner:", error);
    throw error;
  }
};