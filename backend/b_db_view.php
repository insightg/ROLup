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

// Helper function per pulire i nomi delle colonne
function cleanColumnName($columnName) {
    return preg_replace('/^col_+/', '', $columnName);
}

function handleGetTablesList($pdo) {
    try {
        $query = "SELECT t.table_name, t.description FROM t_table t WHERE t.can_read = 1 ORDER BY t.table_name";
        $stmt = $pdo->query($query);
        $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($tables as &$table) {
            try {
                $countQuery = "SELECT COUNT(*) as count FROM `{$table['table_name']}`";
                $countStmt = $pdo->query($countQuery);
                $count = $countStmt->fetch(PDO::FETCH_ASSOC);
                $table['record_count'] = $count['count'];
            } catch (Exception $e) {
                error_log("Error counting records for table {$table['table_name']}: " . $e->getMessage());
                $table['record_count'] = 0;
            }
        }
        
        return ['success' => true, 'tables' => $tables];
    } catch (Exception $e) {
        throw new Exception('Error retrieving tables: ' . $e->getMessage());
    }
}

function handleTabulatorData($pdo) {
    try {
        if (!isset($_GET['table'])) {
            throw new Exception('Table parameter missing');
        }

        $tableName = $_GET['table'];
        $stmt = $pdo->prepare("SELECT table_name, can_read FROM t_table WHERE table_name = ?");
        $stmt->execute([$tableName]);
        $tableInfo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tableInfo || !$tableInfo['can_read']) {
            throw new Exception('Table not found or access denied');
        }

        // Base query
        $baseQuery = "SELECT * FROM `$tableName`";
        $params = [];
        $whereConditions = [];

        // Handle filters
        if (isset($_GET['filter'])) {
            $filters = $_GET['filter'];
            if (is_string($filters)) {
                $filters = json_decode($filters, true);
            }
            
            if ($filters && is_array($filters)) {
                foreach ($filters as $filter) {
                    if (!empty($filter['field']) && isset($filter['value']) && $filter['value'] !== '') {
                        $cleanField = cleanColumnName($filter['field']);
                        if (isset($filter['type']) && $filter['type'] === 'number') {
                            $whereConditions[] = "`{$cleanField}` = ?";
                            $params[] = $filter['value'];
                        } else {
                            $whereConditions[] = "`{$cleanField}` LIKE ?";
                            $params[] = "%{$filter['value']}%";
                        }
                    }
                }
            }
        }

        if (!empty($whereConditions)) {
            $baseQuery .= " WHERE " . implode(" AND ", $whereConditions);
        }

        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM ($baseQuery) as count_table";
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($params);
        $totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Handle sorting
        if (isset($_GET['sort'])) {
            $sorts = $_GET['sort'];
            if (is_string($sorts)) {
                $sorts = json_decode($sorts, true);
            }
            
            if ($sorts && is_array($sorts)) {
                $orderBy = [];
                foreach ($sorts as $sort) {
                    $cleanField = cleanColumnName($sort['field']);
                    $orderBy[] = "`{$cleanField}` " . 
                                (strtoupper($sort['dir']) === 'DESC' ? 'DESC' : 'ASC');
                }
                if (!empty($orderBy)) {
                    $baseQuery .= " ORDER BY " . implode(", ", $orderBy);
                }
            }
        }

        // Handle pagination
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $size = isset($_GET['size']) ? (int)$_GET['size'] : 50;
        $offset = ($page - 1) * $size;

        // Modifica qui: usa bindValue con PDO::PARAM_INT
        $finalQuery = $baseQuery . " LIMIT ?, ?";
        $stmt = $pdo->prepare($finalQuery);

        // Bind prima tutti i parametri esistenti
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }

        // Bind dei parametri di paginazione come interi
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $size, PDO::PARAM_INT);
        
        $stmt->execute();
        
        return [
            'success' => true,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'totalRecords' => $totalRecords,
            'lastPage' => ceil($totalRecords / $size)
        ];

    } catch (Exception $e) {
        error_log("Error in handleTabulatorData: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'data' => [],
            'totalRecords' => 0,
            'lastPage' => 1
        ];
    }
}

