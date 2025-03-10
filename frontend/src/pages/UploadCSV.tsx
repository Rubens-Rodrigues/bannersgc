import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import api from "../service/api";
import { toast } from "react-toastify";
import BannerPreview from "../components/BannerLayout/BannerPreview";

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Manipula a seleção do arquivo e gera a pré-visualização
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);

      // Processa o arquivo CSV para gerar a pré-visualização
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length > 0) {
            // Formata os dados corretamente
            const formattedData = result.data.map((row: any) => ({
              nome: row["Nome"] || row["nome"] || "Sem Nome",
              dia: row["Dia"] || row["dia"] || "",
              horario: row["Horário"] || row["horario"] || "",
              bairro: row["Bairro"] || row["bairro"] || "",
              endereco: row["Endereço"] || row["endereco"] || "",
              lideres: row["Líderes"] || row["lideres"] || "",
              telefone: row["Telefone"] || row["telefone"] || "",
            }));

            setPreviewData(formattedData);
          } else {
            toast.error("O arquivo CSV está vazio ou inválido.");
          }
        },
      });
    }
  };

  // Faz o upload e gera os banners
  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV.");
      return;
    }
  
    setLoading(true);
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await api.post("/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      if (response.status === 200) {
        toast.success("Banners gerados e baixados com sucesso!");
  
        // Obtém a URL do arquivo ZIP
        const zipUrl = response.data.zipUrl;
  
        // Faz o download automático do arquivo ZIP
        const responseZip = await fetch(zipUrl);
        const blob = await responseZip.blob();
        const blobUrl = window.URL.createObjectURL(blob);
  
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", "banners.zip"); // Nome do arquivo ZIP
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  
        window.URL.revokeObjectURL(blobUrl);
  
        setTimeout(() => navigate("/"), 1000);
      } else {
        toast.error("Erro ao gerar banners.");
      }
    } catch (error) {
      toast.error("Erro ao enviar o arquivo.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">Carregando...</div>
        </div>
      )}

      <img src="logo.png" alt="Logo" className="logo" />
      <br /><br /><br /><br /><br />
      <h1>Upload de CSV</h1>
      <input type="file" accept=".csv" onChange={handleFileChange} />

      <div className="buttons">
        <button type="button" className="back-button" onClick={() => navigate("/")}>
          ← Voltar
        </button>
        <button onClick={handleUpload} className="submit-button" disabled={loading}>
          {loading ? "Carregando..." : "Gerar Banner"}
        </button>
      </div>

      {previewData.length > 0 && (
        <div>
          <h2>Pré-visualização</h2>
          <div style={{ flexDirection: 'column' }} className="preview-container">
            {previewData.map((gc, index) => (
              <div key={index} className="preview-item">
                <BannerPreview formData={gc} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}