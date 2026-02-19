import path from 'path';
import multer from 'multer';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'properties');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const id = (req.params as { id?: string }).id ?? 'unknown';
    const ext = path.extname(file.originalname || '') || '.jpg';
    const name = `${id}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

export const uploadPropertyImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpeg, png, gif, webp)'));
  },
}).single('file');

/** Ruta relativa para guardar en BD: /uploads/properties/filename */
export function propertyImageUrl(filename: string): string {
  return `/uploads/properties/${filename}`;
}
