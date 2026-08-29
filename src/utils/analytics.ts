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
  const isMobile = /(iphone|ipod|android.*mobile|windows phone|blackberry|mobile|opera mini|iemobile)/i.test(ua);

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
  } else if (/fban|fbav/i.test(ua)) {
    browser = 'Facebook';
  } else if (/line\//i.test(ua)) {
    browser = 'Line';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
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
