-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
CREATE TYPE role AS ENUM ('admin', 'user');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memory_categories table
CREATE TABLE IF NOT EXISTS memory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memory_category_assignments table
CREATE TABLE IF NOT EXISTS memory_category_assignments (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES memory_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, category_id)
);

-- Create memory_interactions table
CREATE TABLE IF NOT EXISTS memory_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    interaction_type VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create hosts table
CREATE TABLE IF NOT EXISTS hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    password TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'offline',
    agent_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    agent_version VARCHAR(50),
    agent_last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create commands table
CREATE TABLE IF NOT EXISTS commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    command TEXT NOT NULL,
    args JSONB,
    cwd TEXT,
    env JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop existing user_preferences table if it exists
DROP TABLE IF EXISTS "user_preferences" CASCADE;

-- Create settings_store table for both admin and user settings
CREATE TABLE IF NOT EXISTS settings_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, subcategory)
);

-- Create settings_cache table for performance
CREATE TABLE IF NOT EXISTS settings_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, cache_key)
);

-- Create admin_settings table for system-wide settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category)
);

-- Create file_explorer_preferences table
CREATE TABLE IF NOT EXISTS file_explorer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_mode VARCHAR(50) NOT NULL DEFAULT 'list',
    sort_field VARCHAR(50) NOT NULL DEFAULT 'name',
    sort_direction VARCHAR(4) NOT NULL DEFAULT 'asc',
    show_hidden_files BOOLEAN NOT NULL DEFAULT false,
    preview_pane_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create directory_cache table
CREATE TABLE IF NOT EXISTS directory_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    content JSONB NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(host_id, path)
);

-- Create file_operations_history table
CREATE TABLE IF NOT EXISTS file_operations_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compression_preferences table
CREATE TABLE IF NOT EXISTS compression_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_format VARCHAR(50) NOT NULL DEFAULT 'zip',
    preserve_structure BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create compression_history table
CREATE TABLE IF NOT EXISTS compression_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    source_paths TEXT[] NOT NULL,
    target_path TEXT NOT NULL,
    format VARCHAR(50) NOT NULL,
    size_before BIGINT,
    size_after BIGINT,
    compression_ratio FLOAT,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create file_access_patterns table
CREATE TABLE IF NOT EXISTS file_access_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, host_id, path)
);

-- Create file_type_associations table
CREATE TABLE IF NOT EXISTS file_type_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_extension VARCHAR(50) NOT NULL,
    preview_mode VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, file_extension)
);

-- Create file_search_history table
CREATE TABLE IF NOT EXISTS file_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create file_favorites table
CREATE TABLE IF NOT EXISTS file_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, host_id, path)
);

-- Create file_tags table
CREATE TABLE IF NOT EXISTS file_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Create file_tag_assignments table
CREATE TABLE IF NOT EXISTS file_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tag_id, user_id, host_id, path)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers for all tables with updated_at
DO $$
BEGIN
    -- users table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at_trigger') THEN
        CREATE TRIGGER users_updated_at_trigger
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- memories table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'memories_updated_at_trigger') THEN
        CREATE TRIGGER memories_updated_at_trigger
            BEFORE UPDATE ON memories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- memory_categories table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'memory_categories_updated_at_trigger') THEN
        CREATE TRIGGER memory_categories_updated_at_trigger
            BEFORE UPDATE ON memory_categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- hosts table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'hosts_updated_at_trigger') THEN
        CREATE TRIGGER hosts_updated_at_trigger
            BEFORE UPDATE ON hosts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- file_explorer_preferences table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'file_explorer_preferences_updated_at_trigger') THEN
        CREATE TRIGGER file_explorer_preferences_updated_at_trigger
            BEFORE UPDATE ON file_explorer_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- directory_cache table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'directory_cache_updated_at_trigger') THEN
        CREATE TRIGGER directory_cache_updated_at_trigger
            BEFORE UPDATE ON directory_cache
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- compression_preferences table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'compression_preferences_updated_at_trigger') THEN
        CREATE TRIGGER compression_preferences_updated_at_trigger
            BEFORE UPDATE ON compression_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- file_access_patterns table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'file_access_patterns_updated_at_trigger') THEN
        CREATE TRIGGER file_access_patterns_updated_at_trigger
            BEFORE UPDATE ON file_access_patterns
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- file_type_associations table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'file_type_associations_updated_at_trigger') THEN
        CREATE TRIGGER file_type_associations_updated_at_trigger
            BEFORE UPDATE ON file_type_associations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- file_tags table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'file_tags_updated_at_trigger') THEN
        CREATE TRIGGER file_tags_updated_at_trigger
            BEFORE UPDATE ON file_tags
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- settings_store table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'settings_store_updated_at_trigger') THEN
        CREATE TRIGGER settings_store_updated_at_trigger
            BEFORE UPDATE ON settings_store
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- admin_settings table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'admin_settings_updated_at_trigger') THEN
        CREATE TRIGGER admin_settings_updated_at_trigger
            BEFORE UPDATE ON admin_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_store_user_id ON settings_store(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_store_category ON settings_store(category);
CREATE INDEX IF NOT EXISTS idx_settings_cache_user_id ON settings_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_cache_expires ON settings_cache(expires_at);

-- Insert default admin settings
INSERT INTO admin_settings (category, settings)
VALUES 
    ('system', '{
        "serverSettings": {
            "logLevel": "info",
            "maxConcurrentOperations": 10,
            "tempFileLifetime": 24
        },
        "databaseSettings": {
            "connectionPoolSize": 10,
            "statementTimeout": 30,
            "idleTimeout": 60
        },
        "securitySettings": {
            "sessionTimeout": 60,
            "maxLoginAttempts": 5,
            "passwordPolicy": {
                "minLength": 8,
                "requireNumbers": true,
                "requireSpecialChars": true,
                "requireUppercase": true,
                "requireLowercase": true
            }
        }
    }'::jsonb)
ON CONFLICT (category) DO UPDATE
SET settings = EXCLUDED.settings;

-- Insert default user preferences for existing users
INSERT INTO settings_store (user_id, category, subcategory, settings)
SELECT 
    id as user_id,
    'interface',
    'general',
    '{
        "theme": "system",
        "accentColor": "#1976d2",
        "language": "en",
        "layout": {
            "density": "comfortable",
            "sidebarWidth": 240,
            "sidebarCollapsed": false,
            "terminalHeight": 300
        },
        "fonts": {
            "size": 14,
            "useCustomMonoFont": false
        }
    }'::jsonb
FROM users
ON CONFLICT (user_id, category, subcategory) DO NOTHING;
