// Fix per il supporto ESM del progetto
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni l'equivalente di __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8000;

// Abilita CORS per tutte le richieste
app.use(cors({
  origin: true, // Accetta tutte le origini
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Log delle richieste in ingresso
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Gestisci JSON e URL encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve i file statici dalla cartella backend
app.use('/', express.static(path.join(__dirname, 'backend')));

// Avvia il server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Backend API available at http://localhost:${PORT}`);
});
