-- SHH: SSH and Docker Management Database Initialization Script
-- Version: 1.1.0
-- Last Updated: 2024-01-06
-- Description: Comprehensive database schema with advanced internationalization and compliance features

-- Ensure safe schema creation and internationalization support
DO $$
BEGIN
  -- Check PostgreSQL version compatibility
  IF current_setting('server_version_num')::integer < 120000 THEN
    RAISE EXCEPTION 'Minimum PostgreSQL version 12 is required';
  END IF;

  -- Ensure necessary extensions are available
  IF NOT EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE EXTENSION pg_trgm;
  END IF;
END $$;

-- Enable essential PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

-- Internationalization Support Table
CREATE TABLE IF NOT EXISTS language_translations (
  id SERIAL PRIMARY KEY,
  language_code VARCHAR(10) NOT NULL, -- e.g., 'en', 'es', 'fr'
  context VARCHAR(100) NOT NULL, -- e.g., 'user_role', 'error_message'
  translation_key VARCHAR(255) NOT NULL,
  translation_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(language_code, context, translation_key)
);

-- Enhanced Users table with internationalization
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL
    CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$'),
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  full_name VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'en',
  role VARCHAR(50) DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'manager', 'viewer')),

  -- Compliance and Regulatory Fields
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  data_retention_consent BOOLEAN DEFAULT FALSE,

  -- Advanced security tracking
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Multi-factor authentication
  mfa_secret BYTEA,
  mfa_enabled BOOLEAN DEFAULT FALSE,

  -- Compliance Tracking
  gdpr_compliant BOOLEAN DEFAULT FALSE,
  privacy_policy_version VARCHAR(50),

  -- Password management
  password_reset_token UUID,
  password_reset_expires TIMESTAMP WITH TIME ZONE,

  -- Brute force protection
  login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,

  -- Audit and metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Encrypted additional metadata
  encrypted_metadata BYTEA
);

-- Compliance and Data Retention Policy Table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(100) NOT NULL,
  retention_period INTERVAL NOT NULL,
  deletion_strategy VARCHAR(50) NOT NULL, -- 'anonymize', 'delete', 'archive'
  last_enforced TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disaster Recovery and Backup Tracking
CREATE TABLE IF NOT EXISTS backup_records (
  id BIGSERIAL PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, snapshot
  storage_location TEXT NOT NULL,
  backup_size BIGINT,
  compression_ratio NUMERIC(5,2),
  encryption_method VARCHAR(50),
  status VARCHAR(50) NOT NULL, -- success, partial, failed
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retention_period INTERVAL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Optimization: Materialized Views
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT
  user_id,
  COUNT(*) as total_actions,
  MAX(created_at) as last_action_timestamp
FROM audit_logs
GROUP BY user_id
WITH DATA;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_language ON users(preferred_language);
CREATE INDEX IF NOT EXISTS idx_translations_context ON language_translations(context);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);

-- Trigger to refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_user_activity_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_activity_summary
AFTER INSERT OR UPDATE OR DELETE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_activity_summary();

-- Comments for future maintainability
COMMENT ON TABLE users IS 'User accounts with advanced internationalization and compliance features';
COMMENT ON TABLE language_translations IS 'Centralized translation management for internationalization';
COMMENT ON TABLE data_retention_policies IS 'Defines data retention and deletion strategies';

-- Permissions
GRANT SELECT ON users TO app_readonly;
GRANT SELECT, INSERT, UPDATE ON users TO app_readwrite;
GRANT SELECT ON language_translations TO app_readonly;
GRANT SELECT ON data_retention_policies TO app_readonly;
