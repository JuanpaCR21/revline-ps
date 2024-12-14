const express = require('express');
const firebaseAdmin = require('firebase-admin');
const path = require('path');
const cors = require('cors');

// Inicializa Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  storageBucket: 'gs://revline-photo-studio.firebasestorage.app'  // Cambia el nombre del bucket
});

const app = express();
const port = 3000;

// Configura CORS para permitir el acceso desde el navegador
app.use(cors());

// Serve static files (como imágenes) desde un directorio público
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para obtener imágenes desde Firebase Storage
app.get('/get-images', async (req, res) => {
  try {
    const bucket = firebaseAdmin.storage().bucket();

    // Obtener archivos del bucket
    const [files] = await bucket.getFiles({ prefix: 'photos/' });
    console.log("Archivos encontrados:", files.map(file => file.name)); // <- Depuración

    // Filtrar solo los archivos que sean imágenes válidas (excluir directorios y otros archivos no deseados)
    const imageFiles = files.filter(file => file.name !== 'photos/' && /\.(png|jpg|jpeg|gif)$/i.test(file.name));

    // Generar URLs firmadas para las imágenes válidas
    const imageUrls = await Promise.all(imageFiles.map(async file => {
      try {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        return url;
      } catch (error) {
        console.error(`Error generando URL para el archivo ${file.name}:`, error);
        return null; // Manejar errores de cada archivo de forma opcional
      }
    }));

    // Filtrar URLs válidas antes de enviar la respuesta
    res.json(imageUrls.filter(url => url !== null));
  } catch (error) {
    console.error("Error obteniendo imágenes:", error);
    res.status(500).json({ error: "Error obteniendo imágenes desde Firebase Storage" });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
