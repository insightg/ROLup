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

// Abilita CORS per le richieste dal frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'], // Includi anche la porta di preview di Vite
  credentials: true
}));

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