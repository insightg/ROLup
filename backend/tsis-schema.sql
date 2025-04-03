-- TSIS Core Tables
-- Note: Using existing t_users, t_groups, and t_user_groups tables for user management

-- Project Manager table with reference to t_users
CREATE TABLE tsis_pm (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    area_competenza VARCHAR(255),
    max_pos_assegnabili INT DEFAULT 50,
    note TEXT,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES t_users(id),
    INDEX idx_pm_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POS Import management
CREATE TABLE tsis_pos_imports (
    id INT NOT NULL AUTO_INCREMENT,
    nome_documento VARCHAR(255) NOT NULL,
    importato_da INT NOT NULL,
    numero_pos INT DEFAULT 0,
    stato ENUM('nuovo', 'in_elaborazione', 'completato', 'errore') DEFAULT 'nuovo',
    note_importazione TEXT,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_completamento DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (importato_da) REFERENCES t_users(id),
    INDEX idx_imports_stato (stato),
    INDEX idx_imports_data (data_creazione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POS Management
CREATE TABLE tsis_pos_management (
    id INT NOT NULL AUTO_INCREMENT,
    import_id INT NOT NULL,
    pos_id VARCHAR(50) NOT NULL,
    pm_id INT,
    stato ENUM(
        'nuovo',
        'assegnato',
        'in_lavorazione',
        'standby',
        'non_lavorabile',
        'completato'
    ) DEFAULT 'nuovo',
    motivo_standby TEXT,
    motivo_rifiuto TEXT,
    commenti_cliente TEXT,
    commenti_interni TEXT,
    data_assegnazione DATETIME,
    data_inizio_lavorazione DATETIME,
    data_ultimo_stato DATETIME,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (import_id) REFERENCES tsis_pos_imports(id),
    FOREIGN KEY (pm_id) REFERENCES tsis_pm(id),
    INDEX idx_pos_stato (stato),
    INDEX idx_pos_pm (pm_id),
    INDEX idx_pos_date (data_assegnazione, data_ultimo_stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Survey Configurations
CREATE TABLE tsis_survey_configurations (
    id INT NOT NULL AUTO_INCREMENT,
    pos_management_id INT NOT NULL,
    fixture VARCHAR(100),
    cod_fixture VARCHAR(100),
    floor_wall VARCHAR(10),
    ripiani INT,
    note_fixture TEXT,
    modulo_60 INT DEFAULT 0,
    modulo_90 INT DEFAULT 0,
    visibility_60 INT DEFAULT 0,
    visibility_90 INT DEFAULT 0,
    lightbox_60 INT DEFAULT 0,
    lightbox_90 INT DEFAULT 0,
    monitor_60 INT DEFAULT 0,
    monitor_90 INT DEFAULT 0,
    fianco INT DEFAULT 0,
    lb_logo_fres INT DEFAULT 0,
    prolungamento INT DEFAULT 0,
    modulo_iluma INT DEFAULT 0,
    cards INT DEFAULT 0,
    pusher INT DEFAULT 0,
    light_totem INT DEFAULT 0,
    wall_totem_60 INT DEFAULT 0,
    wall_totem_90 INT DEFAULT 0,
    stato ENUM('draft', 'pending_approval', 'approved', 'rejected') DEFAULT 'draft',
    approvato_da INT,
    data_approvazione DATETIME,
    note_approvazione TEXT,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (pos_management_id) REFERENCES tsis_pos_management(id),
    FOREIGN KEY (approvato_da) REFERENCES t_users(id),
    INDEX idx_survey_pos (pos_management_id),
    INDEX idx_survey_stato (stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document Types
CREATE TABLE tsis_document_types (
    id INT NOT NULL AUTO_INCREMENT,
    codice VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    fase VARCHAR(50) NOT NULL,
    formato_consentito VARCHAR(255),
    dimensione_max INT,
    obbligatorio BOOLEAN DEFAULT FALSE,
    multiple BOOLEAN DEFAULT FALSE,
    ruoli_abilitati VARCHAR(255),
    attivo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id),
    INDEX idx_doctype_fase (fase),
    INDEX idx_doctype_codice (codice)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents
CREATE TABLE tsis_documents (
    id INT NOT NULL AUTO_INCREMENT,
    tipo_id INT NOT NULL,
    pos_management_id INT NOT NULL,
    fase VARCHAR(50) NOT NULL,
    nome_originale VARCHAR(255) NOT NULL,
    nome_file VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    dimensione INT,
    caricato_da INT NOT NULL,
    note TEXT,
    data_caricamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (tipo_id) REFERENCES tsis_document_types(id),
    FOREIGN KEY (pos_management_id) REFERENCES tsis_pos_management(id),
    FOREIGN KEY (caricato_da) REFERENCES t_users(id),
    INDEX idx_docs_pos (pos_management_id),
    INDEX idx_docs_fase (fase),
    INDEX idx_docs_tipo (tipo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Views for reporting
CREATE OR REPLACE VIEW v_kpi_summary AS
SELECT 
    DATE_FORMAT(pm.data_creazione, '%Y-%m') AS mese,
    COUNT(DISTINCT pm.id) AS totale_pos,
    SUM(CASE WHEN pm.stato = 'completato' THEN 1 ELSE 0 END) AS pos_completati,
    SUM(CASE WHEN pm.stato = 'in_lavorazione' THEN 1 ELSE 0 END) AS pos_in_lavorazione,
    AVG(DATEDIFF(
        COALESCE(pm.data_ultimo_stato, CURRENT_TIMESTAMP), 
        pm.data_creazione
    )) AS tempo_medio_lavorazione
FROM tsis_pos_management pm
GROUP BY DATE_FORMAT(pm.data_creazione, '%Y-%m');

CREATE OR REPLACE VIEW v_pm_performance AS
SELECT 
    p.id AS pm_id,
    u.full_name AS pm_nome,
    COUNT(DISTINCT pm.id) AS pos_totali,
    SUM(CASE WHEN pm.stato = 'completato' THEN 1 ELSE 0 END) AS pos_completati,
    SUM(CASE WHEN pm.stato = 'in_lavorazione' THEN 1 ELSE 0 END) AS pos_in_lavorazione,
    AVG(DATEDIFF(
        CASE WHEN pm.stato = 'completato' 
        THEN pm.data_ultimo_stato 
        ELSE CURRENT_TIMESTAMP END,
        pm.data_assegnazione
    )) AS tempo_medio_completamento
FROM tsis_pm p
JOIN t_users u ON p.user_id = u.id
LEFT JOIN tsis_pos_management pm ON p.id = pm.pm_id
GROUP BY p.id, u.full_name;

-- Insert default document types
INSERT INTO tsis_document_types 
(codice, nome, fase, formato_consentito, dimensione_max, obbligatorio, multiple, ruoli_abilitati)
VALUES
('FOTO_SOPRALLUOGO', 'Foto Sopralluogo', 'sopralluogo', 'image/jpeg,image/png', 5242880, TRUE, TRUE, 'PM'),
('NOTE_TECNICHE', 'Note Tecniche', 'sopralluogo', 'application/pdf', 1048576, TRUE, FALSE, 'PM'),
('DISEGNO_TECNICO', 'Disegno Tecnico', 'configurazione', 'application/pdf,application/dxf', 2097152, TRUE, FALSE, 'PM'),
('APPROVAZIONE_CLIENTE', 'Approvazione Cliente', 'configurazione', 'application/pdf', 1048576, TRUE, FALSE, 'PM,COORDINATOR'),
('FOTO_INSTALLAZIONE', 'Foto Installazione', 'installazione', 'image/jpeg,image/png', 5242880, TRUE, TRUE, 'PM'),
('DDT', 'Documento di Trasporto', 'installazione', 'application/pdf', 1048576, TRUE, FALSE, 'PM'),
('CERTIFICATO', 'Certificato', 'installazione', 'application/pdf', 1048576, TRUE, FALSE, 'PM,COORDINATOR');