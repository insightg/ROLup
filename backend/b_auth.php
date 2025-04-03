<?php
// includes/auth.php

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: pages/w_login.php');
        exit;
    }
}

function getAuthorizedMenuItems($menuType = 'main', $parentId = null) {
    try {
        error_log("Getting authorized menu items: type=$menuType, parentId=" . 
                 ($parentId === null ? 'null' : $parentId));
                 
        $pdo = getDBConnection();
        $userId = $_SESSION['user_id'];
        
        $sql = "
            SELECT DISTINCT mi.*
            FROM t_menu_items mi
            JOIN t_permissions p ON mi.id = p.menu_item_id
            JOIN t_user_groups ug ON p.group_id = ug.group_id
            WHERE ug.user_id = ? 
            AND mi.menu_type = ?
            AND p.can_view = 1
        ";
        
        $params = [$userId, $menuType];
        
        if ($parentId !== null) {
            $sql .= " AND mi.parent_id = ?";
            $params[] = $parentId;
        } else {
            $sql .= " AND mi.parent_id IS NULL";
        }
        
        $sql .= " ORDER BY mi.menu_order";
        
        error_log("Executing SQL: $sql");
        error_log("With params: " . print_r($params, true));
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $result = $stmt->fetchAll();
        error_log("Query result: " . print_r($result, true));
        
        return $result;
    } catch (PDOException $e) {
        error_log("Error in getAuthorizedMenuItems: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        return [];
    }
}

function canViewMenuItem($menuItemId) {
    if (!isset($_SESSION['user_id'])) return false;
    
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM t_permissions p
            JOIN t_user_groups ug ON p.group_id = ug.group_id
            WHERE ug.user_id = ? 
            AND p.menu_item_id = ?
            AND p.can_view = 1
        ");
        $stmt->execute([$_SESSION['user_id'], $menuItemId]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    } catch (PDOException $e) {
        error_log("Error in canViewMenuItem: " . $e->getMessage());
        return false;
    }
}
