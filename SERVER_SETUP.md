# R_WUP Backend Server Setup

## Panoramica

Il backend dell'applicazione è ora configurato per essere servito su una porta specifica (8000) utilizzando un server Express. Questo permette una migliore separazione tra frontend e backend, nonché una gestione più flessibile delle richieste API.

## Configurazione

1. **Struttura delle directory**:
   
   ```
   r_wup/
   ├── backend/           # Directory backend con i file PHP
   ├── backend-server.js  # Server Express che espone i file backend
   ├── src/               # Codice sorgente frontend
   └── ...
   ```

2. **Configurazione API**:
   
   Tutti i riferimenti al backend ora puntano all'URL `http://localhost:3030` invece che a `./backend` o `../../backend`.

## Avvio dell'applicazione

### Avvio del solo server backend

```bash
npm run backend
```

Questo comando avvia il server Express sulla porta 8000 e serve i file PHP dalla directory `backend/`.

### Avvio dell'intera applicazione (frontend + backend)

#### Ambiente di sviluppo
```bash
npm run start
```

Questo comando utilizza `concurrently` per avviare sia il server di sviluppo Vite (frontend) che il server backend Express in parallelo.

#### Ambiente di produzione
```bash
npm run production
```

Questo comando fa il build dell'applicazione frontend e poi avvia sia il server preview di Vite (sulla porta 3000) che il server backend sulla porta 8000.

## Dettagli tecnici

### Server backend (backend-server.js)

- Utilizza Express per servire i file PHP
- Implementa CORS per consentire richieste dal frontend
- Configurato per gestire JSON e dati form con dimensioni fino a 50MB
- Serve tutti i file statici dalla directory `backend/`

### URL del backend

Tutte le chiamate API sono state aggiornate per utilizzare:

```javascript
const API_BASE_URL = 'http://localhost:8000/[nome_file].php';
```

invece del precedente percorso relativo.

## Note

- È necessario che entrambi i server (frontend e backend) siano in esecuzione per il corretto funzionamento dell'applicazione
- Se si modificano le porte, assicurarsi di aggiornare tutti i riferimenti nei file di configurazione API