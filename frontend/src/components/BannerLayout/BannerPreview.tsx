import React, { useEffect, useState } from "react";
import "./Banner.css";

interface BannerPreviewProps {
  formData: {
    nome: string;
    dia: string;
    horario: string;
    bairro: string;
    endereco: string;
    lideres: string;
    telefone: string;
  };
}

// Função para obter o caminho correto da imagem
export const getTemplateFileName = (dia: string, format: "feed" | "story") => {
  if (!dia) return null;

  const fileNames: { [key: string]: string } = {
    "Segunda-feira": "gcsegunda",
    "Terça-feira": "gcterca",
    "Quinta-feira": "gcquinta",
    "Sexta-feira": "gcsexta",
    "Sábado": "gcsabado",
  };

  return fileNames[dia] ? process.env.PUBLIC_URL + `/templates/${fileNames[dia]}${format === "story" ? "story" : "feed"}.png` : null;
};

export default function BannerPreview({ formData }: BannerPreviewProps) {
  const [feedBanner, setFeedBanner] = useState<string | null>(null);
  const [storyBanner, setStoryBanner] = useState<string | null>(null);

  useEffect(() => {
    if (formData.dia) {
      setFeedBanner(getTemplateFileName(formData.dia, "feed"));
      setStoryBanner(getTemplateFileName(formData.dia, "story"));
    } else {
      setFeedBanner(null);
      setStoryBanner(null);
    }
  }, [formData.dia]);

  // Obtém o primeiro nome do dia e converte para caixa alta
  const formatarDia = (dia: string) => {
    return dia ? dia.split("-")[0].split(" ")[0].toUpperCase() : "";
  };

  return (
    <div className="preview-container">

      {/* Pré-visualização do Banner Feed */}
      <div className="banner-preview">
        {feedBanner && (
          <>
            <img src={feedBanner} alt={`Feed ${formData.dia}`} className="banner-image" />
            <div className="overlay-text">
              <h2 className="gc-title">{formData.nome}</h2>
              <p className="gc-info hora">{formatarDia(formData.dia)} {formData.horario}</p>
              <p className="gc-info bairro">{formData.bairro}</p>
              <p className="gc-info endereco"><strong>Local: </strong>{formData.endereco}</p>
              <p className="gc-info lideres">{formData.lideres} - <strong>{formData.telefone}</strong></p>
            </div>
          </>
        )}
      </div>

      {/* Pré-visualização do Banner Story */}
      <div className="banner-preview story">
        {storyBanner && (
          <>
            <img src={storyBanner} alt={`Story ${formData.dia}`} className="banner-image" />
            <div className="overlay-text">
              <h2 className="gc-title">{formData.nome}</h2>
              <p className="gc-info hora">{formatarDia(formData.dia)} {formData.horario}</p>
              <p className="gc-info bairro">{formData.bairro}</p>
              <p className="gc-info endereco"><strong>Local: </strong>{formData.endereco}</p>
              <p className="gc-info lideres">{formData.lideres} - <strong>{formData.telefone}</strong></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}