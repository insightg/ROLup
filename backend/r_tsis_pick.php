<?php
// Configurazione iniziale
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

// Helpers for PM role
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

function isPMManager($db, $userId) {
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM t_user_groups ug 
        JOIN t_groups g ON g.id = ug.group_id 
        WHERE g.name = 'pm_manager' AND ug.user_id = ?
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchColumn() > 0;
}

// Get user's role
$isManager = isPMManager($db, $_SESSION['user']['id']);
$isPM = isPM($db, $_SESSION['user']['id']);
$userRole = $isManager ? 'manager' : ($isPM ? 'pm' : 'user');

// API Functions

/**
 * Get all modules
 */
function getModules($db) {
    try {
        $stmt = $db->prepare("SELECT * FROM tsis_pick_module WHERE active = 1 ORDER BY name");
        $stmt->execute();
        $modules = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $modules
        ];
    } catch (Exception $e) {
        error_log("Error getting modules: " . $e->getMessage());
        throw new Exception('Error retrieving modules: ' . $e->getMessage());
    }
}

/**
 * Get all materials
 */
function getMaterials($db) {
    try {
        $stmt = $db->prepare("
            SELECT m.*, s.name as supplier_name, s.code as supplier_code 
            FROM tsis_pick_material m
            LEFT JOIN tsis_pick_supplier s ON m.supplier_id = s.id
            WHERE m.active = 1
            ORDER BY s.name, m.article_code
        ");
        $stmt->execute();
        $materials = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $materials
        ];
    } catch (Exception $e) {
        error_log("Error getting materials: " . $e->getMessage());
        throw new Exception('Error retrieving materials: ' . $e->getMessage());
    }
}

/**
 * Get all suppliers
 */
function getSuppliers($db) {
    try {
        $stmt = $db->prepare("SELECT * FROM tsis_pick_supplier WHERE active = 1 ORDER BY name");
        $stmt->execute();
        $suppliers = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $suppliers
        ];
    } catch (Exception $e) {
        error_log("Error getting suppliers: " . $e->getMessage());
        throw new Exception('Error retrieving suppliers: ' . $e->getMessage());
    }
}


// r_tsis_pick.php - enhanced version of getPOSOrders function

/**
 * Get all POS orders with enhanced module configuration information
 */
function getPOSOrders($db, $userRole, $userId) {
    try {
        // Get sorting parameters
        $sortField = isset($_GET['sort_field']) ? $_GET['sort_field'] : 'has_modules';
        $sortOrder = isset($_GET['sort_order']) && strtolower($_GET['sort_order']) === 'desc' ? 'DESC' : 'ASC';
        
        // Validate sort field to prevent SQL injection
        $allowedSortFields = [
            'pos_name', 'tipo_attivita_desc', 'stato', 
            'sf_territory', 'data_creazione', 'has_modules',
            'module_count'
        ];
        
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'has_modules';
        }
        
        // Special handling for has_modules and module_count fields
        $orderByClause = '';
        if ($sortField === 'has_modules') {
            $orderByClause = "ORDER BY has_modules {$sortOrder}, pos_name ASC";
        } elseif ($sortField === 'module_count') {
            $orderByClause = "ORDER BY module_count {$sortOrder}, pos_name ASC";
        } else {
            $orderByClause = "ORDER BY {$sortField} {$sortOrder}";
        }
        
        // Build base query with enhanced module information
        $mainQuery = "";
        $params = [];
        
        if ($userRole === 'manager') {
            // Managers can see all orders
            $mainQuery = "
                SELECT p.id, p.pos_id, a.nome_account as pos_name, 
                p.data_creazione, p.stato, p.progress, p.pm_id, 
                u.username as pm_username, u.full_name as pm_full_name,
                p.tipo_attivita_id, t.descrizione as tipo_attivita_desc,
                a.sf_region, a.sf_territory, a.rrp_segment,
                a.indirizzo_spedizioni, a.citt_spedizioni, a.cap_spedizioni,
                (SELECT COUNT(*) FROM tsis_pick_pos_module m WHERE m.pos_order_id = p.id) as module_count,
                CASE WHEN (SELECT COUNT(*) FROM tsis_pick_pos_module m WHERE m.pos_order_id = p.id) > 0 
                     THEN 1 ELSE 0 END as has_modules,
                (SELECT GROUP_CONCAT(DISTINCT m2.installation_type SEPARATOR ',') 
                 FROM tsis_pick_pos_module m2 WHERE m2.pos_order_id = p.id) as module_types
                FROM tsis_pos_management p
                LEFT JOIN tsis_anagrafica a ON p.pos_id = a.id
                LEFT JOIN t_users u ON p.pm_id = u.id
                LEFT JOIN tsis_attivita_ordine_pos t ON p.tipo_attivita_id = t.id
            ";
        } else {
            // Regular PMs can only see their assigned orders
            $mainQuery = "
                SELECT p.id, p.pos_id, a.nome_account as pos_name, 
                p.data_creazione, p.stato, p.progress, p.pm_id, 
                u.username as pm_username, u.full_name as pm_full_name,
                p.tipo_attivita_id, t.descrizione as tipo_attivita_desc,
                a.sf_region, a.sf_territory, a.rrp_segment,
                a.indirizzo_spedizioni, a.citt_spedizioni, a.cap_spedizioni,
                (SELECT COUNT(*) FROM tsis_pick_pos_module m WHERE m.pos_order_id = p.id) as module_count,
                CASE WHEN (SELECT COUNT(*) FROM tsis_pick_pos_module m WHERE m.pos_order_id = p.id) > 0 
                     THEN 1 ELSE 0 END as has_modules,
                (SELECT GROUP_CONCAT(DISTINCT m2.installation_type SEPARATOR ',') 
                 FROM tsis_pick_pos_module m2 WHERE m2.pos_order_id = p.id) as module_types
                FROM tsis_pos_management p
                LEFT JOIN tsis_anagrafica a ON p.pos_id = a.id
                LEFT JOIN t_users u ON p.pm_id = u.id
                LEFT JOIN tsis_attivita_ordine_pos t ON p.tipo_attivita_id = t.id
                WHERE p.pm_id = ?
            ";
            $params = [$userId];
        }
        
        // Complete the query with filter and order clauses
        $sql = $mainQuery;
        
        // Filter by configuration status if requested
        if (isset($_GET['filter_configured']) && $_GET['filter_configured'] === '1') {
            $sql .= " HAVING has_modules = 1 ";
        }
        
        // Add the ORDER BY clause
        $sql .= " {$orderByClause}";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        // Convert numeric fields to appropriate types for JSON
        foreach ($orders as &$order) {
            // Convert to boolean for frontend usage
            $order['has_modules'] = (bool)$order['has_modules'];
            // Convert to integer
            $order['module_count'] = (int)$order['module_count'];
            
            // Parse module_types into an array if not empty
            if (!empty($order['module_types'])) {
                $order['module_types'] = explode(',', $order['module_types']);
            } else {
                $order['module_types'] = [];
            }
        }
        
        return [
            'success' => true,
            'data' => $orders,
            'userRole' => $userRole
        ];
    } catch (Exception $e) {
        error_log("Error getting POS orders: " . $e->getMessage());
        throw new Exception('Error retrieving POS orders: ' . $e->getMessage());
    }
}
/**
 * Get details for a specific POS order
 */
