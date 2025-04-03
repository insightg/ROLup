<?php
ob_start();

function handleError($errno, $errstr, $errfile, $errline) {
    $error = [
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ];
    error_log("PHP Error: $errstr in $errfile on line $errline");
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode($error);
    exit(1);
}

set_error_handler('handleError');

function handleException($e) {
    $error = [
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ];
    error_log("Uncaught Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode($error);
    exit(1);
}

set_exception_handler('handleException');

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        handleError($error['type'], $error['message'], $error['file'], $error['line']);
    }
});

function sanitizeColumnName($columnName, $index = 0) {
    // Se è una stringa vuota o null, genera un nome di colonna di default
    if (empty($columnName) || trim($columnName) === '') {
        return 'column_' . ($index + 1);
    }

    $sanitized = trim((string)$columnName);
    // Manteniamo il nome originale se è già un identificatore valido di MySQL
    if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $sanitized)) {
        return $sanitized;
    }
    
    // Altrimenti procediamo con la sanitizzazione
    $sanitized = str_replace(' ', '_', $sanitized);
    $sanitized = preg_replace('/[^a-zA-Z0-9_]/', '', $sanitized);
    
    if (preg_match('/^[0-9]/', $sanitized)) {
        $sanitized = 'col_' . $sanitized;
    }
    
    $sanitized = strtolower($sanitized);
    return empty($sanitized) ? 'column_' . ($index + 1) : $sanitized;
}

function sanitizeColumnNames($columns) {
    $sanitizedColumns = [];
    $columnMapping = [];
    $usedNames = [];
    
    foreach ($columns as $index => $column) {
        $sanitized = sanitizeColumnName($column, $index);
        $baseName = $sanitized;
        $counter = 1;
        while (in_array($sanitized, $usedNames)) {
            $sanitized = $baseName . '_' . $counter;
            $counter++;
        }
        $sanitizedColumns[] = $sanitized;
        $columnMapping[$column] = $sanitized;
        $usedNames[] = $sanitized;
    }
    
    return [
        'sanitized' => $sanitizedColumns,
        'mapping' => $columnMapping
    ];
}

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

