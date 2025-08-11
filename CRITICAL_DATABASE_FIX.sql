-- CRITICAL DATABASE FIXES
-- Run this SQL immediately in your Supabase SQL editor

-- 1. Add missing columns to push_tokens table
ALTER TABLE push_tokens 
ADD COLUMN IF NOT EXISTS app_version TEXT,
ADD COLUMN IF NOT EXISTS os_version TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update the push_tokens table structure to match the code expectations
-- (This is safe to run multiple times)
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_tokens' AND column_name='app_version') THEN
        ALTER TABLE push_tokens ADD COLUMN app_version TEXT DEFAULT '1.0.0';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_tokens' AND column_name='os_version') THEN
        ALTER TABLE push_tokens ADD COLUMN os_version TEXT DEFAULT 'unknown';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_tokens' AND column_name='is_active') THEN
        ALTER TABLE push_tokens ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Update the unique constraint to match what the code expects
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_device_id_key;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_id_device_id_unique UNIQUE (user_id, device_id);

-- 4. Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

-- 5. Clean up any invalid tokens (safe cleanup)
UPDATE push_tokens 
SET is_active = false 
WHERE token IS NULL OR token = '';

COMMENT ON TABLE push_tokens IS 'Stores push notification tokens for users devices';