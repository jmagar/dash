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
END;
$$;
