<?php
// r_codeclaude.php - Proxy server per Claude API con gestione file
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Consente richieste da qualsiasi origine
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-api-key, anthropic-version, X-Requested-Action');

// Path base della directory da esplorare
define('BASE_DIR', '/var/www/html/insightg');

// Gestisci le richieste OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Restituisci 200 OK per richieste preflight
    http_response_code(200);
    exit();
}

// Gestisci gli errori
function handleError($message, $statusCode = 500) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

// Verifica se è una richiesta di file system o di Claude API
$requestedAction = isset($_SERVER['HTTP_X_REQUESTED_ACTION']) ? $_SERVER['HTTP_X_REQUESTED_ACTION'] : '';

if ($requestedAction === 'get_directory') {
    // Richiesta per ottenere la struttura della directory
    handleGetDirectory();
} elseif ($requestedAction === 'get_node_content') {
    // Richiesta per ottenere il contenuto di un nodo specifico quando viene espanso
    handleGetNodeContent();
} elseif ($requestedAction === 'get_file_content') {
    // Richiesta per ottenere il contenuto di un file
    handleGetFileContent();
} elseif ($requestedAction === 'save_file_content') {
    // Richiesta per salvare il contenuto di un file
    handleSaveFileContent();
} elseif ($requestedAction === 'call_claude_api') {
    // Richiesta specifica per utilizzare Claude API con conteggio token
    handleClaudeApiWithTokens();
} else {
    // Procedi come richiesta normale per Claude API (legacy)
    handleClaudeApiRequest();
}

/**
 * Ottiene la struttura delle directory e dei file
 * Questa funzione viene chiamata per inizializzare l'albero e mostrare il primo livello
 */
function handleGetDirectory() {
    $relativePath = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
    $fullPath = BASE_DIR;
    
    if (!empty($relativePath)) {
        $fullPath .= '/' . $relativePath;
    }
    
    // Verifica che il path sia all'interno della directory base per sicurezza
    if (!isPathSafe($fullPath)) {
        handleError('Path non valido o non sicuro', 400);
    }
    
    // Verifica che la directory esista
    if (!is_dir($fullPath)) {
        handleError('La directory non esiste', 404);
    }
    
    // Ottieni la struttura della directory corrente (solo questo livello)
    $currentLevelStructure = scanCurrentLevel($fullPath, $relativePath);
    
    // Se siamo nella root, ottieni anche il primo livello di cartelle (non i file) per mostrare l'albero iniziale
    if (empty($relativePath)) {
        // Per ogni cartella di primo livello, aggiungi anche le sue sottocartelle (senza file)
        foreach ($currentLevelStructure['folders'] as $path => $folder) {
            $folderPath = $fullPath . '/' . $folder['name'];
            // Ottieni solo le sottocartelle, non i file
            $subfolders = getSubfoldersOnly($folderPath, $path);
            
            // Unisci le sottocartelle alla struttura principale
            foreach ($subfolders as $subPath => $subFolder) {
                $currentLevelStructure['folders'][$subPath] = $subFolder;
            }
        }
    }
    
    // Restituisci la struttura come JSON
    echo json_encode([
        'success' => true,
        'path' => $relativePath,
        'structure' => $currentLevelStructure
    ]);
    exit;
}

/**
 * Scansiona solo il livello corrente di una directory
 * Restituisce i file e le cartelle direttamente contenuti in essa, senza ricorsione
 */
function scanCurrentLevel($path, $relativePath = '') {
    $result = [
        'files' => [],
        'folders' => []
    ];
    
    // Verifica che la directory esista
    if (!is_dir($path)) {
        error_log("Directory non esistente: $path");
        return $result;
    }
    
    error_log("Scansione del livello corrente: $path ($relativePath)");
    
    $items = scandir($path);
    
    foreach ($items as $item) {
        // Salta le directory speciali
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        $fullPath = $path . '/' . $item;
        $itemRelativePath = $relativePath ? $relativePath . '/' . $item : $item;
        
        if (is_dir($fullPath)) {
            // È una directory
            error_log("Trovata cartella: $itemRelativePath");
            $result['folders'][$itemRelativePath] = [
                'name' => $item,
                'path' => $itemRelativePath,
                'type' => 'folder'
            ];
        } else {
            // È un file
            $extension = pathinfo($item, PATHINFO_EXTENSION);
            $supportedExtensions = ['txt', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'md', 'php', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'xml', 'yml', 'yaml', 'ini', 'conf', 'sql', 'sh', 'bat'];
            
            $fileSize = filesize($fullPath);
            if (in_array(strtolower($extension), $supportedExtensions) && $fileSize < 1024 * 1024) {
                error_log("Trovato file: $itemRelativePath");
                $result['files'][] = [
                    'name' => $item,
                    'path' => $itemRelativePath,
                    'size' => $fileSize,
                    'lastModified' => filemtime($fullPath),
                    'type' => 'file'
                ];
            }
        }
    }
    
    error_log("Totale cartelle trovate: " . count($result['folders']));
    error_log("Totale file trovati: " . count($result['files']));
    
    return $result;
}

