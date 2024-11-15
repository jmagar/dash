-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Create trigger for users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Create index for vector similarity search
CREATE INDEX memories_embedding_idx ON memories
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for user_id lookups
CREATE INDEX memories_user_id_idx ON memories(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Create index for memory_interactions lookups
CREATE INDEX memory_interactions_memory_id_idx ON memory_interactions(memory_id);
CREATE INDEX memory_interactions_user_id_idx ON memory_interactions(user_id);

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

-- Create trigger for memory_categories updated_at
CREATE TRIGGER update_memory_categories_updated_at
    BEFORE UPDATE ON memory_categories
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
