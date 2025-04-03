<?php
// auth.php - Gestione autenticazione e sessioni

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

// Carica l'helper per la configurazione
require_once __DIR__ . '/config_helper.php';

// Carica la configurazione
try {
    $config = loadConfig();
} catch (Exception $e) {
    throw new Exception('Configuration error: ' . $e->getMessage());
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

// Funzione per verificare le credenziali di un utente
function login($db, $username, $password) {
    try {
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.password, 
                u.email, 
                u.full_name, 
                u.is_active
            FROM t_users u
            WHERE u.username = ? AND u.is_active = 1
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            return [
                'success' => false,
                'error' => 'Invalid username or password'
            ];
        }

        if (!password_verify($password, $user['password'])) {
            return [
                'success' => false,
                'error' => 'Invalid username or password'
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
        $stmt->execute([$user['id']]);
        $groups = $stmt->fetchAll();

        // Aggiorna ultimo accesso
        $stmt = $db->prepare("
            UPDATE t_users 
            SET last_login = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$user['id']]);

        // Ottieni i permessi del menu
        $permissions = getUserPermissions($db, $user['id']);

        // Prepara i dati della sessione (rimuovi la password)
        unset($user['password']);
        $sessionData = [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'groups' => $groups,
            'permissions' => $permissions,
            'logged_in' => true
        ];

        // Salva nella sessione
        $_SESSION['user'] = $sessionData;

        return [
            'success' => true,
            'user' => $sessionData
        ];
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        throw new Exception('Error during login: ' . $e->getMessage());
    }
}

// Funzione per ottenere i permessi dell'utente
function getUserPermissions($db, $userId) {
    try {
        $stmt = $db->prepare("
            SELECT 
                mi.id as menu_id,
                mi.name as menu_name,
                mi.page_url,
                mi.icon,
                mi.menu_type,
                mi.parent_id,
                mi.menu_order,
                MAX(mp.can_view) as can_view,
                MAX(mp.can_edit) as can_edit
            FROM t_menu_items mi
            LEFT JOIN t_menu_permissions mp ON mi.id = mp.menu_id
            LEFT JOIN t_user_groups ug ON mp.group_id = ug.group_id
            WHERE ug.user_id = ?
            GROUP BY mi.id, mi.name, mi.page_url, mi.icon, mi.menu_type, mi.parent_id, mi.menu_order
            ORDER BY mi.menu_type, mi.parent_id, mi.menu_order
        ");
        $stmt->execute([$userId]);
        $menuItems = $stmt->fetchAll();

        // Organizza il menu per tipo
        $menusByType = [];
        foreach ($menuItems as $item) {
            $type = $item['menu_type'];
            if (!isset($menusByType[$type])) {
                $menusByType[$type] = [];
            }
            $menusByType[$type][] = $item;
        }

        return $menusByType;
    } catch (Exception $e) {
        error_log("Error getting user permissions: " . $e->getMessage());
        throw new Exception('Error getting user permissions: ' . $e->getMessage());
    }
}

// Funzione per verificare se l'utente è autenticato
function checkAuth() {
    if (!isset($_SESSION['user']) || !$_SESSION['user']['logged_in']) {
        return [
            'success' => false,
            'error' => 'User not authenticated'
        ];
    }

    return [
        'success' => true,
        'user' => $_SESSION['user']
    ];
}

// Funzione di logout
function logout() {
    session_unset();
    session_destroy();
    return [
        'success' => true,
        'message' => 'Logged out successfully'
    ];
}

// Funzione per modificare la password
function changePassword($db, $userId, $currentPassword, $newPassword) {
    try {
        // Verifica password attuale
        $stmt = $db->prepare("SELECT password FROM t_users WHERE id = ?");
        $stmt->execute([$userId]);
        $userData = $stmt->fetch();

        if (!$userData || !password_verify($currentPassword, $userData['password'])) {
            return [
                'success' => false,
                'error' => 'Current password is incorrect'
            ];
        }

        // Cripta la nuova password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

        // Aggiorna la password
        $stmt = $db->prepare("UPDATE t_users SET password = ? WHERE id = ?");
        $stmt->execute([$hashedPassword, $userId]);

        return [
            'success' => true,
            'message' => 'Password changed successfully'
        ];
    } catch (Exception $e) {
        error_log("Error changing password: " . $e->getMessage());
        throw new Exception('Error changing password: ' . $e->getMessage());
    }
}

// Funzione per ottenere il profilo utente
function getUserProfile($db, $userId) {
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
        $groups = $stmt->fetchAll();
        
        $user['groups'] = $groups;

        return [
            'success' => true,
            'profile' => $user
        ];
    } catch (Exception $e) {
        error_log("Error getting user profile: " . $e->getMessage());
        throw new Exception('Error getting user profile: ' . $e->getMessage());
    }
}

// Router
$router = [
    'login' => function() use ($db) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['username'], $data['password'])) {
            throw new Exception('Username and password are required');
        }
        return login($db, $data['username'], $data['password']);
    },
    'logout' => function() {
        return logout();
    },
    'checkAuth' => function() {
        return checkAuth();
    },
    'changePassword' => function() use ($db) {
        $authCheck = checkAuth();
        if (!$authCheck['success']) {
            return $authCheck;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['currentPassword'], $data['newPassword'])) {
            throw new Exception('Current password and new password are required');
        }

        return changePassword($db, $_SESSION['user']['id'], $data['currentPassword'], $data['newPassword']);
    },
    'getProfile' => function() use ($db) {
        $authCheck = checkAuth();
        if (!$authCheck['success']) {
            return $authCheck;
        }

        return getUserProfile($db, $_SESSION['user']['id']);
    }
];

// Gestione richieste
try {
    // Verifica se l'action è specificata nei parametri GET
    if (isset($_GET['action'])) {
        $action = $_GET['action'];
    } else {
        // Se non è nei parametri GET, prova a leggerla dal corpo della richiesta
        $requestData = json_decode(file_get_contents('php://input'), true);
        if (isset($requestData['action'])) {
            $action = $requestData['action'];
        } else {
            throw new Exception('No action specified');
        }
    }
    
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
