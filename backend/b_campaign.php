<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// All'inizio del file, dopo session_start()
$domainParts = explode('.', $_SERVER['HTTP_HOST']);
$thirdLevelDomain = $domainParts[0];
$config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

if (!$config) {
    error_log("Error loading config file for domain: {$thirdLevelDomain}");
    throw new Exception('Configuration error');
}

// Imposta il debug mode
if (!isset($config['app']['debug'])) {
    $config['app']['debug'] = false;
}

// Debug log per verifica configurazione
if ($config['app']['debug']) {
    error_log("Configuration loaded for domain: {$thirdLevelDomain}");
    error_log("Debug mode enabled");
}



// Set default user if not in session (for development/testing)
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    $_SESSION['user'] = [
        'id' => 1, // Default admin user ID
        'username' => 'admin',
        'role' => 'admin'
    ];
}

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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

function handleGetDashboardStats($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
                COUNT(DISTINCT m.id) as total_sent,
                COUNT(DISTINCT rm.id) as total_received
            FROM t_camp_campaigns c
            LEFT JOIN t_camp_recipients r ON c.id = r.campaign_id
            LEFT JOIN t_camp_messages m ON r.id = m.recipient_id
            LEFT JOIN t_camp_received_messages rm ON r.id = rm.recipient_id
        ");
        
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => [
                'active_campaigns' => (int)$stats['active_campaigns'],
                'total_sent' => (int)$stats['total_sent'],
                'total_received' => (int)$stats['total_received']
            ]
        ];

    } catch (Exception $e) {
        throw new Exception('Error retrieving dashboard stats: ' . $e->getMessage());
    }
}


function handleGetCampaigns($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                c.*,
                COUNT(DISTINCT r.id) as total_recipients,
                COUNT(DISTINCT m.id) as sent_count,
                COUNT(DISTINCT rm.id) as received_count,
                MIN(CASE WHEN c.status = 'active' THEN m.data_msg END) as start_date
            FROM t_camp_campaigns c
            LEFT JOIN t_camp_recipients r ON c.id = r.campaign_id
            LEFT JOIN t_camp_messages m ON r.id = m.recipient_id
            LEFT JOIN t_camp_received_messages rm ON r.id = rm.recipient_id
            GROUP BY c.id
            ORDER BY c.id DESC
        ");
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => $results
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving campaigns: ' . $e->getMessage());
    }
}
function handleGetAvailableTables($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT id, table_name, description FROM t_table ORDER BY description");
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    } catch (Exception $e) {
        throw new Exception('Error retrieving tables: ' . $e->getMessage());
    }
}