function handleGetTables($pdo) {
    $columns = json_decode($_POST['columns'], true);
    if (!$columns) {
        throw new Exception('Nessuna colonna specificata');
    }

    $columnInfo = sanitizeColumnNames($columns);
    $sanitizedColumns = $columnInfo['sanitized'];
    
    $stmt = $pdo->query("
        SELECT table_name, description 
        FROM t_table 
        WHERE can_read = 1 
        ORDER BY table_name
    ");
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $compatibleTables = [];
    foreach ($tables as $table) {
        try {
            if (!$pdo->query("SHOW TABLES LIKE " . $pdo->quote($table['table_name']))->rowCount()) {
                continue;
            }

            $stmt = $pdo->query("SHOW COLUMNS FROM `{$table['table_name']}`");
            $tableColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $tableColumnNames = array_column($tableColumns, 'Field');
            $matchingColumns = array_intersect($tableColumnNames, $sanitizedColumns);
            
            $compatibleTables[] = [
                'tablename' => $table['table_name'],
                'description' => $table['description'],
                'columns' => $tableColumnNames,
                'matching_columns' => count($matchingColumns),
                'total_columns' => count($tableColumnNames)
            ];
        } catch (PDOException $e) {
            error_log("Error processing table {$table['table_name']}: " . $e->getMessage());
            continue;
        }
    }

    usort($compatibleTables, function($a, $b) {
        return $b['matching_columns'] - $a['matching_columns'];
    });

    return ['success' => true, 'tables' => $compatibleTables];
}

function handleSaveData($pdo, $input) {
    if (!is_array($input)) {
        throw new Exception('Input non valido: deve essere un array');
    }

    if (!isset($input['mode'], $input['tableName'], $input['columns'], $input['data'])) {
        throw new Exception('Parametri richiesti mancanti');
    }

    $tableName = sanitizeColumnName($input['tableName']);
    $columnInfo = sanitizeColumnNames($input['columns']);
    $columns = $columnInfo['sanitized'];
    $columnMapping = $columnInfo['mapping'];
    
    $data = array_map(function($row) use ($columnMapping) {
        $newRow = [];
        foreach ($row as $key => $value) {
            if (isset($columnMapping[$key])) {
                $newRow[$columnMapping[$key]] = $value;
            }
        }
        return $newRow;
    }, $input['data']);

    $keyColumns = [];
    if (!empty($input['keyColumns'])) {
        foreach ($input['keyColumns'] as $keyColumn) {
            if (isset($columnMapping[$keyColumn])) {
                $keyColumns[] = $columnMapping[$keyColumn];
            }
        }
    }

    $mode = $input['mode'];

    if ($mode !== 'new') {
        $stmt = $pdo->prepare("
            SELECT can_write, can_delete 
            FROM t_table 
            WHERE table_name = ?
        ");
        $stmt->execute([$tableName]);
        $permissions = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$permissions) {
            throw new Exception("Tabella non trovata in t_table");
        }
        if ($permissions['can_write'] != 1) {
            throw new Exception('Permessi di scrittura insufficienti');
        }
        if ($mode === 'replace' && $permissions['can_delete'] != 1) {
            throw new Exception('Permessi di cancellazione insufficienti');
        }
    }

    try {
        switch ($mode) {
            case 'new':
                try {
                    $columnInfo = sanitizeColumnNames($columns);
                    $sanitizedColumns = $columnInfo['sanitized'];
                    $columnMapping = $columnInfo['mapping'];
            
                    // 1. Crea la tabella
                    $columnDefs = array_map(function($col) {
                        return "`$col` TEXT";
                    }, $sanitizedColumns);
                    
                    $createTableSQL = "CREATE TABLE IF NOT EXISTS `$tableName` (
                        id INT AUTO_INCREMENT PRIMARY KEY,\n" . implode(",\n", $columnDefs) . "\n)";
                    
                    $pdo->exec($createTableSQL);
                    
                    // 2. Registra la tabella in t_table
                    $stmt = $pdo->prepare("
                        INSERT INTO t_table (table_name, description, group_id, can_read, can_write, can_delete, import_type)
                        VALUES (?, ?, 1, 1, 1, 1, 'raw')
                        ON DUPLICATE KEY UPDATE description = VALUES(description)
                    ");
                    $stmt->execute([$tableName, $input['filename'] ?? 'Imported table']);
                    
                    // 3. Inserisci i dati
                    if (!empty($data)) {
                        $placeholders = rtrim(str_repeat('?,', count($sanitizedColumns)), ',');
                        $insertSQL = "INSERT INTO `$tableName` (`" . implode('`, `', $sanitizedColumns) . 
                                    "`) VALUES ($placeholders)";
                        
                        $stmt = $pdo->prepare($insertSQL);
                        
                        $pdo->beginTransaction();
                        try {
                            foreach ($data as $row) {
                                $values = array_map(function($col) use ($row, $columnMapping) {
                                    $originalCol = array_search($col, $columnMapping);
                                    return $row[$originalCol] ?? null;
                                }, $sanitizedColumns);
                                $stmt->execute($values);
                            }
                            $pdo->commit();
                        } catch (Exception $e) {
                            $pdo->rollBack();
                            throw $e;
                        }
                    }
                    
                    return [
                        'success' => true,
                        'message' => "Tabella '$tableName' creata con successo",
                        'table' => $tableName,
                        'rowCount' => count($data)
                    ];
            
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    throw $e;
                }
                break;

            case 'append':
                $pdo->beginTransaction();
                $placeholders = str_repeat('?,', count($columns));
                $placeholders = rtrim($placeholders, ',');
                $insertSQL = "INSERT INTO `$tableName` (`" . implode('`, `', $columns) . 
                            "`) VALUES ($placeholders)";
                
                $stmt = $pdo->prepare($insertSQL);
                foreach ($data as $row) {
                    $values = array_map(function($col) use ($row) {
                        return $row[$col] ?? null;
                    }, $columns);
                    $stmt->execute($values);
                }
                $pdo->commit();
                break;

                case 'replace':
                    $batchNumber = $input['batchNumber'] ?? 0;
                    $isLastBatch = $input['isLastBatch'] ?? false;
                
                    try {
                        if ($batchNumber === 0) {
                            $pdo->beginTransaction();
                            $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
                            $pdo->exec("DELETE FROM `$tableName`");
                            $pdo->commit();
                        }
                
                        $pdo->beginTransaction();
                        $placeholders = str_repeat('?,', count($columns));
                        $placeholders = rtrim($placeholders, ',');
                        $insertSQL = "INSERT INTO `$tableName` (`" . implode('`, `', $columns) . "`) VALUES ($placeholders)";
                        
                        $stmt = $pdo->prepare($insertSQL);
                        foreach ($data as $row) {
                            $values = array_map(function($col) use ($row) {
                                return $row[$col] ?? null;
                            }, $columns);
                            $stmt->execute($values);
                        }
                
                        if ($isLastBatch) {
                            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
                        }
                        $pdo->commit();
                
                    } catch (Exception $e) {
                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }
                        if ($pdo && $isLastBatch) {
                            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
                        }
                        throw $e;
                    }
                    break;

                    case 'update':
                        if (empty($keyColumns)) {
                            throw new Exception('Nessuna colonna chiave specificata');
                        }
                    
                        $updateColumns = array_diff($columns, $keyColumns);
                        if (empty($updateColumns)) {
                            throw new Exception('Nessuna colonna da aggiornare');
                        }
                    
                        // Imposta timeout più lungo
                        $pdo->exec('SET SESSION wait_timeout=600');
                        $pdo->exec('SET SESSION interactive_timeout=600');
                    
                        // Suddividi i dati in batch più piccoli
                        $batchSize = 500;
                        $batches = array_chunk($data, $batchSize);
                        
                        $updatedRows = 0;
                        $skippedRows = 0;
                        $unchangedCount = 0;
                        $updateLog = [];
                        $skippedLog = [];
                    
                        foreach ($batches as $batchIndex => $batchData) {
                            $pdo->beginTransaction();
                            
                            try {
                                // Query per i record esistenti del batch corrente
                                $keyConditions = [];
                                foreach ($keyColumns as $col) {
                                    $values = array_unique(array_map(function($row) use ($col) {
                                        return $row[$col] ?? '';
                                    }, $batchData));
                                    $placeholders = implode(',', array_map([$pdo, 'quote'], $values));
                                    $keyConditions[] = "`$col` IN ($placeholders)";
                                }
                    
                                $existingRecordsQuery = "SELECT " . implode(',', array_map(function($col) {
                                    return "`$col`";
                                }, array_merge($keyColumns, $updateColumns))) . 
                                " FROM `$tableName` WHERE " . implode(' AND ', $keyConditions);
                    
                                $existingRecords = $pdo->query($existingRecordsQuery)->fetchAll(PDO::FETCH_ASSOC);
                                $existingDataByKey = [];
                                
                                foreach ($existingRecords as $record) {
                                    $key = implode('|', array_map(function($col) use ($record) {
                                        return $record[$col] ?? '';
                                    }, $keyColumns));
                                    $existingDataByKey[$key] = $record;
                                }
                    
                                $setClause = implode(', ', array_map(function($col) {
                                    return "`$col` = :$col";
                                }, $updateColumns));
                    
                                $whereClause = implode(' AND ', array_map(function($col) {
                                    return "`$col` = :key_$col";
                                }, $keyColumns));
                    
                                $updateSQL = "UPDATE `$tableName` SET $setClause WHERE $whereClause";
                                $updateStmt = $pdo->prepare($updateSQL);
                    
                                foreach ($batchData as $rowIndex => $row) {
                                    $key = implode('|', array_map(function($col) use ($row) {
                                        return $row[$col] ?? '';
                                    }, $keyColumns));
                    
                                    if (isset($existingDataByKey[$key])) {
                                        $needsUpdate = false;
                                        foreach ($updateColumns as $col) {
                                            if (($row[$col] ?? '') != ($existingDataByKey[$key][$col] ?? '')) {
                                                $needsUpdate = true;
                                                break;
                                            }
                                        }
                    
                                        if ($needsUpdate) {
                                            $params = [];
                                            foreach ($updateColumns as $col) {
                                                $params[$col] = $row[$col] ?? null;
                                            }
                                            foreach ($keyColumns as $col) {
                                                $params["key_$col"] = $row[$col] ?? null;
                                            }
                                            
                                            $updateStmt->execute($params);
                                            $updatedRows++;
                                            
                                            $updateLog[] = [
                                                'row' => $rowIndex + 1,
                                                'key_values' => array_intersect_key($row, array_flip($keyColumns)),
                                                'updated_values' => array_intersect_key($row, array_flip($updateColumns))
                                            ];
                                        } else {
                                            $unchangedCount++;
                                        }
                                    } else {
                                        $skippedRows++;
                                        $skippedLog[] = [
                                            'row' => $rowIndex + 1,
                                            'key_values' => array_intersect_key($row, array_flip($keyColumns))
                                        ];
                                    }
                                }
                    
                                $pdo->commit();
                            } catch (Exception $e) {
                                $pdo->rollBack();
                                throw $e;
                            }
                        }
                    
                        return [
                            'success' => true,
                            'message' => sprintf(
                                'Operazione completata: %d record aggiornati, %d record ignorati, %d record invariati', 
                                $updatedRows, 
                                $skippedRows,
                                $unchangedCount
                            ),
                            'details' => [
                                'updated_records' => $updateLog,
                                'skipped_records' => $skippedLog,
                                'unchanged_count' => $unchangedCount
                            ]
                        ];
                        break;

            default:
                throw new Exception('Modalità non valida');
        }

        return [
            'success' => true,
            'message' => 'Operazione completata con successo',
            'table' => $tableName,
            'rowCount' => count($data)
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if (isset($pdo) && $mode === 'replace') {
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        }
        throw $e;
    }
}

try {
    header('Content-Type: application/json');
    
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

    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'getTables':
            if (!isset($_POST['columns'])) {
                throw new Exception('Parametro columns mancante');
            }
            $result = handleGetTables($pdo);
            break;
            
        case 'save':
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('JSON non valido: ' . json_last_error_msg());
            }
            $result = handleSaveData($pdo, $input);
            break;
            
        default:
            throw new Exception('Azione non valida');
    }

    ob_clean();
    echo json_encode($result);

} catch (Exception $e) {
    error_log("Error in main handler: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    if (isset($pdo) && $pdo->inTransaction()) {
        try {
            $pdo->rollBack();
            error_log("Transaction rolled back successfully");
        } catch (Exception $e2) {
            error_log("Error during rollback: " . $e2->getMessage());
        }
    }
    
    if (isset($pdo)) {
        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        } catch (Exception $e2) {
            error_log("Error resetting foreign key checks: " . $e2->getMessage());
        }
    }
    
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

ob_end_flush();
