<?php
/**
 * r_tsis_pm.php - Backend API per il modulo Dashboard PM
 * 
 * Gestisce le richieste AJAX per la visualizzazione e l'aggiornamento dei dati
 * relativi ai POS assegnati a un Project Manager.
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

// Verifica dell'autenticazione
function isLoggedIn() {
    return isset($_SESSION['user']);
}

// Verifica se l'utente è un PM
function isPM($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM tsis_pm_config
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        return (bool)$stmt->fetchColumn();
    } catch (PDOException $e) {
        error_log("PM check error: " . $e->getMessage());
        return false;
    }
}

// Recupera l'ID PM dell'utente (per la compatibilità, ora restituisce l'user_id stesso)
function getPMId($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT user_id 
            FROM tsis_pm_config
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $pmId = $stmt->fetchColumn();
        return $pmId ?: $userId; // In caso non sia registrato, usiamo l'user_id stesso
    } catch (PDOException $e) {
        error_log("Get PM ID error: " . $e->getMessage());
        throw new Exception('Error retrieving PM ID');
    }
}

// Handler per ottenere la lista POS assegnati al PM
function handleGetPMPOSList($pdo) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }

    $userId = $_SESSION['user']['id'];
    
    // Verifica se l'utente è un PM o un PM Manager
    $isPM = isPM($pdo, $userId);
    $isPMManager = isPMManager($pdo, $userId);
    
    if (!$isPM && !$isPMManager) {
        throw new Exception('User is not a PM or PM Manager');
    }
    
    try {
        $sql = "
        SELECT 
            pm.*,
            a.nome_account,
            a.sf_region,
            a.sf_district,
            a.sf_territory,
            a.rrp_segment,
            a.trade,
            ta.codice as tipo_attivita,
            ta.descrizione as tipo_attivita_desc,
            u.username as pm_username,
            u.full_name as pm_full_name,
            i.nome_documento as documento_origine,
            (SELECT COUNT(d.id) FROM t_files d WHERE d.pos_id = a.id) as num_documenti,
            sa.descrizione as stato_descrizione,
            sa.colore as stato_colore,
            sa.icona as stato_icona
        FROM tsis_pos_management pm
        LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
        LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
        LEFT JOIN tsis_pos_imports i ON pm.import_id = i.id
        LEFT JOIN t_users u ON pm.pm_id = u.id
        LEFT JOIN tsis_stati_avanzamento sa ON pm.id_stato = sa.id";
        
        // Aggiungi la condizione WHERE solo se l'utente è un PM (non un manager)
        if ($isPM && !$isPMManager) {
            $sql .= " WHERE pm.pm_id = ?";
            $params = [$userId];
        } else {
            // Per i manager otteniamo tutti i record
            $params = [];
        }
        
        $sql .= " ORDER BY pm.data_creazione DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $data,
            'userRole' => $isPMManager ? 'manager' : 'pm'  // Aggiungi il ruolo nella risposta
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving POS list: " . $e->getMessage());
        throw new Exception('Error retrieving POS list');
    }
}
// Aggiungi questa funzione per l'assegnazione batch
function handleBatchUpdatePOSStatus($pdo, $data) {
    if (!isset($data['pos_ids']) || !isset($data['status'])) {
        throw new Exception('Missing required data');
    }

    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }

    $pmId = $_SESSION['user']['id'];
    $posIds = $data['pos_ids'];
    $status = $data['status'];
    $reason = $data['reason'] ?? '';
    
    try {
        $pdo->beginTransaction();
        
        // Ottiene l'id dello stato corrispondente
        $stmtStato = $pdo->prepare("
            SELECT id FROM tsis_stati_avanzamento 
            WHERE codice = ? AND tipo = 'ordine'
        ");
        $stmtStato->execute([$status]);
        $idStato = $stmtStato->fetchColumn();
        
        if (!$idStato) {
            throw new Exception('Invalid status');
        }

        $updateCount = 0;
        $errors = [];
        
        foreach ($posIds as $posId) {
            // Verifica che il POS sia assegnato al PM o se l'utente è un PM manager
            $stmt = $pdo->prepare("
                SELECT pm.id 
                FROM tsis_pos_management pm
                LEFT JOIN t_user_groups ug ON ug.user_id = :user_id
                LEFT JOIN t_groups g ON g.id = ug.group_id
                WHERE pm.id = :pos_id 
                AND (pm.pm_id = :pm_id OR g.name = 'pm_manager')
            ");
            $stmt->execute([
                ':pos_id' => $posId, 
                ':pm_id' => $pmId,
                ':user_id' => $pmId
            ]);
            
            if (!$stmt->fetch()) {
                $errors[] = "POS $posId not assigned to this PM";
                continue;
            }
            
            // Aggiorna lo stato
            $updateStmt = $pdo->prepare("
                UPDATE tsis_pos_management 
                SET stato = :status,
                    id_stato = :id_stato,
                    data_ultimo_stato = NOW(),
                    motivo_standby = CASE 
                        WHEN :status2 = 'standby' THEN :reason1 
                        ELSE motivo_standby 
                    END,
                    motivo_chiusura = CASE 
                        WHEN :status3 = 'rejected' OR :status3 = 'closed' THEN :reason2 
                        ELSE motivo_chiusura 
                    END,
                    commenti_interni = CONCAT(COALESCE(commenti_interni, ''), :comment),
                    updated_at = NOW(),
                    updated_by = :user_id
                WHERE id = :pos_id
            ");
            
            $timestamp = date('Y-m-d H:i:s');
            $params = [
                ':status' => $status,
                ':id_stato' => $idStato,
                ':status2' => $status,
                ':status3' => $status,
                ':reason1' => $reason,
                ':reason2' => $reason,
                ':comment' => "\n$timestamp - [Batch update] Cambio stato a {$status}" . 
                             ($reason ? " - {$reason}" : ''),
                ':pos_id' => $posId,
                ':user_id' => $pmId
            ];
            
            $updateStmt->execute($params);
            
            if ($updateStmt->rowCount() > 0) {
                $updateCount++;
                
                // Aggiungi log dell'operazione
                $logStmt = $pdo->prepare("
                    INSERT INTO tsis_pos_log 
                    (pos_id, tipo_operazione, motivo_operazione, utente_id, data_operazione)
                    VALUES (?, 'cambio_stato_batch', ?, ?, NOW())
                ");
                $logStmt->execute([
                    $posId, 
                    "Cambio stato a {$status}" . ($reason ? " - {$reason}" : ''),
                    $pmId
                ]);
            }
        }
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => "Status updated successfully for $updateCount POS",
            'errors' => $errors
        ];
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error updating batch POS status: " . $e->getMessage());
        throw new Exception('Error updating batch POS status');
    }
}


// Handler per le statistiche del PM
function handleGetPMStats($pdo) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    $userId = $_SESSION['user']['id'];
    
    // Verifica se l'utente è un PM o un PM Manager
    $isPM = isPM($pdo, $userId);
    $isPMManager = isPMManager($pdo, $userId);
    
    if (!$isPM && !$isPMManager) {
        throw new Exception('User is not a PM or PM Manager');
    }
    
    try {
        $sql = "
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stato = 'nuovo' THEN 1 ELSE 0 END) as nuovi,
                SUM(CASE WHEN stato = 'assegnato' THEN 1 ELSE 0 END) as assegnati,
                SUM(CASE WHEN stato = 'in_lavorazione' THEN 1 ELSE 0 END) as in_lavorazione,
                SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) as completati,
                SUM(CASE WHEN stato = 'standby' THEN 1 ELSE 0 END) as standby,
                SUM(CASE WHEN stato = 'non_lavorabile' THEN 1 ELSE 0 END) as non_lavorabili
            FROM tsis_pos_management";
        
        // Aggiungi la condizione WHERE solo se l'utente è un PM (non un manager)
        if ($isPM && !$isPMManager) {
            $sql .= " WHERE pm_id = ?";
            $params = [$userId];
        } else {
            // Per i manager otteniamo le statistiche globali
            $params = [];
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return [
            'success' => true,
            'data' => $stmt->fetch(),
            'userRole' => $isPMManager ? 'manager' : 'pm'  // Aggiungi il ruolo nella risposta
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving PM stats: " . $e->getMessage());
        throw new Exception('Error retrieving PM statistics');
    }
}

// Handler per aggiornare lo stato di un POS
function handleUpdatePOSStatus($pdo, $data) {
    if (!isset($data['pos_id']) || !isset($data['status'])) {
        throw new Exception('Missing required data');
    }

    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }

    $pmId = $_SESSION['user']['id'];
    
    try {
        // Verifica che il POS sia assegnato al PM
        $stmt = $pdo->prepare("
            SELECT id FROM tsis_pos_management 
            WHERE id = ? AND pm_id = ?
        ");
        $stmt->execute([$data['pos_id'], $pmId]);
        if (!$stmt->fetch()) {
            throw new Exception('POS not assigned to this PM');
        }
        
        // Ottiene l'id dello stato corrispondente
        $stmtStato = $pdo->prepare("
            SELECT id FROM tsis_stati_avanzamento 
            WHERE codice = ? AND tipo = 'ordine'
        ");
        $stmtStato->execute([$data['status']]);
        $idStato = $stmtStato->fetchColumn();
        
        if (!$idStato) {
            throw new Exception('Invalid status');
        }

        $pdo->beginTransaction();
        
        // Aggiorna lo stato
        $updateStmt = $pdo->prepare("
            UPDATE tsis_pos_management 
            SET stato = :status,
                id_stato = :id_stato,
                data_ultimo_stato = NOW(),
                motivo_standby = CASE 
                    WHEN :status2 = 'standby' THEN :reason1 
                    ELSE motivo_standby 
                END,
                motivo_chiusura = CASE 
                    WHEN :status3 = 'rejected' OR :status3 = 'closed' THEN :reason2 
                    ELSE motivo_chiusura 
                END,
                commenti_interni = CONCAT(COALESCE(commenti_interni, ''), :comment),
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :pos_id AND pm_id = :pm_id
        ");
        
        $timestamp = date('Y-m-d H:i:s');
        $params = [
            ':status' => $data['status'],
            ':id_stato' => $idStato,
            ':status2' => $data['status'],
            ':status3' => $data['status'],
            ':reason1' => $data['reason'] ?? null,
            ':reason2' => $data['reason'] ?? null,
            ':comment' => "\n$timestamp - Cambio stato a {$data['status']}" . 
                         ($data['reason'] ? " - {$data['reason']}" : ''),
            ':pos_id' => $data['pos_id'],
            ':pm_id' => $pmId,
            ':user_id' => $pmId
        ];
        
        $updateStmt->execute($params);
        
        if ($updateStmt->rowCount() === 0) {
            throw new Exception('No changes made');
        }
        
        // Aggiungi log dell'operazione
        $logStmt = $pdo->prepare("
            INSERT INTO tsis_pos_log 
            (pos_id, tipo_operazione, motivo_operazione, utente_id, data_operazione)
            VALUES (?, 'cambio_stato', ?, ?, NOW())
        ");
        $logStmt->execute([
            $data['pos_id'], 
            "Cambio stato a {$data['status']}" . ($data['reason'] ? " - {$data['reason']}" : ''),
            $pmId
        ]);
        
        $pdo->commit();
        return [
            'success' => true,
            'message' => 'Status updated successfully'
        ];
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error updating POS status: " . $e->getMessage());
        throw new Exception('Error updating POS status');
    }
}

// Handler per ottenere i documenti di un POS
function handleGetDocuments($pdo, $posId) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }

    $pmId = $_SESSION['user']['id'];
    
    try {
        // Verifica che il POS sia assegnato al PM
        $stmt = $pdo->prepare("
            SELECT pm.id, a.id as anagrafica_id
            FROM tsis_pos_management pm
            JOIN tsis_anagrafica a ON pm.pos_id = a.id
            WHERE pm.id = ? AND pm.pm_id = ?
        ");
        $stmt->execute([$posId, $pmId]);
        $row = $stmt->fetch();
        
        if (!$row) {
            throw new Exception('POS not assigned to this PM');
        }

        // Recupera i documenti
        $docsStmt = $pdo->prepare("
            SELECT * 
            FROM t_files
            WHERE pos_id = ?
            ORDER BY upload_date DESC
        ");
        $docsStmt->execute([$row['anagrafica_id']]);
        
        return [
            'success' => true,
            'data' => $docsStmt->fetchAll()
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving documents: " . $e->getMessage());
        throw new Exception('Error retrieving documents');
    }
}
// Verifica se l'utente è un PM Manager
function isPMManager($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM t_user_groups ug
            JOIN t_groups g ON ug.group_id = g.id
            WHERE ug.user_id = ? AND g.name = 'pm_manager'
        ");
        $stmt->execute([$userId]);
        return (bool)$stmt->fetchColumn();
    } catch (PDOException $e) {
        error_log("PM Manager check error: " . $e->getMessage());
        return false;
    }
}

// Handler per ottenere i dettagli di un POS
function handleGetPOSDetails($pdo, $posId) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }

    $pmId = $_SESSION['user']['id'];
    
    try {
        // Verifica che il POS sia assegnato al PM e recupera i dettagli
        $stmt = $pdo->prepare("
        SELECT 
            pm.*,
            a.*,
            ta.codice as tipo_attivita,
            ta.descrizione as tipo_attivita_desc,
            u.username as pm_username,
            u.full_name as pm_full_name,
            i.nome_documento as documento_origine,
            sa.descrizione as stato_descrizione,
            sa.colore as stato_colore,
            sa.icona as stato_icona
        FROM tsis_pos_management pm
        LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
        LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
        LEFT JOIN tsis_pos_imports i ON pm.import_id = i.id
        LEFT JOIN t_users u ON pm.pm_id = u.id
        LEFT JOIN tsis_stati_avanzamento sa ON pm.id_stato = sa.id
        WHERE pm.id = ? AND pm.pm_id = ?
    ");
        $stmt->execute([$posId, $pmId]);
        $details = $stmt->fetch();
        
        if (!$details) {
            throw new Exception('POS not found or not assigned to this PM');
        }
        
        return [
            'success' => true,
            'data' => $details
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving POS details: " . $e->getMessage());
        throw new Exception('Error retrieving POS details');
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

// Main request handling
try {
    $pdo = getPDO();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $postData = $_POST;
        $jsonData = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $postData = $jsonData;
        }
        
        switch($postData['action'] ?? '') {
            case 'updatePOSStatus':
                $result = handleUpdatePOSStatus($pdo, $postData);
                break;
    
                // Aggiungi questo nel router per gestire le richieste POST
// Nel blocco switch($postData['action'] ?? '')
case 'batchUpdatePOSStatus':
    $result = handleBatchUpdatePOSStatus($pdo, $postData);
    break;
    default:
    throw new Exception('Invalid action for POST request');
    
        }
        
    } else {
        switch($_GET['action'] ?? '') {
            case 'getPMPOSList':
                $result = handleGetPMPOSList($pdo);
                break;
            case 'getPMStats':
                $result = handleGetPMStats($pdo);
                break;
            case 'getDocuments':
                $result = handleGetDocuments($pdo, $_GET['pos_id'] ?? null);
                break;
            case 'getPOSDetails':
                $result = handleGetPOSDetails($pdo, $_GET['pos_id'] ?? null);
                break;
            default:
                throw new Exception('Invalid action for GET request');
        }
    }
    
    if (ob_get_level()) ob_end_clean();
    echo json_encode($result);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}