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

function ensureTablesExist($pdo) {
    try {
        // Impostazione SQL per evitare errori di strict mode
        $pdo->exec("SET sql_mode = ''");
        
        // -------------- t_reports --------------
        // Verifica se la tabella t_reports esiste
        $stmt = $pdo->query("SHOW TABLES LIKE 't_reports'");
        if (!$stmt->fetch()) {
            // Crea la tabella t_reports se non esiste
            $sql = "CREATE TABLE IF NOT EXISTS `t_reports` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `table_name` varchar(64) NOT NULL,
                `description` text,
                `sql_query` text NOT NULL,
                `query_prompt` text,
                `can_read` tinyint(1) DEFAULT '1',
                `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `table_name` (`table_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            $pdo->exec($sql);
            error_log("Table t_reports created successfully");
        } else {
            // Verifica e aggiunge colonne mancanti se la tabella esiste già
            $currentColumns = $pdo->query("SHOW COLUMNS FROM t_reports")->fetchAll(PDO::FETCH_COLUMN);
            
            // Verifica query_prompt
            if (!in_array('query_prompt', $currentColumns)) {
                $pdo->exec("ALTER TABLE `t_reports` ADD COLUMN `query_prompt` text AFTER `sql_query`");
                error_log("Column query_prompt added to t_reports");
            }
            
            // Verifica created_at
            if (!in_array('created_at', $currentColumns)) {
                $pdo->exec("ALTER TABLE `t_reports` 
                           ADD COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");
                error_log("Column created_at added to t_reports");
            }
            
            // Verifica updated_at
            if (!in_array('updated_at', $currentColumns)) {
                $pdo->exec("ALTER TABLE `t_reports` 
                           ADD COLUMN `updated_at` timestamp NOT NULL 
                           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
                error_log("Column updated_at added to t_reports");
            }
            
            // Verifica can_read
            if (!in_array('can_read', $currentColumns)) {
                $pdo->exec("ALTER TABLE `t_reports` ADD COLUMN `can_read` tinyint(1) DEFAULT '1'");
                error_log("Column can_read added to t_reports");
            }
        }

        return true;

    } catch (PDOException $e) {
        error_log("Error in ensureTablesExist: " . $e->getMessage());
        throw new Exception('Error creating/updating tables: ' . $e->getMessage());
    }
}

function handleGetReportsList($pdo) {
    try {
        $query = "
            SELECT id, table_name, description, sql_query, query_prompt
            FROM t_reports 
            WHERE can_read = 1
            ORDER BY table_name
        ";
        
        $stmt = $pdo->query($query);
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'reports' => $reports
        ];
    } catch (Exception $e) {
        throw new Exception('Error retrieving reports: ' . $e->getMessage());
    }
}
function handleSaveReport($pdo, $request) {
    $requiredFields = ['table_name', 'description', 'sql_query', 'query_prompt'];
    foreach ($requiredFields as $field) {
        if (!isset($request[$field]) || empty($request[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO t_reports (table_name, description, sql_query, query_prompt, can_read) 
            VALUES (?, ?, ?, ?, 1)
        ");
        
        $stmt->execute([
            $request['table_name'],
            $request['description'],
            $request['sql_query'],
            $request['query_prompt']
        ]);
        
        return [
            'success' => true,
            'message' => 'Report saved successfully',
            'id' => $pdo->lastInsertId()
        ];
    } catch (Exception $e) {
        throw new Exception('Failed to save report: ' . $e->getMessage());
    }
}

function handleUpdateReport($pdo, $request) {
    if (!isset($request['id'])) {
        throw new Exception('Missing report ID');
    }

    $requiredFields = ['table_name', 'description', 'sql_query', 'query_prompt'];
    foreach ($requiredFields as $field) {
        if (!isset($request[$field]) || empty($request[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE t_reports 
            SET table_name = ?, description = ?, sql_query = ?, query_prompt = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $request['table_name'],
            $request['description'],
            $request['sql_query'],
            $request['query_prompt'],
            $request['id']
        ]);
        
        return [
            'success' => true,
            'message' => 'Report updated successfully'
        ];
    } catch (Exception $e) {
        throw new Exception('Failed to update report: ' . $e->getMessage());
    }
}
function handleDeleteReport($pdo, $request) {
    if (!isset($request['id'])) {
        throw new Exception('Missing report ID');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM t_reports WHERE id = ?");
        $stmt->execute([$request['id']]);
        
        return [
            'success' => true,
            'message' => 'Report deleted successfully'
        ];
    } catch (Exception $e) {
        throw new Exception('Failed to delete report: ' . $e->getMessage());
    }
}

function handleGenerateQuery($pdo, $request) {
    if (!isset($request['prompt'])) {
        throw new Exception('Missing prompt parameter');
    }

    try {
        // Get all tables
        $stmt = $pdo->query("SELECT table_name FROM t_table ORDER BY table_name");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($tables)) {
            throw new Exception('No tables found in t_table');
        }

        // Build database structure description
        $structureDescription = "Database structure:\n\n";
        foreach ($tables as $tableName) {
            $stmt = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($tableName));
            if (!$stmt->fetch()) continue;

            // Get table columns
            $stmt = $pdo->prepare("DESCRIBE " . $tableName);
            $stmt->execute();
            $tableStructure = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get foreign keys
            $stmt = $pdo->prepare("
                SELECT 
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM
                    information_schema.KEY_COLUMN_USAGE
                WHERE
                    TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            $stmt->execute([$tableName]);
            $foreignKeys = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $structureDescription .= "Table {$tableName}:\n";
            foreach ($tableStructure as $column) {
                $structureDescription .= "- {$column['Field']}: {$column['Type']}" . 
                    ($column['Key'] === 'PRI' ? ' (Primary Key)' : '') . 
                    ($column['Null'] === 'NO' ? ' (Not Null)' : '');
                
                // Add foreign key information
                foreach ($foreignKeys as $fk) {
                    if ($fk['COLUMN_NAME'] === $column['Field']) {
                        $structureDescription .= " (Foreign Key to {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']})";
                    }
                }
                $structureDescription .= "\n";
            }
            $structureDescription .= "\n";
        }

        $fullPrompt = "Generate a MySQL SELECT query based on the following database structure:\n\n" .
                     $structureDescription . "\n" .
                     "Using the available tables (" . implode(", ", $tables) . ") " .
                     "generate an optimized MySQL query for this request:\n" .
                     $request['prompt'] . "\n\n" .
                     "Important requirements:\n" .
                     "- Use MySQL 5.7+ compatible syntax\n" .
                     "- Use backticks (`) around all table and column names\n" .
                     "- Use proper MySQL string functions (CONCAT, SUBSTRING, etc.)\n" .
                     "- Use proper MySQL date functions (DATE_FORMAT, DATEDIFF, etc.)\n" .
                     "- Use appropriate JOINs based on foreign key relationships\n" .
                     "- Use LEFT JOIN when you want to include all records from the left table\n" .
                     "- Include appropriate column aliases for clarity\n" .
                     "- Optimize the query for performance\n" .
                     "- Consider adding CASE statements or IF() for conditional logic\n" .
                     "- Use GROUP BY with appropriate aggregate functions if needed\n" .
                     "- Consider adding HAVING clause for filtering aggregated data\n" .
                     "- Use proper index hints if needed for optimization\n" .
                     "- DO NOT use table aliases\n" .
                     "Provide only the SQL query without additional explanations.";

        $config = parse_ini_file('../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini', true);
        if (!isset($config['claude']) || !isset($config['claude']['api_key'])) {
            throw new Exception('Claude API key not found in configuration');
        }

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-api-key: ' . $config['claude']['api_key'],
                'anthropic-version: 2023-06-01'
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => 'claude-3-sonnet-20240229',
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => $fullPrompt
                    ]
                ],
                'max_tokens' => 1024
            ])
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($httpCode !== 200) {
            throw new Exception('Error in Claude API call: ' . curl_error($ch));
        }

        $result = json_decode($response, true);
        if (!$result || !isset($result['content'][0]['text'])) {
            throw new Exception('Invalid response from Claude API');
        }

        $query = $result['content'][0]['text'];

        // Validate the query
        try {
            $stmt = $pdo->prepare($query);
            $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception('Generated query is not valid: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'query' => $query
        ];

    } catch (Exception $e) {
        throw new Exception('Error generating query: ' . $e->getMessage());
    }
}

function handleTestQuery($pdo, $request) {
    if (!isset($request['query'])) {
        throw new Exception('Missing query parameter');
    }

    try {
        // Add LIMIT to the query for testing
        $testQuery = preg_replace('/\s+LIMIT\s+\d+(?:\s*,\s*\d+)?\s*$/i', '', trim($request['query']));
        $testQuery .= " LIMIT 5";

        $stmt = $pdo->prepare($testQuery);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => $data,
            'columns' => $data ? array_keys($data[0]) : [],
            'rowCount' => count($data)
        ];
    } catch (Exception $e) {
        throw new Exception('Query test failed: ' . $e->getMessage());
    }
}

