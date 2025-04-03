<?php
function getConfigDB() {
    $configFile = '../config/' . explode('.', $_SERVER['HTTP_HOST'])[0] . '/config.ini';
    if (!file_exists($configFile)) {
        throw new Exception('Config file not found');
    }
    
    $config = parse_ini_file($configFile, true);
    if (!$config) {
        throw new Exception('Error parsing config file');
    }

    return [
        'host' => $config['database']['host'],
        'dbname' => $config['database']['dbname'],
        'user' => $config['database']['username'],
        'password' => $config['database']['password']
    ];
}

function getDashboardStats($pdo) {
    try {
        $pdo->exec("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        
        // Status Counts
        $statusStats = $pdo->query("
            SELECT 
                STATUS,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ClusterDONE), 1) as percentage
            FROM ClusterDONE 
            GROUP BY STATUS
            ORDER BY count DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Regional Stats
        $regionalStats = $pdo->query("
            SELECT 
                a.SFRegion as regione,
                COUNT(DISTINCT c.POS) as total_pos,
                COUNT(*) as total_activities,
                COUNT(CASE WHEN c.STATUS = 'Completate' THEN 1 END) as completed,
                COUNT(CASE WHEN c.STATUS = 'In Corso' THEN 1 END) as in_progress,
                COUNT(CASE WHEN c.STATUS = 'In Attesa' THEN 1 END) as pending,
                ROUND(AVG(CAST(c.COSTO AS DECIMAL(10,2))), 2) as avg_cost,
                ROUND(COUNT(CASE WHEN c.STATUS = 'Completate' THEN 1 END) * 100.0 / COUNT(*), 1) as completion_rate
            FROM ClusterDONE c
            LEFT JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE a.SFRegion IS NOT NULL
            GROUP BY a.SFRegion
            ORDER BY total_activities DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // District Stats
        $districtStats = $pdo->query("
            SELECT 
                a.SFDistrict as district,
                a.SFRegion as region,
                COUNT(DISTINCT c.POS) as total_pos,
                COUNT(*) as total_activities,
                COUNT(CASE WHEN c.STATUS = 'Completate' THEN 1 END) as completed,
                ROUND(COUNT(CASE WHEN c.STATUS = 'Completate' THEN 1 END) * 100.0 / COUNT(*), 1) as completion_rate
            FROM ClusterDONE c
            LEFT JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE a.SFDistrict IS NOT NULL
            GROUP BY a.SFDistrict, a.SFRegion
            ORDER BY total_activities DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Fixture Stats
        $fixtureStats = $pdo->query("
            SELECT 
                a.RRPSegment as segment,
                SUM(CASE WHEN c.MODULO60 != '' AND c.MODULO60 IS NOT NULL THEN 1 ELSE 0 END) as modulo60,
                SUM(CASE WHEN c.MODULO90 != '' AND c.MODULO90 IS NOT NULL THEN 1 ELSE 0 END) as modulo90,
                SUM(CASE WHEN c.VISIBILITY60 != '' AND c.VISIBILITY60 IS NOT NULL THEN 1 ELSE 0 END) as visibility60,
                SUM(CASE WHEN c.VISIBILITY90 != '' AND c.VISIBILITY90 IS NOT NULL THEN 1 ELSE 0 END) as visibility90
            FROM ClusterDONE c
            LEFT JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE a.RRPSegment IS NOT NULL
            GROUP BY a.RRPSegment
            ORDER BY segment
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Installer Performance
        $installerStats = $pdo->query("
            SELECT 
                c.INSTALLER as installer,
                COUNT(*) as total_installations,
                a.SFRegion as region,
                ROUND(AVG(CAST(c.COSTO AS DECIMAL(10,2))), 2) as avg_cost,
                ROUND(AVG(CASE 
                    WHEN c.DATAINSTALLoRITIROoMANUT IS NOT NULL 
                    THEN 1
                    ELSE NULL 
                END), 1) as avg_installation_days
            FROM ClusterDONE c
            LEFT JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE c.INSTALLER IS NOT NULL
            GROUP BY c.INSTALLER, a.SFRegion
            ORDER BY total_installations DESC
            LIMIT 20
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Economics Analysis
        $economicsStats = $pdo->query("
            SELECT 
                a.SFRegion as region,
                ROUND(AVG(CAST(c.COSTO AS DECIMAL(10,2))), 2) as avg_cost,
                COUNT(*) as total_activities,
                ROUND(SUM(CAST(c.COSTO AS DECIMAL(10,2))), 2) as total_cost,
                ROUND(MIN(CAST(c.COSTO AS DECIMAL(10,2))), 2) as min_cost,
                ROUND(MAX(CAST(c.COSTO AS DECIMAL(10,2))), 2) as max_cost
            FROM ClusterDONE c
            LEFT JOIN Anagrafica a ON c.POS = a.Nomeaccount
            WHERE c.COSTO IS NOT NULL AND c.COSTO != 0
            GROUP BY a.SFRegion
            ORDER BY total_cost DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        $pdo->exec("SET SESSION sql_mode=(SELECT @@sql_mode)");

        return [
            'statusStats' => $statusStats,
            'regionalStats' => $regionalStats,
            'districtStats' => $districtStats,
            'fixtureStats' => $fixtureStats,
            'installerStats' => $installerStats,
            'economicsStats' => $economicsStats
        ];

    } catch (Exception $e) {
        error_log("Errore nel recupero delle statistiche: " . $e->getMessage());
        throw $e;
    }
}