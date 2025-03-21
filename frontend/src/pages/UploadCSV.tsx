import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import api from "../service/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import BannerPreview from "../components/BannerLayout/BannerPreview";

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusQueue, setStatusQueue] = useState<string[]>([]); // Fila de mensagens pendentes
  const [currentMessage, setCurrentMessage] = useState<string | null>(null); // Exibir uma mensagem por vez
  const [processFinished, setProcessFinished] = useState(false); // Indica se o processo foi concluído
  const [messageLog, setMessageLog] = useState<string[]>([]); const navigate = useNavigate();

  // Conecta ao WebSocket ao montar o componente
  useEffect(() => {
    // const socket = io("http://localhost:4000");
    const socket = io("https://api-bannersgc.onrender.com/api/banners");

    socket.on("banner_status", (data) => {
      const message = `${data.status === "IGNORADO" ? "⚠️" : "✅"} ${data.nome} - ${data.status} ${data.motivo ? `(${data.motivo})` : ""}`;
      setStatusQueue((prevQueue) => [...prevQueue, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Controla a exibição das mensagens uma por uma
  useEffect(() => {
    if (!currentMessage && statusQueue.length > 0) {
      const nextMessage = statusQueue[0];
      setCurrentMessage(nextMessage);
      setMessageLog((prev) => [...prev, nextMessage]);
      setStatusQueue((prevQueue) => prevQueue.slice(1));

      setTimeout(() => {
        setCurrentMessage(null);
      }, 700); 
    }

    // Se não houver mais mensagens na fila e já processamos todas, mostramos o botão "OK"
    if (statusQueue.length === 0 && processFinished) {
      setTimeout(() => {
        setCurrentMessage("✅ Processamento concluído!");
      }, 2000);
    }
  }, [currentMessage, statusQueue, processFinished]);

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
    setProcessFinished(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        toast.success("Banners gerados!");

        const zipUrl = response.data.zipUrl;

        const responseZip = await fetch(zipUrl);
        const blob = await responseZip.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", "banners.zip");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);

        setTimeout(() => setProcessFinished(true), 1000); // depois de 1s, exibe o botão OK
      } else {
        toast.error("Erro ao gerar banners.");
      }
    } catch (error) {
      toast.error("Erro ao enviar o arquivo.");
      setProcessFinished(true);
    }
  };

  return (
    <div className="container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">
            <h3>Gerando banners...</h3>
            <div className="status-log">
              {messageLog.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>

            {processFinished && (
              <button
                onClick={() => {
                  setLoading(false);
                  navigate("/");
                }}
                className="ok-button"
              >
                FINALIZAR
              </button>
            )}
          </div>
        </div>
      )}

      {processFinished && (
        <div className="overlay">
          <p>✅ Todos os banners foram processados!</p>
          <button onClick={() => navigate("/")}>OK</button>
        </div>
      )}

      <img src="logo.png" alt="Logo" className="logo" />
      <br /><br /><br /><br /><br />
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