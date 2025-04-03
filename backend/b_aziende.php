<?php
if (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json');

function handleError($errno, $errstr, $errfile, $errline) {
    $error = [
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ];
    error_log("PHP Error: $errstr in $errfile on line $errline");
    echo json_encode($error);
    exit(1);
}

function handleException($e) {
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

// Get user territori based on groups
function getUserTerritori($pdo, $userId) {
    $stmt = $pdo->prepare("
        SELECT DISTINCT t.id
        FROM territorio t
        JOIN t_user_groups ug ON ug.user_id = ?
        JOIN t_groups g ON g.id = ug.group_id
        WHERE g.id = 1 OR g.territorio_id = t.id
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function handleGetAziende($pdo, $userId) {
    $territori = getUserTerritori($pdo, $userId);
    
    $territoriStr = implode(',', $territori);
    $query = "
        SELECT a.*, t.nome as territorio_nome
        FROM aziende a
        LEFT JOIN territorio t ON t.id = a.territorio_id
        WHERE a.territorio_id IN ($territoriStr)
        ORDER BY a.socio_principale
    ";
    
    $stmt = $pdo->query($query);
    $aziende = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'success' => true,
        'data' => $aziende
    ];
}

function handleGetTerritori($pdo, $userId) {
    $territori = getUserTerritori($pdo, $userId);
    $territoriStr = implode(',', $territori);
    
    $query = "SELECT id, nome FROM territorio WHERE id IN ($territoriStr) ORDER BY nome";
    $stmt = $pdo->query($query);
    
    return [
        'success' => true,
        'territori' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

function handleGetTessere($pdo, $aziendaId) {
    $query = "
        SELECT t.*, tt.nome_tessera as tipologia_nome, d.nome as dipendente_nome
        FROM tessere t
        JOIN tipologie_tessere tt ON tt.id = t.tipologia_id
        JOIN dipendenti d ON d.id = t.dipendente_id
        WHERE t.azienda_id = ?
        ORDER BY t.data_attivazione DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$aziendaId]);
    
    return [
        'success' => true,
        'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

function handleGetDipendenti($pdo, $territorioId) {
    $query = "
        SELECT id, nome
        FROM dipendenti
        WHERE territorio_id = ?
        ORDER BY nome
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$territorioId]);
    
    return [
        'success' => true,
        'dipendenti' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

function handleGetTipiTessera($pdo) {
    $query = "SELECT * FROM tipologie_tessere ORDER BY nome_tessera";
    $stmt = $pdo->query($query);
    
    return [
        'success' => true,
        'tipologie' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

function handleInsertAzienda($pdo, $data) {
    $stmt = $pdo->prepare("
        INSERT INTO aziende (codice_fiscale, socio_principale, phone, territorio_id, note)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['codice_fiscale'],
        $data['socio_principale'],
        $data['phone'],
        $data['territorio_id'],
        $data['note']
    ]);
    
    return [
        'success' => true,
        'message' => 'Azienda inserita con successo',
        'id' => $pdo->lastInsertId()
    ];
}

function handleUpdateAzienda($pdo, $data) {
    $stmt = $pdo->prepare("
        UPDATE aziende 
        SET codice_fiscale = ?, 
            socio_principale = ?, 
            phone = ?, 
            territorio_id = ?, 
            note = ?
        WHERE id = ?
    ");
    
    $stmt->execute([
        $data['codice_fiscale'],
        $data['socio_principale'],
        $data['phone'],
        $data['territorio_id'],
        $data['note'],
        $data['id']
    ]);
    
    return [
        'success' => true,
        'message' => 'Azienda aggiornata con successo'
    ];
}

function handleDeleteAzienda($pdo, $id) {
    try {
        $pdo->beginTransaction();

        // Verifica presenza tessere
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM tessere WHERE azienda_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            throw new Exception('Non è possibile eliminare l\'azienda perché ha delle tessere associate');
        }

        // Elimina l'azienda
        $stmt = $pdo->prepare("DELETE FROM aziende WHERE id = ?");
        $stmt->execute([$id]);

        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Azienda eliminata con successo'
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleInsertTessera($pdo, $data) {
    $stmt = $pdo->prepare("
        INSERT INTO tessere (
            codice_tessera, 
            data_attivazione, 
            dipendente_id, 
            azienda_id, 
            tipologia_id,
            flag_pagamento,
            flag_2025,
            note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['codice_tessera'],
        $data['data_attivazione'],
        $data['dipendente_id'],
        $data['azienda_id'],
        $data['tipologia_id'],
        $data['flag_pagamento'],
        $data['flag_2025'],
        $data['note']
    ]);
    
    return [
        'success' => true,
        'message' => 'Tessera inserita con successo',
        'id' => $pdo->lastInsertId()
    ];
}

function handleUpdateTessera($pdo, $data) {
    $stmt = $pdo->prepare("
        UPDATE tessere 
        SET codice_tessera = ?,
            data_attivazione = ?,
            dipendente_id = ?,
            tipologia_id = ?,
            flag_pagamento = ?,
            flag_2025 = ?,
            note = ?
        WHERE id = ? AND azienda_id = ?
    ");
    
    $stmt->execute([
        $data['codice_tessera'],
        $data['data_attivazione'],
        $data['dipendente_id'],
        $data['tipologia_id'],
        $data['flag_pagamento'],
        $data['flag_2025'],
        $data['note'],
        $data['id'],
        $data['azienda_id']
    ]);
    
    return [
        'success' => true,
        'message' => 'Tessera aggiornata con successo'
    ];
}

function handleDeleteTessera($pdo, $id, $aziendaId) {
    $stmt = $pdo->prepare("DELETE FROM tessere WHERE id = ? AND azienda_id = ?");
    $stmt->execute([$id, $aziendaId]);
    
    return [
        'success' => true,
        'message' => 'Tessera eliminata con successo'
    ];
}

try {
    $config = getConfigDB();
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['user'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Mock user ID for testing - in produzione prenderlo dalla sessione
    $userId = 1;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'getAziende':
                $result = handleGetAziende($pdo, $userId);
                break;

            case 'getTerritori':
                $result = handleGetTerritori($pdo, $userId);
                break;

            case 'getTessere':
                if (!isset($_GET['azienda_id'])) {
                    throw new Exception('ID azienda mancante');
                }
                $result = handleGetTessere($pdo, $_GET['azienda_id']);
                break;

            case 'getDipendenti':
                if (!isset($_GET['territorio_id'])) {
                    throw new Exception('ID territorio mancante');
                }
                $result = handleGetDipendenti($pdo, $_GET['territorio_id']);
                break;

            case 'getTipiTessera':
                $result = handleGetTipiTessera($pdo);
                break;

            default:
                throw new Exception('Azione non valida');
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['action'])) {
            throw new Exception('Azione non specificata');
        }

        switch ($input['action']) {
            case 'insertAzienda':
                if (!isset($input['data'])) {
                    throw new Exception('Dati mancanti');
                }
                $result = handleInsertAzienda($pdo, $input['data']);
                break;

            case 'updateAzienda':
                if (!isset($input['data']['id'])) {
                    throw new Exception('ID azienda mancante');
                }
                $result = handleUpdateAzienda($pdo, $input['data']);
                break;

            case 'deleteAzienda':
                if (!isset($input['id'])) {
                    throw new Exception('ID azienda mancante');
                }
                $result = handleDeleteAzienda($pdo, $input['id']);
                break;

            case 'insertTessera':
                if (!isset($input['data'])) {
                    throw new Exception('Dati mancanti');
                }
                $result = handleInsertTessera($pdo, $input['data']);
                break;

            case 'updateTessera':
                if (!isset($input['data']['id']) || !isset($input['data']['azienda_id'])) {
                    throw new Exception('Dati mancanti');
                }
                $result = handleUpdateTessera($pdo, $input['data']);
                break;

            case 'deleteTessera':
                if (!isset($input['id']) || !isset($input['azienda_id'])) {
                    throw new Exception('Dati mancanti');
                }
                $result = handleDeleteTessera($pdo, $input['id'], $input['azienda_id']);
                break;

            default:
                throw new Exception('Azione non valida');
        }
    } else {
        throw new Exception('Metodo non supportato');
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

if (ob_get_level()) ob_end_flush();