function handleInsertRecord($pdo, $request) {
    if (!isset($request['tableName']) || !isset($request['record'])) {
        throw new Exception('Missing required parameters');
    }

    $stmt = $pdo->prepare("SELECT can_write FROM t_table WHERE table_name = ?");
    $stmt->execute([$request['tableName']]);
    $permissions = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permissions || !$permissions['can_write']) {
        throw new Exception('Write access denied');
    }

    try {
        $pdo->beginTransaction();

        $fields = array_map('cleanColumnName', array_keys($request['record']));
        $values = array_values($request['record']);
        $placeholders = str_repeat('?,', count($fields) - 1) . '?';

        $query = "INSERT INTO `{$request['tableName']}` (" . 
                 implode(', ', array_map(function($field) { return "`$field`"; }, $fields)) . 
                 ") VALUES (" . $placeholders . ")";

        $stmt = $pdo->prepare($query);
        $stmt->execute($values);
        $id = $pdo->lastInsertId();

        $pdo->commit();
        return ['success' => true, 'message' => 'Record inserted successfully', 'id' => $id];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error inserting record: ' . $e->getMessage());
    }
}

function handleUpdateRecord($pdo, $request) {
    if (!isset($request['tableName']) || !isset($request['record']) || !isset($request['originalRecord'])) {
        throw new Exception('Missing required parameters');
    }

    $stmt = $pdo->prepare("SELECT can_write FROM t_table WHERE table_name = ?");
    $stmt->execute([$request['tableName']]);
    $permissions = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permissions || !$permissions['can_write']) {
        throw new Exception('Write access denied');
    }

    try {
        $pdo->beginTransaction();

        $setFields = [];
        $whereFields = [];
        $values = [];

        foreach ($request['record'] as $field => $value) {
            $cleanField = cleanColumnName($field);
            $setFields[] = "`$cleanField` = ?";
            $values[] = $value;
        }

        foreach ($request['originalRecord'] as $field => $value) {
            $cleanField = cleanColumnName($field);
            $whereFields[] = "`$cleanField` = ?";
            $values[] = $value;
        }

        $query = "UPDATE `{$request['tableName']}` SET " . 
                 implode(', ', $setFields) . 
                 " WHERE " . implode(' AND ', $whereFields);

        $stmt = $pdo->prepare($query);
        $stmt->execute($values);

        $pdo->commit();
        return [
            'success' => true,
            'message' => 'Record updated successfully',
            'rowCount' => $stmt->rowCount()
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error updating record: ' . $e->getMessage());
    }
}

function handleDeleteRecord($pdo, $request) {
    if (!isset($request['tableName']) || !isset($request['record'])) {
        throw new Exception('Missing required parameters');
    }

    $stmt = $pdo->prepare("SELECT can_delete FROM t_table WHERE table_name = ?");
    $stmt->execute([$request['tableName']]);
    $permissions = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permissions || !$permissions['can_delete']) {
        throw new Exception('Delete access denied');
    }

    try {
        $pdo->beginTransaction();

        $whereFields = [];
        $values = [];

        foreach ($request['record'] as $field => $value) {
            $cleanField = cleanColumnName($field);
            $whereFields[] = "`$cleanField` = ?";
            $values[] = $value;
        }

        $query = "DELETE FROM `{$request['tableName']}` WHERE " . implode(' AND ', $whereFields);
        $stmt = $pdo->prepare($query);
        $stmt->execute($values);

        $pdo->commit();
        return [
            'success' => true,
            'message' => 'Record deleted successfully',
            'rowCount' => $stmt->rowCount()
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new Exception('Error deleting record: ' . $e->getMessage());
    }
}

function appendTableData($pdo, $tableName, $mappings, $data) {
    if (empty($data)) {
        return;
    }

    // Pulisce i nomi delle colonne dal prefisso col_
    $columns = array_map(function($mapping) {
        $columnName = cleanColumnName($mapping['tableColumn']);
        return "`{$columnName}`";
    }, $mappings);
    
    $placeholders = rtrim(str_repeat('?,', count($mappings)), ',');
    
    $sql = "INSERT INTO `$tableName` (" . implode(',', $columns) . ") VALUES ($placeholders)";
    error_log("Generated SQL: " . $sql);
    $stmt = $pdo->prepare($sql);

    foreach ($data as $row) {
        $values = array_map(function($mapping) use ($row) {
            return $row[$mapping['tableColumn']] ?? null;
        }, $mappings);
        
        error_log("Inserting values: " . print_r($values, true));
        $stmt->execute($values);
    }
}