function handleGetTableFields($pdo, $tableName) {
    try {
        // Verifica che la tabella esista in t_table
        $stmt = $pdo->prepare("
            SELECT id 
            FROM t_table 
            WHERE table_name = ?
        ");
        $stmt->execute([$tableName]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid table name');
        }

        // Ottieni i campi della tabella - Correzione della query
        $query = "SHOW COLUMNS FROM `" . str_replace('`', '', $tableName) . "`";
        $stmt = $pdo->query($query);
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Identifica i campi telefono
        $phoneFields = [];
        $allFields = [];
        
        foreach ($columns as $column) {
            $fieldName = $column['Field'];
            $isPhone = preg_match('/(phone|telefono|cellulare|mobile|tel)/i', $fieldName);
            
            $allFields[] = [
                'name' => $fieldName,
                'is_phone' => $isPhone,
                'type' => $column['Type']
            ];
            
            if ($isPhone) {
                $phoneFields[] = $fieldName;
            }
        }

        return [
            'success' => true,
            'data' => [
                'fields' => $allFields,
                'phone_fields' => $phoneFields
            ]
        ];
    } catch (Exception $e) {
        throw new Exception('Error analyzing table: ' . $e->getMessage());
    }
}


function handleGetTableRecords($pdo, $tableName) {
    try {
        // Verifica che la tabella esista in t_table
        $stmt = $pdo->prepare("
            SELECT id 
            FROM t_table 
            WHERE table_name = ?
        ");
        $stmt->execute([$tableName]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid table name');
        }

        // Ottieni tutti i record dalla tabella - Correzione della query
        $query = "SELECT * FROM `" . str_replace('`', '', $tableName) . "`";
        $stmt = $pdo->query($query);
        
        return [
            'success' => true,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving records: ' . $e->getMessage());
    }
}
function handleGetAziende($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                a.*,
                t.nome as territorio_nome,
                COALESCE(tess.importo, 0) as ultimo_tesseramento
            FROM aziende a
            LEFT JOIN territorio t ON a.territorio_id = t.id
            LEFT JOIN Tesseramenti tess ON a.codice_fiscale = tess.codice_fiscale
            WHERE a.phone IS NOT NULL 
            AND a.phone != ''
            ORDER BY a.socio_principale
        ");
        
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    } catch (Exception $e) {
        throw new Exception('Error retrieving companies: ' . $e->getMessage());
    }
}
function buildSourceTablesUnion($pdo) {
    $tables = getAllSourceTables($pdo);
    $unions = [];
    
    foreach ($tables as $table) {
        // Get the display name column for each table (could be socio_principale, nome, etc)
        $displayColumn = getDisplayColumnForTable($pdo, $table);
        
        $unions[] = "(SELECT 
            id, 
            '{$table}' as table_name,
            {$displayColumn} as socio_principale 
        FROM {$table})";
    }
    
    return implode(" UNION ALL ", $unions);
}

function getAllSourceTables($pdo) {
    $stmt = $pdo->prepare("
        SELECT DISTINCT source_table 
        FROM t_camp_recipients 
        WHERE source_table IS NOT NULL
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
function getDisplayColumnForTable($pdo, $table) {
    $priorityColumns = ['socio_principale', 'nome', 'denominazione', 'dipendente'];
    
    // Get table columns
    $stmt = $pdo->prepare("SHOW COLUMNS FROM " . $table);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Find first matching priority column
    foreach ($priorityColumns as $column) {
        if (in_array($column, $columns)) {
            return $column;
        }
    }
    
    // Fallback to id if no priority column found
    return 'id';
}
function handleGetTracking($pdo) {
    try {
        $stmt = $pdo->prepare("
            WITH source_data AS (
                SELECT r.id as recipient_id, r.source_table, r.record_id, r.phone,
                       COALESCE(a.socio_principale, d.nome, p.nome) as display_name
                FROM t_camp_recipients r
                LEFT JOIN aziende a ON r.source_table = 'aziende' AND r.record_id = a.id
                LEFT JOIN dipendenti d ON r.source_table = 'dipendenti' AND r.record_id = d.id
                LEFT JOIN phonetest p ON r.source_table = 'phonetest' AND r.record_id = p.id
            )
            
            (SELECT 
                m.id,
                m.campaign_id,
                c.name as campaign_name,
                m.message_content COLLATE utf8mb4_general_ci as message_content,
                r.id as recipient_id,
                m.status as message_status,
                m.data_msg,
                sd.display_name as socio_principale,
                r.phone,
                'sent' as message_type,
                NULL as file_path,
                NULL as file_name
            FROM t_camp_messages m
            JOIN t_camp_campaigns c ON m.campaign_id = c.id
            JOIN t_camp_recipients r ON m.recipient_id = r.id
            JOIN source_data sd ON r.id = sd.recipient_id)
            
            UNION ALL
            
            (SELECT 
                rm.id,
                rm.campaign_id,
                c.name as campaign_name,
                rm.message_content COLLATE utf8mb4_general_ci as message_content,
                r.id as recipient_id,
                'received' as message_status,
                rm.received_at as data_msg,
                sd.display_name as socio_principale,
                r.phone,
                rm.message_type,
                COALESCE(ra.file_path, NULL) as file_path,
                COALESCE(ra.file_name, NULL) as file_name
            FROM t_camp_received_messages rm
            JOIN t_camp_campaigns c ON rm.campaign_id = c.id
            JOIN t_camp_recipients r ON rm.recipient_id = r.id
            JOIN source_data sd ON r.id = sd.recipient_id
            LEFT JOIN t_camp_received_attachments ra ON rm.id = ra.message_id)
            
            ORDER BY data_msg DESC
            LIMIT 1000
        ");
        
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    } catch (Exception $e) {
        throw new Exception('Error retrieving tracking data: ' . $e->getMessage());
    }
}
function handleDuplicateCampaign($pdo, $data) {
    if (!isset($data['campaign_id'])) {
        throw new Exception('Campaign ID required');
    }

    try {
        $pdo->beginTransaction();

        // Ottieni i dettagli della campagna originale
        $stmt = $pdo->prepare("
            SELECT 
                name, 
                source_table,
                description,
                message_template,
                image_path,
                attachment_path
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);
        $originalCampaign = $stmt->fetch();

        if (!$originalCampaign) {
            throw new Exception('Original campaign not found');
        }

        // Crea la nuova campagna
        $stmt = $pdo->prepare("
            INSERT INTO t_camp_campaigns (
                name,
                source_table,
                description,
                message_template,
                image_path,
                attachment_path,
                status,
                created_by,
                updated_by
            ) VALUES (
                :name,
                :source_table,
                :description,
                :message_template,
                :image_path,
                :attachment_path,
                'draft',
                :created_by,
                :updated_by
            )
        ");

        // Usa il nuovo nome se fornito, altrimenti aggiungi "(Copia)" al nome originale
        $newName = $data['new_name'] ?? $originalCampaign['name'] . ' (Copia)';
        
        $stmt->execute([
            'name' => $newName,
            'source_table' => $originalCampaign['source_table'],
            'description' => $originalCampaign['description'],
            'message_template' => $originalCampaign['message_template'],
            'image_path' => duplicateFile($originalCampaign['image_path']),
            'attachment_path' => duplicateFile($originalCampaign['attachment_path']),
            'created_by' => $_SESSION['user']['id'],
            'updated_by' => $_SESSION['user']['id']
        ]);

        $newCampaignId = $pdo->lastInsertId();

        // Duplica i destinatari
        $stmt = $pdo->prepare("
            INSERT INTO t_camp_recipients (
                campaign_id,
                record_id,
                source_table,
                phone,
                status
            )
            SELECT 
                :new_campaign_id,
                record_id,
                source_table,
                phone,
                'pending'
            FROM t_camp_recipients
            WHERE campaign_id = :old_campaign_id
        ");

        $stmt->execute([
            'new_campaign_id' => $newCampaignId,
            'old_campaign_id' => $data['campaign_id']
        ]);

        // Log dell'azione
        logCampaignAction($pdo, $newCampaignId, 'duplicate', 
            "Campaign duplicated from campaign ID: {$data['campaign_id']}");

        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Campaign duplicated successfully',
            'new_campaign_id' => $newCampaignId
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error duplicating campaign: ' . $e->getMessage());
    }
}

function duplicateFile($originalPath) {
    if (empty($originalPath)) {
        return null;
    }

    try {
        $fullPath = "../" . $originalPath;
        if (!file_exists($fullPath)) {
            error_log("Original file not found: $fullPath");
            return null;
        }

        // Genera il nuovo nome file
        $pathInfo = pathinfo($originalPath);
        $newFilename = uniqid() . '_copy_' . $pathInfo['basename'];
        $newPath = $pathInfo['dirname'] . '/' . $newFilename;
        $fullNewPath = "../" . $newPath;

        // Copia il file
        if (!copy($fullPath, $fullNewPath)) {
            error_log("Failed to copy file from $fullPath to $fullNewPath");
            return null;
        }

        return $newPath;

    } catch (Exception $e) {
        error_log("Error duplicating file: " . $e->getMessage());
        return null;
    }
}
function handleGetRecipientMessages($pdo, $recipientId) {
    try {
        $stmt = $pdo->prepare("
            (SELECT 
                m.id,
                m.campaign_id,
                m.data_msg as created_at,
                m.message_content COLLATE utf8mb4_general_ci as message_content,
                m.status as message_status,
                'sent' as type,
                'text' COLLATE utf8mb4_general_ci as message_type,
                NULL as file_path,
                NULL as file_name,
                NULL as metadata
            FROM t_camp_messages m
            WHERE m.recipient_id = ?)
            
            UNION ALL
            
            (SELECT 
                rm.id,
                rm.campaign_id,
                rm.received_at as created_at,
                rm.message_content COLLATE utf8mb4_general_ci as message_content,
                'received' as message_status,
                'received' as type,
                rm.message_type COLLATE utf8mb4_general_ci as message_type,
                ra.file_path,
                ra.file_name,
                rm.metadata
            FROM t_camp_received_messages rm
            LEFT JOIN t_camp_received_attachments ra ON rm.id = ra.message_id
            WHERE rm.recipient_id = ?)
            
            ORDER BY created_at ASC
        ");
        
        $stmt->execute([$recipientId, $recipientId]);
        return [
            'success' => true,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error retrieving recipient messages: ' . $e->getMessage());
    }
}
function handleGetCampaignDetails($pdo, $campaignId) {
    try {
        // Get campaign details first
        $stmt = $pdo->prepare("
            SELECT * 
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$campaignId]);
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$campaign) {
            throw new Exception('Campaign not found');
        }

        // Get columns from source table
        $stmt = $pdo->prepare("SHOW COLUMNS FROM " . str_replace('`', '', $campaign['source_table']));
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Build name field selection
        $nameFields = [];
        $possibleNameFields = ['socio_principale', 'nome', 'denominazione', 'ragione_sociale'];
        foreach ($possibleNameFields as $field) {
            if (in_array($field, $columns)) {
                $nameFields[] = "src.$field";
            }
        }

        $nameSelection = $nameFields ? 
            "COALESCE(" . implode(", ", $nameFields) . ", CONCAT('Record #', r.record_id))" :
            "CONCAT('Record #', r.record_id)";

        // Get recipients - rimossi riferimenti ai pagamenti
        $stmt = $pdo->prepare("
            SELECT 
                r.id,
                r.phone,
                r.status,
                r.record_id,
                $nameSelection as display_name,
                COALESCE(
                    (SELECT COUNT(DISTINCT rm.id)
                     FROM t_camp_received_messages rm
                     WHERE rm.recipient_id = r.id),
                    0
                ) as responses_count
            FROM t_camp_recipients r
            LEFT JOIN " . str_replace('`', '', $campaign['source_table']) . " src ON r.record_id = src.id
            WHERE r.campaign_id = ?
            GROUP BY r.id, r.phone, r.status, r.record_id " . 
            ($nameFields ? ", " . implode(", ", $nameFields) : "")
        );
        
        $stmt->execute([$campaignId]);
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => [
                'campaign' => $campaign,
                'recipients' => $recipients
            ]
        ];

    } catch (Exception $e) {
        throw new Exception('Error retrieving campaign details: ' . $e->getMessage());
    }
}
function handleCreateCampaign($pdo, $data) {
    if (!isset($data['name']) || !isset($data['message_template']) || 
        !isset($data['records']) || !isset($data['source_table']) || 
        !isset($data['phone_field'])) {
        throw new Exception('Missing required parameters');
    }

    try {
        error_log("Starting campaign creation with data: " . print_r($data, true));
        error_log("Files received: " . print_r($_FILES, true));

        $records = json_decode($data['records'], true);
        if (!is_array($records) || empty($records)) {
            throw new Exception('Invalid or empty records data');
        }

        $pdo->beginTransaction();

        // Handle file uploads
        $imagePath = null;
        $attachmentPath = null;

        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            error_log("Processing image upload");
            $imagePath = handleFileUpload($_FILES['image'], 'images');
            error_log("Image path: " . $imagePath);
        }

        if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            error_log("Processing attachment upload");
            $attachmentPath = handleFileUpload($_FILES['attachment'], 'attachments');
            error_log("Attachment path: " . $attachmentPath);
        }

        // Create campaign
        $stmt = $pdo->prepare("
            INSERT INTO t_camp_campaigns (
                name, 
                source_table,
                description,
                message_template, 
                status,
                created_by,
                updated_by,
                image_path,
                attachment_path
            ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
        ");
        
        $params = [
            $data['name'],
            $data['source_table'],
            $data['description'] ?? $data['name'],
            $data['message_template'],
            $_SESSION['user']['id'],
            $_SESSION['user']['id'],
            $imagePath,
            $attachmentPath
        ];

        error_log("Executing campaign insert with params: " . print_r($params, true));
        $stmt->execute($params);

        $campaignId = $pdo->lastInsertId();
        error_log("New campaign ID: " . $campaignId);

        // Add recipients
        $stmt = $pdo->prepare("
            INSERT INTO t_camp_recipients (
                campaign_id,
                record_id,
                source_table,
                phone,
                status
            ) VALUES (?, ?, ?, ?, 'pending')
        ");

        foreach ($records as $recordId) {
            $phoneStmt = $pdo->prepare("SELECT `{$data['phone_field']}` FROM `{$data['source_table']}` WHERE id = ?");
            $phoneStmt->execute([$recordId]);
            $phone = $phoneStmt->fetchColumn();
            
            if ($phone) {
                $stmt->execute([
                    $campaignId,
                    $recordId,
                    $data['source_table'],
                    $phone
                ]);
            }
        }

        logCampaignAction($pdo, $campaignId, 'create', 'Campaign created');

        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Campaign created successfully',
            'campaign_id' => $campaignId
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error creating campaign: " . $e->getMessage());
        throw new Exception('Error creating campaign: ' . $e->getMessage());
    }
}


function generatePaymentLink($campaignId, $aziendaId) {
    return sprintf(
        'https://pay.example.com/tessera/%d/%d/%s',
        $campaignId,
        $aziendaId,
        bin2hex(random_bytes(8))
    );
}
// Aggiungi queste funzioni prima del main request handling

function handleUpdateCampaign($pdo, $data) {
    if (!isset($data['campaign_id']) || 
        !isset($data['message_template']) || 
        !isset($data['source_table']) ||
        !isset($data['phone_field'])) {
        throw new Exception('Missing required parameters');
    }

    try {
        $pdo->beginTransaction();

        // Verifica che la campagna esista ed è in stato draft
        $stmt = $pdo->prepare("
            SELECT id, status, image_path, attachment_path 
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);
        $campaign = $stmt->fetch();

        if (!$campaign) {
            throw new Exception('Campaign not found');
        }

        if ($campaign['status'] !== 'draft') {
            throw new Exception('Only draft campaigns can be updated');
        }

        // Gestione file
        $imagePath = $campaign['image_path'];
        $attachmentPath = $campaign['attachment_path'];

        // Gestisci nuova immagine se caricata
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            // Elimina vecchia immagine se esiste
            if ($imagePath && file_exists("../" . $imagePath)) {
                unlink("../" . $imagePath);
            }
            $imagePath = handleFileUpload($_FILES['image'], 'images');
        }

        // Gestisci nuovo allegato se caricato
        if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            // Elimina vecchio allegato se esiste
            if ($attachmentPath && file_exists("../" . $attachmentPath)) {
                unlink("../" . $attachmentPath);
            }
            $attachmentPath = handleFileUpload($_FILES['attachment'], 'attachments');
        }

        // Aggiorna la campagna
        $stmt = $pdo->prepare("
            UPDATE t_camp_campaigns 
            SET name = :name,
                source_table = :source_table,
                message_template = :message_template,
                image_path = :image_path,
                attachment_path = :attachment_path,
                updated_by = :updated_by,
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'source_table' => $data['source_table'],
            'message_template' => $data['message_template'],
            'image_path' => $imagePath,
            'attachment_path' => $attachmentPath,
            'updated_by' => $_SESSION['user']['id'],
            'id' => $data['campaign_id']
        ]);

        // Aggiorna i destinatari
        if (isset($data['records'])) {
            $records = json_decode($data['records'], true);
            if (!is_array($records)) {
                throw new Exception('Invalid records format');
            }

            // Elimina i vecchi destinatari
            $stmt = $pdo->prepare("DELETE FROM t_camp_recipients WHERE campaign_id = ?");
            $stmt->execute([$data['campaign_id']]);

            // Inserisci i nuovi destinatari
            $stmt = $pdo->prepare("
                INSERT INTO t_camp_recipients (
                    campaign_id,
                    record_id,
                    source_table,
                    phone,
                    payment_link,
                    status
                ) VALUES (?, ?, ?, ?, ?, 'pending')
            ");

            foreach ($records as $recordId) {
                // Ottieni il numero di telefono usando il campo specificato
                $stmt2 = $pdo->prepare("SELECT `{$data['phone_field']}` FROM `{$data['source_table']}` WHERE id = ?");
                $stmt2->execute([$recordId]);
                $phone = $stmt2->fetchColumn();

                if ($phone) {
                    $stmt->execute([
                        $data['campaign_id'],
                        $recordId,
                        $data['source_table'],
                        $phone,
                        generatePaymentLink($data['campaign_id'], $recordId)
                    ]);
                }
            }
        }

        // Log dell'aggiornamento
        logCampaignAction($pdo, $data['campaign_id'], 'update', 'Campaign updated');

        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Campaign updated successfully'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error updating campaign: ' . $e->getMessage());
    }
}

// Funzione helper per ottenere il numero di telefono dal record
function getPhoneNumber($pdo, $tableName, $recordId) {
    try {
        // Prima trova il campo telefono nella tabella
        $stmt = $pdo->prepare("SHOW COLUMNS FROM " . str_replace('`', '', $tableName));
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $phoneField = null;
        foreach ($columns as $column) {
            if (preg_match('/(phone|telefono|cellulare|mobile|tel)/i', $column)) {
                $phoneField = $column;
                break;
            }
        }

        if (!$phoneField) {
            throw new Exception("No phone field found in table $tableName");
        }

        // Ottieni il numero di telefono
        $stmt = $pdo->prepare("SELECT `$phoneField` FROM `$tableName` WHERE id = ?");
        $stmt->execute([$recordId]);
        $phone = $stmt->fetchColumn();

        if (!$phone) {
            throw new Exception("No phone number found for record $recordId");
        }

        return $phone;

    } catch (Exception $e) {
        error_log("Error getting phone number: " . $e->getMessage());
        throw $e;
    }
}


function handleChangeCampaignStatus($pdo, $data) {
    if (!isset($data['campaign_id']) || !isset($data['status'])) {
        throw new Exception('Campaign ID and new status are required');
    }

    $allowedStatuses = ['draft', 'active', 'paused', 'completed', 'failed'];
    if (!in_array($data['status'], $allowedStatuses)) {
        throw new Exception('Invalid status value');
    }

    try {
        $pdo->beginTransaction();

        // Get current campaign status
        $stmt = $pdo->prepare("
            SELECT status, name, message_template 
            FROM t_camp_campaigns 
            WHERE id = ?
            FOR UPDATE
        ");
        $stmt->execute([$data['campaign_id']]);
        $campaign = $stmt->fetch();

        if (!$campaign) {
            throw new Exception('Campaign not found');
        }

        // Validate status transition
        validateStatusTransition($campaign['status'], $data['status']);

        // Update campaign status
        $stmt = $pdo->prepare("
            UPDATE t_camp_campaigns 
            SET status = ?,
                updated_at = NOW(),
                updated_by = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['status'],
            $_SESSION['user']['id'] ?? null,
            $data['campaign_id']
        ]);

        // Log the status change
        logCampaignAction($pdo, $data['campaign_id'], 'status_change', 
            "Status changed from {$campaign['status']} to {$data['status']}");

        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Campaign status updated successfully'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error changing campaign status: ' . $e->getMessage());
    }
}

function validateStatusTransition($currentStatus, $newStatus) {
    $allowedTransitions = [
        'draft' => ['active', 'failed'],
        'active' => ['paused', 'completed', 'failed'],
        'paused' => ['active', 'completed', 'failed'],
        'completed' => ['failed'], // Solo transizione a failed permessa
        'failed' => [] // Nessuna transizione permessa da failed
    ];

    // Se lo stato corrente è già quello richiesto, permettilo
    if ($currentStatus === $newStatus) {
        return true;
    }

    if (!isset($allowedTransitions[$currentStatus]) || 
        !in_array($newStatus, $allowedTransitions[$currentStatus])) {
        throw new Exception("Invalid status transition from $currentStatus to $newStatus");
    }

    return true;
}

function handlePauseCampaign($pdo, $data) {
    if (!isset($data['campaign_id'])) {
        throw new Exception('Campaign ID required');
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            SELECT status 
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);
        $status = $stmt->fetchColumn();

        if (!$status) {
            throw new Exception('Campaign not found');
        }

        if ($status !== 'active') {
            throw new Exception('Only active campaigns can be paused');
        }

        $stmt = $pdo->prepare("
            UPDATE t_camp_campaigns 
            SET status = 'paused',
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Campaign paused successfully'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error pausing campaign: ' . $e->getMessage());
    }
}

function handleResumeCampaign($pdo, $data) {
    if (!isset($data['campaign_id'])) {
        throw new Exception('Campaign ID required');
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            SELECT status 
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);
        $status = $stmt->fetchColumn();

        if (!$status) {
            throw new Exception('Campaign not found');
        }

        if ($status !== 'paused') {
            throw new Exception('Only paused campaigns can be resumed');
        }

        $stmt = $pdo->prepare("
            UPDATE t_camp_campaigns 
            SET status = 'active',
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Campaign resumed successfully'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error resuming campaign: ' . $e->getMessage());
    }
}