/**
 * Funzione che ottiene solo le sottocartelle (non i file) per un dato percorso
 * Utilizzata per precompilare la struttura dell'albero
 */
function getSubfoldersOnly($path, $relativePath = '', $depth = 0, $maxDepth = 1) {
    $folders = [];
    
    // Verifica che la directory esista
    if (!is_dir($path)) {
        return $folders;
    }
    
    // Se abbiamo superato la profondità massima, restituisci direttamente
    if ($depth > $maxDepth) {
        return $folders;
    }
    
    $items = scandir($path);
    
    foreach ($items as $item) {
        // Salta le directory speciali
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        $fullPath = $path . '/' . $item;
        $itemRelativePath = $relativePath ? $relativePath . '/' . $item : $item;
        
        if (is_dir($fullPath)) {
            // È una directory - aggiungi alla lista
            $folders[$itemRelativePath] = [
                'name' => $item,
                'path' => $itemRelativePath,
                'type' => 'folder'
            ];
            
            // Ricorsione per ottenere sottocartelle (fino alla profondità massima)
            if ($depth < $maxDepth) {
                $subfolders = getSubfoldersOnly($fullPath, $itemRelativePath, $depth + 1, $maxDepth);
                foreach ($subfolders as $subPath => $subFolder) {
                    $folders[$subPath] = $subFolder;
                }
            }
        }
    }
    
    return $folders;
}

/**
 * Funzione che ottiene il contenuto di una directory quando un nodo viene espanso
 * Questa funzione può essere chiamata dal frontend quando si espande un nodo
 */
function handleGetNodeContent() {
    $nodePath = isset($_GET['node']) ? trim($_GET['node'], '/') : '';
    
    if (empty($nodePath)) {
        handleError('Percorso del nodo mancante', 400);
    }
    
    $fullPath = BASE_DIR . '/' . $nodePath;
    
    // Verifica che il path sia all'interno della directory base per sicurezza
    if (!isPathSafe($fullPath)) {
        handleError('Path non valido o non sicuro', 400);
    }
    
    // Verifica che la directory esista
    if (!is_dir($fullPath)) {
        handleError('La directory non esiste', 404);
    }
    
    // Ottieni il contenuto del nodo (file e sottocartelle dirette)
    $nodeContent = scanCurrentLevel($fullPath, $nodePath);
    
    // Per ogni sottocartella, ottieni le sue sottocartelle (senza file)
    foreach ($nodeContent['folders'] as $path => $folder) {
        $folderPath = $fullPath . '/' . $folder['name'];
        $folderRelPath = $nodePath . '/' . $folder['name'];
        
        $subfolders = getSubfoldersOnly($folderPath, $folderRelPath);
        
        // Unisci le sottocartelle alla struttura del nodo
        foreach ($subfolders as $subPath => $subFolder) {
            $nodeContent['folders'][$subPath] = $subFolder;
        }
    }
    
    // Restituisci il contenuto come JSON
    echo json_encode([
        'success' => true,
        'nodePath' => $nodePath,
        'content' => $nodeContent
    ]);
    exit;
}

// Funzione per ottenere il contenuto di un file
function handleGetFileContent() {
    $filePath = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
    
    if (empty($filePath)) {
        handleError('Path del file mancante', 400);
    }
    
    $fullPath = BASE_DIR . '/' . $filePath;
    
    // Verifica che il path sia all'interno della directory base per sicurezza
    if (!isPathSafe($fullPath)) {
        handleError('Path non valido o non sicuro', 400);
    }
    
    // Verifica che il file esista
    if (!file_exists($fullPath) || is_dir($fullPath)) {
        handleError('Il file non esiste', 404);
    }
    
    // Ottieni il contenuto del file
    $content = file_get_contents($fullPath);
    
    if ($content === false) {
        handleError('Impossibile leggere il file', 500);
    }
    
    // Restituisci il contenuto come JSON
    echo json_encode([
        'success' => true,
        'path' => $filePath,
        'content' => $content,
        'lastModified' => filemtime($fullPath)
    ]);
    exit;
}

