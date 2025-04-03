<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    $config = parse_ini_file('../config/config.ini', true);
    
    if (!$config) {
        throw new Exception('Errore nella lettura della configurazione');
    }

    // Verifica esistenza tabella e directory
    ensureSetup($config);

    // Gestione delle azioni
    if (!isset($_GET['action'])) {
        throw new Exception('Azione non specificata');
    }

    $action = $_GET['action'];

    switch ($action) {
		
		case 'delete_document':
    if (!isset($_GET['id'])) {
        throw new Exception('ID documento mancante');
    }

    $pdo = getPDOConnection($config);
    
    // Recupera il percorso del file prima dell'eliminazione
    $stmt = $pdo->prepare("SELECT file_path FROM ia_documents WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($document) {
        // Elimina il file
        $filePath = __DIR__ . '/../files_ia/' . $document['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Elimina il record dal database
        $stmt = $pdo->prepare("DELETE FROM ia_documents WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        
        echo json_encode([
            'success' => true
        ]);
    } else {
        throw new Exception('Documento non trovato');
    }
    break;

case 'update_document':
    $requestData = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($requestData['id']) || !isset($requestData['title']) || !isset($requestData['content'])) {
        throw new Exception('Parametri mancanti');
    }

    $pdo = getPDOConnection($config);
    
    // Recupera il documento esistente
    $stmt = $pdo->prepare("SELECT file_path FROM ia_documents WHERE id = ?");
    $stmt->execute([$requestData['id']]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        throw new Exception('Documento non trovato');
    }

    // Aggiorna il contenuto del file
    $filePath = __DIR__ . '/../files_ia/' . $document['file_path'];
    if (file_put_contents($filePath, $requestData['content']) === false) {
        throw new Exception('Errore nel salvataggio del contenuto');
    }

    // Aggiorna il record nel database
    $stmt = $pdo->prepare("
        UPDATE ia_documents 
        SET name = ?, size = ? 
        WHERE id = ?
    ");
    $stmt->execute([
        $requestData['title'],
        strlen($requestData['content']),
        $requestData['id']
    ]);

    echo json_encode([
        'success' => true
    ]);
    break;
	
        case 'list_documents':
            $pdo = getPDOConnection($config);
            $stmt = $pdo->query("SELECT id, name, size, type, created_at FROM ia_documents ORDER BY created_at DESC");
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'documents' => $documents
            ]);
            break;

        case 'upload_documents':
            if (empty($_FILES['documents'])) {
                throw new Exception('Nessun documento caricato');
            }

            $pdo = getPDOConnection($config);
            $uploadDir = __DIR__ . '/../files_ia/';
            $results = [];

            foreach ($_FILES['documents']['tmp_name'] as $key => $tmpName) {
                $fileName = $_FILES['documents']['name'][$key];
                $fileSize = $_FILES['documents']['size'][$key];
                $fileType = $_FILES['documents']['type'][$key];
                
                $safeFileName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\.]/', '_', $fileName);
                $filePath = $uploadDir . $safeFileName;

                if (move_uploaded_file($tmpName, $filePath)) {
                    $stmt = $pdo->prepare("
                        INSERT INTO ia_documents (name, file_path, size, type, created_at)
                        VALUES (?, ?, ?, ?, NOW())
                    ");
                    $stmt->execute([$fileName, $safeFileName, $fileSize, $fileType]);
                    
                    $results[] = [
                        'original_name' => $fileName,
                        'saved_as' => $safeFileName,
                        'success' => true
                    ];
                } else {
                    $results[] = [
                        'original_name' => $fileName,
                        'error' => 'Errore nel salvataggio del file',
                        'success' => false
                    ];
                }
            }

            echo json_encode([
                'success' => true,
                'results' => $results
            ]);
            break;

        case 'create_document':
            $requestData = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($requestData['title']) || !isset($requestData['content'])) {
                throw new Exception('Parametri mancanti');
            }

            $fileName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\.]/', '_', $requestData['title']) . '.txt';
            $filePath = '../files_ia/' . $fileName;
            
            if (file_put_contents($filePath, $requestData['content']) === false) {
                throw new Exception('Errore nel salvataggio del contenuto');
            }

            $pdo = getPDOConnection($config);
            $stmt = $pdo->prepare("
                INSERT INTO ia_documents (name, file_path, size, type, created_at)
                VALUES (?, ?, ?, 'text/plain', NOW())
            ");
            $stmt->execute([
                $requestData['title'], 
                $fileName,
                strlen($requestData['content'])
            ]);

            echo json_encode([
                'success' => true,
                'id' => $pdo->lastInsertId()
            ]);
            break;

        case 'view_document':
            if (!isset($_GET['id'])) {
                throw new Exception('ID documento mancante');
            }

            $pdo = getPDOConnection($config);
            $stmt = $pdo->prepare("SELECT * FROM ia_documents WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $document = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$document) {
                throw new Exception('Documento non trovato');
            }

            $content = file_get_contents(__DIR__ . '/../files_ia/' . $document['file_path']);
            if ($content === false) {
                throw new Exception('Errore nella lettura del contenuto');
            }

            echo json_encode([
                'success' => true,
                'document' => [
                    'id' => $document['id'],
                    'name' => $document['name'],
                    'content' => $content
                ]
            ]);
            break;

       case 'query':
    $requestData = json_decode(file_get_contents('php://input'), true);
    
    error_log("Query request data: " . json_encode($requestData));
    
    if (!isset($requestData['query']) || !isset($requestData['documents']) || empty($requestData['documents'])) {
        throw new Exception('Query o documenti mancanti');
    }

    $pdo = getPDOConnection($config);
    
    // Log dei documenti richiesti
    error_log("Documenti richiesti: " . implode(", ", $requestData['documents']));
    
    $placeholders = str_repeat('?,', count($requestData['documents']) - 1) . '?';
    $stmt = $pdo->prepare("
        SELECT id, name, file_path 
        FROM ia_documents 
        WHERE id IN ($placeholders)
    ");
    $stmt->execute($requestData['documents']);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Documenti trovati: " . count($documents));
    
    if (empty($documents)) {
        throw new Exception('Nessun documento trovato per gli ID forniti');
    }

    // Prepara il contesto per Claude
    $context = "";
    foreach ($documents as $doc) {
        $filePath = __DIR__ . '/../files_ia/' . $doc['file_path'];
        error_log("Lettura file: " . $filePath);
        
        if (!file_exists($filePath)) {
            error_log("File non trovato: " . $filePath);
            continue;
        }

        $content = file_get_contents($filePath);
        if ($content === false) {
            error_log("Errore lettura file: " . $filePath);
            continue;
        }

        $context .= "\nDocumento: {$doc['name']}\nContenuto:\n$content\n\n";
    }

    if (empty($context)) {
        throw new Exception('Nessun contenuto valido trovato nei documenti');
    }

    error_log("Lunghezza contesto: " . strlen($context));

    $fullPrompt = "Basandoti sui seguenti documenti:\n\n" . 
                  $context . "\n" .
                  "Rispondi alla seguente domanda:\n" . 
                  $requestData['query'] . "\n\n" .
                  "Saluta sempre all'inizio. mantieni linguaggio semiformale. Fornisci una risposta precisa basandoti solo sulle informazioni contenute nei documenti forniti.";

    error_log("Lunghezza prompt completo: " . strlen($fullPrompt));

    // Chiamata API Claude
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'anthropic-version: 2023-06-01',
            'x-api-key: ' . $config['claude']['api_key']
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'claude-3-sonnet-20240229',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $fullPrompt
                ]
            ],
            'max_tokens' => 1024,
            'temperature' => 0.7
        ])
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode !== 200) {
        error_log("Errore API Claude: " . $response);
        throw new Exception('Errore nella chiamata a Claude API');
    }

    $result = json_decode($response, true);
    if (!$result || !isset($result['content'][0]['text'])) {
        error_log("Risposta API non valida: " . $response);
        throw new Exception('Risposta non valida da Claude API');
    }

    echo json_encode([
        'success' => true,
        'response' => $result['content'][0]['text'],
        'sources' => array_column($documents, 'name')
    ]);
    break;

        default:
            throw new Exception('Azione non valida');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function ensureSetup($config) {
    $pdo = getPDOConnection($config);
    
    // Verifica esistenza tabella
    $tableExists = $pdo->query("SHOW TABLES LIKE 'ia_documents'")->rowCount() > 0;
    
    if (!$tableExists) {
        // Crea la tabella
        $pdo->exec("
            CREATE TABLE ia_documents (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                size BIGINT NOT NULL,
                type VARCHAR(255),
                created_at DATETIME NOT NULL,
                INDEX (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }
    
    // Verifica directory files_ia
    $uploadDir = __DIR__ . '/../files_ia/';
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception('Impossibile creare la directory files_ia');
        }
        chmod($uploadDir, 0777);
    }
}

function getPDOConnection($config) {
    return new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
}