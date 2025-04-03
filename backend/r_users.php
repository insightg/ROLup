<?php
// users.php - Gestione utenti e gruppi

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

// Configura connessione al database
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
function checkAuth() {
    if (!isset($_SESSION['user']) || !$_SESSION['user']['logged_in']) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'User not authenticated'
        ]);
        exit;
    }

    // Verifica se l'utente è admin (può gestire utenti)
    $isAdmin = false;
    foreach ($_SESSION['user']['groups'] as $group) {
        if ($group['name'] === 'admin') {
            $isAdmin = true;
            break;
        }
    }

    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: Admin rights required'
        ]);
        exit;
    }

    return $_SESSION['user'];
}

// Funzione per elencare utenti
function getUsers($db, $page = 1, $limit = 20, $search = '') {
    try {
        $offset = ($page - 1) * $limit;
        
        // Prepara la query di conteggio
        $countQuery = "SELECT COUNT(*) FROM t_users";
        $whereClause = '';
        $params = [];

        if (!empty($search)) {
            $whereClause = " WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?";
            $searchParam = "%$search%";
            $params = [$searchParam, $searchParam, $searchParam];
        }
        
        $stmt = $db->prepare($countQuery . $whereClause);
        $stmt->execute($params);
        $total = $stmt->fetchColumn();
        
        // Prepara la query per ottenere gli utenti
        $query = "
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.full_name, 
                u.is_active,
                u.last_login,
                u.created_at
            FROM t_users u
            $whereClause
            ORDER BY u.username
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $db->prepare($query);
        
        foreach ($params as $index => $param) {
            $stmt->bindValue($index + 1, $param);
        }
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $users = $stmt->fetchAll();

        // Per ogni utente, ottieni i gruppi
        foreach ($users as &$user) {
            $stmt = $db->prepare("
                SELECT 
                    g.id, 
                    g.name,
                    g.description
                FROM t_groups g
                JOIN t_user_groups ug ON g.id = ug.group_id
                WHERE ug.user_id = ?
            ");
            $stmt->execute([$user['id']]);
            $user['groups'] = $stmt->fetchAll();
        }

        $totalPages = ceil($total / $limit);
        
        return [
            'success' => true,
            'users' => $users,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => $totalPages
            ]
        ];
    } catch (Exception $e) {
        error_log("Error getting users: " . $e->getMessage());
        throw new Exception('Error getting users: ' . $e->getMessage());
    }
}

// Funzione per ottenere un utente specifico
function getUser($db, $userId) {
    try {
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.full_name, 
                u.is_active,
                u.last_login,
                u.created_at
            FROM t_users u
            WHERE u.id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return [
                'success' => false,
                'error' => 'User not found'
            ];
        }

        // Ottieni i gruppi dell'utente
        $stmt = $db->prepare("
            SELECT 
                g.id, 
                g.name,
                g.description
            FROM t_groups g
            JOIN t_user_groups ug ON g.id = ug.group_id
            WHERE ug.user_id = ?
        ");
        $stmt->execute([$userId]);
        $user['groups'] = $stmt->fetchAll();

        return [
            'success' => true,
            'user' => $user
        ];
    } catch (Exception $e) {
        error_log("Error getting user: " . $e->getMessage());
        throw new Exception('Error getting user: ' . $e->getMessage());
    }
}

