<?php
header('Content-Type: application/json');

// Gestione CORS per sviluppo locale
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// Configurazione
const BASE_PATH = __DIR__ . '/../';
const DATA_DIR = BASE_PATH . 'data';
const CONFIG_FILE = BASE_PATH . 'config/cia/config.ini';
const PROFILES_FILE = DATA_DIR . '/profiles.json';
const CHAT_HISTORY_FILE = DATA_DIR . '/chat_history.json';
const LOGS_DIR = DATA_DIR . '/logs';
const DEBUG = true;

// Creazione directory necessarie
foreach ([DATA_DIR, LOGS_DIR] as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}

// Caricamento configurazione
$config = loadConfig();

// Inizializzazione logger
initLogger();

try {
    // Verifica e creazione directory data se non esiste
    if (!file_exists(DATA_DIR)) {
        if (!mkdir(DATA_DIR, 0777, true)) {
            throw new Exception('Impossibile creare la directory data');
        }
    }

    // Gestione delle richieste
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // Routing delle richieste
    switch ($action) {
        case 'clearMobileDefault':
            validateMethod('POST');
            echo json_encode(clearMobileDefault());
            break;
        
        case 'getProfiles':
            validateMethod('GET');
            echo json_encode(getProfiles());
            break;
            
        case 'saveProfile':
            validateMethod('POST');
            $profileData = getRequestData();
            echo json_encode(saveProfile($profileData));
            break;
            
        case 'deleteProfile':
            validateMethod('DELETE');
            $profileId = $_GET['id'] ?? '';
            echo json_encode(deleteProfile($profileId));
            break;
            
        case 'getBotResponse':
            validateMethod('POST');
            $requestData = getRequestData();
            echo json_encode(getBotResponse($requestData));
            break;
            
        case 'getSettings':
            validateMethod('GET');
            echo json_encode(getSettings());
            break;
            
        case 'saveSettings':
            validateMethod('POST');
            $settingsData = getRequestData();
            echo json_encode(saveSettings($settingsData));
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    handleError($e);
}
function clearMobileDefault() {
    $profiles = getProfiles();
    
    foreach ($profiles as &$profile) {
        $profile['isMobileDefault'] = false;
    }
    
    if (!safeWriteJson(PROFILES_FILE, $profiles)) {
        throw new Exception('Failed to update profiles');
    }
    
    return ['success' => true];
}
// Funzioni di Gestione Profili
function getProfiles() {
    return safeReadJson(PROFILES_FILE, []);
}

function saveProfile($profileData) {
    validateProfileData($profileData);
    
    $profiles = getProfiles();
    $now = date('c');
    
    if (empty($profileData['id'])) {
        // Nuovo profilo
        $profileData['id'] = generateUniqueId();
        $profileData['created_at'] = $now;
        $profileData['updated_at'] = $now;
        $profiles[] = $profileData;
    } else {
        // Aggiornamento profilo esistente
        $updated = false;
        foreach ($profiles as &$profile) {
            if ($profile['id'] === $profileData['id']) {
                // Mantieni created_at originale se esiste, altrimenti usa timestamp corrente
                $profileData['created_at'] = $profile['created_at'] ?? $now;
                $profileData['updated_at'] = $now;
                $profile = $profileData;
                $updated = true;
                break;
            }
        }
        
        if (!$updated) {
            throw new Exception('Profile not found');
        }
    }
    
    if (!safeWriteJson(PROFILES_FILE, $profiles)) {
        throw new Exception('Failed to save profile');
    }
    
    logAction('profile_saved', [
        'profile_id' => $profileData['id'],
        'is_new' => empty($profileData['created_at'])
    ]);
    
    return ['success' => true, 'profile' => $profileData];
}

function deleteProfile($profileId) {
    if (empty($profileId)) {
        throw new Exception('Profile ID is required');
    }
    
    $profiles = getProfiles();
    $index = array_search($profileId, array_column($profiles, 'id'));
    
    if ($index === false) {
        throw new Exception('Profile not found');
    }
    
    array_splice($profiles, $index, 1);
    
    if (!safeWriteJson(PROFILES_FILE, $profiles)) {
        throw new Exception('Failed to delete profile');
    }
    
    logAction('profile_deleted', ['profile_id' => $profileId]);
    return ['success' => true];
}

// Funzioni di Gestione Chat
function getBotResponse($requestData) {
    try {
        // Validazione dei dati in ingresso
        if (empty($requestData) || !is_array($requestData)) {
            throw new Exception('Invalid request data format');
        }

        if (!isset($requestData['message']) || trim($requestData['message']) === '') {
            throw new Exception('Message is required');
        }

        // Assegna valori di default se mancanti
        $message = trim($requestData['message']);
        $history = $requestData['history'] ?? [];
        $profileId = $requestData['profileId'] ?? 'default';

        // Se c'è un profileId, ottieni il profilo
        $profile = null;
        if ($profileId !== 'default') {
            $profile = getProfileById($profileId);
            if (!$profile) {
                // Se il profilo non esiste, usa il default silenziosamente
                logError('profile_not_found', ['profile_id' => $profileId]);
                $profileId = 'default';
            }
        }

        // Gestione temporanea per test (rimuovere in produzione)
        if (!$profile && $profileId === 'default') {
            return [
                'success' => true,
                'message' => "Risposta di test: Ho ricevuto il messaggio '$message'",
                'timestamp' => date('c')
            ];
        }

        // Preparazione del contesto per Claude
        $context = prepareClaudeContext($history, $profile);
        
        // Chiamata API Claude
        $claudeResponse = callClaudeAPI($context, $message);
        
        // Log della risposta
        logAction('bot_response_sent', [
            'profile_id' => $profileId,
            'message_length' => strlen($message),
            'response_length' => strlen($claudeResponse)
        ]);

        return [
            'success' => true,
            'message' => $claudeResponse,
            'timestamp' => date('c')
        ];
    } catch (Exception $e) {
        logError('bot_response_error', [
            'error' => $e->getMessage(),
            'profile_id' => $profileId ?? 'unknown'
        ]);
        
        return [
            'error' => true,
            'message' => DEBUG ? $e->getMessage() : 'Si è verificato un errore nella comunicazione con il bot.'
        ];
    }
}


function prepareClaudeContext($history, $profile) {
    $messages = [];
    
    // Converti la storia della conversazione
    foreach ($history as $entry) {
        $messages[] = [
            'role' => $entry['type'] === 'user' ? 'user' : 'assistant',
            'content' => $entry['message']
        ];
    }
    
    return [
        'system' => constructSystemPrompt($profile), // Questo sarà il system prompt
        'messages' => $messages // Questi sono i messaggi della conversazione
    ];
}

function callClaudeAPI($context, $userMessage) {
    global $config;
    
    $url = 'https://api.anthropic.com/v1/messages';
    $data = [
        'model' => 'claude-3-haiku-20240307',
        'max_tokens' => 1024,
        'system' => $context['system'], // System prompt come parametro top-level
        'messages' => array_merge(
            $context['messages'],
            [['role' => 'user', 'content' => $userMessage]]
        )
    ];
    
    if (DEBUG) {
        logAction('claude_api_request', [
            'request_data' => $data,
            'message_length' => strlen($userMessage)
        ]);
    }
    
    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $config['claude_api_key'],
        'anthropic-version: 2023-06-01'
    ];
    
    $response = makeHttpRequest($url, 'POST', $data, $headers);
    
    if ($response === false) {
        throw new Exception('Failed to call Claude API');
    }
    
    $responseData = json_decode($response, true);
    if (!isset($responseData['content'][0]['text'])) {
        throw new Exception('Invalid response from Claude API: ' . $response);
    }
    
    return $responseData['content'][0]['text'];
}
function constructSystemPrompt($profile) {
    if (!$profile) {
        return "Sei un assistente virtuale. Rispondi in modo chiaro e conciso.";
    }
    
    $prompt = "{$profile['definition']}\n\n";
    
    // Aggiungi basi di conoscenza attive
    if (!empty($profile['knowledgeBases'])) {
        $prompt .= "Utilizza queste informazioni per rispondere:\n\n";
        foreach ($profile['knowledgeBases'] as $kb) {
            if ($kb['active']) {
                $prompt .= "# {$kb['name']}\n{$kb['content']}\n\n";
            }
        }
    }
    
    return $prompt;
}


