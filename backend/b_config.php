<?php
declare(strict_types=1);

require_once __DIR__ . '/../common/head.php';

// Get the requested action from either GET or POST data
$action = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Per le richieste POST, leggiamo l'action dal body JSON
    $jsonInput = file_get_contents('php://input');
    if ($jsonInput) {
        $data = json_decode($jsonInput, true);
        $action = $data['action'] ?? '';
    }
}




try {
    switch ($action) {

        case 'updateMenuItem':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleUpdateMenuItem();
            break;

        case 'updateMenuPermissions':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleUpdateMenuPermissions();
            break;

        case 'updateUserGroups':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleUpdateUserGroups();
            break;

            case 'updateUserPassword':
                if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                    throw new Exception('Invalid request method');
                }
                handleUpdateUserPassword();
                break;

                case 'updateGroupUsers':
                    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                        throw new Exception('Invalid request method');
                    }
                    handleUpdateGroupUsers();
                    break;

        case 'getGroupUsers':
            handleGetGroupUsers();
            break;

        case 'save_config':
            handleSaveConfig();
            break;

        case 'getUsers':
            handleGetUsers();
            break;

        case 'createUser':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleCreateUser();
            break;

        case 'deleteUser':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleDeleteUser();
            break;

        case 'getGroups':
            handleGetGroups();
            break;

        case 'createGroup':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleCreateGroup();
            break;

        case 'deleteGroup':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleDeleteGroup();
            break;

        case 'getUserGroups':
            handleGetUserGroups();
            break;


            case 'getMenuItems':
                handleGetMenuItems();
                break;
                
            case 'createMenuItem':
                if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                    throw new Exception('Invalid request method');
                }
                handleCreateMenuItem();
                break;
                
   
            case 'deleteMenuItem':
                if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                    throw new Exception('Invalid request method');
                }
                handleDeleteMenuItem();
                break;
                
            case 'getMenuPermissions':
                handleGetMenuPermissions();
                break;
                
     

        default:
            sendResponse(false, 'Invalid action: ' . $action);
    }
} catch (Exception $e) {
    error_log("Configuration error: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

function handleUpdateMenuItem(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['id']) || empty($data['name']) || empty($data['menu_type'])) {
        throw new Exception('ID, name and menu type are required');
    }
    
    try {
        $stmt = $db->prepare("
            UPDATE t_menu_items 
            SET 
                name = ?,
                icon = ?,
                page_url = ?,
                parent_id = ?,
                menu_type = ?,
                menu_order = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['name'],
            $data['icon'] ?? null,
            $data['page_url'] ?? null,
            $data['parent_id'] ?? null,
            $data['menu_type'],
            $data['menu_order'] ?? 0,
            $data['id']
        ]);
        
        sendResponse(true, 'Menu item updated successfully');
    } catch (PDOException $e) {
        throw new Exception('Failed to update menu item: ' . $e->getMessage());
    }
}


function handleUpdateMenuPermissions(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['menuId']) || empty($data['permissions'])) {
        throw new Exception('Menu ID and permissions are required');
    }
    
    try {
        $db->beginTransaction();
        
        // Delete existing permissions
        $stmt = $db->prepare("
            DELETE FROM t_menu_permissions 
            WHERE menu_id = ?
        ");
        $stmt->execute([$data['menuId']]);
        
        // Insert new permissions
        $stmt = $db->prepare("
            INSERT INTO t_menu_permissions (
                menu_id, 
                group_id, 
                can_view, 
                can_edit
            ) VALUES (?, ?, ?, ?)
        ");
        
        foreach ($data['permissions'] as $perm) {
            if ($perm['can_view'] || $perm['can_edit']) {
                $stmt->execute([
                    $data['menuId'],
                    $perm['group_id'],
                    $perm['can_view'] ? 1 : 0,
                    $perm['can_edit'] ? 1 : 0
                ]);
            }
        }
        
        $db->commit();
        sendResponse(true, 'Menu permissions updated successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to update menu permissions: ' . $e->getMessage());
    }
}

function handleUpdateUserPassword(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['userId']) || empty($data['password'])) {
        throw new Exception('User ID and new password are required');
    }
    
    // Validate password length
    if (strlen($data['password']) < 8) {
        throw new Exception('Password must be at least 8 characters long');
    }
    
    try {
        // Check if user exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_users WHERE id = ?");
        $stmt->execute([$data['userId']]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('User not found');
        }
        
        // Update password
        $stmt = $db->prepare("UPDATE t_users SET password = ? WHERE id = ?");
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt->execute([$passwordHash, $data['userId']]);
        
        sendResponse(true, 'Password updated successfully');
    } catch (PDOException $e) {
        throw new Exception('Failed to update password: ' . $e->getMessage());
    }
}

