-- Add deleted_at column for soft delete
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.user_goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update RLS policies or existing queries if necessary
-- Note: RLS policies generally do not need updating just for adding a column,
-- as the filtering is done at the application level (e.g. .is('deleted_at', null)).
