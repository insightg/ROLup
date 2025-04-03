<?php
// config/database.php

function getDBConnection() {
    $host = 'localhost';
    $dbname = 'WUP';
    $username = 'giobbe';
    $password = 'giobbe';  // Usa la stessa password che hai impostato nei comandi SQL

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        die('Errore di connessione al database: ' . $e->getMessage());
    }
}
