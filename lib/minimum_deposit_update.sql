-- =====================================================
-- GrowViax - Minimum Deposit for Earnings Update
-- Database: growviax (XAMPP MySQL)
-- Run this in phpMyAdmin against the growviax database
-- =====================================================

USE growviax;

-- =====================================================
-- 1. UPDATE: Change new user max win amount from 500 to 100
-- Users get first 3 wins only if bet amount < 100 (was 500)
-- =====================================================

UPDATE platform_settings 
SET setting_value = '100' 
WHERE setting_key = 'new_user_max_win_amount';

-- If the setting doesn't exist, insert it
INSERT INTO platform_settings (setting_key, setting_value) 
VALUES ('new_user_max_win_amount', '100')
ON DUPLICATE KEY UPDATE setting_value = '100';

-- =====================================================
-- 2. NEW: Minimum deposit required to earn commissions
-- Users must deposit at least 500 total to earn:
-- - Referral bonus (3% of referred user's first deposit)
-- - L6 commission (from downline trades)
-- - IB daily salary
-- =====================================================

INSERT INTO platform_settings (setting_key, setting_value) 
VALUES ('min_deposit_for_earnings', '500')
ON DUPLICATE KEY UPDATE setting_value = '500';

-- =====================================================
-- VERIFICATION: Check the settings are correct
-- =====================================================

SELECT setting_key, setting_value 
FROM platform_settings 
WHERE setting_key IN ('new_user_max_win_amount', 'min_deposit_for_earnings');

-- =====================================================
-- END OF UPDATE
-- =====================================================
