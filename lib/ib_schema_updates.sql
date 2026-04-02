-- ================================================
-- IB (Introducing Broker) Schema Updates
-- Run these queries in your MySQL/phpMyAdmin
-- ================================================

-- 1. Ensure 'ib_bonus' type exists in transactions table
-- If transactions.type is an ENUM, add ib_bonus to it:
ALTER TABLE `transactions` MODIFY COLUMN `type` ENUM(
    'deposit', 'withdrawal', 'commission', 'referral_bonus', 'ib_bonus'
) NOT NULL DEFAULT 'deposit';

-- 2. Create daily_salary_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS `daily_salary_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `tier_id` INT NOT NULL DEFAULT 1,
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `credited_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_date` (`user_id`, `credited_at`),
    INDEX `idx_credited_at` (`credited_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Ensure referral_earnings has type and level columns
-- (Run these only if the columns don't already exist)
-- ALTER TABLE `referral_earnings` ADD COLUMN `type` VARCHAR(50) DEFAULT 'commission' AFTER `amount`;
-- ALTER TABLE `referral_earnings` ADD COLUMN `level` INT DEFAULT NULL AFTER `type`;

-- 4. Insert default IB salary tiers into platform_settings
-- This makes them editable from the admin panel
INSERT INTO `platform_settings` (`setting_key`, `setting_value`)
VALUES ('ib_salary_tiers', '[
    {"id":1,"minDirect":6,"minActive":6,"minDeposit":12000,"dailySalary":480},
    {"id":2,"minDirect":6,"minActive":18,"minDeposit":36000,"dailySalary":1260},
    {"id":3,"minDirect":6,"minActive":36,"minDeposit":65000,"dailySalary":2080},
    {"id":4,"minDirect":6,"minActive":46,"minDeposit":120000,"dailySalary":3840},
    {"id":5,"minDirect":6,"minActive":86,"minDeposit":230000,"dailySalary":7360},
    {"id":6,"minDirect":6,"minActive":186,"minDeposit":350000,"dailySalary":11200},
    {"id":7,"minDirect":6,"minActive":236,"minDeposit":450000,"dailySalary":14400},
    {"id":8,"minDirect":6,"minActive":386,"minDeposit":750000,"dailySalary":22500},
    {"id":9,"minDirect":6,"minActive":786,"minDeposit":1250000,"dailySalary":40000},
    {"id":10,"minDirect":6,"minActive":1286,"minDeposit":1850000,"dailySalary":55500},
    {"id":11,"minDirect":6,"minActive":2086,"minDeposit":2850000,"dailySalary":108300},
    {"id":12,"minDirect":6,"minActive":3586,"minDeposit":4050000,"dailySalary":153900}
]')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ================================================
-- NOTES:
-- ================================================
-- • The ENUM ALTER on transactions may fail if your ENUM already has
--   different values. Check your current ENUM first:
--   SHOW COLUMNS FROM transactions LIKE 'type';
--   Then add any missing values to the ALTER statement.
--
-- • Query 3 (ALTER TABLE referral_earnings) is commented out.
--   Uncomment and run only if your referral_earnings table does NOT
--   already have `type` and `level` columns.
--
-- • After running these queries, go to Admin → Referral tab to see
--   and edit the IB milestones from the admin panel.
-- ================================================
