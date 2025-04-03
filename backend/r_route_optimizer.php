<?php
/**
 * r_route_optimizer.php - Backend API per il modulo di ottimizzazione percorsi
 * 
 * Gestisce le richieste AJAX per l'ottimizzazione dei percorsi di visita ai POS
 */

// Assicurarsi che nessun output sia già stato inviato
if (ob_get_level()) ob_end_clean();
ob_start(); // Inizia un nuovo buffer di output

// Configurazione iniziale
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Impostazioni di errore PHP - disabilitare la visualizzazione degli errori
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/route_optimizer_errors.log');

// Imposta headers JSON
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Ottenimento configurazioni dal dominio
$domainParts = explode('.', $_SERVER['HTTP_HOST']);
$thirdLevelDomain = $domainParts[0];
$config = parse_ini_file("../config/{$thirdLevelDomain}/config.ini", true);

if (!$config) {
    error_log("Error loading config file for domain: {$thirdLevelDomain}");
    echo json_encode([
        'success' => false,
        'error' => 'Configuration error'
    ]);
    exit;
}

// API Key per Google Maps
// Nota: in produzione l'API key dovrebbe essere impostata in modo sicuro, ad esempio nelle variabili d'ambiente
$google_api_key = $config['google_maps']['api_key'] ?? 'YOUR_API_KEY';

// Error handlers
function handleError($errno, $errstr, $errfile, $errline) {
    // Pulisci ogni output già generato
    if (ob_get_level()) ob_end_clean();
    
    error_log("PHP Error: $errstr in $errfile on line $errline");
    
    echo json_encode([
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ]);
    exit(1);
}

