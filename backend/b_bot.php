<?php
// All'inizio del file
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    if (!isset($_GET['action'])) {
        throw new Exception('Azione non specificata');
    }

    $action = $_GET['action'];
    $inputData = null;

    // Se è una richiesta POST, leggi il body
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $inputData = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Dati JSON non validi: ' . json_last_error_msg());
        }
    }

    // Inizializza PDO
    $pdo = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $result = null;

    switch ($action) {
        case 'createFlow':
            if (!$inputData) {
                throw new Exception('Dati flusso mancanti');
            }

            if (!isset($inputData['name']) || !isset($inputData['source_table']) || 
                !isset($inputData['phone_field']) || !isset($inputData['welcome_message']) ||
                !isset($inputData['flow_data'])) {
                throw new Exception('Campi obbligatori mancanti');
            }

            $stmt = $pdo->prepare("
                INSERT INTO t_bot_flows (
                    name, 
                    source_table,
                    phone_field,
                    welcome_message,
                    flow_data,
                    created_by,
                    is_active
                ) VALUES (?, ?, ?, ?, ?, ?, TRUE)
            ");
            
            $stmt->execute([
                $inputData['name'],
                $inputData['source_table'],
                $inputData['phone_field'],
                $inputData['welcome_message'],
                json_encode($inputData['flow_data']),
                $_SESSION['user']['id']
            ]);

            $result = [
                'success' => true,
                'id' => $pdo->lastInsertId()
            ];
            break;
        case 'getAvailableTables':
            $stmt = $pdo->prepare("SELECT id, table_name, description FROM t_table ORDER BY description");
            $stmt->execute();
            $result = [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'getDashboardStats':
            $result = handleGetDashboardStats($pdo);
            break;

        case 'getTableFields':
            if (!isset($_GET['table'])) {
                throw new Exception('Nome tabella mancante');
            }

            $tableName = $_GET['table'];
            
            // Verifica esistenza tabella
            $stmt = $pdo->prepare("SELECT id FROM t_table WHERE table_name = ?");
            $stmt->execute([$tableName]);
            if (!$stmt->fetch()) {
                throw new Exception('Tabella non valida');
            }

            // Ottieni struttura tabella
            $query = "SHOW COLUMNS FROM `" . str_replace('`', '', $tableName) . "`";
            $stmt = $pdo->query($query);
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $fields = [];
            $phoneFields = [];
            
            foreach ($columns as $column) {
                $fieldName = $column['Field'];
                $isPhone = preg_match('/(phone|telefono|cellulare|mobile|tel)/i', $fieldName);
                
                $fields[] = [
                    'name' => $fieldName,
                    'type' => $column['Type'],
                    'is_phone' => $isPhone
                ];
                
                if ($isPhone) {
                    $phoneFields[] = $fieldName;
                }
            }

            $result = [
                'success' => true,
                'data' => [
                    'fields' => $fields,
                    'phone_fields' => $phoneFields
                ]
            ];
            break;

            
        case 'updateFlow':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id'])) {
                throw new Exception('ID flusso mancante');
            }

            $stmt = $pdo->prepare("
                UPDATE t_bot_flows SET
                    name = ?,
                    source_table = ?,
                    phone_field = ?,
                    welcome_message = ?,
                    flow_data = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['name'],
                $data['source_table'],
                $data['phone_field'],
                $data['welcome_message'],
                json_encode($data['flow_data']),
                $data['id']
            ]);

            $result = [
                'success' => true
            ];
            break;

        case 'getFlows':
            $stmt = $pdo->query("
                SELECT 
                    f.*,
                    COUNT(DISTINCT c.id) as total_conversations,
                    COUNT(DISTINCT CASE WHEN c.is_completed THEN c.id END) as completed_conversations,
                    COUNT(DISTINCT l.id) as total_leads
                FROM t_bot_flows f
                LEFT JOIN t_bot_conversations c ON f.id = c.flow_id
                LEFT JOIN t_bot_leads l ON f.id = l.flow_id
                GROUP BY f.id
                ORDER BY f.created_at DESC
            ");

            $result = [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'getFlow':
            if (!isset($_GET['id'])) {
                throw new Exception('ID flusso mancante');
            }

            $stmt = $pdo->prepare("SELECT * FROM t_bot_flows WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $flow = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$flow) {
                throw new Exception('Flusso non trovato');
            }

            $result = [
                'success' => true,
                'data' => $flow
            ];
            break;

        case 'toggleFlow':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id'])) {
                throw new Exception('ID flusso mancante');
            }

            $stmt = $pdo->prepare("
                UPDATE t_bot_flows SET
                    is_active = NOT is_active,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([$data['id']]);

            $result = [
                'success' => true
            ];
            break;

        case 'deleteFlow':
            if (!isset($_GET['id'])) {
                throw new Exception('ID flusso mancante');
            }

            $pdo->beginTransaction();

            try {
                // Delete related leads
                $stmt = $pdo->prepare("DELETE FROM t_bot_leads WHERE flow_id = ?");
                $stmt->execute([$_GET['id']]);

                // Delete related messages and conversations
                $stmt = $pdo->prepare("
                    DELETE m FROM t_bot_messages m
                    INNER JOIN t_bot_conversations c ON m.conversation_id = c.id
                    WHERE c.flow_id = ?
                ");
                $stmt->execute([$_GET['id']]);

                $stmt = $pdo->prepare("DELETE FROM t_bot_conversations WHERE flow_id = ?");
                $stmt->execute([$_GET['id']]);

                // Finally delete the flow
                $stmt = $pdo->prepare("DELETE FROM t_bot_flows WHERE id = ?");
                $stmt->execute([$_GET['id']]);

                $pdo->commit();
                $result = ['success' => true];

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'getConversations':
            $stmt = $pdo->query("
                SELECT 
                    c.*,
                    f.name as flow_name,
                    COUNT(m.id) as messages_count,
                    EXISTS(SELECT 1 FROM t_bot_leads l WHERE l.conversation_id = c.id) as has_lead
                FROM t_bot_conversations c
                INNER JOIN t_bot_flows f ON c.flow_id = f.id
                LEFT JOIN t_bot_messages m ON c.id = m.conversation_id
                GROUP BY c.id
                ORDER BY c.last_interaction_at DESC
            ");

            $result = [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'getConversationDetails':
            if (!isset($_GET['id'])) {
                throw new Exception('ID conversazione mancante');
            }

            // Get conversation details
            $stmt = $pdo->prepare("
                SELECT 
                    c.*,
                    f.name as flow_name,
                    f.flow_data,
                    l.id as lead_id,
                    l.lead_type,
                    l.lead_data,
                    l.status as lead_status
                FROM t_bot_conversations c
                INNER JOIN t_bot_flows f ON c.flow_id = f.id
                LEFT JOIN t_bot_leads l ON c.id = l.conversation_id
                WHERE c.id = ?
            ");
            $stmt->execute([$_GET['id']]);
            $conversation = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$conversation) {
                throw new Exception('Conversazione non trovata');
            }

            // Get messages
            $stmt = $pdo->prepare("
                SELECT *
                FROM t_bot_messages
                WHERE conversation_id = ?
                ORDER BY sent_at ASC
            ");
            $stmt->execute([$_GET['id']]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $result = [
                'success' => true,
                'data' => [
                    'conversation' => $conversation,
                    'messages' => $messages
                ]
            ];
            break;

        case 'getLeads':
            $stmt = $pdo->query("
                SELECT 
                    l.*,
                    f.name as flow_name,
                    c.started_at as conversation_start,
                    c.last_interaction_at
                FROM t_bot_leads l
                INNER JOIN t_bot_flows f ON l.flow_id = f.id
                INNER JOIN t_bot_conversations c ON l.conversation_id = c.id
                ORDER BY l.created_at DESC
            ");

            $result = [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'getFreeChatConfigs':
            $stmt = $pdo->query("
                SELECT id, name 
                FROM t_bot_free_chat_configs 
                WHERE is_active = TRUE 
                ORDER BY name
            ");
            
            $result = [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'getFreeChatConfig':
            if (!isset($_GET['id'])) {
                throw new Exception('ID configurazione mancante');
            }

            $stmt = $pdo->prepare("
                SELECT * 
                FROM t_bot_free_chat_configs 
                WHERE id = ? AND is_active = TRUE
            ");
            $stmt->execute([$_GET['id']]);
            $config = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$config) {
                throw new Exception('Configurazione non trovata');
            }

            $result = [
                'success' => true,
                'data' => $config
            ];
            break;

        case 'createFreeChatConfig':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['name']) || !isset($data['base_knowledge']) || 
                !isset($data['prompt_template'])) {
                throw new Exception('Dati mancanti');
            }

            $stmt = $pdo->prepare("
                INSERT INTO t_bot_free_chat_configs (
                    name,
                    base_knowledge,
                    prompt_template,
                    created_by
                ) VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['name'],
                $data['base_knowledge'],
                $data['prompt_template'],
                $_SESSION['user']['id']
            ]);

            $result = [
                'success' => true,
                'id' => $pdo->lastInsertId()
            ];
            break;

        default:
            throw new Exception('Azione non valida');
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handleGetDashboardStats($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                (SELECT COUNT(*) 
                 FROM t_bot_conversations 
                 WHERE is_completed = 0) as active_conversations,
                
                (SELECT COUNT(*) 
                 FROM t_bot_messages) as total_interactions,
                
                (SELECT COUNT(*) 
                 FROM t_bot_leads 
                 WHERE status = 'new') as active_leads,
                
                (SELECT 
                    COALESCE(
                        ROUND(
                            (COUNT(DISTINCT l.id) * 100.0) / NULLIF(COUNT(DISTINCT c.id), 0)
                        , 1),
                        0
                    )
                 FROM t_bot_conversations c
                 LEFT JOIN t_bot_leads l ON c.id = l.conversation_id) as conversion_rate
            FROM dual
        ");
        
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => [
                'active_conversations' => (int)$stats['active_conversations'],
                'total_interactions' => (int)$stats['total_interactions'],
                'active_leads' => (int)$stats['active_leads'],
                'conversion_rate' => (float)$stats['conversion_rate']
            ]
        ];

    } catch (Exception $e) {
        throw new Exception('Error retrieving dashboard stats: ' . $e->getMessage());
    }
}