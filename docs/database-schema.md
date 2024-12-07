# Database Schema Documentation

This document provides a comprehensive overview of the database schema used in the Dash application. The schema is implemented using Prisma and PostgreSQL.

## Overview

The database schema is designed to support a multi-user system with remote host management, memory storage, and user preferences. It uses modern PostgreSQL features including UUID generation, JSON storage, and custom vector types for embeddings.

## Models

### User
The central model representing application users.

**Fields:**
- `id`: UUID, primary key
- `username`: Unique string
- `email`: Unique string
- `role`: Enum (admin/user)
- `isActive`: Boolean, defaults to true
- `passwordHash`: String
- `createdAt`: Timestamp with timezone
- `updatedAt`: Timestamp with timezone

**Relations:**
- Has many: memories, hosts, commands, interactions, bookmarks
- Has one: preferences

### Memory
Stores content with vector embeddings for AI processing.

**Fields:**
- `id`: UUID, primary key
- `userId`: UUID, foreign key to User
- `content`: String
- `embedding`: Vector(1536), optional
- `metadata`: JSON, optional
- `createdAt`: Timestamp with timezone
- `updatedAt`: Timestamp with timezone

**Relations:**
- Belongs to: User
- Has many: categories (through MemoryCategoryAssignment)
- Has many: interactions

### MemoryInteraction
Tracks user interactions with memories.

**Fields:**
- `id`: UUID, primary key
- `memoryId`: UUID, foreign key to Memory
- `userId`: UUID, foreign key to User
- `interactionType`: String
- `metadata`: JSON, optional
- `createdAt`: Timestamp with timezone

**Relations:**
- Belongs to: Memory (with cascade delete)
- Belongs to: User

### MemoryCategory & MemoryCategoryAssignment
Implements a flexible categorization system for memories.

**MemoryCategory Fields:**
- `id`: UUID, primary key
- `name`: String
- `description`: String, optional
- `createdAt`: Timestamp with timezone
- `updatedAt`: Timestamp with timezone

**MemoryCategoryAssignment Fields:**
- Composite primary key: [memoryId, categoryId]
- `createdAt`: Timestamp with timezone

### Host
Represents remote hosts/servers in the system.

**Fields:**
- `id`: UUID, primary key
- `userId`: UUID, foreign key to User
- `name`: String
- `hostname`: String
- `port`: Integer
- `username`: String
- `password`: String, optional
- `status`: String, defaults to "offline"
- `agentStatus`: String, defaults to "unknown"
- `agentVersion`: String, optional
- `agentLastSeen`: Timestamp with timezone, optional
- `metadata`: JSON
- `createdAt`: Timestamp with timezone
- `updatedAt`: Timestamp with timezone

**Relations:**
- Belongs to: User
- Has many: commands, metrics, bookmarks

### Bookmark
File system bookmarks for remote hosts.

**Fields:**
- `id`: UUID, primary key
- `userId`: UUID, foreign key to User
- `hostId`: UUID, foreign key to Host
- `path`: String
- `name`: String
- `isDirectory`: Boolean
- `notes`: String, optional
- `addedAt`: Timestamp with timezone
- `lastAccessed`: Timestamp with timezone (auto-updated)

**Constraints:**
- Unique combination of [userId, hostId, path]

### Command
Records commands executed on remote hosts.

**Fields:**
- `id`: UUID, primary key
- `hostId`: UUID, foreign key to Host
- `userId`: UUID, foreign key to User
- `command`: String
- `args`: JSON, optional
- `cwd`: String, optional
- `env`: JSON, optional
- `createdAt`: Timestamp with timezone

### Metric
Simple metrics tracking for hosts.

**Fields:**
- `id`: UUID, primary key
- `hostId`: UUID, foreign key to Host
- `timestamp`: Timestamp with timezone

### UserPreferences
Stores user interface preferences.

**Fields:**
- `id`: String (CUID)
- `userId`: String, unique foreign key to User
- `themeMode`: String, defaults to "system"
- `accentColor`: String, optional
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Relations:**
- One-to-one with User (with cascade delete)

## Technical Details

### Database Features
- Uses PostgreSQL with timezone-aware timestamps
- Implements custom vector type for AI embeddings
- Utilizes JSON fields for flexible metadata storage
- Employs UUIDs for primary keys (except UserPreferences)

### Prisma Features
- Automatic timestamps (`@updatedAt`)
- Table name mapping (`@@map`)
- Cascade deletes where appropriate
- Custom database types (vector)
- Enum types (Role)

### Security Considerations
- Passwords are stored as hashes
- Optional password field for host connections
- Role-based access control built into User model

### Best Practices
1. Always use the provided timestamps for tracking creation and updates
2. Utilize JSON fields for flexible metadata rather than creating new columns
3. Leverage the cascading deletes for proper cleanup of related records
4. Use the unique constraints to maintain data integrity
