<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/webhook_errors.log');

function writeLog($message, $data = null) {
    $logFile = __DIR__ . '/webhook.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = $timestamp . " - " . $message;
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= "\n" . print_r($data, true);
        } else {
            $logMessage .= " - " . $data;
        }
    }
    $logMessage .= "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

class CampaignWebhookHandler {
    private $pdo;
    private $config;
    private $payload;
    private $thirdLevelDomain;

    public function __construct($pdo, $config, $payload, $thirdLevelDomain) {
        $this->pdo = $pdo;
        $this->config = $config;
        $this->payload = $payload;
        $this->thirdLevelDomain = $thirdLevelDomain;
    }

    private function verifyWebhookToken($receivedToken) {
        writeLog('Verifying webhook token');
        $expectedToken = $this->config['ultraMsg']['webhookToken'] ?? null;
        $isValid = $expectedToken && hash_equals($expectedToken, $receivedToken);
        writeLog('Token verification result:', $isValid ? 'valid' : 'invalid');
        return $isValid;
    }
    private function normalizePhone($phone) {
        writeLog('Normalizing phone:', $phone);
        
        // Remove WhatsApp suffix if present
        $phone = preg_replace('/@c\.us$/', '', $phone);
        
        // Remove all non-numeric and non-plus characters
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        
        // Se inizia con 39 e non ha il +, aggiungi il +
        if (preg_match('/^39\d{9,}$/', $phone)) {
            $phone = '+' . $phone;
        }
        
        writeLog('Normalized phone:', $phone);
        return $phone;
    }
    
