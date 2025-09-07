// middleware/upload.js
import multer from "multer";
import path from "path";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store files in /uploads
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
  "video/x-msvideo", // AVI
  "video/x-ms-wmv",  // WMV
  "video/mpeg",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
  "video/ogg",
  "video/ts",

  // Audio
  "audio/mpeg",       // MP3
  "audio/wav",        // WAV
  "audio/ogg",        // OGG
  "audio/mp4",        // AAC in MP4
  "audio/aac",        // AAC
  "audio/webm",       // WebM audio
  "audio/flac",       // FLAC
  "audio/x-wav",      // WAV alternative
  "audio/3gpp",       // 3GPP audio
  "audio/3gpp2",      // 3GPP2 audio
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
