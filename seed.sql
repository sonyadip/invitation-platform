-- Aura Invite - Supabase Database Seed Script
-- Copy and run this script in the Supabase SQL Editor to create complete dummy data.
-- This script removes existing data for the 'wayan-ayu' slug before inserting fresh data.

DO $$
DECLARE
    v_wedding_id UUID;
BEGIN
    -- 1. Clean up existing data for the 'wayan-ayu' slug if present
    DELETE FROM weddings WHERE slug = 'wayan-ayu';

    -- 2. Insert the main wedding data into the 'weddings' table
    INSERT INTO weddings (
        slug,
        bride_name,
        groom_name,
        bride_full_name,
        groom_full_name,
        wedding_date,
        venue_name,
        venue_address,
        maps_url,
        story,
        music_url,
        template,
        status
    ) VALUES (
        'wayan-ayu',
        'Ayu',
        'Wayan',
        'Ni Putu Ayu Lestari',
        'I Wayan Aditya Pramana',
        NOW() + INTERVAL '30 days', -- Date 30 days ahead so the countdown can run
        'Taman Bhagawan Bali',
        'Jl. Pratama No.70, Benoa, Kec. Kuta Selatan, Kabupaten Badung, Bali 80361',
        'https://maps.app.goo.gl/8dEFxg5Wb1PNYzvB7',
        '[
            {"year": "2020", "title": "Pertama Kali Bertemu", "description": "Kami pertama kali bertemu di Sanur saat menghadiri upacara keluarga dan mulai saling mengenal sejak hari itu."},
            {"year": "2022", "title": "Menjalin Komitmen", "description": "Setelah dua tahun bersama, kami saling mendukung dalam keluarga, karya, dan tradisi yang kami jalani."},
            {"year": "2025", "title": "Memadik", "description": "Di hadapan keluarga besar, Wayan memadik Ayu sebagai tanda kesungguhan untuk melangkah ke pawiwahan."}
        ]'::jsonb,
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', -- Instant test MP3 music file
        'noir', -- modern, elegant, luxury, or noir
        'published' -- status must be 'published' so the public can access it
    ) RETURNING id INTO v_wedding_id;

    -- 3. Insert into 'invitation_settings' to enable all feature modules
    INSERT INTO invitation_settings (
        wedding_id,
        rsvp_enabled,
        music_enabled,
        music_autoplay,
        countdown_enabled,
        gallery_enabled,
        wishes_enabled,
        gift_enabled,
        share_enabled,
        view_counter_enabled,
        maintenance_mode,
        password_protection_enabled,
        access_password,
        sections,
        theme_config
    ) VALUES (
        v_wedding_id,
        TRUE, -- RSVP enabled
        TRUE, -- music enabled
        FALSE, -- autoplay disabled to avoid surprising users
        TRUE, -- countdown enabled
        TRUE, -- gallery enabled
        TRUE, -- wishes enabled
        TRUE, -- gift enabled
        TRUE, -- share enabled
        TRUE, -- counter enabled
        FALSE, -- maintenance disabled
        FALSE, -- password lock disabled for easier testing
        'nikah2026', -- fallback password
        '{
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
        '{
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
        }'::jsonb
    );

    -- 4. Insert dynamic multiple-event data into 'wedding_events'
    INSERT INTO wedding_events (
        wedding_id,
        event_name,
        event_date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        maps_url,
        sort_order
    ) VALUES 
    (
        v_wedding_id,
        'Pawiwahan',
        NOW() + INTERVAL '30 days',
        '09:00',
        '11:00',
        'Griya Agung Sanur',
        'Jl. Danau Tamblingan No.89, Sanur, Denpasar Selatan, Kota Denpasar, Bali 80228',
        'https://maps.app.goo.gl/QQb1N6b7sUKKf1yQ7',
        0
    ),
    (
        v_wedding_id,
        'Resepsi',
        NOW() + INTERVAL '30 days',
        '17:00',
        '21:00',
        'Taman Bhagawan Bali',
        'Jl. Pratama No.70, Benoa, Kec. Kuta Selatan, Kabupaten Badung, Bali 80361',
        'https://maps.app.goo.gl/8dEFxg5Wb1PNYzvB7',
        1
    );

    -- 5. Insert bank transfer data into 'gift_accounts'
    INSERT INTO gift_accounts (
        wedding_id,
        bank_name,
        account_number,
        account_name,
        qris_url,
        sort_order
    ) VALUES 
    (
        v_wedding_id,
        'BCA',
        '1234567890',
        'I Wayan Aditya Pramana',
        NULL,
        0
    ),
    (
        v_wedding_id,
        'Bank Mandiri',
        '9876543210',
        'Ni Putu Ayu Lestari',
        NULL,
        1
    );

    -- 6. Insert gallery image data into 'gallery_images'
    -- Use local placeholder images that were previously generated in the public folder
    INSERT INTO gallery_images (
        wedding_id,
        image_url,
        sort_order
    ) VALUES 
    (v_wedding_id, '/images/gallery-1.jpg', 0),
    (v_wedding_id, '/images/gallery-2.jpg', 1),
    (v_wedding_id, '/images/gallery-3.jpg', 2),
    (v_wedding_id, '/images/gallery-4.jpg', 3),
    (v_wedding_id, '/images/gallery-5.jpg', 4),
    (v_wedding_id, '/images/gallery-6.jpg', 5);

    -- 7. Insert sample wishes from invited guests (Wishes / RSVPs)
    INSERT INTO rsvps (
        wedding_id,
        guest_name,
        attendance_status,
        guest_count,
        message
    ) VALUES 
    (
        v_wedding_id,
        'Made Wirawan',
        'attending',
        2,
        'Rahajeng Wayan & Ayu! Semoga upacara pawiwahan berjalan lancar dan keluarga selalu harmonis.'
    ),
    (
        v_wedding_id,
        'Kadek Pratiwi',
        'attending',
        1,
        'Selamat menempuh hidup baru. Semoga selalu bahagia dan diberkahi dalam setiap langkah keluarga baru kalian.'
    ),
    (
        v_wedding_id,
        'Komang Arya',
        'declined',
        1,
        'Selamat untuk Wayan dan Ayu. Maaf belum bisa hadir ke Bali, doa terbaik selalu menyertai kalian.'
    );

END $$;
