-- Add username and password fields to hosts table
ALTER TABLE hosts
ADD COLUMN username VARCHAR(255),
ADD COLUMN password TEXT;
