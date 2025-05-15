-- Remove unique constraint from username column in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;