function copyToTemp($originalPath, $prefix = '') {
    try {
        // Crea la directory temp se non esiste
        $tempDir = "../uploads/temp";
        if (!file_exists($tempDir)) {
            if (!mkdir($tempDir, 0755, true)) {
                throw new Exception("Cannot create temp directory");
            }
        }

        // Ottieni il nome originale del file (senza il timestamp)
        $originalName = basename($originalPath);
        $cleanName = preg_replace('/^[0-9a-f]+_/', '', $originalName);
        
        // Crea il percorso temporaneo
        $tempPath = $tempDir . "/" . ($prefix ? $prefix . "_" : "") . $cleanName;
        
        // Copia il file
        if (!copy($originalPath, $tempPath)) {
            throw new Exception("Failed to copy file to temp directory");
        }
        
        error_log("File copied to temp: " . $tempPath);
        return $tempPath;
    } catch (Exception $e) {
        error_log("Error in copyToTemp: " . $e->getMessage());
        throw $e;
    }
}
function logCampaignAction($pdo, $campaignId, $action, $description) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO t_camp_logs (
                campaign_id, 
                action_type, 
                description, 
                user_id,
                created_at
            ) VALUES (?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $campaignId,
            $action,
            $description,
            $_SESSION['user']['id'] ?? null
        ]);
    } catch (Exception $e) {
        error_log("Error logging campaign action: " . $e->getMessage());
    }
}
function cleanupTemp($tempPath) {
    try {
        if (file_exists($tempPath)) {
            if (!unlink($tempPath)) {
                error_log("Warning: Failed to delete temp file: " . $tempPath);
            } else {
                error_log("Temp file deleted: " . $tempPath);
            }
        }
    } catch (Exception $e) {
        error_log("Error in cleanupTemp: " . $e->getMessage());
    }
}

