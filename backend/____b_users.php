<?php
/**
 * API per la gestione degli utenti, gruppi e permessi
 * Versione semplificata che non dipende dal menu
 */

// Avvia sessione
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Gestione errori
function handleError($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
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

// Verifica che l'utente sia autenticato
if (!isset($_SESSION['user']) || !$_SESSION['user']['logged_in']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

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

// Helpers per i ruoli
function isAdmin($db, $userId) {
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM t_user_groups ug 
        JOIN t_groups g ON g.id = ug.group_id 
        WHERE g.name = 'admin' AND ug.user_id = ?
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchColumn() > 0;
}

function hasGroupPermission($db, $userId, $groupName) {
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM t_user_groups ug 
        JOIN t_groups g ON g.id = ug.group_id 
        WHERE g.name = ? AND ug.user_id = ?
    ");
    $stmt->execute([$groupName, $userId]);
    return $stmt->fetchColumn() > 0;
}


/**
 * Ottiene la lista degli elementi del menu (versione reale)
 */
function getMenuItems($db) {
    // Log per debug
    error_log("Called getMenuItems - retrieving real data");
    
    try {
        // Query per ottenere gli elementi del menu
        $query = "SELECT id, name, icon, page_url, parent_id, menu_type, menu_order 
                  FROM t_menu_items
                  ORDER BY menu_type, menu_order, name";
                  
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        // Ottieni i risultati
        $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Invia la risposta
        echo json_encode([
            'success' => true,
            'data' => $menuItems
        ]);
    } catch (PDOException $e) {
        error_log('Database error in getMenuItems: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Errore nel recupero degli elementi del menu'
        ]);
    }
}

/**
 * Ottiene la lista dei permessi (versione reale)
 */
function getPermissions($db) {
    // Log per debug
    error_log("Called getPermissions - retrieving real data");
    
    try {
        // Query per ottenere i permessi
        $query = "SELECT id, group_id, menu_id, can_view, can_edit 
                  FROM t_menu_permissions
                  ORDER BY group_id, menu_id";
                  
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        // Ottieni i risultati
        $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Converte i valori booleani
        foreach ($permissions as &$permission) {
            $permission['can_view'] = (bool)$permission['can_view'];
            $permission['can_edit'] = (bool)$permission['can_edit'];
        }
        
        // Invia la risposta
        echo json_encode([
            'success' => true,
            'data' => $permissions
        ]);
    } catch (PDOException $e) {
        error_log('Database error in getPermissions: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Errore nel recupero dei permessi'
        ]);
    }
}

/**
 * Aggiorna i permessi di un gruppo (versione reale)
 */
function updatePermission($db, $data) {
    // Log per debug
    error_log("Called updatePermission - updating real data");
    error_log("Permission data: " . json_encode($data));
    
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per modificare i permessi', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['group_id']) || !isset($data['permissions']) || !is_array($data['permissions'])) {
        sendJsonResponse(false, 'Dati mancanti o non validi', null, 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che il gruppo esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_groups WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['group_id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Gruppo non trovato', null, 404);
            return;
        }
        
        // Per ogni permesso nella lista
        foreach ($data['permissions'] as $permission) {
            // Verifica che il menu item esista
            $menuCheckQuery = "SELECT COUNT(*) as count FROM t_menu_items WHERE id = ?";
            $menuCheckStmt = $db->prepare($menuCheckQuery);
            $menuCheckStmt->execute([$permission['menu_id']]);
            $menuCheck = $menuCheckStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($menuCheck['count'] == 0) {
                continue; // Salta questo permesso
            }
            
            // Se esiste già un permesso per questo gruppo e menu item, aggiornalo
            if (!empty($permission['permission_id'])) {
                $updateQuery = "UPDATE t_menu_permissions 
                               SET can_view = ?, can_edit = ? 
                               WHERE id = ? AND group_id = ?";
                               
                $updateStmt = $db->prepare($updateQuery);
                $updateStmt->execute([
                    $permission['can_view'] ? 1 : 0,
                    $permission['can_edit'] ? 1 : 0,
                    $permission['permission_id'],
                    $data['group_id']
                ]);
            } else {
                // Altrimenti, inserisci un nuovo permesso
                $insertQuery = "INSERT INTO t_menu_permissions (group_id, menu_id, can_view, can_edit) 
                               VALUES (?, ?, ?, ?)";
                               
                $insertStmt = $db->prepare($insertQuery);
                $insertStmt->execute([
                    $data['group_id'],
                    $permission['menu_id'],
                    $permission['can_view'] ? 1 : 0,
                    $permission['can_edit'] ? 1 : 0
                ]);
            }
        }
        
        $db->commit();
        
        // Invia la risposta
        sendJsonResponse(true, 'Permessi aggiornati con successo', null);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log('Database error in updatePermission: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'aggiornamento dei permessi', null, 500);
    }
}