function handleException($e) {
    // Pulisci ogni output già generato
    if (ob_get_level()) ob_end_clean();
    
    error_log("Uncaught Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
    exit(1);
}

set_error_handler('handleError');
set_exception_handler('handleException');

// Database connection
function getPDO() {
    global $config;
    return new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
}

// Verifica dell'autenticazione
function isLoggedIn() {
    return isset($_SESSION['user']);
}

// Crea una tabella se non esiste
function createTableIfNeeded($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `route_optimizer_plans` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `user_id` int(11) NOT NULL,
              `name` varchar(255) NOT NULL,
              `description` text,
              `plan_data` json NOT NULL,
              `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
              `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `idx_user_id` (`user_id`),
              KEY `idx_name` (`name`),
              CONSTRAINT `fk_route_plans_user` FOREIGN KEY (`user_id`) REFERENCES `t_users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (PDOException $e) {
        error_log("Error creating table: " . $e->getMessage());
        // Non bloccare l'esecuzione se la tabella non può essere creata
    }
}

/**
 * Recupera le località POS dal database con ricerca su tutti i campi
 */
function handleGetPOSLocations($pdo, $searchTerm = '') {
    try {
        // Verifica prima che la tabella esista
        $checkTable = $pdo->query("SHOW TABLES LIKE 'tsis_anagrafica'");
        
        if ($checkTable->rowCount() === 0) {
            // Se la tabella non esiste, prova con la tabella alternativa
            if (!empty($searchTerm)) {
                // Query con ricerca su tutti i campi
                $stmt = $pdo->prepare("
                    SELECT 
                        a.id, 
                        a.nome_account, 
                        a.sf_region, 
                        a.sf_district, 
                        a.sf_territory, 
                        a.rrp_segment, 
                        a.indirizzo_spedizioni, 
                        a.citt_spedizioni, 
                        a.cap_spedizioni
                    FROM Anagrafica a
                    WHERE 
                        a.nome_account LIKE :searchTerm OR
                        a.sf_region LIKE :searchTerm OR
                        a.sf_district LIKE :searchTerm OR
                        a.sf_territory LIKE :searchTerm OR
                        a.rrp_segment LIKE :searchTerm OR
                        a.indirizzo_spedizioni LIKE :searchTerm OR
                        a.citt_spedizioni LIKE :searchTerm OR
                        a.cap_spedizioni LIKE :searchTerm
                    ORDER BY a.nome_account
                    LIMIT 500
                ");
                $stmt->bindValue(':searchTerm', '%' . $searchTerm . '%', PDO::PARAM_STR);
            } else {
                // Query senza ricerca
                $stmt = $pdo->prepare("
                    SELECT 
                        a.id, 
                        a.nome_account, 
                        a.sf_region, 
                        a.sf_district, 
                        a.sf_territory, 
                        a.rrp_segment, 
                        a.indirizzo_spedizioni, 
                        a.citt_spedizioni, 
                        a.cap_spedizioni
                    FROM Anagrafica a
                    ORDER BY a.nome_account
                    LIMIT 500
                ");
            }
        } else {
            // Usa la tabella tsis_anagrafica
            if (!empty($searchTerm)) {
                // Query con ricerca su tutti i campi
                $stmt = $pdo->prepare("
                    SELECT 
                        a.id, 
                        a.nome_account, 
                        a.sf_region, 
                        a.sf_district, 
                        a.sf_territory, 
                        a.rrp_segment, 
                        a.indirizzo_spedizioni, 
                        a.citt_spedizioni, 
                        a.cap_spedizioni,
                        a.tree_data
                    FROM tsis_anagrafica a
                    WHERE 
                        a.nome_account LIKE :searchTerm OR
                        a.sf_region LIKE :searchTerm OR
                        a.sf_district LIKE :searchTerm OR
                        a.sf_territory LIKE :searchTerm OR
                        a.rrp_segment LIKE :searchTerm OR
                        a.indirizzo_spedizioni LIKE :searchTerm OR
                        a.citt_spedizioni LIKE :searchTerm OR
                        a.cap_spedizioni LIKE :searchTerm
                    ORDER BY a.nome_account
                    LIMIT 500
                ");
                $stmt->bindValue(':searchTerm', '%' . $searchTerm . '%', PDO::PARAM_STR);
            } else {
                // Query senza ricerca
                $stmt = $pdo->prepare("
                    SELECT 
                        a.id, 
                        a.nome_account, 
                        a.sf_region, 
                        a.sf_district, 
                        a.sf_territory, 
                        a.rrp_segment, 
                        a.indirizzo_spedizioni, 
                        a.citt_spedizioni, 
                        a.cap_spedizioni,
                        a.tree_data
                    FROM tsis_anagrafica a
                    ORDER BY a.nome_account
                    LIMIT 500
                ");
            }
        }
        
        $stmt->execute();
        $locations = $stmt->fetchAll();
        
        // Log per debug
        error_log("Found " . count($locations) . " locations" . (!empty($searchTerm) ? " for search term: $searchTerm" : ""));
        
        // Estrai le coordinate dalle informazioni JSON salvate (se disponibili)
        foreach ($locations as &$location) {
            if (!empty($location['tree_data'])) {
                $treeData = json_decode($location['tree_data'], true);
                if (is_array($treeData) && isset($treeData['location'])) {
                    $location['lat'] = $treeData['location']['lat'] ?? null;
                    $location['lng'] = $treeData['location']['lng'] ?? null;
                }
            }
            
            // Se non ci sono coordinate, dovremo geocodificarle in seguito
            if (empty($location['lat']) || empty($location['lng'])) {
                $location['needs_geocoding'] = true;
            }
        }
        
        return [
            'success' => true,
            'data' => $locations
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving POS locations: " . $e->getMessage());
        throw new Exception('Error retrieving POS locations: ' . $e->getMessage());
    }
}

/**
 * Geocodifica un indirizzo
 */
function handleGeocodeAddress($address) {
    global $google_api_key;
    
    if (empty($address)) {
        throw new Exception('Address is required');
    }
    
    try {
        $encodedAddress = urlencode($address);
        $url = "https://maps.googleapis.com/maps/api/geocode/json?address={$encodedAddress}&key={$google_api_key}";
        
        $response = file_get_contents($url);
        if ($response === false) {
            throw new Exception('Error contacting Google Maps API');
        }
        
        $data = json_decode($response, true);
        
        if ($data['status'] !== 'OK') {
            throw new Exception('Geocoding error: ' . ($data['error_message'] ?? $data['status']));
        }
        
        if (empty($data['results'][0]['geometry']['location'])) {
            throw new Exception('No results found for the address');
        }
        
        $location = $data['results'][0]['geometry']['location'];
        
        return [
            'success' => true,
            'data' => [
                'lat' => $location['lat'],
                'lng' => $location['lng'],
                'formatted_address' => $data['results'][0]['formatted_address']
            ]
        ];
    } catch (Exception $e) {
        error_log("Geocoding error: " . $e->getMessage());
        throw new Exception('Error geocoding address: ' . $e->getMessage());
    }
}

function handleGetGoogleMapsApiKey() {
    global $google_api_key;
    
    // Verifica che l'utente sia autenticato
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not authenticated');
    }
    
    return [
        'success' => true,
        'data' => [
            'apiKey' => $google_api_key
        ]
    ];
}

function handleGetRouteBetweenPoints($data) {
    global $google_api_key;
    
    if (!isset($data['origin']) || !isset($data['destination'])) {
        throw new Exception('Origin and destination are required');
    }
    
    $origin = $data['origin'];
    $destination = $data['destination'];
    
    // Verifica che origin e destination contengano coordinate valide
    if (!isset($origin['lat']) || !isset($origin['lng']) || 
        !isset($destination['lat']) || !isset($destination['lng'])) {
        throw new Exception('Invalid coordinates');
    }
    
    // URL dell'API Routes di Google
    $url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    
    // Costruisci il payload
    $payload = [
        'origin' => [
            'location' => [
                'latLng' => [
                    'latitude' => (float)$origin['lat'],
                    'longitude' => (float)$origin['lng']
                ]
            ]
        ],
        'destination' => [
            'location' => [
                'latLng' => [
                    'latitude' => (float)$destination['lat'],
                    'longitude' => (float)$destination['lng']
                ]
            ]
        ],
        'travelMode' => 'DRIVE',
        'routingPreference' => 'TRAFFIC_AWARE',
        'computeAlternativeRoutes' => false,
        'polylineQuality' => 'HIGH_QUALITY',
        'polylineEncoding' => 'ENCODED_POLYLINE',
        'languageCode' => 'it'
    ];
    
    // Configura la richiesta POST
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $google_api_key,
        'X-Goog-FieldMask: routes.polyline'
    ]);
    
    // Esegui la richiesta
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    curl_close($ch);
    
    // Log per debug
    error_log("Routes API response: HTTP code $httpCode");
    if ($curlError) {
        error_log("cURL error: $curlError");
    }
    
    // Gestisci errori
    if ($httpCode !== 200 || !$response) {
        error_log("Routes API error response: " . ($response ? substr($response, 0, 500) : 'No response'));
        
        // Usa coordinate dirette come fallback
        return [
            'success' => true,
            'data' => [
                'path' => [
                    ['lat' => $origin['lat'], 'lng' => $origin['lng']],
                    ['lat' => $destination['lat'], 'lng' => $destination['lng']]
                ]
            ]
        ];
    }
    
    // Analizza la risposta JSON
    $data = json_decode($response, true);
    
    if (isset($data['routes']) && !empty($data['routes'])) {
        $route = $data['routes'][0];
        
        // Estrai polyline encodata
        $encodedPolyline = $route['polyline']['encodedPolyline'] ?? null;
        
        if ($encodedPolyline) {
            return [
                'success' => true,
                'data' => [
                    'encodedPolyline' => $encodedPolyline
                ]
            ];
        }
    }
    
    // Se non riesce a ottenere un percorso, restituisci un percorso diretto
    return [
        'success' => true,
        'data' => [
            'path' => [
                ['lat' => $origin['lat'], 'lng' => $origin['lng']],
                ['lat' => $destination['lat'], 'lng' => $destination['lng']]
            ]
        ]
    ];
}


/**
 * Calcola i tempi di percorrenza tra tutte le località
 */
function calculateTravelTimes($locations, $settings) {
    global $google_api_key;
    
    // Impostazioni di default
    $travelMode = $settings['travelMode'] ?? 'driving';
    $avoidTolls = $settings['avoidTolls'] ?? false;
    $avoidHighways = $settings['avoidHighways'] ?? false;
    
    // Filtra le posizioni con coordinate valide
    $validLocations = [];
    foreach ($locations as $location) {
        if (!empty($location['lat']) && !empty($location['lng'])) {
            $validLocations[] = $location;
        }
    }
    if (empty($validLocations)) {
        throw new Exception('No valid locations with coordinates');
    }
    
    // Inizializza la matrice dei risultati
    $count = count($validLocations);
    $travelTimes = [];
    for ($i = 0; $i < $count; $i++) {
        $travelTimes[$i] = [];
        for ($j = 0; $j < $count; $j++) {
            if ($i === $j) {
                // Stessa posizione, tempo e distanza zero
                $travelTimes[$i][$j] = [
                    'duration' => 0,
                    'distance' => 0
                ];
            } else {
                $travelTimes[$i][$j] = null;
            }
        }
    }
    
    // Codifica la modalità di trasporto
    $travelModeMap = [
        'driving' => 'DRIVE',
        'walking' => 'WALK',
        'bicycling' => 'BICYCLE',
        'transit' => 'TRANSIT'
    ];
    $googleTravelMode = $travelModeMap[$travelMode] ?? 'DRIVE';
    
    error_log("Using Google API key: " . substr($google_api_key, 0, 5) . "...");
    error_log("Processing " . count($validLocations) . " valid locations");
    
    // Calcola i tempi di percorrenza per ogni coppia di punti
    for ($i = 0; $i < $count; $i++) {
        for ($j = 0; $j < $count; $j++) {
            // Salta le coppie origin-destination identiche (già impostate a 0)
            if ($i === $j) continue;
            
            // URL corretto dell'API con parametri nella query string
            $url = "https://routes.googleapis.com/directions/v2:computeRoutes";
            
            // Costruisci il payload
            $payload = [
                'origin' => [
                    'location' => [
                        'latLng' => [
                            'latitude' => (float)$validLocations[$i]['lat'],
                            'longitude' => (float)$validLocations[$i]['lng']
                        ]
                    ]
                ],
                'destination' => [
                    'location' => [
                        'latLng' => [
                            'latitude' => (float)$validLocations[$j]['lat'],
                            'longitude' => (float)$validLocations[$j]['lng']
                        ]
                    ]
                ],
                'travelMode' => $googleTravelMode,
                'routingPreference' => ($settings['considerTraffic'] ?? false) ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
                'computeAlternativeRoutes' => false,
                'languageCode' => 'it'
            ];
            
            // Aggiungi le opzioni per evitare pedaggi o autostrade
            if ($avoidTolls || $avoidHighways) {
                $payload['routeModifiers'] = [];
                if ($avoidTolls) {
                    $payload['routeModifiers']['avoidTolls'] = true;
                }
                if ($avoidHighways) {
                    $payload['routeModifiers']['avoidHighways'] = true;
                }
            }
            
            $jsonPayload = json_encode($payload);
            error_log("Request payload for $i->$j: " . substr($jsonPayload, 0, 100) . "...");
            
            // Usa cURL per la richiesta HTTP
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'X-Goog-Api-Key: ' . $google_api_key,
                'X-Goog-FieldMask: routes.duration,routes.distanceMeters'
            ]);
            
            // Esegui la richiesta
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            // Log per debug
            error_log("API response for $i->$j: HTTP code $httpCode");
            if ($curlError) {
                error_log("cURL error: $curlError");
            }
            
            // Gestisci errori e risposte
            if ($httpCode !== 200 || !$response) {
                error_log("Error response: " . ($response ? substr($response, 0, 200) : 'No response'));
                
                // Usa algoritmo di fallback in caso di errore
                $travelTimes[$i][$j] = calculateFallbackTravelTime(
                    $validLocations[$i]['lat'], $validLocations[$i]['lng'],
                    $validLocations[$j]['lat'], $validLocations[$j]['lng']
                );
                continue;
            }
            
            // Analizza la risposta JSON
            $data = json_decode($response, true);
            if (isset($data['routes']) && !empty($data['routes'])) {
                $route = $data['routes'][0];
                
                // Estrai durata e distanza
                $duration = 0;
                if (isset($route['duration'])) {
                    // La durata è in formato "10s" (secondi) - estrai il valore numerico
                    $duration = intval(preg_replace('/[^0-9]/', '', $route['duration']));
                }
                
                $distance = $route['distanceMeters'] ?? 0;
                
                $travelTimes[$i][$j] = [
                    'duration' => $duration, // Durata in secondi
                    'distance' => $distance  // Distanza in metri
                ];
            } else {
                // Usa algoritmo di fallback se non ci sono rotte nella risposta
                $travelTimes[$i][$j] = calculateFallbackTravelTime(
                    $validLocations[$i]['lat'], $validLocations[$i]['lng'],
                    $validLocations[$j]['lat'], $validLocations[$j]['lng']
                );
            }
        }
    }
    
    return $travelTimes;
}

// Funzione di fallback per calcolare tempi e distanze quando l'API fallisce
function calculateFallbackTravelTime($lat1, $lng1, $lat2, $lng2) {
    // Calcolo distanza con formula di Haversine
    $earthRadius = 6371000; // raggio terrestre in metri
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    
    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng/2) * sin($dLng/2);
         
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    $distance = $earthRadius * $c;
    
    // Stima della durata: velocità media 50 km/h (circa 14 m/s)
    $estimatedDuration = $distance / 14;
    
    error_log("Using fallback calculation for distance: " . round($distance/1000, 2) . " km");
    
    return [
        'duration' => $estimatedDuration, // Durata in secondi
        'distance' => $distance,          // Distanza in metri
        'estimated' => true               // Flag per indicare che è una stima
    ];
}

/**
 * Ottimizza il percorso basandosi sulle impostazioni
 * 
 * @param array $locations Posizioni da visitare
 * @param array $travelTimes Matrice dei tempi di viaggio
 * @param array $settings Impostazioni di pianificazione
 * @param bool $returnToStart Se tornare al punto di partenza
 * @return array Percorso ottimizzato
 */
function optimizeRoute($locations, $travelTimes, $settings, $returnToStart = false) {
    // Estrai i parametri di configurazione
    $workStartTime = strtotime("today " . ($settings['workStartTime'] ?? '08:00'));
    $workEndTime = strtotime("today " . ($settings['workEndTime'] ?? '18:00'));
    $lunchBreakStart = strtotime("today " . ($settings['lunchBreakStart'] ?? '13:00'));
    $lunchBreakDuration = ($settings['lunchBreakDuration'] ?? 60) * 60; // Converti in secondi
    $maxDays = $settings['maxDays'] ?? 7;
    $useHubForDailyStart = $settings['useHubForDailyStart'] ?? false;
    $optimizationMethod = $settings['optimizationMethod'] ?? 'global';
    
    // Identifica il punto di partenza (HUB)
    $startIndex = null;
    foreach ($locations as $index => $location) {
        if (isset($location['is_start_point']) && $location['is_start_point']) {
            $startIndex = $index;
            break;
        }
    }
    
    // Se non è stato trovato un punto di partenza esplicito, usa il primo punto
    if ($startIndex === null && !empty($locations)) {
        $startIndex = 0;
        // Marca il primo punto come punto di partenza
        $locations[0]['is_start_point'] = true;
    }
    
    // Prepara il risultato
    $result = [
        'days' => [],
        'stats' => [
            'totalDistance' => 0,
            'totalTravelDuration' => 0,
            'totalVisitDuration' => 0,
            'totalLocations' => count($locations),
            'totalDays' => 0,
            'highPriorityCount' => 0,
            'normalPriorityCount' => 0,
            'lowPriorityCount' => 0
        ]
    ];
    
    // Conteggio delle priorità
    foreach ($locations as $location) {
        $priority = $location['priority'] ?? 'normal';
        if ($priority === 'high') {
            $result['stats']['highPriorityCount']++;
        } elseif ($priority === 'normal') {
            $result['stats']['normalPriorityCount']++;
        } elseif ($priority === 'low') {
            $result['stats']['lowPriorityCount']++;
        }
    }
    
    // Determina il metodo di ottimizzazione
    if ($optimizationMethod === 'global') {
        // Esegui ottimizzazione globale (considera tutti i punti insieme prima di dividerli in giorni)
        return optimizeRouteGlobally($locations, $travelTimes, $settings, $returnToStart, $startIndex, $result);
    } else {
        // Esegui ottimizzazione giornaliera (ottimizza ogni giorno separatamente)
        return optimizeRouteDaily($locations, $travelTimes, $settings, $returnToStart, $startIndex, $result);
    }
}

/**
 * Ottimizzazione globale - Considera tutti i punti insieme prima di dividerli in giorni
 */
function optimizeRouteGlobally($locations, $travelTimes, $settings, $returnToStart, $startIndex, $result) {
    $workStartTime = strtotime("today " . ($settings['workStartTime'] ?? '08:00'));
    $workEndTime = strtotime("today " . ($settings['workEndTime'] ?? '18:00'));
    $lunchBreakStart = strtotime("today " . ($settings['lunchBreakStart'] ?? '13:00'));
    $lunchBreakDuration = ($settings['lunchBreakDuration'] ?? 60) * 60; // Converti in secondi
    $maxDays = $settings['maxDays'] ?? 7;
    $useHubForDailyStart = $settings['useHubForDailyStart'] ?? false;
    
    error_log("Performing global optimization with hub: " . ($useHubForDailyStart ? "enabled" : "disabled"));
    
    // Fase 1: Clusterizzazione geografica dei punti
    // Prima identifichiamo i punti ad alta priorità
    $highPriorityLocations = [];
    foreach ($locations as $index => $location) {
        if (($location['priority'] ?? 'normal') === 'high') {
            $highPriorityLocations[$index] = $location;
        }
    }
    
    // Implementiamo un algoritmo greedy per costruire un percorso ottimale globale
    // Partendo dal punto di partenza
    $orderedPoints = [];
    $unvisitedLocations = array_keys($locations);
    
    // Escludiamo il punto di partenza dalla lista dei punti da visitare
    if ($startIndex !== null) {
        $unvisitedLocations = array_values(array_filter($unvisitedLocations, function($idx) use ($startIndex) {
            return $idx !== $startIndex;
        }));
        $orderedPoints[] = $startIndex;
    }
    
    // Se ci sono punti ad alta priorità
    // Se ci sono punti ad alta priorità, li visitiamo prima
    // (potrebbero essere inseriti in ordine sub-ottimale, ma dovrebbero essere visitati prima)
    $highPriorityIndices = array_keys($highPriorityLocations);
    
    while (!empty($highPriorityIndices)) {
        $currentLocationIndex = end($orderedPoints);
        $bestLocationIndex = null;
        $bestScore = PHP_INT_MAX;
        
        foreach ($highPriorityIndices as $i => $locationIndex) {
            // Calcola il tempo di viaggio
            $travelDuration = $travelTimes[$currentLocationIndex][$locationIndex]['duration'] ?? 0;
            
            if ($travelDuration < $bestScore) {
                $bestScore = $travelDuration;
                $bestLocationIndex = $locationIndex;
                $bestIndexInArray = $i;
            }
        }
        
        if ($bestLocationIndex !== null) {
            $orderedPoints[] = $bestLocationIndex;
            // Rimuovi dalla lista dei punti ad alta priorità
            array_splice($highPriorityIndices, $bestIndexInArray, 1);
            // Rimuovi dalla lista dei punti da visitare
            $key = array_search($bestLocationIndex, $unvisitedLocations);
            if ($key !== false) {
                array_splice($unvisitedLocations, $key, 1);
            }
        } else {
            // Caso improbabile ma per sicurezza
            break;
        }
    }
    
    // Ora aggiungiamo il resto dei punti in modo ottimale
    while (!empty($unvisitedLocations)) {
        $currentLocationIndex = end($orderedPoints);
        $bestLocationIndex = null;
        $bestScore = PHP_INT_MAX;
        
        foreach ($unvisitedLocations as $i => $locationIndex) {
            // Calcola il tempo di viaggio
            $travelDuration = $travelTimes[$currentLocationIndex][$locationIndex]['duration'] ?? 0;
            
            // Considera anche la priorità (normale o bassa a questo punto)
            $priority = $locations[$locationIndex]['priority'] ?? 'normal';
            $priorityMultiplier = $priority === 'low' ? 1.5 : 1.0;
            
            $score = $travelDuration * $priorityMultiplier;
            
            if ($score < $bestScore) {
                $bestScore = $score;
                $bestLocationIndex = $locationIndex;
                $bestIndexInArray = $i;
            }
        }
        
        if ($bestLocationIndex !== null) {
            $orderedPoints[] = $bestLocationIndex;
            // Rimuovi dalla lista dei punti da visitare
            array_splice($unvisitedLocations, $bestIndexInArray, 1);
        } else {
            // Caso improbabile ma per sicurezza
            break;
        }
    }
    
    // Fase 2: Suddivisione in giorni
    $days = [];
    $currentDay = 0;
    $currentDate = time(); // Data corrente
    $currentTime = $workStartTime;
    $daySchedule = [];
    
    // Utilizziamo l'indice del punto HUB per iniziare ogni giorno
    $hubLocationIndex = $startIndex;
    
    foreach ($orderedPoints as $index => $locationIndex) {
        // Se è il primo punto e stiamo iniziando un nuovo giorno con il punto HUB 
        if ($index === 0 || ($useHubForDailyStart && $currentTime >= $workEndTime)) {
            // Se dobbiamo iniziare un nuovo giorno
            if ($currentTime >= $workEndTime) {
                // Salva il giorno corrente e passa al successivo
                $days[] = [
                    'date' => date('Y-m-d', $currentDate),
                    'visits' => $daySchedule
                ];
                
                // Reset per il nuovo giorno
                $currentDay++;
                $currentDate = strtotime("+1 day", $currentDate);
                $currentTime = $workStartTime;
                $daySchedule = [];
                
                // Se dobbiamo usare l'HUB, impostiamo la posizione corrente come l'HUB
                if ($useHubForDailyStart && $hubLocationIndex !== null) {
                    $currentLocationIndex = $hubLocationIndex;
                    
                    // Aggiungi il punto HUB come prima visita del giorno
                    $hubLocation = $locations[$hubLocationIndex];
                    $hubVisitDuration = 0;
                    
                    // Se il punto di partenza è un POS (non un indirizzo personalizzato), considera la sua durata di visita
                    if (!isset($hubLocation['is_custom_start']) || !$hubLocation['is_custom_start']) {
                        $hubVisitDuration = ($hubLocation['duration'] ?? 30) * 60; // Durata visita in secondi
                        $result['stats']['totalVisitDuration'] += $hubLocation['duration'] ?? 30; // Aggiungi alla statistica
                    }
                    
                    $departureTime = $workStartTime + $hubVisitDuration;
                    
                    // Crea un oggetto startLocation modificato con il tag della durata esplicita
                    $hubLocationWithDuration = $hubLocation;
                    if ($hubVisitDuration > 0) {
                        $hubLocationWithDuration['visit_duration'] = $hubVisitDuration / 60; // Converti in minuti per la visualizzazione
                    }
                    
                    $daySchedule[] = [
                        'location' => $hubLocationWithDuration,
                        'arrivalTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay-1]['date']) + ($workStartTime - strtotime("today"))),
                        'departureTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay-1]['date']) + ($departureTime - strtotime("today"))),
                        'travelInfo' => [
                            'duration' => 0,
                            'distance' => 0,
                            'fromPrevious' => false
                        ]
                    ];
                    
                    $currentTime = $departureTime; // Aggiorna l'orario corrente includendo la visita al punto di partenza
                    continue; // Salta questo punto perché è l'HUB che abbiamo già aggiunto
                }
            }
        }
        
        // Se questo punto è l'HUB e useHubForDailyStart è attivo, saltiamo perché verrà aggiunto all'inizio del giorno successivo
        if ($useHubForDailyStart && $locationIndex === $hubLocationIndex && $index > 0) {
            continue;
        }
        
        $location = $locations[$locationIndex];
        
        // Calcola il tempo di viaggio dalla posizione precedente
        $travelDuration = 0;
        $travelDistance = 0;
        $prevLocationIndex = isset($daySchedule[count($daySchedule) - 1]) 
            ? array_search($daySchedule[count($daySchedule) - 1]['location'], $locations)
            : null;
        
        if ($prevLocationIndex !== null) {
            $travelInfo = $travelTimes[$prevLocationIndex][$locationIndex] ?? null;
            if ($travelInfo) {
                $travelDuration = $travelInfo['duration'];
                $travelDistance = $travelInfo['distance'];
            }
        }
        
        // Calcola l'orario di arrivo e quando si dovrebbe partire
        $arrivalTime = $currentTime + $travelDuration;
        $visitDuration = ($location['duration'] ?? 30) * 60; // Durata in secondi
        
        // Gestione pausa pranzo
        if ($currentTime < $lunchBreakStart && $arrivalTime > $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
            // Gestione del viaggio che passa per la pausa pranzo
            $travelBeforeLunch = $lunchBreakStart - $currentTime;
            $travelAfterLunch = $travelDuration - $travelBeforeLunch;
            
            // Aggiungi la pausa pranzo al piano
            $lunchBreakLocation = [
                'id' => 'lunch_break_' . date('Ymd', $currentDate),
                'name' => 'Pausa Pranzo',
                'is_lunch_break' => true,
                'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
            ];
            
            $daySchedule[] = [
                'location' => $lunchBreakLocation,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($lunchBreakStart - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false,
                    'isLunchBreak' => true
                ]
            ];
            
            // Aggiorna l'orario di arrivo considerando la pausa pranzo
            $arrivalTime = $lunchBreakStart + $lunchBreakDuration + $travelAfterLunch;
        } else if ($arrivalTime >= $lunchBreakStart && $arrivalTime < ($lunchBreakStart + $lunchBreakDuration) && $lunchBreakStart <= $workEndTime) {
            // Se arriviamo durante la pausa pranzo, spostiamo l'arrivo dopo la pausa
            // Aggiungi la pausa pranzo al piano
            $lunchBreakLocation = [
                'id' => 'lunch_break_' . date('Ymd', $currentDate),
                'name' => 'Pausa Pranzo',
                'is_lunch_break' => true,
                'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
            ];
            
            $daySchedule[] = [
                'location' => $lunchBreakLocation,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($lunchBreakStart - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false,
                    'isLunchBreak' => true
                ]
            ];
            
            // Spostiamo l'arrivo dopo la pausa
            $arrivalTime = $lunchBreakStart + $lunchBreakDuration;
        }
        
        $departureTime = $arrivalTime + $visitDuration;
        
        // Se abbiamo superato l'orario di fine, passiamo al giorno successivo
        if ($arrivalTime >= $workEndTime) {
            // Salva il giorno corrente e passa al successivo
            $days[] = [
                'date' => date('Y-m-d', $currentDate),
                'visits' => $daySchedule
            ];
            
            // Reset per il nuovo giorno
            $currentDay++;
            $currentDate = strtotime("+1 day", $currentDate);
            $currentTime = $workStartTime;
            $daySchedule = [];
            
            // Se dobbiamo usare l'HUB, impostiamo la posizione corrente come l'HUB
            if ($useHubForDailyStart && $hubLocationIndex !== null) {
                $currentLocationIndex = $hubLocationIndex;
                
                // Aggiungi il punto HUB come prima visita del giorno
                $hubLocation = $locations[$hubLocationIndex];
                $hubVisitDuration = 0;
                
                // Se il punto di partenza è un POS (non un indirizzo personalizzato), considera la sua durata di visita
                if (!isset($hubLocation['is_custom_start']) || !$hubLocation['is_custom_start']) {
                    $hubVisitDuration = ($hubLocation['duration'] ?? 30) * 60; // Durata visita in secondi
                    $result['stats']['totalVisitDuration'] += $hubLocation['duration'] ?? 30; // Aggiungi alla statistica
                }
                
                $departureTime = $workStartTime + $hubVisitDuration;
                
                // Crea un oggetto startLocation modificato con il tag della durata esplicita
                $hubLocationWithDuration = $hubLocation;
                if ($hubVisitDuration > 0) {
                    $hubLocationWithDuration['visit_duration'] = $hubVisitDuration / 60; // Converti in minuti per la visualizzazione
                }
                
                $daySchedule[] = [
                    'location' => $hubLocationWithDuration,
                    'arrivalTime' => date('Y-m-d H:i:s', strtotime(date('Y-m-d', $currentDate)) + ($workStartTime - strtotime("today"))),
                    'departureTime' => date('Y-m-d H:i:s', strtotime(date('Y-m-d', $currentDate)) + ($departureTime - strtotime("today"))),
                    'travelInfo' => [
                        'duration' => 0,
                        'distance' => 0,
                        'fromPrevious' => false
                    ]
                ];
                
                $currentTime = $departureTime; // Aggiorna l'orario corrente includendo la visita al punto di partenza
            } else {
                // Calcola nuovamente i tempi per il nuovo giorno
                $arrivalTime = $workStartTime + $travelDuration;
                $departureTime = $arrivalTime + $visitDuration;
                
                // Se anche nel nuovo giorno non possiamo completare la visita, passiamo oltre
                if ($arrivalTime >= $workEndTime) {
                    continue;
                }
            }
        }
        
        // Aggiungi la visita al piano del giorno
        $dayVisit = [
            'location' => $location,
            'arrivalTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($arrivalTime - strtotime("today"))),
            'departureTime' => date('Y-m-d H:i:s', strtotime($days[$currentDay]['date'] ?? date('Y-m-d', $currentDate)) + ($departureTime - strtotime("today"))),
            'travelInfo' => [
                'duration' => $travelDuration,
                'distance' => $travelDistance,
                'fromPrevious' => true
            ]
        ];
        
        $daySchedule[] = $dayVisit;
        
        // Aggiorna statistiche
        $result['stats']['totalDistance'] += $travelDistance;
        $result['stats']['totalTravelDuration'] += $travelDuration / 60; // Converti in minuti
        $result['stats']['totalVisitDuration'] += $location['duration'] ?? 30;
        
        // Aggiorna l'orario corrente
        $currentTime = $departureTime;
        $currentLocationIndex = $locationIndex;
    }
    
    // Aggiungi l'ultimo giorno se non è vuoto
    if (!empty($daySchedule)) {
        $days[] = [
            'date' => date('Y-m-d', $currentDate),
            'visits' => $daySchedule
        ];
    }
    
    // Gestione del ritorno al punto di partenza
    if ($returnToStart && $startIndex !== null && !empty($days)) {
        $lastDay = &$days[count($days) - 1];
        $lastDayVisits = &$lastDay['visits'];
        
        if (!empty($lastDayVisits)) {
            $lastVisit = end($lastDayVisits);
            $lastVisitIndex = array_search($lastVisit['location'], $locations);
            
            if ($lastVisitIndex !== false) {
                $departureTime = strtotime($lastVisit['departureTime']);
                
                // Calcola il tempo di ritorno al punto di partenza
                $travelInfo = $travelTimes[$lastVisitIndex][$startIndex] ?? null;
                $travelDuration = 0;
                $travelDistance = 0;
                
                if ($travelInfo) {
                    $travelDuration = $travelInfo['duration'];
                    $travelDistance = $travelInfo['distance'];
                }
                
                $arrivalTime = strtotime($lastVisit['departureTime']) + $travelDuration;
                
                // Se il ritorno supera l'orario di lavoro, aggiungi un nuovo giorno
                if ($arrivalTime > $workEndTime) {
                    $currentDay++;
                    $currentDate = strtotime("+1 day", $currentDate);
                    
                    // Aggiungiamo il nuovo giorno
                    $days[] = [
                        'date' => date('Y-m-d', $currentDate),
                        'visits' => []
                    ];
                    
                    // Reimposta l'orario di arrivo all'inizio della giornata successiva + tempo di viaggio
                    $departureTime = $workStartTime;
                    $arrivalTime = $departureTime + $travelDuration;
                    
                    // Riferimento al nuovo ultimo giorno
                    $lastDay = &$days[count($days) - 1];
                    $lastDayVisits = &$lastDay['visits'];
                }
                
                // Aggiungi la visita di ritorno
                $returnVisit = [
                    'location' => $locations[$startIndex],
                    'arrivalTime' => date('Y-m-d H:i:s', $arrivalTime),
                    'departureTime' => date('Y-m-d H:i:s', $arrivalTime), // Nessuna durata per il punto di ritorno
                    'travelInfo' => [
                        'duration' => $travelDuration,
                        'distance' => $travelDistance,
                        'fromPrevious' => true,
                        'isReturn' => true
                    ]
                ];
                
                $lastDayVisits[] = $returnVisit;
                
                // Aggiorna statistiche
                $result['stats']['totalDistance'] += $travelDistance;
                $result['stats']['totalTravelDuration'] += $travelDuration / 60; // Converti in minuti
            }
        }
    }
    
    // Aggiorna il risultato
    $result['days'] = $days;
    $result['stats']['totalDays'] = count($days);
    
    return $result;
}
/**
 * Ottimizzazione giornaliera - Ottimizza ogni giorno separatamente
 * (implementazione precedente)
 */
function optimizeRouteDaily($locations, $travelTimes, $settings, $returnToStart, $startIndex, $result) {
    // Questa è l'implementazione precedente che ottimizza ogni giorno separatamente
    $workStartTime = strtotime("today " . ($settings['workStartTime'] ?? '08:00'));
    $workEndTime = strtotime("today " . ($settings['workEndTime'] ?? '18:00'));
    $lunchBreakStart = strtotime("today " . ($settings['lunchBreakStart'] ?? '13:00'));
    $lunchBreakDuration = ($settings['lunchBreakDuration'] ?? 60) * 60; // Converti in secondi
    $maxDays = $settings['maxDays'] ?? 7;
    $useHubForDailyStart = $settings['useHubForDailyStart'] ?? false;
    
    error_log("Performing daily optimization with hub: " . ($useHubForDailyStart ? "enabled" : "disabled"));
    
    // Prepara i giorni di pianificazione
    $currentDay = 0;
    $currentDate = time(); // Data corrente
    
    // Aggiungiamo il primo giorno
    $result['days'][$currentDay] = [
        'date' => date('Y-m-d', $currentDate),
        'visits' => []
    ];
    
    // Aggiungi esplicitamente il punto di partenza come prima visita
    if ($startIndex !== null) {
        $startLocation = $locations[$startIndex];
        $startVisitDuration = 0;
        
        // Se il punto di partenza è un POS (non un indirizzo personalizzato), considera la sua durata di visita
        if (!isset($startLocation['is_custom_start']) || !$startLocation['is_custom_start']) {
            $startVisitDuration = ($startLocation['duration'] ?? 30) * 60; // Durata visita in secondi
            $result['stats']['totalVisitDuration'] += $startLocation['duration'] ?? 30; // Aggiungi alla statistica
        }
        
        $departureTime = $workStartTime + $startVisitDuration;
        
        // Crea un oggetto startLocation modificato con il tag della durata esplicita
        $startLocationWithDuration = $startLocation;
        if ($startVisitDuration > 0) {
            $startLocationWithDuration['visit_duration'] = $startVisitDuration / 60; // Converti in minuti per la visualizzazione
        }
        
        $result['days'][0]['visits'][] = [
            'location' => $startLocationWithDuration,
            'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][0]['date']) + ($workStartTime - strtotime("today"))),
            'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][0]['date']) + ($departureTime - strtotime("today"))),
            'travelInfo' => [
                'duration' => 0,
                'distance' => 0,
                'fromPrevious' => false
            ]
        ];
        
        $currentLocationIndex = $startIndex;
        $currentTime = $departureTime; // Aggiorna l'orario corrente includendo la visita al punto di partenza
        
        // Escludiamo il punto di partenza dalla lista dei punti da visitare
        $unvisitedLocations = array_filter(array_keys($locations), function($idx) use ($startIndex) {
            return $idx !== $startIndex;
        });
    } else {
        // Lista di tutti gli indici dei luoghi da visitare
        $unvisitedLocations = array_keys($locations);
        $currentLocationIndex = null;
        $currentTime = $workStartTime; // Orario corrente (iniziamo con workStartTime)
    }
    
    // Ordina le posizioni per priorità
    usort($unvisitedLocations, function($a, $b) use ($locations) {
        $priorityMap = ['high' => 0, 'normal' => 1, 'low' => 2];
        $aPriority = $priorityMap[$locations[$a]['priority'] ?? 'normal'] ?? 1;
        $bPriority = $priorityMap[$locations[$b]['priority'] ?? 'normal'] ?? 1;
        return $aPriority <=> $bPriority;
    });
    
    // Hub location (potrebbe essere diverso dal punto di partenza in futuro)
    $hubLocationIndex = $startIndex;
    
    // Continuiamo finché ci sono location da visitare e non abbiamo superato il limite di giorni
    while (!empty($unvisitedLocations) && $currentDay < $maxDays) {
        // Se siamo all'inizio di un nuovo giorno e dobbiamo usare l'hub
        if ($currentDay > 0 && $useHubForDailyStart && $hubLocationIndex !== null) {
            $hubLocation = $locations[$hubLocationIndex];
            $hubVisitDuration = 0;
            
            // Se il punto di partenza è un POS (non un indirizzo personalizzato), considera la sua durata di visita
            if (!isset($hubLocation['is_custom_start']) || !$hubLocation['is_custom_start']) {
                $hubVisitDuration = ($hubLocation['duration'] ?? 30) * 60; // Durata visita in secondi
                $result['stats']['totalVisitDuration'] += $hubLocation['duration'] ?? 30; // Aggiungi alla statistica
            }
            
            $departureTime = $workStartTime + $hubVisitDuration;
            
            // Crea un oggetto hubLocation modificato con il tag della durata esplicita
            $hubLocationWithDuration = $hubLocation;
            if ($hubVisitDuration > 0) {
                $hubLocationWithDuration['visit_duration'] = $hubVisitDuration / 60; // Converti in minuti per la visualizzazione
            }
            
            $result['days'][$currentDay]['visits'][] = [
                'location' => $hubLocationWithDuration,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($workStartTime - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($departureTime - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false
                ]
            ];
            
            $currentLocationIndex = $hubLocationIndex;
            $currentTime = $departureTime; // Aggiorna l'orario corrente
        }
        
        // Se abbiamo superato l'orario di fine lavoro, passiamo al giorno successivo
        if ($currentTime >= $workEndTime) {
            error_log("End of workday reached: " . date('H:i:s', $currentTime) . ". Moving to next day.");
            $currentDay++;
            $currentDate = strtotime("+1 day", $currentDate);
            $currentTime = $workStartTime;
            
            // Aggiungiamo il nuovo giorno
            $result['days'][$currentDay] = [
                'date' => date('Y-m-d', $currentDate),
                'visits' => []
            ];
            
            continue;
        }
        
        // Controlla se siamo alla pausa pranzo o stiamo per superarla
        if ($currentTime <= $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
            // Se manca meno di un'ora alla pausa pranzo, valuta se inserire la pausa o fare una visita
            if (($lunchBreakStart - $currentTime) < 3600) {
                // Verifica se possiamo completare una visita prima della pausa pranzo
                $canFitVisitBeforeLunch = false;
                $bestLocationBeforeLunch = null;
                $bestTravelTimeBeforeLunch = null;
                $bestTravelDistanceBeforeLunch = null;
                
                foreach ($unvisitedLocations as $locationIndex) {
                    $location = $locations[$locationIndex];
                    
                    // Calcola il tempo di viaggio
                    $travelDuration = 0;
                    $travelDistance = 0;
                    
                    if ($currentLocationIndex !== null) {
                        $travelInfo = $travelTimes[$currentLocationIndex][$locationIndex] ?? null;
                        if ($travelInfo) {
                            $travelDuration = $travelInfo['duration'];
                            $travelDistance = $travelInfo['distance'];
                        }
                    }
                    
                    // Calcola l'orario di arrivo e di partenza previsti
                    $arrivalTime = $currentTime + $travelDuration;
                    $visitDuration = ($location['duration'] ?? 30) * 60; // Converti in secondi
                    $departureTime = $arrivalTime + $visitDuration;
                    
                    // Se possiamo completare la visita prima della pausa pranzo
                    if ($departureTime <= $lunchBreakStart) {
                        $canFitVisitBeforeLunch = true;
                        $bestLocationBeforeLunch = $locationIndex;
                        $bestTravelTimeBeforeLunch = $travelDuration;
                        $bestTravelDistanceBeforeLunch = $travelDistance;
                        break; // Prendiamo la prima visita che si adatta
                    }
                }
                
                // Se non possiamo completare alcuna visita prima della pausa pranzo, inseriamo la pausa pranzo nel programma
                if (!$canFitVisitBeforeLunch || $currentTime >= $lunchBreakStart) {
                    // Se il tempo corrente è prima dell'inizio della pausa, ma non c'è abbastanza tempo per una visita,
                    // aggiungiamo un tempo di attesa fino alla pausa
                    if ($currentTime < $lunchBreakStart) {
                        error_log("Waiting until lunch break from " . date('H:i:s', $currentTime) . " to " . date('H:i:s', $lunchBreakStart));
                        $currentTime = $lunchBreakStart;
                    }
                    
                    error_log("Scheduling lunch break at: " . date('H:i:s', $lunchBreakStart));
                    
                    // Aggiungi l'entry per la pausa pranzo
                    $lunchBreakLocation = [
                        'id' => 'lunch_break_' . date('Ymd', $currentDate),
                        'name' => 'Pausa Pranzo',
                        'is_lunch_break' => true,
                        'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                        'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                        'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
                    ];
                    
                    $result['days'][$currentDay]['visits'][] = [
                        'location' => $lunchBreakLocation,
                        'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart - strtotime("today"))),
                        'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                        'travelInfo' => [
                            'duration' => 0,
                            'distance' => 0,
                            'fromPrevious' => false,
                            'isLunchBreak' => true
                        ]
                    ];
                    
                    // Aggiorna l'orario corrente alla fine della pausa pranzo
                    $currentTime = $lunchBreakStart + $lunchBreakDuration;
                    continue;
                }
                
                // Se possiamo completare una visita prima della pausa, procediamo con quella
                if ($canFitVisitBeforeLunch) {
                    $bestLocationIndex = $bestLocationBeforeLunch;
                    $bestTravelTime = $bestTravelTimeBeforeLunch;
                    $bestTravelDistance = $bestTravelDistanceBeforeLunch;
                    
                    // Continua sotto con la visita che abbiamo trovato
                } else {
                    // Non dovremmo mai arrivare qui, ma per sicurezza
                    $currentTime = $lunchBreakStart + $lunchBreakDuration;
                    continue;
                }
            }
        } else if ($currentTime >= $lunchBreakStart && $currentTime < ($lunchBreakStart + $lunchBreakDuration) && $lunchBreakStart <= $workEndTime) {
            // Siamo durante la pausa pranzo
            error_log("Currently in lunch break. Adding lunch break entry.");
            
            // Calcola quanto tempo abbiamo già passato nella pausa pranzo
            $timeInLunch = $currentTime - $lunchBreakStart;
            $remainingLunchTime = $lunchBreakDuration - $timeInLunch;
            
            // Crea un oggetto location per la pausa pranzo con il tempo impostato
            $lunchBreakLocation = [
                'id' => 'lunch_break_' . date('Ymd', $currentDate),
                'name' => 'Pausa Pranzo',
                'is_lunch_break' => true,
                'duration' => $remainingLunchTime / 60, // Durata rimanente in minuti per la visualizzazione
                'start_time' => date('H:i', $currentTime), // Orario corrente (siamo già nella pausa)
                'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
            ];
            
            // Aggiungi la pausa pranzo come entry speciale (solo per il tempo rimanente)
            $lunchBreak = [
                'location' => $lunchBreakLocation,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($currentTime - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false,
                    'isLunchBreak' => true
                ]
            ];
            
            $result['days'][$currentDay]['visits'][] = $lunchBreak;
            
            // Aggiorna l'orario corrente alla fine della pausa pranzo
            $currentTime = $lunchBreakStart + $lunchBreakDuration;
            continue;
        }

        // Trova la prossima posizione migliore da visitare
        $bestLocationIndex = null;
        $bestScore = PHP_INT_MAX;
        $bestTravelTime = null;
        $bestTravelDistance = null;
        
        foreach ($unvisitedLocations as $locationIndex) {
            $location = $locations[$locationIndex];
            
            // Calcola il tempo di viaggio
            $travelDuration = 0;
            $travelDistance = 0;
            
            if ($currentLocationIndex !== null) {
                $travelInfo = $travelTimes[$currentLocationIndex][$locationIndex] ?? null;
                if ($travelInfo) {
                    $travelDuration = $travelInfo['duration'];
                    $travelDistance = $travelInfo['distance'];
                }
            }
            
            // Controlla se il viaggio passa attraverso la pausa pranzo
            $travelCrossesLunchBreak = false;
            $adjustedArrivalTime = $currentTime + $travelDuration;
            
            if ($currentTime < $lunchBreakStart && $adjustedArrivalTime > $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
                $travelCrossesLunchBreak = true;
                
                // Calcola quanto tempo di viaggio è stato completato prima della pausa pranzo
                $travelBeforeLunch = $lunchBreakStart - $currentTime;
                
                // Calcola il tempo di viaggio rimanente dopo la pausa
                $travelAfterLunch = $travelDuration - $travelBeforeLunch;
                
                // Aggiorna l'orario di arrivo considerando la pausa pranzo
                $adjustedArrivalTime = $lunchBreakStart + $lunchBreakDuration + $travelAfterLunch;
            }
            
            // Calcola l'orario di arrivo e di partenza previsti
            $arrivalTime = $adjustedArrivalTime;
            $visitDuration = ($location['duration'] ?? 30) * 60; // Converti in secondi
            $departureTime = $arrivalTime + $visitDuration;
            
            // Se arriviamo durante la pausa pranzo, spostiamo l'arrivo dopo la pausa
            if (!$travelCrossesLunchBreak && $arrivalTime >= $lunchBreakStart && $arrivalTime < ($lunchBreakStart + $lunchBreakDuration) && $lunchBreakStart <= $workEndTime) {
                // Prima aggiungiamo la pausa pranzo nel piano
                $arrivalTime = $lunchBreakStart + $lunchBreakDuration;
                $departureTime = $arrivalTime + $visitDuration;
            }
            
            // Se la visita viene interrotta dalla pausa pranzo, spostiamo la fine visita dopo la pausa
            if (!$travelCrossesLunchBreak && $arrivalTime < $lunchBreakStart && $departureTime > $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
                // La visita non può continuare durante la pausa pranzo, spostiamo parte della visita dopo la pausa
                $timeBeforeLunch = $lunchBreakStart - $arrivalTime; // Tempo disponibile prima della pausa
                if ($timeBeforeLunch >= $visitDuration) {
                    // La visita può essere completata prima della pausa
                    $departureTime = $arrivalTime + $visitDuration;
                } else {
                    // Parte della visita deve avvenire dopo la pausa pranzo
                    $departureTime = $lunchBreakStart + $lunchBreakDuration + ($visitDuration - $timeBeforeLunch);
                }
            }
            
            // Verifica se la visita può essere completata entro l'orario di lavoro
            if ($departureTime > $workEndTime) {
                continue; // Non possiamo completare questa visita oggi
            }
            
            // Calcola lo score per questa location (priorità + tempo di viaggio)
            $priorityMultiplier = ['high' => 0.5, 'normal' => 1, 'low' => 2];
            $locationPriority = $priorityMultiplier[$location['priority'] ?? 'normal'] ?? 1;
            
            $score = $travelDuration * $locationPriority;
            
            // Scegli la posizione con lo score migliore (più basso)
            if ($score < $bestScore) {
                $bestScore = $score;
                $bestLocationIndex = $locationIndex;
                $bestTravelTime = $travelDuration;
                $bestTravelDistance = $travelDistance;
                
                error_log("Found better location with score: $score, priority: {$location['priority']}, travel time: " . ($travelDuration/60) . " minutes");
            }
        }
        
        // Se non abbiamo trovato una posizione valida, passiamo al giorno successivo
        if ($bestLocationIndex === null) {
            error_log("No valid location found for today. Moving to next day.");
            $currentDay++;
            $currentDate = strtotime("+1 day", $currentDate);
            $currentTime = $workStartTime;
            
            // Aggiungiamo il nuovo giorno
            $result['days'][$currentDay] = [
                'date' => date('Y-m-d', $currentDate),
                'visits' => []
            ];
            continue;
        }
        
        // Ottieni dati della posizione migliore
        $bestLocation = $locations[$bestLocationIndex];
        
        // Calcola tempi di arrivo e partenza
        $travelDuration = $bestTravelTime ?? 0;
        
        // Controlla se il viaggio passa attraverso la pausa pranzo
        $travelCrossesLunchBreak = false;
        $arrivalTime = $currentTime + $travelDuration;
        
        if ($currentTime < $lunchBreakStart && $arrivalTime > $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
            $travelCrossesLunchBreak = true;
            error_log("Travel crosses lunch break. Adjusting arrival time.");
            
            // Calcola quanto tempo di viaggio è stato completato prima della pausa pranzo
            $travelBeforeLunch = $lunchBreakStart - $currentTime;
            
            // Calcola il tempo di viaggio rimanente dopo la pausa
            $travelAfterLunch = $travelDuration - $travelBeforeLunch;
            
            // Aggiungi la pausa pranzo
            $lunchBreakLocation = [
                'id' => 'lunch_break_' . date('Ymd', $currentDate),
                'name' => 'Pausa Pranzo',
                'is_lunch_break' => true,
                'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
            ];
            
            $result['days'][$currentDay]['visits'][] = [
                'location' => $lunchBreakLocation,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false,
                    'isLunchBreak' => true
                ]
            ];
            
            // Aggiorna l'orario di arrivo considerando il viaggio residuo dopo la pausa
            $arrivalTime = $lunchBreakStart + $lunchBreakDuration + $travelAfterLunch;
        } else if ($arrivalTime >= $lunchBreakStart && $arrivalTime < ($lunchBreakStart + $lunchBreakDuration) && $lunchBreakStart <= $workEndTime) {
            // Se arriviamo durante la pausa pranzo, inseriamo la pausa e spostiamo l'arrivo
            error_log("Arrival during lunch break. Adding lunch break and adjusting arrival time.");
            
            $lunchBreakLocation = [
                'id' => 'lunch_break_' . date('Ymd', $currentDate),
                'name' => 'Pausa Pranzo',
                'is_lunch_break' => true,
                'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
            ];
            
            $result['days'][$currentDay]['visits'][] = [
                'location' => $lunchBreakLocation,
                'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart - strtotime("today"))),
                'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                'travelInfo' => [
                    'duration' => 0,
                    'distance' => 0,
                    'fromPrevious' => false,
                    'isLunchBreak' => true
                ]
            ];
            
            // Spostiamo l'arrivo dopo la pausa
            $arrivalTime = $lunchBreakStart + $lunchBreakDuration;
        }
        
        $visitDuration = ($bestLocation['duration'] ?? 30) * 60; // Converti in secondi
        $departureTime = $arrivalTime + $visitDuration;
        
        // Gestisci il caso in cui la visita viene interrotta dalla pausa pranzo
        if ($arrivalTime < $lunchBreakStart && $departureTime > $lunchBreakStart && $lunchBreakStart <= $workEndTime) {
            // Calcoliamo quanto della visita possiamo fare prima della pausa
            $timeBeforeLunch = $lunchBreakStart - $arrivalTime;
            
            // Se la visita può essere completata prima della pausa, ok
            if ($timeBeforeLunch >= $visitDuration) {
                $departureTime = $arrivalTime + $visitDuration;
            } else {
                // Crea un oggetto location per la pausa pranzo con il tempo impostato
                $lunchBreakLocation = [
                    'id' => 'lunch_break_' . date('Ymd', $currentDate),
                    'name' => 'Pausa Pranzo',
                    'is_lunch_break' => true,
                    'duration' => $lunchBreakDuration / 60, // Durata in minuti per la visualizzazione
                    'start_time' => date('H:i', $lunchBreakStart), // Orario inizio pausa
                    'end_time' => date('H:i', $lunchBreakStart + $lunchBreakDuration) // Orario fine pausa
                ];
                
                // Aggiungi la pausa pranzo come entry speciale
                $lunchBreak = [
                    'location' => $lunchBreakLocation,
                    'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart - strtotime("today"))),
                    'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($lunchBreakStart + $lunchBreakDuration - strtotime("today"))),
                    'travelInfo' => [
                        'duration' => 0,
                        'distance' => 0,
                        'fromPrevious' => false,
                        'isLunchBreak' => true
                    ]
                ];
                
                // Dobbiamo spezzare la visita in due parti o spostarla interamente dopo la pausa
                if ($timeBeforeLunch < 15 * 60) { // Se abbiamo meno di 15 minuti prima della pausa, spostiamo l'intera visita
                    // Aggiungi prima la pausa
                    $result['days'][$currentDay]['visits'][] = $lunchBreak;
                    
                    // Poi la visita dopo la pausa
                    $arrivalTime = $lunchBreakStart + $lunchBreakDuration;
                    $departureTime = $arrivalTime + $visitDuration;
                } else {
                    // Completiamo solo parte della visita prima della pausa
                    $departureBeforeLunch = $lunchBreakStart;
                    
                    // Crea una copia della location per la prima parte della visita
                    $locationBeforeLunch = $bestLocation;
                    $locationBeforeLunch['partial_duration'] = $timeBeforeLunch / 60; // In minuti
                    
                    // Aggiungiamo la prima parte della visita
                    $visitBeforeLunch = [
                        'location' => $locationBeforeLunch,
                        'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($arrivalTime - strtotime("today"))),
                        'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($departureBeforeLunch - strtotime("today"))),
                        'travelInfo' => [
                            'duration' => $travelDuration,
                            'distance' => $bestTravelDistance ?? 0,
                            'fromPrevious' => true
                        ],
                        'visitPart' => 'before_lunch'
                    ];
                    
                    $result['days'][$currentDay]['visits'][] = $visitBeforeLunch;
                    
                    // Aggiungiamo la pausa pranzo
                    $result['days'][$currentDay]['visits'][] = $lunchBreak;
                    
                    // Ora continuiamo con la parte della visita dopo la pausa
                    $arrivalAfterLunch = $lunchBreakStart + $lunchBreakDuration;
                    $remainingVisitDuration = $visitDuration - $timeBeforeLunch;
                    $departureAfterLunch = $arrivalAfterLunch + $remainingVisitDuration;
                    
                    // Crea una copia della location per la seconda parte della visita
                    $locationAfterLunch = $bestLocation;
                    $locationAfterLunch['partial_duration'] = $remainingVisitDuration / 60; // In minuti
                    
                    // Aggiungiamo la seconda parte della visita
                    $visitAfterLunch = [
                        'location' => $locationAfterLunch,
                        'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($arrivalAfterLunch - strtotime("today"))),
                        'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($departureAfterLunch - strtotime("today"))),
                        'travelInfo' => [
                            'duration' => 0, // Nessun viaggio tra le due parti
                            'distance' => 0,
                            'fromPrevious' => false
                        ],
                        'visitPart' => 'after_lunch'
                    ];
                    
                    $result['days'][$currentDay]['visits'][] = $visitAfterLunch;
                    
                    // Aggiorna statistiche
                    $result['stats']['totalDistance'] += $bestTravelDistance ?? 0;
                    $result['stats']['totalTravelDuration'] += $travelDuration / 60; // Converti in minuti
                    $result['stats']['totalVisitDuration'] += $bestLocation['duration'] ?? 30;
                    
                    // Aggiorna stato corrente
                    $currentTime = $departureAfterLunch;
                    $currentLocationIndex = $bestLocationIndex;
                    
                    // Rimuovi la posizione dall'elenco di quelle da visitare
                    $unvisitedLocations = array_values(array_filter($unvisitedLocations, function($index) use ($bestLocationIndex) {
                        return $index !== $bestLocationIndex;
                    }));
                    
                    // Andiamo avanti con il prossimo punto
                    continue;
                }
            }
        }
        
        // Aggiungi la visita al giorno corrente con informazioni sul viaggio
        $visit = [
            'location' => $bestLocation,
            'arrivalTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($arrivalTime - strtotime("today"))),
            'departureTime' => date('Y-m-d H:i:s', strtotime($result['days'][$currentDay]['date']) + ($departureTime - strtotime("today"))),
            'travelInfo' => [
                'duration' => $travelDuration,
                'distance' => $bestTravelDistance ?? 0,
                'fromPrevious' => true
            ]
        ];
        
        $result['days'][$currentDay]['visits'][] = $visit;
        
        // Log della visita programmata
        error_log("Scheduled visit to {$bestLocation['name']} at " . date('H:i:s', $arrivalTime) . 
                  " until " . date('H:i:s', $departureTime) . 
                  " (duration: " . ($bestLocation['duration'] ?? 30) . " min)");
        
        // Aggiorna statistiche
        $result['stats']['totalDistance'] += $bestTravelDistance ?? 0;
        $result['stats']['totalTravelDuration'] += $travelDuration / 60; // Converti in minuti
        $result['stats']['totalVisitDuration'] += $bestLocation['duration'] ?? 30;
        
        // Aggiorna stato corrente
        $currentTime = $departureTime;
        $currentLocationIndex = $bestLocationIndex;
        
        // Rimuovi la posizione dall'elenco di quelle da visitare
        $unvisitedLocations = array_values(array_filter($unvisitedLocations, function($index) use ($bestLocationIndex) {
            return $index !== $bestLocationIndex;
        }));
    }
    
    // Gestione del ritorno al punto di partenza
    if ($returnToStart && $startIndex !== null && count($result['days']) > 0) {
        $lastDay = count($result['days']) - 1;
        $lastDayVisits = $result['days'][$lastDay]['visits'];
        
        if (count($lastDayVisits) > 0) {
            $lastVisit = end($lastDayVisits);
            
            // Ignora le pause pranzo alla fine del giorno
            while (isset($lastVisit['location']['is_lunch_break']) && $lastVisit['location']['is_lunch_break']) {
                array_pop($result['days'][$lastDay]['visits']);
                if (empty($result['days'][$lastDay]['visits'])) {
                    break;
                }
                $lastVisit = end($result['days'][$lastDay]['visits']);
            }
            
            if (!empty($result['days'][$lastDay]['visits'])) {
                $lastVisit = end($result['days'][$lastDay]['visits']);
                
                // Trova l'indice della location dell'ultima visita
                $lastVisitIndex = -1;
                foreach ($locations as $idx => $loc) {
                    if (isset($loc['id']) && isset($lastVisit['location']['id']) && $loc['id'] == $lastVisit['location']['id']) {
                        $lastVisitIndex = $idx;
                        break;
                    }
                }
                
                if ($lastVisitIndex !== -1) {
                    $departureTime = strtotime($lastVisit['departureTime']);
                    
                    // Calcola il tempo di ritorno al punto di partenza
                    $travelInfo = $travelTimes[$lastVisitIndex][$startIndex] ?? null;
                    $travelDuration = 0;
                    $travelDistance = 0;
                    
                    if ($travelInfo) {
                        $travelDuration = $travelInfo['duration'];
                        $travelDistance = $travelInfo['distance'];
                    }
                    
                    $arrivalTime = strtotime($lastVisit['departureTime']) + $travelDuration;
                    
                    // Controlla se il viaggio di ritorno passa per la pausa pranzo
                    if ($departureTime < $lunchBreakStart && $arrivalTime > $lunchBreakStart) {
                        // Aggiungi la pausa pranzo al tempo di viaggio
                        $arrivalTime += $lunchBreakDuration;
                    }
                    
                    // Se il ritorno supera l'orario di lavoro, aggiungi un nuovo giorno
                    if ($arrivalTime > $workEndTime) {
                        error_log("Return trip would exceed work hours. Moving to next day.");
                        $currentDay++;
                        $currentDate = strtotime("+1 day", $currentDate);
                        
                        // Aggiungiamo il nuovo giorno
                        $result['days'][$currentDay] = [
                            'date' => date('Y-m-d', $currentDate),
                            'visits' => []
                        ];
                        
                        // Reimposta l'orario di arrivo all'inizio della giornata successiva + tempo di viaggio
                        $departureTime = $workStartTime;
                        $arrivalTime = $departureTime + $travelDuration;
                    }
                    
                    // Aggiungi la visita di ritorno
                    $returnVisit = [
                        'location' => $locations[$startIndex],
                        'arrivalTime' => date('Y-m-d H:i:s', $arrivalTime),
                        'departureTime' => date('Y-m-d H:i:s', $arrivalTime), // Nessuna durata per il punto di ritorno
                        'travelInfo' => [
                            'duration' => $travelDuration,
                            'distance' => $travelDistance,
                            'fromPrevious' => true,
                            'isReturn' => true
                        ]
                    ];
                    
                    $result['days'][count($result['days']) - 1]['visits'][] = $returnVisit;
                    
                    // Log del viaggio di ritorno
                    error_log("Scheduled return trip to starting point, arriving at " . date('H:i:s', $arrivalTime));
                    
                    // Aggiorna statistiche
                    $result['stats']['totalDistance'] += $travelDistance;
                    $result['stats']['totalTravelDuration'] += $travelDuration / 60; // Converti in minuti
                }
            }
        }
    }
    
    // Aggiorna il numero totale di giorni
    $result['stats']['totalDays'] = count($result['days']);
    
    error_log("Optimization completed. Total days: {$result['stats']['totalDays']}, total visits: {$result['stats']['totalLocations']}");
    
    return $result;
}
/**
 * Modifica alla funzione handleOptimizeRoute per supportare le nuove opzioni
 */
function handleOptimizeRoute($data) {
    if (!isset($data['locations']) || !is_array($data['locations'])) {
        throw new Exception('Invalid locations data');
    }
    
    $locations = $data['locations'];
    $settings = $data['settings'] ?? [];
    
    // Verifica che ci siano abbastanza posizioni
    if (count($locations) < 1) {
        throw new Exception('At least one location is required for route optimization');
    }
    
    // Log per debug
    error_log("Starting route optimization with " . count($locations) . " locations");
    error_log("Settings: " . json_encode($settings));
    
    // Gestione del punto di partenza
    $startLocation = null;
    if (isset($settings['startLocationType']) && $settings['startLocationType'] === 'custom') {
        if (isset($settings['startLocation']) && isset($settings['startLocation']['lat']) && isset($settings['startLocation']['lng'])) {
            // Crea un ID univoco per il punto di partenza
            $startLocationId = 'start_location_' . time();
            
            $startLocation = [
                'id' => $startLocationId,
                'name' => 'Punto di partenza',
                'address' => $settings['startLocation']['address'] ?? 'Indirizzo personalizzato',
                'lat' => $settings['startLocation']['lat'],
                'lng' => $settings['startLocation']['lng'],
                'is_start_point' => true,
                'is_custom_start' => true,
                'duration' => 0  // Nessuna durata per il punto di partenza
            ];
            
            // Aggiungi il punto di partenza come prima località
            array_unshift($locations, $startLocation);
        }
    } else if (isset($settings['startLocationType']) && $settings['startLocationType'] === 'firstLocation' && !empty($locations)) {
        // Marca il primo punto come punto di partenza
        $locations[0]['is_start_point'] = true;
    }
    
    // Gestione del ritorno al punto di partenza
    $returnToStart = isset($settings['returnToStart']) && $settings['returnToStart'] === true;
    $useHubForDailyStart = isset($settings['useHubForDailyStart']) && $settings['useHubForDailyStart'] === true;
    
    // Metodo di ottimizzazione
    $optimizationMethod = $settings['optimizationMethod'] ?? 'global'; // default a global
    
    // Log delle opzioni
    error_log("Return to start: " . ($returnToStart ? "Yes" : "No"));
    error_log("Use hub for daily start: " . ($useHubForDailyStart ? "Yes" : "No"));
    error_log("Optimization method: " . $optimizationMethod);
    
    // Geocodifica le posizioni che non hanno coordinate
    foreach ($locations as &$location) {
        if (empty($location['lat']) || empty($location['lng'])) {
            if (empty($location['address'])) {
                throw new Exception('Location missing both coordinates and address');
            }
            
            try {
                $geocodeResult = handleGeocodeAddress($location['address']);
                if ($geocodeResult['success']) {
                    $location['lat'] = $geocodeResult['data']['lat'];
                    $location['lng'] = $geocodeResult['data']['lng'];
                }
            } catch (Exception $e) {
                error_log("Geocoding error for address {$location['address']}: " . $e->getMessage());
                throw new Exception("Could not geocode address: {$location['address']}");
            }
        }
    }
    
    // Calcola tempi di percorrenza tra tutte le posizioni
    $travelTimes = calculateTravelTimes($locations, $settings);
    
    // Ottimizza il percorso
    $optimizedRoute = optimizeRoute($locations, $travelTimes, $settings, $returnToStart);
    
    return [
        'success' => true,
        'data' => [
            'route' => $optimizedRoute,
            'stats' => $optimizedRoute['stats']
        ]
    ];
}

/**
 * Salva un piano di percorso
 */
function handleSavePlan($pdo, $data) {
    if (!isset($data['plan']) || !isset($data['plan']['name'])) {
        throw new Exception('Invalid plan data');
    }
    
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    $userId = $_SESSION['user']['id'];
    $plan = $data['plan'];
    
    try {
        $pdo->beginTransaction();
        
        // Verifica se esiste già un piano con lo stesso nome per questo utente
        $checkStmt = $pdo->prepare("
            SELECT id FROM route_optimizer_plans 
            WHERE user_id = ? AND name = ?
        ");
        $checkStmt->execute([$userId, $plan['name']]);
        $existingPlan = $checkStmt->fetch();
        
        if ($existingPlan) {
            // Aggiorna il piano esistente
            $stmt = $pdo->prepare("
                UPDATE route_optimizer_plans 
                SET 
                    description = ?,
                    plan_data = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $plan['description'] ?? null,
                json_encode($plan),
                $existingPlan['id']
            ]);
            
            $planId = $existingPlan['id'];
        } else {
            // Crea un nuovo piano
            $stmt = $pdo->prepare("
                INSERT INTO route_optimizer_plans 
                (user_id, name, description, plan_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $userId,
                $plan['name'],
                $plan['description'] ?? null,
                json_encode($plan)
            ]);
            
            $planId = $pdo->lastInsertId();
        }
        
        $pdo->commit();
        
        return [
            'success' => true,
            'data' => [
                'id' => $planId,
                'message' => 'Piano salvato con successo'
            ]
        ];
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error saving plan: " . $e->getMessage());
        throw new Exception('Error saving plan');
    }
}

/**
 * Recupera l'elenco dei piani salvati
 */
function handleGetPlans($pdo) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    $userId = $_SESSION['user']['id'];
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                name, 
                description, 
                created_at, 
                updated_at 
            FROM route_optimizer_plans 
            WHERE user_id = ? 
            ORDER BY updated_at DESC
        ");
        
        $stmt->execute([$userId]);
        $plans = $stmt->fetchAll();
        
        return [
            'success' => true,
            'data' => $plans
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving plans: " . $e->getMessage());
        throw new Exception('Error retrieving plans');
    }
}

/**
 * Recupera un piano specifico
 */
function handleGetPlan($pdo, $planId) {
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    if (!$planId) {
        throw new Exception('Plan ID is required');
    }
    
    $userId = $_SESSION['user']['id'];
    
    try {
        $stmt = $pdo->prepare("
            SELECT * 
            FROM route_optimizer_plans 
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([$planId, $userId]);
        $plan = $stmt->fetch();
        
        if (!$plan) {
            throw new Exception('Plan not found or access denied');
        }
        
        // Decodifica i dati del piano
        $planData = json_decode($plan['plan_data'], true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Error decoding plan data');
        }
        
        return [
            'success' => true,
            'data' => $planData
        ];
    } catch (PDOException $e) {
        error_log("Error retrieving plan: " . $e->getMessage());
        throw new Exception('Error retrieving plan');
    }
}

/**
 * Elimina un piano
 */
function handleDeletePlan($pdo, $data) {
    if (!isset($data['id'])) {
        throw new Exception('Plan ID is required');
    }
    
    if (!isset($_SESSION['user']['id'])) {
        throw new Exception('User not logged in');
    }
    
    $userId = $_SESSION['user']['id'];
    $planId = $data['id'];
    
    try {
        $stmt = $pdo->prepare("
            DELETE FROM route_optimizer_plans 
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->execute([$planId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Plan not found or access denied');
        }
        
        return [
            'success' => true,
            'data' => [
                'message' => 'Piano eliminato con successo'
            ]
        ];
    } catch (PDOException $e) {
        error_log("Error deleting plan: " . $e->getMessage());
        throw new Exception('Error deleting plan');
    }
}
// Verifica dell'autenticazione
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Utente non autenticato'
    ]);
    exit;
}

// Main request handling
try {
    $pdo = getPDO();
    
    // Assicurati che la tabella dei piani esista
    createTableIfNeeded($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $postData = $_POST;
        $jsonData = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
            $postData = $jsonData;
        }
        
        switch($postData['action'] ?? '') {
            case 'optimizeRoute':
                $result = handleOptimizeRoute($postData);
                break;
            case 'savePlan':
                $result = handleSavePlan($pdo, $postData);
                break;
            case 'deletePlan':
                $result = handleDeletePlan($pdo, $postData);
                break;
            case 'getRouteBetweenPoints':
                $result = handleGetRouteBetweenPoints($postData);
                break;
            default:
                throw new Exception('Invalid action for POST request');
        }
        
    } else {
        switch($_GET['action'] ?? '') {
            case 'getGoogleMapsApiKey':
                $result = handleGetGoogleMapsApiKey();
                break;
            case 'getPOSLocations':
                $searchTerm = $_GET['search'] ?? '';
                $result = handleGetPOSLocations($pdo, $searchTerm);
                break;
            case 'geocodeAddress':
                $result = handleGeocodeAddress($_GET['address'] ?? '');
                break;
            case 'getPlans':
                $result = handleGetPlans($pdo);
                break;
            case 'getPlan':
                $result = handleGetPlan($pdo, $_GET['id'] ?? null);
                break;
            default:
                throw new Exception('Invalid action for GET request');
        }
    }
    
    if (ob_get_level()) ob_end_clean();
    echo json_encode($result);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>