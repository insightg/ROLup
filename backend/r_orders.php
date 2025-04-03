<?php
/**
 * r_orders.php - Backend API per il modulo Orders
 * 
 * Gestisce le richieste AJAX per l'importazione, visualizzazione, modifica ed eliminazione
 * dei record nella tabella tsis_pos_management.
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

/**
 * Ottiene i dati degli ordini con paginazione, ordinamento e filtri
 */
function getOrdersData($pdo) {
    // Parametri di paginazione
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
    $offset = ($page - 1) * $pageSize;
    
    // Parametri di ordinamento
    $sortBy = isset($_GET['sortBy']) && !empty($_GET['sortBy']) ? $_GET['sortBy'] : 'id';
    $sortDir = isset($_GET['sortDir']) && strtoupper($_GET['sortDir']) === 'DESC' ? 'DESC' : 'ASC';
    
    // Parametri di ricerca e filtri
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
    
    // Lista delle colonne valide per i filtri e l'ordinamento
    $validColumns = [
        'id', 'import_id', 'pos_id', 'pm_id', 'stato', 'motivo_standby', 'motivo_chiusura',
        'commenti_cliente', 'commenti_interni', 'data_assegnazione', 'data_inizio_lavorazione',
        'data_ultimo_stato', 'data_creazione', 'data_modifica', 'tipo_attivita_id', 'data_ordine',
        'codice_ordine', 'codice_po_fornitore', 'progress', 'tipo_attivita_codice', 'tipo_attivita_desc'
    ];
    
    // Verifica che la colonna di ordinamento sia valida
    if (!in_array($sortBy, $validColumns)) {
        $sortBy = 'id';
    }
    
    try {
        // Query di base
        $queryCount = "SELECT COUNT(*) FROM tsis_pos_management";
        $queryData = "SELECT * FROM tsis_pos_management";
        
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
        
        // Ottiene il conteggio totale
        $stmtCount = $pdo->prepare($queryCount);
        foreach ($params as $key => $value) {
            $stmtCount->bindValue($key, $value);
        }
        $stmtCount->execute();
        $total = $stmtCount->fetchColumn();
        
        // Ottiene i dati
        $stmtData = $pdo->prepare($queryData);
        foreach ($params as $key => $value) {
            $stmtData->bindValue($key, $value);
        }
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmtData->execute();
        $data = $stmtData->fetchAll(PDO::FETCH_ASSOC);
        
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
 * Ottiene tutti gli ID dei record con i filtri correnti
 * Utilizzato per la funzionalità "Seleziona tutto"
 */
function getAllIds($pdo) {
    // Parametri della richiesta
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
    
    // Lista delle colonne valide per i filtri
    $validColumns = [
        'id', 'import_id', 'pos_id', 'pm_id', 'stato', 'motivo_standby', 'motivo_chiusura',
        'commenti_cliente', 'commenti_interni', 'data_assegnazione', 'data_inizio_lavorazione',
        'data_ultimo_stato', 'data_creazione', 'data_modifica', 'tipo_attivita_id', 'data_ordine',
        'codice_ordine', 'codice_po_fornitore', 'progress', 'tipo_attivita_codice', 'tipo_attivita_desc'
    ];
    
    try {
        // Query di base
        $query = "SELECT id FROM tsis_pos_management";
        
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
} = $filterValue;
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

/**
 * Ottiene un singolo record in base all'ID
 */
function getRecord($pdo) {
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
        $query = "SELECT * FROM tsis_pos_management WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
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
            'data' => $record
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante il recupero del record: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Aggiorna un record esistente
 */
function updateRecord($pdo) {
    // Verifica che la richiesta sia di tipo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Metodo non consentito'
        ]);
        return;
    }
    
    // Ottiene i dati dal corpo della richiesta
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id']) || intval($data['id']) <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID non valido'
        ]);
        return;
    }
    
    $id = intval($data['id']);
    
    try {
        // Verifica che il record esista
        $checkQuery = "SELECT id FROM tsis_pos_management WHERE id = :id";
        $checkStmt = $pdo->prepare($checkQuery);
        $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Record non trovato'
            ]);
            return;
        }
        
        // Prepara i campi da aggiornare
        $updateFields = [];
        $params = [];
        
        // Lista dei campi consentiti per l'aggiornamento
        $allowedFields = [
            'import_id', 'pos_id', 'pm_id', 'stato', 'motivo_standby', 'motivo_chiusura',
            'commenti_cliente', 'commenti_interni', 'data_assegnazione', 'data_inizio_lavorazione',
            'data_ultimo_stato', 'tipo_attivita_id', 'data_ordine', 'codice_ordine', 
            'codice_po_fornitore', 'progress', 'tipo_attivita_codice', 'tipo_attivita_desc'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        // Aggiunge data_modifica
        $updateFields[] = "data_modifica = NOW()";
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Nessun campo valido da aggiornare'
            ]);
            return;
        }
        
        // Costruisce e esegue la query di aggiornamento
        $query = "UPDATE tsis_pos_management SET " . implode(", ", $updateFields) . " WHERE id = :id";
        $params[':id'] = $id;
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Record aggiornato con successo',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante l'aggiornamento del record: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'aggiornamento del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Elimina un record esistente
 */
