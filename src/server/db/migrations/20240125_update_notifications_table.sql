-- Update notifications table to match new schema
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- Update existing rows
UPDATE notifications
  SET status = 'success',
      timestamp = COALESCE(created_at, NOW())
  WHERE status IS NULL;

-- Make status non-nullable after setting defaults
ALTER TABLE notifications
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN timestamp SET NOT NULL;
