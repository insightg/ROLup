<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/debug.log');

// Funzione di debug
function debug($message, $data = null) {
    $debugMsg = date('Y-m-d H:i:s') . " DEBUG: $message";
    if ($data !== null) {
        $debugMsg .= "\nData: " . print_r($data, true);
    }
    file_put_contents(__DIR__ . '/debug.log', $debugMsg . "\n", FILE_APPEND);
}

debug('Script iniziato');

// Carica configurazione
try {
    $domainParts = explode('.', $_SERVER['HTTP_HOST']);
    $thirdLevelDomain = $domainParts[0];
    $configPath = "../config/{$thirdLevelDomain}/config.ini";
    
    if (!file_exists($configPath)) {
        throw new Exception("File di configurazione non trovato: $configPath");
    }
    
    $config = parse_ini_file($configPath, true);
    if ($config === false) {
        throw new Exception("Errore nel parsing del file di configurazione");
    }
    
    debug('Configurazione caricata', ['domain' => $thirdLevelDomain]);

    // Inizializza connessione database
    $pdo = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    debug('Connessione database stabilita');

} catch (Exception $e) {
    debug('Errore inizializzazione', ['error' => $e->getMessage()]);
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => $e->getMessage()]));
}

// Funzioni di supporto
function replacePlaceholders($text, $data) {
    return preg_replace_callback(
        '/\{([^}]+)\}/',
        function($matches) use ($data) {
            return $data[$matches[1]] ?? $matches[0];
        },
        $text
    );
}

function callClaude($prompt, $config) {
    debug('Chiamata API Claude', ['prompt' => $prompt]);

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
                    'content' => $prompt
                ]
            ],
            'max_tokens' => 1024,
            'temperature' => 0.7
        ])
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode !== 200) {
        debug('Errore chiamata Claude', ['httpCode' => $httpCode, 'response' => $response]);
        throw new Exception('Errore chiamata Claude');
    }

    $result = json_decode($response, true);
    if (!$result || !isset($result['content'][0]['text'])) {
        debug('Risposta Claude non valida', ['response' => $response]);
        throw new Exception('Risposta Claude non valida');
    }

    debug('Risposta Claude ricevuta', ['response' => $result['content'][0]['text']]);
    return $result['content'][0]['text'];
}

