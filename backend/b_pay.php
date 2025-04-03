<?php
if (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Error handling
function handleError($errno, $errstr, $errfile, $errline) {
    if (ob_get_level()) ob_end_clean();
    error_log("Error: {$errstr} in {$errfile} on line {$errline}");
    echo json_encode([
        'success' => false,
        'error' => 'Si è verificato un errore'
    ]);
    exit(1);
}

function handleException($e) {
    if (ob_get_level()) ob_end_clean();
    error_log("Exception: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

try {
    // Load configuration
    $domain = explode('.', $_SERVER['HTTP_HOST'])[0];
    $config = parse_ini_file("../config/{$domain}/config.ini", true);

    if (!isset($config['stripe']['secret_key'])) {
        throw new Exception('Configurazione Stripe mancante');
    }

    // Database connection
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

    // Stripe helper function
    function stripeRequest($endpoint, $method = 'POST', $data = null) {
        global $config;
        
        $ch = curl_init();
        $url = "https://api.stripe.com/v1/" . $endpoint;
        
        $headers = [
            'Authorization: Bearer ' . $config['stripe']['secret_key'],
            'Content-Type: application/x-www-form-urlencoded',
            'Stripe-Version: 2023-10-16'
        ];
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                // Converti i booleani in stringhe per Stripe
                $processedData = array_map(function($value) {
                    if (is_bool($value)) {
                        return $value ? 'true' : 'false';
                    }
                    return $value;
                }, $data);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($processedData));
            }
        }
        
        $response = curl_exec($ch);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            throw new Exception("Errore di connessione: " . $error);
        }
        
        $result = json_decode($response, true);
        if ($result === null) {
            throw new Exception("Risposta non valida da Stripe");
        }
        
        if (isset($result['error'])) {
            throw new Exception($result['error']['message']);
        }
        
        return $result;
    }

    // Function to get all payments
    function getPayments($pdo) {
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    payment_id,
                    created_at,
                    amount,
                    currency,
                    CASE 
                        WHEN status = 'succeeded' THEN 'Completato'
                        WHEN status = 'pending' THEN 'In attesa'
                        WHEN status = 'failed' THEN 'Fallito'
                        ELSE status 
                    END as status,
                    customer_name,
                    customer_email,
                    description,
                    receipt_url,
                    FALSE as refunded,      # Valore di default se la colonna non esiste
                    0.00 as refund_amount   # Valore di default se la colonna non esiste
                FROM t_pay 
                ORDER BY created_at DESC
            ");
            
            $stmt->execute();
            $payments = $stmt->fetchAll();
    
            // Formatta i dati
            foreach ($payments as &$payment) {
                $payment['amount'] = floatval($payment['amount']);
                $payment['refund_amount'] = floatval($payment['refund_amount']);
                $payment['refunded'] = (bool)$payment['refunded'];
            }
    
            return [
                'success' => true,
                'payments' => $payments
            ];
    
        } catch (Exception $e) {
            error_log("Error in getPayments: " . $e->getMessage());
            throw new Exception('Errore nel recupero dei pagamenti: ' . $e->getMessage());
        }
    }

    // Function to get single payment
    function getPayment($pdo, $request) {
        if (!isset($request['id'])) {
            throw new Exception('ID pagamento mancante');
        }

        $stmt = $pdo->prepare("
            SELECT *,
            CASE 
                WHEN status = 'succeeded' THEN 'Completato'
                WHEN status = 'pending' THEN 'In attesa'
                WHEN status = 'failed' THEN 'Fallito'
                ELSE status 
            END as status_label
            FROM t_pay 
            WHERE payment_id = ?
        ");
        
        $stmt->execute([$request['id']]);
        $payment = $stmt->fetch();

        if (!$payment) {
            throw new Exception('Pagamento non trovato');
        }

        return [
            'success' => true,
            'payment' => $payment
        ];
    }

    // Function to process payment
    function handlePayment($pdo, $request) {
        if (!isset($request['payment_method_id'], $request['amount'], $request['email'], $request['name'])) {
            throw new Exception('Parametri mancanti');
        }

        $amount = round(floatval($request['amount']) * 100);
        if ($amount <= 0) {
            throw new Exception('Importo non valido');
        }

        try {
            $paymentData = [
                'amount' => $amount,
                'currency' => 'eur',
                'payment_method' => $request['payment_method_id'],
                'confirmation_method' => 'automatic',
                'confirm' => 'true',
                'return_url' => 'https://' . $_SERVER['HTTP_HOST'] . '/w_paypage.php?page=success',
                'receipt_email' => $request['email'],
                'description' => $request['description'] ?? '',
                'metadata' => [
                    'customer_name' => $request['name'],
                    'customer_email' => $request['email']
                ]
            ];

            $paymentIntent = stripeRequest('payment_intents', 'POST', $paymentData);

            if ($paymentIntent['status'] === 'requires_action' && 
                $paymentIntent['next_action']['type'] === 'use_stripe_sdk') {
                return [
                    'success' => true,
                    'requires_action' => true,
                    'payment_intent_client_secret' => $paymentIntent['client_secret'],
                    'payment_intent_id' => $paymentIntent['id']
                ];
            }

            $stmt = $pdo->prepare("
                INSERT INTO t_pay (
                    payment_id, amount, currency, status, 
                    customer_email, customer_name, payment_method,
                    description, metadata, receipt_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $paymentIntent['id'],
                $amount / 100,
                $paymentIntent['currency'],
                $paymentIntent['status'],
                $request['email'],
                $request['name'],
                'card',
                $request['description'] ?? '',
                json_encode($paymentIntent['metadata']),
                $paymentIntent['charges']['data'][0]['receipt_url'] ?? null
            ]);

            $successUrl = 'w_paypage.php?page=success'
                       . '&amount=' . ($amount / 100)
                       . '&payment_id=' . urlencode($paymentIntent['id']);

            return [
                'success' => true,
                'requires_action' => false,
                'redirect' => $successUrl
            ];

        } catch (Exception $e) {
            throw new Exception('Pagamento fallito: ' . $e->getMessage());
        }
    }

    // Function to handle 3D Secure confirmation
    function handleConfirmPayment($pdo, $request) {
        if (!isset($request['payment_intent_id'])) {
            throw new Exception('ID pagamento mancante');
        }

        try {
            $paymentIntent = stripeRequest(
                'payment_intents/' . $request['payment_intent_id'] . '/confirm',
                'POST'
            );

            $stmt = $pdo->prepare("UPDATE t_pay SET status = ? WHERE payment_id = ?");
            $stmt->execute([$paymentIntent['status'], $paymentIntent['id']]);

            $successUrl = 'w_paypage.php?page=success'
                       . '&amount=' . ($paymentIntent['amount'] / 100)
                       . '&payment_id=' . urlencode($paymentIntent['id']);

            return [
                'success' => true,
                'redirect' => $successUrl
            ];

        } catch (Exception $e) {
            throw new Exception('Conferma fallita: ' . $e->getMessage());
        }
    }

    // Function to process refund
    function processRefund($pdo, $request) {
        if (!isset($request['payment_id'], $request['amount'])) {
            throw new Exception('Parametri mancanti per il rimborso');
        }

        $paymentIntent = stripeRequest('payment_intents/' . $request['payment_id'], 'GET');
        if (!isset($paymentIntent['charges']['data'][0]['id'])) {
            throw new Exception('Charge ID non trovato');
        }

        $refundData = [
            'charge' => $paymentIntent['charges']['data'][0]['id'],
            'amount' => round(floatval($request['amount']) * 100),
            'reason' => 'requested_by_customer'
        ];

        $refund = stripeRequest('refunds', 'POST', $refundData);

        $stmt = $pdo->prepare("
            UPDATE t_pay 
            SET refunded = 1, 
                refund_amount = refund_amount + ?,
                updated_at = NOW() 
            WHERE payment_id = ?
        ");
        
        $stmt->execute([$request['amount'], $request['payment_id']]);

        return [
            'success' => true,
            'message' => 'Rimborso effettuato con successo'
        ];
    }

    // Main request handling
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $request = [
            'action' => $_GET['action'] ?? '',
            'id' => $_GET['id'] ?? ''
        ];
    }
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $request = json_decode(file_get_contents('php://input'), true);
    }
    else {
        throw new Exception('Metodo non valido');
    }

    if (!$request) {
        throw new Exception('Richiesta non valida');
    }

    switch ($request['action']) {
        case 'get_payments':
            $result = getPayments($pdo);
            break;
        case 'get_payment':
            $result = getPayment($pdo, $request);
            break;
        case 'process_payment':
            $result = handlePayment($pdo, $request);
            break;
        case 'confirm_payment':
            $result = handleConfirmPayment($pdo, $request);
            break;
        case 'process_refund':
            $result = processRefund($pdo, $request);
            break;
        default:
            throw new Exception('Azione non valida');
    }

    if (ob_get_level()) ob_end_clean();
    echo json_encode($result);

} catch (Exception $e) {
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

if (ob_get_level()) ob_end_flush();
?>