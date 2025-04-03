-- MySQL dump 10.13  Distrib 8.0.40, for Linux (x86_64)
--
-- Host: localhost    Database: WUP
-- ------------------------------------------------------
-- Server version	8.0.40-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `WUP`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `WUP` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `WUP`;

--
-- Table structure for table `Anagrafica`
--

DROP TABLE IF EXISTS `Anagrafica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Anagrafica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Nome_account` text COLLATE utf8mb4_unicode_ci,
  `SF_Region` text COLLATE utf8mb4_unicode_ci,
  `SF_District` text COLLATE utf8mb4_unicode_ci,
  `SF_Territory` text COLLATE utf8mb4_unicode_ci,
  `Tipo_di_record_account` text COLLATE utf8mb4_unicode_ci,
  `RRP_Segment` text COLLATE utf8mb4_unicode_ci,
  `Trade` text COLLATE utf8mb4_unicode_ci,
  `CAP_spedizioni` text COLLATE utf8mb4_unicode_ci,
  `Stato_Provincia_spedizioni` text COLLATE utf8mb4_unicode_ci,
  `Citt___spedizioni` text COLLATE utf8mb4_unicode_ci,
  `Indirizzo_spedizioni` text COLLATE utf8mb4_unicode_ci,
  `Telefono` text COLLATE utf8mb4_unicode_ci,
  `Mobile` text COLLATE utf8mb4_unicode_ci,
  `Email` text COLLATE utf8mb4_unicode_ci,
  `Field_Rep` text COLLATE utf8mb4_unicode_ci,
  `Numero_Field_Rep` text COLLATE utf8mb4_unicode_ci,
  `Supervisor` text COLLATE utf8mb4_unicode_ci,
  `Numero_Supervisor` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_record` (`Nome_account`(150),`SF_Region`(150),`SF_District`(150),`SF_Territory`(150),`Tipo_di_record_account`(150))
) ENGINE=InnoDB AUTO_INCREMENT=59585 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Cluster`
--

