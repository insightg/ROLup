<?php
if (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json');

// Importa le funzioni di base da b_tsis.php
require_once('b_tsis.php');

function handleGetBookingActivities($pdo, $request) {
    try {
        $query = "
            SELECT 
                c.*,
                a.Nomeaccount,
                a.Indirizzospedizioni as ADDRESS,
                a.StatoProvinciaspedizioni as PROV,
                a.CAPspedizioni as CAP
            FROM ClusterDONE c
            JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE c.STATUS NOT IN ('Completate', 'DONE', '')
        ";
        
        $params = [];

        // Aggiungi filtri
        if (!empty($request['filters'])) {
            $filters = $request['filters'];
            
            if (!empty($filters['startDate'])) {
                $query .= " AND STR_TO_DATE(c.DATASOPRALLUOGO, '%d/%m/%Y') >= ?";
                $params[] = $filters['startDate'];
            }
            
            if (!empty($filters['endDate'])) {
                $query .= " AND STR_TO_DATE(c.DATASOPRALLUOGO, '%d/%m/%Y') <= ?";
                $params[] = $filters['endDate'];
            }
            
            if (!empty($filters['province'])) {
                $query .= " AND a.StatoProvinciaspedizioni = ?";
                $params[] = $filters['province'];
            }
            
            if (!empty($filters['status'])) {
                $query .= " AND c.STATUS = ?";
                $params[] = $filters['status'];
            }
        }

        $query .= " ORDER BY a.StatoProvinciaspedizioni, c.DATASOPRALLUOGO";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        return [
            'success' => true,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];

    } catch (Exception $e) {
        error_log('Error in handleGetBookingActivities: ' . $e->getMessage());
        throw new Exception('Error retrieving activities: ' . $e->getMessage());
    }
}

function handleOptimizeRoutes($pdo, $request) {
    if (!isset($request['activityIds']) || empty($request['activityIds'])) {
        throw new Exception('Nessuna attività selezionata');
    }

    try {
        // Recupera le attività selezionate
        $placeholders = str_repeat('?,', count($request['activityIds']) - 1) . '?';
        $query = "
            SELECT 
                c.*,
                a.Nomeaccount,
                a.Indirizzospedizioni as ADDRESS,
                a.StatoProvinciaspedizioni as PROV,
                a.CAPspedizioni as CAP,
                CASE 
                    WHEN c.STATUS IN ('ON', 'In Attesa di Risposta PM') THEN 3
                    WHEN c.STATUS = 'STANDBY' THEN 2
                    ELSE 1
                END as priority
            FROM ClusterDONE c
            JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE c.id IN ($placeholders)
            ORDER BY a.StatoProvinciaspedizioni, priority DESC, c.DATASOPRALLUOGO
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute($request['activityIds']);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Raggruppa per provincia
        $routes = [];
        foreach ($activities as $activity) {
            $province = $activity['PROV'];
            if (!isset($routes[$province])) {
                $routes[$province] = [];
            }
            $routes[$province][] = $activity;
        }

        // Crea un record nella tabella delle rotte
        $stmt = $pdo->prepare("
            INSERT INTO t_route_optimization (
                creation_date,
                optimization_data,
                status,
                activities_count,
                provinces_count
            ) VALUES (
                NOW(),
                ?,
                'COMPLETED',
                ?,
                ?
            )
        ");

        $stmt->execute([
            json_encode($routes),
            count($activities),
            count($routes)
        ]);

        $routeId = $pdo->lastInsertId();

        return [
            'success' => true,
            'routeId' => $routeId,
            'message' => 'Route ottimizzate con successo'
        ];

    } catch (Exception $e) {
        error_log('Error in handleOptimizeRoutes: ' . $e->getMessage());
        throw new Exception('Error optimizing routes: ' . $e->getMessage());
    }
}

function handleGetRoutes($pdo, $request) {
    try {
        if (!empty($request['routeId'])) {
            // Recupera una route specifica
            $stmt = $pdo->prepare("
                SELECT * FROM t_route_optimization 
                WHERE id = ? AND status = 'COMPLETED'
            ");
            $stmt->execute([$request['routeId']]);
            $route = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$route) {
                throw new Exception('Route non trovata');
            }

            return [
                'success' => true,
                'data' => [
                    'routes' => json_decode($route['optimization_data'], true),
                    'activities_count' => $route['activities_count'],
                    'provinces_count' => $route['provinces_count']
                ]
            ];
        } else {
            // Recupera tutte le route del giorno
            $date = $request['date'] ?? date('Y-m-d');
            $stmt = $pdo->prepare("
                SELECT * FROM t_route_optimization 
                WHERE DATE(creation_date) = ? 
                AND status = 'COMPLETED'
                ORDER BY creation_date DESC
            ");
            $stmt->execute([$date]);
            $routes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $latestRoute = reset($routes); // Prendi la prima route (più recente)
            if (!$latestRoute) {
                return [
                    'success' => true,
                    'data' => [
                        'routes' => [],
                        'activities_count' => 0,
                        'provinces_count' => 0
                    ]
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'routes' => json_decode($latestRoute['optimization_data'], true),
                    'activities_count' => $latestRoute['activities_count'],
                    'provinces_count' => $latestRoute['provinces_count']
                ]
            ];
        }
    } catch (Exception $e) {
        error_log('Error in handleGetRoutes: ' . $e->getMessage());
        throw new Exception('Error retrieving routes: ' . $e->getMessage());
    }
}

function ensureBookingTables($pdo) {
    try {
        // Tabella per le route ottimizzate
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS t_route_optimization (
                id INT AUTO_INCREMENT PRIMARY KEY,
                creation_date DATETIME NOT NULL,
                optimization_data JSON,
                status VARCHAR(20) NOT NULL,
                activities_count INT NOT NULL,
                provinces_count INT NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");

    } catch (PDOException $e) {
        throw new Exception('Error creating booking tables: ' . $e->getMessage());
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
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Ensure tables exist
    ensureBookingTables($pdo);

    $request = json_decode(file_get_contents('php://input'), true);
    if (!$request) {
        throw new Exception('Invalid JSON request');
    }

    switch ($request['action']) {
        case 'getBookingActivities':
            $result = handleGetBookingActivities($pdo, $request);
            break;
        
        case 'optimizeRoutes':
            $result = handleOptimizeRoutes($pdo, $request);
            break;
            
        case 'getRoutes':
            $result = handleGetRoutes($pdo, $request);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $request['action']);
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

if (ob_get_level()) ob_end_flush();
?>