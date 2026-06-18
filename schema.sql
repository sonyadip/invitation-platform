-- Aura Invite - Supabase Database Schema Migration Script
-- Execute this script directly in your Supabase SQL Editor (SQL Editor -> New Query)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if cleaning up (Optional)
-- DROP TABLE IF EXISTS custom_domains;
-- DROP TABLE IF EXISTS invitation_views;
-- DROP TABLE IF EXISTS rsvps;
-- DROP TABLE IF EXISTS gift_accounts;
-- DROP TABLE IF EXISTS gallery_images;
-- DROP TABLE IF EXISTS wedding_events;
-- DROP TABLE IF EXISTS invitation_settings;
-- DROP TABLE IF EXISTS weddings;
-- DROP TYPE IF EXISTS wedding_status;

-- 3. Create Custom Status ENUM
CREATE TYPE wedding_status AS ENUM ('draft', 'published', 'archived');

-- 4. Create WEDDINGS Table (Core Data)
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    bride_name VARCHAR(255) NOT NULL,
    groom_name VARCHAR(255) NOT NULL,
    bride_full_name VARCHAR(255) NOT NULL,
    groom_full_name VARCHAR(255) NOT NULL,
    wedding_date TIMESTAMPTZ NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT NOT NULL,
    maps_url TEXT NOT NULL,
    story JSONB NOT NULL DEFAULT '[]'::jsonb, -- Timeline array: [{"year": "2020", "title": "First Meet", "description": "..."}]
    music_url TEXT NULL,
    template VARCHAR(50) NOT NULL DEFAULT 'noir', -- folder key in src/templates, e.g. noir or sage
    status wedding_status NOT NULL DEFAULT 'draft',
    deleted_at TIMESTAMPTZ NULL,
    deleted_by VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create INVITATION SETTINGS Table
CREATE TABLE invitation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE UNIQUE,
    rsvp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    music_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    music_autoplay BOOLEAN NOT NULL DEFAULT FALSE,
    countdown_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    gallery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    wishes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    gift_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    share_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    view_counter_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date TIMESTAMPTZ NULL,
    password_protection_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    access_password VARCHAR(255) NULL, -- Password access code
    sections JSONB NOT NULL DEFAULT '{
        "hero": true,
        "countdown": true,
        "coupleInfo": true,
        "eventDetails": true,
        "story": true,
        "gallery": true,
        "rsvp": true,
        "wishes": true,
        "gift": true,
        "music": true,
        "share": true
    }'::jsonb,
    theme_config JSONB NOT NULL DEFAULT '{
        "theme": {
            "primaryColor": "#C8A165",
            "secondaryColor": "#F5F1EA",
            "textColor": "#2D3748",
            "bgColor": "#FFFFFF",
            "fontHeading": "Playfair Display",
            "fontBody": "Inter"
        },
        "layout": {
            "heroStyle": "centered",
            "galleryColumns": 3
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create WEDDING EVENTS Table (supports dynamic sub-events such as ceremony, reception, and tea ceremony)
CREATE TABLE wedding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL, -- Ceremony, Reception, Engagement, Tea Ceremony
    event_date TIMESTAMPTZ NOT NULL,
    start_time VARCHAR(50) NOT NULL, -- e.g., '09:00'
    end_time VARCHAR(50) NOT NULL,   -- e.g., '12:00' or 'Finished'
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT NOT NULL,
    maps_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create GALLERY IMAGES Table
CREATE TABLE gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create GIFT ACCOUNTS Table (Bank accounts & QRIS images)
CREATE TABLE gift_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL, -- e.g., 'BCA', 'Mandiri', 'GOPAY', 'QRIS'
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    qris_url TEXT NULL, -- Image URL for QRIS code scan
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Create RSVPS Table (Guest confirmations & wishes)
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    attendance_status VARCHAR(50) NOT NULL, -- 'attending', 'declined'
    guest_count INT NOT NULL DEFAULT 1,
    message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Create INVITATION VIEWS Table (Privacy-friendly daily view tracks)
CREATE TABLE invitation_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of client IP
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Create CUSTOM DOMAINS Table (Domain bindings)
CREATE TABLE custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE UNIQUE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- pending, active, failed
    ssl_status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Create Optimization Indexes
CREATE INDEX idx_weddings_slug ON weddings(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX idx_gallery_images_wedding ON gallery_images(wedding_id, sort_order);
CREATE INDEX idx_wedding_events_wedding ON wedding_events(wedding_id, sort_order);
CREATE INDEX idx_gift_accounts_wedding ON gift_accounts(wedding_id, sort_order);
CREATE INDEX idx_rsvps_wedding ON rsvps(wedding_id);
CREATE INDEX idx_invitation_views_hash ON invitation_views(wedding_id, ip_hash);

-- 13. Create Automatically Updated At Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_weddings_updated_at
    BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_settings_updated_at
    BEFORE UPDATE ON invitation_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Configure Row Level Security (RLS) Policies
-- By default, Supabase enables RLS on new tables. We must define public policies for invitations to load.

-- weddings
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read weddings" ON weddings;
CREATE POLICY "Allow public read weddings" ON weddings FOR SELECT TO public USING (true);

-- invitation_settings
ALTER TABLE invitation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read settings" ON invitation_settings;
CREATE POLICY "Allow public read settings" ON invitation_settings FOR SELECT TO public USING (true);

-- wedding_events
ALTER TABLE wedding_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read events" ON wedding_events;
CREATE POLICY "Allow public read events" ON wedding_events FOR SELECT TO public USING (true);

-- gallery_images
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read gallery" ON gallery_images;
CREATE POLICY "Allow public read gallery" ON gallery_images FOR SELECT TO public USING (true);

-- gift_accounts
ALTER TABLE gift_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read gifts" ON gift_accounts;
CREATE POLICY "Allow public read gifts" ON gift_accounts FOR SELECT TO public USING (true);

-- rsvps
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read rsvps" ON rsvps;
CREATE POLICY "Allow public read rsvps" ON rsvps FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow public insert rsvps" ON rsvps;
CREATE POLICY "Allow public insert rsvps" ON rsvps FOR INSERT TO public WITH CHECK (true);

-- invitation_views
ALTER TABLE invitation_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read views" ON invitation_views;
CREATE POLICY "Allow public read views" ON invitation_views FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow public insert views" ON invitation_views;
CREATE POLICY "Allow public insert views" ON invitation_views FOR INSERT TO public WITH CHECK (true);

-- custom_domains
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read domains" ON custom_domains;
CREATE POLICY "Allow public read domains" ON custom_domains FOR SELECT TO public USING (true);

-- 15. Create PLATFORM SETTINGS Table (Global platform configuration)
-- Run this migration separately if the table doesn't exist yet:
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_name VARCHAR(255) NOT NULL DEFAULT 'Senadda',
    site_tagline TEXT NULL,
    logo_url TEXT NULL,
    logo_dark_url TEXT NULL,
    whatsapp_url TEXT NULL,
    instagram_url TEXT NULL,
    email VARCHAR(255) NULL,
    facebook_url TEXT NULL,
    tiktok_url TEXT NULL,
    youtube_url TEXT NULL,
    home_heading_1 VARCHAR(255) NULL,
    home_heading_2 VARCHAR(255) NULL,
    home_heading_3 VARCHAR(255) NULL,
    home_description TEXT NULL,
    home_cta_label VARCHAR(255) NULL,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: public can read, only service_role can write
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read platform_settings" ON platform_settings;
CREATE POLICY "Allow public read platform_settings" ON platform_settings FOR SELECT TO public USING (true);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
