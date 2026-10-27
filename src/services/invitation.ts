import { supabase } from '../lib/supabase';
import type { FullInvitationData, LoveStoryItem } from '../types';
import { decodeHtmlEntities } from '../utils/template-helpers';
import { transformMediaUrls } from '../utils/cdn';

function parseLoveStory(story: unknown): LoveStoryItem[] {
  if (!story) return [];

  if (typeof story === 'string') {
    try {
      const parsed = JSON.parse(story);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(story) ? story as LoveStoryItem[] : [];
}

/**
 * Resolves an invitation by either its slug or custom domain.
 * Integrates soft-deleted constraints and fetches settings, events, gallery images, 
 * bank accounts, and wishes in parallel for fast query times.
 */
export async function getInvitationByDomainOrSlug(
  identifier: string,
  isDomain: boolean
): Promise<FullInvitationData | null> {
  try {
    let weddingId: string | null = null;

    if (isDomain) {
      const { data: domainRecord, error: domainError } = await supabase
        .from('custom_domains')
        .select('wedding_id')
        .eq('domain', identifier)
        .eq('status', 'active')
        .maybeSingle();

      if (domainError) {
        throw new Error(`Database error resolving domain "${identifier}": ${domainError.message}`);
      }
      if (!domainRecord) {
        return null;
      }
      weddingId = domainRecord.wedding_id;
    }

    let weddingQuery = supabase
      .from('weddings')
      .select('*')
      .is('deleted_at', null);

    if (weddingId) {
      weddingQuery = weddingQuery.eq('id', weddingId);
    } else {
      weddingQuery = weddingQuery.eq('slug', identifier);
    }

    const { data: wedding, error: weddingError } = await weddingQuery.maybeSingle();

    if (weddingError) {
      throw new Error(`Database error resolving wedding "${identifier}": ${weddingError.message}`);
    }
    if (!wedding) {
      return null;
    }

    const [settingsRes, eventsRes, galleryRes, giftsRes, wishesRes] = await Promise.all([
      supabase
        .from('invitation_settings')
        .select('*')
        .eq('wedding_id', wedding.id)
        .maybeSingle(),
      supabase
        .from('wedding_events')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('gallery_images')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('gift_accounts')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('rsvps')
        .select('id, guest_name, attendance_status, guest_count, message, created_at')
        .eq('wedding_id', wedding.id)
        .not('message', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    if (settingsRes.error) {
      throw new Error(`Database error fetching settings for "${identifier}": ${settingsRes.error.message}`);
    }
    if (!settingsRes.data) {
      return null;
    }

    return {
      wedding: transformMediaUrls({
        ...wedding,
        story: parseLoveStory(wedding.story)
      }),
      settings: transformMediaUrls(settingsRes.data),
      events: eventsRes.data || [],
      gallery: transformMediaUrls(galleryRes.data || []),
      gifts: transformMediaUrls(giftsRes.data || []),
      wishes: (wishesRes.data || []).map((w: any) => ({
        ...w,
        guest_name: decodeHtmlEntities(w.guest_name),
        message: decodeHtmlEntities(w.message)
      }))
    };
  } catch (error) {
    console.error('getInvitationByDomainOrSlug critical error:', error);
    throw error;
  }
}