function cleanQuery($query) {
    // Rimuove i punti e virgola finali
    $query = preg_replace('/;\s*$/', '', trim($query));
    // Rimuove i LIMIT quando la query viene usata come subquery
    $query = preg_replace('/\s+LIMIT\s+\d+(?:\s*,\s*\d+)?\s*$/i', '', $query);
    return $query;
}

function handleExecuteQuery($pdo, $request) {
    try {
        // Log iniziale della richiesta
        error_log("Execute Query Request: " . json_encode($request));

        // Validazione del report_id
        if (!isset($request['report_id'])) {
            throw new Exception('Missing report ID parameter');
        }

        $reportId = filter_var($request['report_id'], FILTER_VALIDATE_INT);
        if ($reportId === false) {
            throw new Exception('Invalid report ID format');
        }

        // Recupero della query dal database
        $stmt = $pdo->prepare("SELECT sql_query, table_name FROM t_reports WHERE id = ? AND can_read = 1");
        if (!$stmt->execute([$reportId])) {
            error_log("SQL Error in select: " . json_encode($stmt->errorInfo()));
            throw new Exception('Error executing select query');
        }

        $report = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$report) {
            throw new Exception("Report not found or access denied for ID: $reportId");
        }

        error_log("Found report: " . json_encode($report));

        // Pulizia della query base
        $baseQuery = preg_replace('/;\s*$/', '', trim($report['sql_query']));
        $baseQuery = preg_replace('/\s+LIMIT\s+\d+(?:\s*,\s*\d+)?\s*$/i', '', $baseQuery);

        // Gestione filtri
        if (isset($request['filter'])) {
            try {
                $filters = is_array($request['filter']) ? 
                          $request['filter'] : 
                          json_decode(urldecode($request['filter']), true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("JSON decode error for filters: " . json_last_error_msg());
                }

                if ($filters) {
                    $whereConditions = [];
                    foreach ($filters as $filter) {
                        if (!empty($filter['value'])) {
                            // Sanitizzazione dei nomi dei campi e dei valori
                            $field = str_replace(['`', "'", '"'], '', $filter['field']);
                            $value = str_replace("'", "''", $filter['value']);
                            
                            // Gestione diversi tipi di filtri
                            if (isset($filter['type']) && $filter['type'] === 'number') {
                                $whereConditions[] = "`$field` = " . floatval($value);
                            } else if (isset($filter['type']) && $filter['type'] === 'date') {
                                $whereConditions[] = "DATE(`$field`) = DATE('$value')";
                            } else {
                                $whereConditions[] = "`$field` LIKE '%$value%'";
                            }
                        }
                    }
                    if (!empty($whereConditions)) {
                        $baseQuery = "SELECT * FROM ($baseQuery) as filtered_data WHERE " . implode(" AND ", $whereConditions);
                    }
                }
            } catch (Exception $e) {
                error_log("Filter processing error: " . $e->getMessage());
            }
        }

        // Gestione ordinamento
        if (isset($request['sort'])) {
            try {
                $sorters = is_array($request['sort']) ? 
                          $request['sort'] : 
                          json_decode(urldecode($request['sort']), true);

                if ($sorters) {
                    $orderBy = [];
                    foreach ($sorters as $sort) {
                        // Sanitizzazione del nome del campo
                        $field = str_replace(['`', "'", '"'], '', $sort['field']);
                        $direction = strtoupper($sort['dir']) === 'DESC' ? 'DESC' : 'ASC';
                        $orderBy[] = "`$field` " . $direction;
                    }
                    if (!empty($orderBy)) {
                        $baseQuery = "SELECT * FROM ($baseQuery) as sorted_data ORDER BY " . implode(", ", $orderBy);
                    }
                }
            } catch (Exception $e) {
                error_log("Sort processing error: " . $e->getMessage());
            }
        }

        // Query per il conteggio totale dei record
        $countQuery = "SELECT COUNT(*) as total FROM ($baseQuery) as count_data";
        error_log("Count Query: $countQuery");

        $countResult = $pdo->query($countQuery);
        if ($countResult === false) {
            error_log("Count query error: " . json_encode($pdo->errorInfo()));
            throw new Exception('Error executing count query');
        }
        $totalRecords = $countResult->fetchColumn();

        // Gestione export (se richiesto)
        if (isset($request['export']) && $request['export'] === 'true') {
            $stmt = $pdo->query($baseQuery);
            if ($stmt === false) {
                error_log("Export query error: " . json_encode($pdo->errorInfo()));
                throw new Exception('Error executing export query');
            }
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'success' => true,
                'data' => $data,
                'totalRecords' => $totalRecords
            ];
        }

        // Gestione paginazione
        $page = isset($request['page']) ? max(1, intval($request['page'])) : 1;
        $size = isset($request['size']) ? intval($request['size']) : 50;
        $offset = ($page - 1) * $size;

        // Query finale con paginazione
        $finalQuery = "$baseQuery LIMIT $size OFFSET $offset";
        error_log("Final Query: $finalQuery");

        $stmt = $pdo->query($finalQuery);
        if ($stmt === false) {
            error_log("Final query error: " . json_encode($pdo->errorInfo()));
            throw new Exception('Error executing final query');
        }

        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Preparazione della risposta
        $response = [
            'success' => true,
            'data' => $data,
            'currentPage' => $page,
            'lastPage' => ceil($totalRecords / $size),
            'totalRecords' => $totalRecords,
            'pageSize' => $size
        ];

        error_log("Query executed successfully. Records returned: " . count($data));
        return $response;

    } catch (Exception $e) {
        error_log("Execute Query Error: " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
        throw new Exception('Error executing query: ' . $e->getMessage());
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

    // Ensure tables exist
    ensureTablesExist($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $request = json_decode($rawInput, true);
        
        if (!$request) {
            throw new Exception('Invalid JSON in request');
        }

        if (!isset($request['action'])) {
            throw new Exception('Action parameter missing');
        }

        switch ($request['action']) {
            case 'generateQuery':
                $result = handleGenerateQuery($pdo, $request);
                break;
            
            case 'saveReport':    // Verificare che sia saveReport e non saveVista
                $result = handleSaveReport($pdo, $request);
                break;
        
            case 'updateReport':  // Verificare che sia updateReport e non updateVista
                $result = handleUpdateReport($pdo, $request);
                break;
            
            case 'deleteReport': // Verificare che sia deleteReport e non deleteVista
                $result = handleDeleteReport($pdo, $request);
                break;
        
            case 'testQuery':
                $result = handleTestQuery($pdo, $request);
                break;
                
            default:
                throw new Exception('Invalid action: ' . $request['action']);
        }
    } else {
        if (!isset($_GET['action'])) {
            throw new Exception('Action parameter missing in GET request');
        }

        $action = $_GET['action'];
        
        switch ($action) {
            case 'getReportsList':
                $result = handleGetReportsList($pdo);
                break;

            case 'executeQuery':
                $result = handleExecuteQuery($pdo, $_GET);
                break;

            default:
                throw new Exception('Invalid action: ' . $action);
        }
    }

    if (ob_get_level()) ob_end_clean();
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
    
} catch (Exception $e) {
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