function handleIncomingMessage(PDO $pdo, array $messageData) {
    global $config;
    debug('Inizio handleIncomingMessage', $messageData);

    $phone = $messageData['from'];
    $message = $messageData['body'];

    try {
        // Verifica conversazione attiva
        $stmt = $pdo->prepare("
            SELECT c.*, f.welcome_message, f.source_table, f.phone_field, f.flow_data
            FROM t_bot_conversations c
            JOIN t_bot_flows f ON c.flow_id = f.id
            WHERE c.contact_phone = ? AND NOT c.is_completed 
            ORDER BY c.last_interaction_at DESC LIMIT 1
        ");
        $stmt->execute([$phone]);
        $conversation = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($conversation) {
            handleExistingConversation($pdo, $conversation, $messageData);
        } else {
            try {
                $flow = validateFlow($pdo);
                $contact = validateContact($phone, $flow);
                
                // Crea nuova conversazione
                $conversationId = createNewConversation($pdo, $flow, $contact, $phone, $messageData);
                
                // Invia messaggio di benvenuto
                sendWelcomeMessage($pdo, $config, $conversationId, $flow, $contact, $phone);
                
            } catch (Exception $e) {
                debug('Errore durante la validazione/creazione conversazione', ['error' => $e->getMessage()]);
                sendUltraMsg($config, $phone, "Ci dispiace, ma questo numero non è registrato nel nostro sistema.");
            }
        }
    } catch (Exception $e) {
        debug('Errore in handleIncomingMessage', ['error' => $e->getMessage()]);
        throw $e;
    }
}

function handleExistingConversation($pdo, $conversation, $messageData) {
    global $config;
    
    debug('Gestione conversazione esistente', [
        'conversation_id' => $conversation['id'],
        'contact_phone' => $conversation['contact_phone'],
        'current_step' => $conversation['current_step']
    ]);

    try {
        $pdo->beginTransaction();

        // Inserisci il messaggio ricevuto
        $stmt = $pdo->prepare("
            INSERT INTO t_bot_messages (
                conversation_id,
                direction,
                content,
                metadata
            ) VALUES (?, 'incoming', ?, ?)
        ");

        $metadata = json_encode([
            'message_id' => $messageData['id'],
            'timestamp' => $messageData['timestamp'],
            'pushname' => $messageData['pushname'],
            'raw_data' => $messageData
        ]);

        $stmt->execute([
            $conversation['id'],
            $messageData['body'],
            $metadata
        ]);

        // Processa lo step corrente
        $flowData = json_decode($conversation['flow_data'], true);
        $currentStep = null;
        
        foreach ($flowData['steps'] as $step) {
            if ($step['id'] === $conversation['current_step']) {
                $currentStep = $step;
                break;
            }
        }

        if (!$currentStep) {
            throw new Exception('Step corrente non trovato');
        }

        switch ($currentStep['type']) {
            case 'free_chat':
                // Gestisci la chat libera con Claude
                handleFreeChatStep($pdo, $conversation, $messageData, $currentStep);
                break;

            default:
                // Gestisci altri tipi di step
                $response = processStep($messageData['body'], $currentStep, $conversation);
                
                // Invia risposta se presente
                if (!empty($response['message'])) {
                    sendUltraMsg($config, $conversation['contact_phone'], $response['message']);
                    
                    // Salva il messaggio inviato
                    $stmt = $pdo->prepare("
                        INSERT INTO t_bot_messages (
                            conversation_id,
                            direction,
                            content
                        ) VALUES (?, 'outgoing', ?)
                    ");
                    $stmt->execute([$conversation['id'], $response['message']]);
                }

                // Aggiorna lo stato della conversazione
                $stmt = $pdo->prepare("
                    UPDATE t_bot_conversations 
                    SET current_step = ?,
                        state = ?,
                        last_interaction_at = CURRENT_TIMESTAMP,
                        is_completed = ?
                    WHERE id = ?
                ");

                $stmt->execute([
                    $response['next_step'],
                    json_encode($response['state'] ?? []),
                    !empty($response['completed']) ? 1 : 0,
                    $conversation['id']
                ]);
        }

        $pdo->commit();
        debug('Conversazione gestita con successo');

    } catch (Exception $e) {
        $pdo->rollBack();
        debug('Errore gestione conversazione', ['error' => $e->getMessage()]);
        throw $e;
    }
}

function handleFreeChatStep(PDO $pdo, $conversation, $messageData, $step) {
    global $config;
    
    debug('Gestione free chat step', [
        'conversation_id' => $conversation['id'],
        'message' => $messageData['body']
    ]);

    try {
        // Se l'utente vuole uscire dalla chat libera
        if (strtolower(trim($messageData['body'])) === '/exit') {
            // Aggiorna lo stato della conversazione
            $stmt = $pdo->prepare("
                UPDATE t_bot_conversations 
                SET current_step = ?,
                    last_interaction_at = CURRENT_TIMESTAMP,
                    is_completed = 1
                WHERE id = ?
            ");
            $stmt->execute([$step['next_step'], $conversation['id']]);

            // Invia messaggio di chiusura
            $message = "Grazie per aver utilizzato il nostro servizio di assistenza!";
            sendUltraMsg($config, $conversation['contact_phone'], $message);
            
            // Salva il messaggio di chiusura
            $stmt = $pdo->prepare("
                INSERT INTO t_bot_messages (
                    conversation_id,
                    direction,
                    content
                ) VALUES (?, 'outgoing', ?)
            ");
            $stmt->execute([$conversation['id'], $message]);

            return;
        }

        // Recupera la configurazione della free chat
        $stmt = $pdo->prepare("
            SELECT * FROM t_bot_free_chat_configs WHERE id = ? AND is_active = TRUE
        ");
        $stmt->execute([$step['config_id']]);
        $chatConfig = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$chatConfig) {
            throw new Exception('Configurazione chat non trovata');
        }

        // Prepara il prompt per Claude
        $prompt = $chatConfig['prompt_template'] . "\n\n" .
                 "Base knowledge:\n" . $chatConfig['base_knowledge'] . "\n\n" .
                 "User message: " . $messageData['body'];

        // Chiama Claude
        $claudeResponse = callClaude($prompt, $config);

        // Invia la risposta
        sendUltraMsg($config, $conversation['contact_phone'], $claudeResponse);

        // Salva la risposta nel database
        $stmt = $pdo->prepare("
            INSERT INTO t_bot_messages (
                conversation_id,
                direction,
                content,
                message_type
            ) VALUES (?, 'outgoing', ?, 'ai_response')
        ");
        $stmt->execute([$conversation['id'], $claudeResponse]);

    } catch (Exception $e) {
        debug('Errore in handleFreeChatStep', ['error' => $e->getMessage()]);
        sendUltraMsg($config, $conversation['contact_phone'], 
            "Mi dispiace, al momento ho difficoltà a rispondere. Puoi riprovare più tardi o digitare /exit per terminare."
        );
    }
}

function sendUltraMsg($config, $phone, $message) {
    debug('Inizio invio messaggio UltraMsg', [
        'phone_originale' => $phone,
        'message' => $message
    ]);

    if (!isset($config['ultraMsg'])) {
        debug('Errore: configurazione UltraMsg mancante');
        throw new Exception('Configurazione UltraMsg mancante');
    }

    // Normalizza il numero di telefono
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    
    if (!str_starts_with($phone, '+')) {
        if (str_starts_with($phone, '39')) {
            $phone = '+' . $phone;
        } else {
            $phone = '+39' . $phone;
        }
    }

    debug('Numero telefono normalizzato', ['phone' => $phone]);

    if (!preg_match('/^\+[0-9]{10,15}$/', $phone)) {
        debug('Errore: numero telefono non valido', ['phone' => $phone]);
        throw new Exception('Numero di telefono non valido');
    }

    $instance = $config['ultraMsg']['instance'];
    $token = $config['ultraMsg']['token'];

    $url = "https://api.ultramsg.com/{$instance}/messages/chat";
    $payload = [
        'token' => $token,
        'to' => $phone,
        'body' => $message,
        'priority' => 1
    ];

    debug('Preparazione richiesta UltraMsg', [
        'url' => $url,
        'payload' => array_merge($payload, ['token' => '***'])
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    debug('Risposta UltraMsg', [
        'httpCode' => $httpCode,
        'response' => $response
    ]);

    curl_close($ch);

    if ($httpCode !== 200) {
        debug('Errore invio messaggio WhatsApp', [
            'httpCode' => $httpCode,
            'response' => $response
        ]);
        throw new Exception('Errore invio messaggio WhatsApp');
    }

    return true;
}

// Gestione della richiesta
try {
    // Leggi headers
    $headers = getallheaders();
    debug('Headers ricevuti', $headers);

    // Leggi body
    $rawBody = file_get_contents('php://input');
    debug('Body ricevuto', $rawBody);

    // Decodifica JSON
    $data = json_decode($rawBody, true);
    debug('JSON decodificato', $data);

    if (!$data) {
        throw new Exception('Dati webhook non validi: ' . json_last_error_msg());
    }

    debug('Elaborazione evento UltraMsg');

    // Gestisci i diversi tipi di eventi
    switch ($data['event_type'] ?? 'unknown') {
        case 'message_received':
            debug('Gestione messaggio ricevuto');
            if (($data['data']['type'] ?? '') === 'chat') {
                try {
                    $messageData = [
                        'id' => $data['data']['id'],
                        'from' => preg_replace('/@c\.us$/', '', $data['data']['from']),
                        'body' => $data['data']['body'],
                        'timestamp' => $data['data']['time'],
                        'type' => $data['data']['type'],
                        'pushname' => $data['data']['pushname']
                    ];
                    
                    debug('Dati messaggio elaborati', $messageData);
                    handleIncomingMessage($pdo, $messageData);
                    debug('Messaggio gestito con successo');
                } catch (Exception $e) {
                    debug('Errore gestione messaggio', ['error' => $e->getMessage()]);
                    throw $e;
                }
            }
            break;
    
        case 'message_ack':
            debug('Gestione conferma messaggio', [
                'message_id' => $data['id'],
                'ack_status' => $data['data']['ack'] ?? 'unknown'
            ]);
            try {
                // Aggiorna lo stato del messaggio nel database
                $stmt = $pdo->prepare("
                    UPDATE t_bot_messages 
                    SET metadata = JSON_SET(
                        COALESCE(metadata, '{}'),
                        '$.status', ?,
                        '$.status_timestamp', CURRENT_TIMESTAMP
                    )
                    WHERE metadata->>'$.message_id' = ?
                ");
                $stmt->execute([
                    $data['data']['ack'] ?? 'unknown',
                    $data['id']
                ]);
                debug('Stato messaggio aggiornato');
            } catch (Exception $e) {
                debug('Errore aggiornamento stato messaggio', ['error' => $e->getMessage()]);
            }
            break;
    
        case 'message_status':
            debug('Gestione status messaggio');
            try {
                $statusData = [
                    'id' => $data['data']['id'],
                    'status' => $data['data']['status'] ?? 'unknown',
                    'timestamp' => time()
                ];
                
                debug('Dati status elaborati', $statusData);
                updateMessageStatus($pdo, $statusData);
                debug('Status aggiornato con successo');
            } catch (Exception $e) {
                debug('Errore aggiornamento status', ['error' => $e->getMessage()]);
                throw $e;
            }
            break;
    
        default:
            debug('Evento sconosciuto ricevuto', ['event_type' => $data['event_type'] ?? 'unknown']);
    }
 
    // Invia risposta
    $response = ['success' => true];
    debug('Invio risposta', $response);
    
    header('Content-Type: application/json');
    echo json_encode($response);
 
 } catch (Exception $e) {
    debug('Errore webhook', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
 
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
 }
 
 debug('Script completato');