function hasPermission($db) {
    return true;
}

/**
 * Invia una risposta JSON formattata
 */
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Get user's role
$userId = $_SESSION['user']['id'];
$isAdmin = isAdmin($db, $userId);
// Ottieni l'azione richiesta
$requestData = json_decode(file_get_contents('php://input'), true);
    
if (!isset($_GET['action']) && (!$requestData || !isset($requestData['action']))) {
    error_log("No action specified in request");
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'No action specified'
    ]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : $requestData['action'];

// Log per debug
error_log("Request action: " . $action);

// Processa l'azione richiesta
switch ($action) {
    // --- AZIONI UTENTI ---
    case 'getUsers':
        getUsers($db);
        break;
        
    case 'createUser':
        createUser($db, $requestData);
        break;
        
    case 'updateUser':
        updateUser($db, $requestData);
        break;
        
    case 'deleteUser':
        deleteUser($db, $requestData);
        break;
        
    case 'updateUserGroups':
        updateUserGroups($db, $requestData);
        break;
    
    // --- AZIONI GRUPPI ---
    case 'getGroups':
        getGroups($db);
        break;
        
    case 'createGroup':
        createGroup($db, $requestData);
        break;
        
    case 'updateGroup':
        updateGroup($db, $requestData);
        break;
        
    case 'deleteGroup':
        deleteGroup($db, $requestData);
        break;
    
    // --- AZIONI PERMESSI ---
    case 'getMenuItems':
        getMenuItems($db);
        break;
        
    case 'getPermissions':
        getPermissions($db);
        break;
        
    case 'updatePermission':
        updatePermission($db, $requestData);
        break;
    
    default:
        error_log("Invalid action requested: " . $action);
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid action: ' . $action
        ]);
        break;
}


// --- IMPLEMENTAZIONE FUNZIONI UTENTI ---

/**
 * Ottiene la lista degli utenti
 */
/**
 * Ottiene la lista degli utenti
 */
function getUsers($db) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Non hai i permessi per visualizzare gli utenti'
        ]);
        return;
    }
    
    try {
        // Query per ottenere gli utenti - con backtick attorno alla parola riservata "groups"
        $query = "SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at, 
                         GROUP_CONCAT(DISTINCT ug.group_id) as `groups`
                  FROM t_users u
                  LEFT JOIN t_user_groups ug ON u.id = ug.user_id
                  GROUP BY u.id
                  ORDER BY u.username";
        
        error_log("Executing user query: " . $query);
                  
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        // Ottieni i risultati
        $users = $stmt->fetchAll();
        
        // Invia la risposta
        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
    } catch (Exception $e) {
        error_log("Error getting users: " . $e->getMessage());
        throw new Exception('Error retrieving users: ' . $e->getMessage());
    }
}

/**
 * Crea un nuovo utente
 */