// Funzioni di Utilità
function makeHttpRequest($url, $method, $data = null, $headers = []) {
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        logError('http_request_error', [
            'url' => $url,
            'method' => $method,
            'error' => $error
        ]);
        throw new Exception("HTTP request failed: $error");
    }
    
    if ($httpCode >= 400) {
        logError('http_request_error', [
            'url' => $url,
            'method' => $method,
            'http_code' => $httpCode,
            'response' => $response
        ]);
        throw new Exception("HTTP request failed with code $httpCode: $response");
    }
    
    return $response;
}

function safeReadJson($file, $default = null) {
    if (!file_exists($file)) {
        return $default;
    }
    
    $content = file_get_contents($file);
    if ($content === false) {
        throw new Exception("Failed to read file: $file");
    }
    
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Failed to parse JSON from file: $file");
    }
    
    return $data;
}

function safeWriteJson($file, $data) {
    $tempFile = $file . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT);
    
    if ($json === false) {
        throw new Exception('Failed to encode JSON data');
    }
    
    if (file_put_contents($tempFile, $json) === false) {
        throw new Exception("Failed to write to temporary file: $tempFile");
    }
    
    if (!rename($tempFile, $file)) {
        unlink($tempFile);
        throw new Exception("Failed to rename temporary file to: $file");
    }
    
    return true;
}