function getPOSOrderDetails($db, $orderId) {
    try {
        $stmt = $db->prepare("
            SELECT p.id, p.pos_id, a.nome_account as pos_name, 
            p.data_creazione, p.stato, p.progress, p.pm_id, 
            u.username as pm_username, u.full_name as pm_full_name,
            p.tipo_attivita_id, t.descrizione as tipo_attivita_desc,
            a.sf_region, a.sf_territory, a.rrp_segment,
            a.indirizzo_spedizioni, a.citt_spedizioni, a.cap_spedizioni,
            a.statoprovincia_spedizioni, a.telefono, a.email
            FROM tsis_pos_management p
            LEFT JOIN tsis_anagrafica a ON p.pos_id = a.id
            LEFT JOIN t_users u ON p.pm_id = u.id
            LEFT JOIN tsis_attivita_ordine_pos t ON p.tipo_attivita_id = t.id
            WHERE p.id = ?
        ");
        $stmt->execute([$orderId]);
        $orderDetails = $stmt->fetch();
        
        if (!$orderDetails) {
            return [
                'success' => false,
                'error' => 'Order not found'
            ];
        }
        
        return [
            'success' => true,
            'data' => $orderDetails
        ];
    } catch (Exception $e) {
        error_log("Error getting order details: " . $e->getMessage());
        throw new Exception('Error retrieving order details: ' . $e->getMessage());
    }
}

/**
 * Get modules configured for a specific POS order
 */
function getPOSModules($db, $orderId) {
    try {
        $stmt = $db->prepare("
            SELECT pm.*, m.code as module_code, m.name as module_name, 
            m.width, m.height, m.depth, m.description as module_description
            FROM tsis_pick_pos_module pm
            JOIN tsis_pick_module m ON pm.module_id = m.id
            WHERE pm.pos_order_id = ?
            ORDER BY pm.id
        ");
        $stmt->execute([$orderId]);
        $modules = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $modules
        ];
    } catch (Exception $e) {
        error_log("Error getting POS modules: " . $e->getMessage());
        throw new Exception('Error retrieving POS modules: ' . $e->getMessage());
    }
}



/**
 * Delete a picking list
 * @param {number} id - Picking list ID
 */
function deletePickList($db, $id) {
    try {
        $db->beginTransaction();
        
        // First delete the association to POS orders
        $posStmt = $db->prepare("DELETE FROM tsis_pick_pos_list WHERE pick_list_id = ?");
        $posStmt->execute([$id]);
        
        // Delete the pick list details
        $detailsStmt = $db->prepare("DELETE FROM tsis_pick_list_detail WHERE pick_list_id = ?");
        $detailsStmt->execute([$id]);
        
        // Finally delete the pick list itself
        $listStmt = $db->prepare("DELETE FROM tsis_pick_list WHERE id = ?");
        $listStmt->execute([$id]);
        
        if ($listStmt->rowCount() === 0) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Pick list not found'
            ];
        }
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Pick list deleted successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error deleting pick list: " . $e->getMessage());
        throw new Exception('Error deleting pick list: ' . $e->getMessage());
    }
}

/**
 * Add a material item to an existing pick list
 * @param {Object} data - Pick list item data
 */
function addPickListItem($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['pick_list_id']) || !isset($data['description']) || !isset($data['quantity'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields: pick_list_id, description, and quantity are required'
            ];
        }
        
        $db->beginTransaction();
        
        // First check if the pick list exists
        $checkStmt = $db->prepare("SELECT id, status FROM tsis_pick_list WHERE id = ?");
        $checkStmt->execute([$data['pick_list_id']]);
        $pickList = $checkStmt->fetch();
        
        if (!$pickList) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Pick list not found'
            ];
        }
        
        // Check if the status allows modifications
        if ($pickList['status'] === 'completed' || $pickList['status'] === 'cancelled') {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Cannot modify a ' . $pickList['status'] . ' pick list'
            ];
        }
        
        // Insert the new item
        $stmt = $db->prepare("
            INSERT INTO tsis_pick_list_detail 
            (pick_list_id, supplier_id, material_id, is_custom, article_code, 
             description, quantity, unit_of_measure, unit_price, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['pick_list_id'],
            $data['supplier_id'] ?? null,
            $data['material_id'] ?? null,
            $data['is_custom'] ?? 1,  // Default to custom item if not specified
            $data['article_code'] ?? null,
            $data['description'],
            $data['quantity'],
            $data['unit_of_measure'] ?? 'PZ',
            $data['unit_price'] ?? null,
            $data['notes'] ?? null
        ]);
        
        $itemId = $db->lastInsertId();
        
        // Update the pick list's updated_at timestamp
        $updateStmt = $db->prepare("
            UPDATE tsis_pick_list 
            SET updated_at = NOW(), updated_by = ?
            WHERE id = ?
        ");
        
        $updateStmt->execute([$userId, $data['pick_list_id']]);
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Item added to pick list successfully',
            'id' => $itemId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error adding pick list item: " . $e->getMessage());
        throw new Exception('Error adding item to pick list: ' . $e->getMessage());
    }
}

