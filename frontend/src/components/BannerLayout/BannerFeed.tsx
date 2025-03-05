import React from "react";
import { getTemplateFileName } from "./BannerPreview"; // Importando a função
import "./Banner.css";

interface BannerProps {
  nome: string;
  dia: string;
  horario: string;
  bairro: string;
  endereco: string;
  lideres: string;
  telefone: string;
}

const BannerFeed: React.FC<{ data: BannerProps }> = ({ data }) => {
  const bannerImage = getTemplateFileName(data.dia, "feed") || "/templates/placeholder.jpg"; // Usa placeholder se for null

  return (
    <div className="banner-wrapper">
      {bannerImage && (
        <img
          src={bannerImage}
          alt={`Banner ${data.dia}`}
          className="banner-image"
          onError={(e) => {
            console.error(`Erro ao carregar imagem: ${bannerImage}`);
            e.currentTarget.src = "/templates/placeholder.jpg";
          }}
        />
      )}

      <div className="overlay-text feed">
        <h2 className="gc-title">{data.nome}</h2>
        <p className="gc-info hora">{data.horario}</p>
        <p className="gc-info bairro">{data.bairro}</p>
        <p className="gc-info endereco"><strong>Local: </strong>{data.endereco}</p>
        <p className="gc-info lideres">{data.lideres} - {data.telefone}</p>
      </div>
    </div>
  );
};

export default BannerFeed;