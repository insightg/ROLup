<?php
if (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json');

// Gestione errori e eccezioni
function handleError($errno, $errstr, $errfile, $errline) {
    if (ob_get_level()) ob_end_clean();
    $error = [
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ];
    error_log("PHP Error: $errstr in $errfile on line $errline");
    echo json_encode($error);
    exit(1);
}

function handleException($e) {
    if (ob_get_level()) ob_end_clean();
    $error = [
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ];
    error_log("Uncaught Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode($error);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

// Configurazione Database
function getConfigDB() {
    $configFile = '../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini';
    if (!file_exists($configFile)) {
        throw new Exception('Config file not found');
    }
    $config = parse_ini_file($configFile, true);
    return [
        'host' => $config['database']['host'],
        'dbname' => $config['database']['dbname'],
        'user' => $config['database']['username'],
        'password' => $config['database']['password']
    ];
}
<?php
// Handler per il caricamento della configurazione
function handleLoadConfiguration($pdo, $request) {
    if (!isset($request['id'])) {
        throw new Exception('Missing activity ID');
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                MODULO60, MODULO90,
                VISIBILITY60, VISIBILITY90,
                MONITOR60, MONITOR90,
                LIGHTBOX60, LIGHTBOX90,
                FIANCO, LB_LOGOFRES,
                PROLUNGAMENTO, MODULOILUMA,
                CARDS, PUSHER, LIGHTTOTEM,
                RIPIANI_MOD60, RIPIANI_MOD90
            FROM ClusterDONE 
            WHERE id = ?
        ");
        
        $stmt->execute([$request['id']]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$config) {
            throw new Exception('Configuration not found');
        }

        // Elabora i dati dei ripiani
        $ripiani_mod60 = !empty($config['RIPIANI_MOD60']) ? 
            json_decode($config['RIPIANI_MOD60'], true) : [];
        $ripiani_mod90 = !empty($config['RIPIANI_MOD90']) ? 
            json_decode($config['RIPIANI_MOD90'], true) : [];

        return [
            'success' => true,
            'configuration' => [
                'modules' => [
                    'mod60' => $config['MODULO60'],
                    'mod90' => $config['MODULO90'],
                    'visibility60' => $config['VISIBILITY60'],
                    'visibility90' => $config['VISIBILITY90'],
                    'monitor60' => $config['MONITOR60'],
                    'monitor90' => $config['MONITOR90'],
                    'lightbox60' => $config['LIGHTBOX60'],
                    'lightbox90' => $config['LIGHTBOX90']
                ],
                'accessories' => [
                    'fianco' => $config['FIANCO'],
                    'logoFresh' => $config['LB_LOGOFRES'],
                    'prolungamento' => $config['PROLUNGAMENTO'],
                    'moduloIluma' => $config['MODULOILUMA'],
                    'cards' => $config['CARDS'],
                    'pusher' => $config['PUSHER'],
                    'lightTotem' => $config['LIGHTTOTEM']
                ],
                'shelves' => [
                    'mod60' => $ripiani_mod60,
                    'mod90' => $ripiani_mod90
                ]
            ]
        ];
    } catch (Exception $e) {
        throw new Exception('Error loading configuration: ' . $e->getMessage());
    }
}

// Handler per il salvataggio della configurazione
function handleSaveConfiguration($pdo, $request) {
    if (!isset($request['configuration']) || !isset($request['id'])) {
        throw new Exception('Missing configuration data or activity ID');
    }

    try {
        // Prepara i dati dei ripiani per il salvataggio
        $ripiani_mod60 = json_encode($request['configuration']['shelves']['mod60'] ?? []);
        $ripiani_mod90 = json_encode($request['configuration']['shelves']['mod90'] ?? []);

        $stmt = $pdo->prepare("
            UPDATE ClusterDONE 
            SET 
                MODULO60 = :mod60,
                MODULO90 = :mod90,
                VISIBILITY60 = :vis60,
                VISIBILITY90 = :vis90,
                MONITOR60 = :mon60,
                MONITOR90 = :mon90,
                LIGHTBOX60 = :lb60,
                LIGHTBOX90 = :lb90,
                FIANCO = :fianco,
                LB_LOGOFRES = :logoFresh,
                PROLUNGAMENTO = :prolungamento,
                MODULOILUMA = :moduloIluma,
                CARDS = :cards,
                PUSHER = :pusher,
                LIGHTTOTEM = :lightTotem,
                RIPIANI_MOD60 = :ripiani60,
                RIPIANI_MOD90 = :ripiani90,
                LAST_UPDATE = NOW()
            WHERE id = :id
        ");

        $params = [
            'mod60' => $request['configuration']['modules']['mod60'],
            'mod90' => $request['configuration']['modules']['mod90'],
            'vis60' => $request['configuration']['modules']['visibility60'],
            'vis90' => $request['configuration']['modules']['visibility90'],
            'mon60' => $request['configuration']['modules']['monitor60'],
            'mon90' => $request['configuration']['modules']['monitor90'],
            'lb60' => $request['configuration']['modules']['lightbox60'],
            'lb90' => $request['configuration']['modules']['lightbox90'],
            'fianco' => $request['configuration']['accessories']['fianco'],
            'logoFresh' => $request['configuration']['accessories']['logoFresh'],
            'prolungamento' => $request['configuration']['accessories']['prolungamento'],
            'moduloIluma' => $request['configuration']['accessories']['moduloIluma'],
            'cards' => $request['configuration']['accessories']['cards'],
            'pusher' => $request['configuration']['accessories']['pusher'],
            'lightTotem' => $request['configuration']['accessories']['lightTotem'],
            'ripiani60' => $ripiani_mod60,
            'ripiani90' => $ripiani_mod90,
            'id' => $request['id']
        ];
        
        $stmt->execute($params);

        // Logga l'aggiornamento
        error_log("Configuration updated for activity ID: " . $request['id']);

        return [
            'success' => true,
            'message' => 'Configurazione salvata con successo',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        error_log("Error saving configuration: " . $e->getMessage());
        throw new Exception('Error saving configuration: ' . $e->getMessage());
    }
}
try {
    // Inizializzazione connessione database
    $config = getConfigDB();
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['user'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]
    );

    // Gestione della richiesta
    $request = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $request = json_decode($rawInput, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON in request: ' . json_last_error_msg());
            }
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $request = $_GET;
    }

    if (empty($request) || !isset($request['action'])) {
        throw new Exception('Action parameter missing');
    }

    // Log della richiesta
    error_log("Processing wizrol action: " . $request['action']);

    // Routing delle azioni
    switch ($request['action']) {
        case 'loadConfiguration':
            $result = handleLoadConfiguration($pdo, $request);
            break;
            
        case 'saveConfiguration':
            $result = handleSaveConfiguration($pdo, $request);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $request['action']);
    }

    // Output del risultato
    if (ob_get_level()) ob_end_clean();
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);

} catch (PDOException $e) {
    // Gestione errori database
    error_log("Database Error in wizrol: " . $e->getMessage());
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'details' => [
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
} catch (Exception $e) {
    // Gestione errori generici
    error_log("General Error in wizrol: " . $e->getMessage());
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}

// Pulizia finale dell'output buffer
if (ob_get_level()) ob_end_flush();