function updateTableData($pdo, $tableName, $mappings, $data, $keyFields) {
    if (empty($data)) {
        return;
    }

    // Pulisce i nomi delle colonne dal prefisso col_
    $setFields = array_map(function($mapping) {
        $columnName = cleanColumnName($mapping['tableColumn']);
        return "`{$columnName}` = ?";
    }, $mappings);

    // Pulisce i nomi delle colonne chiave
    $whereFields = array_map(function($field) {
        $cleanField = cleanColumnName($field);
        return "`$cleanField` = ?";
    }, $keyFields);

    $sql = "UPDATE `$tableName` SET " . implode(',', $setFields) . 
           " WHERE " . implode(' AND ', $whereFields);
           
    error_log("Generated UPDATE SQL: " . $sql);
    $stmt = $pdo->prepare($sql);

    foreach ($data as $row) {
        $values = [];
        
        // Valori per la clausola SET
        foreach ($mappings as $mapping) {
            $values[] = $row[$mapping['tableColumn']] ?? null;
        }
        
        // Valori per la clausola WHERE
        foreach ($keyFields as $field) {
            $values[] = $row[$field] ?? null;
        }
        
        error_log("Updating with values: " . print_r($values, true));
        $stmt->execute($values);
    }
}

function handleUpdateTableData($pdo, $request) {
    if (!isset($request['tableName'], $request['mode'], $request['mappings'], $request['data'])) {
        throw new Exception('Missing required parameters');
    }

    $tableName = $request['tableName'];
    $mode = $request['mode'];
    $mappings = $request['mappings'];
    $data = $request['data'];
    $keyFields = $request['keyFields'] ?? [];

    // Debug log
    error_log("Update request: " . print_r([
        'tableName' => $tableName,
        'mode' => $mode,
        'mappings' => $mappings,
        'keyFields' => $keyFields,
        'dataCount' => count($data)
    ], true));

    // Verifica permessi tabella
    $stmt = $pdo->prepare("SELECT can_write FROM t_table WHERE table_name = ?");
    $stmt->execute([$tableName]);
    $permissions = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permissions || !$permissions['can_write']) {
        throw new Exception('Write access denied');
    }

    try {
        if (!$pdo->inTransaction()) {
            $pdo->beginTransaction();
        }

        switch ($mode) {
            case 'replace':
                $pdo->exec("TRUNCATE TABLE `$tableName`");
                appendTableData($pdo, $tableName, $mappings, $data);
                break;

            case 'append':
                appendTableData($pdo, $tableName, $mappings, $data);
                break;

            case 'update':
                if (empty($keyFields)) {
                    throw new Exception('Key fields required for update mode');
                }
                updateTableData($pdo, $tableName, $mappings, $data, $keyFields);
                break;

            default:
                throw new Exception('Invalid update mode');
        }

        if ($pdo->inTransaction()) {
            $pdo->commit();
        }

        return [
            'success' => true,
            'message' => 'Table updated successfully',
            'recordCount' => count($data)
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Update error: " . $e->getMessage());
        throw new Exception('Update failed: ' . $e->getMessage());
    }
}

function handleGetTableStructure($pdo, $config, $tableName = null) {
    if (!$tableName && !isset($_GET['table'])) {
        throw new Exception('Table parameter missing');
    }
    
    $tableName = $tableName ?? $_GET['table'];

    $stmt = $pdo->prepare("SELECT table_name, description FROM t_table WHERE table_name = ? AND can_read = 1");
    $stmt->execute([$tableName]);
    $tableInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tableInfo) {
        throw new Exception('Table not found or not accessible');
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                COLUMN_NAME as name,
                DATA_TYPE as type,
                CASE 
                    WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN CHARACTER_MAXIMUM_LENGTH
                    WHEN NUMERIC_PRECISION IS NOT NULL THEN 
                        CASE WHEN NUMERIC_SCALE > 0 
                            THEN CONCAT(NUMERIC_PRECISION, ',', NUMERIC_SCALE)
                            ELSE NUMERIC_PRECISION
                        END
                    ELSE NULL
                END as length,
                IS_NULLABLE = 'YES' as nullable,
                COLUMN_DEFAULT as `default`
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        ");
        
        $stmt->execute([$config['database']['dbname'], $tableName]);
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'columns' => $columns,
            'description' => $tableInfo['description']
        ];
    } catch (Exception $e) {
        throw new Exception('Error getting table structure: ' . $e->getMessage());
    }
}

