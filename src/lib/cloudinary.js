// src/lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import dotenv from 'dotenv'

dotenv.config()

// Configura o Cloudinary com as chaves do .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configura o Multer para salvar temporariamente na pasta 'uploads'
const upload = multer({ dest: 'uploads/' })

export { cloudinary, upload }