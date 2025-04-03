<?php
require_once '../common/head.php';

// Verifica richiesta AJAX
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || 
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    header('HTTP/1.1 403 Forbidden');
    exit('Direct access not allowed');
}

// Imposta header JSON
header('Content-Type: application/json');

try {
    // Se è una richiesta POST per marcare come letta
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['action']) && $input['action'] === 'mark_read' && isset($input['notification_id'])) {
            $stmt = $db->prepare("
                UPDATE t_notifications 
                SET is_read = 1 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$input['notification_id'], $_SESSION['user']['id']]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // Query notifiche
    $stmt = $db->prepare("
        SELECT n.id, n.message, n.created_at as time, n.is_read 
        FROM t_notifications n
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 10
    ");
    $stmt->execute([$_SESSION['user']['id']]);
    $notifications = $stmt->fetchAll();

    // Conta notifiche non lette
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM t_notifications 
        WHERE user_id = ? AND is_read = 0
    ");
    $stmt->execute([$_SESSION['user']['id']]);
    $unreadCount = $stmt->fetchColumn();

    // Formatta timestamp
    foreach ($notifications as &$notification) {
        $notification['time'] = date('d/m/Y H:i', strtotime($notification['time']));
    }

    echo json_encode([
        'notifications' => $notifications,
        'unread' => $unreadCount
    ]);

} catch (Exception $e) {
    error_log("Notifications API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}