function handleSaveConfig(): void {
    // Get JSON input
    $jsonInput = file_get_contents('php://input');
    if (!$jsonInput) {
        throw new Exception('No data received');
    }

    $data = json_decode($jsonInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data');
    }

    // Verifichiamo che ci sia la configurazione
    if (!isset($data['config'])) {
        throw new Exception('No configuration data provided');
    }

    $configData = $data['config'];

    // Validate configuration data
    validateConfigData($configData);

    // Get the appropriate config file path
    $configPath = getConfigPath();

    // Backup existing config
    backupConfig($configPath);

    // Save new configuration
    if (!saveConfig($configPath, $configData)) {
        throw new Exception('Failed to save configuration');
    }

    sendResponse(true, 'Configuration saved successfully');
}


function handleUpdateGroupUsers(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['groupId']) || !isset($data['users'])) {
        throw new Exception('Group ID and users are required');
    }
    
    try {
        $db->beginTransaction();
        
        // Check if group exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_groups WHERE id = ?");
        $stmt->execute([$data['groupId']]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('Group not found');
        }
        
        // Remove existing user associations
        $stmt = $db->prepare("DELETE FROM t_user_groups WHERE group_id = ?");
        $stmt->execute([$data['groupId']]);
        
        // Add new user associations
        if (!empty($data['users'])) {
            $stmt = $db->prepare("
                INSERT INTO t_user_groups (user_id, group_id) 
                VALUES (?, ?)
            ");
            
            foreach ($data['users'] as $userId) {
                $stmt->execute([$userId, $data['groupId']]);
            }
        }
        
        $db->commit();
        sendResponse(true, 'Group users updated successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to update group users: ' . $e->getMessage());
    }
}

function handleUpdateUserGroups(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['userId']) || !isset($data['groups'])) {
        throw new Exception('User ID and groups are required');
    }
    
    try {
        $db->beginTransaction();
        
        // Check if user exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_users WHERE id = ?");
        $stmt->execute([$data['userId']]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('User not found');
        }
        
        // Remove existing group associations
        $stmt = $db->prepare("DELETE FROM t_user_groups WHERE user_id = ?");
        $stmt->execute([$data['userId']]);
        
        // Add new group associations
        if (!empty($data['groups'])) {
            $stmt = $db->prepare("
                INSERT INTO t_user_groups (user_id, group_id) 
                VALUES (?, ?)
            ");
            
            foreach ($data['groups'] as $groupId) {
                $stmt->execute([$data['userId'], $groupId]);
            }
        }
        
        $db->commit();
        sendResponse(true, 'User groups updated successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to update user groups: ' . $e->getMessage());
    }
}