/**
 * Remove an item from a pick list
 * @param {number} id - Pick list detail ID
 */
function removePickListItem($db, $id, $userId) {
    try {
        $db->beginTransaction();
        
        // First check if the item exists and get its pick list ID
        $checkStmt = $db->prepare("
            SELECT d.pick_list_id, p.status 
            FROM tsis_pick_list_detail d 
            JOIN tsis_pick_list p ON d.pick_list_id = p.id 
            WHERE d.id = ?
        ");
        $checkStmt->execute([$id]);
        $item = $checkStmt->fetch();
        
        if (!$item) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Pick list item not found'
            ];
        }
        
        // Check if the status allows modifications
        if ($item['status'] === 'completed' || $item['status'] === 'cancelled') {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Cannot modify a ' . $item['status'] . ' pick list'
            ];
        }
        
        // Delete the item
        $stmt = $db->prepare("DELETE FROM tsis_pick_list_detail WHERE id = ?");
        $stmt->execute([$id]);
        
        // Update the pick list's updated_at timestamp
        $updateStmt = $db->prepare("
            UPDATE tsis_pick_list 
            SET updated_at = NOW(), updated_by = ?
            WHERE id = ?
        ");
        
        $updateStmt->execute([$userId, $item['pick_list_id']]);
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Item removed from pick list successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error removing pick list item: " . $e->getMessage());
        throw new Exception('Error removing item from pick list: ' . $e->getMessage());
    }
}

/**
 * Add module materials to a pick list
 * @param {Object} data - Module data to add to pick list
 */
