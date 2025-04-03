<?php
/**
 * r_anagrafica.php - Backend API per il modulo Anagrafica
 * 
 * Gestisce le richieste AJAX per l'importazione, visualizzazione, modifica ed eliminazione
 * dei record nella tabella tsis_anagrafica.
 */

// Configurazione iniziale
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ottenimento configurazioni dal dominio
$domainParts = explode('.', $_SERVER['HTTP_HOST']);
$thirdLevelDomain = $domainParts[0];
$config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

if (!$config) {
    error_log("Error loading config file for domain: {$thirdLevelDomain}");
    throw new Exception('Configuration error');
}

// Imposta headers e error handling
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
/**
 * Ottiene tutti gli ID dei record con i filtri correnti
 * Utilizzato per la funzionalità "Seleziona tutto"
 */
function getAllIds($pdo) {
    // Parametri della richiesta
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
    
    // Lista delle colonne valide per i filtri
    $validColumns = [
        'id', 'nome_account', 'sf_region', 'sf_district', 'sf_territory',
        'tipo_di_record_account', 'rrp_segment', 'trade', 'cap_spedizioni',
        'statoprovincia_spedizioni', 'citt_spedizioni', 'indirizzo_spedizioni',
        'telefono', 'mobile', 'email', 'field_rep', 'numero_field_rep',
        'supervisor', 'numero_supervisor'
    ];
    
    try {
        // Query di base
        $query = "SELECT id FROM tsis_anagrafica";
        
        // Array per i parametri
        $params = [];
        
        // Costruzione WHERE per ricerca e filtri
        $where = [];
        
        // Ricerca globale
        if (!empty($search)) {
            $searchTerms = [];
            foreach ($validColumns as $col) {
                $searchTerms[] = "$col LIKE :search";
            }
            $where[] = "(" . implode(" OR ", $searchTerms) . ")";
            $params[':search'] = "%$search%";
        }
        
        // Filtri per colonna
        if (!empty($filters)) {
            foreach ($filters as $index => $filter) {
                if (in_array($filter['id'], $validColumns)) {
                    $filterValue = $filter['value'];
                    $filterParam = ":filter$index";
                    
                    switch ($filter['operator']) {
                        case 'contains':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "%$filterValue%";
                            break;
                        case 'equals':
                            $where[] = "{$filter['id']} = $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'startsWith':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "$filterValue%";
                            break;
                        case 'endsWith':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "%$filterValue";
                            break;
                        case 'isEmpty':
                            $where[] = "({$filter['id']} IS NULL OR {$filter['id']} = '')";
                            break;
                        case 'isNotEmpty':
                            $where[] = "({$filter['id']} IS NOT NULL AND {$filter['id']} != '')";
                            break;
                        case 'gt':
                            $where[] = "{$filter['id']} > $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'gte':
                            $where[] = "{$filter['id']} >= $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'lt':
                            $where[] = "{$filter['id']} < $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'lte':
                            $where[] = "{$filter['id']} <= $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                    }
                }
            }
        }
        
        // Completa la query con WHERE
        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", $where);
        }
        
        // Esegui la query
        $stmt = $pdo->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Risposta
        echo json_encode([
            'success' => true,
            'ids' => $records
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante il recupero degli ID: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero degli ID: ' . $e->getMessage()
        ]);
    }
}
// Error handlers
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

// Database connection
function getPDO() {
    global $config;
    return new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
}

// Verifica dell'autenticazione - funzione semplificata
function isLoggedIn() {
    return isset($_SESSION['user']);
}

// Verifica dell'autenticazione
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Utente non autenticato'
    ]);
    exit;
}

try {
    $pdo = getPDO();
    
    // Definizione delle azioni disponibili
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    // Gestione delle azioni
    switch ($action) {
        case 'get':
            getAnagraficaData($pdo);
            break;
        case 'getRecord':
            getRecord($pdo);
            break;
        case 'getAllIds':
                getAllIds($pdo);
                break;
        case 'updateRecord':
            updateRecord($pdo);
            break;
        case 'deleteRecord':
            deleteRecord($pdo);
            break;
        case 'import':
            importData($pdo);
            break;
        case 'getDbSchema':
            getDbSchema($pdo);
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Azione non valida'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore di connessione al database: ' . $e->getMessage()
    ]);
    exit;
}
/**
 * Ottiene i dati dall'anagrafica con paginazione, ordinamento e filtri
 */