function handleGetUsers(): void {
    global $db;
    try {
        $stmt = $db->prepare("
            SELECT 
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.is_active,
                u.created_at,
                u.last_login,
                COALESCE(GROUP_CONCAT(g.name SEPARATOR ', '), '') as group_list
            FROM t_users u
            LEFT JOIN t_user_groups ug ON u.id = ug.user_id
            LEFT JOIN t_groups g ON ug.group_id = g.id
            GROUP BY u.id
            ORDER BY u.username
        ");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format dates and boolean values
        foreach ($users as &$user) {
            $user['is_active'] = (bool)$user['is_active'];
            $user['created_at'] = $user['created_at'] ? date('Y-m-d H:i:s', strtotime($user['created_at'])) : null;
            $user['last_login'] = $user['last_login'] ? date('Y-m-d H:i:s', strtotime($user['last_login'])) : null;
            $user['group_list'] = $user['group_list'] ? explode(', ', $user['group_list']) : [];
        }
        
        // Invia direttamente l'array dei dati
        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch users: ' . $e->getMessage());
    }
}

function handleCreateUser(): void {
    global $db;
    $data = getJsonInput();
    
    // Validate required fields
    if (empty($data['username']) || empty($data['email']) || empty($data['password'])) {
        throw new Exception('Missing required fields');
    }
    
    // Validate email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    try {
        // Check if username or email already exists
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM t_users 
            WHERE username = ? OR email = ?
        ");
        $stmt->execute([$data['username'], $data['email']]);
        
        if ($stmt->fetchColumn() > 0) {
            throw new Exception('Username or email already exists');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        // Create user
        $stmt = $db->prepare("
            INSERT INTO t_users (
                username, 
                email, 
                password, 
                full_name,
                is_active,
                created_at
            ) VALUES (?, ?, ?, ?, 1, NOW())
        ");
        
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt->execute([
            $data['username'],
            $data['email'],
            $passwordHash,
            $data['full_name'] ?? null
        ]);
        
        $userId = $db->lastInsertId();
        
        // Add user to default group if specified
        if (!empty($data['default_group_id'])) {
            $stmt = $db->prepare("
                INSERT INTO t_user_groups (user_id, group_id)
                VALUES (?, ?)
            ");
            $stmt->execute([$userId, $data['default_group_id']]);
        }
        
        $db->commit();
        sendResponse(true, 'User created successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to create user: ' . $e->getMessage());
    }
}

function handleDeleteUser(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['userId'])) {
        throw new Exception('User ID is required');
    }
    
    try {
        $db->beginTransaction();
        
        // Check if user exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_users WHERE id = ?");
        $stmt->execute([$data['userId']]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('User not found');
        }
        
        // Delete user's group associations
        $stmt = $db->prepare("DELETE FROM t_user_groups WHERE user_id = ?");
        $stmt->execute([$data['userId']]);
        
        // Delete user
        $stmt = $db->prepare("DELETE FROM t_users WHERE id = ?");
        $stmt->execute([$data['userId']]);
        
        $db->commit();
        sendResponse(true, 'User deleted successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to delete user: ' . $e->getMessage());
    }
}

function handleGetUserGroups(): void {
    global $db;
    $userId = $_GET['userId'] ?? null;
    
    if (!$userId) {
        throw new Exception('User ID is required');
    }
    
    try {
        // Check if user exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_users WHERE id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('User not found');
        }
        
        // Get all groups and mark those assigned to the user
        $stmt = $db->prepare("
            SELECT 
                g.id,
                g.name,
                g.description,
                CASE WHEN ug.user_id IS NOT NULL THEN 1 ELSE 0 END as assigned
            FROM t_groups g
            LEFT JOIN t_user_groups ug ON g.id = ug.group_id AND ug.user_id = ?
            ORDER BY g.name
        ");
        $stmt->execute([$userId]);
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $groups
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch user groups: ' . $e->getMessage());
    }
}

function handleGetGroupUsers(): void {
    global $db;
    $groupId = $_GET['groupId'] ?? null;
    
    if (!$groupId) {
        throw new Exception('Group ID is required');
    }
    
    try {
        // Check if group exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_groups WHERE id = ?");
        $stmt->execute([$groupId]);
        if ($stmt->fetchColumn() == 0) {
            throw new Exception('Group not found');
        }
        
        // Get all users and mark those assigned to the group
        $stmt = $db->prepare("
            SELECT 
                u.id,
                u.username,
                u.email,
                u.full_name,
                CASE WHEN ug.group_id IS NOT NULL THEN 1 ELSE 0 END as assigned
            FROM t_users u
            LEFT JOIN t_user_groups ug ON u.id = ug.user_id AND ug.group_id = ?
            WHERE u.is_active = 1
            ORDER BY u.username
        ");
        $stmt->execute([$groupId]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch group users: ' . $e->getMessage());
    }
}

function handleGetMenuItems(): void {
    global $db;
    try {
        $stmt = $db->prepare("
            SELECT 
                m.*,
                p.name as parent_name
            FROM t_menu_items m
            LEFT JOIN t_menu_items p ON m.parent_id = p.id
            ORDER BY m.menu_type, m.menu_order, m.name
        ");
        $stmt->execute();
        $menus = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $menus
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch menu items: ' . $e->getMessage());
    }
}

function handleCreateMenuItem(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['name']) || empty($data['page_url']) || empty($data['menu_type'])) {
        throw new Exception('Name, URL and menu type are required');
    }
    
    if (!in_array($data['menu_type'], ['main', 'sidebar'])) {
        throw new Exception('Invalid menu type');
    }
    
    try {
        // Begin transaction
        $db->beginTransaction();
        
        // Get max order for this menu type
        $stmt = $db->prepare("
            SELECT MAX(menu_order) 
            FROM t_menu_items 
            WHERE menu_type = ?
        ");
        $stmt->execute([$data['menu_type']]);
        $maxOrder = $stmt->fetchColumn() ?: 0;
        
        // Create menu item
        $stmt = $db->prepare("
            INSERT INTO t_menu_items (
                name, 
                icon,
                page_url,
                parent_id,
                menu_type,
                menu_order
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['name'],
            $data['icon'] ?? null,
            $data['page_url'],
            $data['parent_id'] ?? null,
            $data['menu_type'],
            $maxOrder + 1
        ]);
        
        $menuId = $db->lastInsertId();
        
        $db->commit();
        sendResponse(true, 'Menu item created successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to create menu item: ' . $e->getMessage());
    }
}


function handleDeleteMenuItem(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['menuId'])) {
        throw new Exception('Menu ID is required');
    }
    
    try {
        $db->beginTransaction();
        
        // Update any child items to have no parent
        $stmt = $db->prepare("
            UPDATE t_menu_items 
            SET parent_id = NULL 
            WHERE parent_id = ?
        ");
        $stmt->execute([$data['menuId']]);
        
        // Delete menu permissions
        $stmt = $db->prepare("
            DELETE FROM t_menu_permissions 
            WHERE menu_id = ?
        ");
        $stmt->execute([$data['menuId']]);
        
        // Delete menu item
        $stmt = $db->prepare("
            DELETE FROM t_menu_items 
            WHERE id = ?
        ");
        $stmt->execute([$data['menuId']]);
        
        $db->commit();
        sendResponse(true, 'Menu item deleted successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to delete menu item: ' . $e->getMessage());
    }
}

function handleGetMenuPermissions(): void {
    global $db;
    $menuId = $_GET['menuId'] ?? null;
    
    if (!$menuId) {
        throw new Exception('Menu ID is required');
    }
    
    try {
        $stmt = $db->prepare("
            SELECT 
                g.*,
                mp.can_view,
                mp.can_edit
            FROM t_groups g
            LEFT JOIN t_menu_permissions mp ON g.id = mp.group_id AND mp.menu_id = ?
            ORDER BY g.name
        ");
        $stmt->execute([$menuId]);
        $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert boolean values
        foreach ($permissions as &$perm) {
            $perm['can_view'] = (bool)($perm['can_view'] ?? false);
            $perm['can_edit'] = (bool)($perm['can_edit'] ?? false);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $permissions
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch menu permissions: ' . $e->getMessage());
    }
}


function validateConfigData(array $configData): void {
    if (empty($configData)) {
        throw new Exception('Configuration data is empty');
    }

    // Required sections and their required keys
    $requiredSections = [
        'app' => ['name', 'timezone', 'debug'],
        'database' => ['host', 'dbname', 'username', 'password'],
        'security' => ['session_timeout', 'max_login_attempts'],
        'logging' => ['enabled', 'level']
    ];

    foreach ($requiredSections as $section => $requiredKeys) {
        if (!isset($configData[$section])) {
            throw new Exception("Missing required section: {$section}");
        }

        foreach ($requiredKeys as $key) {
            if (!isset($configData[$section][$key])) {
                throw new Exception("Missing required key '{$key}' in section '{$section}'");
            }
        }
    }

    // Validate specific fields
    if (isset($configData['app']['debug'])) {
        $configData['app']['debug'] = filter_var($configData['app']['debug'], FILTER_VALIDATE_BOOLEAN);
    }

    if (isset($configData['security']['session_timeout'])) {
        if (!is_numeric($configData['security']['session_timeout']) || 
            $configData['security']['session_timeout'] < 300) {
            throw new Exception('Session timeout must be at least 300 seconds');
        }
    }

    if (isset($configData['security']['max_login_attempts'])) {
        if (!is_numeric($configData['security']['max_login_attempts']) || 
            $configData['security']['max_login_attempts'] < 1) {
            throw new Exception('Maximum login attempts must be at least 1');
        }
    }

    // Validate database connection with new credentials
    if (isset($configData['database'])) {
        try {
            $dsn = sprintf(
                "mysql:host=%s;dbname=%s;charset=utf8mb4",
                $configData['database']['host'],
                $configData['database']['dbname']
            );
            
            $tempPdo = new PDO(
                $dsn,
                $configData['database']['username'],
                $configData['database']['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (PDOException $e) {
            throw new Exception('Invalid database configuration: ' . $e->getMessage());
        }
    }

    // Validate logging configuration
    if (isset($configData['logging']['level'])) {
        $validLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
        if (!in_array(strtoupper($configData['logging']['level']), $validLevels)) {
            throw new Exception('Invalid logging level specified');
        }
    }
}

function getConfigPath(): string {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $configRoot = BASEPATH . '/config';
    
    // Check for environment-specific config
    $env = getenv('APP_ENV') ?: 'production';
    if ($env !== 'production') {
        $envConfigPath = $configRoot . '/' . $env . '/config.ini';
        if (file_exists($envConfigPath)) {
            return $envConfigPath;
        }
    }
    
    // Check for domain-specific config
    $parts = explode('.', $host);
    $subdomain = count($parts) >= 3 ? $parts[0] : 'default';
    
    $configDir = $configRoot . '/' . $subdomain;
    if (!is_dir($configDir)) {
        $configDir = $configRoot . '/default';
    }
    
    if (!is_dir($configDir)) {
        throw new Exception('Configuration directory not found');
    }
    
    return $configDir . '/config.ini';
}

function backupConfig(string $configPath): void {
    if (!file_exists($configPath)) {
        return;
    }

    $backupDir = dirname($configPath) . '/backups';
    if (!is_dir($backupDir)) {
        if (!mkdir($backupDir, 0755, true)) {
            throw new Exception('Failed to create backup directory');
        }
    }

    // Generate backup filename with timestamp
    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = sprintf(
        '%s/config_%s_%s.ini',
        $backupDir,
        $timestamp,
        substr(md5(uniqid()), 0, 8)
    );
    
    if (!copy($configPath, $backupPath)) {
        throw new Exception('Failed to create backup');
    }

    // Maintain backup rotation - keep only last 10 backups
    $backups = glob($backupDir . '/config_*.ini');
    if (count($backups) > 10) {
        usort($backups, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        
        $toDelete = array_slice($backups, 0, count($backups) - 10);
        foreach ($toDelete as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
    }
}

function saveConfig(string $configPath, array $configData): bool {
    $output = ";<?php exit; ?>\n";  // Prevent direct access to ini file
    $output .= ";/**\n";
    $output .= "; * Application Configuration\n";
    $output .= "; * Last modified: " . date('Y-m-d H:i:s') . "\n";
    $output .= "; */\n\n";
    
    foreach ($configData as $section => $data) {
        $output .= "[{$section}]\n";
        
        foreach ($data as $key => $value) {
            // Format the value based on its type
            if (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            } elseif (is_array($value)) {
                $value = json_encode($value);
            } elseif (is_string($value)) {
                // Escape special characters and wrap in quotes
                $value = '"' . addslashes($value) . '"';
            }
            
            $output .= "{$key} = {$value}\n";
        }
        
        $output .= "\n";
    }
    
    // Ensure directory exists
    $configDir = dirname($configPath);
    if (!is_dir($configDir)) {
        if (!mkdir($configDir, 0755, true)) {
            throw new Exception('Failed to create configuration directory');
        }
    }
    
    // Write configuration with proper permissions
    $result = file_put_contents($configPath, $output, LOCK_EX);
    if ($result === false) {
        throw new Exception('Failed to write configuration file');
    }
    
    // Set proper file permissions
    chmod($configPath, 0640);
    
    return true;
}

/**
 * Retrieves and validates JSON input data
 */
function getJsonInput(): array {
    $jsonInput = file_get_contents('php://input');
    if (!$jsonInput) {
        throw new Exception('No data received');
    }

    $data = json_decode($jsonInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    return $data;
}

/**
 * Sends a JSON response with proper headers
 */
function sendResponse(bool $success, string $message = '', array $data = []): void {
    // Ensure proper content type
    header('Content-Type: application/json; charset=utf-8');
    
    // Prevent caching of responses
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
    
    $response = [
        'success' => $success,
        'message' => $message,
    ];
    
    if (!empty($data)) {
        $response['data'] = $data;
    }
    
    // Add request ID for debugging
    if (defined('DEBUG') && DEBUG) {
        $response['request_id'] = uniqid('req_');
    }
    
    echo json_encode($response, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Gets groups from database
 */function handleGetGroups(): void {
    global $db;
    try {
        $stmt = $db->prepare("
            SELECT 
                g.id,
                g.name,
                g.description,
                COUNT(DISTINCT ug.user_id) as user_count,
                g.created_at
            FROM t_groups g
            LEFT JOIN t_user_groups ug ON g.id = ug.group_id
            GROUP BY g.id, g.name, g.description, g.created_at
            ORDER BY g.name
        ");
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($groups as &$group) {
            $group['created_at'] = $group['created_at'] ? date('Y-m-d H:i:s', strtotime($group['created_at'])) : null;
            $group['user_count'] = (int)$group['user_count'];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $groups
        ]);
        exit;
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch groups: ' . $e->getMessage());
    }
}
/**
 * Creates a new group
 */
function handleCreateGroup(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['name'])) {
        throw new Exception('Group name is required');
    }
    
    try {
        // Check if group name already exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM t_groups WHERE name = ?");
        $stmt->execute([$data['name']]);
        
        if ($stmt->fetchColumn() > 0) {
            throw new Exception('Group name already exists');
        }
        
        // Create group
        $stmt = $db->prepare("
            INSERT INTO t_groups (name, description, created_at)
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([
            $data['name'],
            $data['description'] ?? ''
        ]);
        
        sendResponse(true, 'Group created successfully');
    } catch (PDOException $e) {
        throw new Exception('Failed to create group: ' . $e->getMessage());
    }
}

/**
 * Deletes a group
 */
function handleDeleteGroup(): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['groupId'])) {
        throw new Exception('Group ID is required');
    }
    
    try {
        $db->beginTransaction();
        
        // Delete group's user associations
        $stmt = $db->prepare("DELETE FROM t_user_groups WHERE group_id = ?");
        $stmt->execute([$data['groupId']]);
        
        // Delete group
        $stmt = $db->prepare("DELETE FROM t_groups WHERE id = ?");
        $stmt->execute([$data['groupId']]);
        
        $db->commit();
        sendResponse(true, 'Group deleted successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        throw new Exception('Failed to delete group: ' . $e->getMessage());
    }
}