// Funzione per salvare il contenuto di un file
// Funzione per salvare il contenuto di un file
function handleSaveFileContent() {
    // Log all'inizio della funzione per debug
    error_log("handleSaveFileContent: Inizio elaborazione richiesta di salvataggio file");

    // Ottieni il corpo della richiesta
    $requestBody = file_get_contents('php://input');
    if (empty($requestBody)) {
        handleError('Corpo della richiesta mancante', 400);
    }

    // Verifica che la richiesta sia in formato JSON
    $requestData = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('JSON non valido: ' . json_last_error_msg(), 400);
    }

    // Log dei dati ricevuti
    error_log("handleSaveFileContent: Dati ricevuti - " . json_encode($requestData));

    // Ottieni il path del file e il contenuto
    $filePath = isset($requestData['path']) ? trim($requestData['path'], '/') : '';
    $content = isset($requestData['content']) ? $requestData['content'] : '';

    if (empty($filePath)) {
        handleError('Path del file mancante', 400);
    }

    $fullPath = BASE_DIR . '/' . $filePath;
    error_log("handleSaveFileContent: Percorso completo - " . $fullPath);

    // Verifica che il path sia all'interno della directory base per sicurezza
    if (!isPathSafe($fullPath)) {
        handleError('Path non valido o non sicuro', 400);
    }

    // Crea directory se necessario
    $dirPath = dirname($fullPath);
    if (!is_dir($dirPath)) {
        error_log("handleSaveFileContent: Creazione directory - " . $dirPath);
        if (!mkdir($dirPath, 0777, true)) {
            // Log più dettagliato in caso di errore di creazione directory
            $mkdirError = error_get_last();
            error_log("Errore nella creazione della directory: " . json_encode($mkdirError));
            handleError('Impossibile creare la directory', 500);
        }
    }

    // Verifica permessi della directory
    if (!is_writable($dirPath)) {
        // Prova a modificare i permessi
        $chmodResult = chmod($dirPath, 0777);
        error_log("Tentativo di modificare permessi directory: " . ($chmodResult ? 'Successo' : 'Fallito'));
    }

    // Scrivi il contenuto nel file con gestione errori avanzata
    $result = @file_put_contents($fullPath, $content);

    if ($result === false) {
        // Log dettagliato dell'errore
        $fileError = error_get_last();
        error_log("handleSaveFileContent: Errore nella scrittura del file");
        error_log("Dettagli errore: " . json_encode($fileError));
        
        // Verifica permessi del file
        $fileExists = file_exists($fullPath);
        $isWritable = is_writable($fullPath);
        
        error_log("Stato file - Esiste: " . ($fileExists ? 'Sì' : 'No') . 
                   ", Scrivibile: " . ($isWritable ? 'Sì' : 'No'));
        
        handleError('Impossibile scrivere nel file. Controllare i permessi.', 500);
    }

    error_log("handleSaveFileContent: File salvato con successo - " . $fullPath . ", bytes: " . $result);

    // Restituisci successo
    echo json_encode([
        'success' => true,
        'path' => $filePath,
        'bytesWritten' => $result
    ]);
    exit;
}

// Verifica che un path sia all'interno della directory base
function isPathSafe($fullPath) {
    $realBasePath = realpath(BASE_DIR);
    $realFullPath = realpath($fullPath);
    
    // Se il path non esiste, verifica il parent
    if ($realFullPath === false) {
        $realFullPath = realpath(dirname($fullPath));
        if ($realFullPath === false) {
            return false;
        }
    }
    
    // Verifica che il path sia all'interno della directory base
    return strpos($realFullPath, $realBasePath) === 0;
}