function sendUltraMsg($pdo, $phone, $message, $campaign) {
    global $config;
    
    try {
        $phone = normalizePhone($phone);
        $instance = $config['ultraMsg']['instance'];
        $token = $config['ultraMsg']['token'];

        // Send message based on content type
        if (!empty($campaign['image_path'])) {
            // If we have an image, send it with the message as caption
            $imagePath = "../" . $campaign['image_path'];
            if (file_exists($imagePath)) {
                $imageUrl = "http://" . $_SERVER['HTTP_HOST'] . "/" . $campaign['image_path'];
                
                $imageData = [
                    'token' => $token,
                    'to' => $phone,
                    'image' => $imageUrl,
                    'caption' => $message, // Use message as caption
                    'priority' => 1
                ];

                $ch = curl_init("https://api.ultramsg.com/{$instance}/messages/image");
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($imageData),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json']
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode !== 200) {
                    throw new Exception("Failed to send image with caption");
                }
            }
        } else {
            // If no image, send as regular text message
            $textData = [
                'token' => $token,
                'to' => $phone,
                'body' => $message,
                'priority' => 1
            ];

            $ch = curl_init("https://api.ultramsg.com/{$instance}/messages/chat");
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($textData),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json']
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new Exception("Failed to send text message");
            }
        }

        // Send document if present (after main message)
        if (!empty($campaign['attachment_path'])) {
            sleep(1); // Brief pause before sending attachment
            $attachPath = "../" . $campaign['attachment_path'];
            
            if (file_exists($attachPath)) {
                $attachUrl = "http://" . $_SERVER['HTTP_HOST'] . "/" . $campaign['attachment_path'];
                $fileName = basename($campaign['attachment_path']);

                $docData = [
                    'token' => $token,
                    'to' => $phone,
                    'filename' => $fileName,
                    'document' => $attachUrl,
                    'priority' => 1
                ];

                $ch = curl_init("https://api.ultramsg.com/{$instance}/messages/document");
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($docData),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json']
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode !== 200) {
                    throw new Exception("Failed to send document");
                }
            }
        }

        return true;

    } catch (Exception $e) {
        error_log("Error in sendUltraMsg: " . $e->getMessage());
        throw $e;
    }
}
function handleSendMessage($pdo, $data) {
    if (!isset($data['campaign_id'])) {
        throw new Exception('Campaign ID required');
    }

    try {
        $pdo->beginTransaction();

        // Prima otteniamo i dettagli della campagna
        $stmt = $pdo->prepare("
            SELECT source_table 
            FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$campaign) {
            throw new Exception('Campaign not found');
        }

        // Ottieni prossimo destinatario da processare
        $stmt = $pdo->prepare("
            SELECT 
                r.id as recipient_id,
                r.phone,
                r.record_id,
                c.message_template,
                c.id as campaign_id,
                c.image_path,
                c.attachment_path,
                src.*
            FROM t_camp_recipients r
            JOIN t_camp_campaigns c ON r.campaign_id = c.id
            JOIN " . str_replace('`', '', $campaign['source_table']) . " src ON r.record_id = src.id
            WHERE r.campaign_id = ? 
            AND r.status = 'pending'
            LIMIT 1
            FOR UPDATE
        ");
        
        $stmt->execute([$data['campaign_id']]);
        $recipient = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$recipient) {
            // Nessun altro destinatario - segna la campagna come completata
            $stmt = $pdo->prepare("
                UPDATE t_camp_campaigns 
                SET status = 'completed',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$data['campaign_id']]);

            $pdo->commit();
            return [
                'success' => true,
                'completed' => true,
                'message' => 'Campaign completed'
            ];
        }

        // Sostituisci i placeholder nel template
        $messageContent = $recipient['message_template'];
        foreach ($recipient as $key => $value) {
            $placeholder = '{' . $key . '}';
            if (strpos($messageContent, $placeholder) !== false) {
                $messageContent = str_replace($placeholder, $value, $messageContent);
            }
        }

        try {
            // Invia il messaggio usando UltraMsg
            $sent = sendUltraMsg(
                $pdo, 
                $recipient['phone'], 
                $messageContent, 
                [
                    'image_path' => $recipient['image_path'],
                    'attachment_path' => $recipient['attachment_path']
                ]
            );

            if (!$sent) {
                throw new Exception("Message sending failed");
            }

            // Registra il messaggio inviato
            $stmt = $pdo->prepare("
                INSERT INTO t_camp_messages (
                    campaign_id, 
                    recipient_id, 
                    message_content,
                    status,
                    data_msg
                ) VALUES (?, ?, ?, 'sent', NOW())
            ");
            
            $stmt->execute([
                $data['campaign_id'],
                $recipient['recipient_id'],
                $messageContent
            ]);

            // Aggiorna lo stato del destinatario
            $stmt = $pdo->prepare("
                UPDATE t_camp_recipients 
                SET status = 'sent',
                    sent_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$recipient['recipient_id']]);

            $pdo->commit();
            return [
                'success' => true,
                'message' => 'Message sent successfully'
            ];

        } catch (Exception $e) {
            error_log("Error sending message: " . $e->getMessage());
            
            // Registra il tentativo fallito
            $stmt = $pdo->prepare("
                INSERT INTO t_camp_messages (
                    campaign_id, 
                    recipient_id, 
                    message_content,
                    status,
                    error_message,
                    data_msg
                ) VALUES (?, ?, ?, 'failed', ?, NOW())
            ");
            
            $stmt->execute([
                $data['campaign_id'],
                $recipient['recipient_id'],
                $messageContent,
                $e->getMessage()
            ]);

            // Aggiorna lo stato del destinatario
            $stmt = $pdo->prepare("
                UPDATE t_camp_recipients 
                SET status = 'failed'
                WHERE id = ?
            ");
            $stmt->execute([$recipient['recipient_id']]);

            $pdo->commit();
            throw $e;
        }

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error sending message: ' . $e->getMessage());
    }
}

// Helper function to check success response
function isSuccessResponse($result) {
    if ($result === null) return false;
    
    // Check for string "ok"
    if ($result === "ok") return true;
    
    // Check for sent status
    if (isset($result['sent'])) {
        return $result['sent'] === true || 
               $result['sent'] === "true" || 
               strcasecmp($result['sent'], "true") === 0;
    }
    
    // Check for message status
    if (isset($result['message'])) {
        return strcasecmp($result['message'], "ok") === 0;
    }
    
    return false;
}
function prepareMessage($template, $data) {
    return preg_replace_callback(
        '/\{([^}]+)\}/',
        function($matches) use ($data) {
            return $data[$matches[1]] ?? $matches[0];
        },
        $template
    );
}

function normalizePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    
    if (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        throw new Exception('Invalid phone number format');
    }

    if (!str_starts_with($phone, '+')) {
        $phone = '+39' . $phone;
    }

    return $phone;
}

