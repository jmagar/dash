-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT,
    gdpr_compliant BOOLEAN NOT NULL DEFAULT false,
    preferences JSONB NOT NULL DEFAULT '{
        "theme": "system",
        "language": "en",
        "terminalFontFamily": "monospace",
        "terminalFontSize": 14
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hosts table
CREATE TABLE IF NOT EXISTS hosts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username VARCHAR(255),
    password TEXT,
    ssh_key_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SSH Keys table
CREATE TABLE IF NOT EXISTS ssh_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    private_key TEXT NOT NULL,
    public_key TEXT NOT NULL,
    passphrase TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Command History table
CREATE TABLE IF NOT EXISTS command_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES hosts(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    output TEXT,
    exit_code INTEGER,
    duration INTEGER, -- in milliseconds
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to hosts table after ssh_keys table is created
ALTER TABLE hosts
ADD CONSTRAINT fk_ssh_key
FOREIGN KEY (ssh_key_id)
REFERENCES ssh_keys(id)
ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_hosts_name ON hosts(name);
CREATE INDEX idx_hosts_hostname ON hosts(hostname);
CREATE INDEX idx_hosts_username ON hosts(username);
CREATE INDEX idx_ssh_keys_user_id ON ssh_keys(user_id);
CREATE INDEX idx_command_history_user_id ON command_history(user_id);
CREATE INDEX idx_command_history_host_id ON command_history(host_id);
CREATE INDEX idx_command_history_created_at ON command_history(created_at);

-- Insert default admin user if auth is not disabled
DO $$
BEGIN
    IF NOT current_setting('custom.disable_auth', true) = 'true' THEN
        INSERT INTO users (username, email, password_hash, role, is_active, gdpr_compliant)
        VALUES (
            'admin',
            'admin@localhost',
            '$2b$10$5RoQxE1/UKqHPxqGWORz9.ex1v4j3/8ZN0IZJ5JzOVXWNdAHzuA4.',
            'admin',
            true,
            true
        ) ON CONFLICT (username) DO NOTHING;
    END IF;
END $$;
