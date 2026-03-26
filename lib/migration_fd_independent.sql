-- Migration: Independent FD UPI & USDT Wallets
-- Run this in phpMyAdmin for the `growviax` database

-- Independent FD UPI accounts (separate from trading upi_accounts)
CREATE TABLE IF NOT EXISTS `fd_upi_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `upi_id` varchar(200) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Independent FD USDT wallets (separate from trading hardcoded wallets)
CREATE TABLE IF NOT EXISTS `fd_usdt_wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_address` varchar(200) NOT NULL,
  `qr_image` varchar(500) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed default FD USDT wallets (admin can change later)
INSERT INTO `fd_usdt_wallets` (`wallet_address`, `qr_image`, `display_name`) VALUES
('0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152', '/img/qr1.jpeg', 'FD Wallet 1'),
('0x3cC8B270a33997a95AdB4511A701dD159734D433', '/img/qr2.jpeg', 'FD Wallet 2'),
('0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476', '/img/qr3.jpeg', 'FD Wallet 3'),
('0x1a7d0e91aaCe0256Baf375C18c333165a49851a8', '/img/qr4.jpeg', 'FD Wallet 4'),
('0xED7D925FAab46C08fbbaba6AFbC382C6533c403a', '/img/qr5.jpeg', 'FD Wallet 5');
