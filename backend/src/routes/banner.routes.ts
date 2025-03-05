import { Router } from 'express';
import multer from 'multer';
import { generateBannersFromCSV, generateSingleBanner } from '../controllers/banner.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Rota para gerar múltiplos banners via CSV
router.post('/generate', upload.single('file'), generateBannersFromCSV);

// Rota para gerar um único banner manualmente
router.post('/generate-single', generateSingleBanner);

export default router;