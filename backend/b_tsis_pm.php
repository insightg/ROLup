<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configura error handling e headers
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Gestione errori
function handleError($errno, $errstr, $errfile, $errline) {
    if (ob_get_level()) ob_end_clean();
    error_log("PHP Error: $errstr in $errfile on line $errline");
    echo json_encode([
        'success' => false,
        'error' => "PHP Error: $errstr"
    ]);
    exit(1);
}

function handleException($e) {
    if (ob_get_level()) ob_end_clean();
    error_log("Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

// Configurazione database
$domainParts = explode('.', $_SERVER['HTTP_HOST']);
$thirdLevelDomain = $domainParts[0];
$config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

if (!$config) {
    throw new Exception('Configuration error');
}

// Database connection
function getPDO() {
    global $config;
    try {
        return new PDO(
            "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
            $config['database']['username'],
            $config['database']['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
    } catch (PDOException $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw new Exception('Database connection error');
    }
}

// Verifica se l'utente è un PM
function isPM($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM tsis_pm p
            JOIN t_users u ON p.user_id = u.id
            WHERE u.id = ? AND u.is_active = 1
        ");
        $stmt->execute([$userId]);
        return (bool)$stmt->fetchColumn();
    } catch (PDOException $e) {
        error_log("PM check error: " . $e->getMessage());
        return false;
    }
}

// Recupera l'ID PM dell'utente
function getPMId($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT p.id 
            FROM tsis_pm p
            JOIN t_users u ON p.user_id = u.id
            WHERE u.id = ? AND u.is_active = 1
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn();
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
    
    if (!isPM($pdo, $userId)) {
        throw new Exception('User is not a PM');
    }
    
    $pmId = getPMId($pdo, $userId);
    if (!$pmId) {
        throw new Exception('PM ID not found');
    }

    try {
        $stmt = $pdo->prepare("
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
                i.nome_documento as documento_origine,
                sc.stato as stato_configurazione,
                COUNT(DISTINCT d.id) as num_documenti
            FROM tsis_pos_management pm
            LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
            LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
            LEFT JOIN tsis_pos_imports i ON pm.import_id = i.id
            LEFT JOIN tsis_survey_configurations sc ON pm.id = sc.pos_management_id
            LEFT JOIN tsis_documents d ON pm.id = d.pos_management_id
            WHERE pm.pm_id = ?
            GROUP BY pm.id, a.nome_account, a.sf_region, a.sf_district, 
                     a.sf_territory, a.rrp_segment, a.trade, ta.codice, 
                     ta.descrizione, i.nome_documento, sc.stato
            ORDER BY pm.data_creazione DESC
        ");
        
        $stmt->execute([$pmId]);
        $data = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $data
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving POS list: " . $e->getMessage());
        throw new Exception('Error retrieving POS list');
    }
}

// Handler per le statistiche del PM
function handleGetPMStats($pdo) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    $pmId = getPMId($pdo, $_SESSION['user']['id']);
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stato = 'assegnato' THEN 1 ELSE 0 END) as assegnati,
                SUM(CASE WHEN stato = 'in_lavorazione' THEN 1 ELSE 0 END) as in_lavorazione,
                SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) as completati,
                SUM(CASE WHEN stato = 'standby' THEN 1 ELSE 0 END) as standby,
                SUM(CASE WHEN stato = 'non_lavorabile' THEN 1 ELSE 0 END) as non_lavorabili
            FROM tsis_pos_management
            WHERE pm_id = ?
        ");
        
        $stmt->execute([$pmId]);
        return [
            'success' => true,
            'data' => $stmt->fetch()
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

    $pmId = getPMId($pdo, $_SESSION['user']['id']);
    
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

        $pdo->beginTransaction();
        
        // Aggiorna lo stato
        $updateStmt = $pdo->prepare("
            UPDATE tsis_pos_management 
            SET stato = :status,
                data_ultimo_stato = NOW(),
                motivo_standby = CASE 
                    WHEN :status2 = 'standby' THEN :reason1 
                    ELSE motivo_standby 
                END,
                motivo_rifiuto = CASE 
                    WHEN :status3 = 'non_lavorabile' THEN :reason2 
                    ELSE motivo_rifiuto 
                END,
                commenti_interni = CONCAT(COALESCE(commenti_interni, ''), :comment)
            WHERE id = :pos_id AND pm_id = :pm_id
        ");
        
        $timestamp = date('Y-m-d H:i:s');
        $params = [
            ':status' => $data['status'],
            ':status2' => $data['status'],
            ':status3' => $data['status'],
            ':reason1' => $data['reason'] ?? null,
            ':reason2' => $data['reason'] ?? null,
            ':comment' => "\n$timestamp - Cambio stato a {$data['status']}" . 
                         ($data['reason'] ? " - {$data['reason']}" : ''),
            ':pos_id' => $data['pos_id'],
            ':pm_id' => $pmId
        ];
        
        $updateStmt->execute($params);
        
        if ($updateStmt->rowCount() === 0) {
            throw new Exception('No changes made');
        }
        
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
?>