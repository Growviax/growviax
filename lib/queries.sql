-- ============================================
-- GrowViax Database Schema
-- All SQL queries in one file for manual management
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS growviax;
USE growviax;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(100) NOT NULL UNIQUE,
  wallet_balance DECIMAL(18, 8) DEFAULT 0.00000000,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  referred_by VARCHAR(20) DEFAULT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_referral_code (referral_code),
  INDEX idx_wallet_address (wallet_address)
);

-- ============================================
-- OTP CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_code (email, code)
);

-- ============================================
-- BID ROUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bid_rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coin_id VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status ENUM('open', 'closed', 'resolved') DEFAULT 'open',
  total_up_amount DECIMAL(18, 8) DEFAULT 0.00000000,
  total_down_amount DECIMAL(18, 8) DEFAULT 0.00000000,
  total_up_users INT DEFAULT 0,
  total_down_users INT DEFAULT 0,
  winning_side ENUM('up', 'down') DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coin_status (coin_id, status),
  INDEX idx_end_time (end_time)
);

-- ============================================
-- BIDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coin_id VARCHAR(50) NOT NULL,
  round_id INT NOT NULL,
  direction ENUM('up', 'down') NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
  payout DECIMAL(18, 8) DEFAULT 0.00000000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES bid_rounds(id) ON DELETE CASCADE,
  INDEX idx_user_coin (user_id, coin_id),
  INDEX idx_round (round_id),
  INDEX idx_status (status)
);

-- ============================================
-- TRANSACTIONS TABLE (Deposits & Withdrawals)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('deposit', 'withdrawal', 'bid_win', 'bid_loss', 'referral_bonus', 'trading_fee', 'commission') NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  wallet_address VARCHAR(100) DEFAULT NULL,
  status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
  tx_hash VARCHAR(100) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, type),
  INDEX idx_status (status)
);

-- ============================================
-- SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  attachment_url VARCHAR(500) DEFAULT NULL,
  status ENUM('open', 'in_progress', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- ============================================
-- TICKET REPLIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id)
);

-- ============================================
-- REFERRAL EARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referral_earnings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_user_id INT NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);


-- ============================================
-- QUERY TEMPLATES
-- ============================================

-- ---- AUTH QUERIES ----

-- Insert new user
-- INSERT INTO users (name, email, phone, password_hash, wallet_address, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?);

-- Get user by email
-- SELECT * FROM users WHERE email = ? LIMIT 1;

-- Get user by id
-- SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, created_at FROM users WHERE id = ? LIMIT 1;

-- Update user profile
-- UPDATE users SET name = ?, phone = ? WHERE id = ?;

-- Change password
-- UPDATE users SET password_hash = ? WHERE id = ?;

-- ---- OTP QUERIES ----

-- Insert OTP
-- INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?);

-- Verify OTP
-- SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND is_used = 0 ORDER BY created_at DESC LIMIT 1;

-- Mark OTP used
-- UPDATE otp_codes SET is_used = 1 WHERE id = ?;

-- ---- BID QUERIES ----

-- Get or create current round
-- SELECT * FROM bid_rounds WHERE coin_id = ? AND status = 'open' AND end_time > NOW() ORDER BY created_at DESC LIMIT 1;

-- Create new round
-- INSERT INTO bid_rounds (coin_id, start_time, end_time) VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 30 SECOND));

-- Place bid
-- INSERT INTO bids (user_id, coin_id, round_id, direction, amount) VALUES (?, ?, ?, ?, ?);

-- Update round totals
-- UPDATE bid_rounds SET total_up_amount = total_up_amount + ?, total_up_users = total_up_users + 1 WHERE id = ?;
-- UPDATE bid_rounds SET total_down_amount = total_down_amount + ?, total_down_users = total_down_users + 1 WHERE id = ?;

-- Close round
-- UPDATE bid_rounds SET status = 'closed' WHERE id = ?;

-- Resolve round
-- UPDATE bid_rounds SET status = 'resolved', winning_side = ? WHERE id = ?;

-- Get bids for round
-- SELECT * FROM bids WHERE round_id = ?;

-- Update winning bids
-- UPDATE bids SET status = 'won', payout = ? WHERE id = ?;

-- Update losing bids
-- UPDATE bids SET status = 'lost' WHERE round_id = ? AND direction = ?;

-- User bid history
-- SELECT b.*, br.winning_side FROM bids b JOIN bid_rounds br ON b.round_id = br.id WHERE b.user_id = ? AND b.coin_id = ? ORDER BY b.created_at DESC LIMIT ? OFFSET ?;

-- ---- WALLET QUERIES ----

-- Update wallet balance
-- UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?;

-- Deduct wallet balance
-- UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?;

-- Insert transaction
-- INSERT INTO transactions (user_id, type, amount, wallet_address, status, notes) VALUES (?, ?, ?, ?, ?, ?);

-- Get transactions
-- SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- Get transactions by type
-- SELECT * FROM transactions WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- ---- SUPPORT QUERIES ----

-- Create ticket
-- INSERT INTO support_tickets (user_id, subject, description, attachment_url) VALUES (?, ?, ?, ?);

-- Get user tickets  
-- SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC;

-- Get ticket by id
-- SELECT * FROM support_tickets WHERE id = ? AND user_id = ?;

-- ---- REFERRAL QUERIES ----

-- Get referral count
-- SELECT COUNT(*) as total FROM users WHERE referred_by = ?;

-- Get referral earnings
-- SELECT SUM(amount) as total FROM referral_earnings WHERE user_id = ?;

-- Insert referral earning
-- INSERT INTO referral_earnings (user_id, from_user_id, amount) VALUES (?, ?, ?);
