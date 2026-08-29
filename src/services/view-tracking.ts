import { supabase } from '../lib/supabase';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { InvitationSettings, WeddingStatus } from '../types';
import { hashPasswordSHA256 } from '../utils/security';

interface TrackInvitationViewInput {
  weddingId: string;
  clientIp: string;
  userAgent: string;
  guestName?: string | null;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | null;
  os?: string | null;
  browser?: string | null;
  city?: string | null;
  country?: string | null;
  referrer?: string | null;
  now?: Date;
}

export function shouldTrackInvitationView(
  settings: InvitationSettings,
  status: WeddingStatus,
  isMaintenance: boolean,
  isPasswordLocked: boolean
): boolean {
  return (
    settings.view_counter_enabled &&
    !isMaintenance &&
    !isPasswordLocked &&
    status === 'published'
  );
}

export async function trackInvitationView({
  weddingId,
  clientIp,
  userAgent,
  guestName,
  deviceType,
  os,
  browser,
  city,
  country,
  referrer,
  now = new Date()
}: TrackInvitationViewInput): Promise<void> {
  try {
    const todayStr = now.toISOString().slice(0, 10);
    const ipHash = await hashPasswordSHA256(`${clientIp}_${weddingId}_${todayStr}`);

    const { data: viewExists } = await supabase
      .from('invitation_views')
      .select('id')
      .eq('wedding_id', weddingId)
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (!viewExists) {
      // 1. Try enriched insert first
      const enrichedPayload: Record<string, any> = {
        wedding_id: weddingId,
        ip_hash: ipHash,
        user_agent: userAgent,
        guest_name: guestName || null,
        device_type: deviceType || null,
        os: os || null,
        browser: browser || null,
        city: city || null,
        country: country || null,
        referrer: referrer || null
      };

      const { error: insertError } = await supabase
        .from('invitation_views')
        .insert(enrichedPayload);

      // Safe fallback if new columns don't exist yet in the database
      if (insertError) {
        await supabase.from('invitation_views').insert({
          wedding_id: weddingId,
          ip_hash: ipHash,
          user_agent: userAgent
        });
      }
    }

    // 2. Track Guest Read-Receipt (if guestName is present)
    if (guestName && typeof guestName === 'string' && guestName.trim()) {
      await updateGuestReadReceipt(weddingId, guestName.trim(), now).catch((err) => {
        // Non-blocking catch
        console.warn('Failed to update guest read receipt:', err?.message || err);
      });
    }
  } catch (err) {
    console.error('View tracking aggregation error:', err);
  }
}

async function updateGuestReadReceipt(weddingId: string, rawGuestName: string, now: Date): Promise<void> {
  try {
    const adminSupabase = await getSupabaseAdmin();
    const cleanGuestName = rawGuestName.replace(/^[+_]+|[+_]+$/g, '').trim();
    if (!cleanGuestName) return;

    // Look up guest in sent_invitations (case-insensitive)
    const { data: guests, error: lookupError } = await adminSupabase
      .from('sent_invitations')
      .select('id, guest_name, open_count, opened_at')
      .eq('wedding_id', weddingId)
      .ilike('guest_name', cleanGuestName)
      .limit(1);

    if (lookupError || !guests || guests.length === 0) {
      return;
    }

    const guest = guests[0];
    const currentCount = Number(guest.open_count || 0);

    const updatePayload: Record<string, any> = {
      open_count: currentCount + 1,
      last_opened_at: now.toISOString()
    };

    if (!guest.opened_at) {
      updatePayload.opened_at = now.toISOString();
    }

    const { error: updateError } = await adminSupabase
      .from('sent_invitations')
      .update(updatePayload)
      .eq('id', guest.id);

    if (updateError) {
      // Gracefully ignore if columns not present yet
      console.warn('Update guest opened status notice:', updateError.message);
    }
  } catch (e: any) {
    // Non-blocking catch for safety
    console.warn('Read receipt process skipped:', e?.message || e);
  }
}
