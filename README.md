# R_WUP - Sistema di Gestione Integrato

## Setup del Progetto

### Requisiti
- Node.js >= 16.0.0
- npm >= 8.0.0

### Installazione
```bash
npm install
```

## Modalità di Esecuzione

### Ambiente di Sviluppo
```bash
# Avvia solo il frontend (server di sviluppo Vite)
npm run dev

# Avvia solo il backend (server Express)
npm run backend

# Avvia entrambi i server contemporaneamente
npm run start
```

### Ambiente di Produzione
```bash
# Crea la build di produzione e avvia entrambi i server
npm run production
```
Questo comando:
1. Crea la build ottimizzata del frontend
2. Avvia un server di anteprima per la build su porta 3000
3. Avvia il server backend sulla porta 8000

## Struttura del Progetto
- `src/` - Codice sorgente del frontend
- `backend/` - Server backend (PHP)
- `public/` - Asset statici
- `build/` - Output della build di produzione (generato)

## Configurazione del Server
Per i dettagli sulla configurazione del server, consultare [SERVER_SETUP.md](./SERVER_SETUP.md).

## Documentazione
Per ulteriori dettagli sui moduli, consultare i file di documentazione nella cartella `docs/`.# ROLup
