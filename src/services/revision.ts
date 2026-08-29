import { getSupabaseAdmin } from '../lib/supabase-admin';
import { logActivity } from './activity-log';
import type {
  InvitationRevision,
  RevisionSnapshot,
  RevisionDiffItem,
  Wedding,
  InvitationSettings,
  WeddingEvent,
  GalleryImage,
  GiftAccount
} from '../types';

/**
 * Captures a full snapshot of the invitation and stores it in invitation_revisions.
 * Non-blocking and fail-safe.
 */
export async function captureRevisionSnapshot(
  weddingId: string,
  options: {
    title?: string;
    note?: string;
    createdBy?: string;
    changesSummary?: string[];
  } = {}
): Promise<{ id: string | null; error: string | null }> {
  try {
    const supabase = await getSupabaseAdmin();

    // 1. Fetch complete current state
    const [weddingRes, settingsRes, eventsRes, galleryRes, giftsRes] = await Promise.all([
      supabase.from('weddings').select('*').eq('id', weddingId).maybeSingle(),
      supabase.from('invitation_settings').select('*').eq('wedding_id', weddingId).maybeSingle(),
      supabase.from('wedding_events').select('*').eq('wedding_id', weddingId).order('sort_order', { ascending: true }),
      supabase.from('gallery_images').select('*').eq('wedding_id', weddingId).order('sort_order', { ascending: true }),
      supabase.from('gift_accounts').select('*').eq('wedding_id', weddingId).order('sort_order', { ascending: true })
    ]);

    if (weddingRes.error || !weddingRes.data) {
      const errMsg = weddingRes.error?.message || 'Wedding data not found for snapshot.';
      console.warn('[Revision] Wedding lookup failed for snapshot:', errMsg);
      return { id: null, error: errMsg };
    }

    const wedding = weddingRes.data as Wedding;
    const settings = (settingsRes.data || null) as InvitationSettings | null;
    const events = (eventsRes.data || []) as WeddingEvent[];
    const gallery = (galleryRes.data || []) as GalleryImage[];
    const gifts = (giftsRes.data || []) as GiftAccount[];

    const snapshot: RevisionSnapshot = {
      wedding,
      settings,
      events,
      gallery,
      gifts,
      captured_at: new Date().toISOString()
    };

    // 2. Determine next revision number
    const { data: latestRevs, error: latestRevsError } = await supabase
      .from('invitation_revisions')
      .select('revision_number, snapshot')
      .eq('wedding_id', weddingId)
      .order('revision_number', { ascending: false })
      .limit(1);

    if (latestRevsError) {
      console.warn('[Revision] Failed to query latest revisions:', latestRevsError.message);
    }

    const lastRevNumber = latestRevs && latestRevs.length > 0 ? Number(latestRevs[0].revision_number) : 0;
    const nextRevisionNumber = lastRevNumber + 1;

    // 3. Compute changes summary if not provided
    let changesSummary = options.changesSummary || [];
    if (changesSummary.length === 0 && latestRevs && latestRevs.length > 0 && latestRevs[0].snapshot) {
      const diffs = computeSnapshotDiff(latestRevs[0].snapshot as RevisionSnapshot, snapshot);
      changesSummary = summarizeDiff(diffs);
    }

    if (changesSummary.length === 0 && nextRevisionNumber === 1) {
      changesSummary = ['Initial invitation creation (Initial snapshot)'];
    }

    const title = options.title || `Revision #${nextRevisionNumber}${changesSummary.length > 0 ? `: ${changesSummary[0]}` : ''}`;

    // 4. Insert revision record
    const { data: inserted, error: insertError } = await supabase
      .from('invitation_revisions')
      .insert({
        wedding_id: weddingId,
        revision_number: nextRevisionNumber,
        title,
        note: options.note || null,
        created_by: options.createdBy || 'admin',
        snapshot,
        changes_summary: changesSummary
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn('[Revision] Failed to save revision snapshot:', insertError.message);
      return { id: null, error: insertError.message };
    }

    return { id: inserted?.id || null, error: null };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Revision] Exception during snapshot capture:', errMsg);
    return { id: null, error: errMsg };
  }
}


