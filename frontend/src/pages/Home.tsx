import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <img src="logo.png" alt="Logo" className="logo" />
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <h1>Gerador de Banners</h1>
      <div className="cards">
        <div className="card" onClick={() => navigate("/banner-form")}>
          <h2>📌 Criar Banner Único</h2>
          <p>Preencha os dados manualmente e gere um banner.</p>
        </div>
        <div className="card" onClick={() => navigate("/upload-tsv")}>
          <h2>📁 Criar Vários Banners</h2>
          <p>Envie um arquivo TSV e gere múltiplos banners.</p>
        </div>
      </div>
    </div>
  );
}