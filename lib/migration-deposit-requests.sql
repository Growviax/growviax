-- =====================================================
-- GrowViax: Deposit Requests Table Migration
-- Run this SQL in phpMyAdmin (XAMPP) against the growviax database
-- =====================================================

-- Tracks which deposit wallet was assigned to which user
-- so we can match incoming blockchain deposits to users
CREATE TABLE IF NOT EXISTS deposit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    matched_tx_hash VARCHAR(100) DEFAULT NULL,
    INDEX idx_wallet_status (wallet_address, status),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- Add network column to transactions if not already present (ignore error if exists)
-- ALTER TABLE transactions ADD COLUMN network VARCHAR(50) DEFAULT 'BEP20';