function addModuleToPickList($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['pick_list_id']) || !isset($data['module_id']) || !isset($data['quantity'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields: pick_list_id, module_id, and quantity are required'
            ];
        }
        
        $db->beginTransaction();
        
        // Check if the pick list exists and its status
        $checkStmt = $db->prepare("SELECT id, status FROM tsis_pick_list WHERE id = ?");
        $checkStmt->execute([$data['pick_list_id']]);
        $pickList = $checkStmt->fetch();
        
        if (!$pickList) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Pick list not found'
            ];
        }
        
        // Check if the status allows modifications
        if ($pickList['status'] === 'completed' || $pickList['status'] === 'cancelled') {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Cannot modify a ' . $pickList['status'] . ' pick list'
            ];
        }
        
        // Get module info
        $moduleStmt = $db->prepare("SELECT * FROM tsis_pick_module WHERE id = ?");
        $moduleStmt->execute([$data['module_id']]);
        $module = $moduleStmt->fetch();
        
        if (!$module) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Module not found'
            ];
        }
        
        // Get module materials based on installation type
        $materialsStmt = $db->prepare("
            SELECT mm.*, m.article_code, m.description, m.unit_of_measure, m.unit_price, m.supplier_id
            FROM tsis_pick_module_material mm
            JOIN tsis_pick_material m ON mm.material_id = m.id
            WHERE mm.module_id = ? AND (mm.installation_type = ? OR mm.installation_type = 'BOTH')
        ");
        
        $installationType = $data['installation_type'] ?? 'BOTH';
        $materialsStmt->execute([$data['module_id'], $installationType]);
        $materials = $materialsStmt->fetchAll();
        
        if (empty($materials)) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'No materials found for this module and installation type'
            ];
        }
        
        // First add a header entry for the module itself
        $moduleNoteText = "Module: {$module['name']} - Installation: {$installationType}";
        if (!empty($data['notes'])) {
            $moduleNoteText .= " - Notes: {$data['notes']}";
        }
        
        $headerStmt = $db->prepare("
            INSERT INTO tsis_pick_list_detail 
            (pick_list_id, is_custom, description, quantity, unit_of_measure, notes) 
            VALUES (?, 1, ?, ?, 'PZ', ?)
        ");
        
        $headerStmt->execute([
            $data['pick_list_id'],
            "MODULE: {$module['name']} ({$module['code']})",
            $data['quantity'],
            $moduleNoteText
        ]);
        
        // Add all materials for this module
        $detailStmt = $db->prepare("
            INSERT INTO tsis_pick_list_detail 
            (pick_list_id, supplier_id, material_id, is_custom, article_code, 
             description, quantity, unit_of_measure, unit_price, notes) 
            VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($materials as $material) {
            // Calculate quantity based on the module quantity
            $totalQuantity = $material['quantity'] * $data['quantity'];
            
            $detailStmt->execute([
                $data['pick_list_id'],
                $material['supplier_id'],
                $material['material_id'],
                $material['article_code'],
                $material['description'],
                $totalQuantity,
                $material['unit_of_measure'],
                $material['unit_price'],
                "From module: {$module['name']} ({$module['code']})"
            ]);
        }
        
        // Update the pick list's updated_at timestamp
        $updateStmt = $db->prepare("
            UPDATE tsis_pick_list 
            SET updated_at = NOW(), updated_by = ?
            WHERE id = ?
        ");
        
        $updateStmt->execute([$userId, $data['pick_list_id']]);
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Module added to pick list successfully',
            'materials_count' => count($materials)
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error adding module to pick list: " . $e->getMessage());
        throw new Exception('Error adding module to pick list: ' . $e->getMessage());
    }
}





/**
 * Get custom materials for a specific POS order
 */
function getPOSCustomMaterials($db, $orderId) {
    try {
        $stmt = $db->prepare("
            SELECT cm.*, s.name as supplier_name, s.code as supplier_code
            FROM tsis_pick_pos_custom_material cm
            LEFT JOIN tsis_pick_supplier s ON cm.supplier_id = s.id
            WHERE cm.pos_order_id = ?
            ORDER BY cm.id
        ");
        $stmt->execute([$orderId]);
        $materials = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $materials
        ];
    } catch (Exception $e) {
        error_log("Error getting custom materials: " . $e->getMessage());
        throw new Exception('Error retrieving custom materials: ' . $e->getMessage());
    }
}

/**
 * Save a module configuration for a POS order
 */
function savePOSModule($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['pos_order_id']) || !isset($data['module_id']) || 
            !isset($data['quantity']) || !isset($data['installation_type'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing module
            $stmt = $db->prepare("
                UPDATE tsis_pick_pos_module 
                SET module_id = ?, quantity = ?, installation_type = ?, 
                    position = ?, notes = ?, updated_by = ?, updated_at = NOW()
                WHERE id = ? AND pos_order_id = ?
            ");
            
            $stmt->execute([
                $data['module_id'], 
                $data['quantity'], 
                $data['installation_type'], 
                $data['position'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $data['id'], 
                $data['pos_order_id']
            ]);
            
            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                return [
                    'success' => false,
                    'error' => 'Module not found or not authorized'
                ];
            }
            
            $moduleId = $data['id'];
        } else {
            // Insert new module
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_pos_module 
                (pos_order_id, module_id, quantity, installation_type, position, notes, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['pos_order_id'], 
                $data['module_id'], 
                $data['quantity'], 
                $data['installation_type'], 
                $data['position'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $userId
            ]);
            
            $moduleId = $db->lastInsertId();
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Module saved successfully', 
            'id' => $moduleId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving POS module: " . $e->getMessage());
        throw new Exception('Error saving module: ' . $e->getMessage());
    }
}

/**
 * Save a custom material for a POS order
 */
function savePOSCustomMaterial($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['pos_order_id']) || !isset($data['description']) || 
            !isset($data['quantity']) || !isset($data['unit_of_measure'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing material
            $stmt = $db->prepare("
                UPDATE tsis_pick_pos_custom_material 
                SET supplier_id = ?, article_code = ?, description = ?, 
                    quantity = ?, unit_of_measure = ?, unit_price = ?, 
                    notes = ?, updated_by = ?, updated_at = NOW()
                WHERE id = ? AND pos_order_id = ?
            ");
            
            $stmt->execute([
                $data['supplier_id'] ?? null, 
                $data['article_code'] ?? null, 
                $data['description'], 
                $data['quantity'], 
                $data['unit_of_measure'], 
                $data['unit_price'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $data['id'], 
                $data['pos_order_id']
            ]);
            
            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                return [
                    'success' => false,
                    'error' => 'Custom material not found or not authorized'
                ];
            }
            
            $materialId = $data['id'];
        } else {
            // Insert new material
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_pos_custom_material 
                (pos_order_id, supplier_id, article_code, description, quantity, unit_of_measure, unit_price, notes, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['pos_order_id'], 
                $data['supplier_id'] ?? null, 
                $data['article_code'] ?? null, 
                $data['description'], 
                $data['quantity'], 
                $data['unit_of_measure'], 
                $data['unit_price'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $userId
            ]);
            
            $materialId = $db->lastInsertId();
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Custom material saved successfully', 
            'id' => $materialId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving custom material: " . $e->getMessage());
        throw new Exception('Error saving custom material: ' . $e->getMessage());
    }
}

/**
 * Delete a module configuration for a POS order
 */
function deletePOSModule($db, $id) {
    try {
        $stmt = $db->prepare("DELETE FROM tsis_pick_pos_module WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Module not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Module deleted successfully'
        ];
    } catch (Exception $e) {
        error_log("Error deleting POS module: " . $e->getMessage());
        throw new Exception('Error deleting module: ' . $e->getMessage());
    }
}

/**
 * Delete a custom material for a POS order
 */
function deletePOSCustomMaterial($db, $id) {
    try {
        $stmt = $db->prepare("DELETE FROM tsis_pick_pos_custom_material WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Custom material not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Custom material deleted successfully'
        ];
    } catch (Exception $e) {
        error_log("Error deleting custom material: " . $e->getMessage());
        throw new Exception('Error deleting custom material: ' . $e->getMessage());
    }
}

// r_tsis_pick.php - Fix per la funzione generatePickList

/// r_tsis_pick.php - Soluzione con query separate per maggiore controllo

/**
 * Generate a picking list for multiple POS orders (separate queries approach)
 * @param {Array<number>} orderIds - Array of order IDs
 */
function generatePickList($db, $orderIds) {
    try {
        if (empty($orderIds)) {
            return [
                'success' => false,
                'error' => 'No orders selected'
            ];
        }
        
        // Build a placeholder string for the IN clause
        $placeholders = str_repeat('?,', count($orderIds) - 1) . '?';
        $pickListItems = [];
        
        // Step 1: Get standard module materials
        $modulesSql = "
            SELECT 
                s.id AS supplier_id,
                s.name AS supplier_name,
                s.code AS supplier_code,
                m.id AS material_id,
                m.article_code AS article_code,
                m.description AS description,
                SUM(pmm.quantity * pm.quantity) AS total_quantity,
                m.unit_of_measure AS unit_of_measure,
                m.unit_price AS unit_price,
                0 AS is_custom
            FROM tsis_pick_pos_module pm
            JOIN tsis_pick_module mo ON pm.module_id = mo.id
            JOIN tsis_pick_module_material pmm ON mo.id = pmm.module_id 
                AND (pmm.installation_type = pm.installation_type OR pmm.installation_type = 'BOTH')
            JOIN tsis_pick_material m ON pmm.material_id = m.id
            LEFT JOIN tsis_pick_supplier s ON m.supplier_id = s.id
            WHERE pm.pos_order_id IN ($placeholders)
            GROUP BY 
                s.id, s.name, s.code, m.id, m.article_code, m.description, 
                m.unit_of_measure, m.unit_price
        ";
        
        $stmt = $db->prepare($modulesSql);
        $stmt->execute($orderIds);
        $moduleItems = $stmt->fetchAll();
        $pickListItems = array_merge($pickListItems, $moduleItems);
        
        // Step 2: Get custom materials
        $customSql = "
            SELECT 
                s.id AS supplier_id,
                COALESCE(s.name, 'Unknown') AS supplier_name,
                COALESCE(s.code, 'UNKNOWN') AS supplier_code,
                NULL AS material_id,
                COALESCE(pcm.article_code, '') AS article_code,
                pcm.description AS description,
                SUM(pcm.quantity) AS total_quantity,
                pcm.unit_of_measure AS unit_of_measure,
                pcm.unit_price AS unit_price,
                1 AS is_custom
            FROM tsis_pick_pos_custom_material pcm
            LEFT JOIN tsis_pick_supplier s ON pcm.supplier_id = s.id
            WHERE pcm.pos_order_id IN ($placeholders)
            GROUP BY 
                s.id, COALESCE(s.name, 'Unknown'), COALESCE(s.code, 'UNKNOWN'), 
                COALESCE(pcm.article_code, ''), pcm.description, 
                pcm.unit_of_measure, pcm.unit_price
        ";
        
        $stmt = $db->prepare($customSql);
        $stmt->execute($orderIds);
        $customItems = $stmt->fetchAll();
        $pickListItems = array_merge($pickListItems, $customItems);
        
        // Sort the combined results by supplier and article code
        usort($pickListItems, function($a, $b) {
            // First sort by supplier name - using coalescing operator to handle null values
            $supplierA = $a['supplier_name'] ?? '';
            $supplierB = $b['supplier_name'] ?? '';
            $supplierCompare = strcmp($supplierA, $supplierB);
            if ($supplierCompare !== 0) {
                return $supplierCompare;
            }
            
            // Then by article code - using coalescing operator to handle null values
            $articleA = $a['article_code'] ?? '';
            $articleB = $b['article_code'] ?? '';
            return strcmp($articleA, $articleB);
        });
        
        // Also get order details for reference
        $orderDetailsSql = "SELECT p.id, a.nome_account as pos_name, t.descrizione as tipo_attivita_desc
                          FROM tsis_pos_management p
                          LEFT JOIN tsis_anagrafica a ON p.pos_id = a.id
                          LEFT JOIN tsis_attivita_ordine_pos t ON p.tipo_attivita_id = t.id
                          WHERE p.id IN ($placeholders)";
        
        $orderStmt = $db->prepare($orderDetailsSql);
        $orderStmt->execute($orderIds);
        $orderDetails = $orderStmt->fetchAll();
        
        return [
            'success' => true, 
            'data' => $pickListItems,
            'orders' => $orderDetails
        ];
    } catch (Exception $e) {
        error_log("Error generating pick list: " . $e->getMessage());
        throw new Exception('Error generating pick list: ' . $e->getMessage());
    }
}
/**
 * Save a supplier
 */
function saveSupplier($db, $data, $userId) {
    try {
        error_log("Starting saveSupplier with data: " . json_encode($data));

        // Validate required fields
        if (!isset($data['name']) || !isset($data['code'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing supplier
            $stmt = $db->prepare("
                UPDATE tsis_pick_supplier 
                SET name = ?, code = ?, contact_person = ?, 
                    email = ?, phone = ?, address = ?, active = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['name'], 
                $data['code'],
                $data['contact_person'] ?? null, 
                $data['email'] ?? null, 
                $data['phone'] ?? null, 
                $data['address'] ?? null, 
                $data['active'] ? 1 : 0, 
                $data['id']
            ]);
            
            $supplierId = $data['id'];
        } else {
            // Insert new supplier
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_supplier 
                (name, code, contact_person, email, phone, address, active) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['name'], 
                $data['code'],
                $data['contact_person'] ?? null, 
                $data['email'] ?? null, 
                $data['phone'] ?? null, 
                $data['address'] ?? null, 
                $data['active'] ? 1 : 0
            ]);
            
            $supplierId = $db->lastInsertId();
        }
        
        $db->commit();
        error_log("saveSupplier completed successfully with ID: $supplierId");

        return [
            'success' => true, 
            'message' => 'Supplier saved successfully', 
            'id' => $supplierId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving supplier: " . $e->getMessage());
        throw new Exception('Error saving supplier: ' . $e->getMessage());
    }
}


/**
 * Delete a supplier
 */
function deleteSupplier($db, $id) {
    try {
        // Check if materials are using this supplier
        $checkStmt = $db->prepare("SELECT COUNT(*) FROM tsis_pick_material WHERE supplier_id = ?");
        $checkStmt->execute([$id]);
        $materialsCount = $checkStmt->fetchColumn();
        
        if ($materialsCount > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete supplier: it is used by ' . $materialsCount . ' materials'
            ];
        }
        
        $stmt = $db->prepare("DELETE FROM tsis_pick_supplier WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Supplier not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Supplier deleted successfully'
        ];
    } catch (Exception $e) {
        error_log("Error deleting supplier: " . $e->getMessage());
        throw new Exception('Error deleting supplier: ' . $e->getMessage());
    }
}

/**
 * Save a material
 */
function saveMaterial($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['supplier_id']) || !isset($data['article_code']) || !isset($data['description'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing material
            $stmt = $db->prepare("
                UPDATE tsis_pick_material 
                SET supplier_id = ?, article_code = ?, description = ?, 
                    unit_of_measure = ?, unit_price = ?, category = ?, 
                    subcategory = ?, notes = ?, active = ?, 
                    updated_at = NOW(), updated_by = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['supplier_id'], 
                $data['article_code'],
                $data['description'], 
                $data['unit_of_measure'] ?? 'PZ', 
                $data['unit_price'] ?? null, 
                $data['category'] ?? null, 
                $data['subcategory'] ?? null, 
                $data['notes'] ?? null, 
                $data['active'] ? 1 : 0, 
                $userId, 
                $data['id']
            ]);
            
            $materialId = $data['id'];
        } else {
            // Insert new material
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_material 
                (supplier_id, article_code, description, unit_of_measure, 
                 unit_price, category, subcategory, notes, active, 
                 created_at, updated_at, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
            ");
            
            $stmt->execute([
                $data['supplier_id'], 
                $data['article_code'],
                $data['description'], 
                $data['unit_of_measure'] ?? 'PZ', 
                $data['unit_price'] ?? null, 
                $data['category'] ?? null, 
                $data['subcategory'] ?? null, 
                $data['notes'] ?? null, 
                $data['active'] ? 1 : 0, 
                $userId, 
                $userId
            ]);
            
            $materialId = $db->lastInsertId();
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Material saved successfully', 
            'id' => $materialId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving material: " . $e->getMessage());
        throw new Exception('Error saving material: ' . $e->getMessage());
    }
}

/**
 * Delete a material
 */
function deleteMaterial($db, $id) {
    try {
        // Check if any modules are using this material
        $checkStmt = $db->prepare("SELECT COUNT(*) FROM tsis_pick_module_material WHERE material_id = ?");
        $checkStmt->execute([$id]);
        $usageCount = $checkStmt->fetchColumn();
        
        if ($usageCount > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete material: it is assigned to ' . $usageCount . ' modules'
            ];
        }
        
        $stmt = $db->prepare("DELETE FROM tsis_pick_material WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Material not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Material deleted successfully'
        ];
    } catch (Exception $e) {
        error_log("Error deleting material: " . $e->getMessage());
        throw new Exception('Error deleting material: ' . $e->getMessage());
    }
}

/**
 * Save a module
 */
function saveModule($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['code']) || !isset($data['name']) || !isset($data['width']) || !isset($data['height'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing module
            $stmt = $db->prepare("
                UPDATE tsis_pick_module 
                SET code = ?, name = ?, width = ?, height = ?, depth = ?, 
                    installation_type = ?, description = ?, active = ?, 
                    updated_at = NOW(), updated_by = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['code'], 
                $data['name'],
                $data['width'], 
                $data['height'], 
                $data['depth'] ?? 0, 
                $data['installation_type'] ?? 'BOTH', 
                $data['description'] ?? null, 
                $data['active'] ? 1 : 0, 
                $userId, 
                $data['id']
            ]);
            
            $moduleId = $data['id'];
        } else {
            // Insert new module
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_module 
                (code, name, width, height, depth, installation_type, 
                 description, active, created_at, updated_at, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
            ");
            
            $stmt->execute([
                $data['code'], 
                $data['name'],
                $data['width'], 
                $data['height'], 
                $data['depth'] ?? 0, 
                $data['installation_type'] ?? 'BOTH', 
                $data['description'] ?? null, 
                $data['active'] ? 1 : 0, 
                $userId, 
                $userId
            ]);
            
            $moduleId = $db->lastInsertId();
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Module saved successfully', 
            'id' => $moduleId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving module: " . $e->getMessage());
        throw new Exception('Error saving module: ' . $e->getMessage());
    }
}

/**
 * Delete a module
 */
function deleteModule($db, $id) {
    try {
        $db->beginTransaction();
        
        // First delete any material assignments for this module
        $materialStmt = $db->prepare("DELETE FROM tsis_pick_module_material WHERE module_id = ?");
        $materialStmt->execute([$id]);
        
        // Then delete the module itself
        $moduleStmt = $db->prepare("DELETE FROM tsis_pick_module WHERE id = ?");
        $moduleStmt->execute([$id]);
        
        if ($moduleStmt->rowCount() === 0) {
            $db->rollBack();
            return [
                'success' => false,
                'error' => 'Module not found'
            ];
        }
        
        $db->commit();
        
        return [
            'success' => true,
            'message' => 'Module and its material assignments deleted successfully'
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error deleting module: " . $e->getMessage());
        throw new Exception('Error deleting module: ' . $e->getMessage());
    }
}

/**
 * Get materials for a specific module
 */
function getModuleMaterials($db, $moduleId) {
    try {
        $stmt = $db->prepare("
            SELECT mm.*, m.description as material_description, 
                  m.article_code as material_code, m.unit_of_measure,
                  s.name as supplier_name, s.code as supplier_code
            FROM tsis_pick_module_material mm
            JOIN tsis_pick_material m ON mm.material_id = m.id
            LEFT JOIN tsis_pick_supplier s ON m.supplier_id = s.id
            WHERE mm.module_id = ?
            ORDER BY mm.installation_type, m.description
        ");
        $stmt->execute([$moduleId]);
        $materials = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $materials
        ];
    } catch (Exception $e) {
        error_log("Error getting module materials: " . $e->getMessage());
        throw new Exception('Error retrieving module materials: ' . $e->getMessage());
    }
}

/**
 * Save a material assignment to a module
 */
function saveModuleMaterial($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['module_id']) || !isset($data['material_id']) || !isset($data['quantity'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        // Check if this assignment already exists
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing assignment
            $stmt = $db->prepare("
                UPDATE tsis_pick_module_material 
                SET material_id = ?, quantity = ?, mandatory = ?, 
                    installation_type = ?, notes = ?
                WHERE id = ? AND module_id = ?
            ");
            
            $stmt->execute([
                $data['material_id'], 
                $data['quantity'],
                $data['mandatory'] ? 1 : 0, 
                $data['installation_type'] ?? 'BOTH', 
                $data['notes'] ?? null, 
                $data['id'],
                $data['module_id']
            ]);
            
            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                return [
                    'success' => false,
                    'error' => 'Assignment not found or not authorized'
                ];
            }
            
            $assignmentId = $data['id'];
        } else {
            // Check if material is already assigned to this module with same installation type
            $checkStmt = $db->prepare("
                SELECT id FROM tsis_pick_module_material 
                WHERE module_id = ? AND material_id = ? AND installation_type = ?
            ");
            $checkStmt->execute([
                $data['module_id'], 
                $data['material_id'], 
                $data['installation_type'] ?? 'BOTH'
            ]);
            
            $existingId = $checkStmt->fetchColumn();
            
            if ($existingId) {
                // Update the existing record instead of creating a duplicate
                $stmt = $db->prepare("
                    UPDATE tsis_pick_module_material 
                    SET quantity = ?, mandatory = ?, notes = ?
                    WHERE id = ?
                ");
                
                $stmt->execute([
                    $data['quantity'],
                    $data['mandatory'] ? 1 : 0, 
                    $data['notes'] ?? null, 
                    $existingId
                ]);
                
                $assignmentId = $existingId;
            } else {
                // Insert new assignment
                $stmt = $db->prepare("
                    INSERT INTO tsis_pick_module_material 
                    (module_id, material_id, quantity, mandatory, installation_type, notes) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->execute([
                    $data['module_id'], 
                    $data['material_id'],
                    $data['quantity'], 
                    $data['mandatory'] ? 1 : 0, 
                    $data['installation_type'] ?? 'BOTH', 
                    $data['notes'] ?? null
                ]);
                
                $assignmentId = $db->lastInsertId();
            }
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Material assignment saved successfully', 
            'id' => $assignmentId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving module material: " . $e->getMessage());
        throw new Exception('Error saving material assignment: ' . $e->getMessage());
    }
}

/**
 * Delete a material assignment from a module
 */
function deleteModuleMaterial($db, $id) {
    try {
        $stmt = $db->prepare("DELETE FROM tsis_pick_module_material WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Material assignment not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Material assignment deleted successfully'
        ];
    } catch (Exception $e) {
        error_log("Error deleting module material: " . $e->getMessage());
        throw new Exception('Error deleting material assignment: ' . $e->getMessage());
    }
}



/**
 * Get all picking lists
 */
function getPickLists($db) {
    try {
        $stmt = $db->prepare("
            SELECT pl.*, u.username as created_by_username, u.full_name as created_by_name,
            COUNT(DISTINCT ppl.pos_order_id) as pos_count
            FROM tsis_pick_list pl
            LEFT JOIN t_users u ON pl.created_by = u.id
            LEFT JOIN tsis_pick_pos_list ppl ON pl.id = ppl.pick_list_id
            GROUP BY pl.id
            ORDER BY pl.created_at DESC
        ");
        $stmt->execute();
        $pickLists = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $pickLists
        ];
    } catch (Exception $e) {
        error_log("Error getting pick lists: " . $e->getMessage());
        throw new Exception('Error retrieving pick lists: ' . $e->getMessage());
    }
}

/**
 * Get details of a specific picking list
 */
function getPickListDetails($db, $pickListId) {
    try {
        // Get picking list header
        $headerStmt = $db->prepare("
            SELECT pl.*, u.username as created_by_username, u.full_name as created_by_name
            FROM tsis_pick_list pl
            LEFT JOIN t_users u ON pl.created_by = u.id
            WHERE pl.id = ?
        ");
        $headerStmt->execute([$pickListId]);
        $header = $headerStmt->fetch();
        
        if (!$header) {
            return [
                'success' => false,
                'error' => 'Picking list not found'
            ];
        }
        
        // Get picking list details (items)
        $detailsStmt = $db->prepare("
            SELECT d.*, s.name as supplier_name, s.code as supplier_code
            FROM tsis_pick_list_detail d
            LEFT JOIN tsis_pick_supplier s ON d.supplier_id = s.id
            WHERE d.pick_list_id = ?
            ORDER BY s.name, d.article_code
        ");
        $detailsStmt->execute([$pickListId]);
        $details = $detailsStmt->fetchAll();
        
        // Get associated POS orders
        $ordersStmt = $db->prepare("
            SELECT ppl.pos_order_id, p.stato, a.nome_account as pos_name, 
            t.descrizione as tipo_attivita_desc
            FROM tsis_pick_pos_list ppl
            JOIN tsis_pos_management p ON ppl.pos_order_id = p.id
            LEFT JOIN tsis_anagrafica a ON p.pos_id = a.id
            LEFT JOIN tsis_attivita_ordine_pos t ON p.tipo_attivita_id = t.id
            WHERE ppl.pick_list_id = ?
        ");
        $ordersStmt->execute([$pickListId]);
        $orders = $ordersStmt->fetchAll();
        
        // Format response to match frontend expectations
        $response = [
            'success' => true,
            'name' => $header['name'],
            'status' => $header['status'],
            'created_at' => $header['created_at'],
            'created_by_username' => $header['created_by_username'],
            'created_by_name' => $header['created_by_name'],
            'orders' => $orders,
            'items' => $details
        ];
        
        return $response;
    } catch (Exception $e) {
        error_log("Error getting pick list details: " . $e->getMessage());
        throw new Exception('Error retrieving pick list details: ' . $e->getMessage());
    }
}

/**
 * Save a picking list
 */
function savePickList($db, $data, $userId) {
    try {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['details']) || !is_array($data['details']) || 
            !isset($data['order_ids']) || !is_array($data['order_ids'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields'
            ];
        }
        
        $db->beginTransaction();
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Update existing picking list
            $stmt = $db->prepare("
                UPDATE tsis_pick_list 
                SET name = ?, description = ?, status = ?, 
                    order_date = ?, expected_delivery_date = ?, 
                    delivery_address = ?, notes = ?, 
                    updated_by = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['name'], 
                $data['description'] ?? null, 
                $data['status'] ?? 'draft', 
                $data['order_date'] ?? null, 
                $data['expected_delivery_date'] ?? null, 
                $data['delivery_address'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $data['id']
            ]);
            
            // Delete existing details
            $delDetailsStmt = $db->prepare("DELETE FROM tsis_pick_list_detail WHERE pick_list_id = ?");
            $delDetailsStmt->execute([$data['id']]);
            
            // Delete existing POS associations
            $delPOSStmt = $db->prepare("DELETE FROM tsis_pick_pos_list WHERE pick_list_id = ?");
            $delPOSStmt->execute([$data['id']]);
            
            $pickListId = $data['id'];
        } else {
            // Insert new picking list
            $stmt = $db->prepare("
                INSERT INTO tsis_pick_list 
                (name, description, status, order_date, expected_delivery_date, 
                 delivery_address, notes, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['name'], 
                $data['description'] ?? null, 
                $data['status'] ?? 'draft', 
                $data['order_date'] ?? null, 
                $data['expected_delivery_date'] ?? null, 
                $data['delivery_address'] ?? null, 
                $data['notes'] ?? null, 
                $userId, 
                $userId
            ]);
            
            $pickListId = $db->lastInsertId();
        }
        
        // Insert details
        $detailsStmt = $db->prepare("
            INSERT INTO tsis_pick_list_detail 
            (pick_list_id, supplier_id, material_id, is_custom, article_code, 
             description, quantity, unit_of_measure, unit_price, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($data['details'] as $detail) {
            $detailsStmt->execute([
                $pickListId, 
                $detail['supplier_id'] ?? null, 
                $detail['material_id'] ?? null, 
                $detail['is_custom'] ?? 0, 
                $detail['article_code'] ?? null, 
                $detail['description'], 
                $detail['quantity'], 
                $detail['unit_of_measure'], 
                $detail['unit_price'] ?? null, 
                $detail['notes'] ?? null
            ]);
        }
        
        // Insert POS associations
        $posSql = "INSERT INTO tsis_pick_pos_list (pick_list_id, pos_order_id) VALUES (?, ?)";
        $posStmt = $db->prepare($posSql);
        
        foreach ($data['order_ids'] as $orderId) {
            $posStmt->execute([$pickListId, $orderId]);
        }
        
        $db->commit();
        
        return [
            'success' => true, 
            'message' => 'Picking list saved successfully', 
            'id' => $pickListId
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Error saving pick list: " . $e->getMessage());
        throw new Exception('Error saving pick list: ' . $e->getMessage());
    }
}

/**
 * Update the status of a picking list
 */
function updatePickListStatus($db, $id, $status, $userId) {
    try {
        $stmt = $db->prepare("
            UPDATE tsis_pick_list 
            SET status = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$status, $userId, $id]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'error' => 'Picking list not found'
            ];
        }
        
        return [
            'success' => true,
            'message' => 'Status updated successfully'
        ];
    } catch (Exception $e) {
        error_log("Error updating pick list status: " . $e->getMessage());
        throw new Exception('Error updating status: ' . $e->getMessage());
    }
}

// Process the request
try {
    $requestData = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($_GET['action']) && (!$requestData || !isset($requestData['action']))) {
        throw new Exception('No action specified');
    }
    
    $action = isset($_GET['action']) ? $_GET['action'] : $requestData['action'];
 
    $userId = $_SESSION['user']['id'];
    
    // Get data from request body for POST requests
    $requestData = null;
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestData = json_decode(file_get_contents('php://input'), true);
    }
    
    // Route requests to appropriate functions
    switch ($action) {


        case 'deletePickList':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deletePickList($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'addPickListItem':
            if ($requestData) {
                echo json_encode(addPickListItem($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
        
        case 'removePickListItem':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(removePickListItem($db, $requestData['id'], $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'addModuleToPickList':
            if ($requestData) {
                echo json_encode(addModuleToPickList($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;


        case 'saveSupplier':
            if ($requestData) {
                echo json_encode(saveSupplier($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'deleteSupplier':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deleteSupplier($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'saveMaterial':
            if ($requestData) {
                echo json_encode(saveMaterial($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'deleteMaterial':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deleteMaterial($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
        
            case 'saveModule':
                if ($requestData) {
                  echo json_encode(saveModule($db, $requestData, $userId));
                } else {
                  throw new Exception('Invalid request data');
                }
                break;
            
        case 'deleteModule':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deleteModule($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'getModuleMaterials':
            $moduleId = isset($_GET['module_id']) ? intval($_GET['module_id']) : 0;
            if ($moduleId > 0) {
                echo json_encode(getModuleMaterials($db, $moduleId));
            } else {
                throw new Exception('Invalid module ID');
            }
            break;
            
        case 'saveModuleMaterial':
            if ($requestData) {
                echo json_encode(saveModuleMaterial($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'deleteModuleMaterial':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deleteModuleMaterial($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;


        case 'getModules':
            echo json_encode(getModules($db));
            break;
            
        case 'getMaterials':
            echo json_encode(getMaterials($db));
            break;
            
        case 'getSuppliers':
            echo json_encode(getSuppliers($db));
            break;
            
        case 'getPOSOrders':
            echo json_encode(getPOSOrders($db, $userRole, $userId));
            break;
            
        case 'getPOSOrderDetails':
            $orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
            if ($orderId > 0) {
                echo json_encode(getPOSOrderDetails($db, $orderId));
            } else {
                throw new Exception('Invalid order ID');
            }
            break;
            
        case 'getPOSModules':
            $orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
            if ($orderId > 0) {
                echo json_encode(getPOSModules($db, $orderId));
            } else {
                throw new Exception('Invalid order ID');
            }
            break;
            
        case 'getPOSCustomMaterials':
            $orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
            if ($orderId > 0) {
                echo json_encode(getPOSCustomMaterials($db, $orderId));
            } else {
                throw new Exception('Invalid order ID');
            }
            break;
            
        case 'savePOSModule':
            if ($requestData) {
                echo json_encode(savePOSModule($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'savePOSCustomMaterial':
            if ($requestData) {
                echo json_encode(savePOSCustomMaterial($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'deletePOSModule':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deletePOSModule($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'deletePOSCustomMaterial':
            if ($requestData && isset($requestData['id'])) {
                echo json_encode(deletePOSCustomMaterial($db, $requestData['id']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'generatePickList':
            if ($requestData && isset($requestData['order_ids']) && is_array($requestData['order_ids'])) {
                echo json_encode(generatePickList($db, $requestData['order_ids']));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'getPickLists':
            echo json_encode(getPickLists($db));
            break;
            
        case 'getPickListDetails':
            $pickListId = isset($_GET['id']) ? intval($_GET['id']) : 0;
            if ($pickListId > 0) {
                echo json_encode(getPickListDetails($db, $pickListId));
            } else {
                throw new Exception('Invalid pick list ID');
            }
            break;
            
        case 'savePickList':
            if ($requestData) {
                echo json_encode(savePickList($db, $requestData, $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        case 'updatePickListStatus':
            if ($requestData && isset($requestData['id']) && isset($requestData['status'])) {
                echo json_encode(updatePickListStatus($db, $requestData['id'], $requestData['status'], $userId));
            } else {
                throw new Exception('Invalid request data');
            }
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    error_log("Error in r_tsis_pick.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
