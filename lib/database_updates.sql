-- =====================================================
-- GrowViax Database Updates - Production Grade
-- Database: growviax (XAMPP MySQL)
-- Run ALL queries in phpMyAdmin against the growviax database
-- =====================================================

USE growviax;

-- =====================================================
-- 1. ALTER EXISTING TABLES
-- =====================================================

-- Add is_blocked column to users if not exists
-- ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) DEFAULT 0;

-- NOTE: total_deposited and total_traded are computed dynamically from transactions table
-- in /api/user route. No need to add them as columns to users table.

-- Alter transactions type ENUM to include new types
ALTER TABLE transactions MODIFY COLUMN type ENUM(
    'deposit', 'withdrawal', 'bid_win', 'bid_loss',
    'referral_bonus', 'trading_fee', 'commission',
    'deposit_credit', 'admin_adjustment'
) NOT NULL;

-- Add admin_override column to bids table for tracking forced outcomes
ALTER TABLE bids ADD COLUMN admin_override ENUM('force_win', 'force_loss', 'system') DEFAULT NULL;

-- Add engine_reason column to bids for audit trail
ALTER TABLE bids ADD COLUMN engine_reason VARCHAR(255) DEFAULT NULL;

-- =====================================================
-- 2. SMART OUTCOME ENGINE - Platform Risk Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_risk_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_bets_received DECIMAL(18,8) DEFAULT 0,
    total_payouts_made DECIMAL(18,8) DEFAULT 0,
    total_fees_collected DECIMAL(18,8) DEFAULT 0,
    net_platform_balance DECIMAL(18,8) DEFAULT 0,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_snapshot_date (snapshot_date),
    INDEX idx_date (snapshot_date)
);

-- User betting profile for pattern detection
CREATE TABLE IF NOT EXISTS user_betting_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_bets INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    total_amount_bet DECIMAL(18,8) DEFAULT 0,
    total_amount_won DECIMAL(18,8) DEFAULT 0,
    total_amount_lost DECIMAL(18,8) DEFAULT 0,
    avg_bet_amount DECIMAL(18,8) DEFAULT 0,
    max_bet_amount DECIMAL(18,8) DEFAULT 0,
    win_rate DECIMAL(6,4) DEFAULT 0,
    current_streak_type ENUM('win', 'loss', 'none') DEFAULT 'none',
    current_streak_count INT DEFAULT 0,
    risk_score DECIMAL(6,4) DEFAULT 0.5,
    last_bet_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_risk (risk_score)
);

-- Bet outcome audit log
CREATE TABLE IF NOT EXISTS bet_outcome_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bid_id INT NOT NULL,
    user_id INT NOT NULL,
    round_id INT NOT NULL,
    bet_amount DECIMAL(18,8) NOT NULL,
    outcome ENUM('win', 'loss') NOT NULL,
    outcome_source ENUM('new_user_bonus', 'admin_override', 'risk_engine', 'random', 'multi_bet') NOT NULL,
    risk_score_at_time DECIMAL(6,4) DEFAULT NULL,
    platform_exposure DECIMAL(18,8) DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bid (bid_id),
    INDEX idx_user (user_id),
    INDEX idx_round (round_id),
    INDEX idx_source (outcome_source)
);

-- =====================================================
-- 3. ADMIN BET OVERRIDES
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_bet_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bid_id INT NOT NULL,
    round_id INT NOT NULL,
    admin_user_id INT NOT NULL,
    override_action ENUM('force_win', 'force_loss', 'system_decide') NOT NULL,
    applied TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_bid (bid_id),
    INDEX idx_round (round_id),
    INDEX idx_applied (applied)
);

-- =====================================================
-- 4. DEPOSIT SYSTEM REDESIGN
-- =====================================================

-- Drop old deposit_requests table and recreate with new schema
DROP TABLE IF EXISTS deposit_requests;

CREATE TABLE IF NOT EXISTS deposit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    deposit_type ENUM('usdt', 'upi') NOT NULL,
    amount DECIMAL(18,8) DEFAULT 0,
    wallet_address VARCHAR(200) DEFAULT NULL,
    tx_hash VARCHAR(200) DEFAULT NULL,
    upi_id VARCHAR(200) DEFAULT NULL,
    utr_number VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    admin_id INT DEFAULT NULL,
    admin_note TEXT DEFAULT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tx_hash (tx_hash),
    UNIQUE KEY uk_utr_number (utr_number),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_type_status (deposit_type, status),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 5. UPI MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS upi_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upi_id VARCHAR(200) NOT NULL,
    display_name VARCHAR(100) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
);

-- Insert default UPI accounts (admin can manage later)
-- INSERT INTO upi_accounts (upi_id, display_name, is_active) VALUES ('example@upi', 'Primary UPI', 1);

-- =====================================================
-- 6. RATE LIMITING / SPAM PROTECTION
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action_type),
    INDEX idx_window (window_start)
);

-- =====================================================
-- 7. ADMIN ACTIVITY LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT NULL,
    target_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action_type),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 8. PLATFORM SETTINGS ADDITIONS
-- =====================================================

-- Ensure platform_settings table exists
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default risk engine settings
INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('house_edge', '0.08')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('max_win_rate', '0.45')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('new_user_bonus_wins', '3')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('new_user_max_win_amount', '100')
ON DUPLICATE KEY UPDATE setting_value = '100';

-- Minimum deposit required to earn referral/commission/IB income
INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('min_deposit_for_earnings', '500')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('risk_threshold', '0.7')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('min_deposit_usdt', '10')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('min_deposit_upi', '1000')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- Referral and Commission Settings
INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('referral_bonus_rate', '0.03')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('commission_levels', '[{"level":1,"rate":0.0081},{"level":2,"rate":0.0035},{"level":3,"rate":0.0017},{"level":4,"rate":0.001},{"level":5,"rate":0.0007},{"level":6,"rate":0.0004}]')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- USD to INR conversion rate
INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('usd_to_inr_rate', '98')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- =====================================================
-- 10. REFERRAL EARNINGS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_earnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    from_user_id INT NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_from_user (from_user_id),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 10. COMMISSION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    from_user_id INT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    trade_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_from_user (from_user_id),
    INDEX idx_level (level),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 11. DAILY SALARY LOG TABLE (IB Bonus tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_salary_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tier_id INT NOT NULL,
    amount DECIMAL(18,8) NOT NULL DEFAULT 0,
    credited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_date (credited_at),
    INDEX idx_user_date (user_id, credited_at)
);

-- =====================================================
-- 12. ADD type AND level COLUMNS TO referral_earnings
-- =====================================================

-- Add type column to distinguish referral bonus vs commission vs ib bonus
ALTER TABLE referral_earnings ADD COLUMN type VARCHAR(50) DEFAULT 'referral_bonus';
ALTER TABLE referral_earnings ADD COLUMN level INT DEFAULT NULL;
ALTER TABLE referral_earnings ADD INDEX idx_type (type);

-- =====================================================
-- CLEANUP
-- =====================================================

-- DROP TABLE IF EXISTS processed_deposits;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