// In b_campaign.php

function handleFileUpload($file, $subDirectory) {
    try {
        // Log iniziale per debug
        error_log("Starting file upload. File info: " . print_r($file, true));
        
        // Ottieni il dominio di terzo livello
        $domainParts = explode('.', $_SERVER['HTTP_HOST']);
        $thirdLevelDomain = $domainParts[0];
        
        // Costruisci il percorso base degli upload
        $baseUploadDir = "../config/{$thirdLevelDomain}/uploads/";
        $uploadDir = $baseUploadDir . $subDirectory . '/';
        
        // Crea le directory se non esistono
        if (!file_exists($baseUploadDir)) {
            if (!mkdir($baseUploadDir, 0755, true)) {
                error_log("Failed to create directory: {$baseUploadDir}");
                throw new Exception('Impossibile creare la directory di base per gli upload');
            }
        }
        
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                error_log("Failed to create directory: {$uploadDir}");
                throw new Exception("Impossibile creare la directory {$subDirectory}");
            }
        }

        error_log("Upload directory created/verified: {$uploadDir}");

        // Validazione file
        $allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $maxSize = 10 * 1024 * 1024; // 10MB

        if ($file['size'] > $maxSize) {
            throw new Exception('File troppo grande. Dimensione massima: 10MB');
        }

        // Se stiamo gestendo un'immagine, verifica il tipo
        if ($subDirectory === 'images' && !in_array($file['type'], $allowedImageTypes)) {
            throw new Exception('Tipo di file non supportato per le immagini');
        }

        // Generazione nome file sicuro
        $fileName = uniqid() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file['name']));
        $filePath = $uploadDir . $fileName;

        error_log("Attempting to move file to: {$filePath}");

        // Spostamento file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            error_log("Failed to move uploaded file. Upload error code: " . $file['error']);
            throw new Exception('Errore nel caricamento del file');
        }

        error_log("File successfully uploaded to: {$filePath}");

        // Restituisci il percorso relativo includendo il terzo livello di dominio
        $relativePath = "config/{$thirdLevelDomain}/uploads/{$subDirectory}/" . $fileName;
        error_log("Returning relative path: {$relativePath}");
        return $relativePath;

    } catch (Exception $e) {
        error_log("File upload error: " . $e->getMessage());
        throw $e;
    }
}


