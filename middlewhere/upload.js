// middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Use /tmp for Lambda writeable storage
const UPLOAD_DIR = "/tmp/uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    "image/heif",
    "image/heic",
    "image/avif",

    // Videos
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo", 
    "video/x-ms-wmv",
    "video/mpeg",
    "video/webm",
    "video/3gpp",
    "video/3gpp2",
    "video/ogg",
    "video/ts",

    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
    "audio/aac",
    "audio/webm",
    "audio/flac",
    "audio/x-wav",
    "audio/3gpp",
    "audio/3gpp2",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// Create the multer instance
const upload = multer({ storage, fileFilter });

export default upload;