function deleteRecord($pdo) {
    // Verifica che la richiesta sia di tipo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Metodo non consentito'
        ]);
        return;
    }
    
    // Ottiene i dati dal corpo della richiesta
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id']) || intval($data['id']) <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID non valido'
        ]);
        return;
    }
    
    $id = intval($data['id']);
    
    try {
        // Verifica che il record esista
        $checkQuery = "SELECT id FROM tsis_pos_management WHERE id = :id";
        $checkStmt = $pdo->prepare($checkQuery);
        $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Record non trovato'
            ]);
            return;
        }
        
        // Esegue l'eliminazione
        $query = "DELETE FROM tsis_pos_management WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Record eliminato con successo',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante l'eliminazione del record: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'eliminazione del record: ' . $e->getMessage()
        ]);
    }
}

/**
 * Importa dati da un file CSV o Excel
 */
function importData($pdo) {
    // Verifica che la richiesta sia di tipo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Metodo non consentito'
        ]);
        return;
    }
    
    // Verifica che sia stato caricato un file
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nessun file valido caricato'
        ]);
        return;
    }
    
    $file = $_FILES['file'];
    $fileName = $file['name'];
    $fileTmpPath = $file['tmp_name'];
    $fileSize = $file['size'];
    $fileType = $file['type'];
    
    // Verifica estensione file
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    if (!in_array($fileExt, ['csv', 'xlsx', 'xls'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Formato file non supportato. Utilizzare CSV o Excel.'
        ]);
        return;
    }
    
    try {
        // Crea un ID univoco per l'importazione
        $importId = uniqid('imp_');
        $importDate = date('Y-m-d H:i:s');
        
        // Elabora il file in base al formato
        $records = [];
        
        if ($fileExt === 'csv') {
            // Elaborazione file CSV
            $handle = fopen($fileTmpPath, 'r');
            if ($handle !== false) {
                // Legge la prima riga come intestazioni
                $headers = fgetcsv($handle, 0, ',');
                
                // Mappa le intestazioni ai campi del database
                $columnMap = mapHeadersToColumns($headers);
                
                // Legge i dati
                while (($data = fgetcsv($handle, 0, ',')) !== false) {
                    $record = [];
                    foreach ($columnMap as $index => $column) {
                        if ($column && isset($data[$index])) {
                            $record[$column] = $data[$index];
                        }
                    }
                    $records[] = $record;
                }
                fclose($handle);
            }
        } else {
            // Per file Excel, è necessario utilizzare una libreria come PhpSpreadsheet
            // Qui andrebbe implementata la logica di importazione da Excel
            http_response_code(501);
            echo json_encode([
                'success' => false,
                'message' => 'Importazione da Excel non ancora implementata'
            ]);
            return;
        }
        
        // Inizia una transazione
        $pdo->beginTransaction();
        
        // Prepara la query di inserimento
        $insertedCount = 0;
        foreach ($records as $record) {
            // Aggiungi i campi di sistema
            $record['import_id'] = $importId;
            $record['data_creazione'] = $importDate;
            $record['data_modifica'] = $importDate;
            
            // Costruisci la query
            $columns = array_keys($record);
            $placeholders = array_map(function($col) { return ":$col"; }, $columns);
            
            $query = "INSERT INTO tsis_pos_management (" . implode(", ", $columns) . ") "
                  . "VALUES (" . implode(", ", $placeholders) . ")";
            
            $stmt = $pdo->prepare($query);
            foreach ($record as $column => $value) {
                $stmt->bindValue(":$column", $value);
            }
            
            $stmt->execute();
            $insertedCount++;
        }
        
        // Commit della transazione
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "Importazione completata con successo. $insertedCount record importati.",
            'import_id' => $importId,
            'count' => $insertedCount
        ]);
    } catch (PDOException $e) {
        // Rollback in caso di errore
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        error_log("Errore durante l'importazione dei dati: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante l\'importazione dei dati: ' . $e->getMessage()
        ]);
    }
}