function handleGetMessage($pdo, $messageId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                m.id,
                m.campaign_id,
                m.data_msg,
                m.message_content COLLATE utf8mb4_general_ci as message_content,
                m.status as message_status,
                'sent' COLLATE utf8mb4_general_ci as message_type,
                c.image_path as campaign_image,
                c.attachment_path as campaign_attachment,
                NULL as file_path,
                NULL as file_name,
                NULL as metadata
            FROM t_camp_messages m
            JOIN t_camp_campaigns c ON m.campaign_id = c.id
            WHERE m.id = ?
            
            UNION ALL
            
            SELECT 
                rm.id,
                rm.campaign_id,
                rm.received_at as data_msg,
                rm.message_content COLLATE utf8mb4_general_ci as message_content,
                'received' COLLATE utf8mb4_general_ci as message_status,
                rm.message_type COLLATE utf8mb4_general_ci as message_type,
                NULL as campaign_image,
                NULL as campaign_attachment,
                ra.file_path,
                ra.file_name,
                rm.metadata
            FROM t_camp_received_messages rm
            LEFT JOIN t_camp_received_attachments ra ON rm.id = ra.message_id
            WHERE rm.id = ?
        ");
        
        $stmt->execute([$messageId, $messageId]);
        $message = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$message) {
            throw new Exception('Message not found');
        }
        
        return [
            'success' => true,
            'data' => $message
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error retrieving message: ' . $e->getMessage());
    }
}

