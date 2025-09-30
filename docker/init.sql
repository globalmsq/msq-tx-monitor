-- MSQ Transaction Monitor Database Schema
-- Prisma-compatible schema for transaction monitoring and analytics
-- This matches the Prisma schema in apps/tx-api/prisma/schema.prisma

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `msq-tx-monitor` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `msq-tx-monitor`;

-- =============================================================================
-- Token Model - MSQ ecosystem tokens
-- =============================================================================
CREATE TABLE `tokens` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(42) NOT NULL,
    `symbol` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `decimals` INT NOT NULL DEFAULT 18,
    `totalSupply` DECIMAL(38,0) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `tokens_address_key` (`address`),
    INDEX `tokens_symbol_idx` (`symbol`),
    INDEX `tokens_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert MSQ ecosystem tokens

-- =============================================================================
-- Transaction Model - Blockchain transaction records
-- =============================================================================
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `hash` VARCHAR(66) NOT NULL,
    `blockNumber` BIGINT NOT NULL,
    `transactionIndex` INT NOT NULL,
    `fromAddress` VARCHAR(42) NOT NULL,
    `toAddress` VARCHAR(42) NOT NULL,
    `value` DECIMAL(38,0) NOT NULL,
    `tokenAddress` VARCHAR(42) NOT NULL,
    `tokenSymbol` VARCHAR(10) NOT NULL,
    `tokenDecimals` INT NOT NULL DEFAULT 18,
    `gasUsed` BIGINT NULL,
    `gasPrice` BIGINT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `anomalyScore` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    `isAnomaly` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `transactions_hash_key` (`hash`),
    INDEX `transactions_blockNumber_idx` (`blockNumber`),
    INDEX `transactions_fromAddress_idx` (`fromAddress`),
    INDEX `transactions_toAddress_idx` (`toAddress`),
    INDEX `transactions_tokenAddress_idx` (`tokenAddress`),
    INDEX `transactions_tokenSymbol_idx` (`tokenSymbol`),
    INDEX `transactions_timestamp_idx` (`timestamp`),
    INDEX `transactions_isAnomaly_anomalyScore_idx` (`isAnomaly`, `anomalyScore`),
    INDEX `transactions_value_idx` (`value`),
    INDEX `transactions_fromAddress_tokenAddress_idx` (`fromAddress`, `tokenAddress`),
    INDEX `transactions_timestamp_tokenSymbol_idx` (`timestamp`, `tokenSymbol`)

    -- FOREIGN KEY (`tokenAddress`) REFERENCES `tokens`(`address`) ON UPDATE CASCADE (removed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- AddressStatistics Model - Aggregated statistics per address
-- =============================================================================
CREATE TABLE `address_statistics` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(42) NOT NULL,
    `tokenAddress` VARCHAR(42) NOT NULL,
    `totalSent` DECIMAL(38,0) NOT NULL DEFAULT 0,
    `totalReceived` DECIMAL(38,0) NOT NULL DEFAULT 0,
    `transactionCountSent` INT NOT NULL DEFAULT 0,
    `transactionCountReceived` INT NOT NULL DEFAULT 0,
    `firstSeen` DATETIME(3) NULL,
    `lastSeen` DATETIME(3) NULL,
    `avgTransactionSize` DECIMAL(38,6) NOT NULL DEFAULT 0,
    `avgTransactionSizeSent` DECIMAL(38,6) NOT NULL DEFAULT 0,
    `avgTransactionSizeReceived` DECIMAL(38,6) NOT NULL DEFAULT 0,
    `maxTransactionSize` DECIMAL(38,0) NOT NULL DEFAULT 0,
    `maxTransactionSizeSent` DECIMAL(38,0) NOT NULL DEFAULT 0,
    `maxTransactionSizeReceived` DECIMAL(38,0) NOT NULL DEFAULT 0,
    `riskScore` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    `isWhale` BOOLEAN NOT NULL DEFAULT false,
    `isSuspicious` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `behavioralFlags` JSON NULL,
    `lastActivityType` VARCHAR(20) NULL,
    `addressLabel` VARCHAR(100) NULL,
    `dormancyPeriod` INT NOT NULL DEFAULT 0,
    `velocityScore` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    `diversityScore` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `address_statistics_address_tokenAddress_key` (`address`, `tokenAddress`),
    INDEX `address_statistics_address_idx` (`address`),
    INDEX `address_statistics_tokenAddress_idx` (`tokenAddress`),
    INDEX `address_statistics_riskScore_idx` (`riskScore`),
    INDEX `address_statistics_isWhale_idx` (`isWhale`),
    INDEX `address_statistics_isSuspicious_idx` (`isSuspicious`),
    INDEX `address_statistics_isActive_idx` (`isActive`),
    INDEX `address_statistics_totalSent_idx` (`totalSent`),
    INDEX `address_statistics_totalReceived_idx` (`totalReceived`),
    INDEX `address_statistics_lastSeen_idx` (`lastSeen`),
    INDEX `address_statistics_dormancyPeriod_idx` (`dormancyPeriod`),
    INDEX `address_statistics_velocityScore_idx` (`velocityScore`),
    INDEX `address_statistics_diversityScore_idx` (`diversityScore`),
    INDEX `address_statistics_lastActivityType_idx` (`lastActivityType`),
    INDEX `address_statistics_avgTransactionSizeSent_idx` (`avgTransactionSizeSent`),
    INDEX `address_statistics_avgTransactionSizeReceived_idx` (`avgTransactionSizeReceived`),
    INDEX `address_statistics_riskScore_isWhale_idx` (`riskScore`, `isWhale`),
    INDEX `address_statistics_velocityScore_diversityScore_idx` (`velocityScore`, `diversityScore`)

    -- FOREIGN KEY (`tokenAddress`) REFERENCES `tokens`(`address`) ON UPDATE CASCADE (removed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Anomaly Model - Detected anomalies in transactions
-- =============================================================================
CREATE TABLE `anomalies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `transactionHash` VARCHAR(66) NOT NULL,
    `anomalyType` ENUM('VOLUME', 'FREQUENCY', 'BEHAVIORAL', 'PATTERN', 'TIME_BASED', 'WHALE') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `score` DECIMAL(5,4) NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed` BOOLEAN NOT NULL DEFAULT false,
    `reviewedBy` VARCHAR(100) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `falsePositive` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`),
    INDEX `anomalies_transactionHash_idx` (`transactionHash`),
    INDEX `anomalies_severity_idx` (`severity`),
    INDEX `anomalies_anomalyType_idx` (`anomalyType`),
    INDEX `anomalies_detectedAt_idx` (`detectedAt`),
    INDEX `anomalies_score_idx` (`score`),
    INDEX `anomalies_reviewed_idx` (`reviewed`),
    INDEX `anomalies_anomalyType_severity_idx` (`anomalyType`, `severity`)

    -- FOREIGN KEY (`transactionHash`) REFERENCES `transactions`(`hash`) ON UPDATE CASCADE ON DELETE CASCADE (removed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SystemStatistics Model - Cached system metrics
-- =============================================================================
CREATE TABLE `system_statistics` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `metricName` VARCHAR(100) NOT NULL,
    `metricValue` DECIMAL(38,6) NULL,
    `metricText` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `system_statistics_metricName_key` (`metricName`),
    INDEX `system_statistics_updatedAt_idx` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize MSQ ecosystem tokens
INSERT INTO `tokens` (`address`, `symbol`, `name`, `decimals`, `isActive`) VALUES
('0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499', 'MSQ', 'MSQUARE', 18, true),
('0x435001Af7fC65B621B0043df99810B2f30860c5d', 'KWT', 'Korean Won Token', 6, true),
('0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55', 'SUT', 'SUPER TRUST', 18, true),
('0x8B3C6ff5911392dECB5B08611822280dEe0E4f64', 'P2UC', 'Point to You Coin', 18, true);

-- Initialize system statistics
INSERT INTO `system_statistics` (`metricName`, `metricValue`) VALUES
('total_transactions', 0),
('total_addresses', 0),
('total_anomalies', 0),
('avg_transaction_size', 0),
('last_block_processed', 0);

-- =============================================================================
-- BlockProcessingStatus Model - Track blockchain sync status
-- =============================================================================
CREATE TABLE `block_processing_status` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `chainId` INT NOT NULL DEFAULT 137,
    `lastProcessedBlock` BIGINT NOT NULL DEFAULT 0,
    `currentBlock` BIGINT NOT NULL DEFAULT 0,
    `isSyncing` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `errorCount` INT NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `block_processing_status_chainId_key` (`chainId`),
    INDEX `block_processing_status_chainId_idx` (`chainId`),
    INDEX `block_processing_status_lastProcessedBlock_idx` (`lastProcessedBlock`),
    INDEX `block_processing_status_isSyncing_idx` (`isSyncing`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Polygon block processing status
INSERT INTO `block_processing_status` (`chainId`, `lastProcessedBlock`, `currentBlock`) VALUES (137, 0, 0);

COMMIT;