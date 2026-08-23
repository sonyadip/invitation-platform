import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { ActivityLogItem, CreateActivityLogInput } from '../types';

/**
 * Safely logs an activity to the activity_logs table.
 * Guaranteed non-blocking & fail-safe: will NEVER throw an unhandled error to caller.
 */
export async function logActivity(entry: CreateActivityLogInput): Promise<void> {
  try {
    const supabase = await getSupabaseAdmin();
    
    const insertPayload = {
      wedding_id: entry.wedding_id && entry.wedding_id.trim() ? entry.wedding_id.trim() : null,
      slug: entry.slug && entry.slug.trim() ? entry.slug.trim() : null,
      actor_type: entry.actor_type || 'admin',
      actor_name: entry.actor_name || (entry.actor_type === 'guest' ? 'Guest' : 'Admin'),
      action: entry.action,
      entity_type: entry.entity_type || 'invitation',
      entity_id: entry.entity_id || null,
      description: entry.description,
      metadata: entry.metadata || {}
    };

    const { error } = await supabase
      .from('activity_logs')
      .insert(insertPayload);

    if (error) {
      console.warn('[ActivityLog] Non-critical: Failed to insert activity log:', error.message);
    }
  } catch (err) {
    // Non-critical: catch all errors so calling functions continue smoothly
    console.warn('[ActivityLog] Non-critical exception during logging:', err instanceof Error ? err.message : err);
  }
}

export interface GetActivityLogsOptions {
  weddingId?: string;
  slug?: string;
  action?: string;
  actorType?: string;
  entityType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityLogsResponse {
  items: ActivityLogItem[];
  total: number;
}

/**
 * Retrieves activity logs with optional filtering and pagination.
 */
export async function getActivityLogs(options: GetActivityLogsOptions = {}): Promise<ActivityLogsResponse> {
  try {
    const supabase = await getSupabaseAdmin();
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.weddingId) {
      query = query.eq('wedding_id', options.weddingId);
    }

    if (options.slug) {
      query = query.eq('slug', options.slug);
    }

    if (options.action) {
      query = query.eq('action', options.action);
    }

    if (options.actorType) {
      query = query.eq('actor_type', options.actorType);
    }

    if (options.entityType) {
      query = query.eq('entity_type', options.entityType);
    }

    if (options.search) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`description.ilike.${term},slug.ilike.${term},actor_name.ilike.${term}`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.warn('[ActivityLog] Failed to fetch logs:', error.message);
      return { items: [], total: 0 };
    }

    return {
      items: (data || []) as ActivityLogItem[],
      total: count || 0
    };
  } catch (err) {
    console.warn('[ActivityLog] Exception fetching logs:', err);
    return { items: [], total: 0 };
  }
}

/**
 * Retrieves summary statistics of recent platform activities.
 */
export async function getActivityStats() {
  try {
    const supabase = await getSupabaseAdmin();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [recentRes, totalRes] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('id, action, actor_type', { count: 'exact' })
        .gte('created_at', oneDayAgo),
      supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
    ]);

    const recentLogs = recentRes.data || [];
    const revisionCount24h = recentLogs.filter(l => l.action && l.action.startsWith('revision.')).length;
    const adminActions24h = recentLogs.filter(l => l.actor_type === 'admin').length;

    return {
      totalLogs: totalRes.count || 0,
      recent24h: recentRes.count || 0,
      revisionCount24h,
      adminActions24h
    };
  } catch {
    return {
      totalLogs: 0,
      recent24h: 0,
      revisionCount24h: 0,
      adminActions24h: 0
    };
  }
}