function handleGetTipoTessere($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                tt.*,
                COUNT(DISTINCT p.id) as usage_count,
                COALESCE(SUM(p.amount), 0) as total_amount
            FROM tipologie_tessere tt
            LEFT JOIN t_camp_payments p ON tt.id = p.tessera_id AND p.payment_status = 'completed'
            GROUP BY tt.id
            ORDER BY tt.importo ASC
        ");
        
        $stmt->execute();
        $results = $stmt->fetchAll();

        // Calculate percentages if there are any completed payments
        $totalPayments = array_sum(array_column($results, 'usage_count'));
        if ($totalPayments > 0) {
            foreach ($results as &$tessera) {
                $tessera['usage_percentage'] = round(($tessera['usage_count'] / $totalPayments) * 100, 2);
            }
        }

        return [
            'success' => true,
            'data' => $results,
            'summary' => [
                'total_types' => count($results),
                'total_usage' => $totalPayments,
                'total_amount' => array_sum(array_column($results, 'total_amount'))
            ]
        ];

    } catch (Exception $e) {
        throw new Exception('Error retrieving membership types: ' . $e->getMessage());
    }
}

// Aggiungi una funzione helper per ottenere statistiche aggiornate della campagna
function getCampaignStats($pdo, $campaignId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(DISTINCT r.id) as total_recipients,
                COUNT(DISTINCT CASE WHEN m.status IS NOT NULL THEN r.id END) as sent_count,
                COUNT(DISTINCT CASE WHEN p.payment_status = 'completed' THEN p.id END) as paid_count,
                COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount ELSE 0 END), 0) as total_amount,
                MIN(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as has_pending
            FROM t_camp_campaigns c
            LEFT JOIN t_camp_recipients r ON c.id = r.campaign_id
            LEFT JOIN t_camp_payments p ON r.id = p.recipient_id
            WHERE c.id = ?
            GROUP BY c.id
        ");
        
        $stmt->execute([$campaignId]);
        return $stmt->fetch();

    } catch (Exception $e) {
        throw new Exception('Error getting campaign stats: ' . $e->getMessage());
    }
}

