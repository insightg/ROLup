<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

class TesseramentoCampaignController {
    private $db;
    private $config;
    private $ultraMsg;

    public function __construct($db) {
        $this->db = $db;
        
        // Load configuration
        $domainParts = explode('.', $_SERVER['HTTP_HOST']);
        $thirdLevelDomain = $domainParts[0];
        $this->config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);
        $this->ultraMsg = $this->config['ultramsg'] ?? null;

        if (!$this->ultraMsg) {
            throw new Exception('UltraMsg configuration not found');
        }
    }

    public function handleRequest() {
        try {
            // Handle POST/PUT requests
            if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = json_decode(file_get_contents('php://input'), true);
                if (!$data) {
                    throw new Exception('Invalid JSON data');
                }
                
                switch($data['action']) {
                    case 'createCampaign':
                        $this->createCampaign($data);
                        break;
                    case 'updateCampaign':
                        $this->updateCampaign($data);
                        break;
                    case 'sendMessage':
                        $this->sendMessage($data);
                        break;
                    case 'pauseCampaign':
                        $this->pauseCampaign($data);
                        break;
                    default:
                        throw new Exception('Invalid action for ' . $_SERVER['REQUEST_METHOD']);
                }
                return;
            }

            // Handle DELETE requests
            if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $this->handleDeleteRequest();
                return;
            }

            // Handle GET requests
            $action = $_GET['action'] ?? '';
            
            switch($action) {
                case 'getCampaigns':
                    $this->getCampaigns();
                    break;
                case 'getCampaignDetails':
                    $this->getCampaignDetails();
                    break;
                case 'getTracking':
                    $this->getTracking();
                    break;
                case 'getAziende':
                    $this->getAziende();
                    break;
                case 'getTipoTessere':
                    $this->getTipoTessere();
                    break;
                default:
                    throw new Exception('Invalid action');
            }

        } catch (Exception $e) {
            $this->logError($e);
            $this->sendError($e->getMessage());
        }
    }

    private function getCampaigns() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    c.*,
                    COUNT(DISTINCT r.id) as total_recipients,
                    COUNT(DISTINCT CASE WHEN m.status IS NOT NULL THEN r.id END) as sent_count,
                    COUNT(DISTINCT CASE WHEN p.payment_status = 'completed' THEN p.id END) as paid_count,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount ELSE 0 END), 0) as total_amount
                FROM t_tess_campaigns c
                LEFT JOIN t_tess_recipients r ON c.id = r.campaign_id
                LEFT JOIN t_camp_messages m ON r.id = m.recipient_id
                LEFT JOIN t_tess_payments p ON r.id = p.recipient_id
                GROUP BY c.id
                ORDER BY c.id DESC
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                'success' => true,
                'data' => $results
            ]);

        } catch (Exception $e) {
            $this->sendError("Error retrieving campaigns: " . $e->getMessage());
        }
    }

    private function getCampaignDetails() {
        try {
            if (!isset($_GET['id'])) {
                throw new Exception('Campaign ID required');
            }

            $campaignId = (int)$_GET['id'];

            $stmt = $this->db->prepare("
                SELECT 
                    c.*,
                    COUNT(DISTINCT r.id) as total_recipients,
                    COUNT(DISTINCT CASE WHEN m.status IS NOT NULL THEN r.id END) as sent_count
                FROM t_tess_campaigns c
                LEFT JOIN t_tess_recipients r ON c.id = r.campaign_id
                LEFT JOIN t_camp_messages m ON r.id = m.recipient_id
                WHERE c.id = ?
                GROUP BY c.id
            ");
            
            $stmt->execute([$campaignId]);
            $campaign = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$campaign) {
                throw new Exception('Campaign not found');
            }

            $this->sendResponse([
                'success' => true,
                'data' => $campaign
            ]);

        } catch (Exception $e) {
            $this->sendError("Error retrieving campaign details: " . $e->getMessage());
        }
    }

    private function getTracking() {
        try {
            $query = "
                SELECT 
                    m.id,
                    m.campaign_id,
                    c.name as campaign_name,
                    r.payment_link,
                    r.status as recipient_status,
                    m.status as message_status,
                    m.data_msg,
                    m.message_content,
                    a.socio_principale,
                    a.phone,
                    COALESCE(p.amount, 0) as paid_amount,
                    p.payment_status,
                    tt.nome_tessera
                FROM t_camp_messages m
                JOIN t_tess_campaigns c ON m.campaign_id = c.id
                JOIN t_tess_recipients r ON m.recipient_id = r.id
                JOIN aziende a ON r.azienda_id = a.id
                LEFT JOIN t_tess_payments p ON r.id = p.recipient_id
                LEFT JOIN tipologie_tessere tt ON p.tessera_id = tt.id
                ORDER BY m.data_msg DESC
                LIMIT 1000
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                'success' => true,
                'data' => $results
            ]);

        } catch (Exception $e) {
            $this->sendError("Error retrieving tracking data: " . $e->getMessage());
        }
    }

    private function getAziende() {
        try {
            $query = "
                SELECT 
                    a.*,
                    t.nome as territorio_nome,
                    COALESCE(tess.importo, 0) as ultimo_tesseramento
                FROM aziende a
                LEFT JOIN territorio t ON a.territorio_id = t.id
                LEFT JOIN Tesseramenti tess ON a.codice_fiscale = tess.codice_fiscale
                WHERE a.phone IS NOT NULL 
                AND a.phone != ''
                ORDER BY a.socio_principale
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                'success' => true,
                'data' => $results
            ]);

        } catch (Exception $e) {
            $this->sendError("Error retrieving companies: " . $e->getMessage());
        }
    }

    private function createCampaign($data) {
        try {
            $this->validateCampaignData($data);

            $this->db->beginTransaction();

            try {
                // Create campaign
                $stmt = $this->db->prepare("
                    INSERT INTO t_tess_campaigns (
                        name, message_template, status, created_at, updated_at
                    ) VALUES (?, ?, 'draft', NOW(), NOW())
                ");
                
                $stmt->execute([
                    $data['name'],
                    $data['message_template']
                ]);

                $campaignId = $this->db->lastInsertId();

                // Add recipients
                $stmt = $this->db->prepare("
                    INSERT INTO t_tess_recipients (
                        campaign_id, azienda_id, payment_link, status, created_at
                    ) VALUES (?, ?, ?, 'pending', NOW())
                ");

                foreach ($data['aziende'] as $aziendaId) {
                    $paymentLink = $this->generatePaymentLink($campaignId, $aziendaId);
                    $stmt->execute([
                        $campaignId,
                        $aziendaId,
                        $paymentLink
                    ]);
                }

                $this->logAction($campaignId, 'create', 'Campaign created');

                $this->db->commit();
                
                $this->sendResponse([
                    'success' => true,
                    'message' => 'Campaign created successfully',
                    'campaign_id' => $campaignId
                ]);

            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    private function generatePaymentLink($campaignId, $aziendaId) {
        // Generate unique token
        $token = bin2hex(random_bytes(16));
        
        // Build payment link using config
        $baseUrl = $this->config['app']['payment_url'] ?? 'https://payment.example.com';
        return $baseUrl . "?campaign={$campaignId}&azienda={$aziendaId}&token={$token}";
    }

    private function updateCampaign($data) {
        try {
            if (!isset($data['id'])) {
                throw new Exception('Campaign ID required');
            }

            $this->validateCampaignData($data);

            $campaignId = (int)$data['id'];

            $this->db->beginTransaction();

            try {
                // Update campaign
                $stmt = $this->db->prepare("
                    UPDATE t_tess_campaigns
                    SET name = ?, 
                        message_template = ?,
                        updated_at = NOW()
                    WHERE id = ? AND status = 'draft'
                ");
                
                $stmt->execute([
                    $data['name'],
                    $data['message_template'],
                    $campaignId
                ]);

                if ($stmt->rowCount() === 0) {
                    throw new Exception('Campaign not found or not in draft status');
                }

                // Delete old recipients
                $this->db->prepare("DELETE FROM t_tess_recipients WHERE campaign_id = ?")->execute([$campaignId]);

                // Add new recipients
                $stmt = $this->db->prepare("
                    INSERT INTO t_tess_recipients (
                        campaign_id, azienda_id, payment_link, status, created_at
                    ) VALUES (?, ?, ?, 'pending', NOW())
                ");

                foreach ($data['aziende'] as $aziendaId) {
                    $paymentLink = $this->generatePaymentLink($campaignId, $aziendaId);
                    $stmt->execute([
                        $campaignId,
                        $aziendaId,
                        $paymentLink
                    ]);
                }

                $this->logAction($campaignId, 'update', 'Campaign updated');

                $this->db->commit();
                
                $this->sendResponse([
                    'success' => true,
                    'message' => 'Campaign updated successfully'
                ]);

            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    private function sendMessage($data) {
        if (!isset($data['campaign_id'])) {
            throw new Exception('Campaign ID required');
        }

        $campaignId = (int)$data['campaign_id'];

        try {
            $this->db->beginTransaction();

            // Get next recipient
            $stmt = $this->db->prepare("
                SELECT 
                    r.id as recipient_id,
                    r.payment_link,
                    c.message_template,
                    a.socio_principale,
                    a.phone
                FROM t_tess_recipients r
                JOIN t_tess_campaigns c ON r.campaign_id = c.id
                JOIN aziende a ON r.azienda_id = a.id
                WHERE r.campaign_id = ?
                AND r.status = 'pending'
                LIMIT 1
                FOR UPDATE
            ");
            
            $stmt->execute([$campaignId]);
            $recipient = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$recipient) {
                // No more recipients - mark campaign as completed
                $stmt = $this->db->prepare("
                    UPDATE t_tess_campaigns 
                    SET status = 'completed', 
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$campaignId]);

                $this->db->commit();
                
                $this->sendResponse([
                    'success' => true,
                    'completed' => true,
                    'message' => 'Campaign completed'
                ]);
                return;
            }

            // Prepare message
            $messageData = [
                'socio_principale' => $recipient['socio_principale'],
                'payment_link' => $recipient['payment_link']
            ];
            
            $messageContent = $this->prepareMessage($recipient['message_template'], $messageData);

            // Send message via API
            $messageId = $this->sendUltraMsg($recipient['phone'], $messageContent);

            // Log message
            $stmt = $this->db->prepare("
                INSERT INTO t_camp_messages (
                    campaign_id, recipient_id, message_id, message_content,
                    status, data_msg
                ) VALUES (?, ?, ?, ?, 'sent', NOW())
            ");
            
            $stmt->execute([
                $campaignId,
                $recipient['recipient_id'],
                $messageId,
                $messageContent
            ]);

            // Update recipient status
            $stmt = $this->db->prepare("
                UPDATE t_tess_recipients 
                SET status = 'sent' 
                WHERE id = ?
            ");
            $stmt->execute([$recipient['recipient_id']]);

            // Update campaign stats
            $this->updateCampaignStats($campaignId);

            $this->db->commit();

            $this->sendResponse([
                'success' => true,
                'message' => 'Message sent successfully'
            ]);

        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function pauseCampaign($data) {
        if (!isset($data['campaign_id'])) {
            throw new Exception('Campaign ID required');
        }

        $campaignId = (int)$data['campaign_id'];

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("
                SELECT status 
                FROM t_tess_campaigns 
                WHERE id = ?
            ");
            $stmt->execute([$campaignId]);
            $status = $stmt->fetchColumn();

            if (!$status) {
                throw new Exception('Campaign not found');
            }

            if ($status !== 'active') {
                throw new Exception('Only active campaigns can be paused');
            }

            $stmt = $this->db->prepare("
                UPDATE t_tess_campaigns 
                SET status = 'paused',
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$campaignId]);

            $this->logAction($campaignId, 'pause', 'Campaign paused');

            $this->db->commit();

            $this->sendResponse([
                'success' => true,
                'message' => 'Campaign paused successfully'
            ]);

        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function handleDeleteRequest() {
        try {
            if (!isset($_GET['id'])) {
                throw new Exception('Campaign ID required');
            }

            $campaignId = (int)$_GET['id'];

            $this->db->beginTransaction();

            try {
                // First delete references in other tables
                $this->db->prepare("DELETE FROM t_camp_messages WHERE campaign_id = ?")->execute([$campaignId]);
                $this->db->prepare("DELETE FROM t_tess_payments WHERE recipient_id IN (SELECT id FROM t_tess_recipients WHERE campaign_id = ?)")->execute([$campaignId]);
                $this->db->prepare("DELETE FROM t_tess_recipients WHERE campaign_id = ?")->execute([$campaignId]);
                $this->db->prepare("DELETE FROM t_tess_logs WHERE campaign_id = ?")->execute([$campaignId]);

                // Finally delete the campaign
                $stmt = $this->db->prepare("DELETE FROM t_tess_campaigns WHERE id = ?");
                $stmt->execute([$campaignId]);

                if ($stmt->rowCount() === 0) {
                    throw new Exception('Campaign not found');
                }

                $this->db->commit();
                
                $this->sendResponse([
                    'success' => true,
                    'message' => 'Campaign deleted successfully'
                ]);

            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    private function validateCampaignData($data) {
        $required = ['name', 'message_template', 'aziende'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field {$field} is required");
            }
        }

        if (!is_array($data['aziende']) || empty($data['aziende'])) {
            throw new Exception('Select at least one company');
        }

        if (!str_contains($data['message_template'], '{payment_link}')) {
            throw new Exception('Template must contain {payment_link} placeholder');
        }
    }

    private function logAction($campaignId, $actionType, $description) {
        $stmt = $this->db->prepare("
            INSERT INTO t_tess_logs (
                campaign_id, action_type, description, user_id, created_at
            ) VALUES (?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $campaignId,
            $actionType,
            $description,
            $_SESSION['user']['id'] ?? null
        ]);
    }

    function handleFileUpload($file, $subDirectory) {
        // Ottieni il dominio di terzo livello
        $domainParts = explode('.', $_SERVER['HTTP_HOST']);
        $thirdLevelDomain = $domainParts[0];
        
        // Costruisci il percorso base degli upload
        $baseUploadDir = "../config/{$thirdLevelDomain}/uploads/";
        $uploadDir = $baseUploadDir . $subDirectory . '/';
        
        // Crea le directory se non esistono
        if (!file_exists($baseUploadDir)) {
            if (!mkdir($baseUploadDir, 0755, true)) {
                throw new Exception('Impossibile creare la directory di base per gli upload');
            }
        }
        
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                throw new Exception("Impossibile creare la directory {$subDirectory}");
            }
        }
    
        // Validazione file
        $allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $maxSize = 10 * 1024 * 1024; // 10MB
    
        if ($file['size'] > $maxSize) {
            throw new Exception('File troppo grande. Dimensione massima: 10MB');
        }
    
        if ($subDirectory === 'images' && !in_array($file['type'], $allowedImageTypes)) {
            throw new Exception('Tipo di file non supportato');
        }
    
        // Generazione nome file sicuro
        $fileName = uniqid() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file['name']));
        $filePath = $uploadDir . $fileName;
    
        // Spostamento file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception('Errore nel caricamento del file');
        }
    
        // Restituisci il percorso relativo dal dominio di terzo livello
        return "uploads/{$subDirectory}/" . $fileName;
    }
    
    private function sendUltraMsg($phone, $message) {
        try {
            $phone = $this->normalizePhone($phone);
            
            $url = "https://api.ultramsg.com/{$this->ultraMsg['instance']}/messages/chat";
            
            $data = [
                'token' => $this->ultraMsg['token'],
                'to' => $phone,
                'body' => $message,
                'priority' => 1
            ];

            if ($this->config['app']['debug'] ?? false) {
                error_log("Sending message to UltraMsg. URL: " . $url);
                error_log("Request data: " . json_encode($data));
            }

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json'
                ],
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 30
            ]);

            $response = curl_exec($ch);
            $error = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            curl_close($ch);

            if ($error) {
                throw new Exception("cURL error: $error");
            }

            if ($httpCode !== 200) {
                throw new Exception("HTTP error: $httpCode");
            }

            $result = json_decode($response, true);
            if (!$result) {
                throw new Exception("Invalid JSON response: " . $response);
            }

            if (!isset($result['sent']) || $result['sent'] !== "true") {
                throw new Exception("Message not sent: " . ($result['message'] ?? 'Unknown error'));
            }

            return $result['id'] ?? null;

        } catch (Exception $e) {
            error_log("Error in sendUltraMsg: " . $e->getMessage());
            throw new Exception("Error sending via UltraMsg: " . $e->getMessage());
        }
    }

    private function normalizePhone($phone) {
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        
        if (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
            throw new Exception('Invalid phone number format');
        }

        if (!str_starts_with($phone, '+')) {
            $phone = '+39' . $phone;
        }

        return $phone;
    }

    private function prepareMessage($template, $data) {
        return preg_replace_callback(
            '/\{([^}]+)\}/',
            function($matches) use ($data) {
                $field = $matches[1];
                return $data[$field] ?? $matches[0];
            },
            $template
        );
    }

    private function updateCampaignStats($campaignId) {
        $stmt = $this->db->prepare("
            UPDATE t_tess_campaigns c
            SET 
                sent_count = (
                    SELECT COUNT(*) 
                    FROM t_tess_recipients r 
                    WHERE r.campaign_id = c.id 
                    AND r.status = 'sent'
                ),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$campaignId]);
    }

    private function sendResponse($data) {
        echo json_encode($data);
        exit;
    }

    private function sendError($message) {
        http_response_code(500);
        $this->sendResponse([
            'success' => false,
            'error' => $message,
            'debug' => $this->config['app']['debug'] ?? false ? debug_backtrace() : null
        ]);
    }

    private function logError($e) {
        if ($this->config['app']['debug'] ?? false) {
            error_log("Campaign API Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
        }
    }
}

// Initialization
try {
    require_once '../common/db.php';
    $controller = new TesseramentoCampaignController($db);
    $controller->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Initialization error: ' . $e->getMessage()
    ]);
}