-- MSQ Transaction Monitor Database Schema
-- Initialize database with tables for transaction monitoring and analytics

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `msq_monitor` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `msq_monitor`;

-- =============================================================================
-- Token Contracts Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `tokens` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(42) NOT NULL UNIQUE,
    `symbol` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `decimals` INT(3) NOT NULL DEFAULT 18,
    `total_supply` DECIMAL(38,0) DEFAULT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_address` (`address`),
    INDEX `idx_symbol` (`symbol`),
    INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert MSQ ecosystem tokens
INSERT INTO `tokens` (`address`, `symbol`, `name`, `decimals`) VALUES
('0x0000000000000000000000000000000000000001', 'MSQ', 'MSQ Token', 18),
('0x0000000000000000000000000000000000000002', 'SUT', 'Stablecoin Utility Token', 18),
('0x0000000000000000000000000000000000000003', 'KWT', 'Kingdomware Token', 18),
('0x0000000000000000000000000000000000000004', 'P2UC', 'Pay2Use Coin', 18);

-- =============================================================================
-- Transactions Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `hash` VARCHAR(66) NOT NULL UNIQUE,
    `block_number` BIGINT(20) NOT NULL,
    `transaction_index` INT(11) NOT NULL,
    `from_address` VARCHAR(42) NOT NULL,
    `to_address` VARCHAR(42) NOT NULL,
    `value` DECIMAL(38,0) NOT NULL,
    `token_address` VARCHAR(42) NOT NULL,
    `token_symbol` VARCHAR(10) NOT NULL,
    `gas_used` BIGINT(20) DEFAULT NULL,
    `gas_price` BIGINT(20) DEFAULT NULL,
    `timestamp` TIMESTAMP NOT NULL,
    `anomaly_score` DECIMAL(5,4) DEFAULT 0.0000,
    `is_anomaly` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_hash` (`hash`),
    INDEX `idx_block_number` (`block_number`),
    INDEX `idx_from_address` (`from_address`),
    INDEX `idx_to_address` (`to_address`),
    INDEX `idx_token_address` (`token_address`),
    INDEX `idx_token_symbol` (`token_symbol`),
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_anomaly` (`is_anomaly`, `anomaly_score`),
    INDEX `idx_value` (`value`),
    INDEX `idx_composite_address_token` (`from_address`, `token_address`),
    INDEX `idx_composite_time_token` (`timestamp`, `token_symbol`),
    FOREIGN KEY (`token_address`) REFERENCES `tokens`(`address`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Address Statistics Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `address_statistics` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(42) NOT NULL,
    `token_address` VARCHAR(42) NOT NULL,
    `total_sent` DECIMAL(38,0) DEFAULT 0,
    `total_received` DECIMAL(38,0) DEFAULT 0,
    `transaction_count_sent` INT(11) DEFAULT 0,
    `transaction_count_received` INT(11) DEFAULT 0,
    `first_seen` TIMESTAMP NULL DEFAULT NULL,
    `last_seen` TIMESTAMP NULL DEFAULT NULL,
    `avg_transaction_size` DECIMAL(38,6) DEFAULT 0,
    `max_transaction_size` DECIMAL(38,0) DEFAULT 0,
    `risk_score` DECIMAL(5,4) DEFAULT 0.0000,
    `is_whale` BOOLEAN DEFAULT FALSE,
    `is_suspicious` BOOLEAN DEFAULT FALSE,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_address_token` (`address`, `token_address`),
    INDEX `idx_address` (`address`),
    INDEX `idx_token_address` (`token_address`),
    INDEX `idx_risk_score` (`risk_score`),
    INDEX `idx_whale` (`is_whale`),
    INDEX `idx_suspicious` (`is_suspicious`),
    INDEX `idx_total_sent` (`total_sent`),
    INDEX `idx_total_received` (`total_received`),
    INDEX `idx_last_seen` (`last_seen`),
    FOREIGN KEY (`token_address`) REFERENCES `tokens`(`address`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Anomalies Detection Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `anomalies` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
    `transaction_hash` VARCHAR(66) NOT NULL,
    `anomaly_type` ENUM('volume', 'frequency', 'behavioral', 'pattern', 'time_based', 'whale') NOT NULL,
    `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    `score` DECIMAL(5,4) NOT NULL,
    `description` TEXT,
    `metadata` JSON,
    `detected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reviewed` BOOLEAN DEFAULT FALSE,
    `reviewed_by` VARCHAR(100) DEFAULT NULL,
    `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
    `false_positive` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`id`),
    INDEX `idx_transaction_hash` (`transaction_hash`),
    INDEX `idx_severity` (`severity`),
    INDEX `idx_type` (`anomaly_type`),
    INDEX `idx_detected` (`detected_at`),
    INDEX `idx_score` (`score`),
    INDEX `idx_reviewed` (`reviewed`),
    INDEX `idx_composite_type_severity` (`anomaly_type`, `severity`),
    FOREIGN KEY (`transaction_hash`) REFERENCES `transactions`(`hash`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- System Statistics Table (for caching)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `system_statistics` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `metric_name` VARCHAR(100) NOT NULL UNIQUE,
    `metric_value` DECIMAL(38,6) DEFAULT NULL,
    `metric_text` TEXT DEFAULT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_metric` (`metric_name`),
    INDEX `idx_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize system statistics
INSERT INTO `system_statistics` (`metric_name`, `metric_value`) VALUES
('total_transactions', 0),
('total_addresses', 0),
('total_anomalies', 0),
('avg_transaction_size', 0),
('last_block_processed', 0);

-- =============================================================================
-- Block Processing Status Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `block_processing_status` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `chain_id` INT(11) NOT NULL DEFAULT 137, -- Polygon mainnet
    `last_processed_block` BIGINT(20) NOT NULL DEFAULT 0,
    `current_block` BIGINT(20) NOT NULL DEFAULT 0,
    `is_syncing` BOOLEAN DEFAULT FALSE,
    `last_sync_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `error_count` INT(11) DEFAULT 0,
    `last_error` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_chain` (`chain_id`),
    INDEX `idx_chain_id` (`chain_id`),
    INDEX `idx_last_processed` (`last_processed_block`),
    INDEX `idx_syncing` (`is_syncing`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Polygon block processing status
INSERT INTO `block_processing_status` (`chain_id`, `last_processed_block`, `current_block`) VALUES (137, 0, 0);

-- =============================================================================
-- Views for Analytics
-- =============================================================================

-- View for transaction summary by token
CREATE OR REPLACE VIEW `v_transaction_summary` AS
SELECT
    t.token_symbol,
    t.token_address,
    COUNT(*) as transaction_count,
    SUM(t.value) as total_volume,
    AVG(t.value) as avg_transaction_size,
    MAX(t.value) as max_transaction_size,
    MIN(t.value) as min_transaction_size,
    COUNT(DISTINCT t.from_address) as unique_senders,
    COUNT(DISTINCT t.to_address) as unique_receivers,
    SUM(CASE WHEN t.is_anomaly = TRUE THEN 1 ELSE 0 END) as anomaly_count,
    DATE(t.timestamp) as transaction_date
FROM `transactions` t
GROUP BY t.token_symbol, t.token_address, DATE(t.timestamp)
ORDER BY transaction_date DESC, total_volume DESC;

-- View for top addresses by volume
CREATE OR REPLACE VIEW `v_top_addresses` AS
SELECT
    a.address,
    a.token_address,
    tokens.symbol as token_symbol,
    a.total_sent + a.total_received as total_volume,
    a.total_sent,
    a.total_received,
    a.transaction_count_sent + a.transaction_count_received as total_transactions,
    a.risk_score,
    a.is_whale,
    a.is_suspicious,
    a.last_seen
FROM `address_statistics` a
JOIN `tokens` ON a.token_address = tokens.address
ORDER BY total_volume DESC
LIMIT 1000;

-- View for recent anomalies
CREATE OR REPLACE VIEW `v_recent_anomalies` AS
SELECT
    a.id,
    a.transaction_hash,
    a.anomaly_type,
    a.severity,
    a.score,
    a.description,
    a.detected_at,
    t.from_address,
    t.to_address,
    t.value,
    t.token_symbol,
    t.timestamp as transaction_timestamp
FROM `anomalies` a
JOIN `transactions` t ON a.transaction_hash = t.hash
WHERE a.detected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY a.detected_at DESC, a.score DESC;

-- =============================================================================
-- Stored Procedures
-- =============================================================================

DELIMITER //

-- Update address statistics after transaction insert
CREATE OR REPLACE PROCEDURE UpdateAddressStatistics(
    IN p_from_address VARCHAR(42),
    IN p_to_address VARCHAR(42),
    IN p_token_address VARCHAR(42),
    IN p_value DECIMAL(38,0),
    IN p_timestamp TIMESTAMP
)
BEGIN
    -- Update sender statistics
    INSERT INTO address_statistics (address, token_address, total_sent, transaction_count_sent, first_seen, last_seen)
    VALUES (p_from_address, p_token_address, p_value, 1, p_timestamp, p_timestamp)
    ON DUPLICATE KEY UPDATE
        total_sent = total_sent + p_value,
        transaction_count_sent = transaction_count_sent + 1,
        first_seen = LEAST(first_seen, p_timestamp),
        last_seen = GREATEST(last_seen, p_timestamp);

    -- Update receiver statistics
    INSERT INTO address_statistics (address, token_address, total_received, transaction_count_received, first_seen, last_seen)
    VALUES (p_to_address, p_token_address, p_value, 1, p_timestamp, p_timestamp)
    ON DUPLICATE KEY UPDATE
        total_received = total_received + p_value,
        transaction_count_received = transaction_count_received + 1,
        first_seen = LEAST(first_seen, p_timestamp),
        last_seen = GREATEST(last_seen, p_timestamp);

    -- Update average transaction size and max transaction size
    UPDATE address_statistics
    SET
        avg_transaction_size = (total_sent + total_received) / (transaction_count_sent + transaction_count_received),
        max_transaction_size = GREATEST(max_transaction_size, p_value),
        is_whale = CASE WHEN (total_sent + total_received) > 1000000000000000000000000 THEN TRUE ELSE FALSE END -- 1M tokens
    WHERE address IN (p_from_address, p_to_address) AND token_address = p_token_address;
END//

DELIMITER ;

-- =============================================================================
-- Triggers
-- =============================================================================

DELIMITER //

-- Trigger to update address statistics on transaction insert
CREATE OR REPLACE TRIGGER tr_transaction_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    CALL UpdateAddressStatistics(NEW.from_address, NEW.to_address, NEW.token_address, NEW.value, NEW.timestamp);

    -- Update system statistics
    UPDATE system_statistics SET
        metric_value = metric_value + 1
    WHERE metric_name = 'total_transactions';
END//

DELIMITER ;

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Additional composite indexes for complex queries
CREATE INDEX IF NOT EXISTS `idx_transactions_time_token_value` ON `transactions` (`timestamp`, `token_symbol`, `value`);
CREATE INDEX IF NOT EXISTS `idx_transactions_anomaly_time` ON `transactions` (`is_anomaly`, `timestamp`);
CREATE INDEX IF NOT EXISTS `idx_address_stats_whale_score` ON `address_statistics` (`is_whale`, `risk_score`);
CREATE INDEX IF NOT EXISTS `idx_anomalies_type_severity_time` ON `anomalies` (`anomaly_type`, `severity`, `detected_at`);

COMMIT;