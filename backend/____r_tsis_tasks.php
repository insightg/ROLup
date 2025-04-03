<?php
// Configurazione iniziale
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Gestione errori
function handleError($errno, $errstr, $errfile, $errline) {
//    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    echo json_encode([
        'success' => false,
        'error' => "Internal server error"
    ]);
    exit(1);
}

function handleException($e) {
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
$configPath = "../config/{$thirdLevelDomain}/config.ini";

if (!file_exists($configPath)) {
    throw new Exception('Configuration file not found');
}

$config = parse_ini_file($configPath, true);
if (!$config) {
    throw new Exception('Error parsing configuration file');
}

// Connessione database
try {
    $db = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    throw new Exception('Database connection error');
}

// Verifica autenticazione
if (!isset($_SESSION['user']) || !$_SESSION['user']['logged_in']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

// Funzioni helper per i PM
function isPM($db, $userId) {
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM t_user_groups ug 
        JOIN t_groups g ON g.id = ug.group_id 
        WHERE g.name = 'pm' AND ug.user_id = ?
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchColumn() > 0;
}

function getPMConfig($db, $userId) {
    $stmt = $db->prepare("
        SELECT 
            pc.*,
            u.username,
            u.full_name,
            u.email,
            (SELECT COUNT(*) 
             FROM tsis_pos_management 
             WHERE pm_id = pc.user_id AND stato != 'completato') as active_assignments
        FROM tsis_pm_config pc
        JOIN t_users u ON pc.user_id = u.id
        WHERE pc.user_id = ?
    ");
    $stmt->execute([$userId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Funzione principale per ottenere l'albero dei dati
function getTreeData($db) {
    try {
        $query = "
        SELECT DISTINCT 
            a.id,
            a.nome_account,
            a.sf_region,
            a.sf_district,
            a.sf_territory,
            a.rrp_segment,
            a.trade,
            pm.id as management_id,
            pm.stato,
            pm.progress,
            pm.data_creazione,
            pm.tasks_data,
            pm.tipo_attivita_id,
            ao.descrizione as tipo_attivita_desc,
            ao.codice as tipo_attivita_codice,
            pm.pm_id,
            u.username as pm_username,
            u.full_name as pm_full_name
        FROM tsis_anagrafica a
        LEFT JOIN tsis_pos_management pm ON a.id = pm.pos_id
        LEFT JOIN tsis_attivita_ordine_pos ao ON pm.tipo_attivita_id = ao.id
        LEFT JOIN t_users u ON pm.pm_id = u.id
        WHERE pm.id IS NOT NULL
        ORDER BY a.nome_account, pm.data_creazione DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $posNodes = [];

        foreach ($results as $row) {
            $posId = $row['id'];
            
            if (!isset($posNodes[$posId])) {
                $posNodes[$posId] = [
                    'id' => $posId,
                    'nome_account' => $row['nome_account'] ?? 'Unnamed POS',
                    'sf_region' => $row['sf_region'] ?? '',
                    'sf_district' => $row['sf_district'] ?? '',
                    'sf_territory' => $row['sf_territory'] ?? '',
                    'rrp_segment' => $row['rrp_segment'] ?? '',
                    'trade' => $row['trade'] ?? '',
                    'children' => []
                ];
            }

            if ($row['management_id']) {
                // Parse tasks data
                $tasksData = [];
                if (!empty($row['tasks_data'])) {
                    try {
                        $parsed = json_decode($row['tasks_data'], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $tasksData = isset($parsed['tasks']) ? $parsed['tasks'] : 
                                      (isset($parsed['ordine']['tasks']) ? $parsed['ordine']['tasks'] : []);
                        }
                    } catch (Exception $e) {
                        error_log("Error parsing tasks_data: " . $e->getMessage());
                        $tasksData = [];
                    }
                }

                $orderNode = [
                    'id' => $row['management_id'],
                    'title' => 'Ordine #' . $row['management_id'],
                    'stato' => $row['stato'] ?? 'nuovo',
                    'progress' => $row['progress'] ?? 0,
                    'data_creazione' => $row['data_creazione'],
                    'tipo_attivita_id' => $row['tipo_attivita_id'],
                    'tipo_attivita_desc' => $row['tipo_attivita_desc'],
                    'tipo_attivita_codice' => $row['tipo_attivita_codice'],
                    'pm_id' => $row['pm_id'],
                    'pm_username' => $row['pm_username'],
                    'pm_full_name' => $row['pm_full_name'],
                    'tasks' => array_map(function($task) {
                        // resto del codice invariato...
                    }, $tasksData)
                ];

                $posNodes[$posId]['children'][] = $orderNode;
            }
        }

        return [
            'success' => true,
            'data' => array_values($posNodes),
            'stats' => getStats($db)['stats'] ?? []
        ];

    } catch (Exception $e) {
        error_log("Error in getTreeData: " . $e->getMessage());
        throw new Exception('Error retrieving tree data: ' . $e->getMessage());
    }
}

// Funzione per ottenere le statistiche
function getStats($db) {
    try {
        $query = "
            SELECT 
                COUNT(DISTINCT pm.pos_id) as total_pos_with_orders,
                SUM(CASE WHEN pm.stato = 'assegnato' THEN 1 ELSE 0 END) as orders_assigned,
                SUM(CASE WHEN pm.stato = 'in_lavorazione' THEN 1 ELSE 0 END) as orders_in_progress,
                SUM(CASE WHEN pm.stato = 'completato' THEN 1 ELSE 0 END) as orders_completed,
                COUNT(DISTINCT pm.id) as total_orders
            FROM tsis_pos_management pm
            WHERE pm.id IS NOT NULL";
            
        $stmt = $db->prepare($query);
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'stats' => array_map('intval', $stats)
        ];
    } catch (Exception $e) {
        error_log("Error getting stats: " . $e->getMessage());
        throw new Exception('Error retrieving statistics: ' . $e->getMessage());
    }
}

// Funzione per assegnare un PM a un ordine
function assignPMToOrder($db, $orderId, $pmId) {
    try {
        $db->beginTransaction();

        // Verifica PM e capacità
        $stmt = $db->prepare("
            SELECT 
                pc.max_pos_assegnabili,
                (SELECT COUNT(*) 
                 FROM tsis_pos_management 
                 WHERE pm_id = ? AND stato != 'completato') as current_assignments
            FROM tsis_pm_config pc
            WHERE pc.user_id = ?
        ");
        $stmt->execute([$pmId, $pmId]);
        $pmConfig = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pmConfig) {
            throw new Exception('PM configuration not found');
        }

        if ($pmConfig['current_assignments'] >= $pmConfig['max_pos_assegnabili']) {
            throw new Exception('PM has reached maximum assignments');
        }

        // Stato attuale dell'ordine
        $stmt = $db->prepare("
            SELECT stato, pm_id 
            FROM tsis_pos_management 
            WHERE id = ?
        ");
        $stmt->execute([$orderId]);
        $currentOrder = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentOrder) {
            throw new Exception('Order not found');
        }

        // Aggiorna ordine
        $stmt = $db->prepare("
            UPDATE tsis_pos_management 
            SET pm_id = ?,
                stato = CASE 
                    WHEN stato = 'nuovo' THEN 'assegnato'
                    ELSE stato
                END,
                data_assegnazione = NOW(),
                updated_at = NOW(),
                updated_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$pmId, $_SESSION['user']['id'], $orderId]);

        // Log assegnazione
        $logStmt = $db->prepare("
            INSERT INTO tsis_pos_log 
            (pos_id, tipo_operazione, dati_precedenti, utente_id, data_operazione)
            VALUES (?, ?, ?, ?, NOW())
        ");

        $logStmt->execute([
            $orderId,
            'assign_pm',
            json_encode([
                'previous_pm_id' => $currentOrder['pm_id'],
                'new_pm_id' => $pmId,
                'previous_stato' => $currentOrder['stato']
            ]),
            $_SESSION['user']['id']
        ]);

        $db->commit();

        return [
            'success' => true,
            'message' => 'PM assigned successfully'
        ];

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error in assignPMToOrder: " . $e->getMessage());
        throw new Exception('Error assigning PM: ' . $e->getMessage());
    }
}

// Funzione principale per aggiornare lo stato del task
// Helper functions for state management
function calculateOrderState($tasks) {
    if (empty($tasks)) {
        return 'nuovo';
    }

    $states = array_column($tasks, 'stato');
    $totalTasks = count($tasks);
    $stateCount = array_count_values($states);
    
    // Se tutti i task sono completati
    if (isset($stateCount['completato']) && $stateCount['completato'] === $totalTasks) {
        return 'completato';
    }
    
    // Se almeno un task è in standby e nessuno è in lavorazione
    if (isset($stateCount['standby']) && !isset($stateCount['in_lavorazione'])) {
        return 'standby';
    }
    
    // Se almeno un task è in lavorazione o alcuni sono completati
    if (isset($stateCount['in_lavorazione']) || 
        (isset($stateCount['completato']) && $stateCount['completato'] > 0)) {
        return 'in_lavorazione';
    }
    
    // Se c'è almeno un task assegnato e nessuno in lavorazione
    if (isset($stateCount['assegnato']) && !isset($stateCount['in_lavorazione'])) {
        return 'assegnato';
    }
    
    return 'nuovo';
}

function calculateOrderProgress($tasks) {
    if (empty($tasks)) {
        return 0;
    }

    $totalProgress = 0;
    $taskCount = count($tasks);

    foreach ($tasks as $task) {
        $totalProgress += $task['progress'] ?? 0;
    }

    return round($totalProgress / $taskCount);
}

function updateTaskState($db) {
    try {
        $input = $_POST;
        if (empty($input['order_id']) || empty($input['task_title']) || empty($input['subtask_title'])) {
            throw new Exception('Missing required fields');
        }

        $db->beginTransaction();

        // Get current data
        $stmt = $db->prepare("SELECT tasks_data FROM tsis_pos_management WHERE id = ?");
        $stmt->execute([$input['order_id']]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new Exception('Order not found');
        }

        $tasksData = json_decode($order['tasks_data'], true);
        error_log("Current tasks_data: " . print_r($tasksData, true));
        
        if (!$tasksData || !isset($tasksData['tasks'])) {
            $tasksData = ['tasks' => []];
        }

        $updated = false;
        $taskIndex = null;
        $subtaskIndex = null;

        // Find task and subtask indices
        foreach ($tasksData['tasks'] as $i => $task) {
            if ($task['title'] === $input['task_title']) {
                $taskIndex = $i;
                foreach ($task['subtasks'] as $j => $subtask) {
                    if ($subtask['title'] === $input['subtask_title']) {
                        $subtaskIndex = $j;
                        break 2;
                    }
                }
            }
        }

        if ($taskIndex === null || $subtaskIndex === null) {
            throw new Exception('Task or subtask not found');
        }

        // Store old states for logging
        $oldStates = [
            'subtask' => $tasksData['tasks'][$taskIndex]['subtasks'][$subtaskIndex],
            'task' => [
                'stato' => $tasksData['tasks'][$taskIndex]['stato'],
                'progress' => $tasksData['tasks'][$taskIndex]['progress']
            ]
        ];

        // Update subtask fields
        foreach ($input as $key => $value) {
            if (!in_array($key, ['order_id', 'task_title', 'subtask_title'])) {
                $tasksData['tasks'][$taskIndex]['subtasks'][$subtaskIndex][$key] = $value;
            }
        }

        // Update task progress and state
        $subtasks = $tasksData['tasks'][$taskIndex]['subtasks'];
        $includedSubtasks = array_filter($subtasks, fn($st) => empty($st['exclude_from_completion']));
        $completedSubtasks = array_filter($includedSubtasks, fn($st) => $st['stato'] === 'completato');

        $taskProgress = count($includedSubtasks) > 0 
            ? round((count($completedSubtasks) / count($includedSubtasks)) * 100)
            : 0;

        $tasksData['tasks'][$taskIndex]['progress'] = $taskProgress;
        $tasksData['tasks'][$taskIndex]['stato'] = calculateTaskState($subtasks);

        // Calculate order progress and state
        $orderProgress = calculateOrderProgress($tasksData['tasks']);
        $orderStatus = calculateOrderState($tasksData['tasks']);

        error_log("Updated tasks_data before save: " . print_r($tasksData, true));

        // Update database
        $stmt = $db->prepare("
            UPDATE tsis_pos_management 
            SET tasks_data = :tasks_data,
                stato = :stato,
                progress = :progress,
                updated_at = NOW(),
                updated_by = :user_id,
                data_ultimo_stato = NOW()
            WHERE id = :order_id
        ");

        $stmt->execute([
            ':tasks_data' => json_encode($tasksData),
            ':stato' => $orderStatus,
            ':progress' => $orderProgress,
            ':user_id' => $_SESSION['user']['id'],
            ':order_id' => $input['order_id']
        ]);

        // Log changes
        $logData = [
            'old_states' => $oldStates,
            'new_states' => [
                'subtask' => $tasksData['tasks'][$taskIndex]['subtasks'][$subtaskIndex],
                'task' => [
                    'stato' => $tasksData['tasks'][$taskIndex]['stato'],
                    'progress' => $taskProgress
                ],
                'order' => [
                    'stato' => $orderStatus,
                    'progress' => $orderProgress
                ]
            ],
            'calculation_details' => [
                'included_subtasks' => count($includedSubtasks),
                'completed_subtasks' => count($completedSubtasks),
                'task_progress' => $taskProgress,
                'order_progress' => $orderProgress
            ]
        ];

        $logStmt = $db->prepare("
            INSERT INTO tsis_pos_log 
            (pos_id, tipo_operazione, dati_precedenti, utente_id, data_operazione)
            VALUES (?, ?, ?, ?, NOW())
        ");

        $logStmt->execute([
            $input['order_id'],
            'update_task_state',
            json_encode($logData),
            $_SESSION['user']['id']
        ]);

        $db->commit();

        return [
            'success' => true,
            'message' => 'States updated successfully',
            'data' => [
                'order_status' => $orderStatus,
                'order_progress' => $orderProgress,
                'task_status' => $tasksData['tasks'][$taskIndex]['stato'],
                'task_progress' => $taskProgress,
                'updated_task' => $tasksData['tasks'][$taskIndex]
            ]
        ];

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error in updateTaskState: " . $e->getMessage());
        throw new Exception('Error updating states: ' . $e->getMessage());
    }
}

// Helper function to calculate task state
function calculateTaskState($subtasks) {
    $includedSubtasks = array_filter($subtasks, function($st) {
        return empty($st['exclude_from_completion']);
    });

    if (empty($includedSubtasks)) {
        return 'nuovo';
    }

    $states = array_column($includedSubtasks, 'stato');
    $totalIncluded = count($includedSubtasks);
    $stateCount = array_count_values($states);
    
    if (isset($stateCount['completato']) && $stateCount['completato'] === $totalIncluded) {
        return 'completato';
    }
    
    if (isset($stateCount['in_lavorazione']) || 
        (isset($stateCount['completato']) && $stateCount['completato'] > 0)) {
        return 'in_lavorazione';
    }
    
    if (isset($stateCount['standby'])) {
        return 'standby';
    }
    
    return 'nuovo';
}





// Funzione per salvare lo stato di un ordine
function saveOrderState($db) {
    try {
        if (!isset($_POST['order_id'], $_POST['stato'])) {
            throw new Exception('Missing required parameters');
        }

        $orderId = $_POST['order_id'];
        $stato = $_POST['stato'];
        $progress = isset($_POST['progress']) ? intval($_POST['progress']) : null;
        
        $db->beginTransaction();
        
        // Aggiorna stato ordine
        $updateFields = ['stato = :stato'];
        $params = [
            ':id' => $orderId,
            ':stato' => $stato,
            ':user_id' => $_SESSION['user']['id']
        ];
        
        if ($progress !== null) {
            $updateFields[] = 'progress = :progress';
            $params[':progress'] = $progress;
        }
        
        $query = "UPDATE tsis_pos_management SET 
                  " . implode(', ', $updateFields) . ",
                  data_ultimo_stato = NOW(),
                  updated_at = NOW(),
                  updated_by = :user_id
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        // Log operazione
        $logStmt = $db->prepare("
            INSERT INTO tsis_pos_log 
            (pos_id, tipo_operazione, dati_precedenti, utente_id, data_operazione)
            VALUES 
            (:pos_id, :tipo_operazione, :dati_precedenti, :utente_id, NOW())
        ");

        $logStmt->execute([
            ':pos_id' => $orderId,
            ':tipo_operazione' => 'update_order_state',
            ':dati_precedenti' => json_encode([
                'stato' => $stato, 
                'progress' => $progress
            ]),
            ':utente_id' => $_SESSION['user']['id']
        ]);
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Order state updated successfully'
        ];
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error in saveOrderState: " . $e->getMessage());
        throw new Exception('Error saving order state: ' . $e->getMessage());
    }
}
// Funzione per ottenere gli stati di avanzamento
function getStatiAvanzamento($db) {
    try {
        $stmt = $db->prepare("
            SELECT 
                id,
                codice,
                descrizione,
                tipo,
                ordine,
                colore,
                icona,
                attivo
            FROM tsis_stati_avanzamento
            ORDER BY tipo, ordine
        ");
        
        $stmt->execute();
        $stati = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $stati
        ];
    } catch (Exception $e) {
        error_log("Error getting stati avanzamento: " . $e->getMessage());
        throw new Exception('Error retrieving stati avanzamento: ' . $e->getMessage());
    }
}

// Funzione per aggiornare direttamente lo stato di un task
function updateTaskStateDirectly($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['order_id']) || empty($input['task_id']) || empty($input['stato'])) {
            throw new Exception('Missing required fields');
        }

        $db->beginTransaction();

        // Get current data
        $stmt = $db->prepare("SELECT tasks_data FROM tsis_pos_management WHERE id = ?");
        $stmt->execute([$input['order_id']]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new Exception('Order not found');
        }

        $tasksData = json_decode($order['tasks_data'], true);
        
        if (!$tasksData || !isset($tasksData['tasks'])) {
            throw new Exception('Invalid tasks data structure');
        }

        // Find the task
        $taskFound = false;
        foreach ($tasksData['tasks'] as &$task) {
            if ($task['id'] === $input['task_id']) {
                // Store old state for logging
                $oldState = $task['stato'];
                
                // Update task state
                $task['stato'] = $input['stato'];
                
                // If task is completed, update progress to 100% 
                if ($input['stato'] === 'completato') {
                    $task['progress'] = 100;
                }
                
                $taskFound = true;
                break;
            }
        }

        if (!$taskFound) {
            throw new Exception('Task not found');
        }

        // Calculate order progress and state
        $orderProgress = calculateOrderProgress($tasksData['tasks']);
        $orderStatus = calculateOrderState($tasksData['tasks']);

        // Update database
        $stmt = $db->prepare("
            UPDATE tsis_pos_management 
            SET tasks_data = :tasks_data,
                stato = :stato,
                progress = :progress,
                updated_at = NOW(),
                updated_by = :user_id,
                data_ultimo_stato = NOW()
            WHERE id = :order_id
        ");

        $stmt->execute([
            ':tasks_data' => json_encode($tasksData),
            ':stato' => $orderStatus,
            ':progress' => $orderProgress,
            ':user_id' => $_SESSION['user']['id'],
            ':order_id' => $input['order_id']
        ]);

        // Log changes
        $logData = [
            'task_id' => $input['task_id'],
            'old_state' => $oldState,
            'new_state' => $input['stato'],
            'order_new_state' => $orderStatus,
            'order_new_progress' => $orderProgress
        ];

        $logStmt = $db->prepare("
            INSERT INTO tsis_pos_log 
            (pos_id, tipo_operazione, dati_precedenti, utente_id, data_operazione)
            VALUES (?, ?, ?, ?, NOW())
        ");

        $logStmt->execute([
            $input['order_id'],
            'update_task_state_direct',
            json_encode($logData),
            $_SESSION['user']['id']
        ]);

        $db->commit();

        return [
            'success' => true,
            'message' => 'Task state updated successfully',
            'data' => [
                'order_status' => $orderStatus,
                'order_progress' => $orderProgress
            ]
        ];

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error in updateTaskStateDirectly: " . $e->getMessage());
        throw new Exception('Error updating task state: ' . $e->getMessage());
    }
}

/**
 * Funzione per ottenere i dettagli di un ordine e dei suoi task
 */
function getOrderTasks($db, $orderId = null) {
    try {
        if (!$orderId) {
            $orderId = $_GET['order_id'] ?? null;
        }
        
        if (!$orderId) {
            throw new Exception('ID ordine mancante');
        }
        
        // Recupera i dati dell'ordine dalla tabella
       // Recupera i dati dell'ordine dalla tabella
       $stmt = $db->prepare("
       SELECT 
           pm.id, 
           pm.tasks_data, 
           pm.stato, 
           pm.progress, 
           pm.tipo_attivita_id,
           ao.descrizione as tipo_attivita_desc,
           ao.codice as tipo_attivita_codice,
           pm.data_creazione, 
           pm.pm_id,
           pos.nome_account as pos_name,
           pos.id as pos_id,
           pos.sf_region,
           pos.sf_district,
           pos.sf_territory
       FROM tsis_pos_management pm
       LEFT JOIN tsis_anagrafica pos ON pm.pos_id = pos.id
       LEFT JOIN tsis_attivita_ordine_pos ao ON pm.tipo_attivita_id = ao.id
       WHERE pm.id = ?
   ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            throw new Exception('Ordine non trovato');
        }
        
        // Se c'è un PM associato, ottieni i suoi dati dalla tabella users
        $pmUsername = null;
        $pmFullName = null;
        
        if (!empty($order['pm_id'])) {
            $userStmt = $db->prepare("
                SELECT username, full_name
                FROM t_users
                WHERE id = ?
            ");
            $userStmt->execute([$order['pm_id']]);
            $userData = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($userData) {
                $pmUsername = $userData['username'];
                $pmFullName = $userData['full_name'];
            }
        }
        
        // Estrai i dati dei task
        $tasksData = [];
        if (!empty($order['tasks_data'])) {
            $decoded = json_decode($order['tasks_data'], true);
            
            // Gestione di diverse strutture possibili del JSON tasks_data
            if (isset($decoded['tasks'])) {
                $tasksData = $decoded['tasks'];
            } elseif (isset($decoded['ordine']) && isset($decoded['ordine']['tasks'])) {
                $tasksData = $decoded['ordine']['tasks'];
            }
        }
        
        // Costruisci l'oggetto di risposta
      // Costruisci l'oggetto di risposta
return [
    'success' => true,
    'data' => [
        'id' => $order['id'],
        'title' => $order['tipo_attivita_desc'] ?? ('Ordine #' . $order['id']),
        'stato' => $order['stato'],
        'progress' => $order['progress'],
        'tipo_attivita_id' => $order['tipo_attivita_id'],
        'tipo_attivita_desc' => $order['tipo_attivita_desc'] ?? null,
        'tipo_attivita_codice' => $order['tipo_attivita_codice'] ?? null,
        'data_creazione' => $order['data_creazione'],
        'pm_id' => $order['pm_id'],
        'pm_username' => $pmUsername,
        'pm_full_name' => $pmFullName,
        'pos_name' => $order['pos_name'],
        'pos_id' => $order['pos_id'],
        'sf_region' => $order['sf_region'],
        'sf_district' => $order['sf_district'],
        'sf_territory' => $order['sf_territory'],
        'tasks' => $tasksData
    ]
];
    } catch (Exception $e) {
        error_log("Error in getOrderTasks: " . $e->getMessage());
        throw new Exception('Error retrieving order tasks: ' . $e->getMessage());
    }
}

// Funzione per ottenere i PM disponibili
function getAvailablePMs($db) {
    try {
        $stmt = $db->prepare("
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                pc.area_competenza,
                pc.max_pos_assegnabili,
                (SELECT COUNT(*) 
                 FROM tsis_pos_management 
                 WHERE pm_id = u.id AND stato != 'completato') as current_assignments
            FROM t_users u
            JOIN t_user_groups ug ON u.id = ug.user_id
            JOIN t_groups g ON ug.group_id = g.id
            LEFT JOIN tsis_pm_config pc ON u.id = pc.user_id
            WHERE g.name = 'pm'
            ORDER BY u.full_name
        ");
        
        $stmt->execute();
        $pms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $pms
        ];
        
    } catch (Exception $e) {
        error_log("Error getting available PMs: " . $e->getMessage());
        throw new Exception('Error getting available PMs: ' . $e->getMessage());
    }
}


// Funzione per ottenere tutti i tipi di attività (sostituisce getTaskTemplates)
function getTipiAttivita($db) {
    try {
        $stmt = $db->prepare("
            SELECT 
                t.*,
                (SELECT COUNT(*) FROM tsis_pos_management WHERE tipo_attivita_id = t.id) as ordini_count
            FROM tsis_attivita_ordine_pos t
            ORDER BY t.descrizione
        ");
        $stmt->execute();
        $tipi = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $tipi
        ];
    } catch (Exception $e) {
        error_log("Error getting tipi attività: " . $e->getMessage());
        throw new Exception('Error retrieving tipi attività: ' . $e->getMessage());
    }
}

// Funzione per ottenere un singolo tipo di attività (sostituisce getTaskTemplate)
function getTipoAttivita($db, $id) {
    try {
        $stmt = $db->prepare("
            SELECT id, codice, descrizione, template_data, attivo
            FROM tsis_attivita_ordine_pos
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $tipo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tipo) {
            return [
                'success' => false,
                'error' => 'Tipo attività non trovato'
            ];
        }
        
        return [
            'success' => true,
            'data' => $tipo
        ];
    } catch (Exception $e) {
        error_log("Error getting tipo attività: " . $e->getMessage());
        throw new Exception('Error retrieving tipo attività: ' . $e->getMessage());
    }
}

// Funzione per salvare un template di attività (insert o update)
function saveTipoAttivita($db) {
    try {
        // Ottieni i dati dal corpo della richiesta
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['descrizione']) || !isset($input['codice'])) {
            throw new Exception('Dati mancanti o non validi');
        }
        
        // Se i dati del template sono un array, convertili in JSON
        if (isset($input['template_data']) && is_array($input['template_data'])) {
            $input['template_data'] = json_encode($input['template_data']);
        }
        
        $db->beginTransaction();
        
        if (isset($input['id']) && $input['id']) {
            // Update
            $stmt = $db->prepare("
                UPDATE tsis_attivita_ordine_pos
                SET codice = :codice,
                    descrizione = :descrizione,
                    attivo = :attivo,
                    template_data = :template_data,
                    utente_modifica = :user_id,
                    data_modifica = NOW(),
                    updated_by = :updated_by,
                    updated_at = NOW()
                WHERE id = :id
            ");
            
            $params = [
                ':codice' => $input['codice'],
                ':descrizione' => $input['descrizione'],
                ':attivo' => isset($input['attivo']) ? $input['attivo'] : 1,
                ':template_data' => $input['template_data'],
                ':user_id' => $_SESSION['user']['id'],
                ':updated_by' => $_SESSION['user']['id'],
                ':id' => $input['id']
            ];
            
            $stmt->execute($params);
            $templateId = $input['id'];
            
        } else {
            // Insert
            $stmt = $db->prepare("
                INSERT INTO tsis_attivita_ordine_pos (
                    codice,
                    descrizione,
                    attivo,
                    template_data,
                    utente_creazione,
                    data_creazione,
                    updated_by,
                    updated_at
                ) VALUES (
                    :codice,
                    :descrizione,
                    :attivo,
                    :template_data,
                    :user_id,
                    NOW(),
                    :updated_by,
                    NOW()
                )
            ");
            
            $params = [
                ':codice' => $input['codice'],
                ':descrizione' => $input['descrizione'],
                ':attivo' => isset($input['attivo']) ? $input['attivo'] : 1,
                ':template_data' => $input['template_data'],
                ':user_id' => $_SESSION['user']['id'],
                ':updated_by' => $_SESSION['user']['id']
            ];
            
            $stmt->execute($params);
            $templateId = $db->lastInsertId();
        }
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Template salvato con successo',
            'data' => [
                'id' => $templateId
            ]
        ];
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving tipo attività: " . $e->getMessage());
        throw new Exception('Error saving tipo attività: ' . $e->getMessage());
    }
}

// Funzione per eliminare un tipo di attività
function deleteTipoAttivita($db, $id) {
    try {
        $db->beginTransaction();
        
        // Verifica prima se il tipo esiste
        $checkStmt = $db->prepare("SELECT id FROM tsis_attivita_ordine_pos WHERE id = ?");
        $checkStmt->execute([$id]);
        
        if (!$checkStmt->fetch()) {
            return [
                'success' => false,
                'error' => 'Tipo attività non trovato'
            ];
        }
        
        // Verifica se è utilizzato in ordini esistenti
        $usageStmt = $db->prepare("
            SELECT COUNT(*) 
            FROM tsis_pos_management 
            WHERE tipo_attivita_id = ?
        ");
        $usageStmt->execute([$id]);
        $usageCount = $usageStmt->fetchColumn();
        
        if ($usageCount > 0) {
            // Se è utilizzato, disattiva invece di eliminare
            $stmt = $db->prepare("
                UPDATE tsis_attivita_ordine_pos 
                SET attivo = 0,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$_SESSION['user']['id'], $id]);
            
            $db->commit();
            
            return [
                'success' => true,
                'message' => 'Tipo attività disattivato perché in uso in ' . $usageCount . ' ordini'
            ];
        } else {
            // Se non è utilizzato, lo possiamo eliminare
            $stmt = $db->prepare("DELETE FROM tsis_attivita_ordine_pos WHERE id = ?");
            $stmt->execute([$id]);
            
            $db->commit();
            
            return [
                'success' => true,
                'message' => 'Tipo attività eliminato con successo'
            ];
        }
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error deleting tipo attività: " . $e->getMessage());
        throw new Exception('Error deleting tipo attività: ' . $e->getMessage());
    }
}

// Funzione per copiare un tipo di attività esistente
function copyTipoAttivita($db) {
    try {
        // Ottieni i dati dal corpo della richiesta
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id']) || !isset($input['nuova_descrizione'])) {
            throw new Exception('Dati mancanti o non validi');
        }
        
        $sourceId = $input['id'];
        $newName = $input['nuova_descrizione'];
        
        $db->beginTransaction();
        
        // Ottieni il tipo originale
        $stmt = $db->prepare("
            SELECT * FROM tsis_attivita_ordine_pos WHERE id = ?
        ");
        $stmt->execute([$sourceId]);
        $original = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$original) {
            throw new Exception('Tipo attività originale non trovato');
        }
        
        // Crea il nuovo codice
        $newCode = $original['codice'] . '_COPY';
        
        // Inserisci la copia
        $insertStmt = $db->prepare("
            INSERT INTO tsis_attivita_ordine_pos (
                codice,
                descrizione,
                attivo,
                template_data,
                utente_creazione,
                data_creazione,
                updated_by,
                updated_at
            ) VALUES (
                :codice,
                :descrizione,
                :attivo,
                :template_data,
                :user_id,
                NOW(),
                :updated_by,
                NOW()
            )
        ");
        
        $params = [
            ':codice' => $newCode,
            ':descrizione' => $newName,
            ':attivo' => $original['attivo'],
            ':template_data' => $original['template_data'],
            ':user_id' => $_SESSION['user']['id'],
            ':updated_by' => $_SESSION['user']['id']
        ];
        
        $insertStmt->execute($params);
        $newId = $db->lastInsertId();
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Tipo attività copiato con successo',
            'data' => [
                'id' => $newId
            ]
        ];
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error copying tipo attività: " . $e->getMessage());
        throw new Exception('Error copying tipo attività: ' . $e->getMessage());
    }
}


// Router principale
$router = [
    'getTipiAttivita' => fn() => getTipiAttivita($db),
    'getTipoAttivita' => fn() => getTipoAttivita($db, $_GET['id'] ?? null),
    'saveTipoAttivita' => fn() => saveTipoAttivita($db),
    'deleteTipoAttivita' => fn() => deleteTipoAttivita($db, $_GET['id'] ?? null),
    'copyTipoAttivita' => fn() => copyTipoAttivita($db), 'getStatiAvanzamento' => fn() => getStatiAvanzamento($db),
    'updateTaskStateDirectly' => fn() => updateTaskStateDirectly($db),
    'getTree' => fn() => getTreeData($db),
    'updateTaskState' => fn() => updateTaskState($db),
    'getStats' => fn() => getStats($db),
    'assignPMToOrder' => fn() => assignPMToOrder(
        $db, 
        $_POST['order_id'] ?? null, 
        $_POST['pm_id'] ?? null
    ),
    'saveOrderState' => fn() => saveOrderState($db),
    'getAvailablePMs' => fn() => getAvailablePMs($db),
    'getOrderTasks' => fn() => getOrderTasks($db)
    
];

// Gestione richieste
try {
    if (!isset($_GET['action'])) {
        throw new Exception('No action specified');
    }

    $action = $_GET['action'];
    if (!isset($router[$action])) {
        throw new Exception('Invalid action: ' . $action);
    }

    // Parse JSON input per richieste POST
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST)) {
        $_POST = json_decode(file_get_contents('php://input'), true);
    }

    $result = $router[$action]();
    echo json_encode($result);

} catch (Exception $e) {
    error_log("Error in b_tsis.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
