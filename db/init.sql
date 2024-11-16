-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI's text-embedding-ada-002 uses 1536 dimensions
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memory_interactions table for tracking usage
CREATE TABLE memory_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    interaction_type TEXT NOT NULL,  -- 'create', 'read', 'update', 'delete'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_memory
        FOREIGN KEY(memory_id)
        REFERENCES memories(id)
        ON DELETE CASCADE
);

-- Create memory_categories table for organizing memories
CREATE TABLE memory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memory_category_assignments table
CREATE TABLE memory_category_assignments (
    memory_id UUID NOT NULL REFERENCES memories(id),
    category_id UUID NOT NULL REFERENCES memory_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, category_id),
    CONSTRAINT fk_memory
        FOREIGN KEY(memory_id)
        REFERENCES memories(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_category
        FOREIGN KEY(category_id)
        REFERENCES memory_categories(id)
        ON DELETE CASCADE
);

-- Create hosts table for SSH/agent management
CREATE TABLE hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    agent_status TEXT NOT NULL DEFAULT 'unknown',
    agent_version TEXT,
    agent_last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create commands table for command history
CREATE TABLE commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    command TEXT NOT NULL,
    args JSONB,
    cwd TEXT,
    env JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create metrics table for system metrics
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- CPU metrics
    cpu_total FLOAT NOT NULL,
    cpu_user FLOAT NOT NULL,
    cpu_system FLOAT NOT NULL,
    cpu_idle FLOAT NOT NULL,
    cpu_iowait FLOAT,
    cpu_steal FLOAT,
    cpu_cores INTEGER NOT NULL,
    cpu_threads INTEGER NOT NULL,

    -- Memory metrics
    memory_total BIGINT NOT NULL,
    memory_used BIGINT NOT NULL,
    memory_free BIGINT NOT NULL,
    memory_shared BIGINT NOT NULL,
    memory_buffers BIGINT,
    memory_cached BIGINT,
    memory_available BIGINT NOT NULL,
    memory_swap_total BIGINT NOT NULL,
    memory_swap_used BIGINT NOT NULL,
    memory_swap_free BIGINT NOT NULL,
    memory_usage FLOAT NOT NULL,

    -- Storage metrics
    storage_total BIGINT NOT NULL,
    storage_used BIGINT NOT NULL,
    storage_free BIGINT NOT NULL,
    storage_usage FLOAT NOT NULL,

    -- IO metrics
    io_read_count BIGINT,
    io_write_count BIGINT,
    io_read_bytes BIGINT,
    io_write_bytes BIGINT,
    io_time BIGINT,

    -- Network metrics
    net_bytes_sent BIGINT NOT NULL,
    net_bytes_recv BIGINT NOT NULL,
    net_packets_sent BIGINT NOT NULL,
    net_packets_recv BIGINT NOT NULL,
    net_errors_in BIGINT NOT NULL,
    net_errors_out BIGINT NOT NULL,
    net_drops_in BIGINT NOT NULL,
    net_drops_out BIGINT NOT NULL,
    net_connections INTEGER NOT NULL,
    net_tcp_conns INTEGER NOT NULL,
    net_udp_conns INTEGER NOT NULL,
    net_listen_ports INTEGER NOT NULL,
    net_interfaces INTEGER NOT NULL,
    net_total_speed BIGINT NOT NULL,
    net_average_speed BIGINT NOT NULL,

    -- System info
    uptime_seconds BIGINT NOT NULL,
    load_average_1 FLOAT NOT NULL,
    load_average_5 FLOAT NOT NULL,
    load_average_15 FLOAT NOT NULL,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create process_metrics table for process-specific metrics
CREATE TABLE process_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id),
    pid INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    name TEXT NOT NULL,
    command TEXT,
    username TEXT NOT NULL,

    cpu_usage FLOAT NOT NULL,
    memory_usage FLOAT NOT NULL,
    memory_rss BIGINT NOT NULL,
    memory_vms BIGINT NOT NULL,

    threads INTEGER NOT NULL,
    fds INTEGER,

    io_read_count BIGINT,
    io_write_count BIGINT,
    io_read_bytes BIGINT,
    io_write_bytes BIGINT,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('alert', 'info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    alert JSONB,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification preferences table
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    web_enabled BOOLEAN NOT NULL DEFAULT true,
    gotify_enabled BOOLEAN NOT NULL DEFAULT true,
    desktop_enabled BOOLEAN NOT NULL DEFAULT true,
    alert_types JSONB NOT NULL DEFAULT '{
        "alert": true,
        "info": true,
        "success": true,
        "warning": true,
        "error": true
    }'::jsonb,
    muted_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX memories_embedding_idx ON memories
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
CREATE INDEX memories_user_id_idx ON memories(user_id);
CREATE INDEX memory_interactions_memory_id_idx ON memory_interactions(memory_id);
CREATE INDEX memory_interactions_user_id_idx ON memory_interactions(user_id);
CREATE INDEX idx_hosts_user_id ON hosts(user_id);
CREATE INDEX idx_hosts_status ON hosts(status);
CREATE INDEX idx_hosts_agent_status ON hosts(agent_status);
CREATE INDEX idx_commands_host_id ON commands(host_id);
CREATE INDEX idx_commands_user_id ON commands(user_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_metrics_host_id ON metrics(host_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_process_metrics_host_id ON process_metrics(host_id);
CREATE INDEX idx_process_metrics_timestamp ON process_metrics(timestamp);
CREATE INDEX idx_process_metrics_pid ON process_metrics(pid);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_categories_updated_at
    BEFORE UPDATE ON memory_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at
    BEFORE UPDATE ON hosts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commands_updated_at
    BEFORE UPDATE ON commands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
    BEFORE UPDATE ON metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_metrics_updated_at
    BEFORE UPDATE ON process_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default memory categories
INSERT INTO memory_categories (name, description) VALUES
    ('Preferences', 'User preferences and settings'),
    ('Technical', 'Technical information and knowledge'),
    ('Personal', 'Personal information and history'),
    ('System', 'System-related information');

-- Insert default admin user
INSERT INTO users (username, email, role, password_hash) VALUES
    ('admin', 'admin@example.com', 'admin', '$2b$10$rQEL5.5qF9p4WaFQF9qX8O5X5Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z');