function createUser($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Non hai i permessi per creare utenti'
        ]);
        return;
    }
    
    // Valida i dati
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Dati mancanti o non validi'
        ]);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che username ed email non siano già utilizzati
        $checkQuery = "SELECT COUNT(*) as count FROM t_users WHERE username = ? OR email = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['username'], $data['email']]);
        $result = $checkStmt->fetch();
        
        if ($result['count'] > 0) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Username o email già in uso'
            ]);
            return;
        }
        
        // Hash della password
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Inserisci il nuovo utente
        $query = "INSERT INTO t_users (username, password, email, full_name, is_active, created_at) 
                  VALUES (?, ?, ?, ?, ?, NOW())";
        
        $stmt = $db->prepare($query);
        $stmt->execute([
            $data['username'],
            $hashedPassword,
            $data['email'],
            $data['full_name'] ?? '',
            $data['is_active'] ?? 1
        ]);
        
        $userId = $db->lastInsertId();
        
        // Se sono stati specificati dei gruppi, assegnali all'utente
        if (isset($data['groups']) && is_array($data['groups'])) {
            $groupsQuery = "INSERT INTO t_user_groups (user_id, group_id) VALUES (?, ?)";
            $groupsStmt = $db->prepare($groupsQuery);
            
            foreach ($data['groups'] as $groupId) {
                $groupsStmt->execute([$userId, $groupId]);
            }
        }
        
        $db->commit();
        
        // Recupera l'utente appena creato per restituirlo
        $getUserQuery = "SELECT id, username, email, full_name, is_active, created_at FROM t_users WHERE id = ?";
        $getUserStmt = $db->prepare($getUserQuery);
        $getUserStmt->execute([$userId]);
        $newUser = $getUserStmt->fetch();
        
        // Invia la risposta
        echo json_encode([
            'success' => true,
            'message' => 'Utente creato con successo',
            'data' => $newUser
        ]);
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error creating user: " . $e->getMessage());
        throw new Exception('Error creating user: ' . $e->getMessage());
    }
}

/**
 * Aggiorna un utente esistente
 */
function updateUser($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per modificare utenti', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['id'])) {
        sendJsonResponse(false, 'ID utente mancante', null, 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che l'utente esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_users WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Utente non trovato', null, 404);
            return;
        }
        
        // Verifica che l'email non sia già utilizzata da un altro utente
        if (isset($data['email'])) {
            $emailCheckQuery = "SELECT COUNT(*) as count FROM t_users WHERE email = ? AND id != ?";
            $emailCheckStmt = $db->prepare($emailCheckQuery);
            $emailCheckStmt->execute([$data['email'], $data['id']]);
            $emailCheck = $emailCheckStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($emailCheck['count'] > 0) {
                sendJsonResponse(false, 'Email già in uso', null, 400);
                return;
            }
        }
        
        // Prepara la query di aggiornamento
        $updateFields = [];
        $updateParams = [];
        
        // Aggiorna solo i campi forniti
        if (isset($data['email'])) {
            $updateFields[] = "email = ?";
            $updateParams[] = $data['email'];
        }
        
        if (isset($data['full_name'])) {
            $updateFields[] = "full_name = ?";
            $updateParams[] = $data['full_name'];
        }
        
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            $updateParams[] = $data['is_active'];
        }
        
        // Aggiorna la password solo se fornita
        if (isset($data['password']) && !empty($data['password'])) {
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $updateFields[] = "password = ?";
            $updateParams[] = $hashedPassword;
        }
        
        // Se non ci sono campi da aggiornare, termina
        if (count($updateFields) == 0) {
            sendJsonResponse(false, 'Nessun campo da aggiornare', null, 400);
            return;
        }
        
        // Esegui l'aggiornamento
        $updateQuery = "UPDATE t_users SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $updateParams[] = $data['id'];
        
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute($updateParams);
        
        // Se sono stati specificati dei gruppi, aggiornali
        if (isset($data['groups'])) {
            // Rimuovi tutti i gruppi esistenti per l'utente
            $deleteGroupsQuery = "DELETE FROM t_user_groups WHERE user_id = ?";
            $deleteGroupsStmt = $db->prepare($deleteGroupsQuery);
            $deleteGroupsStmt->execute([$data['id']]);
            
            // Aggiungi i nuovi gruppi
            if (is_array($data['groups']) && count($data['groups']) > 0) {
                $insertGroupsQuery = "INSERT INTO t_user_groups (user_id, group_id) VALUES (?, ?)";
                $insertGroupsStmt = $db->prepare($insertGroupsQuery);
                
                foreach ($data['groups'] as $groupId) {
                    $insertGroupsStmt->execute([$data['id'], $groupId]);
                }
            }
        }
        
        $db->commit();
        
        // Invia la risposta
        sendJsonResponse(true, 'Utente aggiornato con successo', null);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'aggiornamento dell\'utente', null, 500);
    }
}

