import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../service/api";
import { toast } from "react-toastify";
import BannerPreview from "../components/BannerLayout/BannerPreview";

export default function BannerForm() {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    dia: "",
    horario: "",
    bairro: "",
    endereco: "",
    lideres: "",
    telefone: "",
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const getTemplateFileName = (dia: string, format: "feed" | "story") => {
      const fileNames: { [key: string]: string } = {
        "Segunda-feira": "template_gc_segunda",
        "Terça-feira": "template_gc_terca",
        "Quinta-feira": "template_gc_quinta",
        "Sexta-feira": "template_gc_sexta",
        "Sábado": "template_gc_sabado",
      };

      return fileNames[dia] ? `/templates/${fileNames[dia]}_${format}.jpg` : null;
    };

    const feedTemplate = getTemplateFileName(formData.dia, "feed");
    const storyTemplate = getTemplateFileName(formData.dia, "story");

    if (!feedTemplate || !storyTemplate) {
      toast.error("Template do dia não encontrado!");
      return;
    }

    try {
      const response = await api.post("/generate-single", {
        ...formData, feedTemplate, storyTemplate,
      });

      if (response.status === 200) {
        toast.success("Banners gerados e baixados com sucesso!");

        response.data.banners.forEach(async (fileUrl: string) => {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = blobUrl;
          link.setAttribute("download", fileUrl.split("/").pop() || "banner.png");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          window.URL.revokeObjectURL(blobUrl);
        });

        setTimeout(() => navigate("/"), 1000);

      } else {
        toast.error("Erro ao gerar banners.");
      }
    } catch (error) {
      toast.error("Erro ao gerar banners.");
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

      <div className="form-container">
        <h1>Gerar Banner Único</h1>
        <form className="form" onSubmit={handleSubmit}>
          <input name="nome" placeholder="Nome do GC" onChange={handleChange} required />
          <select name="dia" onChange={handleChange} required>
            <option value="">Selecione o Dia</option>
            <option value="Segunda-feira">Segunda-feira</option>
            <option value="Terça-feira">Terça-feira</option>
            <option value="Quinta-feira">Quinta-feira</option>
            <option value="Sexta-feira">Sexta-feira</option>
            <option value="Sábado">Sábado</option>
          </select>
          <input name="horario" placeholder="Horário" onChange={handleChange} required />
          <input name="bairro" placeholder="Bairro" onChange={handleChange} required />
          <input name="endereco" placeholder="Endereço" onChange={handleChange} required />
          <input name="lideres" placeholder="Líderes" onChange={handleChange} required />
          <input name="telefone" placeholder="Telefone" onChange={handleChange} required />

          <div className="buttons">
            <button type="button" className="back-button" onClick={() => navigate("/")}>
              ← Voltar
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Carregando..." : "Gerar Banner"}
            </button>
          </div>
        </form>
      </div>

      {/* Pré-visualização */}
      <BannerPreview formData={formData} />
    </div>
  );
}