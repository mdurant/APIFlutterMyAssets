import path from 'path';
import multer from 'multer';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'properties');
const USERS_AVATAR_DIR = path.join(process.cwd(), 'uploads', 'users');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_AVATAR_DIR)) {
  fs.mkdirSync(USERS_AVATAR_DIR, { recursive: true });
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

// ---------------------------------------------------------------------------
// Avatar de usuario (pantalla Cuenta)
// ---------------------------------------------------------------------------

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, USERS_AVATAR_DIR);
  },
  filename: (req: any, file: any, cb: (e: null, name: string) => void) => {
    const userId = req.user?.userId ?? 'anon';
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

export const uploadUserAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpeg, png, gif, webp)'));
  },
}).single('file');

export function userAvatarUrl(filename: string): string {
  return `/uploads/users/${filename}`;
}
