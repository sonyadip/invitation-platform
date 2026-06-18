import { getSupabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';

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
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const TABLE = 'platform_settings';

const defaults: PlatformSettings = {
  site_name: 'Senadda',
  site_tagline: 'Jasa Pembuatan Undangan Digital',
  logo_url: '/images/senadda-logo.png',
  logo_dark_url: '',
  whatsapp_url: 'https://wa.me/6281234567890',
  instagram_url: '',
  email: '',
  facebook_url: '',
  tiktok_url: '',
  youtube_url: '',
  home_heading_1: 'Selaras',
  home_heading_2: 'Hangat',
  home_heading_3: 'Personal',
  home_description: 'Undangan digital yang rapi, hangat, dan mudah dibagikan.',
  home_cta_label: 'Mulai Konsultasi',
  meta_title: 'Senadda - Jasa Pembuatan Undangan Digital',
  meta_description: 'Layanan undangan digital dan website acara dengan desain elegan, personal, dan mudah dibagikan.',
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
    return { ...defaults, ...data } as PlatformSettings;
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
}
