<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configurazione iniziale
$domainParts = explode('.', $_SERVER['HTTP_HOST']);
$thirdLevelDomain = $domainParts[0];
$config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

if (!$config) {
    error_log("Error loading config file for domain: {$thirdLevelDomain}");
    throw new Exception('Configuration error');
}

if (!isset($config['app']['debug'])) {
    $config['app']['debug'] = false;
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
// Handlers per la Gestione POS
function handleGetPOSList($pdo) {
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
                COALESCE(u.full_name, 'Non Assegnato') as pm_nome,
                i.nome_documento as documento_origine
            FROM tsis_pos_management pm
            LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
            LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
            LEFT JOIN tsis_pm p ON pm.pm_id = p.id
            LEFT JOIN t_users u ON p.user_id = u.id
            LEFT JOIN tsis_pos_imports i ON pm.import_id = i.id
            ORDER BY pm.data_creazione DESC
        ");
        
        $stmt->execute();
        return [
            'success' => true, 
            'data' => $stmt->fetchAll()
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving POS list: ' . $e->getMessage());
    }
}
 
// Nel file b_tsis_coordinator.php
function handleImportPOS($pdo) {
    try {
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);

        // Log dei dati ricevuti per debug
        error_log("Dati ricevuti per import: " . print_r($data, true));

        if (!isset($data['tipo_attivita']) || !isset($data['data']) || !is_array($data['data'])) {
            throw new Exception('Dati di importazione non validi o incompleti');
        }

        $tipoAttivita = $data['tipo_attivita'];
        $codicePOFornitore = $data['codice_po_fornitore'];
        $notes = $data['notes'] ?? '';
        $importData = $data['data'];
        
        $pdo->beginTransaction();
        
        // Crea record importazione
        $stmtImport = $pdo->prepare("
            INSERT INTO tsis_pos_imports (
                nome_documento,
                importato_da,
                stato,
                note_importazione,
                numero_pos,
                data_inizio
            ) VALUES (?, ?, 'in_corso', ?, 0, NOW())
        ");
        
        $stmtImport->execute([
            'Import_' . date('Y-m-d_H-i-s'),
            $_SESSION['user']['id'] ?? null,
            $notes
        ]);
        
        $importId = $pdo->lastInsertId();

        // Prepara statement per inserimento
        $stmt = $pdo->prepare("
            INSERT INTO tsis_pos_management (
                import_id,
                pos_id,
                tipo_attivita_id,
                codice_po_fornitore,
                data_ordine,
                stato,
                commenti_cliente,
                commenti_interni,
                data_creazione,
                data_ultimo_stato
            ) VALUES (
                :import_id,
                :pos_id,
                :tipo_attivita_id,
                :codice_po_fornitore,
                :data_ordine,
                'nuovo',
                :commenti_cliente,
                :commenti_interni,
                NOW(),
                NOW()
            )
        ");

        $successCount = 0;
        $errors = [];

        foreach ($importData as $index => $row) {
            try {
                // Log per debug
                error_log("Elaborazione riga " . ($index + 1) . ": " . print_r($row, true));

                $dataOrdine = $row['data_ordine'] ? convertDate($row['data_ordine']) : null;
                if ($row['data_ordine'] && !$dataOrdine) {
                    throw new Exception("Formato data non valido: " . $row['data_ordine']);
                }

                $anagraficaId = getOrCreateAnagrafica($pdo, [
                    'nome_pos' => $row['nome_pos'],
                    'territorio' => $row['territorio'] ?? null,
                    'distretto' => $row['distretto'] ?? null,
                    'prov' => $row['prov'] ?? null,
                    'rrp_segment' => $row['rrp_segment'] ?? null
                ]);

                $params = [
                    ':import_id' => $importId,
                    ':pos_id' => $anagraficaId,
                    ':tipo_attivita_id' => $tipoAttivita,
                    ':codice_po_fornitore' => $codicePOFornitore,
                    ':data_ordine' => $dataOrdine,
                    ':commenti_cliente' => $row['commenti'] ?? null,
                    ':commenti_interni' => "Import automatico\n" . ($row['note_importazione'] ?? '')
                ];

                // Log parametri query
                error_log("Parametri query: " . print_r($params, true));

                $stmt->execute($params);
                $successCount++;

                // Log successo
                error_log("Record inserito con successo. Conteggio attuale: $successCount");

            } catch (Exception $e) {
                $errors[] = [
                    'row' => $index + 1,
                    'error' => $e->getMessage(),
                    'data' => $row
                ];
                
                error_log(sprintf(
                    "Errore importazione riga %d: %s\nDati: %s",
                    $index + 1,
                    $e->getMessage(),
                    json_encode($row)
                ));
            }
        }

        // Aggiorna stato importazione con il conteggio corretto
        $finalState = count($errors) > 0 ? 'completato_con_errori' : 'completato';
        $stmtUpdateImport = $pdo->prepare("
            UPDATE tsis_pos_imports
            SET stato = ?,
                numero_pos = ?,
                data_completamento = NOW()
            WHERE id = ?
        ");
        
        $stmtUpdateImport->execute([$finalState, $successCount, $importId]);

        // Verifica finale del conteggio
        $stmtCount = $pdo->prepare("
            SELECT COUNT(*) FROM tsis_pos_management 
            WHERE import_id = ?
        ");
        $stmtCount->execute([$importId]);
        $finalCount = $stmtCount->fetchColumn();

        error_log("Conteggio finale record importati: $finalCount");

        $pdo->commit();

        return [
            'success' => true,
            'message' => "Importazione completata",
            'details' => [
                'richiesti' => count($importData),
                'importati' => $successCount,
                'verificati' => $finalCount,
                'errori' => count($errors),
                'errori_dettagli' => $errors
            ]
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Errore importazione: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
        throw new Exception('Errore durante l\'importazione: ' . $e->getMessage());
    }
}
function handleGetUsers($pdo) {
    try {
        // Query per ottenere gli utenti attivi che non sono già PM
        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name 
            FROM t_users u
            LEFT JOIN tsis_pm p ON u.id = p.user_id
            WHERE u.is_active = 1 
            AND p.id IS NULL
            ORDER BY u.full_name
        ");
        
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'users' => $users
        ];
    } catch (Exception $e) {
        error_log("Error getting users: " . $e->getMessage());
        throw new Exception('Errore nel recupero degli utenti: ' . $e->getMessage());
    }
}
// Main deletion handler function
function handleDeletePOS($pdo, $data) {
    if (!isset($data['pos_ids']) || !is_array($data['pos_ids']) || empty($data['pos_ids'])) {
        throw new Exception('Nessun POS selezionato per l\'eliminazione');
    }

    try {
        $pdo->beginTransaction();

        // Validate existence and state of selected POS
        $posIds = array_map('intval', $data['pos_ids']);
        $placeholders = str_repeat('?,', count($posIds) - 1) . '?';
        
        $stmtCheck = $pdo->prepare("
            SELECT pm.id, pm.stato, pm.pm_id, 
                   a.nome_account, pm.codice_ordine,
                   CASE WHEN pm.stato = 'in_lavorazione' THEN 1 ELSE 0 END as non_deletable
            FROM tsis_pos_management pm
            LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
            WHERE pm.id IN ($placeholders)
        ");
        
        $stmtCheck->execute($posIds);
        $posToProcess = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);

        // Separate deletable and non-deletable records
        $canDelete = [];
        $nonDeletable = [];
        foreach ($posToProcess as $pos) {
            if ($pos['non_deletable']) {
                $nonDeletable[] = $pos;
            } else {
                $canDelete[] = $pos['id'];
            }
        }

        if (empty($canDelete)) {
            throw new Exception('Nessun POS può essere eliminato - tutti gli ordini selezionati sono in lavorazione');
        }

        // Log deletions before executing them
        $timestamp = date('Y-m-d H:i:s');
        $userId = $_SESSION['user']['id'] ?? null;
        
        // Log each POS deletion
        $stmtLog = $pdo->prepare("
            INSERT INTO tsis_pos_log (
                pos_id,
                tipo_operazione,
                dati_precedenti,
                motivo_operazione,
                utente_id,
                data_operazione
            ) VALUES (?, 'DELETE', ?, ?, ?, ?)
        ");

        foreach ($canDelete as $posId) {
            // Get current POS data for logging
            $stmtPOS = $pdo->prepare("
                SELECT pm.*, a.nome_account
                FROM tsis_pos_management pm
                LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
                WHERE pm.id = ?
            ");
            $stmtPOS->execute([$posId]);
            $posData = $stmtPOS->fetch(PDO::FETCH_ASSOC);

            // Log the deletion
            $stmtLog->execute([
                $posId,
                json_encode($posData),
                $data['reason'] ?? null,
                $userId,
                $timestamp
            ]);
        }

        // Delete documents if the table exists
        $tableCheckStmt = $pdo->query("SHOW TABLES LIKE 'tsis_documents'");
        if ($tableCheckStmt->rowCount() > 0) {
            $stmtDocs = $pdo->prepare("
                DELETE FROM tsis_documents 
                WHERE pos_management_id IN ($placeholders)
            ");
            $stmtDocs->execute($canDelete);
        }

        // Delete main POS records
        $deletePlaceholders = str_repeat('?,', count($canDelete) - 1) . '?';
        $stmtDelete = $pdo->prepare("
            DELETE FROM tsis_pos_management 
            WHERE id IN ($deletePlaceholders)
        ");
        
        $stmtDelete->execute($canDelete);
        $deletedCount = $stmtDelete->rowCount();

        $pdo->commit();

        // Return detailed results
        return [
            'success' => true,
            'message' => 'Eliminazione completata',
            'details' => [
                'requested' => count($data['pos_ids']),
                'deleted' => $deletedCount,
                'non_deletable' => array_map(function($pos) {
                    return [
                        'id' => $pos['id'],
                        'nome' => $pos['nome_account'],
                        'ordine' => $pos['codice_ordine']
                    ];
                }, $nonDeletable)
            ]
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Errore eliminazione POS: " . $e->getMessage());
        throw new Exception('Errore durante l\'eliminazione dei POS: ' . $e->getMessage());
    }
}

// Helper function to log deletions
function logPOSDeletions($pdo, $posIds, $reason) {
    $timestamp = date('Y-m-d H:i:s');
    $userId = $_SESSION['user']['id'] ?? null;
    
    $stmtLog = $pdo->prepare("
        INSERT INTO tsis_pos_log (
            pos_id,
            tipo_operazione,
            dati_precedenti,
            motivo_operazione,
            utente_id,
            data_operazione
        ) VALUES (?, 'DELETE', ?, ?, ?, ?)
    ");

    foreach ($posIds as $posId) {
        // Get current POS data for logging
        $stmtPOS = $pdo->prepare("
            SELECT pm.*, a.nome_account
            FROM tsis_pos_management pm
            LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
            WHERE pm.id = ?
        ");
        $stmtPOS->execute([$posId]);
        $posData = $stmtPOS->fetch(PDO::FETCH_ASSOC);

        // Log the deletion
        $stmtLog->execute([
            $posId,
            json_encode($posData),
            $reason,
            $userId,
            $timestamp
        ]);
    }
}

// Helper function to delete associated records
function deleteAssociatedRecords($pdo, $posIds) {
    $placeholders = str_repeat('?,', count($posIds) - 1) . '?';
    
    // Delete documents if they exist
    $stmtDocs = $pdo->prepare("
        DELETE FROM tsis_documents 
        WHERE pos_management_id IN ($placeholders)
    ");
    $stmtDocs->execute($posIds);
    
    // Delete status history if it exists
    $stmtHistory = $pdo->prepare("
        DELETE FROM tsis_pos_status_history 
        WHERE pos_id IN ($placeholders)
    ");
    $stmtHistory->execute($posIds);
    
    // Delete assignments if they exist
    $stmtAssign = $pdo->prepare("
        DELETE FROM tsis_pos_assignments 
        WHERE pos_id IN ($placeholders)
    ");
    $stmtAssign->execute($posIds);
}
function convertDate($dateString) {
    if (!$dateString) return null;
    
    // Rimuovi eventuali escape di backslash
    $dateString = str_replace('\\', '', $dateString);
    
    // Array di possibili formati di data in input
    $formats = [
        'm/d/Y',    // 12/17/2024
        'd/m/Y',    // 17/12/2024
        'Y-m-d',    // 2024-12-17
        'Y/m/d'     // 2024/12/17
    ];
    
    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $dateString);
        if ($date && $date->format($format) === $dateString) {
            return $date->format('Y-m-d');
        }
    }
    
    return null;
}


// Handlers per la Gestione PM e Assegnazioni
function handleGetPMList($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                u.full_name,
                COUNT(DISTINCT CASE WHEN pm.stato IN ('assegnato', 'in_lavorazione') 
                    THEN pm.id END) as current_pos_count
            FROM tsis_pm p
            JOIN t_users u ON p.user_id = u.id
            LEFT JOIN tsis_pos_management pm ON p.id = pm.pm_id
            WHERE u.is_active = 1
            GROUP BY p.id, u.full_name
            ORDER BY u.full_name
        ");
        
        $stmt->execute();
        return [
            'success' => true,
            'pms' => $stmt->fetchAll()
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving PM list: ' . $e->getMessage());
    }
 }
 
 function handleAssignPOS($pdo, $data) {
    if (!isset($data['pos_ids']) || !isset($data['pm_id'])) {
        throw new Exception('Missing required data');
    }
 
    try {
        $pdo->beginTransaction();
 
        // Verifica limiti PM
        $stmt = $pdo->prepare("
            SELECT p.*, COUNT(pm.id) as current_pos_count
            FROM tsis_pm p
            JOIN t_users u ON p.user_id = u.id
            LEFT JOIN tsis_pos_management pm ON p.id = pm.pm_id 
                AND pm.stato IN ('assegnato', 'in_lavorazione')
            WHERE p.id = ? AND u.is_active = 1
            GROUP BY p.id
        ");
        
        $stmt->execute([$data['pm_id']]);
        $pm = $stmt->fetch();
 
        if (!$pm) {
            throw new Exception('Invalid PM ID or inactive user');
        }
 
        if (($pm['current_pos_count'] + count($data['pos_ids'])) > $pm['max_pos_assegnabili']) {
            throw new Exception('PM workload limit exceeded');
        }
 
        // Aggiorna assegnazioni
        $updateStmt = $pdo->prepare("
            UPDATE tsis_pos_management 
            SET pm_id = :pm_id,
                stato = 'assegnato',
                data_assegnazione = NOW(),
                data_ultimo_stato = NOW(),
                commenti_interni = CONCAT(COALESCE(commenti_interni, ''), :comment)
            WHERE id = :pos_id AND stato = 'nuovo'
        ");
 
        $timestamp = date('Y-m-d H:i:s');
        $assigned = 0;
        $errors = [];
 
        foreach ($data['pos_ids'] as $posId) {
            try {
                $updateStmt->execute([
                    ':pm_id' => $data['pm_id'],
                    ':comment' => "\n$timestamp - Assegnato a PM - " . ($data['notes'] ?? ''),
                    ':pos_id' => $posId
                ]);
                
                if ($updateStmt->rowCount() > 0) {
                    $assigned++;
                }
            } catch (PDOException $e) {
                $errors[] = "Errore nell'assegnazione del POS ID $posId";
            }
        }
 
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => "$assigned ordini assegnati con successo",
            'errors' => $errors
        ];
 
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
 }
 
 function handleAddPM($pdo, $data) {
    if (!isset($data['user_id'])) {
        throw new Exception('Missing user ID');
    }
 
    try {
        $pdo->beginTransaction();
 
        $stmt = $pdo->prepare("
            INSERT INTO tsis_pm (
                user_id, 
                area_competenza, 
                max_pos_assegnabili, 
                note
            ) VALUES (?, ?, ?, ?)
        ");
 
        $stmt->execute([
            $data['user_id'],
            $data['area_competenza'] ?? null,
            $data['max_pos_assegnabili'] ?? 50,
            $data['note'] ?? null
        ]);
 
        $pdo->commit();
        return ['success' => true];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error adding PM: ' . $e->getMessage());
    }
 }
 
 function handleDeletePM($pdo, $data) {
    if (!isset($data['pm_id'])) {
        throw new Exception('Missing PM ID');
    }
 
    try {
        $pdo->beginTransaction();
 
        // Reset assegnazioni POS
        $stmt = $pdo->prepare("
            UPDATE tsis_pos_management 
            SET pm_id = NULL,
                stato = 'nuovo',
                data_ultimo_stato = NOW(),
                commenti_interni = CONCAT(COALESCE(commenti_interni, ''), '\nPM rimosso dal sistema')
            WHERE pm_id = ?
        ");
        $stmt->execute([$data['pm_id']]);
 
        // Elimina PM
        $stmt = $pdo->prepare("DELETE FROM tsis_pm WHERE id = ?");
        $stmt->execute([$data['pm_id']]);
 
        $pdo->commit();
        return ['success' => true];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error deleting PM: ' . $e->getMessage());
    }
 }
 // Handlers per la Gestione Tipi Attività
 function handleGetTipiAttivita($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                ta.id,
                ta.codice,
                ta.descrizione,
                COUNT(DISTINCT pm.id) as num_ordini
            FROM tsis_attivita_ordine_pos ta
            LEFT JOIN tsis_pos_management pm ON ta.id = pm.tipo_attivita_id
            WHERE ta.attivo = 1
            GROUP BY ta.id, ta.codice, ta.descrizione
            ORDER BY ta.codice
        ");
        
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $data
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving activity types: ' . $e->getMessage());
    }
}
 
function handleAddTipoAttivita($pdo, $data) {
    if (!isset($data['codice']) || !isset($data['descrizione'])) {
        throw new Exception('Missing required fields');
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO tsis_attivita_ordine_pos (
                codice, 
                descrizione,
                attivo
            ) VALUES (?, ?, 1)
        ");
        
        $stmt->execute([
            $data['codice'],
            $data['descrizione']
        ]);

        return [
            'success' => true,
            'id' => $pdo->lastInsertId()
        ];
    } catch (Exception $e) {
        throw new Exception('Error adding activity type: ' . $e->getMessage());
    }
}
 
function handleDeleteTipoAttivita($pdo, $data) {
    if (!isset($data['id'])) {
        throw new Exception('Missing activity type ID');
    }

    try {
        // Soft delete - set attivo = 0
        $stmt = $pdo->prepare("
            UPDATE tsis_attivita_ordine_pos 
            SET attivo = 0 
            WHERE id = ?
        ");
        
        $stmt->execute([$data['id']]);
        return ['success' => true];
    } catch (Exception $e) {
        throw new Exception('Error deleting activity type: ' . $e->getMessage());
    }
}
 
 // Handlers per la Gestione Stati e Note
 function handleUpdatePOSStatus($pdo, $data) {
    if (!isset($data['pos_ids']) || !isset($data['status']) || !isset($data['reason'])) {
        throw new Exception('Missing required data');
    }
 
    try {
        $pdo->beginTransaction();
 
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
            WHERE id = :id
        ");
 
        $timestamp = date('Y-m-d H:i:s');
        $updated = 0;
        $errors = [];
 
        foreach ($data['pos_ids'] as $posId) {
            try {
                $params = [
                    ':status' => $data['status'],
                    ':status2' => $data['status'],
                    ':status3' => $data['status'],
                    ':reason1' => $data['reason'],
                    ':reason2' => $data['reason'],
                    ':comment' => "\n$timestamp - Cambio stato a {$data['status']} - {$data['reason']}",
                    ':id' => $posId
                ];
                
                $updateStmt->execute($params);
                
                if ($updateStmt->rowCount() > 0) {
                    $updated++;
                }
            } catch (PDOException $e) {
                $errors[] = "Errore nell'aggiornamento del POS ID $posId";
            }
        }
 
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => "$updated ordini aggiornati con successo",
            'errors' => $errors
        ];
 
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
 }
 // Handlers per l'Anagrafica
 function handleGetAnagrafica($pdo) {
    try {
        // Verifica la struttura della tabella
        $columnsQuery = "SHOW COLUMNS FROM tsis_anagrafica";
        $columnsStmt = $pdo->query($columnsQuery);
        $tableColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Log delle colonne disponibili
        error_log("Colonne disponibili nella tabella: " . implode(", ", $tableColumns));
        
        // Colonne base sempre presenti
        $requiredColumns = ['id', 'nome_account'];
        
        // Colonne opzionali da includere se presenti
        $optionalColumns = [
            'sf_region',
            'sf_district',
            'sf_territory',
            'tipo_di_record_account',
            'rrp_segment',
            'trade',
            'cap',
            'provincia',
            'citta',
            'indirizzo',
            'telefono',
            'mobile',
            'email',
            'field_rep',
            'numero_field_rep',
            'supervisor',
            'numero_supervisor',
            'data_creazione',
            'data_modifica'
        ];
        
        // Costruisci lista colonne per la SELECT
        $selectColumns = array_merge($requiredColumns, 
            array_filter($optionalColumns, function($col) use ($tableColumns) {
                return in_array($col, $tableColumns);
            })
        );
        
        // Ottieni parametri di paginazione e filtro
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $size = isset($_GET['size']) ? max(1, intval($_GET['size'])) : 50;
        $filter = $_GET['filter'] ?? '';
        
        $offset = ($page - 1) * $size;
        
        // Costruisci la query base
        $baseQuery = "FROM tsis_anagrafica";
        $whereConditions = [];
        $params = [];
        
        // Aggiungi condizioni di filtro se presenti
        if ($filter) {
            $filterConditions = [];
            $filterColumns = ['nome_account', 'sf_region', 'sf_district', 'sf_territory', 'rrp_segment'];
            
            foreach ($filterColumns as $col) {
                if (in_array($col, $tableColumns)) {
                    $filterConditions[] = "LOWER($col) LIKE :filter";
                }
            }
            
            if (!empty($filterConditions)) {
                $whereConditions[] = "(" . implode(" OR ", $filterConditions) . ")";
                $params[':filter'] = "%" . strtolower($filter) . "%";
            }
        }
        
        // Aggiungi WHERE se necessario
        if (!empty($whereConditions)) {
            $baseQuery .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        // Conta totale record
        $countQuery = "SELECT COUNT(*) " . $baseQuery;
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Query principale
        $query = "SELECT " . implode(", ", $selectColumns) . " " . 
                 $baseQuery . " ORDER BY nome_account LIMIT :limit OFFSET :offset";
        
        error_log("Query generata: " . $query); // Debug
        
        $stmt = $pdo->prepare($query);
        
        // Bind dei parametri
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->bindValue(':limit', $size, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'size' => $size,
            'pages' => ceil($total / $size),
            'columns' => $selectColumns // Include le colonne effettivamente utilizzate
        ];
        
    } catch (Exception $e) {
        error_log("Errore in handleGetAnagrafica: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        return [
            'success' => false,
            'error' => 'Errore nel recupero dell\'anagrafica: ' . $e->getMessage(),
            'debug' => [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'available_columns' => $tableColumns ?? []
            ]
        ];
    }
}
 // Completamento delle funzioni di backend per la gestione dei tipi attività

function handleDeleteActivityType($pdo, $data) {
    if (!isset($data['id'])) {
        throw new Exception('ID tipo attività mancante');
    }

    try {
        $pdo->beginTransaction();

        // Verifica esistenza
        $checkStmt = $pdo->prepare("
            SELECT id FROM tsis_attivita_ordine_pos 
            WHERE id = ? AND attivo = 1
        ");
        $checkStmt->execute([$data['id']]);
        if (!$checkStmt->fetch()) {
            throw new Exception('Tipo attività non trovato');
        }

        // Verifica se ci sono ordini associati
        $checkOrdersStmt = $pdo->prepare("
            SELECT COUNT(*) FROM tsis_pos_management 
            WHERE tipo_attivita_id = ?
        ");
        $checkOrdersStmt->execute([$data['id']]);
        if ($checkOrdersStmt->fetchColumn() > 0) {
            throw new Exception('Impossibile eliminare: esistono ordini associati a questo tipo attività');
        }

        // Soft delete
        $stmt = $pdo->prepare("
            UPDATE tsis_attivita_ordine_pos 
            SET attivo = 0,
                data_cancellazione = NOW(),
                utente_cancellazione = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $_SESSION['user']['id'] ?? null,
            $data['id']
        ]);

        // Log della modifica
        $logStmt = $pdo->prepare("
            INSERT INTO tsis_activity_log (
                tipo_operazione,
                tabella,
                record_id,
                dettagli,
                utente_id,
                data_operazione
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ");

        $logStmt->execute([
            'DELETE',
            'tsis_attivita_ordine_pos',
            $data['id'],
            'Soft delete tipo attività',
            $_SESSION['user']['id'] ?? null
        ]);

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Tipo attività eliminato con successo'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Errore nell\'eliminazione del tipo attività: ' . $e->getMessage());
    }
}

function validateActivityType($data) {
    $errors = [];

    // Validazione codice
    if (empty($data['codice'])) {
        $errors[] = 'Il codice è obbligatorio';
    } elseif (strlen($data['codice']) > 50) {
        $errors[] = 'Il codice non può superare i 50 caratteri';
    } elseif (!preg_match('/^[A-Za-z0-9_-]+$/', $data['codice'])) {
        $errors[] = 'Il codice può contenere solo lettere, numeri, underscore e trattini';
    }

    // Validazione descrizione
    if (empty($data['descrizione'])) {
        $errors[] = 'La descrizione è obbligatoria';
    } elseif (strlen($data['descrizione']) > 255) {
        $errors[] = 'La descrizione non può superare i 255 caratteri';
    }

    return $errors;
}

function getActivityTypeDetails($pdo, $id) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                ta.*,
                COUNT(DISTINCT pm.id) as num_ordini,
                COUNT(DISTINCT CASE WHEN pm.stato NOT IN ('completato', 'non_lavorabile') 
                    THEN pm.id END) as ordini_attivi,
                u_c.full_name as creato_da,
                u_m.full_name as modificato_da
            FROM tsis_attivita_ordine_pos ta
            LEFT JOIN tsis_pos_management pm ON ta.id = pm.tipo_attivita_id
            LEFT JOIN t_users u_c ON ta.utente_creazione = u_c.id
            LEFT JOIN t_users u_m ON ta.utente_modifica = u_m.id
            WHERE ta.id = ? AND ta.attivo = 1
            GROUP BY ta.id
        ");
        
        $stmt->execute([$id]);
        $result = $stmt->fetch();

        if (!$result) {
            throw new Exception('Tipo attività non trovato');
        }

        // Aggiungi statistiche aggiuntive
        $statsStmt = $pdo->prepare("
            SELECT 
                stato,
                COUNT(*) as conteggio
            FROM tsis_pos_management
            WHERE tipo_attivita_id = ?
            GROUP BY stato
        ");
        $statsStmt->execute([$id]);
        $result['statistiche'] = $statsStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'success' => true,
            'data' => $result
        ];

    } catch (Exception $e) {
        throw new Exception('Errore nel recupero dei dettagli del tipo attività: ' . $e->getMessage());
    }
}

function handleBulkUpdateActivityTypes($pdo, $data) {
    if (!isset($data['ids']) || !is_array($data['ids']) || empty($data['ids'])) {
        throw new Exception('Nessun tipo attività selezionato');
    }

    try {
        $pdo->beginTransaction();

        $updateData = array_intersect_key($data, array_flip(['descrizione', 'attivo']));
        if (empty($updateData)) {
            throw new Exception('Nessun campo da aggiornare');
        }

        // Costruisci query di update
        $setClauses = [];
        $params = [];
        foreach ($updateData as $field => $value) {
            $setClauses[] = "$field = ?";
            $params[] = $value;
        }
        
        // Aggiungi timestamp e utente
        $setClauses[] = "data_modifica = NOW()";
        $setClauses[] = "utente_modifica = ?";
        $params[] = $_SESSION['user']['id'] ?? null;

        // Aggiungi IDs alla fine dei parametri
        $params = array_merge($params, $data['ids']);

        $sql = "UPDATE tsis_attivita_ordine_pos 
                SET " . implode(", ", $setClauses) . "
                WHERE id IN (" . str_repeat('?,', count($data['ids'])-1) . "?)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Log delle modifiche
        $logStmt = $pdo->prepare("
            INSERT INTO tsis_activity_log (
                tipo_operazione,
                tabella,
                record_id,
                dettagli,
                utente_id,
                data_operazione
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ");

        foreach ($data['ids'] as $id) {
            $logStmt->execute([
                'UPDATE',
                'tsis_attivita_ordine_pos',
                $id,
                'Aggiornamento massivo tipo attività',
                $_SESSION['user']['id'] ?? null
            ]);
        }

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Tipi attività aggiornati con successo',
            'updated' => $stmt->rowCount()
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Errore nell\'aggiornamento dei tipi attività: ' . $e->getMessage());
    }
}

function handleImportAnagrafica($pdo, $data) {
    $logPrefix = '[ANAGRAFICA IMPORT]';
    $importId = uniqid('IMP_');
    $logFile = "../logs/anagrafica_import_{$importId}.log";
    
    function writeLog($message, $logFile, $prefix) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $prefix $message" . PHP_EOL;
        error_log($logMessage);
        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }

    try {
        writeLog("Starting import process with ID: $importId", $logFile, $logPrefix);
        
        // Validate input data
        $importData = json_decode($data['data'] ?? '', true);
        if (!is_array($importData)) {
            writeLog("Invalid data format received", $logFile, $logPrefix);
            throw new Exception('Invalid import data format');
        }

        writeLog("Received " . count($importData) . " records to process", $logFile, $logPrefix);

        // Start transaction
        $pdo->beginTransaction();
        writeLog("Transaction started", $logFile, $logPrefix);

        // Get database columns
        $columnsStmt = $pdo->query("SHOW COLUMNS FROM tsis_anagrafica");
        $availableColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
        writeLog("Available columns: " . implode(", ", $availableColumns), $logFile, $logPrefix);

        // Define updateable columns
        $updateColumns = array_intersect([
            'sf_region',
            'sf_district', 
            'sf_territory',
            'tipo_di_record_account',
            'rrp_segment',
            'trade',
            'cap_spedizioni',
            'statoprovincia_spedizioni',
            'citt_spedizioni',
            'indirizzo_spedizioni',
            'telefono',
            'mobile',
            'email',
            'field_rep',
            'numero_field_rep',
            'supervisor',
            'numero_supervisor'
        ], $availableColumns);

        writeLog("Columns to update: " . implode(", ", $updateColumns), $logFile, $logPrefix);

        // Prepare statements
        $checkStmt = $pdo->prepare("SELECT id FROM tsis_anagrafica WHERE nome_account = ?");
        
        // Build UPDATE query
        $updateSQL = "UPDATE tsis_anagrafica SET " . 
            implode(" = ?, ", $updateColumns) . " = ?, data_modifica = NOW() WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSQL);
        writeLog("Prepared UPDATE statement: $updateSQL", $logFile, $logPrefix);
        
        // Build INSERT query
        $insertSQL = "INSERT INTO tsis_anagrafica (nome_account, " . 
            implode(", ", $updateColumns) . ", data_creazione, data_modifica) VALUES (?" . 
            str_repeat(", ?", count($updateColumns)) . ", NOW(), NOW())";
        $insertStmt = $pdo->prepare($insertSQL);
        writeLog("Prepared INSERT statement: $insertSQL", $logFile, $logPrefix);

        $stats = [
            'total' => count($importData),
            'processed' => 0,
            'inserted' => 0,
            'updated' => 0,
            'errors' => [],
            'start_time' => microtime(true)
        ];

        foreach ($importData as $index => $record) {
            $recordLog = "[Record $index]";
            try {
                if (empty($record['nome_account'])) {
                    $error = "$recordLog Missing nome_account";
                    $stats['errors'][] = $error;
                    writeLog($error, $logFile, $logPrefix);
                    continue;
                }

                writeLog("$recordLog Processing: {$record['nome_account']}", $logFile, $logPrefix);

                // Check existing record
                $checkStmt->execute([$record['nome_account']]);
                $existingId = $checkStmt->fetchColumn();

                // Prepare parameters
                $params = [];
                foreach ($updateColumns as $column) {
                    $params[] = $record[$column] ?? null;
                }

                if ($existingId) {
                    writeLog("$recordLog Updating existing record ID: $existingId", $logFile, $logPrefix);
                    $params[] = $existingId;
                    $updateStmt->execute($params);
                    $stats['updated']++;
                } else {
                    writeLog("$recordLog Inserting new record", $logFile, $logPrefix);
                    array_unshift($params, $record['nome_account']);
                    $insertStmt->execute($params);
                    $stats['inserted']++;
                }
                
                $stats['processed']++;

                // Log progress
                if ($stats['processed'] % 100 === 0) {
                    $progress = ($stats['processed'] / $stats['total']) * 100;
                    $elapsed = microtime(true) - $stats['start_time'];
                    $rate = $stats['processed'] / $elapsed;
                    writeLog(sprintf(
                        "Progress: %.1f%% (%d/%d) - %.1f records/sec",
                        $progress,
                        $stats['processed'],
                        $stats['total'],
                        $rate
                    ), $logFile, $logPrefix);
                }

            } catch (Exception $e) {
                $error = "$recordLog Error processing {$record['nome_account']}: " . $e->getMessage();
                $stats['errors'][] = $error;
                writeLog($error, $logFile, $logPrefix);
            }
        }

        $pdo->commit();
        writeLog("Transaction committed successfully", $logFile, $logPrefix);
        
        // Calculate final statistics
        $stats['end_time'] = microtime(true);
        $stats['duration'] = $stats['end_time'] - $stats['start_time'];
        $stats['records_per_second'] = $stats['processed'] / $stats['duration'];

        $summary = sprintf(
            "Import completed in %.1f seconds:\n" .
            "- Processed: %d records (%.1f records/sec)\n" .
            "- Inserted: %d\n" .
            "- Updated: %d\n" .
            "- Errors: %d",
            $stats['duration'],
            $stats['processed'],
            $stats['records_per_second'],
            $stats['inserted'],
            $stats['updated'],
            count($stats['errors'])
        );

        writeLog($summary, $logFile, $logPrefix);

        return [
            'success' => true,
            'message' => 'Import completed successfully',
            'stats' => $stats,
            'logFile' => basename($logFile)
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
            writeLog("Transaction rolled back due to error", $logFile, $logPrefix);
        }
        
        $error = "Fatal error: " . $e->getMessage() . "\n" . $e->getTraceAsString();
        writeLog($error, $logFile, $logPrefix);
        
        throw new Exception('Import failed: ' . $e->getMessage());
    }
}

function logPOSOperations($pdo, $posIds, $operation, $reason = null) {
    $stmtLog = $pdo->prepare("
        INSERT INTO tsis_pos_log (
            pos_id,
            tipo_operazione,
            dati_precedenti,
            motivo_operazione,
            utente_id,
            data_operazione
        ) VALUES (?, ?, ?, ?, ?, NOW())
    ");

    foreach ($posIds as $posId) {
        $stmtLog->execute([
            $posId,
            $operation,
            json_encode(getPOSDetails($pdo, $posId)),
            $reason,
            $_SESSION['user']['id'] ?? null
        ]);
    }
}

function deletePOSRecords($pdo, $posIds) {
    // Elimina documenti associati
    $placeholders = str_repeat('?,', count($posIds) - 1) . '?';
    
    $stmtDeleteDocs = $pdo->prepare("
        DELETE FROM tsis_documents 
        WHERE pos_management_id IN ($placeholders)
    ");
    $stmtDeleteDocs->execute($posIds);

    // Elimina i POS
    $stmtDelete = $pdo->prepare("
        DELETE FROM tsis_pos_management 
        WHERE id IN ($placeholders)
    ");
    
    $stmtDelete->execute($posIds);

    return $stmtDelete->rowCount();
}
function getPOSDetails($pdo, $posId) {
    $stmt = $pdo->prepare("
        SELECT pm.*, a.nome_account
        FROM tsis_pos_management pm
        LEFT JOIN tsis_anagrafica a ON pm.pos_id = a.id
        WHERE pm.id = ?
    ");
    
    $stmt->execute([$posId]);
    return $stmt->fetch();
}
 // Funzioni di utilità e gestione documentale
function getOrCreateAnagrafica($pdo, $data) {
    $stmt = $pdo->prepare("
        SELECT id FROM tsis_anagrafica 
        WHERE nome_account = ?
        LIMIT 1
    ");
    
    $stmt->execute([$data['nome_pos']]);
    $result = $stmt->fetch();
 
    if ($result) {
        return $result['id'];
    }
 
    $stmt = $pdo->prepare("
        INSERT INTO tsis_anagrafica (
            nome_account,
            sf_region,
            sf_district,
            sf_territory,
            rrp_segment,
            trade
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");
 
    $stmt->execute([
        $data['nome_pos'],
        $data['sf_region'] ?? null,
        $data['sf_district'] ?? null,
        $data['sf_territory'] ?? null,
        $data['rrp_segment'] ?? null,
        $data['trade'] ?? null
    ]);
 
    return $pdo->lastInsertId();
 }
 
 function handleGetTaskTemplates($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                t.*,
                ta.codice as tipo_attivita_codice,
                ta.descrizione as tipo_attivita_desc,
                u.full_name as created_by_name
            FROM tsis_pos_task_templates t
            LEFT JOIN tsis_attivita_ordine_pos ta ON t.tipo_attivita_id = ta.id
            LEFT JOIN t_users u ON t.created_by = u.id
            WHERE t.is_active = 1
            ORDER BY t.created_at DESC
        ");
        
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'templates' => $templates
        ];
    } catch (Exception $e) {
        error_log("Error getting task templates: " . $e->getMessage());
        throw new Exception('Errore nel recupero dei template: ' . $e->getMessage());
    }
}

function handleGetTaskTemplate($pdo, $id) {
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM tsis_pos_task_templates 
            WHERE id = ? AND is_active = 1
        ");
        
        $stmt->execute([$id]);
        $template = $stmt->fetch();
        
        if (!$template) {
            throw new Exception('Template non trovato');
        }
        
        return [
            'success' => true,
            'template' => $template
        ];
    } catch (Exception $e) {
        error_log("Error getting task template: " . $e->getMessage());
        throw new Exception('Errore nel recupero del template: ' . $e->getMessage());
    }
}

function handleSaveTaskTemplate($pdo, $data) {
    if (!isset($data['template'])) {
        throw new Exception('Dati template mancanti');
    }
    
    $template = $data['template'];
    
    try {
        $pdo->beginTransaction();
        
        if (isset($template['id'])) {
            // Update existing template
            $stmt = $pdo->prepare("
                UPDATE tsis_pos_task_templates 
                SET name = ?,
                    description = ?,
                    tipo_attivita_id = ?,
                    template_data = ?,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE id = ? AND is_active = 1
            ");
            
            $stmt->execute([
                $template['name'],
                $template['description'] ?? null,
                $template['tipo_attivita_id'],
                $template['template_data'],
                $_SESSION['user']['id'] ?? null,
                $template['id']
            ]);
        } else {
            // Create new template
            $stmt = $pdo->prepare("
                INSERT INTO tsis_pos_task_templates (
                    name,
                    description,
                    tipo_attivita_id,
                    template_data,
                    created_by,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $template['name'],
                $template['description'] ?? null,
                $template['tipo_attivita_id'],
                $template['template_data'],
                $_SESSION['user']['id'] ?? null
            ]);
            
            $template['id'] = $pdo->lastInsertId();
        }
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Template salvato con successo',
            'template_id' => $template['id']
        ];
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error saving task template: " . $e->getMessage());
        throw new Exception('Errore nel salvataggio del template: ' . $e->getMessage());
    }
}

function handleDeleteTaskTemplate($pdo, $data) {
    if (!isset($data['id'])) {
        throw new Exception('ID template mancante');
    }
    
    try {
        // Soft delete
        $stmt = $pdo->prepare("
            UPDATE tsis_pos_task_templates 
            SET is_active = 0,
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([
            $_SESSION['user']['id'] ?? null,
            $data['id']
        ]);
        
        return [
            'success' => true,
            'message' => 'Template eliminato con successo'
        ];
        
    } catch (Exception $e) {
        error_log("Error deleting task template: " . $e->getMessage());
        throw new Exception('Errore nell\'eliminazione del template: ' . $e->getMessage());
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
            case 'deletePOS':
                $result = handleDeletePOS($pdo, $postData);
                break;
            case 'importPOS':
                $result = handleImportPOS($pdo, $postData);
                break;
            case 'assignPOS':
                $result = handleAssignPOS($pdo, $postData);
                break;
            case 'updatePOSStatus':
                $result = handleUpdatePOSStatus($pdo, $postData);
                break;
            case 'updatePOSNotes':
                $result = handleUpdatePOSNotes($pdo, $postData);
                break;
            case 'addPM':
                $result = handleAddPM($pdo, $postData);
                break;
            case 'deletePM':
                $result = handleDeletePM($pdo, $postData);
                break;
            case 'addActivityType':
                $result = handleAddTipoAttivita($pdo, $postData);
                break;
            case 'deleteActivityType':
                $result = handleDeleteTipoAttivita($pdo, $postData);
                break;
            case 'updateActivityType':  // Aggiungi questo case
                $result = handleUpdateActivityType($pdo, $postData);
                break;
            case 'importAnagrafica':
                $result = handleImportAnagrafica($pdo, $postData);
                break;
            case 'clearAnagrafica':
                $result = handleClearAnagrafica($pdo);
                break;
                case 'saveTaskTemplate':
                    $result = handleSaveTaskTemplate($pdo, $postData);
                    break;
                case 'deleteTaskTemplate':
                    $result = handleDeleteTaskTemplate($pdo, $postData);
                    break;
                case 'updatePOCode':
                    if (!isset($postData['pos_id'])) {
                        throw new Exception('ID POS mancante');
                    }
                    
                    try {
                        $stmt = $pdo->prepare("
                            UPDATE tsis_pos_management 
                            SET codice_po_fornitore = ?,
                                data_modifica = NOW(),
                                utente_modifica = ?
                            WHERE id = ?
                        ");
                        
                        $stmt->execute([
                            $postData['codice_po_fornitore'] ?? null,
                            $_SESSION['user']['id'] ?? null,
                            $postData['pos_id']
                        ]);
                
                        if ($stmt->rowCount() === 0) {
                            throw new Exception('POS non trovato o nessuna modifica effettuata');
                        }
                
                        $result = [
                            'success' => true,
                            'message' => 'Codice PO fornitore aggiornato con successo'
                        ];
                    } catch (Exception $e) {
                        throw new Exception('Errore nell\'aggiornamento del codice PO: ' . $e->getMessage());
                    }
                    break;
            default:
                throw new Exception('Invalid action for POST request');
        }
    
    } else {
        switch($_GET['action'] ?? '') {
            case 'getPOSList':
                $result = handleGetPOSList($pdo);
                break;
            case 'getTipiAttivita':
                $result = handleGetTipiAttivita($pdo);
                break;
            case 'getPMList':
                $result = handleGetPMList($pdo);
                break;
            case 'getUsers':
                $result = handleGetUsers($pdo);
                break;
            case 'getAnagrafica':
                $result = handleGetAnagrafica($pdo);
                break;
            case 'getOrderHistory':
                $result = handleGetOrderHistory($pdo, $_GET['pos_id']);
                break;

                case 'getTaskTemplates':
                    $result = handleGetTaskTemplates($pdo);
                    break;
                case 'getTaskTemplate':
                    $result = handleGetTaskTemplate($pdo, $_GET['id']);
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
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
 }



 function saveImportFile($file, $domain) {
    $baseDir = "../../files/{$domain}/PO/";
    
    // Crea la directory se non esiste
    if (!file_exists($baseDir)) {
        mkdir($baseDir, 0755, true);
    }

    // Genera un nome file univoco con timestamp
    $timestamp = date('YmdHis');
    $fileName = $timestamp . '_' . preg_replace('/[^a-zA-Z0-9_.-]/', '', $file['name']);
    $filePath = $baseDir . $fileName;

    // Sposta il file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Errore nel salvataggio del file');
    }

    return [
        'original_name' => $file['name'],
        'saved_name' => $fileName,
        'full_path' => $filePath
    ];
}

function handleUpdateActivityType($pdo, $data) {
    if (!isset($data['id']) || !isset($data['codice']) || !isset($data['descrizione'])) {
        throw new Exception('Dati richiesti mancanti');
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE tsis_attivita_ordine_pos 
            SET codice = ?,
                descrizione = ?,
                data_modifica = NOW(),
                utente_modifica = ?
            WHERE id = ? AND attivo = 1
        ");
        
        $stmt->execute([
            $data['codice'],
            $data['descrizione'],
            $_SESSION['user']['id'] ?? null,
            $data['id']
        ]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Tipo attività non trovato o nessuna modifica effettuata');
        }

        return [
            'success' => true,
            'message' => 'Tipo attività aggiornato con successo'
        ];
    } catch (Exception $e) {
        throw new Exception('Errore nell\'aggiornamento del tipo attività: ' . $e->getMessage());
    }
}
 // Backend: Funzione handleUpdatePOSNotes
 function handleUpdatePOSNotes($pdo, $data) {
    if (!isset($data['pos_id'])) {
        throw new Exception('ID POS mancante');
    }

    try {
        $pdo->beginTransaction();

        // Verifica esistenza POS
        $checkStmt = $pdo->prepare("SELECT id FROM tsis_pos_management WHERE id = ?");
        $checkStmt->execute([$data['pos_id']]);
        if (!$checkStmt->fetch()) {
            throw new Exception('POS non trovato');
        }

        // Aggiorna note
        $updateStmt = $pdo->prepare("
            UPDATE tsis_pos_management 
            SET commenti_cliente = :commenti_cliente,
                commenti_interni = :commenti_interni,
                data_ultimo_stato = NOW()
            WHERE id = :pos_id
        ");

        $params = [
            ':pos_id' => $data['pos_id'],
            ':commenti_cliente' => $data['commenti_cliente'] ?? null,
            ':commenti_interni' => $data['commenti_interni'] ?? null
        ];

        $updateStmt->execute($params);

        // Verifica aggiornamento
        if ($updateStmt->rowCount() === 0) {
            throw new Exception('Nessuna modifica effettuata');
        }

        $pdo->commit();
        return [
            'success' => true,
            'message' => 'Note aggiornate con successo'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Errore nell\'aggiornamento delle note: ' . $e->getMessage());
    }
}

// Backend: Funzione handleUpdatePOS
function handleUpdatePOS($pdo, $data) {
    if (!isset($data['pos_id'])) {
        throw new Exception('ID POS mancante');
    }

    try {
        $pdo->beginTransaction();

        // Verifica esistenza POS
        $checkStmt = $pdo->prepare("SELECT id, stato FROM tsis_pos_management WHERE id = ?");
        $checkStmt->execute([$data['pos_id']]);
        $currentPOS = $checkStmt->fetch();
        
        if (!$currentPOS) {
            throw new Exception('POS non trovato');
        }

        // Prepara i campi da aggiornare
        $updateFields = [];
        $params = [':pos_id' => $data['pos_id']];

        // Aggiorna solo i campi forniti
        $updatableFields = [
            'tipo_attivita_id', 'codice_ordine', 'data_ordine', 
            'stato', 'pm_id', 'commenti_cliente', 'commenti_interni'
        ];

        foreach ($updatableFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        // Aggiunta automatica dei timestamp
        $updateFields[] = "data_ultimo_aggiornamento = NOW()";
        
        if (isset($data['stato']) && $data['stato'] !== $currentPOS['stato']) {
            $updateFields[] = "data_ultimo_stato = NOW()";
            
            // Gestione stati speciali
            if ($data['stato'] === 'standby' && isset($data['motivo_standby'])) {
                $updateFields[] = "motivo_standby = :motivo_standby";
                $params[':motivo_standby'] = $data['motivo_standby'];
            }
            if ($data['stato'] === 'non_lavorabile' && isset($data['motivo_rifiuto'])) {
                $updateFields[] = "motivo_rifiuto = :motivo_rifiuto";
                $params[':motivo_rifiuto'] = $data['motivo_rifiuto'];
            }
        }

        if (empty($updateFields)) {
            throw new Exception('Nessun campo da aggiornare');
        }

        // Esegue l'aggiornamento
        $sql = "UPDATE tsis_pos_management SET " . implode(", ", $updateFields) . " WHERE id = :pos_id";
        $updateStmt = $pdo->prepare($sql);
        $updateStmt->execute($params);

        // Verifica aggiornamento
        if ($updateStmt->rowCount() === 0) {
            throw new Exception('Nessuna modifica effettuata');
        }

        // Log della modifica
        $logStmt = $pdo->prepare("
            INSERT INTO tsis_pos_log (
                pos_id, 
                tipo_modifica, 
                dati_precedenti, 
                dati_nuovi, 
                utente_id, 
                data_modifica
            ) VALUES (?, 'update', ?, ?, ?, NOW())
        ");

        $logStmt->execute([
            $data['pos_id'],
            json_encode($currentPOS),
            json_encode($data),
            $_SESSION['user']['id'] ?? null
        ]);

        $pdo->commit();
        return [
            'success' => true,
            'message' => 'POS aggiornato con successo'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Errore nell\'aggiornamento del POS: ' . $e->getMessage());
    }
}
function handleGetOrderHistory($pdo, $posId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                pm.*,
                ta.codice as tipo_attivita,
                ta.descrizione as tipo_attivita_desc,
                u.full_name as pm_nome,
                a.nome_account
            FROM tsis_pos_management pm
            JOIN tsis_anagrafica a ON pm.pos_id = a.id
            LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
            LEFT JOIN tsis_pm p ON pm.pm_id = p.id
            LEFT JOIN t_users u ON p.user_id = u.id
            WHERE pm.pos_id = ?
            ORDER BY pm.data_creazione DESC
        ");
        
        $stmt->execute([$posId]);
        return [
            'success' => true,
            'data' => $stmt->fetchAll()
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving order history: ' . $e->getMessage());
    }
}
 
 if (ob_get_level()) ob_end_flush();
 ?>