// Funzione per gestire le richieste all'API di Claude con conteggio token
function handleClaudeApiWithTokens() {
    // Verifica che sia una richiesta POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        handleError('Solo richieste POST sono consentite per l\'API Claude', 405);
    }

    // Ottieni il corpo della richiesta
    $requestBody = file_get_contents('php://input');
    if (empty($requestBody)) {
        handleError('Corpo della richiesta mancante', 400);
    }

    // Verifica che la richiesta sia in formato JSON
    $requestData = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('JSON non valido: ' . json_last_error_msg(), 400);
    }

    // Ottieni l'API key dall'header
    $apiKey = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
    if (empty($apiKey)) {
        handleError('API key mancante', 401);
    }

    // Imposta l'URL dell'API di Claude
    $claudeApiUrl = 'https://api.anthropic.com/v1/messages';

    // Inizializza cURL
    $ch = curl_init($claudeApiUrl);

    // Imposta le opzioni di cURL
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ]);

    // Log della richiesta (opzionale, utile per il debug)
    $logEnabled = true;  // Imposta a false in produzione o rimuovi completamente
    if ($logEnabled) {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $logFile = $logDir . '/claude_api_' . date('Y-m-d') . '.log';
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'request' => $requestData,
            'api_key_present' => !empty($apiKey)
        ];
        
        file_put_contents(
            $logFile, 
            json_encode($logData, JSON_PRETTY_PRINT) . "\n\n", 
            FILE_APPEND
        );
    }

    // Esegui la richiesta cURL
    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Verifica errori cURL
    if (curl_errno($ch)) {
        handleError('Errore cURL: ' . curl_error($ch));
    }

    // Chiudi cURL
    curl_close($ch);

    // Imposta lo status code ricevuto dall'API di Claude
    http_response_code($statusCode);
    
    // Decodifica la risposta
    $responseData = json_decode($response, true);
    
    // Aggiungi informazioni di utilizzo token
    if ($responseData) {
        // L'API di Claude 3 include direttamente informazioni sull'utilizzo dei token
        // nella risposta. Se non le troviamo, calcoliamo una stima
        if (!isset($responseData['usage'])) {
            $inputText = '';
            
            // Calcola lunghezza approssimativa dell'input
            if (isset($requestData['messages'])) {
                foreach ($requestData['messages'] as $message) {
                    $inputText .= isset($message['content']) ? $message['content'] : '';
                }
            } else if (isset($requestData['prompt'])) {
                $inputText = $requestData['prompt'];
            }
            if (isset($requestData['system'])) {
                $inputText .= $requestData['system'];
            }
            
            // Stima token input: circa 4 caratteri per token
            $inputTokensEstimate = (int)(mb_strlen($inputText) / 4);
            
            // Stima token output: circa 4 caratteri per token
            $outputText = '';
            if (isset($responseData['content']) && is_array($responseData['content'])) {
                foreach ($responseData['content'] as $content) {
                    $outputText .= isset($content['text']) ? $content['text'] : '';
                }
            }
            $outputTokensEstimate = (int)(mb_strlen($outputText) / 4);
            
            // Aggiungi le stime alla risposta
            $responseData['usage'] = [
                'input_tokens' => $inputTokensEstimate,
                'output_tokens' => $outputTokensEstimate,
                'is_estimated' => true
            ];
        }
        
        // Log della risposta con il conteggio token
        if ($logEnabled) {
            $logResponse = [
                'timestamp' => date('Y-m-d H:i:s'),
                'status_code' => $statusCode,
                'usage' => $responseData['usage'] ?? 'not available',
                'response_length' => strlen($response)
            ];
            
            file_put_contents(
                $logFile, 
                json_encode($logResponse, JSON_PRETTY_PRINT) . "\n\n", 
                FILE_APPEND
            );
        }
        
        // Restituisci la risposta JSON modificata
        echo json_encode($responseData);
    } else {
        // Se non è stato possibile decodificare la risposta, restituiscila così com'è
        echo $response;
    }
}

// Funzione legacy per gestire le richieste all'API di Claude
function handleClaudeApiRequest() {
    // Verifica che sia una richiesta POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        handleError('Solo richieste POST sono consentite per l\'API Claude', 405);
    }

    // Ottieni il corpo della richiesta
    $requestBody = file_get_contents('php://input');
    if (empty($requestBody)) {
        handleError('Corpo della richiesta mancante', 400);
    }

    // Verifica che la richiesta sia in formato JSON
    $requestData = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('JSON non valido: ' . json_last_error_msg(), 400);
    }

    // Ottieni l'API key dall'header
    $apiKey = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
    if (empty($apiKey)) {
        handleError('API key mancante', 401);
    }

    // Imposta l'URL dell'API di Claude
    $claudeApiUrl = 'https://api.anthropic.com/v1/messages';

    // Inizializza cURL
    $ch = curl_init($claudeApiUrl);

    // Imposta le opzioni di cURL
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ]);

    // Log della richiesta (opzionale, utile per il debug)
    $logEnabled = true;  // Imposta a false in produzione o rimuovi completamente
    if ($logEnabled) {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $logFile = $logDir . '/claude_api_' . date('Y-m-d') . '.log';
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'request' => $requestData,
            'api_key_present' => !empty($apiKey)
        ];
        
        file_put_contents(
            $logFile, 
            json_encode($logData, JSON_PRETTY_PRINT) . "\n\n", 
            FILE_APPEND
        );
    }

    // Esegui la richiesta cURL
    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Verifica errori cURL
    if (curl_errno($ch)) {
        handleError('Errore cURL: ' . curl_error($ch));
    }

    // Log della risposta (opzionale)
    if ($logEnabled) {
        $responseData = json_decode($response, true);
        $logResponse = [
            'timestamp' => date('Y-m-d H:i:s'),
            'status_code' => $statusCode,
            'response' => $responseData ? $responseData : $response
        ];
        
        file_put_contents(
            $logFile, 
            json_encode($logResponse, JSON_PRETTY_PRINT) . "\n\n", 
            FILE_APPEND
        );
    }

    // Chiudi cURL
    curl_close($ch);

    // Imposta lo status code ricevuto dall'API di Claude
    http_response_code($statusCode);

    // Restituisci la risposta
    echo $response;
}
?>
