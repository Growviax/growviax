-- Migration: Add slot_number and duration columns to bid_rounds
-- This makes round identity deterministic (no more fuzzy TIMESTAMPDIFF matching)

-- Step 1: Add columns
ALTER TABLE `bid_rounds`
  ADD COLUMN `slot_number` BIGINT NOT NULL DEFAULT 0 AFTER `coin_id`,
  ADD COLUMN `duration` INT NOT NULL DEFAULT 33 AFTER `slot_number`;

-- Step 2: Backfill existing rows with computed slot_number
-- slot_number = floor(UNIX_TIMESTAMP(start_time) / duration)
UPDATE `bid_rounds` SET 
  `duration` = ROUND(TIMESTAMPDIFF(SECOND, start_time, end_time)),
  `slot_number` = FLOOR(UNIX_TIMESTAMP(start_time) / ROUND(TIMESTAMPDIFF(SECOND, start_time, end_time)))
WHERE `slot_number` = 0 AND start_time != end_time;

-- For any rows where start_time == end_time (bad data), use 33s default
UPDATE `bid_rounds` SET 
  `duration` = 33,
  `slot_number` = FLOOR(UNIX_TIMESTAMP(start_time) / 33)
WHERE `slot_number` = 0;

-- Step 3: Add unique index to prevent duplicate rounds per time slot
-- Use IGNORE to skip if duplicates exist from old data
ALTER IGNORE TABLE `bid_rounds`
  ADD UNIQUE INDEX `uq_coin_slot` (`coin_id`, `slot_number`, `duration`);
