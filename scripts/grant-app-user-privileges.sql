-- Grants the app's service account access to every table and sequence in "public".
-- Run as superuser (or the schema owner) after applying migrations:
--   psql -U postgres -d devocional_quest -v app_user=$DB_USER -f scripts/grant-app-user-privileges.sql

GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

-- Tables/sequences created later by the same role get the same privileges automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"app_user";
