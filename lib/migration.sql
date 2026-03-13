-- =====================================================
-- GrowViax Database Migration
-- Run this SQL against your MySQL database
-- =====================================================

-- Add optional columns to transactions table (may already exist, use IF NOT EXISTS pattern)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN natively,
-- so run these individually and ignore errors for already-existing columns.

-- ALTER TABLE transactions ADD COLUMN network VARCHAR(50) DEFAULT 'BEP20';
-- ALTER TABLE transactions ADD COLUMN tx_hash VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE transactions ADD COLUMN qr_image TEXT DEFAULT NULL;

-- Commission History Table
CREATE TABLE IF NOT EXISTS commission_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    from_user_id INT NOT NULL,
    level INT NOT NULL,
    trade_amount DECIMAL(18,8) NOT NULL,
    commission_rate DECIMAL(6,4) NOT NULL,
    commission_amount DECIMAL(18,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_from_user (from_user_id)
);

-- Daily Salary Log Table
CREATE TABLE IF NOT EXISTS daily_salary_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tier_id INT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    credited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, credited_at)
);

-- Processed Deposits (blockchain) Table
CREATE TABLE IF NOT EXISTS processed_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(100) NOT NULL UNIQUE,
    from_address VARCHAR(100) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    user_id INT DEFAULT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tx_hash (tx_hash)
);

-- Ensure users table has role column
-- ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
-- To make a user admin: UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
