-- Growviax FD manual updates
-- Apply this file manually on your database before using the new FD stacking flow.

START TRANSACTION;

ALTER TABLE `fd_transactions`
  MODIFY `type` enum(
    'deposit',
    'withdrawal',
    'fd_invest',
    'fd_return',
    'fd_profit',
    'profit_share',
    'admin_adjustment',
    'referral_bonus',
    'liquidity_bonus'
  ) NOT NULL;

CREATE TABLE IF NOT EXISTS `fd_referral_earnings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `from_user_id` int(11) NOT NULL,
  `fd_deposit_id` int(11) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `type` enum('referral_bonus','liquidity_bonus') NOT NULL,
  `month_number` int(11) DEFAULT NULL,
  `event_key` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_key` (`event_key`),
  KEY `idx_user` (`user_id`),
  KEY `idx_from_user` (`from_user_id`),
  KEY `idx_fd_deposit` (`fd_deposit_id`),
  CONSTRAINT `fd_referral_earnings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fd_referral_earnings_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `fd_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fd_referral_earnings_ibfk_3` FOREIGN KEY (`fd_deposit_id`) REFERENCES `fd_deposits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `fd_settings` (`setting_key`, `setting_value`)
VALUES
  ('fd_lock_months', '6'),
  ('fd_referral_bonus_rate', '5'),
  ('fd_liquidity_bonus_rate', '1'),
  ('fd_starter_min_usdt', '50'),
  ('fd_starter_max_usdt', '1000'),
  ('fd_starter_monthly_rate', '5'),
  ('fd_elite_min_usdt', '1000'),
  ('fd_elite_monthly_rate', '6')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

UPDATE `fd_settings`
SET `setting_value` = '98'
WHERE `setting_key` = 'usd_to_inr_rate';

UPDATE `fd_settings`
SET `setting_value` = '0'
WHERE `setting_key` IN ('profit_sharing_enabled', 'profit_sharing_duration_months', 'min_deposit_upi');

COMMIT;
