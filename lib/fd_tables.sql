-- =============================================
-- GrowViax FD Investment Platform - Database Schema
-- Run this SQL in phpMyAdmin (XAMPP)
-- Database: growviax
-- =============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table: fd_users (Independent FD user accounts)
-- --------------------------------------------------------

CREATE TABLE `fd_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `wallet_balance` decimal(18,2) DEFAULT 0.00,
  `total_deposited` decimal(20,2) DEFAULT 0.00,
  `referral_code` varchar(20) NOT NULL,
  `referred_by` varchar(20) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `is_verified` tinyint(1) DEFAULT 0,
  `is_blocked` tinyint(1) DEFAULT 0,
  `profit_sharing_enabled` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `referral_code` (`referral_code`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_deposits (FD investment records)
-- --------------------------------------------------------

CREATE TABLE `fd_deposits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(18,2) NOT NULL COMMENT 'Invested amount (INR)',
  `monthly_rate` decimal(6,4) NOT NULL DEFAULT 5.0000 COMMENT 'Monthly return rate %',
  `duration_days` int(11) NOT NULL DEFAULT 60 COMMENT 'Lock-in period in days',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `phase` enum('phase1_active','phase1_completed','phase2_sharing','expired') DEFAULT 'phase1_active',
  `status` enum('active','completed','withdrawn','cancelled') DEFAULT 'active',
  `total_earned` decimal(18,2) DEFAULT 0.00 COMMENT 'Total profit earned in Phase 1',
  `profit_sharing_eligible` tinyint(1) DEFAULT 0,
  `profit_sharing_expiry` date DEFAULT NULL COMMENT '1 year from FD completion',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_phase` (`phase`),
  KEY `idx_status` (`status`),
  KEY `idx_end_date` (`end_date`),
  CONSTRAINT `fd_deposits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_profit_logs (Phase 1 monthly profit credits)
-- --------------------------------------------------------

CREATE TABLE `fd_profit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fd_deposit_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `month_number` int(11) NOT NULL COMMENT '1 or 2',
  `amount` decimal(18,2) NOT NULL COMMENT 'Profit credited',
  `credited_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fd_deposit` (`fd_deposit_id`),
  KEY `idx_user` (`user_id`),
  UNIQUE KEY `uk_fd_month` (`fd_deposit_id`, `month_number`),
  CONSTRAINT `fd_profit_logs_ibfk_1` FOREIGN KEY (`fd_deposit_id`) REFERENCES `fd_deposits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fd_profit_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_profit_distributions (Admin profit sharing rounds)
-- --------------------------------------------------------

CREATE TABLE `fd_profit_distributions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_profit` decimal(18,2) NOT NULL COMMENT 'Total company profit for the period',
  `distribution_percentage` decimal(6,2) NOT NULL COMMENT '% of profit to distribute',
  `pool_amount` decimal(18,2) NOT NULL COMMENT 'Actual amount distributed (profit * %)',
  `eligible_users_count` int(11) DEFAULT 0,
  `total_eligible_investment` decimal(18,2) DEFAULT 0.00 COMMENT 'Sum of all eligible users FD amounts',
  `distribution_month` varchar(7) NOT NULL COMMENT 'YYYY-MM format',
  `status` enum('pending','distributed','cancelled') DEFAULT 'pending',
  `distributed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `admin_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_month` (`distribution_month`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_user_profit_shares (Per-user share from each distribution)
-- --------------------------------------------------------

CREATE TABLE `fd_user_profit_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `distribution_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `fd_deposit_id` int(11) NOT NULL,
  `investment_amount` decimal(18,2) NOT NULL COMMENT 'User FD amount used for calculation',
  `share_percentage` decimal(8,4) NOT NULL COMMENT 'User share % of total pool',
  `amount` decimal(18,2) NOT NULL COMMENT 'Actual amount credited',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_distribution` (`distribution_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fd_user_profit_shares_ibfk_1` FOREIGN KEY (`distribution_id`) REFERENCES `fd_profit_distributions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fd_user_profit_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fd_user_profit_shares_ibfk_3` FOREIGN KEY (`fd_deposit_id`) REFERENCES `fd_deposits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_transactions (FD wallet transactions)
-- --------------------------------------------------------

CREATE TABLE `fd_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('deposit','withdrawal','fd_invest','fd_return','fd_profit','profit_share','admin_adjustment') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `wallet_address` varchar(200) DEFAULT NULL,
  `status` enum('pending','completed','rejected') DEFAULT 'pending',
  `tx_hash` varchar(200) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `network` varchar(50) DEFAULT 'BEP20',
  `inr_amount` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_type` (`user_id`, `type`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fd_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_deposit_requests (USDT/UPI deposit requests)
-- --------------------------------------------------------

CREATE TABLE `fd_deposit_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `deposit_type` enum('usdt','upi') NOT NULL,
  `amount` decimal(18,2) DEFAULT 0.00,
  `wallet_address` varchar(200) DEFAULT NULL,
  `tx_hash` varchar(200) DEFAULT NULL,
  `upi_id` varchar(200) DEFAULT NULL,
  `utr_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected','expired') DEFAULT 'pending',
  `admin_id` int(11) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tx_hash` (`tx_hash`),
  UNIQUE KEY `uk_utr_number` (`utr_number`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fd_deposit_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_settings (FD platform settings)
-- --------------------------------------------------------

CREATE TABLE `fd_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default FD settings
INSERT INTO `fd_settings` (`setting_key`, `setting_value`) VALUES
('fd_monthly_rate', '5'),
('fd_duration_days', '60'),
('fd_min_investment', '1000'),
('fd_max_investment', '50000'),
('profit_sharing_enabled', '1'),
('profit_sharing_duration_months', '12'),
('min_deposit_usdt', '10'),
('min_deposit_upi', '1000'),
('usd_to_inr_rate', '98');

-- --------------------------------------------------------
-- Table: fd_support_tickets
-- --------------------------------------------------------

CREATE TABLE `fd_support_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `status` enum('open','in_progress','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fd_support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fd_ticket_replies
-- --------------------------------------------------------

CREATE TABLE `fd_ticket_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`),
  CONSTRAINT `fd_ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `fd_support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
