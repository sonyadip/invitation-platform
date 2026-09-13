export interface ParsedUserAgent {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  browser: string;
}

export function parseUserAgent(uaString: string | null | undefined): ParsedUserAgent {
  if (!uaString || typeof uaString !== 'string') {
    return {
      deviceType: 'mobile',
      os: 'Other',
      browser: 'Unknown'
    };
  }

  const ua = uaString.toLowerCase();

  // 1. Detect Device Type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = /(iphone|ipod|android.*mobile|windows phone|blackberry|mobile|opera mini|iemobile|facebookexternalhit|whatsapp|instagram|telegram)/i.test(ua);

  if (isTablet) {
    deviceType = 'tablet';
  } else if (isMobile) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // 2. Detect Operating System
  let os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other' = 'Other';
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/windows nt/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Detect Browser / In-App WebView
  let browser = 'Other';
  if (/whatsapp/i.test(ua)) {
    browser = 'WhatsApp';
  } else if (/instagram/i.test(ua)) {
    browser = 'Instagram';
  } else if (/tiktok|bytedance/i.test(ua)) {
    browser = 'TikTok';
  } else if (/facebookexternalhit|meta-externalagent/i.test(ua)) {
    browser = 'Instagram / Meta (Preview)';
  } else if (/fban|fbav/i.test(ua)) {
    browser = 'Facebook App';
  } else if (/messenger/i.test(ua)) {
    browser = 'Messenger';
  } else if (/facebook/i.test(ua)) {
    browser = 'Facebook';
  } else if (/telegram/i.test(ua)) {
    browser = 'Telegram';
  } else if (/twitter|x-agent/i.test(ua)) {
    browser = 'Twitter (X)';
  } else if (/line\//i.test(ua)) {
    browser = 'Line';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/ucbrowser|ubrowser/i.test(ua)) {
    browser = 'UC Browser';
  } else if (/oppobrowser|heytapbrowser/i.test(ua)) {
    browser = 'Oppo Browser';
  } else if (/vivobrowser/i.test(ua)) {
    browser = 'Vivo Browser';
  } else if (/miuibrowser/i.test(ua)) {
    browser = 'Mi Browser';
  } else if (/edg|edge/i.test(ua)) {
    browser = 'Edge';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Safari';
  }

  return {
    deviceType,
    os,
    browser
  };
}

export function detectDeviceModel(uaString: string | null | undefined): string {
  if (!uaString) return 'Perangkat Tidak Diketahui';
  const ua = uaString.toLowerCase();

  if (/iphone/i.test(ua)) return 'Apple iPhone';
  if (/ipad/i.test(ua)) return 'Apple iPad';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac / MacBook';
  if (/samsung|sm-[a-z0-9]+/i.test(ua)) return 'Samsung Galaxy';
  if (/redmi|xiaomi|poco/i.test(ua)) return 'Xiaomi / Redmi';
  if (/oppo|cph[0-9]+/i.test(ua)) return 'Oppo';
  if (/vivo|v[0-9]{4}/i.test(ua)) return 'Vivo';
  if (/realme|rmx[0-9]+/i.test(ua)) return 'Realme';
  if (/huawei|honor/i.test(ua)) return 'Huawei / Honor';
  if (/windows nt/i.test(ua)) return 'Windows PC / Laptop';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android Smartphone';
  return 'Perangkat Web';
}

export function parseTrafficSource(referrer: string | null | undefined, userAgent: string | null | undefined): string {
  const ref = (referrer || '').toLowerCase();
  const ua = (userAgent || '').toLowerCase();

  if (/instagram/i.test(ua) || /l\.instagram\.com/i.test(ref) || /instagram\.com/i.test(ref)) {
    return 'Instagram (Story / DM)';
  }
  if (/whatsapp/i.test(ua) || /wa\.me/i.test(ref) || /whatsapp\.com/i.test(ref)) {
    return 'WhatsApp (Pesan Chat)';
  }
  if (/tiktok/i.test(ua) || /tiktok\.com/i.test(ref)) {
    return 'TikTok';
  }
  if (/facebook|fbav|fban/i.test(ua) || /facebook\.com|fb\.com|l\.facebook\.com/i.test(ref)) {
    return 'Facebook';
  }
  if (/twitter|x-agent/i.test(ua) || /t\.co|twitter\.com|x\.com/i.test(ref)) {
    return 'Twitter (X)';
  }
  if (/google\./i.test(ref)) {
    return 'Google Search';
  }
  if (/telegram/i.test(ua)) {
    return 'Telegram';
  }
  if (!referrer || ref === '' || /localhost|senadda\.id/i.test(ref)) {
    return 'Tautan Langsung / WhatsApp';
  }
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Tautan Eksternal';
  }
}

export function extractClientContext(request: Request) {
  const headers = request.headers;
  const userAgent = headers.get('user-agent') || '';
  const parsedUa = parseUserAgent(userAgent);
  const city = headers.get('cf-ipcity') || null;
  const country = headers.get('cf-ipcountry') || null;
  const referrer = headers.get('referer') || headers.get('referrer') || null;

  return {
    userAgent,
    ...parsedUa,
    city: city ? decodeURIComponent(city) : null,
    country: country ? country.toUpperCase() : null,
    referrer: referrer ? referrer.slice(0, 500) : null
  };
}

/**
 * Checks if a hostname belongs to a local or development environment.
 */
export function isLocalHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().trim().replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.test') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^192\.168\./.test(h) ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  );
}

/**
 * Determines whether analytics and guest activity tracking should be recorded.
 * Only records on live production environments (unless forced via PUBLIC_FORCE_ANALYTICS=true).
 */
export function isLiveTrackingEnvironment(hostname?: string | null): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_FORCE_ANALYTICS === 'true') {
    return true;
  }
  if (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)) {
    return false;
  }

  const host = (
    hostname ||
    (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase().trim().replace(/:\d+$/, '').replace(/^\[|\]$/g, '');

  if (!host) {
    return typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.PROD) : false;
  }

  return !isLocalHost(host);
}