function getAnagraficaData($pdo) {
    // Log per debug
    error_log("Inizio funzione getAnagraficaData");
    
    // Parametri della richiesta
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? intval($_GET['pageSize']) : 25;
    $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'id';
    $sortDir = isset($_GET['sortDir']) ? $_GET['sortDir'] : 'asc';
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
    
    error_log("Parametri ricevuti: page=$page, pageSize=$pageSize, sortBy=$sortBy, sortDir=$sortDir, search=$search");
    
    // Validazione parametri
    if ($page < 1) $page = 1;
    if ($pageSize < 1 || $pageSize > 1000) $pageSize = 25;
    
    // Calcolo offset
    $offset = ($page - 1) * $pageSize;
    
    // Lista delle colonne valide per ordinamento e filtri
    $validColumns = [
        'id', 'nome_account', 'sf_region', 'sf_district', 'sf_territory',
        'tipo_di_record_account', 'rrp_segment', 'trade', 'cap_spedizioni',
        'statoprovincia_spedizioni', 'citt_spedizioni', 'indirizzo_spedizioni',
        'telefono', 'mobile', 'email', 'field_rep', 'numero_field_rep',
        'supervisor', 'numero_supervisor'
    ];
    
    // Validazione colonna ordinamento
    if (!in_array($sortBy, $validColumns)) {
        $sortBy = 'id';
    }
    
    // Validazione direzione ordinamento
    if ($sortDir !== 'asc' && $sortDir !== 'desc') {
        $sortDir = 'asc';
    }
    
    try {
        // Query di base
        $queryCount = "SELECT COUNT(*) as total FROM tsis_anagrafica";
        $queryData = "SELECT * FROM tsis_anagrafica";
        
        // Array per i parametri
        $params = [];
        
        // Costruzione WHERE per ricerca e filtri
        $where = [];
        
        // Ricerca globale
        if (!empty($search)) {
            $searchTerms = [];
            foreach ($validColumns as $col) {
                $searchTerms[] = "$col LIKE :search";
            }
            $where[] = "(" . implode(" OR ", $searchTerms) . ")";
            $params[':search'] = "%$search%";
        }
        
        // Filtri per colonna
        if (!empty($filters)) {
            foreach ($filters as $index => $filter) {
                if (in_array($filter['id'], $validColumns)) {
                    $filterValue = $filter['value'];
                    $filterParam = ":filter$index";
                    
                    switch ($filter['operator']) {
                        case 'contains':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "%$filterValue%";
                            break;
                        case 'equals':
                            $where[] = "{$filter['id']} = $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'startsWith':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "$filterValue%";
                            break;
                        case 'endsWith':
                            $where[] = "{$filter['id']} LIKE $filterParam";
                            $params[$filterParam] = "%$filterValue";
                            break;
                        case 'isEmpty':
                            $where[] = "({$filter['id']} IS NULL OR {$filter['id']} = '')";
                            break;
                        case 'isNotEmpty':
                            $where[] = "({$filter['id']} IS NOT NULL AND {$filter['id']} != '')";
                            break;
                        case 'gt':
                            $where[] = "{$filter['id']} > $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'gte':
                            $where[] = "{$filter['id']} >= $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'lt':
                            $where[] = "{$filter['id']} < $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                        case 'lte':
                            $where[] = "{$filter['id']} <= $filterParam";
                            $params[$filterParam] = $filterValue;
                            break;
                    }
                }
            }
        }
        
        // Completa le query con WHERE, ORDER BY e LIMIT
        if (!empty($where)) {
            $whereClause = " WHERE " . implode(" AND ", $where);
            $queryCount .= $whereClause;
            $queryData .= $whereClause;
        }
        
        $queryData .= " ORDER BY $sortBy $sortDir LIMIT :offset, :limit";
        
        // Log delle query
        error_log("Query count: $queryCount");
        error_log("Query data: $queryData");
        error_log("Parametri: " . json_encode($params));
        
        // Ottiene il conteggio totale
        $stmtCount = $pdo->prepare($queryCount);
        foreach ($params as $key => $value) {
            $stmtCount->bindValue($key, $value);
        }
        $stmtCount->execute();
        $total = $stmtCount->fetchColumn();
        
        error_log("Conteggio totale: $total");
        
        // Ottiene i dati
        $stmtData = $pdo->prepare($queryData);
        foreach ($params as $key => $value) {
            $stmtData->bindValue($key, $value);
        }
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmtData->execute();
        $data = $stmtData->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Dati recuperati: " . count($data) . " record");
        
        // Risposta
        echo json_encode([
            'success' => true,
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
            'pages' => ceil($total / $pageSize)
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante l'esecuzione delle query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero dei dati: ' . $e->getMessage()
        ]);
    }
}

