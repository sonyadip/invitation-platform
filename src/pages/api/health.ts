import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

/**
 * Health check endpoint for uptime monitors (Better Uptime, UptimeRobot, Checkly).
 *
 * Usage:
 * - GET /api/health -> Shallow check (edge alive, returns 200 immediately)
 * - GET /api/health?deep=1 -> Deep check (probes Supabase database connectivity & measures latency)
 */
export const GET: APIRoute = async ({ url }) => {
  const isDeep = url.searchParams.get('deep') === '1' || url.searchParams.get('deep') === 'true';
  const startTime = Date.now();

  const baseResponse: Record<string, any> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_sec: typeof process !== 'undefined' && typeof process.uptime === 'function' ? Math.floor(process.uptime()) : undefined
  };

  if (!isDeep) {
    return new Response(JSON.stringify(baseResponse, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }

  const dbStart = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<{ error: Error }>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database ping timeout after 4000ms')), 4000);
    });

    const queryPromise = supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const result = await Promise.race([queryPromise, timeoutPromise]);
    clearTimeout(timer);
    const { error } = result;
    const dbLatency = Date.now() - dbStart;

    if (error) {
      return new Response(
        JSON.stringify(
          {
            ...baseResponse,
            status: 'unhealthy',
            checks: {
              edge: 'ok',
              database: {
                status: 'down',
                latency_ms: dbLatency,
                error: error.message
              }
            }
          },
          null,
          2
        ),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        }
      );
    }

    return new Response(
      JSON.stringify(
        {
          ...baseResponse,
          status: 'healthy',
          checks: {
            edge: 'ok',
            database: {
              status: 'healthy',
              latency_ms: dbLatency
            }
          },
          total_duration_ms: Date.now() - startTime
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    const dbLatency = Date.now() - dbStart;
    return new Response(
      JSON.stringify(
        {
          ...baseResponse,
          status: 'unhealthy',
          checks: {
            edge: 'ok',
            database: {
              status: 'down',
              latency_ms: dbLatency,
              error: err?.message || 'Database connection error'
            }
          }
        },
        null,
        2
      ),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  }
};
