<?php
if (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json');

function handleError($errno, $errstr, $errfile, $errline) {
    if (ob_get_level()) ob_end_clean();
    $error = [
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ];
    error_log("PHP Error: $errstr in $errfile on line $errline");
    echo json_encode($error);
    exit(1);
}

function handleException($e) {
    if (ob_get_level()) ob_end_clean();
    $error = [
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ];
    error_log("Uncaught Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode($error);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

function getConfigDB() {
    $configFile = '../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini';
    if (!file_exists($configFile)) {
        throw new Exception('Config file not found');
    }
    $config = parse_ini_file($configFile, true);
    return [
        'host' => $config['database']['host'],
        'dbname' => $config['database']['dbname'],
        'user' => $config['database']['username'],
        'password' => $config['database']['password']
    ];
}

function validateFileType($file) {
    $allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
    ];

    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Tipo di file non supportato');
    }
}

function validateFileSize($file) {
    $maxSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxSize) {
        throw new Exception('Il file supera la dimensione massima consentita (10MB)');
    }
}

function handleUploadFile($pdo, $request) {
    if (!isset($_FILES['file']) || !isset($_POST['posId']) || 
        !isset($_POST['description']) || !isset($_POST['user'])) {
        throw new Exception('Missing required fields');
    }

    $posId = $_POST['posId'];
    $userId = $_POST['user'];
    $description = $_POST['description'];
    $file = $_FILES['file'];

    // Validate file
    validateFileType($file);
    validateFileSize($file);

    // Validate POS exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Anagrafica WHERE id = ?");
    $stmt->execute([$posId]);
    if ($stmt->fetchColumn() == 0) {
        throw new Exception('POS non trovato');
    }

    // Create upload directory if it doesn't exist
    $uploadDir = '../uploads/' . $posId . '/';
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception('Errore nella creazione della directory');
        }
    }

    // Generate unique filename with timestamp
    $timestamp = date('Y-m-d_His');
    $filename = $timestamp . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file['name']));
    $filepath = $uploadDir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Errore nel caricamento del file');
    }

    // Save file info to database with user
    $stmt = $pdo->prepare("
        INSERT INTO t_files (pos_id, user_id, filename, filepath, description)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$posId, $userId, $file['name'], $filepath, $description]);

    error_log("File uploaded successfully: $filepath");

    return [
        'success' => true,
        'message' => 'File caricato con successo',
        'fileInfo' => [
            'id' => $pdo->lastInsertId(),
            'filename' => $file['name'],
            'filepath' => $filepath
        ]
    ];
}

function handleGetFiles($pdo, $request) {
    if (!isset($request['posId'])) {
        throw new Exception('Missing POS ID');
    }

    $stmt = $pdo->prepare("
        SELECT 
            t_files.id,
            t_files.filename,
            t_files.description,
            DATE_FORMAT(t_files.upload_date, '%d/%m/%Y %H:%i') as upload_date,
            t_files.filepath,
            t_files.user_id
        FROM t_files
        WHERE pos_id = ?
        ORDER BY upload_date DESC
    ");
    $stmt->execute([$request['posId']]);
    
    return [
        'success' => true,
        'files' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

function handleDownloadFile($pdo, $request) {
    if (!isset($request['fileId'])) {
        throw new Exception('Missing file ID');
    }

    $stmt = $pdo->prepare("
        SELECT filepath, filename
        FROM t_files
        WHERE id = ?
    ");
    $stmt->execute([$request['fileId']]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('File non trovato nel database');
    }

    if (!file_exists($file['filepath'])) {
        throw new Exception('File non trovato sul server');
    }

    $mimeType = mime_content_type($file['filepath']);
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $file['filename'] . '"');
    header('Content-Length: ' . filesize($file['filepath']));
    header('Cache-Control: no-cache');
    
    readfile($file['filepath']);
    exit;
}

function handleDeleteFile($pdo, $request) {
    if (!isset($request['fileId'])) {
        throw new Exception('Missing file ID');
    }

    // Begin transaction
    $pdo->beginTransaction();

    try {
        // Get file info
        $stmt = $pdo->prepare("
            SELECT filepath, user_id
            FROM t_files
            WHERE id = ?
            FOR UPDATE
        ");
        $stmt->execute([$request['fileId']]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$file) {
            throw new Exception('File non trovato');
        }

        // Verifica autorizzazione
        $currentUser = $_SESSION['user'] ?? '';
        $isAdmin = $_SESSION['isAdmin'] ?? false;
        if ($file['user_id'] !== $currentUser && !$isAdmin) {
            throw new Exception('Non autorizzato a eliminare questo file');
        }

        // Delete physical file
        if (file_exists($file['filepath'])) {
            if (!unlink($file['filepath'])) {
                throw new Exception('Errore nella cancellazione del file fisico');
            }
        }

        // Delete database record
        $stmt = $pdo->prepare("DELETE FROM t_files WHERE id = ?");
        $stmt->execute([$request['fileId']]);

        // Commit transaction
        $pdo->commit();

        error_log("File deleted successfully: " . $file['filepath']);

        return [
            'success' => true,
            'message' => 'File eliminato con successo'
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Main execution
try {
    $config = getConfigDB();
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['user'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]
    );

    $request = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!empty($_FILES) || !empty($_POST)) {
            $request = $_POST;
        } else {
            $rawInput = file_get_contents('php://input');
            if (!empty($rawInput)) {
                $request = json_decode($rawInput, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception('Invalid JSON in request: ' . json_last_error_msg());
                }
            }
        }
    }

    if (empty($request) || !isset($request['action'])) {
        throw new Exception('Action parameter missing');
    }

    error_log("Processing files action: " . $request['action']); // Debug log

    switch ($request['action']) {
        case 'uploadFile':
            $result = handleUploadFile($pdo, $request);
            break;
        
        case 'getFiles':
            $result = handleGetFiles($pdo, $request);
            break;
        
        case 'downloadFile':
            $result = handleDownloadFile($pdo, $request);
            break;
        
        case 'deleteFile':
            $result = handleDeleteFile($pdo, $request);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $request['action']);
    }

    if (ob_get_level() && !isset($result['noJson'])) {
        ob_end_clean();
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
    }
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'details' => [
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

if (ob_get_level()) ob_end_flush();