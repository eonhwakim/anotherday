-- Add end_date column to user_goals
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update all currently active goals to expire at the end of the current month
-- This transitions the existing "indefinite" goals to the new "monthly" system.
-- Sets end_date to the last day of the current month dynamically
UPDATE user_goals 
SET end_date = (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date
WHERE is_active = true AND end_date IS NULL;