/**
 * Ottiene un singolo record dell'anagrafica
 */
function getRecord($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID non valido'
        ]);
        return;
    }
    
    try {
        $stmt = $db->prepare("SELECT * FROM tsis_anagrafica WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Record non trovato'
            ]);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'record' => $record
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Aggiorna un record dell'anagrafica
 */
function updateRecord($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID non valido'
        ]);
        return;
    }
    
    // Ottiene i dati dal corpo della richiesta
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Dati non validi'
        ]);
        return;
    }
    
    // Validazione campi
    $validFields = [
        'nome_account', 'sf_region', 'sf_district', 'sf_territory',
        'tipo_di_record_account', 'rrp_segment', 'trade', 'cap_spedizioni',
        'statoprovincia_spedizioni', 'citt_spedizioni', 'indirizzo_spedizioni',
        'telefono', 'mobile', 'email', 'field_rep', 'numero_field_rep',
        'supervisor', 'numero_supervisor'
    ];
    
    // Costruzione query UPDATE
    $updates = [];
    $params = [];
    
    foreach ($data as $key => $value) {
        if (in_array($key, $validFields)) {
            $updates[] = "$key = :$key";
            $params[":$key"] = $value;
        }
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nessun campo valido da aggiornare'
        ]);
        return;
    }
    
    try {
        $query = "UPDATE tsis_anagrafica SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $db->prepare($query);
        
        // Bind dei parametri
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Record aggiornato con successo'
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Record non trovato o nessuna modifica effettuata'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'aggiornamento del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Elimina un record dell'anagrafica
 */
function deleteRecord($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID non valido'
        ]);
        return;
    }
    
    try {
        $stmt = $db->prepare("DELETE FROM tsis_anagrafica WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Record eliminato con successo'
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Record non trovato'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'eliminazione del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Importa dati da un file Excel in tsis_anagrafica
 */
function importData($db) {
    // Ottiene i dati dal corpo della richiesta
    $importMode = isset($_POST['mode']) ? $_POST['mode'] : 'insert';
    $jsonData = isset($_POST['data']) ? $_POST['data'] : null;
    
    if (!$jsonData) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Dati mancanti'
        ]);
        return;
    }
    
    $data = json_decode($jsonData, true);
    
    if (!is_array($data) || empty($data)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Formato dati non valido'
        ]);
        return;
    }
    
    // Campi validi
    $validFields = [
        'nome_account', 'sf_region', 'sf_district', 'sf_territory',
        'tipo_di_record_account', 'rrp_segment', 'trade', 'cap_spedizioni',
        'statoprovincia_spedizioni', 'citt_spedizioni', 'indirizzo_spedizioni',
        'telefono', 'mobile', 'email', 'field_rep', 'numero_field_rep',
        'supervisor', 'numero_supervisor'
    ];
    
    try {
        $db->beginTransaction();
        
        $processedCount = 0;
        $failedCount = 0;
        
        foreach ($data as $row) {
            // Filtra i campi validi
            $validRow = array_intersect_key($row, array_flip($validFields));
            
            if (empty($validRow)) {
                $failedCount++;
                continue;
            }
            
            // Determina l'operazione in base alla modalità e alla presenza di nome_account
            $operation = $importMode;
            
            if (isset($validRow['nome_account']) && !empty($validRow['nome_account'])) {
                // Cerca se esiste già un record con lo stesso nome_account
                $stmt = $db->prepare("SELECT id FROM tsis_anagrafica WHERE nome_account = :nome_account");
                $stmt->bindParam(':nome_account', $validRow['nome_account']);
                $stmt->execute();
                $existingRecord = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingRecord) {
                    // Record esistente
                    if ($importMode === 'insert') {
                        // Skip in modalità insert
                        $failedCount++;
                        continue;
                    } elseif ($importMode === 'update' || $importMode === 'both') {
                        // Aggiorna in modalità update o both
                        $operation = 'update';
                        $recordId = $existingRecord['id'];
                    }
                } else {
                    // Record non esistente
                    if ($importMode === 'update') {
                        // Skip in modalità update
                        $failedCount++;
                        continue;
                    } else {
                        // Inserisci in modalità insert o both
                        $operation = 'insert';
                    }
                }
            } else {
                // Se non è presente nome_account, ignora il record
                $failedCount++;
                continue;
            }
            
            if ($operation === 'insert') {
                // Preparazione query INSERT
                $fields = array_keys($validRow);
                $placeholders = array_map(function($field) { return ":$field"; }, $fields);
                
                $query = "INSERT INTO tsis_anagrafica (" . implode(", ", $fields) . ") 
                          VALUES (" . implode(", ", $placeholders) . ")";
                
                $stmt = $db->prepare($query);
                
                // Bind dei parametri
                foreach ($validRow as $field => $value) {
                    $stmt->bindValue(":$field", $value);
                }
                
                $stmt->execute();
                $processedCount++;
            } elseif ($operation === 'update') {
                // Preparazione query UPDATE
                $updates = [];
                foreach (array_keys($validRow) as $field) {
                    if ($field !== 'nome_account') { // Non aggiorniamo nome_account che è la chiave
                        $updates[] = "$field = :$field";
                    }
                }
                
                if (empty($updates)) {
                    $failedCount++;
                    continue;
                }
                
                $query = "UPDATE tsis_anagrafica SET " . implode(", ", $updates) . " 
                          WHERE id = :id";
                
                $stmt = $db->prepare($query);
                
                // Bind dei parametri
                foreach ($validRow as $field => $value) {
                    if ($field !== 'nome_account') {
                        $stmt->bindValue(":$field", $value);
                    }
                }
                $stmt->bindParam(':id', $recordId, PDO::PARAM_INT);
                
                $stmt->execute();
                $processedCount++;
            }
        }
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Importazione completata',
            'processedCount' => $processedCount,
            'failedCount' => $failedCount
        ]);
    } catch (PDOException $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'importazione: ' . $e->getMessage()
        ]);
    }
}