/**
 * Elimina un utente
 */
function deleteUser($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per eliminare utenti', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['id'])) {
        sendJsonResponse(false, 'ID utente mancante', null, 400);
        return;
    }
    
    // Non permettere l'eliminazione dell'utente corrente
    if ($data['id'] == $_SESSION['user']['id']) {
        sendJsonResponse(false, 'Non puoi eliminare il tuo account', null, 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che l'utente esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_users WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Utente non trovato', null, 404);
            return;
        }
        
        // Elimina le associazioni ai gruppi
        $deleteGroupsQuery = "DELETE FROM t_user_groups WHERE user_id = ?";
        $deleteGroupsStmt = $db->prepare($deleteGroupsQuery);
        $deleteGroupsStmt->execute([$data['id']]);
        
        // Elimina l'utente
        $deleteQuery = "DELETE FROM t_users WHERE id = ?";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->execute([$data['id']]);
        
        $db->commit();
        
        // Invia la risposta
        sendJsonResponse(true, 'Utente eliminato con successo', null);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'eliminazione dell\'utente', null, 500);
    }
}

/**
 * Aggiorna i gruppi di un utente
 */
function updateUserGroups($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per modificare i gruppi degli utenti', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['user_id']) || !isset($data['group_ids'])) {
        sendJsonResponse(false, 'Dati mancanti', null, 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che l'utente esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_users WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['user_id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Utente non trovato', null, 404);
            return;
        }
        
        // Rimuovi tutti i gruppi esistenti per l'utente
        $deleteQuery = "DELETE FROM t_user_groups WHERE user_id = ?";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->execute([$data['user_id']]);
        
        // Aggiungi i nuovi gruppi
        if (is_array($data['group_ids']) && count($data['group_ids']) > 0) {
            $insertQuery = "INSERT INTO t_user_groups (user_id, group_id) VALUES (?, ?)";
            $insertStmt = $db->prepare($insertQuery);
            
            foreach ($data['group_ids'] as $groupId) {
                $insertStmt->execute([$data['user_id'], $groupId]);
            }
        }
        
        $db->commit();
        
        // Invia la risposta
        sendJsonResponse(true, 'Gruppi utente aggiornati con successo', null);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'aggiornamento dei gruppi', null, 500);
    }
}

// --- IMPLEMENTAZIONE FUNZIONI GRUPPI ---

/**
 * Ottiene la lista dei gruppi
 */
function getGroups($db) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per visualizzare i gruppi', null, 403);
        return;
    }
    
    try {
        // Query per ottenere i gruppi
        $query = "SELECT id, name, description, created_at FROM t_groups ORDER BY name";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        // Ottieni i risultati
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Invia la risposta
        sendJsonResponse(true, 'Gruppi ottenuti con successo', $groups);
    } catch (PDOException $e) {
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nel recupero dei gruppi', null, 500);
    }
}

/**
 * Crea un nuovo gruppo
 */