DROP TABLE IF EXISTS `Cluster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cluster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `TERRITORIO` text COLLATE utf8mb4_unicode_ci,
  `RRP_SEGMENT` text COLLATE utf8mb4_unicode_ci,
  `STATUS` text COLLATE utf8mb4_unicode_ci,
  `POS` text COLLATE utf8mb4_unicode_ci,
  `COSTUMER_ID` text COLLATE utf8mb4_unicode_ci,
  `SR_DR` text COLLATE utf8mb4_unicode_ci,
  `CEL` text COLLATE utf8mb4_unicode_ci,
  `ADDRESS` text COLLATE utf8mb4_unicode_ci,
  `PROV_` text COLLATE utf8mb4_unicode_ci,
  `CAP` text COLLATE utf8mb4_unicode_ci,
  `INSTALLER` text COLLATE utf8mb4_unicode_ci,
  `FIXTURE` text COLLATE utf8mb4_unicode_ci,
  `COD__FIXTURE` text COLLATE utf8mb4_unicode_ci,
  `FLOOR___WALL` text COLLATE utf8mb4_unicode_ci,
  `RIPIANI` text COLLATE utf8mb4_unicode_ci,
  `DISPOSIZONE_MODULI` text COLLATE utf8mb4_unicode_ci,
  `NOTE_AL_CODICE` text COLLATE utf8mb4_unicode_ci,
  `FA` text COLLATE utf8mb4_unicode_ci,
  `PO` text COLLATE utf8mb4_unicode_ci,
  `COD__VISIBILITY_BOX` text COLLATE utf8mb4_unicode_ci,
  `COD__STRUMENTO_VISIBILITA__N__1` text COLLATE utf8mb4_unicode_ci,
  `COD__STRUMENTO_VISIBILITA__N__2` text COLLATE utf8mb4_unicode_ci,
  `GT_KA` text COLLATE utf8mb4_unicode_ci,
  `DATA_SOPRALLUOGO` text COLLATE utf8mb4_unicode_ci,
  `SUPERVISOR_RE_PRESENTE` text COLLATE utf8mb4_unicode_ci,
  `DDT` text COLLATE utf8mb4_unicode_ci,
  `DATA_INSTALL__o_RITIRO_o_MANUT_` text COLLATE utf8mb4_unicode_ci,
  `ATTIVITA__EFFETTUATA` text COLLATE utf8mb4_unicode_ci,
  `DATA_PROSSIMA_ATTIVITA_` text COLLATE utf8mb4_unicode_ci,
  `ORA_PROSSIMA_ATTIVITA_` text COLLATE utf8mb4_unicode_ci,
  `NOTE_PM` text COLLATE utf8mb4_unicode_ci,
  `NOTE_ROL` text COLLATE utf8mb4_unicode_ci,
  `MODULO_60` text COLLATE utf8mb4_unicode_ci,
  `MODULO_90` text COLLATE utf8mb4_unicode_ci,
  `VISIBILITY_60` text COLLATE utf8mb4_unicode_ci,
  `VISIBILITY_90` text COLLATE utf8mb4_unicode_ci,
  `LIGHTBOX_60` text COLLATE utf8mb4_unicode_ci,
  `LIGHTBOX_90` text COLLATE utf8mb4_unicode_ci,
  `MONITOR_90` text COLLATE utf8mb4_unicode_ci,
  `MONITOR_60` text COLLATE utf8mb4_unicode_ci,
  `FIANCO` text COLLATE utf8mb4_unicode_ci,
  `LB_LOGO_FRES` text COLLATE utf8mb4_unicode_ci,
  `PROLUNGAMENTO` text COLLATE utf8mb4_unicode_ci,
  `MODULO_ILUMA` text COLLATE utf8mb4_unicode_ci,
  `CARDS` text COLLATE utf8mb4_unicode_ci,
  `PUSHER` text COLLATE utf8mb4_unicode_ci,
  `LIGHT_TOTEM` text COLLATE utf8mb4_unicode_ci,
  `WALL_TOTEM_60` text COLLATE utf8mb4_unicode_ci,
  `WALL_TOTEM_90` text COLLATE utf8mb4_unicode_ci,
  `COSTO` text COLLATE utf8mb4_unicode_ci,
  `EXTRA_NON_LAVORATIVO` text COLLATE utf8mb4_unicode_ci,
  `ALTRI_EXTRA` text COLLATE utf8mb4_unicode_ci,
  `empty_52` text COLLATE utf8mb4_unicode_ci,
  `TECNICO` text COLLATE utf8mb4_unicode_ci,
  `empty_54` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_record` (`TERRITORIO`(150),`RRP_SEGMENT`(150),`STATUS`(150),`POS`(150),`COSTUMER_ID`(150))
) ENGINE=InnoDB AUTO_INCREMENT=7257 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_descrizione_tabelle`
--

DROP TABLE IF EXISTS `t_descrizione_tabelle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_descrizione_tabelle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_tabella` varchar(255) NOT NULL,
  `nome_descrittivo` varchar(255) DEFAULT NULL,
  `descrizione` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_nome_tabella` (`nome_tabella`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_groups`
--

DROP TABLE IF EXISTS `t_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_menu_items`
--

DROP TABLE IF EXISTS `t_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_menu_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `menu_type` enum('main','sidebar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_menu_items_parent` (`parent_id`),
  CONSTRAINT `t_menu_items_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `t_menu_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_permissions`
--

DROP TABLE IF EXISTS `t_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int DEFAULT NULL,
  `menu_item_id` int DEFAULT NULL,
  `can_view` tinyint(1) DEFAULT '0',
  `can_edit` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_permissions_group` (`group_id`),
  KEY `idx_permissions_menu_item` (`menu_item_id`),
  CONSTRAINT `t_permissions_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `t_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `t_permissions_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `t_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_query`
--

DROP TABLE IF EXISTS `t_query`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_query` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nome descrittivo della query',
  `description` text COMMENT 'Descrizione dettagliata dello scopo della query',
  `query_text` text NOT NULL COMMENT 'Testo della query SQL',
  `category` varchar(50) DEFAULT NULL COMMENT 'Categoria/tipologia della query',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(50) DEFAULT NULL COMMENT 'Utente che ha creato la query',
  `last_executed_at` timestamp NULL DEFAULT NULL COMMENT 'Ultimo utilizzo della query',
  `is_tab` tinyint(1) DEFAULT '0',
  `tab_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Archivio delle query SQL per il report ROL';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_table`
--

DROP TABLE IF EXISTS `t_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_table` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` int NOT NULL,
  `can_read` tinyint(1) DEFAULT '1',
  `can_write` tinyint(1) DEFAULT '0',
  `can_delete` tinyint(1) DEFAULT '0',
  `import_type` enum('raw','db') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `table_name` (`table_name`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_table_name` (`table_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_table_perm`
--

DROP TABLE IF EXISTS `t_table_perm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_table_perm` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `group_id` int NOT NULL,
  `perm_level` int NOT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_table_group_perm` (`table_name`,`group_id`,`perm_level`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_user_groups`
--

DROP TABLE IF EXISTS `t_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_user_groups` (
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `t_user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `t_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `t_user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `t_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_users`
--

DROP TABLE IF EXISTS `t_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_messages`
--

DROP TABLE IF EXISTS `whatsapp_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `local_timestamp` datetime NOT NULL,
  `message_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_body` text COLLATE utf8mb4_unicode_ci,
  `message_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_timestamp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_me` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_forwarded` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chat_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `quoted_msg_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quoted_msg_body` text COLLATE utf8mb4_unicode_ci,
  `quoted_msg_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_url` text COLLATE utf8mb4_unicode_ci,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`local_timestamp`),
  KEY `idx_from_number` (`from_number`),
  KEY `idx_message_type` (`message_type`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wup_contatti`
--

DROP TABLE IF EXISTS `wup_contatti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wup_contatti` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_contatto` varchar(100) DEFAULT NULL,
  `azienda` varchar(100) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `dataincontro` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wup_lista`
--

DROP TABLE IF EXISTS `wup_lista`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wup_lista` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_lista` varchar(100) DEFAULT NULL,
  `id_contatto` int DEFAULT NULL,
  `messaggio` text,
  PRIMARY KEY (`id`),
  KEY `id_contatto` (`id_contatto`),
  CONSTRAINT `wup_lista_ibfk_1` FOREIGN KEY (`id_contatto`) REFERENCES `wup_contatti` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wup_msg_ricevuti`
--

DROP TABLE IF EXISTS `wup_msg_ricevuti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wup_msg_ricevuti` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data_ricezione` datetime DEFAULT NULL,
  `numero_mittente` varchar(20) DEFAULT NULL,
  `messaggio_ricevuto` text,
  `id_contatto` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_contatto` (`id_contatto`),
  CONSTRAINT `wup_msg_ricevuti_ibfk_1` FOREIGN KEY (`id_contatto`) REFERENCES `wup_contatti` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-04 17:44:46
