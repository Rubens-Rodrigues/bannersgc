import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import api from "../service/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import BannerPreview from "../components/BannerLayout/BannerPreview";

// const BASE_URL = "http://localhost:4000/public/"; 
const BASE_URL = "https://api-bannersgc.onrender.com/public/";

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [processFinished, setProcessFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // const socket = io("http://localhost:4000");
    const socket = io("https://api-bannersgc.onrender.com");

    socket.on("banner_status", (data) => {
      setMessageLog((prev) => [...prev, data.log]);

      if (data.status === "FINALIZADO") {
        downloadZip(data.zipUrl);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const downloadZip = async (zipUrl: string) => {
    try {
      const fullUrl = `${BASE_URL}${zipUrl.split("/").pop()}`;
      const response = await fetch(fullUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Erro ao baixar o ZIP");

      const blob = await response.blob();
      if (blob.size < 1024) throw new Error("ZIP corrompido ou vazio");

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "banners.zip");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Download do ZIP concluído!");
      setProcessFinished(true);  // Exibe o botão "Finalizar"

    } catch (error) {
      console.error("❌ Erro ao baixar ZIP:", error);
      toast.error("Erro ao baixar o ZIP.");
      setProcessFinished(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);

      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length > 0) {
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

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo TSV.");
      return;
    }

    setLoading(true);
    setMessageLog([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        toast.success("Banners sendo gerados...");
      } else {
        toast.error("Erro ao iniciar a geração dos banners.");
      }
    } catch (error) {
      toast.error("Erro ao enviar o arquivo.");
    }
  };

  return (
    <div className="container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">
            <h3>{processFinished ? "✅ Finalizado!" : "Gerando banners... aguarde"}</h3>

            <div className="status-log">
              {messageLog.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>

            {processFinished && (
              <button onClick={() => navigate("/")} className="ok-button">
                FINALIZAR
              </button>
            )}
          </div>
        </div>
      )}

      <img src="logo.png" alt="Logo" className="logo" />
      <h1>Upload de TSV</h1>
      <input type="file" accept=".tsv" onChange={handleFileChange} />

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
          <div style={{ flexDirection: "column" }} className="preview-container">
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