/**
 * Restituisce lo schema del database per la tabella tsis_anagrafica
 * Utile per inizializzare la mappatura automatica
 */
function getDbSchema($db) {
    try {
        // Ottiene i metadati della tabella
        $stmt = $db->prepare("DESCRIBE tsis_anagrafica");
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Costruisci un array di informazioni sui campi
        $fields = [];
        foreach ($columns as $column) {
            $field = [
                'field' => $column['Field'],
                'type' => $column['Type'],
                'null' => $column['Null'] === 'YES',
                'key' => $column['Key'],
                'default' => $column['Default'],
                'extra' => $column['Extra'],
                'label' => formatFieldLabel($column['Field'])
            ];
            
            $fields[] = $field;
        }
        
        echo json_encode([
            'success' => true,
            'schema' => [
                'table' => 'tsis_anagrafica',
                'fields' => $fields
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero dello schema: ' . $e->getMessage()
        ]);
    }
}

/**
 * Formatta il nome del campo in un'etichetta leggibile
 */
function formatFieldLabel($fieldName) {
    // Sostituisce underscore con spazi e mette in maiuscolo ogni parola
    $label = str_replace('_', ' ', $fieldName);
    $label = ucwords($label);
    
    // Sostituzioni specifiche per abbreviazioni comuni
    $replacements = [
        'Sf' => 'SF',
        'Id' => 'ID',
        'Rrp' => 'RRP',
        'Citt' => 'Città',
        'Cap' => 'CAP'
    ];
    
    return str_replace(array_keys($replacements), array_values($replacements), $label);
}
