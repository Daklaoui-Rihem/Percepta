const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Allowed file types ─────────────────────────────────────────
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];
const ALLOWED_VIDEO = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm'];

// ── Storage engine ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Structure: uploads/userId/audio/ or uploads/userId/video/
        const fileType = ALLOWED_AUDIO.includes(file.mimetype) ? 'audio' : 'video';
        const uploadPath = path.join(__dirname, '..', 'uploads', req.user.id, fileType);

        // Create folder if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // uuid + original extension → "a1b2c3d4.mp3"
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

// ── File filter ────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
    const allowed = [...ALLOWED_AUDIO, ...ALLOWED_VIDEO];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);  // accept
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false); // reject
    }
};


// ── Export upload instances ────────────────────────────────────
const uploadAudio = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
}).single('file'); // 'file' = field name in the form

const uploadVideo = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).single('file');

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
    },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid image type'), false);
        }
    }
}).single('avatar');

const uploadGroupActivity = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).single('file');

module.exports = { uploadAudio, uploadVideo, uploadAvatar, uploadGroupActivity };