-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 26, 2026 at 05:11 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `growviax`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_activity_log`
--

CREATE TABLE `admin_activity_log` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `target_type` varchar(50) DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_activity_log`
--

INSERT INTO `admin_activity_log` (`id`, `admin_id`, `action_type`, `target_type`, `target_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'upi_add', 'upi_account', NULL, 'Added UPI: 7247623323@ptyes', NULL, '2026-03-15 06:54:48'),
(2, 1, 'deposit_reject', 'deposit_request', 1, 'Rejected deposit for user 1. Reason: No reason provided', NULL, '2026-03-15 07:01:55'),
(3, 1, 'deposit_approve', 'deposit_request', 2, 'Approved UPI deposit of 1000 for user 1', NULL, '2026-03-15 07:23:06'),
(4, 1, 'deposit_approve', 'deposit_request', 1, 'Approved USDT deposit of 1000 for user 1', NULL, '2026-03-15 07:23:11'),
(5, 1, 'deposit_approve', 'deposit_request', 3, 'Approved USDT deposit of 10 for user 2', NULL, '2026-03-15 13:04:06'),
(6, 1, 'deposit_approve', 'deposit_request', 4, 'Approved USDT deposit of 1000 for user 4', NULL, '2026-03-15 13:15:21'),
(7, 1, 'deposit_approve', 'deposit_request', 5, 'Approved USDT deposit: $10.00 → ₹980.00 for user 4', NULL, '2026-03-15 13:37:43'),
(8, 1, 'update_settings', 'referral_settings', NULL, '{\"referralBonusRate\":0.03}', NULL, '2026-03-16 14:56:19'),
(9, 1, 'update_settings', 'referral_settings', NULL, '{\"commissionLevels\":[{\"level\":1,\"rate\":0.008199999999999999},{\"level\":2,\"rate\":0.0034999999999999996},{\"level\":3,\"rate\":0.0017000000000000001},{\"level\":4,\"rate\":0.001},{\"level\":5,\"rate\":0.0007000000000000001},{\"level\":6,\"rate\":0.0004}]}', NULL, '2026-03-16 14:56:22');

-- --------------------------------------------------------

--
-- Table structure for table `admin_bet_overrides`
--

CREATE TABLE `admin_bet_overrides` (
  `id` int(11) NOT NULL,
  `bid_id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `admin_user_id` int(11) NOT NULL,
  `override_action` enum('force_win','force_loss','system_decide') NOT NULL,
  `applied` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bet_outcome_log`
--

CREATE TABLE `bet_outcome_log` (
  `id` int(11) NOT NULL,
  `bid_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `bet_amount` decimal(18,8) NOT NULL,
  `outcome` enum('win','loss') NOT NULL,
  `outcome_source` enum('new_user_bonus','admin_override','risk_engine','random','multi_bet') NOT NULL,
  `risk_score_at_time` decimal(6,4) DEFAULT NULL,
  `platform_exposure` decimal(18,8) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bet_outcome_log`
--

INSERT INTO `bet_outcome_log` (`id`, `bid_id`, `user_id`, `round_id`, `bet_amount`, `outcome`, `outcome_source`, `risk_score_at_time`, `platform_exposure`, `reason`, `created_at`) VALUES
(5, 15, 2, 11, 970.00000000, 'win', 'risk_engine', 0.5000, 1030.00000000, 'Risk engine: lossProbability=0.646, roll=0.791, winRate=0.000, exposure=1030', '2026-03-15 07:29:22'),
(6, 16, 2, 12, 970.00000000, 'loss', 'risk_engine', 0.9500, 90.00000000, 'Risk engine: lossProbability=0.689, roll=0.609, winRate=1.000, exposure=90', '2026-03-15 07:30:09'),
(7, 17, 2, 13, 97.00000000, 'win', 'new_user_bonus', 0.5015, 193.00000000, 'New user bonus win (bet 3/3)', '2026-03-15 07:30:58'),
(8, 18, 2, 14, 97.00000000, 'win', 'risk_engine', 0.6398, 99.00000000, 'Risk engine: lossProbability=0.627, roll=0.722, winRate=0.667, exposure=99', '2026-03-15 07:31:38'),
(9, 19, 2, 15, 97.00000000, 'loss', 'risk_engine', 0.7115, 5.00000000, 'Risk engine: lossProbability=0.900, roll=0.644, winRate=0.750, exposure=5', '2026-03-15 07:32:19'),
(10, 20, 2, 16, 970.00000000, 'loss', 'risk_engine', 0.5867, 1035.00000000, 'Risk engine: lossProbability=0.889, roll=0.418, winRate=0.600, exposure=1035', '2026-03-15 07:33:04'),
(11, 21, 2, 17, 485.00000000, 'win', 'risk_engine', 0.5000, 1550.00000000, 'Risk engine: lossProbability=0.742, roll=0.743, winRate=0.500, exposure=1550', '2026-03-15 07:34:36'),
(12, 22, 2, 18, 9.70000000, 'loss', 'risk_engine', 0.5571, 575.30000000, 'Risk engine: lossProbability=0.833, roll=0.089, winRate=0.571, exposure=575', '2026-03-15 13:06:21'),
(13, 23, 2, 19, 9.70000000, 'win', 'admin_override', 0.0000, 0.00000000, 'Admin manual override: up wins', '2026-03-15 13:07:52'),
(14, 24, 2, 20, 9.70000000, 'loss', 'risk_engine', 0.5444, 576.20000000, 'Risk engine: lossProbability=0.850, roll=0.411, winRate=0.556, exposure=576', '2026-03-15 13:08:32'),
(15, 24, 2, 20, 9.70000000, 'loss', 'risk_engine', 0.5444, 576.20000000, 'Risk engine: lossProbability=0.863, roll=0.633, winRate=0.556, exposure=576', '2026-03-15 13:08:33'),
(16, 25, 2, 21, 9.70000000, 'win', 'admin_override', 0.0000, 0.00000000, 'Admin manual override: down wins', '2026-03-15 13:09:32'),
(17, 26, 2, 22, 9.70000000, 'loss', 'admin_override', 0.0000, 0.00000000, 'Admin manual override: up wins', '2026-03-15 13:10:30'),
(18, 27, 4, 23, 97.00000000, 'win', 'new_user_bonus', 0.5000, 680.10000000, 'New user bonus win (bet 1/3)', '2026-03-15 13:27:51');

-- --------------------------------------------------------

--
-- Table structure for table `bids`
--

CREATE TABLE `bids` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `coin_id` varchar(50) NOT NULL,
  `round_id` int(11) NOT NULL,
  `direction` enum('up','down') NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `status` enum('pending','won','lost') DEFAULT 'pending',
  `payout` decimal(18,8) DEFAULT 0.00000000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `admin_override` enum('force_win','force_loss','system') DEFAULT NULL,
  `engine_reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bids`
--

INSERT INTO `bids` (`id`, `user_id`, `coin_id`, `round_id`, `direction`, `amount`, `status`, `payout`, `created_at`, `admin_override`, `engine_reason`) VALUES
(15, 2, 'bitcoin', 11, 'up', 970.00000000, 'won', 1970.00000000, '2026-03-15 07:28:47', 'system', 'Risk engine: lossProbability=0.646, roll=0.791, winRate=0.000, exposure=1030'),
(16, 2, 'bitcoin', 12, 'down', 970.00000000, 'lost', 0.00000000, '2026-03-15 07:29:35', 'system', 'Risk engine: lossProbability=0.689, roll=0.609, winRate=1.000, exposure=90'),
(17, 2, 'bitcoin', 13, 'down', 97.00000000, 'won', 197.00000000, '2026-03-15 07:30:23', 'system', 'New user bonus win (bet 3/3)'),
(18, 2, 'bitcoin', 14, 'down', 97.00000000, 'won', 197.00000000, '2026-03-15 07:31:03', 'system', 'Risk engine: lossProbability=0.627, roll=0.722, winRate=0.667, exposure=99'),
(19, 2, 'bitcoin', 15, 'down', 97.00000000, 'lost', 0.00000000, '2026-03-15 07:31:44', 'system', 'Risk engine: lossProbability=0.900, roll=0.644, winRate=0.750, exposure=5'),
(20, 2, 'bitcoin', 16, 'down', 970.00000000, 'lost', 0.00000000, '2026-03-15 07:32:30', 'system', 'Risk engine: lossProbability=0.889, roll=0.418, winRate=0.600, exposure=1035'),
(21, 2, 'bitcoin', 17, 'down', 485.00000000, 'won', 985.00000000, '2026-03-15 07:34:03', 'system', 'Risk engine: lossProbability=0.742, roll=0.743, winRate=0.500, exposure=1550'),
(22, 2, 'bitcoin', 18, 'up', 9.70000000, 'lost', 0.00000000, '2026-03-15 13:05:46', 'system', 'Risk engine: lossProbability=0.833, roll=0.089, winRate=0.571, exposure=575'),
(23, 2, 'bitcoin', 19, 'up', 9.70000000, 'won', 19.70000000, '2026-03-15 13:07:17', 'force_win', 'Admin manual override: up wins'),
(24, 2, 'bitcoin', 20, 'up', 9.70000000, 'lost', 0.00000000, '2026-03-15 13:07:57', 'system', 'Risk engine: lossProbability=0.863, roll=0.633, winRate=0.556, exposure=576'),
(25, 2, 'bitcoin', 21, 'down', 9.70000000, 'won', 19.70000000, '2026-03-15 13:08:58', 'force_win', 'Admin manual override: down wins'),
(26, 2, 'bitcoin', 22, 'down', 9.70000000, 'lost', 0.00000000, '2026-03-15 13:09:55', 'force_loss', 'Admin manual override: up wins'),
(27, 4, 'bitcoin', 23, 'up', 97.00000000, 'won', 197.00000000, '2026-03-15 13:27:17', 'system', 'New user bonus win (bet 1/3)');

-- --------------------------------------------------------

--
-- Table structure for table `bid_rounds`
--

CREATE TABLE `bid_rounds` (
  `id` int(11) NOT NULL,
  `coin_id` varchar(50) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `end_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `status` enum('open','closed','resolved') DEFAULT 'open',
  `total_up_amount` decimal(18,8) DEFAULT 0.00000000,
  `total_down_amount` decimal(18,8) DEFAULT 0.00000000,
  `total_up_users` int(11) DEFAULT 0,
  `total_down_users` int(11) DEFAULT 0,
  `winning_side` enum('up','down') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bid_rounds`
--

INSERT INTO `bid_rounds` (`id`, `coin_id`, `start_time`, `end_time`, `status`, `total_up_amount`, `total_down_amount`, `total_up_users`, `total_down_users`, `winning_side`, `created_at`) VALUES
(11, 'bitcoin', '2026-03-15 07:29:22', '2026-03-15 07:29:20', 'resolved', 970.00000000, 0.00000000, 1, 0, 'up', '2026-03-15 07:28:47'),
(12, 'bitcoin', '2026-03-15 07:30:09', '2026-03-15 07:30:08', 'resolved', 0.00000000, 970.00000000, 0, 1, 'down', '2026-03-15 07:29:35'),
(13, 'bitcoin', '2026-03-15 07:30:58', '2026-03-15 07:30:56', 'resolved', 0.00000000, 97.00000000, 0, 1, 'down', '2026-03-15 07:30:23'),
(14, 'bitcoin', '2026-03-15 07:31:38', '2026-03-15 07:31:36', 'resolved', 0.00000000, 97.00000000, 0, 1, 'down', '2026-03-15 07:31:03'),
(15, 'bitcoin', '2026-03-15 07:32:19', '2026-03-15 07:32:17', 'resolved', 0.00000000, 97.00000000, 0, 1, 'down', '2026-03-15 07:31:44'),
(16, 'bitcoin', '2026-03-15 07:33:04', '2026-03-15 07:33:03', 'resolved', 0.00000000, 970.00000000, 0, 1, 'down', '2026-03-15 07:32:30'),
(17, 'bitcoin', '2026-03-15 07:34:36', '2026-03-15 07:34:36', 'resolved', 0.00000000, 485.00000000, 0, 1, 'down', '2026-03-15 07:34:03'),
(18, 'bitcoin', '2026-03-15 13:06:21', '2026-03-15 13:06:19', 'resolved', 9.70000000, 0.00000000, 1, 0, 'up', '2026-03-15 13:05:46'),
(19, 'bitcoin', '2026-03-15 13:07:52', '2026-03-15 13:07:50', 'resolved', 9.70000000, 0.00000000, 1, 0, 'up', '2026-03-15 13:07:17'),
(20, 'bitcoin', '2026-03-15 13:08:32', '2026-03-15 13:08:30', 'resolved', 9.70000000, 0.00000000, 1, 0, 'up', '2026-03-15 13:07:57'),
(21, 'bitcoin', '2026-03-15 13:09:32', '2026-03-15 13:09:31', 'resolved', 0.00000000, 9.70000000, 0, 1, 'down', '2026-03-15 13:08:58'),
(22, 'bitcoin', '2026-03-15 13:10:30', '2026-03-15 13:10:28', 'resolved', 0.00000000, 9.70000000, 0, 1, 'down', '2026-03-15 13:09:55'),
(23, 'bitcoin', '2026-03-15 13:27:52', '2026-03-15 13:27:50', 'resolved', 97.00000000, 0.00000000, 1, 0, 'up', '2026-03-15 13:27:17'),
(24, 'bitcoin', '2026-03-16 14:45:37', '2026-03-16 14:45:36', 'resolved', 0.00000000, 0.00000000, 0, 0, 'down', '2026-03-16 14:45:03'),
(25, 'bitcoin', '2026-03-16 14:45:38', '2026-03-16 14:46:11', 'open', 0.00000000, 0.00000000, 0, 0, NULL, '2026-03-16 14:45:38');

-- --------------------------------------------------------

--
-- Table structure for table `commission_history`
--

CREATE TABLE `commission_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `from_user_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `trade_amount` decimal(18,8) NOT NULL,
  `commission_rate` decimal(6,4) NOT NULL,
  `commission_amount` decimal(18,8) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `commission_history`
--

INSERT INTO `commission_history` (`id`, `user_id`, `from_user_id`, `level`, `trade_amount`, `commission_rate`, `commission_amount`, `created_at`) VALUES
(1, 2, 4, 1, 97.00000000, 0.0081, 0.78570000, '2026-03-15 13:27:51');

-- --------------------------------------------------------

--
-- Table structure for table `daily_salary_log`
--

CREATE TABLE `daily_salary_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tier_id` int(11) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `credited_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_salary_tiers`
--

CREATE TABLE `daily_salary_tiers` (
  `id` int(11) NOT NULL,
  `min_direct_members` int(11) NOT NULL,
  `min_active_members` int(11) NOT NULL,
  `min_team_deposit` decimal(18,2) NOT NULL,
  `daily_salary` decimal(18,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deposit_requests`
--

CREATE TABLE `deposit_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `deposit_type` enum('usdt','upi') NOT NULL,
  `amount` decimal(18,8) DEFAULT 0.00000000,
  `wallet_address` varchar(200) DEFAULT NULL,
  `tx_hash` varchar(200) DEFAULT NULL,
  `upi_id` varchar(200) DEFAULT NULL,
  `utr_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected','expired') DEFAULT 'pending',
  `admin_id` int(11) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `deposit_requests`
--

INSERT INTO `deposit_requests` (`id`, `user_id`, `deposit_type`, `amount`, `wallet_address`, `tx_hash`, `upi_id`, `utr_number`, `status`, `admin_id`, `admin_note`, `reviewed_at`, `created_at`) VALUES
(3, 2, 'usdt', 10.00000000, '0xeb22c11a8f4a9028f7103cc303b43c4b0e35d476', '0x8f2a559490c7c8a5d9c3a0b5e3a1f72c8cbb4a62e5c90a5b6a1d7a8c1e4f9b21', NULL, NULL, 'approved', 1, 'Approved', '2026-03-15 13:04:06', '2026-03-15 13:03:42'),
(4, 4, 'usdt', 1000.00000000, '0x1a7d0e91aace0256baf375c18c333165a49851a8', '0x4e3f7b2a1c9d6e8f0a5b3c7d1e2f9a8b6c4d0e1f3a5b7c9d2e4f6a8b0c1d3e5f', NULL, NULL, 'approved', 1, 'Approved', '2026-03-15 13:15:21', '2026-03-15 13:15:11'),
(5, 4, 'usdt', 10.00000000, '0x1a7d0e91aace0256baf375c18c333165a49851a8', '0xa1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', NULL, NULL, 'approved', 1, 'Approved', '2026-03-15 13:37:43', '2026-03-15 13:32:08');

-- --------------------------------------------------------

--
-- Table structure for table `fd_deposits`
--

CREATE TABLE `fd_deposits` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_deposit_requests`
--

CREATE TABLE `fd_deposit_requests` (
  `id` int(11) NOT NULL,
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_profit_distributions`
--

CREATE TABLE `fd_profit_distributions` (
  `id` int(11) NOT NULL,
  `company_profit` decimal(18,2) NOT NULL COMMENT 'Total company profit for the period',
  `distribution_percentage` decimal(6,2) NOT NULL COMMENT '% of profit to distribute',
  `pool_amount` decimal(18,2) NOT NULL COMMENT 'Actual amount distributed (profit * %)',
  `eligible_users_count` int(11) DEFAULT 0,
  `total_eligible_investment` decimal(18,2) DEFAULT 0.00 COMMENT 'Sum of all eligible users FD amounts',
  `distribution_month` varchar(7) NOT NULL COMMENT 'YYYY-MM format',
  `status` enum('pending','distributed','cancelled') DEFAULT 'pending',
  `distributed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `admin_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_profit_logs`
--

CREATE TABLE `fd_profit_logs` (
  `id` int(11) NOT NULL,
  `fd_deposit_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `month_number` int(11) NOT NULL COMMENT '1 or 2',
  `amount` decimal(18,2) NOT NULL COMMENT 'Profit credited',
  `credited_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_settings`
--

CREATE TABLE `fd_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fd_settings`
--

INSERT INTO `fd_settings` (`id`, `setting_key`, `setting_value`, `updated_at`) VALUES
(1, 'fd_monthly_rate', '5', '2026-03-25 16:44:00'),
(2, 'fd_duration_days', '60', '2026-03-25 16:44:00'),
(3, 'fd_min_investment', '1000', '2026-03-25 16:44:00'),
(4, 'fd_max_investment', '50000', '2026-03-25 16:44:00'),
(5, 'profit_sharing_enabled', '1', '2026-03-25 16:44:00'),
(6, 'profit_sharing_duration_months', '12', '2026-03-25 16:44:00'),
(7, 'min_deposit_usdt', '10', '2026-03-25 16:44:00'),
(8, 'min_deposit_upi', '1000', '2026-03-25 16:44:00'),
(9, 'usd_to_inr_rate', '98', '2026-03-25 16:44:00');

-- --------------------------------------------------------

--
-- Table structure for table `fd_support_tickets`
--

CREATE TABLE `fd_support_tickets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `status` enum('open','in_progress','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_ticket_replies`
--

CREATE TABLE `fd_ticket_replies` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_transactions`
--

CREATE TABLE `fd_transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('deposit','withdrawal','fd_invest','fd_return','fd_profit','profit_share','admin_adjustment') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `wallet_address` varchar(200) DEFAULT NULL,
  `status` enum('pending','completed','rejected') DEFAULT 'pending',
  `tx_hash` varchar(200) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `network` varchar(50) DEFAULT 'BEP20',
  `inr_amount` decimal(18,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_users`
--

CREATE TABLE `fd_users` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fd_user_profit_shares`
--

CREATE TABLE `fd_user_profit_shares` (
  `id` int(11) NOT NULL,
  `distribution_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `fd_deposit_id` int(11) NOT NULL,
  `investment_amount` decimal(18,2) NOT NULL COMMENT 'User FD amount used for calculation',
  `share_percentage` decimal(8,4) NOT NULL COMMENT 'User share % of total pool',
  `amount` decimal(18,2) NOT NULL COMMENT 'Actual amount credited',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `code` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `email`, `code`, `expires_at`, `is_used`, `created_at`) VALUES
(7, 'abhishek@piana.in', '149029', '2026-03-15 13:12:21', 1, '2026-03-15 13:12:03');

-- --------------------------------------------------------

--
-- Table structure for table `platform_risk_ledger`
--

CREATE TABLE `platform_risk_ledger` (
  `id` int(11) NOT NULL,
  `total_bets_received` decimal(18,8) DEFAULT 0.00000000,
  `total_payouts_made` decimal(18,8) DEFAULT 0.00000000,
  `total_fees_collected` decimal(18,8) DEFAULT 0.00000000,
  `net_platform_balance` decimal(18,8) DEFAULT 0.00000000,
  `snapshot_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platform_settings`
--

CREATE TABLE `platform_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `platform_settings`
--

INSERT INTO `platform_settings` (`id`, `setting_key`, `setting_value`, `updated_at`) VALUES
(1, 'trade_mode', 'manual', '2026-03-15 13:07:04'),
(2, 'manual_winner', '', '2026-03-15 13:10:30'),
(3, 'consecutive_up_wins', '0', '2026-03-11 14:10:06'),
(4, 'consecutive_down_wins', '0', '2026-03-11 14:10:06'),
(9, 'house_edge', '0.08', '2026-03-15 05:36:23'),
(10, 'max_win_rate', '0.45', '2026-03-15 05:36:23'),
(11, 'new_user_bonus_wins', '3', '2026-03-15 05:36:23'),
(12, 'new_user_max_win_amount', '100', '2026-03-17 09:25:54'),
(13, 'risk_threshold', '0.7', '2026-03-15 05:36:23'),
(14, 'min_deposit_usdt', '10', '2026-03-15 05:36:23'),
(15, 'min_deposit_upi', '1000', '2026-03-15 07:27:52'),
(16, 'referral_bonus_rate', '0.03', '2026-03-15 11:38:25'),
(17, 'commission_levels', '[{\"level\":1,\"rate\":0.008199999999999999},{\"level\":2,\"rate\":0.0034999999999999996},{\"level\":3,\"rate\":0.0017000000000000001},{\"level\":4,\"rate\":0.001},{\"level\":5,\"rate\":0.0007000000000000001},{\"level\":6,\"rate\":0.0004}]', '2026-03-16 14:56:22'),
(18, 'usd_to_inr_rate', '98', '2026-03-15 11:38:26'),
(31, 'min_deposit_for_earnings', '500', '2026-03-17 09:25:54');

-- --------------------------------------------------------

--
-- Table structure for table `processed_deposits`
--

CREATE TABLE `processed_deposits` (
  `id` int(11) NOT NULL,
  `tx_hash` varchar(100) NOT NULL,
  `from_address` varchar(100) NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `processed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rate_limits`
--

CREATE TABLE `rate_limits` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `action_count` int(11) DEFAULT 1,
  `window_start` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referral_earnings`
--

CREATE TABLE `referral_earnings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `from_user_id` int(11) NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `type` varchar(50) DEFAULT 'referral_bonus',
  `level` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `referral_earnings`
--

INSERT INTO `referral_earnings` (`id`, `user_id`, `from_user_id`, `amount`, `created_at`, `type`, `level`) VALUES
(1, 2, 4, 30.00000000, '2026-03-15 13:27:51', 'referral_bonus', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `status` enum('open','in_progress','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ticket_replies`
--

CREATE TABLE `ticket_replies` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('deposit','withdrawal','bid_win','bid_loss','referral_bonus','trading_fee','commission','deposit_credit','admin_adjustment') NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `wallet_address` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','rejected') DEFAULT 'pending',
  `tx_hash` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `network` varchar(50) DEFAULT 'BEP20',
  `qr_image` text DEFAULT NULL,
  `inr_amount` decimal(18,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `type`, `amount`, `wallet_address`, `status`, `tx_hash`, `notes`, `created_at`, `network`, `qr_image`, `inr_amount`) VALUES
(37, 2, 'bid_loss', 1000.00000000, NULL, 'completed', NULL, 'Bid UP on bitcoin (Fee: $30.0000)', '2026-03-15 07:28:47', 'BEP20', NULL, NULL),
(38, 2, 'trading_fee', 30.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:28:47', 'BEP20', NULL, NULL),
(39, 2, 'bid_win', 1970.00000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #11)', '2026-03-15 07:29:22', 'BEP20', NULL, NULL),
(40, 2, 'bid_loss', 1000.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $30.0000)', '2026-03-15 07:29:35', 'BEP20', NULL, NULL),
(41, 2, 'trading_fee', 30.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:29:35', 'BEP20', NULL, NULL),
(42, 2, 'bid_loss', 100.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $3.0000)', '2026-03-15 07:30:23', 'BEP20', NULL, NULL),
(43, 2, 'trading_fee', 3.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:30:23', 'BEP20', NULL, NULL),
(44, 2, 'bid_win', 197.00000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #13)', '2026-03-15 07:30:58', 'BEP20', NULL, NULL),
(45, 2, 'bid_loss', 100.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $3.0000)', '2026-03-15 07:31:03', 'BEP20', NULL, NULL),
(46, 2, 'trading_fee', 3.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:31:03', 'BEP20', NULL, NULL),
(47, 2, 'bid_win', 197.00000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #14)', '2026-03-15 07:31:38', 'BEP20', NULL, NULL),
(48, 2, 'bid_loss', 100.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $3.0000)', '2026-03-15 07:31:44', 'BEP20', NULL, NULL),
(49, 2, 'trading_fee', 3.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:31:44', 'BEP20', NULL, NULL),
(50, 2, 'bid_loss', 1000.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $30.0000)', '2026-03-15 07:32:30', 'BEP20', NULL, NULL),
(51, 2, 'trading_fee', 30.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:32:30', 'BEP20', NULL, NULL),
(52, 2, 'bid_loss', 500.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $15.0000)', '2026-03-15 07:34:03', 'BEP20', NULL, NULL),
(53, 2, 'trading_fee', 15.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 07:34:03', 'BEP20', NULL, NULL),
(54, 2, 'bid_win', 985.00000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #17)', '2026-03-15 07:34:36', 'BEP20', NULL, NULL),
(55, 2, 'deposit', 10.00000000, NULL, 'completed', '0x8f2a559490c7c8a5d9c3a0b5e3a1f72c8cbb4a62e5c90a5b6a1d7a8c1e4f9b21', 'USDT deposit approved by admin', '2026-03-15 13:04:06', 'BEP20', NULL, NULL),
(56, 2, 'bid_loss', 10.00000000, NULL, 'completed', NULL, 'Bid UP on bitcoin (Fee: $0.3000)', '2026-03-15 13:05:46', 'BEP20', NULL, NULL),
(57, 2, 'trading_fee', 0.30000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:05:46', 'BEP20', NULL, NULL),
(58, 2, 'bid_loss', 10.00000000, NULL, 'completed', NULL, 'Bid UP on bitcoin (Fee: $0.3000)', '2026-03-15 13:07:17', 'BEP20', NULL, NULL),
(59, 2, 'trading_fee', 0.30000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:07:17', 'BEP20', NULL, NULL),
(60, 2, 'bid_win', 19.70000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #19)', '2026-03-15 13:07:52', 'BEP20', NULL, NULL),
(61, 2, 'bid_loss', 10.00000000, NULL, 'completed', NULL, 'Bid UP on bitcoin (Fee: $0.3000)', '2026-03-15 13:07:57', 'BEP20', NULL, NULL),
(62, 2, 'trading_fee', 0.30000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:07:57', 'BEP20', NULL, NULL),
(63, 2, 'bid_loss', 10.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $0.3000)', '2026-03-15 13:08:58', 'BEP20', NULL, NULL),
(64, 2, 'trading_fee', 0.30000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:08:58', 'BEP20', NULL, NULL),
(65, 2, 'bid_win', 19.70000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #21)', '2026-03-15 13:09:32', 'BEP20', NULL, NULL),
(66, 2, 'bid_loss', 10.00000000, NULL, 'completed', NULL, 'Bid DOWN on bitcoin (Fee: $0.3000)', '2026-03-15 13:09:55', 'BEP20', NULL, NULL),
(67, 2, 'trading_fee', 0.30000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:09:55', 'BEP20', NULL, NULL),
(68, 4, 'deposit', 1000.00000000, NULL, 'completed', '0x4e3f7b2a1c9d6e8f0a5b3c7d1e2f9a8b6c4d0e1f3a5b7c9d2e4f6a8b0c1d3e5f', 'USDT deposit approved by admin', '2026-03-15 13:15:21', 'BEP20', NULL, NULL),
(69, 4, 'bid_loss', 100.00000000, NULL, 'completed', NULL, 'Bid UP on bitcoin (Fee: $3.0000)', '2026-03-15 13:27:17', 'BEP20', NULL, NULL),
(70, 4, 'trading_fee', 3.00000000, NULL, 'completed', NULL, '3% trading fee on bitcoin', '2026-03-15 13:27:17', 'BEP20', NULL, NULL),
(71, 4, 'bid_win', 197.00000000, NULL, 'completed', NULL, 'Won bid on bitcoin (Round #23)', '2026-03-15 13:27:51', 'BEP20', NULL, NULL),
(72, 2, 'referral_bonus', 30.00000000, NULL, 'completed', NULL, '3% referral bonus from user #4 first deposit of ₹1000.00', '2026-03-15 13:27:51', 'BEP20', NULL, NULL),
(73, 2, 'commission', 0.78570000, NULL, 'completed', NULL, 'Level 1 commission (0.81%) from user #4', '2026-03-15 13:27:51', 'BEP20', NULL, NULL),
(74, 4, 'deposit', 980.00000000, NULL, 'completed', '0xa1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', 'USDT deposit ($10.00 × 98 = ₹980.00)', '2026-03-15 13:37:43', 'BEP20', NULL, NULL),
(75, 2, 'withdrawal', 980.00000000, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'completed', NULL, 'Withdrawal approved by admin', '2026-03-15 13:50:52', 'BEP20', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `upi_accounts`
--

CREATE TABLE `upi_accounts` (
  `id` int(11) NOT NULL,
  `upi_id` varchar(200) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `upi_accounts`
--

INSERT INTO `upi_accounts` (`id`, `upi_id`, `display_name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '7247623323@ptyes', 'Abhishek', 1, '2026-03-15 06:54:48', '2026-03-15 06:54:48');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `wallet_address` varchar(100) NOT NULL,
  `wallet_balance` decimal(18,8) DEFAULT 0.00000000,
  `total_deposited` decimal(20,8) DEFAULT 0.00000000,
  `referral_code` varchar(20) NOT NULL,
  `referred_by` varchar(20) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `wallet_balance_inr` decimal(18,2) DEFAULT 0.00,
  `is_blocked` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `wallet_address`, `wallet_balance`, `total_deposited`, `referral_code`, `referred_by`, `role`, `is_verified`, `created_at`, `updated_at`, `wallet_balance_inr`, `is_blocked`) VALUES
(1, 'GrowViax', 'growviax60@gmail.com', '9876543210', '$2b$12$72.2/2ZEEhPxgLr/Wfx1Q.sQ2G2yMGahDYch9AH1hyX3Bsqy1VNOm', '0x5a5d3d5a01564e9bb023dd316d47d35b', 2000.00000000, 0.00000000, 'GVXMDY193', NULL, 'admin', 1, '2026-02-28 09:50:21', '2026-03-15 07:23:11', 0.00, 0),
(2, 'Demo User 1', 'demo1@growviax.com', '9999900001', '$2b$12$FNd3ZZ494Obko2ufVPX26u4cvwXEVjxCcKnVTusUiB13/YXruTFj6', '0x2b45163351d44bc4a7b74bd7d9961dbef812bf70', 175.18570000, 0.00000000, 'GVXDEMO1', NULL, 'user', 1, '2026-03-04 12:25:07', '2026-03-15 13:55:02', 0.00, 0),
(3, 'Demo User 2', 'demo2@growviax.com', '9999900002', '$2b$12$FNd3ZZ494Obko2ufVPX26u4cvwXEVjxCcKnVTusUiB13/YXruTFj6', '0x6d9a9f23927649d2ab8f9e0c1f54c935ee57f12a', 1000.00000000, 0.00000000, 'GVXDEMO2', NULL, 'user', 1, '2026-03-04 12:25:07', '2026-03-14 04:38:57', 0.00, 0),
(4, 'test', 'abhishek@piana.in', '7247623323', '$2b$12$tHPRvrrqzdhIlNIXBSq0oeKmp5./MkqVXbce96tYx9Eq614LVeYWq', '0x16741306e8344d65bc5e1c5aade81fb3', 2077.00000000, 980.00000000, 'GVXNY69DF', 'GVXDEMO1', 'user', 1, '2026-03-15 13:12:23', '2026-03-15 13:37:43', 0.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `user_betting_profiles`
--

CREATE TABLE `user_betting_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_bets` int(11) DEFAULT 0,
  `total_wins` int(11) DEFAULT 0,
  `total_losses` int(11) DEFAULT 0,
  `total_amount_bet` decimal(18,8) DEFAULT 0.00000000,
  `total_amount_won` decimal(18,8) DEFAULT 0.00000000,
  `total_amount_lost` decimal(18,8) DEFAULT 0.00000000,
  `avg_bet_amount` decimal(18,8) DEFAULT 0.00000000,
  `max_bet_amount` decimal(18,8) DEFAULT 0.00000000,
  `win_rate` decimal(6,4) DEFAULT 0.0000,
  `current_streak_type` enum('win','loss','none') DEFAULT 'none',
  `current_streak_count` int(11) DEFAULT 0,
  `risk_score` decimal(6,4) DEFAULT 0.5000,
  `last_bet_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_betting_profiles`
--

INSERT INTO `user_betting_profiles` (`id`, `user_id`, `total_bets`, `total_wins`, `total_losses`, `total_amount_bet`, `total_amount_won`, `total_amount_lost`, `avg_bet_amount`, `max_bet_amount`, `win_rate`, `current_streak_type`, `current_streak_count`, `risk_score`, `last_bet_at`, `updated_at`) VALUES
(5, 2, 13, 6, 7, 3744.20000000, 3388.40000000, 2075.80000000, 288.01538462, 970.00000000, 0.4615, 'loss', 1, 0.5000, '2026-03-15 13:10:30', '2026-03-15 13:10:30'),
(19, 4, 1, 1, 0, 97.00000000, 197.00000000, 0.00000000, 97.00000000, 97.00000000, 1.0000, 'win', 1, 0.9050, '2026-03-15 13:27:51', '2026-03-15 13:27:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_activity_log`
--
ALTER TABLE `admin_activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin` (`admin_id`),
  ADD KEY `idx_action` (`action_type`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `admin_bet_overrides`
--
ALTER TABLE `admin_bet_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_bid` (`bid_id`),
  ADD KEY `idx_round` (`round_id`),
  ADD KEY `idx_applied` (`applied`);

--
-- Indexes for table `bet_outcome_log`
--
ALTER TABLE `bet_outcome_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bid` (`bid_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_round` (`round_id`),
  ADD KEY `idx_source` (`outcome_source`);

--
-- Indexes for table `bids`
--
ALTER TABLE `bids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_coin` (`user_id`,`coin_id`),
  ADD KEY `idx_round` (`round_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `bid_rounds`
--
ALTER TABLE `bid_rounds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_coin_status` (`coin_id`,`status`),
  ADD KEY `idx_end_time` (`end_time`);

--
-- Indexes for table `commission_history`
--
ALTER TABLE `commission_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `from_user_id` (`from_user_id`);

--
-- Indexes for table `daily_salary_log`
--
ALTER TABLE `daily_salary_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `daily_salary_tiers`
--
ALTER TABLE `daily_salary_tiers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `deposit_requests`
--
ALTER TABLE `deposit_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_tx_hash` (`tx_hash`),
  ADD UNIQUE KEY `uk_utr_number` (`utr_number`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type_status` (`deposit_type`,`status`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `fd_deposits`
--
ALTER TABLE `fd_deposits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_phase` (`phase`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_end_date` (`end_date`);

--
-- Indexes for table `fd_deposit_requests`
--
ALTER TABLE `fd_deposit_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_tx_hash` (`tx_hash`),
  ADD UNIQUE KEY `uk_utr_number` (`utr_number`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `fd_profit_distributions`
--
ALTER TABLE `fd_profit_distributions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_month` (`distribution_month`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `fd_profit_logs`
--
ALTER TABLE `fd_profit_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_fd_month` (`fd_deposit_id`,`month_number`),
  ADD KEY `idx_fd_deposit` (`fd_deposit_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `fd_settings`
--
ALTER TABLE `fd_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `fd_support_tickets`
--
ALTER TABLE `fd_support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `fd_ticket_replies`
--
ALTER TABLE `fd_ticket_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket` (`ticket_id`);

--
-- Indexes for table `fd_transactions`
--
ALTER TABLE `fd_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_type` (`user_id`,`type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `fd_users`
--
ALTER TABLE `fd_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `fd_user_profit_shares`
--
ALTER TABLE `fd_user_profit_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_distribution` (`distribution_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `fd_user_profit_shares_ibfk_3` (`fd_deposit_id`);

--
-- Indexes for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email_code` (`email`,`code`);

--
-- Indexes for table `platform_risk_ledger`
--
ALTER TABLE `platform_risk_ledger`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_snapshot_date` (`snapshot_date`),
  ADD KEY `idx_date` (`snapshot_date`);

--
-- Indexes for table `platform_settings`
--
ALTER TABLE `platform_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `processed_deposits`
--
ALTER TABLE `processed_deposits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tx_hash` (`tx_hash`),
  ADD KEY `idx_tx_hash` (`tx_hash`);

--
-- Indexes for table `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_action` (`user_id`,`action_type`),
  ADD KEY `idx_window` (`window_start`);

--
-- Indexes for table `referral_earnings`
--
ALTER TABLE `referral_earnings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `from_user_id` (`from_user_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_type` (`type`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `ticket_replies`
--
ALTER TABLE `ticket_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_ticket` (`ticket_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_type` (`user_id`,`type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `upi_accounts`
--
ALTER TABLE `upi_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `wallet_address` (`wallet_address`),
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_referral_code` (`referral_code`),
  ADD KEY `idx_wallet_address` (`wallet_address`);

--
-- Indexes for table `user_betting_profiles`
--
ALTER TABLE `user_betting_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_risk` (`risk_score`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_activity_log`
--
ALTER TABLE `admin_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `admin_bet_overrides`
--
ALTER TABLE `admin_bet_overrides`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bet_outcome_log`
--
ALTER TABLE `bet_outcome_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `bids`
--
ALTER TABLE `bids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `bid_rounds`
--
ALTER TABLE `bid_rounds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `commission_history`
--
ALTER TABLE `commission_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `daily_salary_log`
--
ALTER TABLE `daily_salary_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_salary_tiers`
--
ALTER TABLE `daily_salary_tiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_requests`
--
ALTER TABLE `deposit_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fd_deposits`
--
ALTER TABLE `fd_deposits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_deposit_requests`
--
ALTER TABLE `fd_deposit_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_profit_distributions`
--
ALTER TABLE `fd_profit_distributions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_profit_logs`
--
ALTER TABLE `fd_profit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_settings`
--
ALTER TABLE `fd_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `fd_support_tickets`
--
ALTER TABLE `fd_support_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_ticket_replies`
--
ALTER TABLE `fd_ticket_replies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_transactions`
--
ALTER TABLE `fd_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_users`
--
ALTER TABLE `fd_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fd_user_profit_shares`
--
ALTER TABLE `fd_user_profit_shares`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `platform_risk_ledger`
--
ALTER TABLE `platform_risk_ledger`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `platform_settings`
--
ALTER TABLE `platform_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `processed_deposits`
--
ALTER TABLE `processed_deposits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `referral_earnings`
--
ALTER TABLE `referral_earnings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ticket_replies`
--
ALTER TABLE `ticket_replies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `upi_accounts`
--
ALTER TABLE `upi_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_betting_profiles`
--
ALTER TABLE `user_betting_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bids`
--
ALTER TABLE `bids`
  ADD CONSTRAINT `bids_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bids_ibfk_2` FOREIGN KEY (`round_id`) REFERENCES `bid_rounds` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `commission_history`
--
ALTER TABLE `commission_history`
  ADD CONSTRAINT `commission_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `commission_history_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `daily_salary_log`
--
ALTER TABLE `daily_salary_log`
  ADD CONSTRAINT `daily_salary_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `deposit_requests`
--
ALTER TABLE `deposit_requests`
  ADD CONSTRAINT `deposit_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_deposits`
--
ALTER TABLE `fd_deposits`
  ADD CONSTRAINT `fd_deposits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_deposit_requests`
--
ALTER TABLE `fd_deposit_requests`
  ADD CONSTRAINT `fd_deposit_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_profit_logs`
--
ALTER TABLE `fd_profit_logs`
  ADD CONSTRAINT `fd_profit_logs_ibfk_1` FOREIGN KEY (`fd_deposit_id`) REFERENCES `fd_deposits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fd_profit_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_support_tickets`
--
ALTER TABLE `fd_support_tickets`
  ADD CONSTRAINT `fd_support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_ticket_replies`
--
ALTER TABLE `fd_ticket_replies`
  ADD CONSTRAINT `fd_ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `fd_support_tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_transactions`
--
ALTER TABLE `fd_transactions`
  ADD CONSTRAINT `fd_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fd_user_profit_shares`
--
ALTER TABLE `fd_user_profit_shares`
  ADD CONSTRAINT `fd_user_profit_shares_ibfk_1` FOREIGN KEY (`distribution_id`) REFERENCES `fd_profit_distributions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fd_user_profit_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fd_user_profit_shares_ibfk_3` FOREIGN KEY (`fd_deposit_id`) REFERENCES `fd_deposits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `referral_earnings`
--
ALTER TABLE `referral_earnings`
  ADD CONSTRAINT `referral_earnings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `referral_earnings_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticket_replies`
--
ALTER TABLE `ticket_replies`
  ADD CONSTRAINT `ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ticket_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_betting_profiles`
--
ALTER TABLE `user_betting_profiles`
  ADD CONSTRAINT `user_betting_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
