import { supabase } from '../lib/supabase';
import type { InvitationSettings, WeddingStatus } from '../types';
import { hashPasswordSHA256 } from '../utils/security';

interface TrackInvitationViewInput {
  weddingId: string;
  clientIp: string;
  userAgent: string;
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

    if (viewExists) return;

    await supabase.from('invitation_views').insert({
      wedding_id: weddingId,
      ip_hash: ipHash,
      user_agent: userAgent
    });
  } catch (err) {
    console.error('View tracking aggregation error:', err);
  }
}
