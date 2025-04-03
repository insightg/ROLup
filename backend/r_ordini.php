<?php
session_start();
header('Content-Type: application/json');

require_once '../config/config.php';
require_once '../config/db_config.php';

// Verifica autenticazione
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'Non autorizzato']));
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    error_log("Errore connessione DB: " . $e->getMessage());
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'Errore connessione database']));
}

// Gestione delle azioni
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        getOrdiniData();
        break;
    case 'getRecord':
        getRecord();
        break;
    case 'updateRecord':
        updateRecord();
        break;
    case 'deleteRecord':
        deleteRecord();
        break;
    case 'getAllIds':
        getAllIds();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Azione non valida']);
}

function getOrdiniData() {
    global $pdo;
    
    try {
        // Parametri di paginazione e ordinamento
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
        $offset = ($page - 1) * $limit;
        
        $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'id';
        $sortDir = isset($_GET['sortDir']) && strtolower($_GET['sortDir']) === 'desc' ? 'DESC' : 'ASC';
        
        // Validazione campo ordinamento
        $allowedFields = ['id', 'codice_ordine', 'stato', 'data_creazione', 'tipo_attivita_desc', 'progress'];
        if (!in_array($sortBy, $allowedFields)) {
            $sortBy = 'id';
        }
        
        // Costruzione query base
        $baseQuery = "FROM tsis_pos_management WHERE 1=1";
        $params = [];
        
        // Gestione ricerca globale
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $baseQuery .= " AND (
                codice_ordine LIKE ? OR 
                stato LIKE ? OR 
                tipo_attivita_desc LIKE ? OR 
                commenti_cliente LIKE ? OR 
                commenti_interni LIKE ?
            )";
            $params = array_merge($params, [$search, $search, $search, $search, $search]);
        }
        
        // Gestione filtri avanzati
        if (!empty($_GET['filters'])) {
            $filters = json_decode($_GET['filters'], true);
            if (is_array($filters)) {
                foreach ($filters as $filter) {
                    if (isset($filter['id']) && isset($filter['value'])) {
                        switch ($filter['operator']) {
                            case 'contains':
                                $baseQuery .= " AND " . $filter['id'] . " LIKE ?";
                                $params[] = '%' . $filter['value'] . '%';
                                break;
                            case 'equals':
                                $baseQuery .= " AND " . $filter['id'] . " = ?";
                                $params[] = $filter['value'];
                                break;
                            case 'startsWith':
                                $baseQuery .= " AND " . $filter['id'] . " LIKE ?";
                                $params[] = $filter['value'] . '%';
                                break;
                            case 'endsWith':
                                $baseQuery .= " AND " . $filter['id'] . " LIKE ?";
                                $params[] = '%' . $filter['value'];
                                break;
                            // Altri operatori...
                        }
                    }
                }
            }
        }
        
        // Query per il conteggio totale
        $countQuery = "SELECT COUNT(*) as total " . $baseQuery;
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalRecords = $stmt->fetch()['total'];
        
        // Query principale con paginazione e ordinamento
        $mainQuery = "SELECT * " . $baseQuery . " ORDER BY " . $sortBy . " " . $sortDir . " LIMIT ? OFFSET ?";
        $stmt = $pdo->prepare($mainQuery);
        $params[] = $limit;
        $params[] = $offset;
        $stmt->execute($params);
        $records = $stmt->fetchAll();
        
        // Calcolo numero totale di pagine
        $totalPages = ceil($totalRecords / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => $records,
            'pagination' => [
                'page' => $page,
                'pageSize' => $limit,
                'total' => $totalRecords,
                'totalPages' => $totalPages
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Errore query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nel recupero dei dati']);
    }
}

function getRecord() {
    global $pdo;
    
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID non specificato']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM tsis_pos_management WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $record = $stmt->fetch();
        
        if (!$record) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Record non trovato']);
            return;
        }
        
        echo json_encode(['success' => true, 'data' => $record]);
        
    } catch (PDOException $e) {
        error_log("Errore query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nel recupero del record']);
    }
}

function updateRecord() {
    global $pdo;
    
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID non specificato']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Dati non validi']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Aggiorna il record
        $fields = [];
        $params = [];
        foreach ($data as $key => $value) {
            if ($key !== 'id') {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
        }
        $params[] = $_GET['id'];
        
        $query = "UPDATE tsis_pos_management SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        // Aggiorna data_modifica e updated_by
        $stmt = $pdo->prepare("UPDATE tsis_pos_management SET 
            data_modifica = NOW(),
            updated_at = NOW(),
            updated_by = ?
            WHERE id = ?");
        $stmt->execute([$_SESSION['user_id'], $_GET['id']]);
        
        $pdo->commit();
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Errore query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nell\'aggiornamento del record']);
    }
}

function deleteRecord() {
    global $pdo;
    
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID non specificato']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM tsis_pos_management WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        error_log("Errore query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nell\'eliminazione del record']);
    }
}

function getAllIds() {
    global $pdo;
    
    try {
        $baseQuery = "SELECT id FROM tsis_pos_management WHERE 1=1";
        $params = [];
        
        // Applica gli stessi filtri della funzione getOrdiniData
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $baseQuery .= " AND (
                codice_ordine LIKE ? OR 
                stato LIKE ? OR 
                tipo_attivita_desc LIKE ? OR 
                commenti_cliente LIKE ? OR 
                commenti_interni LIKE ?
            )";
            $params = array_merge($params, [$search, $search, $search, $search, $search]);
        }
        
        if (!empty($_GET['filters'])) {
            $filters = json_decode($_GET['filters'], true);
            if (is_array($filters)) {
                foreach ($filters as $filter) {
                    if (isset($filter['id']) && isset($filter['value'])) {
                        switch ($filter['operator']) {
                            case 'contains':
                                $baseQuery .= " AND " . $filter['id'] . " LIKE ?";
                                $params[] = '%' . $filter['value'] . '%';
                                break;
                            case 'equals':
                                $baseQuery .= " AND " . $filter['id'] . " = ?";
                                $params[] = $filter['value'];
                                break;
                            // Altri operatori...
                        }
                    }
                }
            }
        }
        
        $stmt = $pdo->prepare($baseQuery);
        $stmt->execute($params);
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode(['success' => true, 'ids' => $ids]);
        
    } catch (PDOException $e) {
        error_log("Errore query: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nel recupero degli ID']);
    }
}