/**
 * Retrieves all revisions for a specific wedding.
 */
export async function getRevisions(weddingId: string): Promise<InvitationRevision[]> {
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from('invitation_revisions')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('revision_number', { ascending: false });

    if (error) {
      console.warn('[Revision] Error fetching revisions:', error.message);
      return [];
    }

    return (data || []) as InvitationRevision[];
  } catch (err) {
    console.warn('[Revision] Exception fetching revisions:', err);
    return [];
  }
}

/**
 * Retrieves a single revision by its ID.
 */
export async function getRevisionById(revisionId: string): Promise<InvitationRevision | null> {
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from('invitation_revisions')
      .select('*')
      .eq('id', revisionId)
      .maybeSingle();

    if (error || !data) return null;
    return data as InvitationRevision;
  } catch {
    return null;
  }
}

/**
 * Restores an invitation state to a specific revision snapshot.
 * Takes an automated backup checkpoint prior to restoring.
 */
export async function restoreRevision(
  weddingId: string,
  revisionId: string,
  restoredBy: string = 'admin'
): Promise<{ success: boolean; message: string; targetRevisionNumber?: number }> {
  try {
    const supabase = await getSupabaseAdmin();

    // 1. Fetch target revision
    const targetRevision = await getRevisionById(revisionId);
    if (!targetRevision || targetRevision.wedding_id !== weddingId) {
      return { success: false, message: 'Target revision not found.' };
    }

    const { snapshot } = targetRevision;
    if (!snapshot || !snapshot.wedding) {
      return { success: false, message: 'Target revision snapshot data is corrupt or incomplete.' };
    }

    // 2. Capture a backup of current state before rollback
    await captureRevisionSnapshot(weddingId, {
      title: `Automatic backup before rollback to Revision #${targetRevision.revision_number}`,
      note: `Automatically created before restoring data to version #${targetRevision.revision_number}`,
      createdBy: restoredBy,
      changesSummary: [`Automatic backup before rollback to Revision #${targetRevision.revision_number}`]
    });

    // 3. Restore wedding core table
    const targetWedding = snapshot.wedding;
    const { error: updateWeddingError } = await supabase
      .from('weddings')
      .update({
        bride_name: targetWedding.bride_name,
        groom_name: targetWedding.groom_name,
        bride_full_name: targetWedding.bride_full_name,
        groom_full_name: targetWedding.groom_full_name,
        wedding_date: targetWedding.wedding_date,
        venue_name: targetWedding.venue_name,
        venue_address: targetWedding.venue_address,
        maps_url: targetWedding.maps_url,
        story: targetWedding.story || [],
        music_url: targetWedding.music_url || null,
        template: targetWedding.template || 'noir',
        status: targetWedding.status || 'draft'
      })
      .eq('id', weddingId);

    if (updateWeddingError) {
      throw new Error(`Failed to restore main wedding data: ${updateWeddingError.message}`);
    }

    // 4. Restore invitation_settings table
    if (snapshot.settings) {
      const s = snapshot.settings;
      const { error: updateSettingsError } = await supabase
        .from('invitation_settings')
        .update({
          rsvp_enabled: s.rsvp_enabled,
          music_enabled: s.music_enabled,
          music_autoplay: s.music_autoplay,
          countdown_enabled: s.countdown_enabled,
          gallery_enabled: s.gallery_enabled,
          wishes_enabled: s.wishes_enabled,
          gift_enabled: s.gift_enabled,
          share_enabled: s.share_enabled,
          view_counter_enabled: s.view_counter_enabled,
          maintenance_mode: s.maintenance_mode,
          expiration_date: s.expiration_date,
          password_protection_enabled: s.password_protection_enabled,
          access_password: s.access_password,
          sections: s.sections,
          theme_config: s.theme_config
        })
        .eq('wedding_id', weddingId);

      if (updateSettingsError) {
        throw new Error(`Failed to restore invitation settings: ${updateSettingsError.message}`);
      }
    }

    // 5. Restore wedding_events
    await supabase.from('wedding_events').delete().eq('wedding_id', weddingId);
    if (snapshot.events && snapshot.events.length > 0) {
      const eventRows = snapshot.events.map((e, index) => ({
        wedding_id: weddingId,
        event_name: e.event_name,
        event_date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time,
        venue_name: e.venue_name,
        venue_address: e.venue_address,
        maps_url: e.maps_url,
        sort_order: e.sort_order || index + 1
      }));
      await supabase.from('wedding_events').insert(eventRows);
    }

    // 6. Restore gallery_images
    await supabase.from('gallery_images').delete().eq('wedding_id', weddingId);
    if (snapshot.gallery && snapshot.gallery.length > 0) {
      const galleryRows = snapshot.gallery.map((g, index) => ({
        wedding_id: weddingId,
        image_url: g.image_url,
        sort_order: g.sort_order || index + 1
      }));
      await supabase.from('gallery_images').insert(galleryRows);
    }

    // 7. Restore gift_accounts
    await supabase.from('gift_accounts').delete().eq('wedding_id', weddingId);
    if (snapshot.gifts && snapshot.gifts.length > 0) {
      const giftRows = snapshot.gifts.map((g, index) => ({
        wedding_id: weddingId,
        bank_name: g.bank_name,
        account_number: g.account_number,
        account_name: g.account_name,
        qris_url: g.qris_url || null,
        sort_order: g.sort_order || index + 1
      }));
      await supabase.from('gift_accounts').insert(giftRows);
    }

    // 8. Capture the newly restored state as a new revision checkpoint
    await captureRevisionSnapshot(weddingId, {
      title: `Restored from Revision #${targetRevision.revision_number}`,
      note: `Invitation restored to version #${targetRevision.revision_number} (${targetRevision.title})`,
      createdBy: restoredBy,
      changesSummary: [`Rollback/Restore from Revision #${targetRevision.revision_number}`]
    });

    // 9. Log activity
    await logActivity({
      wedding_id: weddingId,
      slug: targetWedding.slug,
      actor_type: 'admin',
      actor_name: restoredBy,
      action: 'revision.restore',
      entity_type: 'revision',
      entity_id: revisionId,
      description: `Invitation successfully restored to Revision #${targetRevision.revision_number} (${targetRevision.title})`,
      metadata: {
        restored_from_revision: targetRevision.revision_number,
        restored_at: new Date().toISOString()
      }
    });

    return {
      success: true,
      message: `Invitation successfully restored to Revision #${targetRevision.revision_number}`,
      targetRevisionNumber: targetRevision.revision_number
    };
  } catch (err) {
    console.error('[Revision] Restore revision error:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to restore revision.'
    };
  }
}