    private function findRecipient($phone) {
        writeLog('Finding recipient for phone:', $phone);
        
        $normalizedPhone = $this->normalizePhone($phone);
        
        // Query principale - ora include anche campagne completed
        $stmt = $this->pdo->prepare("
            SELECT 
                r.*,
                c.id as campaign_id,
                c.name as campaign_name,
                c.status as campaign_status,
                m.id as message_id,
                m.status as message_status
            FROM t_camp_recipients r
            JOIN t_camp_campaigns c ON r.campaign_id = c.id
            LEFT JOIN t_camp_messages m ON r.id = m.recipient_id
            WHERE r.phone = ?
            AND c.status IN ('active', 'paused', 'completed')  -- Aggiunto 'completed'
            ORDER BY c.created_at DESC
            LIMIT 1
        ");
        
        writeLog('Executing query with phone:', $normalizedPhone);
        $stmt->execute([$normalizedPhone]);
        $recipient = $stmt->fetch(PDO::FETCH_ASSOC);
        
        writeLog('Recipient search result:', [
            'original_phone' => $phone,
            'normalized_phone' => $normalizedPhone,
            'found' => !empty($recipient),
            'campaign_status' => $recipient['campaign_status'] ?? null
        ]);
        
        // Se troviamo un recipient ma la campagna è completed, loghiamo questo caso specifico
        if ($recipient && $recipient['campaign_status'] === 'completed') {
            writeLog('Found recipient with completed campaign:', [
                'recipient_id' => $recipient['id'],
                'campaign_id' => $recipient['campaign_id']
            ]);
        }
        
        return $recipient;
    }

    private function updateMessageStatus($messageId, $status, $additionalData = []) {
        writeLog('Updating message status', [
            'messageId' => $messageId,
            'status' => $status,
            'additionalData' => $additionalData
        ]);

        $stmt = $this->pdo->prepare("
            UPDATE t_camp_messages 
            SET status = ?,
                ultramsg_message_id = ?,
                data_status = NOW(),
                metadata = ?
            WHERE id = ?
        ");
        
        $metadata = json_encode(array_merge([
            'status_timestamp' => time(),
            'raw_status' => $status
        ], $additionalData));

        $result = $stmt->execute([
            $status,
            $additionalData['message_id'] ?? null,
            $metadata,
            $messageId
        ]);

        writeLog('Status update result:', $result ? 'success' : 'failed');
        return $result;
    }

    private function saveReceivedMessage($recipientId, $campaignId, $messageData) {
        writeLog('Saving received message', [
            'recipientId' => $recipientId,
            'campaignId' => $campaignId,
            'messageData' => $messageData
        ]);

        $stmt = $this->pdo->prepare("
            INSERT INTO t_camp_received_messages (
                recipient_id,
                campaign_id,
                message_type,
                message_content,
                received_at,
                metadata
            ) VALUES (?, ?, ?, ?, NOW(), ?)
        ");
        
        $result = $stmt->execute([
            $recipientId,
            $campaignId,
            $messageData['type'],
            $messageData['content'] ?? null,
            json_encode($messageData)
        ]);

        $messageId = $result ? $this->pdo->lastInsertId() : false;
        writeLog('Message save result:', $messageId ? "ID: $messageId" : 'failed');
        return $messageId;
    }

    private function saveReceivedAttachment($recipientId, $campaignId, $messageId, $attachmentData) {
        writeLog('Saving received attachment', [
            'recipientId' => $recipientId,
            'campaignId' => $campaignId,
            'messageId' => $messageId,
            'attachmentData' => $attachmentData
        ]);
    
        try {
            // Usa il campo media invece di url
            $attachmentUrl = $attachmentData['media'] ?? $attachmentData['url'] ?? '';
            if (empty($attachmentUrl)) {
                throw new Exception('No media URL provided in attachment data');
            }
            
            $contentType = $attachmentData['mime_type'];
            $fileName = $attachmentData['filename'] ?? basename($attachmentUrl);
            
            // Genera nome file univoco
            $uniqueFileName = uniqid() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", $fileName);
            
            // Determina sottocartella
            $subFolder = match(true) {
                str_starts_with($contentType, 'image/') => 'images',
                str_starts_with($contentType, 'video/') => 'videos',
                str_starts_with($contentType, 'audio/') => 'audio',
                default => 'documents'
            };
            
            // Crea percorso directory
            $uploadDir = "../config/{$this->thirdLevelDomain}/uploads/received/{$subFolder}/" . date('Y/m/d');
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            writeLog('Created directory:', $uploadDir);
            
            // Percorso completo file
            $filePath = $uploadDir . '/' . $uniqueFileName;
            writeLog('File path:', $filePath);
            
            // Download file
            $ch = curl_init($attachmentUrl);
            $fp = fopen($filePath, 'wb');
            curl_setopt($ch, CURLOPT_FILE, $fp);
            curl_setopt($ch, CURLOPT_HEADER, 0);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_exec($ch);
            $error = curl_error($ch);
            $fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
            curl_close($ch);
            fclose($fp);
            
            if ($error) {
                writeLog('Curl error:', $error);
                throw new Exception("Failed to download file: {$error}");
            }
            
            writeLog('File downloaded successfully', [
                'size' => $fileSize,
                'path' => $filePath
            ]);
            
            // Inserisci nel database
            $stmt = $this->pdo->prepare("
                INSERT INTO t_camp_received_attachments (
                    recipient_id,
                    campaign_id,
                    message_id,
                    file_name,
                    file_path,
                    mime_type,
                    file_size,
                    received_at,
                    metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            ");
            
            $metadata = json_encode([
                'original_url' => $attachmentUrl,
                'original_filename' => $fileName,
                'file_size' => $fileSize,
                'raw_data' => $attachmentData
            ]);
            
            $result = $stmt->execute([
                $recipientId,
                $campaignId,
                $messageId,
                $uniqueFileName,
                str_replace('../', '', $filePath),
                $contentType,
                $fileSize,
                $metadata
            ]);
    
            writeLog('Attachment save result:', $result ? 'success' : 'failed');
            return $result;
    
        } catch (Exception $e) {
            writeLog('Error saving attachment:', $e->getMessage());
            throw $e;
        }
    }

    public function handle() {
        try {
            writeLog('Starting webhook handling', $this->payload);

            // Verifica token webhook (temporaneamente commentato per debug)
            /*if (!$this->verifyWebhookToken($this->payload['token'] ?? '')) {
                throw new Exception('Invalid webhook token');
            }*/

            // Estrai informazioni dal payload
            $eventType = $this->payload['event_type'] ?? '';
            $phone = $this->payload['data']['from'] ?? '';
            
            writeLog('Event details', [
                'type' => $eventType,
                'phone' => $phone
            ]);
            
            // Trova il recipient associato
            $recipient = $this->findRecipient($phone);
            if (!$recipient) {
                writeLog('Recipient not found', ['phone' => $phone]);
                throw new Exception('Recipient not found for phone: ' . $phone);
            }

            // Gestisci diversi tipi di eventi
            switch ($eventType) {
                case 'message_status':
                    $status = $this->payload['data']['status'] ?? '';
                    $messageId = $this->payload['data']['id'] ?? '';
                    
                    writeLog('Processing message status', [
                        'status' => $status,
                        'messageId' => $messageId
                    ]);
                    
                    // Mappa stati UltraMsg ai nostri stati
                    $statusMap = [
                        'sent' => 'sent',
                        'delivered' => 'delivered',
                        'read' => 'read',
                        'failed' => 'failed'
                    ];
                    
                    $newStatus = $statusMap[$status] ?? $status;
                    
                    if (!$this->updateMessageStatus($recipient['message_id'], $newStatus, [
                        'message_id' => $messageId,
                        'event_type' => $eventType,
                        'original_status' => $status
                    ])) {
                        throw new Exception('Failed to update message status');
                    }
                    break;

                    case 'message_received':
                        $messageType = $this->payload['data']['type'] ?? 'text';
                        
                        writeLog('Processing received message', [
                            'type' => $messageType,
                            'data' => $this->payload['data']
                        ]);
                        
                        // Salva il messaggio ricevuto
                        $receivedMessageId = $this->saveReceivedMessage(
                            $recipient['id'], 
                            $recipient['campaign_id'], 
                            $this->payload['data']
                        );
                        
                        if (!$receivedMessageId) {
                            throw new Exception('Failed to save received message');
                        }
                        
                        // Gestione allegati in base al tipo di messaggio
                        switch ($messageType) {
                            case 'image':
                            case 'document':
                            case 'audio':
                            case 'video':
                                writeLog('Processing attachment', [
                                    'type' => $messageType
                                ]);
                    
                                if (!$this->saveReceivedAttachment(
                                    $recipient['id'],
                                    $recipient['campaign_id'],
                                    $receivedMessageId,
                                    [
                                        'media' => $this->payload['data']['media'] ?? '',
                                        'mime_type' => $this->payload['data']['mime_type'] ?? '',
                                        'filename' => $this->payload['data']['filename'] ?? null
                                    ]
                                )) {
                                    writeLog("Failed to save attachment", [
                                        'messageId' => $receivedMessageId
                                    ]);
                                }
                                break;
                                
                            case 'text':
                                writeLog('Text message processed');
                                break;
                                
                            default:
                                writeLog("Unhandled message type", [
                                    'type' => $messageType
                                ]);
                                break;
                        }
                        break;

                default:
                    writeLog("Unhandled event type", [
                        'type' => $eventType
                    ]);
                    break;
            }

            writeLog('Webhook processed successfully');
            return [
                'success' => true,
                'message' => 'Webhook processed successfully'
            ];

        } catch (Exception $e) {
            writeLog('Error in webhook handling:', $e->getMessage());
            throw $e;
        }
    }
}

try {
    // Log iniziale
    writeLog('Webhook called');

    // Log headers
    $headers = getallheaders();
    writeLog('Headers received:', $headers);

    // Log raw input
    $rawInput = file_get_contents('php://input');
    writeLog('Raw input received:', $rawInput);

    // Verifica metodo HTTP
    writeLog('Request Method:', $_SERVER['REQUEST_METHOD']);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    // Carica configurazione
    $domainParts = explode('.', $_SERVER['HTTP_HOST']);
    $thirdLevelDomain = $domainParts[0];
    $config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

    if (!$config) {
        writeLog("Error loading config for domain:", $thirdLevelDomain);
        throw new Exception('Configuration error');
    }

    // Decodifica payload
    $payload = json_decode($rawInput, true);
    writeLog('Decoded payload:', $payload);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        writeLog('JSON decode error:', json_last_error_msg());
        throw new Exception('Invalid JSON payload: ' . json_last_error_msg());
    }

    // Connessione al database
    $pdo = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Crea e avvia il gestore webhook
    $handler = new CampaignWebhookHandler($pdo, $config, $payload, $thirdLevelDomain);
    $result = $handler->handle();

    writeLog('Handler result:', $result);
    echo json_encode($result);

} catch (Exception $e) {
    writeLog('Error:', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}