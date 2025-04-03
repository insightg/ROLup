<?php
declare(strict_types=1);

require_once __DIR__ . '/../common/head.php';

// Verifica che sia una richiesta AJAX
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || 
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    header('HTTP/1.1 403 Forbidden');
    exit('Direct access not allowed.');
}

// Verifica che l'utente sia autenticato
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    sendResponse(false, 'User not authenticated');
    exit;
}

$userId = $_SESSION['user']['id'];

// Get the requested action from either GET or POST data
$action = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonInput = file_get_contents('php://input');
    if ($jsonInput) {
        $data = json_decode($jsonInput, true);
        $action = $data['action'] ?? '';
    }
}

try {
    switch ($action) {
        case 'updatePersonalInfo':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleUpdatePersonalInfo($userId);
            break;

        case 'updatePassword':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method');
            }
            handleUpdatePassword($userId);
            break;

        default:
            sendResponse(false, 'Invalid action');
    }
} catch (Exception $e) {
    error_log("Profile error: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

/**
 * Handles updating personal information
 */
function handleUpdatePersonalInfo(int $userId): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['email'])) {
        throw new Exception('Email is required');
    }

    // Validate email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }

    try {
        // Check if email is already used by another user
        $stmt = $db->prepare("
            SELECT COUNT(*) 
            FROM t_users 
            WHERE email = ? AND id != ?
        ");
        $stmt->execute([$data['email'], $userId]);
        
        if ($stmt->fetchColumn() > 0) {
            throw new Exception('Email already in use');
        }

        // Update user information
        $stmt = $db->prepare("
            UPDATE t_users 
            SET 
                email = ?,
                full_name = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $data['email'],
            $data['full_name'] ?? null,
            $userId
        ]);

        // Update session data
        $_SESSION['user']['email'] = $data['email'];
        $_SESSION['user']['full_name'] = $data['full_name'] ?? null;

        sendResponse(true, 'Personal information updated successfully');
    } catch (PDOException $e) {
        throw new Exception('Failed to update personal information: ' . $e->getMessage());
    }
}

/**
 * Handles password update
 */
function handleUpdatePassword(int $userId): void {
    global $db;
    $data = getJsonInput();
    
    if (empty($data['current_password']) || empty($data['new_password'])) {
        throw new Exception('Current and new passwords are required');
    }

    // Validate new password length
    if (strlen($data['new_password']) < 8) {
        throw new Exception('New password must be at least 8 characters long');
    }

    try {
        // Verify current password
        $stmt = $db->prepare("SELECT password FROM t_users WHERE id = ?");
        $stmt->execute([$userId]);
        $currentHash = $stmt->fetchColumn();

        if (!password_verify($data['current_password'], $currentHash)) {
            throw new Exception('Current password is incorrect');
        }

        // Update password
        $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE t_users SET password = ? WHERE id = ?");
        $stmt->execute([$newHash, $userId]);

        sendResponse(true, 'Password updated successfully');
    } catch (PDOException $e) {
        throw new Exception('Failed to update password: ' . $e->getMessage());
    }
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
    
    echo json_encode($response);
    exit;
}