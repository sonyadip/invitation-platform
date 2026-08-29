-- =========================================================================
-- MIGRATION: Visitor Analytics, Guest Read-Receipts & Interaction Events
-- Sifat: 100% Additive & Non-Destructive (Aman untuk Live Production DB)
-- =========================================================================

-- 1. Tambah Kolom Analitik pada INVITATION_VIEWS (Opsional & Nullable)
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255) NULL;
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) NULL; -- 'mobile', 'desktop', 'tablet'
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS os VARCHAR(50) NULL;          -- 'iOS', 'Android', 'Windows', 'macOS', dll
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS browser VARCHAR(50) NULL;     -- 'WhatsApp', 'Chrome', 'Safari', 'Instagram', dll
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL;
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS country VARCHAR(50) NULL;
ALTER TABLE IF EXISTS invitation_views ADD COLUMN IF NOT EXISTS referrer TEXT NULL;

-- Indexing untuk query analitik per wedding & guest
CREATE INDEX IF NOT EXISTS idx_invitation_views_wedding_created ON invitation_views(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitation_views_guest_name ON invitation_views(wedding_id, guest_name);

-- 2. Tambah Kolom Read-Receipt pada SENT_INVITATIONS (Daftar Tamu)
ALTER TABLE IF EXISTS sent_invitations ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NULL;
ALTER TABLE IF EXISTS sent_invitations ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ NULL;
ALTER TABLE IF EXISTS sent_invitations ADD COLUMN IF NOT EXISTS open_count INT NOT NULL DEFAULT 0;

-- Indexing untuk pencarian nama tamu saat visit
CREATE INDEX IF NOT EXISTS idx_sent_invitations_lookup ON sent_invitations(wedding_id, LOWER(guest_name));

-- 3. Buat Tabel INVITATION_EVENTS (Pelacakan Interaksi Tombol/Fitur)
CREATE TABLE IF NOT EXISTS invitation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'open_cover', 'click_maps', 'click_calendar', 'copy_gift', 'play_music'
    guest_name VARCHAR(255) NULL,
    metadata JSONB NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk agregasi event per wedding
CREATE INDEX IF NOT EXISTS idx_invitation_events_wedding_type ON invitation_events(wedding_id, event_type);
CREATE INDEX IF NOT EXISTS idx_invitation_events_created ON invitation_events(wedding_id, created_at DESC);

-- 4. Row Level Security (RLS) Policies untuk INVITATION_EVENTS
ALTER TABLE IF EXISTS invitation_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitation_events' AND policyname = 'Allow public insert invitation_events') THEN
        CREATE POLICY "Allow public insert invitation_events" ON invitation_events FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitation_events' AND policyname = 'Allow service role all on invitation_events') THEN
        CREATE POLICY "Allow service role all on invitation_events" ON invitation_events FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
