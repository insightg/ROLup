-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Creato il: Feb 03, 2025 alle 11:54
-- Versione del server: 8.0.41-0ubuntu0.24.04.1
-- Versione PHP: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ROL`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_anagrafica`
--

CREATE TABLE `tsis_anagrafica` (
  `id` int NOT NULL,
  `nome_account` varchar(255) DEFAULT NULL,
  `sf_region` varchar(255) DEFAULT NULL,
  `sf_district` varchar(255) DEFAULT NULL,
  `sf_territory` varchar(255) DEFAULT NULL,
  `tipo_di_record_account` varchar(255) DEFAULT NULL,
  `rrp_segment` varchar(255) DEFAULT NULL,
  `trade` varchar(255) DEFAULT NULL,
  `cap_spedizioni` varchar(255) DEFAULT NULL,
  `statoprovincia_spedizioni` varchar(255) DEFAULT NULL,
  `citt_spedizioni` varchar(255) DEFAULT NULL,
  `indirizzo_spedizioni` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `field_rep` varchar(255) DEFAULT NULL,
  `numero_field_rep` varchar(255) DEFAULT NULL,
  `supervisor` varchar(255) DEFAULT NULL,
  `numero_supervisor` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_attivita_ordine_pos`
--

CREATE TABLE `tsis_attivita_ordine_pos` (
  `id` int NOT NULL,
  `codice` varchar(50) NOT NULL,
  `descrizione` text,
  `attivo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_creazione` datetime DEFAULT CURRENT_TIMESTAMP,
  `utente_creazione` int DEFAULT NULL,
  `data_modifica` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `utente_modifica` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_import_log`
--

CREATE TABLE `tsis_import_log` (
  `id` int NOT NULL,
  `tipo_importazione` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totale_record` int NOT NULL DEFAULT '0',
  `record_importati` int DEFAULT '0',
  `record_aggiornati` int DEFAULT '0',
  `record_errori` int DEFAULT '0',
  `stato` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dettaglio_errori` text COLLATE utf8mb4_unicode_ci,
  `utente_id` int DEFAULT NULL,
  `data_inizio` datetime NOT NULL,
  `data_completamento` datetime DEFAULT NULL,
  `tempo_esecuzione` int DEFAULT '0',
  `dimensione_file` int DEFAULT '0',
  `note` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pm`
--

CREATE TABLE `tsis_pm` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `area_competenza` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_pos_assegnabili` int DEFAULT '50',
  `note` text COLLATE utf8mb4_unicode_ci,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_modifica` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_documents`
--

CREATE TABLE `tsis_pos_documents` (
  `id` int NOT NULL,
  `pos_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `activity_id` int DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(512) NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `description` text,
  `created_by` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `allow_group_read` tinyint(1) DEFAULT '0',
  `allow_group_delete` tinyint(1) DEFAULT '0',
  `allow_all_read` tinyint(1) DEFAULT '0',
  `allow_all_delete` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_imports`
--

CREATE TABLE `tsis_pos_imports` (
  `id` int NOT NULL,
  `nome_documento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_file_salvato` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percorso_file` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `importato_da` int NOT NULL,
  `numero_pos` int DEFAULT '0',
  `stato` enum('nuovo','in_corso','completato','completato_con_errori','errore') COLLATE utf8mb4_unicode_ci DEFAULT 'nuovo',
  `note_importazione` text COLLATE utf8mb4_unicode_ci,
  `data_inizio` datetime DEFAULT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_completamento` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_log`
--

CREATE TABLE `tsis_pos_log` (
  `id` bigint NOT NULL,
  `pos_id` bigint NOT NULL,
  `tipo_operazione` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dati_precedenti` text COLLATE utf8mb4_unicode_ci,
  `motivo_operazione` text COLLATE utf8mb4_unicode_ci,
  `utente_id` bigint DEFAULT NULL,
  `data_operazione` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_management`
--

CREATE TABLE `tsis_pos_management` (
  `id` int NOT NULL,
  `import_id` int NOT NULL,
  `pos_id` int NOT NULL,
  `pm_id` int DEFAULT NULL,
  `stato` enum('nuovo','assegnato','in_lavorazione','standby','non_lavorabile','completato') COLLATE utf8mb4_unicode_ci DEFAULT 'nuovo',
  `motivo_standby` text COLLATE utf8mb4_unicode_ci,
  `motivo_rifiuto` text COLLATE utf8mb4_unicode_ci,
  `commenti_cliente` text COLLATE utf8mb4_unicode_ci,
  `commenti_interni` text COLLATE utf8mb4_unicode_ci,
  `data_assegnazione` datetime DEFAULT NULL,
  `data_inizio_lavorazione` datetime DEFAULT NULL,
  `data_ultimo_stato` datetime DEFAULT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_modifica` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `tipo_attivita_id` int DEFAULT NULL,
  `data_ordine` date DEFAULT NULL,
  `codice_ordine` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codice_po_fornitore` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_tasks`
--

CREATE TABLE `tsis_pos_tasks` (
  `id` int NOT NULL,
  `pos_order_id` int NOT NULL,
  `pos_id` int NOT NULL,
  `tipo_task_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','in_progress','completed','blocked') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `task_order` int DEFAULT '0',
  `assignee_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_task_history`
--

CREATE TABLE `tsis_pos_task_history` (
  `id` int NOT NULL,
  `task_id` int NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_by` int NOT NULL,
  `action_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `details` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_task_parents`
--

CREATE TABLE `tsis_pos_task_parents` (
  `id` int NOT NULL,
  `task_id` int NOT NULL,
  `parent_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `tsis_pos_task_templates`
--

CREATE TABLE `tsis_pos_task_templates` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `tipo_attivita_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `template_data` json NOT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `t_groups`
--

CREATE TABLE `t_groups` (
  `id` int NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `t_users`
--

CREATE TABLE `t_users` (
  `id` int NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `t_user_groups`
--

CREATE TABLE `t_user_groups` (
  `user_id` int NOT NULL,
  `group_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `tsis_anagrafica`
--
ALTER TABLE `tsis_anagrafica`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_nome_account` (`nome_account`),
  ADD KEY `idx_region` (`sf_region`),
  ADD KEY `idx_district` (`sf_district`),
  ADD KEY `idx_territory` (`sf_territory`),
  ADD KEY `idx_rrp_segment` (`rrp_segment`);

--
-- Indici per le tabelle `tsis_attivita_ordine_pos`
--
ALTER TABLE `tsis_attivita_ordine_pos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codice` (`codice`),
  ADD KEY `utente_creazione` (`utente_creazione`),
  ADD KEY `utente_modifica` (`utente_modifica`);

--
-- Indici per le tabelle `tsis_import_log`
--
ALTER TABLE `tsis_import_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utente_id` (`utente_id`),
  ADD KEY `idx_import_log_tipo` (`tipo_importazione`),
  ADD KEY `idx_import_log_data` (`data_inizio`),
  ADD KEY `idx_import_log_stato` (`stato`);

--
-- Indici per le tabelle `tsis_pm`
--
ALTER TABLE `tsis_pm`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pm_user` (`user_id`);

--
-- Indici per le tabelle `tsis_pos_documents`
--
ALTER TABLE `tsis_pos_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tsis_pos_documents_ibfk_1` (`pos_id`),
  ADD KEY `tsis_pos_documents_ibfk_2` (`created_by`),
  ADD KEY `tsis_pos_documents_ibfk_3` (`group_id`);

--
-- Indici per le tabelle `tsis_pos_imports`
--
ALTER TABLE `tsis_pos_imports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tsis_pos_imports_ibfk_1` (`importato_da`);

--
-- Indici per le tabelle `tsis_pos_log`
--
ALTER TABLE `tsis_pos_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pos_id` (`pos_id`),
  ADD KEY `idx_utente_id` (`utente_id`),
  ADD KEY `idx_data_operazione` (`data_operazione`);

--
-- Indici per le tabelle `tsis_pos_management`
--
ALTER TABLE `tsis_pos_management`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pos_stato` (`stato`),
  ADD KEY `idx_pos_pm` (`pm_id`),
  ADD KEY `idx_pos_date` (`data_assegnazione`,`data_ultimo_stato`),
  ADD KEY `idx_codice_po_fornitore` (`codice_po_fornitore`),
  ADD KEY `tsis_pos_management_ibfk_1` (`import_id`),
  ADD KEY `fk_tipo_attivita` (`tipo_attivita_id`);

--
-- Indici per le tabelle `tsis_pos_tasks`
--
ALTER TABLE `tsis_pos_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_tasks_pos` (`pos_order_id`),
  ADD KEY `idx_tasks_assignee` (`assignee_id`),
  ADD KEY `idx_tasks_status` (`status`),
  ADD KEY `idx_tasks_dates` (`start_date`,`due_date`),
  ADD KEY `fk_task_type` (`tipo_task_id`),
  ADD KEY `fk_task_pos` (`pos_id`);

--
-- Indici per le tabelle `tsis_pos_task_history`
--
ALTER TABLE `tsis_pos_task_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `action_by` (`action_by`),
  ADD KEY `idx_task_history_dates` (`action_date`);

--
-- Indici per le tabelle `tsis_pos_task_parents`
--
ALTER TABLE `tsis_pos_task_parents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_parent` (`task_id`,`parent_id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indici per le tabelle `tsis_pos_task_templates`
--
ALTER TABLE `tsis_pos_task_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tipo_attivita_id` (`tipo_attivita_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indici per le tabelle `t_groups`
--
ALTER TABLE `t_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indici per le tabelle `t_users`
--
ALTER TABLE `t_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_username` (`username`),
  ADD KEY `idx_users_email` (`email`);

--
-- Indici per le tabelle `t_user_groups`
--
ALTER TABLE `t_user_groups`
  ADD PRIMARY KEY (`user_id`,`group_id`),
  ADD KEY `group_id` (`group_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `tsis_anagrafica`
--
ALTER TABLE `tsis_anagrafica`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_attivita_ordine_pos`
--
ALTER TABLE `tsis_attivita_ordine_pos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_import_log`
--
ALTER TABLE `tsis_import_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pm`
--
ALTER TABLE `tsis_pm`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_documents`
--
ALTER TABLE `tsis_pos_documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_imports`
--
ALTER TABLE `tsis_pos_imports`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_log`
--
ALTER TABLE `tsis_pos_log`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_management`
--
ALTER TABLE `tsis_pos_management`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_tasks`
--
ALTER TABLE `tsis_pos_tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_task_history`
--
ALTER TABLE `tsis_pos_task_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_task_parents`
--
ALTER TABLE `tsis_pos_task_parents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `tsis_pos_task_templates`
--
ALTER TABLE `tsis_pos_task_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `t_groups`
--
ALTER TABLE `t_groups`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `t_users`
--
ALTER TABLE `t_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `tsis_attivita_ordine_pos`
--
ALTER TABLE `tsis_attivita_ordine_pos`
  ADD CONSTRAINT `tsis_attivita_ordine_pos_ibfk_1` FOREIGN KEY (`utente_creazione`) REFERENCES `t_users` (`id`),
  ADD CONSTRAINT `tsis_attivita_ordine_pos_ibfk_2` FOREIGN KEY (`utente_modifica`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_import_log`
--
ALTER TABLE `tsis_import_log`
  ADD CONSTRAINT `tsis_import_log_ibfk_1` FOREIGN KEY (`utente_id`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_pm`
--
ALTER TABLE `tsis_pm`
  ADD CONSTRAINT `tsis_pm_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_pos_documents`
--
ALTER TABLE `tsis_pos_documents`
  ADD CONSTRAINT `tsis_pos_documents_ibfk_1` FOREIGN KEY (`pos_id`) REFERENCES `tsis_pos_management` (`id`),
  ADD CONSTRAINT `tsis_pos_documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `t_users` (`id`),
  ADD CONSTRAINT `tsis_pos_documents_ibfk_3` FOREIGN KEY (`group_id`) REFERENCES `t_groups` (`id`);

--
-- Limiti per la tabella `tsis_pos_imports`
--
ALTER TABLE `tsis_pos_imports`
  ADD CONSTRAINT `tsis_pos_imports_ibfk_1` FOREIGN KEY (`importato_da`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_pos_management`
--
ALTER TABLE `tsis_pos_management`
  ADD CONSTRAINT `fk_tipo_attivita` FOREIGN KEY (`tipo_attivita_id`) REFERENCES `tsis_attivita_ordine_pos` (`id`),
  ADD CONSTRAINT `tsis_pos_management_ibfk_1` FOREIGN KEY (`import_id`) REFERENCES `tsis_pos_imports` (`id`),
  ADD CONSTRAINT `tsis_pos_management_ibfk_2` FOREIGN KEY (`pm_id`) REFERENCES `tsis_pm` (`id`);

--
-- Limiti per la tabella `tsis_pos_tasks`
--
ALTER TABLE `tsis_pos_tasks`
  ADD CONSTRAINT `fk_task_order` FOREIGN KEY (`pos_order_id`) REFERENCES `tsis_pos_management` (`id`),
  ADD CONSTRAINT `fk_task_pos` FOREIGN KEY (`pos_id`) REFERENCES `tsis_anagrafica` (`id`),
  ADD CONSTRAINT `fk_task_type` FOREIGN KEY (`tipo_task_id`) REFERENCES `tsis_task_types` (`id`),
  ADD CONSTRAINT `tsis_pos_tasks_ibfk_1` FOREIGN KEY (`pos_order_id`) REFERENCES `tsis_pos_management` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tsis_pos_tasks_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `tsis_pos_tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tsis_pos_tasks_ibfk_3` FOREIGN KEY (`assignee_id`) REFERENCES `t_users` (`id`),
  ADD CONSTRAINT `tsis_pos_tasks_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `t_users` (`id`),
  ADD CONSTRAINT `tsis_pos_tasks_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_pos_task_history`
--
ALTER TABLE `tsis_pos_task_history`
  ADD CONSTRAINT `tsis_pos_task_history_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tsis_pos_tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tsis_pos_task_history_ibfk_2` FOREIGN KEY (`action_by`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `tsis_pos_task_parents`
--
ALTER TABLE `tsis_pos_task_parents`
  ADD CONSTRAINT `tsis_pos_task_parents_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tsis_pos_tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tsis_pos_task_parents_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `tsis_pos_tasks` (`id`) ON DELETE CASCADE;

--
-- Limiti per la tabella `tsis_pos_task_templates`
--
ALTER TABLE `tsis_pos_task_templates`
  ADD CONSTRAINT `tsis_pos_task_templates_ibfk_1` FOREIGN KEY (`tipo_attivita_id`) REFERENCES `tsis_attivita_ordine_pos` (`id`),
  ADD CONSTRAINT `tsis_pos_task_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `t_users` (`id`),
  ADD CONSTRAINT `tsis_pos_task_templates_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `t_users` (`id`);

--
-- Limiti per la tabella `t_user_groups`
--
ALTER TABLE `t_user_groups`
  ADD CONSTRAINT `t_user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `t_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `t_user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `t_groups` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