function handleDeleteCampaign($pdo, $data) {
    if (!isset($data['campaign_id'])) {
        throw new Exception('Campaign ID required');
    }

    try {
        $pdo->beginTransaction();

        // Get campaign details and file paths
        $stmt = $pdo->prepare("
            SELECT id, name, image_path, attachment_path 
            FROM t_camp_campaigns 
            WHERE id = ?
            FOR UPDATE
        ");
        $stmt->execute([$data['campaign_id']]);
        $campaign = $stmt->fetch();

        if (!$campaign) {
            throw new Exception('Campaign not found');
        }

        // Delete physical files
        $filesToDelete = [];
        if (!empty($campaign['image_path'])) {
            $filesToDelete[] = "../" . $campaign['image_path'];
        }
        if (!empty($campaign['attachment_path'])) {
            $filesToDelete[] = "../" . $campaign['attachment_path'];
        }

        // Delete database records (in correct order due to foreign keys)
        
        // Delete received attachments
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_received_attachments 
            WHERE campaign_id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Delete received messages
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_received_messages 
            WHERE campaign_id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Delete sent messages
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_messages 
            WHERE campaign_id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Delete recipients
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_recipients 
            WHERE campaign_id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Delete logs
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_logs 
            WHERE campaign_id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Finally delete the campaign
        $stmt = $pdo->prepare("
            DELETE FROM t_camp_campaigns 
            WHERE id = ?
        ");
        $stmt->execute([$data['campaign_id']]);

        // Log the deletion
        logCampaignAction($pdo, $data['campaign_id'], 'delete', 
            "Campaign '{$campaign['name']}' and all related data deleted");

        $pdo->commit();

        // After successful database deletion, delete physical files
        foreach ($filesToDelete as $filePath) {
            if (file_exists($filePath)) {
                if (!unlink($filePath)) {
                    error_log("Warning: Failed to delete file: " . $filePath);
                } else {
                    error_log("File deleted successfully: " . $filePath);
                }
            }
        }
        
        return [
            'success' => true,
            'message' => 'Campaign deleted successfully'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error deleting campaign: " . $e->getMessage());
        throw new Exception('Error deleting campaign: ' . $e->getMessage());
    }
}


// Main request handling
try {
    $config = parse_ini_file('../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini', true);
    $pdo = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            // Gestione dei dati del form multipart
            $action = $_POST['action'] ?? '';
            
            // Decodifica l'array delle aziende
            if (isset($_POST['aziende'])) {
                $_POST['aziende'] = json_decode($_POST['aziende'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception('Invalid aziende data format');
                }
            }
    
            // Handle JSON payload for non-multipart requests
            $postData = $_POST;
            $jsonData = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                $postData = $jsonData;
                $action = $jsonData['action'] ?? '';
            }
    
            switch($action) {
                case 'createCampaign':
                    $result = handleCreateCampaign($pdo, $postData);
                    break;
                case 'updateCampaign':
                    $result = handleUpdateCampaign($pdo, $postData);
                    break;
                case 'startCampaign':
                    $result = handleChangeCampaignStatus($pdo, [
                        'campaign_id' => $postData['campaign_id'],
                        'status' => 'active'
                    ]);
                    break;
                case 'sendMessage':
                    $result = handleSendMessage($pdo, $postData);
                    break;
                case 'pauseCampaign':
                    $result = handlePauseCampaign($pdo, $postData);
                    break;
                case 'resumeCampaign':
                    $result = handleResumeCampaign($pdo, $postData);
                    break;
                case 'deleteCampaign':
                    $result = handleDeleteCampaign($pdo, $postData);
                    break;
                    case 'duplicateCampaign':
                        $result = handleDuplicateCampaign($pdo, $postData);
                        break;
                default:
                    throw new Exception('Invalid action for POST request');
            }
            
        } catch (Exception $e) {
            error_log('Error in POST handling: ' . $e->getMessage());
            throw $e;
        }
    } else {
        // GET requests
        switch($_GET['action'] ?? '') {

            case 'getAvailableTables':
                $result = handleGetAvailableTables($pdo);
                break;
        
            case 'getTableFields':
                if (!isset($_GET['table'])) {
                    throw new Exception('Table name required');
                }
                $result = handleGetTableFields($pdo, $_GET['table']);
                break;
        
            case 'getTableRecords':
                if (!isset($_GET['table'])) {
                    throw new Exception('Table name required');
                }
                $result = handleGetTableRecords($pdo, $_GET['table']);
                break;
        
            case 'getCampaigns':
                $result = handleGetCampaigns($pdo);
                break;
            case 'getAziende':
                $result = handleGetAziende($pdo);
                break;
            case 'getTracking':
                $result = handleGetTracking($pdo);
                break;
                case 'getRecipientMessages':  // Aggiungiamo questo case
                    if (!isset($_GET['recipient_id'])) {
                        throw new Exception('Recipient ID required');
                    }
                    $result = handleGetRecipientMessages($pdo, $_GET['recipient_id']);
                    break;
            case 'getCampaignDetails':
                if (!isset($_GET['id'])) {
                    throw new Exception('Campaign ID required');
                }
                $result = handleGetCampaignDetails($pdo, $_GET['id']);
                break;
            case 'getTipoTessere':
                $result = handleGetTipoTessere($pdo);
                break;
                case 'getDashboardStats':
                    $result = handleGetDashboardStats($pdo);
                    break;
                    case 'getMessage':
                        if (!isset($_GET['id'])) {
                            throw new Exception('Message ID required');
                        }
                        $result = handleGetMessage($pdo, $_GET['id']);
                        break;
            default:
                throw new Exception('Invalid action');
        }
    }

    if (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($result);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);

    // Log error
    error_log("Error in b_campaign.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
}

if (ob_get_level()) ob_end_flush();