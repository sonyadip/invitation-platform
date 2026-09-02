import { getSupabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';
import { logActivity } from './activity-log';

export interface TemplateCard {
  key: string;
  name: string;
  price: string;
  promoPrice?: string;
  image?: string;
}

export interface PlatformSettings {
  id?: string;
  site_name: string;
  site_tagline: string;
  logo_url: string;
  logo_dark_url: string;
  whatsapp_url: string;
  instagram_url: string;
  email: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
  home_heading_1: string;
  home_heading_2: string;
  home_heading_3: string;
  home_description: string;
  home_cta_label: string;
  home_templates_eyebrow: string;
  home_templates_heading: string;
  home_booking_eyebrow: string;
  home_booking_heading: string;
  home_booking_cta: string;
  home_hero_seal_text: string;
  home_stat_number: string;
  home_stat_label: string;
  home_template_cards: TemplateCard[];
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const TABLE = 'platform_settings';

const defaults: PlatformSettings = {
  site_name: 'Senadda',
  site_tagline: 'Undangan Pernikahan Digital',
  logo_url: '/images/senadda-logo.png',
  logo_dark_url: '',
  whatsapp_url: 'https://wa.me/6281234567890',
  instagram_url: '',
  email: '',
  facebook_url: '',
  tiktok_url: '',
  youtube_url: '',
  home_heading_1: 'Undangan',
  home_heading_2: 'Pernikahan',
  home_heading_3: 'Digital',
  home_description: 'Bagikan momen bahagia Anda lewat undangan pernikahan digital yang elegan, tanpa batas jarak dan waktu.',
  home_cta_label: 'Lihat Koleksi',
  home_templates_eyebrow: 'Koleksi Desain',
  home_templates_heading: 'Pilih Nuansa.',
  home_booking_eyebrow: 'Langkah Selanjutnya',
  home_booking_heading: 'Ceritakan undangan Anda.',
  home_booking_cta: 'Hubungi via WhatsApp',
  home_hero_seal_text: 'SENADDA • DIGITAL STUDIO • UNDANGAN •',
  home_stat_number: '5+',
  home_stat_label: 'Koleksi\nEksklusif',
  home_template_cards: [
    { key: "lumiere", name: "Lumiere", price: "Rp 450.000", promoPrice: "Rp 300.000" },
    { key: "editorial", name: "Editorial", price: "Rp 350.000", promoPrice: "Rp 250.000" },
    { key: "deauville", name: "Deauville", price: "Rp 300.000", promoPrice: "Rp 200.000" },
    { key: "air", name: "Air", price: "Rp 200.000", promoPrice: "Rp 150.000" },
    { key: "noir", name: "Noir", price: "Rp 200.000", promoPrice: "Rp 150.000" },
  ],
  meta_title: 'Senadda - Undangan Pernikahan Digital',
  meta_description: 'Undangan pernikahan digital dengan desain yang elegan, personal, dan mudah dibagikan.',
};

/**
 * Read platform settings (public, no auth needed).
 * Always returns a valid object — falls back to defaults if table is empty.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return defaults;

    const result = { ...defaults };
    for (const k in data) {
      const key = k as keyof PlatformSettings;
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        if (key === 'home_template_cards' && Array.isArray(data[key]) && data[key].length === 0) {
          continue;
        }
        // @ts-expect-error dynamic assignment
        result[key] = data[key];
      }
    }
    return result;
  } catch {
    return defaults;
  }
}

/**
 * Upsert platform settings (admin only).
 */
export async function savePlatformSettings(input: Partial<PlatformSettings>): Promise<void> {
  const supabaseAdmin = await getSupabaseAdmin();

  // Check if a row already exists
  const { data: existing } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .limit(1)
    .maybeSingle();

  const payload = {
    ...input,
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq('id', existing.id);
    if (error) throw new Error(`Failed to update platform settings: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .insert(payload);
    if (error) throw new Error(`Failed to create platform settings: ${error.message}`);
  }

  await logActivity({
    actor_type: 'admin',
    action: 'platform.update',
    entity_type: 'platform',
    description: 'Platform settings updated by admin.',
    metadata: {
      site_name: input.site_name,
      updated_fields: Object.keys(input)
    }
  });
}