function generateUniqueId() {
    return uniqid('p_', true);
}

function getRequestData() {
    $jsonData = file_get_contents('php://input');
    if ($jsonData === false) {
        throw new Exception('Failed to read request data');
    }
    
    $data = json_decode($jsonData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON in request data');
    }
    
    return $data;
}

// Funzioni di Validazione
function validateMethod($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        throw new Exception("Method not allowed. Expected $method");
    }
}

function validateProfileData($data) {
    $required = ['name', 'definition'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
}

function validateRequestData($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
}

// Funzioni di Logging
function initLogger() {
    if (!defined('LOG_FILE')) {
        define('LOG_FILE', LOGS_DIR . '/app_' . date('Y-m-d') . '.log');
    }
}

function logAction($action, $data = []) {
    $logEntry = [
        'timestamp' => date('c'),
        'action' => $action,
        'data' => $data,
        'ip' => $_SERVER['REMOTE_ADDR']
    ];
    
    file_put_contents(
        LOG_FILE,
        json_encode($logEntry) . "\n",
        FILE_APPEND
    );
}

function logError($type, $data = []) {
    $logEntry = [
        'timestamp' => date('c'),
        'type' => $type,
        'data' => $data,
        'ip' => $_SERVER['REMOTE_ADDR'],
        'trace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS)
    ];
    
    file_put_contents(
        LOGS_DIR . '/errors_' . date('Y-m-d') . '.log',
        json_encode($logEntry) . "\n",
        FILE_APPEND
    );
}

// Gestione Errori
function handleError($e) {
    $response = [
        'error' => true,
        'message' => $e->getMessage()
    ];
    
    if (DEBUG) {
        $response['trace'] = $e->getTraceAsString();
        
        // Aggiungi informazioni sul file di configurazione in caso di errore
        if (strpos($e->getMessage(), 'configuration') !== false) {
            $response['config_info'] = [
                'config_file' => CONFIG_FILE,
                'exists' => file_exists(CONFIG_FILE),
                'readable' => is_readable(CONFIG_FILE),
                'example_created' => file_exists(CONFIG_FILE . '.example')
            ];
            
            // Crea un file di configurazione di esempio
            createExampleConfig();
        }
    }
    
    http_response_code(400);
    echo json_encode($response);
    
    logError('uncaught_exception', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

// Funzioni di Configurazione
function loadConfig() {
    if (!file_exists(CONFIG_FILE)) {
        throw new Exception('Configuration file not found: ' . CONFIG_FILE);
    }

    $config = parse_ini_file(CONFIG_FILE, true);
    if ($config === false) {
        throw new Exception('Failed to parse configuration file');
    }

    // Verifica la presenza delle sezioni e dei campi richiesti
    $required = [
        'claude' => ['api_key'],
        'ultraMsg' => ['instance', 'token']
    ];

    foreach ($required as $section => $fields) {
        if (!isset($config[$section])) {
            throw new Exception("Missing configuration section: {$section}");
        }
        foreach ($fields as $field) {
            if (!isset($config[$section][$field])) {
                throw new Exception("Missing configuration field: {$section}.{$field}");
            }
        }
    }

    return [
        'claude_api_key' => $config['claude']['api_key'],
        'ultramsg_instance_id' => $config['ultraMsg']['instance'],
        'ultramsg_token' => $config['ultraMsg']['token']
    ];
}

// Funzione per creare un file di configurazione di esempio se non esiste
function createExampleConfig() {
    $exampleConfig = <<<INI
[claude]
api_key = your_claude_api_key_here

[ultraMsg]
instance = your_ultramsg_instance_here
token = your_ultramsg_token_here
INI;

    $configDir = dirname(CONFIG_FILE);
    if (!file_exists($configDir)) {
        mkdir($configDir, 0777, true);
    }

    file_put_contents(CONFIG_FILE . '.example', $exampleConfig);
}

function getProfileById($profileId) {
    $profiles = getProfiles();
    foreach ($profiles as $profile) {
        if ($profile['id'] === $profileId) {
            return $profile;
        }
    }
    return null;
}

function saveChatHistory($history) {
    // Mantieni solo gli ultimi 100 messaggi per profilo
    $groupedHistory = [];
    foreach ($history as $message) {
        $profileId = $message['profile_id'] ?? 'default';
        if (!isset($groupedHistory[$profileId])) {
            $groupedHistory[$profileId] = [];
        }
        $groupedHistory[$profileId][] = $message;
    }
    
    foreach ($groupedHistory as $profileId => $messages) {
        $groupedHistory[$profileId] = array_slice($messages, -100);
    }
    
    return safeWriteJson(CHAT_HISTORY_FILE, $groupedHistory);
}

// Funzioni di Integrazione UltraMsg
function sendWhatsAppMessage($to, $message) {
    global $config;
    
    $url = "https://api.ultramsg.com/{$config['ultramsg_instance_id']}/messages/chat";
    
    $data = [
        'token' => $config['ultramsg_token'],
        'to' => $to,
        'body' => $message
    ];
    
    try {
        $response = makeHttpRequest($url, 'POST', $data);
        $responseData = json_decode($response, true);
        
        logAction('whatsapp_message_sent', [
            'to' => $to,
            'message_length' => strlen($message),
            'response' => $responseData
        ]);
        
        return $responseData;
    } catch (Exception $e) {
        logError('whatsapp_send_error', [
            'to' => $to,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

// Funzioni di Pulizia e Manutenzione
function cleanOldLogs($daysToKeep = 30) {
    $files = glob(LOGS_DIR . '/*.log');
    $now = time();
    
    foreach ($files as $file) {
        if (is_file($file)) {
            if ($now - filemtime($file) >= $daysToKeep * 86400) {
                unlink($file);
                logAction('old_log_deleted', ['file' => basename($file)]);
            }
        }
    }
}

function optimizeChatHistory() {
    $history = safeReadJson(CHAT_HISTORY_FILE, []);
    
    // Rimuovi messaggi più vecchi di 30 giorni
    $thirtyDaysAgo = strtotime('-30 days');
    
    foreach ($history as $profileId => &$messages) {
        $messages = array_filter($messages, function($message) use ($thirtyDaysAgo) {
            return strtotime($message['timestamp']) > $thirtyDaysAgo;
        });
    }
    
    // Rimuovi profili vuoti
    $history = array_filter($history, function($messages) {
        return !empty($messages);
    });
    
    safeWriteJson(CHAT_HISTORY_FILE, $history);
    logAction('chat_history_optimized');
}

// Funzioni di Backup
function createBackup() {
    $backupDir = DATA_DIR . '/backups';
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0777, true);
    }
    
    $timestamp = date('Y-m-d_H-i-s');
    $backupFile = $backupDir . "/backup_$timestamp.zip";
    
    $zip = new ZipArchive();
    if ($zip->open($backupFile, ZipArchive::CREATE) !== TRUE) {
        throw new Exception("Cannot create backup file: $backupFile");
    }
    
    // Aggiungi file al backup
    $filesToBackup = [
        PROFILES_FILE,
        CHAT_HISTORY_FILE,
        BASE_PATH . 'config.json'
    ];
    
    foreach ($filesToBackup as $file) {
        if (file_exists($file)) {
            $zip->addFile($file, basename($file));
        }
    }
    
    $zip->close();
    
    // Mantieni solo gli ultimi 5 backup
    $backups = glob($backupDir . '/backup_*.zip');
    usort($backups, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    foreach (array_slice($backups, 5) as $oldBackup) {
        unlink($oldBackup);
    }
    
    logAction('backup_created', ['file' => basename($backupFile)]);
    return $backupFile;
}

// Funzioni di Manutenzione Automatica
function performMaintenance() {
    try {
        // Esegui backup giornaliero
        if (!file_exists(DATA_DIR . '/last_backup') || 
            time() - filemtime(DATA_DIR . '/last_backup') > 86400) {
            createBackup();
            touch(DATA_DIR . '/last_backup');
        }
        
        // Pulisci log vecchi
        cleanOldLogs();
        
        // Ottimizza storia chat
        optimizeChatHistory();
        
        logAction('maintenance_performed');
    } catch (Exception $e) {
        logError('maintenance_error', [
            'error' => $e->getMessage()
        ]);
    }
}

// Esegui manutenzione con probabilità del 1%
if (rand(1, 100) === 1) {
    performMaintenance();
}

// Funzioni di Gestione Webhook
function handleWhatsAppWebhook($data) {
    try {
        validateWebhookData($data);
        
        $message = $data['message'];
        $from = $data['from'];
        
        // Verifica se è un nuovo utente
        $users = safeReadJson(DATA_DIR . '/users.json', []);
        if (!isset($users[$from])) {
            $users[$from] = [
                'first_seen' => date('c'),
                'messages_count' => 0
            ];
        }
        $users[$from]['messages_count']++;
        $users[$from]['last_seen'] = date('c');
        safeWriteJson(DATA_DIR . '/users.json', $users);
        
        // Processa il messaggio con Claude
        $response = getBotResponse([
            'message' => $message,
            'history' => [], // Per ora ogni messaggio è indipendente
            'profileId' => 'default' // Usa profilo default per webhook
        ]);
        
        // Invia risposta via WhatsApp
        sendWhatsAppMessage($from, $response['message']);
        
        logAction('webhook_processed', [
            'from' => $from,
            'message_length' => strlen($message)
        ]);
        
        return ['success' => true];
    } catch (Exception $e) {
        logError('webhook_error', [
            'error' => $e->getMessage(),
            'data' => $data
        ]);
        throw $e;
    }
}

function validateWebhookData($data) {
    if (!isset($data['message']) || !isset($data['from'])) {
        throw new Exception('Invalid webhook data');
    }
}

// Funzioni di Sanitizzazione
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags($data), ENT_QUOTES, 'UTF-8');
}

function sanitizeFilename($filename) {
    // Rimuovi caratteri non sicuri
    $filename = preg_replace('/[^a-zA-Z0-9_.-]/', '', $filename);
    // Previeni directory traversal
    $filename = basename($filename);
    return $filename;
}

// Inizializzazione finale
register_shutdown_function(function() {
    if ($error = error_get_last()) {
        if ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR)) {
            logError('fatal_error', $error);
        }
    }
});

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) {
        return false;
    }
    
    logError('php_error', [
        'errno' => $errno,
        'errstr' => $errstr,
        'errfile' => $errfile,
        'errline' => $errline
    ]);
    
    return true;
});
