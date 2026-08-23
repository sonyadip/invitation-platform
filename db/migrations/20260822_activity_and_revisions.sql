-- =========================================================================
-- MIGRATION: Activity Logs & Invitation Revisions
-- Sifat: 100% Additive & Aman (Tidak menyentuh tabel eksisting)
-- =========================================================================

-- 1. Enable UUID Extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabel Activity Logs (Pencatatan Riwayat Aktivitas Terpusat)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    slug VARCHAR(255) NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin', 'client', 'guest', 'system'
    actor_name VARCHAR(255) NULL,                    -- e.g. 'Admin', 'Klien (wayan-ayu)', 'Budi Santoso'
    action VARCHAR(100) NOT NULL,                    -- 'invitation.create', 'invitation.update', 'rsvp.submit', 'revision.restore', etc.
    entity_type VARCHAR(50) NOT NULL DEFAULT 'invitation', -- 'invitation', 'platform', 'rsvp', 'revision', 'auth'
    entity_id VARCHAR(255) NULL,
    description TEXT NOT NULL,                       -- Human readable summary
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Diff summary, changes, user agent, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk optimasi query timeline & filter
CREATE INDEX IF NOT EXISTS idx_activity_logs_wedding_id ON activity_logs(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_slug ON activity_logs(slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 3. Tabel Invitation Revisions (Riwayat Snapshot Versi & Rollback Undangan)
CREATE TABLE IF NOT EXISTS invitation_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,                     -- e.g. 'Revisi #2: Perubahan jadwal & tema'
    note TEXT NULL,                                  -- Catatan opsional / checkpoint
    created_by VARCHAR(100) NOT NULL DEFAULT 'admin', -- 'admin' | 'client' | 'system'
    snapshot JSONB NOT NULL,                         -- Snapshot lengkap: wedding, settings, events, gallery, gifts
    changes_summary JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array list field yang berubah
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk urutan revisi
CREATE INDEX IF NOT EXISTS idx_invitation_revisions_wedding ON invitation_revisions(wedding_id, revision_number DESC);

-- 4. Row Level Security (RLS) Policies (Aman & Idempotent)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_revisions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Allow public read activity_logs') THEN
        CREATE POLICY "Allow public read activity_logs" ON activity_logs FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Allow public insert activity_logs') THEN
        CREATE POLICY "Allow public insert activity_logs" ON activity_logs FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitation_revisions' AND policyname = 'Allow public read invitation_revisions') THEN
        CREATE POLICY "Allow public read invitation_revisions" ON invitation_revisions FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitation_revisions' AND policyname = 'Allow public insert invitation_revisions') THEN
        CREATE POLICY "Allow public insert invitation_revisions" ON invitation_revisions FOR INSERT TO public WITH CHECK (true);
    END IF;
END $$;