function handleCreateTable($pdo, $request) {
    if (!isset($request['tableName']) || !isset($request['description']) || !isset($request['fields'])) {
        throw new Exception('Missing required parameters');
    }

    $tableName = $request['tableName'];
    $description = $request['description'];
    $fields = $request['fields'];

    try {
        $createSQL = "CREATE TABLE `$tableName` (
            id INT AUTO_INCREMENT PRIMARY KEY,\n";
        
        foreach ($fields as $field) {
            $cleanFieldName = cleanColumnName($field['name']);
            $createSQL .= "`{$cleanFieldName}` {$field['type']}";
            
            if (!empty($field['length'])) {
                $createSQL .= "({$field['length']})";
            }
            
            if (!$field['nullable']) {
                $createSQL .= " NOT NULL";
            }
            
            if (isset($field['default']) && $field['default'] !== '') {
                $createSQL .= " DEFAULT " . $pdo->quote($field['default']);
            }
            
            $createSQL .= ",\n";
        }
        
        $createSQL = rtrim($createSQL, ",\n") . "\n)";
        
        $pdo->exec($createSQL);
        
        $stmt = $pdo->prepare("
            INSERT INTO t_table (table_name, description, group_id, can_read, can_write, can_delete)
            VALUES (?, ?, 1, 1, 1, 1)
        ");
        $stmt->execute([$tableName, $description]);
        
        return [
            'success' => true,
            'message' => 'Table created successfully'
        ];
        
    } catch (Exception $e) {
        try {
            $pdo->exec("DROP TABLE IF EXISTS `$tableName`");
            $stmt = $pdo->prepare("DELETE FROM t_table WHERE table_name = ?");
            $stmt->execute([$tableName]);
        } catch (Exception $cleanupEx) {
            // Ignore cleanup errors
        }
        throw new Exception('Error creating table: ' . $e->getMessage());
    }
}

function handleDeleteTable($pdo, $request) {
    if (!isset($request['tableName'])) {
        throw new Exception('Table name is required');
    }

    $tableName = $request['tableName'];
    
    try {
        $stmt = $pdo->prepare("SELECT can_delete FROM t_table WHERE table_name = ?");
        $stmt->execute([$tableName]);
        $permissions = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$permissions || !$permissions['can_delete']) {
            throw new Exception('Table not found or delete permission denied');
        }

        // Prima elimina dalla t_table
        $stmt = $pdo->prepare("DELETE FROM t_table WHERE table_name = ?");
        $stmt->execute([$tableName]);

        // Poi elimina la tabella fisica
        $stmt = $pdo->prepare("DROP TABLE IF EXISTS `$tableName`");
        $stmt->execute();

        return [
            'success' => true,
            'message' => 'Table deleted successfully',
            'tableName' => $tableName
        ];

    } catch (Exception $e) {
        throw new Exception($e->getMessage());
    }
}

// Main request handling
try {
    $config = parse_ini_file('../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini', true);
    $pdo = new PDO(
        "mysql:host={$config['database']['host']};dbname={$config['database']['dbname']};charset=utf8mb4",
        $config['database']['username'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $request = json_decode(file_get_contents('php://input'), true);
        if (!$request) {
            throw new Exception('Invalid JSON request');
        }

        switch ($request['action']) {
            case 'insertRecord':
                $result = handleInsertRecord($pdo, $request);
                break;
            case 'updateRecord':
                $result = handleUpdateRecord($pdo, $request);
                break;
            case 'deleteRecord':
                $result = handleDeleteRecord($pdo, $request);
                break;
            case 'createTable':
                $result = handleCreateTable($pdo, $request);
                break;
            case 'deleteTable':
                $result = handleDeleteTable($pdo, $request);
                break;
            case 'updateTableData':
                $result = handleUpdateTableData($pdo, $request);
                break;
            default:
                throw new Exception('Invalid action');
        }
    } else {
        switch ($_GET['action']) {
            case 'getTablesList':
                $result = handleGetTablesList($pdo);
                break;
            case 'getTableStructure':
                $result = handleGetTableStructure($pdo, $config);
                break;
            case 'tabulatorData':
                $result = handleTabulatorData($pdo);
                break;
            default:
                throw new Exception('Invalid action');
        }
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