function createGroup($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per creare gruppi', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['name']) || empty($data['name'])) {
        sendJsonResponse(false, 'Nome gruppo mancante', null, 400);
        return;
    }
    
    try {
        // Verifica che il nome del gruppo non sia già utilizzato
        $checkQuery = "SELECT COUNT(*) as count FROM t_groups WHERE name = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['name']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            sendJsonResponse(false, 'Nome gruppo già in uso', null, 400);
            return;
        }
        
        // Inserisci il nuovo gruppo
        $query = "INSERT INTO t_groups (name, description, created_at) VALUES (?, ?, NOW())";
        $stmt = $db->prepare($query);
        $stmt->execute([
            $data['name'],
            $data['description'] ?? null
        ]);
        
        $groupId = $db->lastInsertId();
        
        // Recupera il gruppo appena creato per restituirlo
        $getGroupQuery = "SELECT id, name, description, created_at FROM t_groups WHERE id = ?";
        $getGroupStmt = $db->prepare($getGroupQuery);
        $getGroupStmt->execute([$groupId]);
        $newGroup = $getGroupStmt->fetch(PDO::FETCH_ASSOC);
        
        // Invia la risposta
        sendJsonResponse(true, 'Gruppo creato con successo', $newGroup);
    } catch (PDOException $e) {
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nella creazione del gruppo', null, 500);
    }
}

/**
 * Aggiorna un gruppo esistente
 */
function updateGroup($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per modificare gruppi', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['id']) || !isset($data['name']) || empty($data['name'])) {
        sendJsonResponse(false, 'Dati mancanti', null, 400);
        return;
    }
    
    try {
        // Verifica che il gruppo esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_groups WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Gruppo non trovato', null, 404);
            return;
        }
        
        // Verifica che il nome del gruppo non sia già utilizzato da un altro gruppo
        $nameCheckQuery = "SELECT COUNT(*) as count FROM t_groups WHERE name = ? AND id != ?";
        $nameCheckStmt = $db->prepare($nameCheckQuery);
        $nameCheckStmt->execute([$data['name'], $data['id']]);
        $nameCheck = $nameCheckStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($nameCheck['count'] > 0) {
            sendJsonResponse(false, 'Nome gruppo già in uso', null, 400);
            return;
        }
        
        // Aggiorna il gruppo
        $query = "UPDATE t_groups SET name = ?, description = ? WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            $data['id']
        ]);
        
        // Invia la risposta
        sendJsonResponse(true, 'Gruppo aggiornato con successo', null);
    } catch (PDOException $e) {
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'aggiornamento del gruppo', null, 500);
    }
}

/**
 * Elimina un gruppo
 */
function deleteGroup($db, $data) {
    // Verifica che l'utente corrente abbia i permessi (admin)
    if (!hasPermission($db)) {
        sendJsonResponse(false, 'Non hai i permessi per eliminare gruppi', null, 403);
        return;
    }
    
    // Valida i dati
    if (!isset($data['id'])) {
        sendJsonResponse(false, 'ID gruppo mancante', null, 400);
        return;
    }
    
    try {
        $db->beginTransaction();
        
        // Verifica che il gruppo esista
        $checkQuery = "SELECT COUNT(*) as count FROM t_groups WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$data['id']]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            sendJsonResponse(false, 'Gruppo non trovato', null, 404);
            return;
        }
        
        // Elimina le associazioni di utenti al gruppo
        $deleteUsersQuery = "DELETE FROM t_user_groups WHERE group_id = ?";
        $deleteUsersStmt = $db->prepare($deleteUsersQuery);
        $deleteUsersStmt->execute([$data['id']]);
        
        // Elimina il gruppo
        $deleteQuery = "DELETE FROM t_groups WHERE id = ?";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->execute([$data['id']]);
        
        $db->commit();
        
        // Invia la risposta
        sendJsonResponse(true, 'Gruppo eliminato con successo', null);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log('Database error: ' . $e->getMessage());
        sendJsonResponse(false, 'Errore nell\'eliminazione del gruppo', null, 500);
    }
}