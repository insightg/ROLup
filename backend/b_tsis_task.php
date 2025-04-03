<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configurazione iniziale
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
function handleApplyTemplate($pdo, $posOrderId) {
    try {
        // 1. Recupera il tipo attività e il pos_id dell'ordine
        $stmt = $pdo->prepare("
            SELECT tipo_attivita_id, pos_id 
            FROM tsis_pos_management 
            WHERE id = ?
        ");
        $stmt->execute([$posOrderId]);
        $posData = $stmt->fetch();
        
        if (!$posData) {
            throw new Exception('Ordine POS non trovato');
        }

        $tipoAttivitaId = $posData['tipo_attivita_id'];
        $posId = $posData['pos_id'];

        // 2. Recupera il template
        $stmt = $pdo->prepare("
            SELECT template_data 
            FROM tsis_pos_task_templates 
            WHERE tipo_attivita_id = ? 
            AND is_active = 1
            ORDER BY id DESC 
            LIMIT 1
        ");
        $stmt->execute([$tipoAttivitaId]);
        $template = $stmt->fetchColumn();

        if (!$template) {
            throw new Exception('Template non trovato per questo tipo di attività');
        }

        $templateData = json_decode($template, true);
        if (!isset($templateData['tasks']) || !is_array($templateData['tasks'])) {
            throw new Exception('Template non valido: manca la sezione tasks');
        }
        
        $pdo->beginTransaction();

        // Inizializza contatore ordine task
        $taskOrder = 1;

        foreach ($templateData['tasks'] as $taskData) {
            // Recupera o crea tipo task
            $taskTypeStmt = $pdo->prepare("
                SELECT id FROM tsis_task_types 
                WHERE codice = ?
            ");
            $taskTypeStmt->execute([$taskData['type_code']]);
            $taskTypeId = $taskTypeStmt->fetchColumn();

            if (!$taskTypeId) {
                // Usa un tipo task di default se non trovato
                $taskTypeStmt = $pdo->prepare("
                    SELECT id FROM tsis_task_types 
                    WHERE codice = 'DEFAULT'
                    LIMIT 1
                ");
                $taskTypeStmt->execute();
                $taskTypeId = $taskTypeStmt->fetchColumn();
            }

            // Crea task principale
            $mainTaskStmt = $pdo->prepare("
                INSERT INTO tsis_pos_tasks (
                    pos_order_id,
                    pos_id,
                    tipo_task_id,
                    title,
                    description,
                    status,
                    priority,
                    task_order,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            ");
            
            $mainTaskStmt->execute([
                $posOrderId,
                $posId,
                $taskTypeId,
                $taskData['title'],
                $taskData['description'],
                $taskData['priority'],
                $taskOrder++,
                $_SESSION['user']['id']
            ]);

            $parentTaskId = $pdo->lastInsertId();

            // Crea tutti i subtasks
            if (isset($taskData['subtasks']) && is_array($taskData['subtasks'])) {
                foreach ($taskData['subtasks'] as $subtaskData) {
                    // Inserisci subtask
                    $subtaskStmt = $pdo->prepare("
                        INSERT INTO tsis_pos_tasks (
                            pos_order_id,
                            pos_id,
                            tipo_task_id,
                            parent_id,
                            title,
                            description,
                            status,
                            priority,
                            task_order,
                            created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                    ");
                    
                    $subtaskStmt->execute([
                        $posOrderId,
                        $posId,
                        $taskTypeId,
                        $parentTaskId,
                        $subtaskData['title'],
                        $subtaskData['description'] ?? '',
                        $subtaskData['priority'] ?? 'medium',
                        $taskOrder++,
                        $_SESSION['user']['id']
                    ]);

                    $subtaskId = $pdo->lastInsertId();

                    // Crea relazione parent-child
                    $relationStmt = $pdo->prepare("
                        INSERT INTO tsis_pos_task_parents (task_id, parent_id)
                        VALUES (?, ?)
                    ");
                    $relationStmt->execute([$subtaskId, $parentTaskId]);

                    // Salva i custom fields nella cronologia
                    if (isset($subtaskData['custom_fields'])) {
                        $historyStmt = $pdo->prepare("
                            INSERT INTO tsis_pos_task_history (
                                task_id,
                                action_type,
                                action_by,
                                action_date,
                                details
                            ) VALUES (?, 'custom_fields_init', ?, NOW(), ?)
                        ");

                        $historyStmt->execute([
                            $subtaskId,
                            $_SESSION['user']['id'],
                            json_encode($subtaskData['custom_fields'])
                        ]);
                    }
                }
            }
        }

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Template applicato con successo',
            'data' => [
                'task_count' => $taskOrder - 1
            ]
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Errore nell\'applicazione del template: ' . $e->getMessage());
    }
}
function handleException($e) {
    if (ob_get_level()) ob_end_clean();
    $error = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    error_log("Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode($error);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

// Database connection
function getPDO() {
    $config = parse_ini_file("../config/" . explode('.', $_SERVER['HTTP_HOST'])[0] . "/config.ini", true);
    if (!$config) {
        throw new Exception('Configuration error');
    }

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
function handleGetTaskTemplate($pdo, $taskTypeId) {
    try {
        // Verifica che l'ID tipo task sia fornito e sia valido
        if (!isset($taskTypeId) || !is_numeric($taskTypeId)) {
            throw new Exception('ID tipo task non valido');
        }

        // Recupera il template dalla tabella tsis_pos_task_templates
        $stmt = $pdo->prepare("
            SELECT tt.template_data, tt.name, tt.description
            FROM tsis_pos_task_templates tt
            JOIN tsis_task_types t ON tt.tipo_attivita_id = t.id
            WHERE t.id = ? AND tt.is_active = 1
            ORDER BY tt.id DESC
            LIMIT 1
        ");
        
        $stmt->execute([$taskTypeId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            // Se non viene trovato un template, restituisci un template di default
            return [
                'success' => true,
                'data' => [
                    'name' => 'Template Base',
                    'description' => 'Template di default',
                    'sections' => [
                        [
                            'type' => 'form',
                            'title' => 'Informazioni',
                            'fields' => []
                        ]
                    ]
                ]
            ];
        }

        // Decodifica il JSON del template
        $templateData = json_decode($template['template_data'], true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Errore nella decodifica del template: ' . json_last_error_msg());
        }

        return [
            'success' => true,
            'data' => array_merge($templateData, [
                'name' => $template['name'],
                'description' => $template['description']
            ])
        ];

    } catch (Exception $e) {
        error_log("Error retrieving task template: " . $e->getMessage());
        throw new Exception('Errore nel recupero del template: ' . $e->getMessage());
    }
}
// Task Management Functions
function handleGetTasks($pdo) {
    try {
        // Verifica autenticazione
        if (!isset($_SESSION['user']['id'])) {
            throw new Exception('Utente non autenticato');
        }

        $where = [];
        $params = [];

        // Se è specificato un pos_order_id
        if (isset($_GET['pos_order_id'])) {
            $where[] = "t.pos_order_id = ?";
            $params[] = intval($_GET['pos_order_id']);
        }

        // Se è specificato un parent_id
        if (isset($_GET['parent_id'])) {
            $where[] = "t.parent_id = ?";
            $params[] = intval($_GET['parent_id']);
        }

        // Costruisci la query WHERE
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Query base
        $query = "
            SELECT 
                t.*,
                u.full_name as assignee_name,
                COUNT(DISTINCT d.id) as document_count,
                tt.codice as task_type_code,
                tt.nome as task_type_name
            FROM tsis_pos_tasks t
            LEFT JOIN t_users u ON t.assignee_id = u.id
            LEFT JOIN tsis_documents d ON d.pos_management_id = t.pos_order_id
            LEFT JOIN tsis_task_types tt ON t.tipo_task_id = tt.id
            {$whereClause}
            GROUP BY 
                t.id, 
                u.full_name,
                tt.codice,
                tt.nome
            ORDER BY t.task_order, t.created_at
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        // Verifica autorizzazione per ogni task
        $authorizedTasks = array_filter($tasks, function($task) use ($pdo) {
            $authQuery = "
                SELECT pm.id 
                FROM tsis_pos_management pm
                JOIN tsis_pm p ON pm.pm_id = p.id
                WHERE pm.id = ? AND p.user_id = ?
            ";
            $authStmt = $pdo->prepare($authQuery);
            $authStmt->execute([$task['pos_order_id'], $_SESSION['user']['id']]);
            return (bool)$authStmt->fetch();
        });

        return [
            'success' => true,
            'data' => array_values($authorizedTasks)
        ];

    } catch (Exception $e) {
        error_log("Error getting tasks: " . $e->getMessage());
        throw new Exception('Error retrieving tasks: ' . $e->getMessage());
    }
}

function handleGetPOSData($pdo) {
    try {
        if (!isset($_GET['pos_order_id'])) {
            throw new Exception('ID ordine POS non specificato');
        }

        $posOrderId = intval($_GET['pos_order_id']);

        // Prima verifichiamo che l'utente sia autorizzato per questo POS
        $stmt = $pdo->prepare("
            SELECT pm.pos_id
            FROM tsis_pos_management pm
            JOIN tsis_pm p ON pm.pm_id = p.id
            WHERE pm.id = ? AND p.user_id = ?
        ");
        $stmt->execute([$posOrderId, $_SESSION['user']['id']]);
        $posCheck = $stmt->fetch();

        if (!$posCheck) {
            throw new Exception('POS non trovato o non autorizzato');
        }

        // Recupera i dati base del POS
        $stmt = $pdo->prepare("SELECT * FROM tsis_anagrafica WHERE id = ?");
        $stmt->execute([$posCheck['pos_id']]);
        $posData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$posData) {
            throw new Exception('POS non trovato');
        }

        // Recupera tutti gli ordini
        $stmt = $pdo->prepare("
            SELECT 
                pm.id,
                pm.stato,
                pm.data_creazione,
                pm.data_ultimo_stato,
                pm.data_assegnazione,
                ta.descrizione as tipo_attivita_desc,
                u.full_name as pm_nome
            FROM tsis_pos_management pm
            LEFT JOIN tsis_attivita_ordine_pos ta ON pm.tipo_attivita_id = ta.id
            LEFT JOIN tsis_pm p ON pm.pm_id = p.id
            LEFT JOIN t_users u ON p.user_id = u.id
            WHERE pm.pos_id = ?
            ORDER BY pm.data_creazione DESC
        ");
        
        $stmt->execute([$posCheck['pos_id']]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Per ogni ordine, recupera i task principali (senza parent_id)
        foreach ($orders as $key => $order) {
            $taskStmt = $pdo->prepare("
                SELECT 
                    t.*,
                    u.full_name as assignee_name,
                    tt.codice as task_type_code,
                    tt.nome as task_type_name
                FROM tsis_pos_tasks t
                LEFT JOIN t_users u ON t.assignee_id = u.id
                LEFT JOIN tsis_task_types tt ON t.tipo_task_id = tt.id
                WHERE t.pos_order_id = ? 
                AND t.parent_id IS NULL
                ORDER BY t.task_order, t.created_at
            ");
            $taskStmt->execute([$order['id']]);
            $orders[$key]['tasks'] = $taskStmt->fetchAll(PDO::FETCH_ASSOC);

            // Per ogni task principale, recupera i subtask
            foreach ($orders[$key]['tasks'] as $taskIndex => $task) {
                $subtaskStmt = $pdo->prepare("
                    SELECT 
                        t.*,
                        u.full_name as assignee_name,
                        tt.codice as task_type_code,
                        tt.nome as task_type_name
                    FROM tsis_pos_tasks t
                    LEFT JOIN t_users u ON t.assignee_id = u.id
                    LEFT JOIN tsis_task_types tt ON t.tipo_task_id = tt.id
                    WHERE t.parent_id = ?
                    ORDER BY t.task_order, t.created_at
                ");
                $subtaskStmt->execute([$task['id']]);
                $orders[$key]['tasks'][$taskIndex]['subtasks'] = $subtaskStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        $response = [
            'success' => true,
            'data' => [
                'posData' => array_merge($posData, ['ordersData' => $orders]),
                'currentOrderId' => $posOrderId
            ]
        ];

        return $response;

    } catch (PDOException $e) {
        error_log("Error retrieving POS data: " . $e->getMessage());
        throw new Exception('Errore nel recupero dei dati del POS: ' . $e->getMessage());
    }
}
function handleUpdateTaskStatus($pdo, $data) {
    if (!isset($data['task_id']) || !isset($data['status'])) {
        throw new Exception('ID task e nuovo stato sono obbligatori');
    }

    try {
        $taskId = (int)$data['task_id'];
        $newStatus = $data['status'];
        $oldStatus = $data['old_status'] ?? null;
        $notes = $data['notes'] ?? null;

        // Verifica autorizzazione
        $stmt = $pdo->prepare("
            SELECT t.*, pos.pm_id 
            FROM tsis_pos_tasks t
            JOIN tsis_pos_management pos ON t.pos_id = pos.id
            JOIN tsis_pm pm ON pos.pm_id = pm.id
            WHERE t.id = ? AND pm.user_id = ?
        ");
        
        $stmt->execute([$taskId, $_SESSION['user']['id']]);
        $task = $stmt->fetch();
        
        if (!$task) {
            throw new Exception('Task non trovato o non autorizzato');
        }

        // Verifica stato valido
        $validStates = ['pending', 'in_progress', 'completed', 'blocked'];
        if (!in_array($newStatus, $validStates)) {
            throw new Exception('Stato non valido');
        }

        $pdo->beginTransaction();

        // Aggiorna stato
        $updateStmt = $pdo->prepare("
            UPDATE tsis_pos_tasks
            SET 
                status = ?,
                completed_date = CASE 
                    WHEN ? = 'completed' THEN NOW()
                    ELSE NULL 
                END,
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ?
        ");

        $updateStmt->execute([
            $newStatus,
            $newStatus,
            $_SESSION['user']['id'],
            $taskId
        ]);

        // Log modifica
        $logStmt = $pdo->prepare("
            INSERT INTO tsis_pos_task_history (
                task_id,
                action_type,
                action_by,
                action_date,
                old_value,
                new_value,
                details
            ) VALUES (?, 'status_change', ?, NOW(), ?, ?, ?)
        ");

        $details = json_encode([
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'notes' => $notes
        ]);

        $logStmt->execute([
            $taskId,
            $_SESSION['user']['id'],
            $oldStatus,
            $newStatus,
            $details
        ]);

        // Aggiorna task dipendenti se bloccato
        $blockedTasks = [];
        if ($newStatus === 'blocked') {
            $depStmt = $pdo->prepare("
                SELECT task_id 
                FROM tsis_pos_task_parents 
                WHERE parent_id = ?
            ");
            $depStmt->execute([$taskId]);
            $blockedTasks = $depStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        $pdo->commit();

        // Calcola progresso
        $progress = calculateTaskProgress($pdo, $task['pos_id']);

        return [
            'success' => true,
            'message' => 'Stato task aggiornato con successo',
            'data' => [
                'task_id' => $taskId,
                'status' => $newStatus,
                'last_update' => date('Y-m-d H:i:s'),
                'blocked_tasks' => $blockedTasks,
                'progress' => $progress
            ]
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function calculateTaskProgress($pdo, $posId) {
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tsis_pos_tasks
        WHERE pos_id = ?
    ");
    
    $stmt->execute([$posId]);
    $result = $stmt->fetch();
    
    return [
        'total' => (int)$result['total'],
        'completed' => (int)$result['completed'],
        'percentage' => $result['total'] > 0 ? 
            round(($result['completed'] / $result['total']) * 100) : 0
    ];
}

function handleCreateTask($pdo, $data) {
    if (!isset($data['pos_order_id']) || !isset($data['title']) || !isset($data['task_type'])) {
        throw new Exception('Dati richiesti mancanti');
    }

    try {
        // Prima recupera l'ID del POS dall'ordine
        $stmt = $pdo->prepare("
            SELECT pos_id 
            FROM tsis_pos_management 
            WHERE id = ?
        ");
        $stmt->execute([$data['pos_order_id']]);
        $posId = $stmt->fetchColumn();

        if (!$posId) {
            throw new Exception('Ordine POS non trovato');
        }

        $pdo->beginTransaction();

        // Inserisci task con entrambi gli ID
        $stmt = $pdo->prepare("
            INSERT INTO tsis_pos_tasks (
                pos_order_id,
                pos_id,
                tipo_task_id,
                title,
                description,
                status,
                priority,
                start_date,
                due_date,
                created_by,
                created_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $data['pos_order_id'],
            $posId,
            $data['task_type'],
            $data['title'],
            $data['description'] ?? null,
            $data['priority'] ?? 'medium',
            $data['start_date'] ?? null,
            $data['due_date'] ?? null,
            $_SESSION['user']['id']
        ]);

        $taskId = $pdo->lastInsertId();

        // Gestisci task padre se specificato
        if (!empty($data['parent_id'])) {
            $parentStmt = $pdo->prepare("
                INSERT INTO tsis_pos_task_parents (task_id, parent_id)
                VALUES (?, ?)
            ");
            $parentStmt->execute([$taskId, $data['parent_id']]);
        }

        $pdo->commit();

        return [
            'success' => true,
            'message' => 'Task creato con successo',
            'data' => ['task_id' => $taskId]
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function handleGetTaskHistory($pdo, $taskId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                h.*,
                u.full_name as user_name
            FROM tsis_pos_task_history h
            JOIN t_users u ON h.action_by = u.id
            WHERE h.task_id = ?
            ORDER BY h.action_date DESC
        ");
        
        $stmt->execute([$taskId]);
        
        return [
            'success' => true,
            'data' => [
                'history' => $stmt->fetchAll()
            ]
        ];

    } catch (Exception $e) {
        throw new Exception('Errore nel recupero dello storico: ' . $e->getMessage());
    }
}

// Utility Functions
function getStatusLabel($status) {
    $labels = [
        'pending' => 'Da Iniziare',
        'in_progress' => 'In Corso',
        'completed' => 'Completato',
        'blocked' => 'Bloccato'
    ];
    return isset($labels[$status]) ? $labels[$status] : $status;
}

function getPriorityLabel($priority) {
    $labels = [
        'low' => 'Bassa',
        'medium' => 'Media',
        'high' => 'Alta'
    ];
    return isset($labels[$priority]) ? $labels[$priority] : $priority;
}


// Main Request Handler 
try {
    $pdo = getPDO();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $postData = $_POST;
        $jsonData = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $postData = $jsonData;
        }
        
        if (!isset($postData['action'])) {
            throw new Exception('Action not specified');
        }
    
        $result = match($postData['action']) {
            'updateTaskStatus' => handleUpdateTaskStatus($pdo, $postData),
            'createTask' => handleCreateTask($pdo, $postData),
            'applyTemplate' => handleApplyTemplate($pdo, $postData['pos_order_id']),
            default => throw new Exception('Invalid action for POST request')
        };

    } else {
        if (!isset($_GET['action'])) {
            throw new Exception('Action not specified');
        }

        $result = match($_GET['action']) {
            'getTasks' => handleGetTasks($pdo),
            'getTaskHistory' => handleGetTaskHistory($pdo, $_GET['task_id']),
            'getPOSData' => handleGetPOSData($pdo),
            'getTaskTemplate' => handleGetTaskTemplate($pdo, $_GET['tipo_task_id']), // Aggiungi questa riga
            default => throw new Exception('Invalid action for GET request')
        };
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