/**
 * Computes deep, specific differences between two snapshots.
 */
export function computeSnapshotDiff(
  oldSnap: RevisionSnapshot | null,
  newSnap: RevisionSnapshot | null
): RevisionDiffItem[] {
  const diffs: RevisionDiffItem[] = [];
  if (!newSnap) return diffs;

  const oldW = oldSnap?.wedding;
  const newW = newSnap.wedding;

  // 1. Core Wedding Data (weddings table)
  if (oldW && newW) {
    if (oldW.bride_name !== newW.bride_name) {
      diffs.push({ field: 'bride_name', label: 'Bride Nickname', category: 'couple', oldValue: oldW.bride_name || '-', newValue: newW.bride_name || '-' });
    }
    if (oldW.groom_name !== newW.groom_name) {
      diffs.push({ field: 'groom_name', label: 'Groom Nickname', category: 'couple', oldValue: oldW.groom_name || '-', newValue: newW.groom_name || '-' });
    }
    if (oldW.bride_full_name !== newW.bride_full_name) {
      diffs.push({ field: 'bride_full_name', label: 'Bride Full Name', category: 'couple', oldValue: oldW.bride_full_name || '-', newValue: newW.bride_full_name || '-' });
    }
    if (oldW.groom_full_name !== newW.groom_full_name) {
      diffs.push({ field: 'groom_full_name', label: 'Groom Full Name', category: 'couple', oldValue: oldW.groom_full_name || '-', newValue: newW.groom_full_name || '-' });
    }
    if (oldW.wedding_date !== newW.wedding_date) {
      diffs.push({ field: 'wedding_date', label: 'Wedding Date', category: 'events', oldValue: oldW.wedding_date || '-', newValue: newW.wedding_date || '-' });
    }
    if (oldW.venue_name !== newW.venue_name) {
      diffs.push({ field: 'venue_name', label: 'Main Venue Name', category: 'events', oldValue: oldW.venue_name || '-', newValue: newW.venue_name || '-' });
    }
    if (oldW.venue_address !== newW.venue_address) {
      diffs.push({ field: 'venue_address', label: 'Main Venue Address', category: 'events', oldValue: oldW.venue_address || '-', newValue: newW.venue_address || '-' });
    }
    if (oldW.maps_url !== newW.maps_url) {
      diffs.push({ field: 'maps_url', label: 'Google Maps Link', category: 'events', oldValue: oldW.maps_url || 'None', newValue: newW.maps_url || 'None' });
    }
    if (oldW.template !== newW.template) {
      diffs.push({ field: 'template', label: 'Theme Template', category: 'theme', oldValue: oldW.template || '-', newValue: newW.template || '-' });
    }
    if (oldW.status !== newW.status) {
      diffs.push({ field: 'status', label: 'Invitation Status', category: 'other', oldValue: oldW.status || '-', newValue: newW.status || '-' });
    }
    if (oldW.music_url !== newW.music_url) {
      diffs.push({ field: 'music_url', label: 'Background Music', category: 'features', oldValue: oldW.music_url || 'None', newValue: newW.music_url || 'None' });
    }

    // Love Story Items comparison
    const oldStories = oldW.story || [];
    const newStories = newW.story || [];
    if (JSON.stringify(oldStories) !== JSON.stringify(newStories)) {
      if (oldStories.length !== newStories.length) {
        diffs.push({
          field: 'story.count',
          label: 'Love Story Moments Count',
          category: 'couple',
          oldValue: `${oldStories.length} moments`,
          newValue: `${newStories.length} moments`
        });
      }
      newStories.forEach((ns, i) => {
        const os = oldStories[i];
        if (!os) {
          diffs.push({ field: `story[${i}].add`, label: `Add Story Moment`, category: 'couple', oldValue: '-', newValue: `${ns.year || ''}: ${ns.title}` });
        } else if (os.title !== ns.title || os.year !== ns.year || os.description !== ns.description) {
          diffs.push({ field: `story[${i}].edit`, label: `Story Moment (${ns.title || '#' + (i + 1)})`, category: 'couple', oldValue: `${os.year || ''}: ${os.title}`, newValue: `${ns.year || ''}: ${ns.title}` });
        }
      });
    }
  }

  const oldS = oldSnap?.settings;
  const newS = newSnap.settings;

  if (oldS && newS) {
    // 2. Feature Toggles
    const featureToggles: Array<{ key: keyof typeof oldS; label: string }> = [
      { key: 'rsvp_enabled', label: 'RSVP Feature' },
      { key: 'music_enabled', label: 'Music Feature' },
      { key: 'music_autoplay', label: 'Music Autoplay' },
      { key: 'countdown_enabled', label: 'Countdown Timer' },
      { key: 'gallery_enabled', label: 'Photo Gallery' },
      { key: 'wishes_enabled', label: 'Guest Wishes & Greetings' },
      { key: 'gift_enabled', label: 'Digital Gift Accounts' },
      { key: 'share_enabled', label: 'Share Buttons' },
      { key: 'view_counter_enabled', label: 'Visitor Counter' },
      { key: 'maintenance_mode', label: 'Maintenance Mode' },
      { key: 'password_protection_enabled', label: 'Password Protection' }
    ];

    featureToggles.forEach(({ key, label }) => {
      if (oldS[key] !== newS[key]) {
        diffs.push({
          field: String(key),
          label,
          category: 'features',
          oldValue: oldS[key] ? 'Enabled' : 'Disabled',
          newValue: newS[key] ? 'Enabled' : 'Disabled'
        });
      }
    });

    if (oldS.access_password !== newS.access_password) {
      diffs.push({ field: 'access_password', label: 'Guest Access Password', category: 'features', oldValue: oldS.access_password || '(Empty)', newValue: newS.access_password || '(Empty)' });
    }
    if (oldS.expiration_date !== newS.expiration_date) {
      diffs.push({ field: 'expiration_date', label: 'Expiration Date', category: 'features', oldValue: oldS.expiration_date || 'No Expiry', newValue: newS.expiration_date || 'No Expiry' });
    }

    // 3. Bio & Content Text (theme_config.content)
    const oldContent = (oldS.theme_config as any)?.content || {};
    const newContent = (newS.theme_config as any)?.content || {};

    const contentFields: Array<{ key: string; label: string; cat: 'couple' | 'gifts' | 'theme' }> = [
      { key: 'groomFatherName', label: 'Groom Father Name', cat: 'couple' },
      { key: 'groomMotherName', label: 'Groom Mother Name', cat: 'couple' },
      { key: 'groomChildNumber', label: 'Groom Child Order', cat: 'couple' },
      { key: 'groomAddress', label: 'Groom Family Address', cat: 'couple' },
      { key: 'groomInstagramUrl', label: 'Groom Instagram', cat: 'couple' },
      { key: 'brideFatherName', label: 'Bride Father Name', cat: 'couple' },
      { key: 'brideMotherName', label: 'Bride Mother Name', cat: 'couple' },
      { key: 'brideChildNumber', label: 'Bride Child Order', cat: 'couple' },
      { key: 'brideAddress', label: 'Bride Family Address', cat: 'couple' },
      { key: 'brideInstagramUrl', label: 'Bride Instagram', cat: 'couple' },
      { key: 'instagramUrl', label: 'Shared Instagram', cat: 'couple' },
      { key: 'introVerse', label: 'Opening Verse / Quote', cat: 'theme' },
      { key: 'introVerseSource', label: 'Verse Source', cat: 'theme' },
      { key: 'giftDescription', label: 'Gift Instructions', cat: 'gifts' },
      { key: 'thankYouMessage', label: 'Thank You Message', cat: 'theme' }
    ];

    contentFields.forEach(({ key, label, cat }) => {
      const oldVal = oldContent[key] || '';
      const newVal = newContent[key] || '';
      if (oldVal !== newVal) {
        diffs.push({
          field: `content.${key}`,
          label,
          category: cat,
          oldValue: oldVal ? (oldVal.length > 50 ? oldVal.slice(0, 47) + '...' : oldVal) : '(Empty)',
          newValue: newVal ? (newVal.length > 50 ? newVal.slice(0, 47) + '...' : newVal) : '(Empty)'
        });
      }
    });

    // 4. Photos & Theme Banner Assets (theme_config.assets)
    const oldAssets = (oldS.theme_config as any)?.assets || {};
    const newAssets = (newS.theme_config as any)?.assets || {};
    const assetFields: Array<{ key: string; label: string }> = [
      { key: 'heroImage', label: 'Cover Photo (Hero)' },
      { key: 'heroVideo', label: 'Cover Video (Hero)' },
      { key: 'brideImage', label: 'Bride Photo' },
      { key: 'groomImage', label: 'Groom Photo' },
      { key: 'logoImage', label: 'Monogram Logo' },
      { key: 'closingImage', label: 'Closing Photo' },
      { key: 'eventImage', label: 'Event Banner' },
      { key: 'rsvpImage', label: 'RSVP Banner' },
      { key: 'countdownImage', label: 'Countdown Banner' }
    ];

    assetFields.forEach(({ key, label }) => {
      const oldVal = oldAssets[key] || '';
      const newVal = newAssets[key] || '';
      if (oldVal !== newVal) {
        diffs.push({
          field: `assets.${key}`,
          label,
          category: 'theme',
          oldValue: oldVal ? 'Photo Updated' : 'None',
          newValue: newVal ? 'New Photo Set' : 'Removed'
        });
      }
    });

    const oldSlider = Array.isArray(oldAssets.sliderImages) ? oldAssets.sliderImages : [];
    const newSlider = Array.isArray(newAssets.sliderImages) ? newAssets.sliderImages : [];
    if (JSON.stringify(oldSlider) !== JSON.stringify(newSlider)) {
      diffs.push({
        field: 'assets.sliderImages',
        label: 'Image Slider Photos',
        category: 'theme',
        oldValue: `${oldSlider.length} Photos`,
        newValue: `${newSlider.length} Photos`
      });
    }
  }

  // 5. Wedding Events (wedding_events)
  const oldEvents = oldSnap?.events || [];
  const newEvents = newSnap?.events || [];

  if (JSON.stringify(oldEvents) !== JSON.stringify(newEvents)) {
    if (oldEvents.length !== newEvents.length) {
      diffs.push({
        field: 'events.count',
        label: 'Event Count',
        category: 'events',
        oldValue: `${oldEvents.length} events`,
        newValue: `${newEvents.length} events`
      });
    }

    // Detail per event comparison
    newEvents.forEach((ne, i) => {
      const oe = oldEvents[i];
      if (!oe) {
        diffs.push({
          field: `events[${i}].add`,
          label: `Add Event: "${ne.event_name}"`,
          category: 'events',
          oldValue: '-',
          newValue: `${ne.event_date || ''} (${ne.start_time || ''} - ${ne.end_time || 'End'}) @ ${ne.venue_name || '-'}`
        });
      } else {
        if (oe.event_name !== ne.event_name) {
          diffs.push({ field: `events[${i}].name`, label: `Event Name #${i + 1}`, category: 'events', oldValue: oe.event_name, newValue: ne.event_name });
        }
        if (oe.event_date !== ne.event_date) {
          diffs.push({ field: `events[${i}].date`, label: `Event Date "${ne.event_name}"`, category: 'events', oldValue: oe.event_date || '-', newValue: ne.event_date || '-' });
        }
        if (oe.start_time !== ne.start_time || oe.end_time !== ne.end_time) {
          diffs.push({ field: `events[${i}].time`, label: `Event Time "${ne.event_name}"`, category: 'events', oldValue: `${oe.start_time || ''} - ${oe.end_time || ''}`, newValue: `${ne.start_time || ''} - ${ne.end_time || ''}` });
        }
        if (oe.venue_name !== ne.venue_name || oe.venue_address !== ne.venue_address) {
          diffs.push({ field: `events[${i}].venue`, label: `Event Location "${ne.event_name}"`, category: 'events', oldValue: `${oe.venue_name || ''} (${oe.venue_address || ''})`, newValue: `${ne.venue_name || ''} (${ne.venue_address || ''})` });
        }
      }
    });

    if (oldEvents.length > newEvents.length) {
      oldEvents.slice(newEvents.length).forEach((oe, i) => {
        diffs.push({
          field: `events[${newEvents.length + i}].remove`,
          label: `Delete Event: "${oe.event_name}"`,
          category: 'events',
          oldValue: `${oe.event_date || ''} @ ${oe.venue_name || ''}`,
          newValue: 'Removed'
        });
      });
    }
  }

  // 6. Photo Gallery (gallery_images)
  const oldGal = oldSnap?.gallery || [];
  const newGal = newSnap?.gallery || [];
  if (JSON.stringify(oldGal.map(g => g.image_url)) !== JSON.stringify(newGal.map(g => g.image_url))) {
    const diffCount = newGal.length - oldGal.length;
    const diffText = diffCount > 0 ? `+${diffCount} new photos` : diffCount < 0 ? `${diffCount} photos removed` : 'Gallery ordering updated';
    diffs.push({
      field: 'gallery',
      label: 'Photo Gallery',
      category: 'gallery',
      oldValue: `${oldGal.length} photos`,
      newValue: `${newGal.length} photos (${diffText})`
    });
  }

  // 7. Gift Accounts (gift_accounts)
  const oldGifts = oldSnap?.gifts || [];
  const newGifts = newSnap?.gifts || [];
  if (JSON.stringify(oldGifts) !== JSON.stringify(newGifts)) {
    if (oldGifts.length !== newGifts.length) {
      diffs.push({
        field: 'gifts.count',
        label: 'Gift Accounts Count',
        category: 'gifts',
        oldValue: `${oldGifts.length} accounts`,
        newValue: `${newGifts.length} accounts`
      });
    }

    newGifts.forEach((ng, i) => {
      const og = oldGifts[i];
      if (!og) {
        diffs.push({
          field: `gifts[${i}].add`,
          label: `Add Gift Account: ${ng.bank_name}`,
          category: 'gifts',
          oldValue: '-',
          newValue: `${ng.account_number} a.n ${ng.account_name}`
        });
      } else if (og.bank_name !== ng.bank_name || og.account_number !== ng.account_number || og.account_name !== ng.account_name) {
        diffs.push({
          field: `gifts[${i}].edit`,
          label: `Edit Account ${ng.bank_name}`,
          category: 'gifts',
          oldValue: `${og.bank_name} ${og.account_number} (${og.account_name})`,
          newValue: `${ng.bank_name} ${ng.account_number} (${ng.account_name})`
        });
      }
    });

    if (oldGifts.length > newGifts.length) {
      oldGifts.slice(newGifts.length).forEach((og, i) => {
        diffs.push({
          field: `gifts[${newGifts.length + i}].remove`,
          label: `Delete Gift Account: ${og.bank_name}`,
          category: 'gifts',
          oldValue: `${og.account_number} (${og.account_name})`,
          newValue: 'Removed'
        });
      });
    }
  }

  return diffs;
}

/**
 * Summarizes diff items into concise human-readable bullet points with explicit before/after values.
 */
export function summarizeDiff(diffItems: RevisionDiffItem[]): string[] {
  if (!diffItems.length) return ['Data update with no value changes'];

  return diffItems.slice(0, 6).map(diff => {
    // Single-sided actions (add / remove)
    if (diff.oldValue === '-' || !diff.oldValue || diff.oldValue === '(Empty)') {
      return `${diff.label}: ${diff.newValue}`;
    }
    if (diff.newValue === 'Removed') {
      return `${diff.label} (${diff.oldValue}) removed`;
    }

    // Specific before-after string
    const oldStr = String(diff.oldValue);
    const newStr = String(diff.newValue);

    if (oldStr.length <= 25 && newStr.length <= 25) {
      return `${diff.label}: "${oldStr}" → "${newStr}"`;
    }

    return `${diff.label} updated ("${oldStr.slice(0, 20)}..." → "${newStr.slice(0, 20)}...")`;
  });
}