// Funzione per creare un nuovo utente
function createUser($db, $userData) {
    try {
        // Verifica dati obbligatori
        if (empty($userData['username']) || empty($userData['password']) || 
            empty($userData['email']) || empty($userData['full_name'])) {
            return [
                'success' => false,
                'error' => 'Username, password, email and full name are required'
            ];
        }

        // Verifica se l'username o l'email sono già in uso
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM t_users 
            WHERE username = ? OR email = ?
        ");
        $stmt->execute([$userData['username'], $userData['email']]);
        if ($stmt->fetchColumn() > 0) {
            return [
                'success' => false,
                'error' => 'Username or email already in use'
            ];
        }

        // Hash della password
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);

        // Inizia transazione
        $db->beginTransaction();

        // Inserisci il nuovo utente
        $stmt = $db->prepare("
            INSERT INTO t_users (username, password, email, full_name, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $isActive = isset($userData['is_active']) ? $userData['is_active'] : 1;
        $stmt->execute([
            $userData['username'],
            $hashedPassword,
            $userData['email'],
            $userData['full_name'],
            $isActive
        ]);

        $userId = $db->lastInsertId();

        // Assegna gruppi se specificati
        if (!empty($userData['groups']) && is_array($userData['groups'])) {
            $stmt = $db->prepare("
                INSERT INTO t_user_groups (user_id, group_id)
                VALUES (?, ?)
            ");
            foreach ($userData['groups'] as $groupId) {
                $stmt->execute([$userId, $groupId]);
            }
        }

        $db->commit();

        return [
            'success' => true,
            'message' => 'User created successfully',
            'userId' => $userId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error creating user: " . $e->getMessage());
        throw new Exception('Error creating user: ' . $e->getMessage());
    }
}

// Funzione per aggiornare un utente esistente
function updateUser($db, $userId, $userData) {
    try {
        // Verifica dati obbligatori
        if (empty($userData['username']) || empty($userData['email']) || empty($userData['full_name'])) {
            return [
                'success' => false,
                'error' => 'Username, email and full name are required'
            ];
        }

        // Verifica se l'username o l'email sono già in uso da altri utenti
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM t_users 
            WHERE (username = ? OR email = ?) AND id != ?
        ");
        $stmt->execute([$userData['username'], $userData['email'], $userId]);
        if ($stmt->fetchColumn() > 0) {
            return [
                'success' => false,
                'error' => 'Username or email already in use by another user'
            ];
        }

        // Inizia transazione
        $db->beginTransaction();

        // Prepara i campi da aggiornare
        $updateFields = [
            'username = ?',
            'email = ?',
            'full_name = ?',
            'is_active = ?'
        ];
        $params = [
            $userData['username'],
            $userData['email'],
            $userData['full_name'],
            isset($userData['is_active']) ? $userData['is_active'] : 1
        ];

        // Se è specificata una nuova password, aggiungila all'aggiornamento
        if (!empty($userData['password'])) {
            $updateFields[] = 'password = ?';
            $params[] = password_hash($userData['password'], PASSWORD_DEFAULT);
        }

        // Aggiorna l'utente
        $query = "UPDATE t_users SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $params[] = $userId;

        $stmt = $db->prepare($query);
        $stmt->execute($params);

        // Aggiorna i gruppi se specificati
        if (isset($userData['groups']) && is_array($userData['groups'])) {
            // Rimuovi tutti i gruppi esistenti
            $stmt = $db->prepare("DELETE FROM t_user_groups WHERE user_id = ?");
            $stmt->execute([$userId]);

            // Aggiungi i nuovi gruppi
            if (!empty($userData['groups'])) {
                $stmt = $db->prepare("
                    INSERT INTO t_user_groups (user_id, group_id)
                    VALUES (?, ?)
                ");
                foreach ($userData['groups'] as $groupId) {
                    $stmt->execute([$userId, $groupId]);
                }
            }
        }

        $db->commit();

        return [
            'success' => true,
            'message' => 'User updated successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error updating user: " . $e->getMessage());
        throw new Exception('Error updating user: ' . $e->getMessage());
    }
}

// Funzione per eliminare un utente
function deleteUser($db, $userId) {
    try {
        // Previeni l'eliminazione dell'utente corrente
        if ($userId == $_SESSION['user']['id']) {
            return [
                'success' => false,
                'error' => 'Cannot delete current user'
            ];
        }

        $db->beginTransaction();

        // Rimuovi associazioni con gruppi
        $stmt = $db->prepare("DELETE FROM t_user_groups WHERE user_id = ?");
        $stmt->execute([$userId]);

        // Rimuovi l'utente
        $stmt = $db->prepare("DELETE FROM t_users WHERE id = ?");
        $stmt->execute([$userId]);

        $db->commit();

        return [
            'success' => true,
            'message' => 'User deleted successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error deleting user: " . $e->getMessage());
        throw new Exception('Error deleting user: ' . $e->getMessage());
    }
}

// Funzioni per la gestione dei gruppi
function getGroups($db) {
    try {
        $stmt = $db->prepare("
            SELECT 
                g.id, 
                g.name, 
                g.description,
                g.created_at,
                COUNT(DISTINCT ug.user_id) as user_count
            FROM t_groups g
            LEFT JOIN t_user_groups ug ON g.id = ug.group_id
            GROUP BY g.id, g.name, g.description, g.created_at
            ORDER BY g.name
        ");
        $stmt->execute();
        $groups = $stmt->fetchAll();

        return [
            'success' => true,
            'groups' => $groups
        ];
    } catch (Exception $e) {
        error_log("Error getting groups: " . $e->getMessage());
        throw new Exception('Error getting groups: ' . $e->getMessage());
    }
}

function getGroup($db, $groupId) {
    try {
        $stmt = $db->prepare("
            SELECT 
                g.id, 
                g.name, 
                g.description,
                g.created_at
            FROM t_groups g
            WHERE g.id = ?
        ");
        $stmt->execute([$groupId]);
        $group = $stmt->fetch();

        if (!$group) {
            return [
                'success' => false,
                'error' => 'Group not found'
            ];
        }

        // Ottieni gli utenti nel gruppo
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.full_name,
                u.email
            FROM t_users u
            JOIN t_user_groups ug ON u.id = ug.user_id
            WHERE ug.group_id = ?
            ORDER BY u.username
        ");
        $stmt->execute([$groupId]);
        $group['users'] = $stmt->fetchAll();

        // Ottieni i permessi del gruppo
        $stmt = $db->prepare("
            SELECT 
                mp.id,
                mp.menu_id,
                mi.name as menu_name,
                mi.page_url,
                mp.can_view,
                mp.can_edit
            FROM t_menu_permissions mp
            JOIN t_menu_items mi ON mp.menu_id = mi.id
            WHERE mp.group_id = ?
            ORDER BY mi.menu_type, mi.parent_id, mi.menu_order
        ");
        $stmt->execute([$groupId]);
        $group['permissions'] = $stmt->fetchAll();

        return [
            'success' => true,
            'group' => $group
        ];
    } catch (Exception $e) {
        error_log("Error getting group: " . $e->getMessage());
        throw new Exception('Error getting group: ' . $e->getMessage());
    }
}

function createGroup($db, $groupData) {
    try {
        // Verifica dati obbligatori
        if (empty($groupData['name'])) {
            return [
                'success' => false,
                'error' => 'Group name is required'
            ];
        }

        // Verifica se il nome è già in uso
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_groups WHERE name = ?");
        $stmt->execute([$groupData['name']]);
        if ($stmt->fetchColumn() > 0) {
            return [
                'success' => false,
                'error' => 'Group name already in use'
            ];
        }

        // Inizia transazione
        $db->beginTransaction();

        // Inserisci il nuovo gruppo
        $stmt = $db->prepare("
            INSERT INTO t_groups (name, description, created_at)
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([
            $groupData['name'],
            $groupData['description'] ?? ''
        ]);

        $groupId = $db->lastInsertId();

        // Assegna permessi se specificati
        if (!empty($groupData['permissions']) && is_array($groupData['permissions'])) {
            $stmt = $db->prepare("
                INSERT INTO t_menu_permissions (group_id, menu_id, can_view, can_edit)
                VALUES (?, ?, ?, ?)
            ");
            foreach ($groupData['permissions'] as $permission) {
                $stmt->execute([
                    $groupId,
                    $permission['menu_id'],
                    $permission['can_view'] ?? 0,
                    $permission['can_edit'] ?? 0
                ]);
            }
        }

        $db->commit();

        return [
            'success' => true,
            'message' => 'Group created successfully',
            'groupId' => $groupId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error creating group: " . $e->getMessage());
        throw new Exception('Error creating group: ' . $e->getMessage());
    }
}

function updateGroup($db, $groupId, $groupData) {
    try {
        // Verifica dati obbligatori
        if (empty($groupData['name'])) {
            return [
                'success' => false,
                'error' => 'Group name is required'
            ];
        }

        // Verifica se il nome è già in uso da un altro gruppo
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM t_groups 
            WHERE name = ? AND id != ?
        ");
        $stmt->execute([$groupData['name'], $groupId]);
        if ($stmt->fetchColumn() > 0) {
            return [
                'success' => false,
                'error' => 'Group name already in use by another group'
            ];
        }

        // Inizia transazione
        $db->beginTransaction();

        // Aggiorna il gruppo
        $stmt = $db->prepare("
            UPDATE t_groups
            SET name = ?, description = ?
            WHERE id = ?
        ");
	$stmt->execute([
		$groupData['name'],
            $groupData['description'] ?? '',
            $groupId
        ]);

        // Aggiorna i permessi se specificati
        if (isset($groupData['permissions']) && is_array($groupData['permissions'])) {
            // Rimuovi tutti i permessi esistenti
            $stmt = $db->prepare("DELETE FROM t_menu_permissions WHERE group_id = ?");
            $stmt->execute([$groupId]);

            // Aggiungi i nuovi permessi
            if (!empty($groupData['permissions'])) {
                $stmt = $db->prepare("
                    INSERT INTO t_menu_permissions (group_id, menu_id, can_view, can_edit)
                    VALUES (?, ?, ?, ?)
                ");
                foreach ($groupData['permissions'] as $permission) {
                    $stmt->execute([
                        $groupId,
                        $permission['menu_id'],
                        $permission['can_view'] ?? 0,
                        $permission['can_edit'] ?? 0
                    ]);
                }
            }
        }

        $db->commit();

        return [
            'success' => true,
            'message' => 'Group updated successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error updating group: " . $e->getMessage());
        throw new Exception('Error updating group: ' . $e->getMessage());
    }
}

function deleteGroup($db, $groupId) {
    try {
        $db->beginTransaction();

        // Verifica se il gruppo ha utenti associati
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_user_groups WHERE group_id = ?");
        $stmt->execute([$groupId]);
        if ($stmt->fetchColumn() > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete group with associated users. Remove users from group first.'
            ];
        }

        // Rimuovi permessi del gruppo
        $stmt = $db->prepare("DELETE FROM t_menu_permissions WHERE group_id = ?");
        $stmt->execute([$groupId]);

        // Rimuovi il gruppo
        $stmt = $db->prepare("DELETE FROM t_groups WHERE id = ?");
        $stmt->execute([$groupId]);

        $db->commit();

        return [
            'success' => true,
            'message' => 'Group deleted successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error deleting group: " . $e->getMessage());
        throw new Exception('Error deleting group: ' . $e->getMessage());
    }
}

// Funzioni per la gestione delle voci di menu
function getMenuItems($db) {
    try {
        $stmt = $db->prepare("
            SELECT
                id,
                name,
                icon,
                page_url,
                parent_id,
                menu_type,
                menu_order
            FROM t_menu_items
            ORDER BY menu_type, parent_id, menu_order
        ");
        $stmt->execute();
        $menuItems = $stmt->fetchAll();

        // Organizza i menu in una struttura gerarchica
        $organizedMenu = [];
        $menuByType = [];

        foreach ($menuItems as $item) {
            $type = $item['menu_type'];
            if (!isset($menuByType[$type])) {
                $menuByType[$type] = [];
            }
            $menuByType[$type][] = $item;
        }

        foreach ($menuByType as $type => $items) {
            $organizedMenu[$type] = buildMenuTree($items);
        }

        return [
            'success' => true,
            'menuItems' => $menuItems,
            'organizedMenu' => $organizedMenu
        ];
    } catch (Exception $e) {
        error_log("Error getting menu items: " . $e->getMessage());
        throw new Exception('Error getting menu items: ' . $e->getMessage());
    }
}

function buildMenuTree($items, $parentId = null) {
    $branch = [];

    foreach ($items as $item) {
        if ($item['parent_id'] === $parentId) {
            $children = buildMenuTree($items, $item['id']);
            if ($children) {
                $item['children'] = $children;
            }
            $branch[] = $item;
        }
    }

    return $branch;
}

// Funzione per ottenere utenti con assegnazione di gruppo
function getUsersWithGroups($db) {
    try {
        $stmt = $db->prepare("
            SELECT
                u.id,
                u.username,
                u.full_name,
                GROUP_CONCAT(g.name SEPARATOR ', ') as groups
            FROM t_users u
            LEFT JOIN t_user_groups ug ON u.id = ug.user_id
            LEFT JOIN t_groups g ON ug.group_id = g.id
            WHERE u.is_active = 1
            GROUP BY u.id, u.username, u.full_name
            ORDER BY u.username
        ");
        $stmt->execute();
        $users = $stmt->fetchAll();

        return [
            'success' => true,
            'users' => $users
        ];
    } catch (Exception $e) {
        error_log("Error getting users with groups: " . $e->getMessage());
        throw new Exception('Error getting users with groups: ' . $e->getMessage());
    }
}

// Router
$router = [
    'getUsers' => function() use ($db) {
        checkAuth();
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 20;
        $search = $_GET['search'] ?? '';
        return getUsers($db, $page, $limit, $search);
    },
    'getUser' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('User ID is required');
        }
        return getUser($db, $_GET['id']);
    },
    'createUser' => function() use ($db) {
        checkAuth();
        $userData = json_decode(file_get_contents('php://input'), true);
        return createUser($db, $userData);
    },
    'updateUser' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('User ID is required');
        }
        $userData = json_decode(file_get_contents('php://input'), true);
        return updateUser($db, $_GET['id'], $userData);
    },
    'deleteUser' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('User ID is required');
        }
        return deleteUser($db, $_GET['id']);
    },
    'getGroups' => function() use ($db) {
        checkAuth();
        return getGroups($db);
    },
    'getGroup' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('Group ID is required');
        }
        return getGroup($db, $_GET['id']);
    },
    'createGroup' => function() use ($db) {
        checkAuth();
        $groupData = json_decode(file_get_contents('php://input'), true);
        return createGroup($db, $groupData);
    },
    'updateGroup' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('Group ID is required');
        }
        $groupData = json_decode(file_get_contents('php://input'), true);
        return updateGroup($db, $_GET['id'], $groupData);
    },
    'deleteGroup' => function() use ($db) {
        checkAuth();
        if (!isset($_GET['id'])) {
            throw new Exception('Group ID is required');
        }
        return deleteGroup($db, $_GET['id']);
    },
    'getMenuItems' => function() use ($db) {
        checkAuth();
        return getMenuItems($db);
    },
    'getUsersWithGroups' => function() use ($db) {
        checkAuth();
        return getUsersWithGroups($db);
    }
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

    $result = $router[$action]();
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