/**
 * Mappa le intestazioni del file alle colonne del database
 */
function mapHeadersToColumns($headers) {
    // Mappa delle intestazioni comuni ai campi del database
    $headerMap = [
        'POS ID' => 'pos_id',
        'PM ID' => 'pm_id',
        'Stato' => 'stato',
        'Motivo Standby' => 'motivo_standby',
        'Motivo Chiusura' => 'motivo_chiusura',
        'Commenti Cliente' => 'commenti_cliente',
        'Commenti Interni' => 'commenti_interni',
        'Data Assegnazione' => 'data_assegnazione',
        'Data Inizio Lavorazione' => 'data_inizio_lavorazione',
        'Data Ultimo Stato' => 'data_ultimo_stato',
        'Tipo Attività ID' => 'tipo_attivita_id',
        'Data Ordine' => 'data_ordine',
        'Codice Ordine' => 'codice_ordine',
        'Codice PO Fornitore' => 'codice_po_fornitore',
        'Progress' => 'progress',
        'Tipo Attività Codice' => 'tipo_attivita_codice',
        'Tipo Attività Descrizione' => 'tipo_attivita_desc'
    ];
    
    $columnMap = [];
    foreach ($headers as $index => $header) {
        $header = trim($header);
        if (isset($headerMap[$header])) {
            $columnMap[$index] = $headerMap[$header];
        } else {
            // Tenta di normalizzare l'intestazione
            $normalizedHeader = strtolower(str_replace(' ', '_', $header));
            if (in_array($normalizedHeader, array_values($headerMap))) {
                $columnMap[$index] = $normalizedHeader;
            } else {
                $columnMap[$index] = null; // Colonna non mappata
            }
        }
    }
    
    return $columnMap;
}

/**
 * Ottiene lo schema del database per la tabella
 */
function getDbSchema($pdo) {
    try {
        // Query per ottenere le informazioni sulle colonne della tabella
        $query = "SHOW COLUMNS FROM tsis_pos_management";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formatta i dati per la risposta
        $schema = [];
        foreach ($columns as $column) {
            $type = $column['Type'];
            $isRequired = $column['Null'] === 'NO' && $column['Default'] === null && !$column['Extra'];
            
            $schema[] = [
                'name' => $column['Field'],
                'type' => $type,
                'required' => $isRequired,
                'primary' => $column['Key'] === 'PRI',
                'auto_increment' => strpos($column['Extra'], 'auto_increment') !== false
            ];
        }
        
        echo json_encode([
            'success' => true,
            'schema' => $schema
        ]);
    } catch (PDOException $e) {
        error_log("Errore durante il recupero dello schema: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore durante il recupero dello schema: ' . $e->getMessage()
        ]);
    }
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
            getOrdersData($pdo);
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
 * Ottiene i dati degli ordini con paginazione, ordinamento e filtri
 */
function getOrdersData($pdo) {
    // Log per debug
    error_log("Inizio funzione getOrdersData");
    
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
        'id', 'import_id', 'pos_id', 'pm_id', 'stato', 'motivo_standby', 'motivo_chiusura',
        'commenti_cliente', 'commenti_interni', 'data_assegnazione', 'data_inizio_lavorazione',
        'data_ultimo_stato', 'data_creazione', 'data_modifica', 'tipo_attivita_id', 'data_ordine',
        'codice_ordine', 'codice_po_fornitore', 'progress', 'tipo_attivita_codice', 'tipo_attivita_desc'
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
        $queryCount = "SELECT COUNT(*) as total FROM tsis_pos_management";
        $queryData = "SELECT * FROM tsis_pos_management";
        
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
                            $where[]