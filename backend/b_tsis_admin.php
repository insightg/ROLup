<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verifica autenticazione e permessi
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['is_admin']) || !$_SESSION['user']['is_admin']) {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode(['success' => false, 'error' => 'Accesso non autorizzato']);
    exit;
}

// Configurazione e connessione al database
require_once('../config/config.php');
$pdo = getPDO();

// Gestione degli errori
function handleError($errno, $errstr, $errfile, $errline) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'success' => false,
        'error' => "Errore PHP: $errstr"
    ]);
    exit;
}

set_error_handler('handleError');

// Funzioni di supporto
function validateTaskType($data) {
    $required = ['code', 'name'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Campo obbligatorio mancante: $field");
        }
    }
    return true;
}

// Router delle azioni
$action = $_GET['action'] ?? ($_POST['action'] ?? null);

if (!$action) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Azione non specificata']);
    exit;
}

try {
    $result = null;

    switch ($action) {
        case 'getPosTypes':
            $stmt = $pdo->prepare("
                SELECT * FROM tsis_pos_types 
                ORDER BY code
            ");
            $stmt->execute();
            $result = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'getTaskTypes':
            $stmt = $pdo->prepare("
                SELECT t.*, 
                       JSON_ARRAYAGG(
                           JSON_OBJECT(
                               'id', f.id,
                               'name', f.name,
                               'type', f.type,
                               'required', f.required,
                               'config', f.config
                           )
                       ) as fields
                FROM tsis_task_types t
                LEFT JOIN tsis_task_type_fields f ON t.id = f.task_type_id
                GROUP BY t.id
                ORDER BY t.code
            ");
            $stmt->execute();
            $result = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'getTemplates':
            $stmt = $pdo->prepare("
                SELECT * FROM tsis_pos_task_templates 
                WHERE is_active = 1
                ORDER BY name
            ");
            $stmt->execute();
            $result = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'saveTaskType':
            $data = json_decode(file_get_contents('php://input'), true);
            validateTaskType($data);
            
            $pdo->beginTransaction();
            
            try {
                if (isset($data['id'])) {
                    // Update
                    $stmt = $pdo->prepare("
                        UPDATE tsis_task_types
                        SET code = ?, name = ?, description = ?, updated_by = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$data['code'], $data['name'], $data['description'] ?? null, $_SESSION['user']['id'], $data['id']]);
                } else {
                    // Insert
                    $stmt = $pdo->prepare("
                        INSERT INTO tsis_task_types (code, name, description, created_by)
                        VALUES (?, ?, ?, ?)
                    ");
                    $stmt->execute([$data['code'], $data['name'], $data['description'] ?? null, $_SESSION['user']['id']]);
                    $data['id'] = $pdo->lastInsertId();
                }

                // Gestione dei campi
                if (isset($data['fields'])) {
                    // Rimuovi i vecchi campi
                    $stmt = $pdo->prepare("DELETE FROM tsis_task_type_fields WHERE task_type_id = ?");
                    $stmt->execute([$data['id']]);

                    // Inserisci i nuovi campi
                    $stmt = $pdo->prepare("
                        INSERT INTO tsis_task_type_fields 
                        (task_type_id, name, type, required, config)
                        VALUES (?, ?, ?, ?, ?)
                    ");

                    foreach ($data['fields'] as $field) {
                        $stmt->execute([
                            $data['id'],
                            $field['name'],
                            $field['type'],
                            $field['required'] ? 1 : 0,
                            json_encode($field['config'] ?? null)
                        ]);
                    }
                }

                $pdo->commit();
                $result = ['success' => true, 'id' => $data['id']];
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'deleteTaskType':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id'])) {
                throw new Exception('ID non specificato');
            }

            $pdo->beginTransaction();
            
            try {
                // Verifica se il tipo è utilizzato
                $stmt = $pdo->prepare("
                    SELECT COUNT(*) FROM tsis_pos_tasks 
                    WHERE tipo_task_id = ?
                ");
                $stmt->execute([$data['id']]);
                
                if ($stmt->fetchColumn() > 0) {
                    throw new Exception('Impossibile eliminare: tipo task in uso');
                }

                // Elimina i campi associati
                $stmt = $pdo->prepare("
                    DELETE FROM tsis_task_type_fields 
                    WHERE task_type_id = ?
                ");
                $stmt->execute([$data['id']]);

                // Elimina il tipo
                $stmt = $pdo->prepare("
                    DELETE FROM tsis_task_types 
                    WHERE id = ?
                ");
                $stmt->execute([$data['id']]);

                $pdo->commit();
                $result = ['success' => true];
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            throw new Exception('Azione non valida');
    }

    echo json_encode($result);

} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>