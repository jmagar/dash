-- File System Monitoring
CREATE TABLE IF NOT EXISTS file_system_events (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'create', 'modify', 'delete', 'access'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT REFERENCES users(id),
    metadata JSONB
);

CREATE INDEX idx_fs_events_path ON file_system_events(path);
CREATE INDEX idx_fs_events_timestamp ON file_system_events(timestamp);

-- Process Monitoring
CREATE TABLE IF NOT EXISTS process_metrics (
    id SERIAL PRIMARY KEY,
    host_id TEXT REFERENCES hosts(id),
    process_id INTEGER,
    name TEXT,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_process_metrics_host ON process_metrics(host_id, timestamp);

-- Network Monitoring
CREATE TABLE IF NOT EXISTS network_metrics (
    id SERIAL PRIMARY KEY,
    host_id TEXT REFERENCES hosts(id),
    interface TEXT,
    bytes_in BIGINT,
    bytes_out BIGINT,
    packets_in BIGINT,
    packets_out BIGINT,
    errors_in INTEGER,
    errors_out INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_network_metrics_host ON network_metrics(host_id, timestamp);

-- User Activity
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    activity_type TEXT NOT NULL, -- 'command', 'navigation', 'api_call', etc.
    resource TEXT, -- file path, API endpoint, etc.
    status TEXT, -- 'success', 'failure', etc.
    duration INTEGER, -- in milliseconds
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id, timestamp);

-- Application Metrics
CREATE TABLE IF NOT EXISTS application_metrics (
    id SERIAL PRIMARY KEY,
    metric_type TEXT NOT NULL,
    value FLOAT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    tags JSONB,
    metadata JSONB
);

CREATE INDEX idx_app_metrics_type ON application_metrics(metric_type, timestamp);

-- System Events
CREATE TABLE IF NOT EXISTS system_events (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
    source TEXT NOT NULL, -- 'docker', 'ssh', 'filesystem', etc.
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_system_events_type ON system_events(event_type, timestamp);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT REFERENCES users(id),
    preference_key TEXT NOT NULL,
    preference_value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, preference_key)
);

-- Service Dependencies
CREATE TABLE IF NOT EXISTS service_dependencies (
    id SERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    depends_on TEXT NOT NULL,
    status TEXT NOT NULL, -- 'required', 'optional'
    health_check TEXT, -- health check endpoint or command
    metadata JSONB
);

CREATE UNIQUE INDEX idx_service_deps ON service_dependencies(service_name, depends_on);
