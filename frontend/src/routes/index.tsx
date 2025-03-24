import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import BannerForm from "../pages/BannerForm";
import UploadCSV from "../pages/UploadCSV";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/banner-form" element={<BannerForm />} />
        <Route path="/upload-tsv" element={<UploadCSV />} />
        
      </Routes>
    </Router>
  );
}