-- Senadda Security & RLS Hardening Migration
-- Safe & Non-Destructive: Does NOT drop tables, does NOT alter existing columns, does NOT delete data.
-- Run in Supabase SQL Editor (SQL Editor -> New Query)

-- 1. Protect Audit Activity Logs (activity_logs)
-- Restrict public anon from reading or injecting audit logs directly via REST API.
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow public insert activity_logs" ON activity_logs;

-- Only service_role can read and insert activity_logs
CREATE POLICY "Allow service role all on activity_logs" 
ON activity_logs 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 2. Protect Invitation Revisions (invitation_revisions)
-- Restrict public anon from dumping snapshots or injecting revision history.
ALTER TABLE IF EXISTS invitation_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read invitation_revisions" ON invitation_revisions;
DROP POLICY IF EXISTS "Allow public insert invitation_revisions" ON invitation_revisions;

-- Only service_role can read and manage revisions
CREATE POLICY "Allow service role all on invitation_revisions" 
ON invitation_revisions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 3. Protect Sent Invitations (sent_invitations)
ALTER TABLE IF EXISTS sent_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read sent_invitations" ON sent_invitations;
DROP POLICY IF EXISTS "Allow public insert sent_invitations" ON sent_invitations;
DROP POLICY IF EXISTS "Allow public delete sent_invitations" ON sent_invitations;

CREATE POLICY "Allow service role all on sent_invitations" 
ON sent_invitations 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Ensure Indexes on Core Queries (Non-blocking IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_weddings_slug_active ON weddings(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sent_invitations_wedding_id ON sent_invitations(wedding_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_wedding_created ON rsvps(wedding_id, created_at DESC);
