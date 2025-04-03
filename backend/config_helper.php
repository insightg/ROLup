<?php
/**
 * Helper per la gestione della configurazione basata sul dominio
 */

/**
 * Carica la configurazione in base al dominio corrente
 * @return array Configurazione caricata
 * @throws Exception Se il file di configurazione non è trovato o non può essere letto
 */
function loadConfig() {
    // Estrai l'host dalla richiesta e rimuovi la porta se presente
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $host = preg_replace('/:\d+$/', '', $host); // Rimuove la porta se presente

    // Determina quale configurazione usare
    $domainParts = explode('.', $host);
    $thirdLevelDomain = $domainParts[0];

    // Percorso configurazione specifica per dominio
    $configPath = __DIR__ . "/../config/{$thirdLevelDomain}/config.ini";

    // Percorso configurazione di default
    $defaultConfigPath = __DIR__ . "/../config/default/config.ini";

    // Se non esiste la configurazione per questo dominio, prova con default
    if (!file_exists($configPath)) {
        // Log per diagnostica
        error_log("Config file not found at {$configPath}, trying default");
        
        if (file_exists($defaultConfigPath)) {
            $configPath = $defaultConfigPath;
        } else {
            // Log dettagliato sull'errore
            error_log("Configuration file not found. Host: {$host}, Domain parts: " . print_r($domainParts, true));
            throw new Exception("Configuration file not found for {$thirdLevelDomain}");
        }
    }

    $config = parse_ini_file($configPath, true);
    if (!$config) {
        throw new Exception('Error parsing configuration file');
    }

    return $config;
}

/**
 * Ottiene il dominio di terzo livello corrente
 * @return string Dominio di terzo livello
 */
function getThirdLevelDomain() {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $host = preg_replace('/:\d+$/', '', $host); // Rimuove la porta se presente
    $domainParts = explode('.', $host);
    return $domainParts[0];
}