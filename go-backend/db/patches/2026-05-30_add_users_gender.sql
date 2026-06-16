-- Patch: add the users.gender column + gender_type enum.
-- The live DB was initialized from a schema that predated the gender column
-- (schema_initializer.sql only runs on first boot of an empty volume), so
-- Google sign-up (which INSERTs gender) failed with SQLSTATE 42703.
-- Safe to re-run: guarded with IF NOT EXISTS.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE gender_type AS ENUM ('male', 'female', 'prefer_not_to_say');
    END IF;
END$$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender gender_type;
