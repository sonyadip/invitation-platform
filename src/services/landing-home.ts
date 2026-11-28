import type { PlatformSettings } from './platform-settings';

export interface TemplateVariant {
  label: string;
  previewUrl: string;
  waTheme: string;
  price: string;
  promoPrice: string;
}

export interface TemplateCard {
  key: string;
  name: string;
  category: 'pernikahan' | 'metatah';
  price: string;
  promoPrice: string | null;
  image: string;
  hasVariants?: boolean;
  variants?: TemplateVariant[] | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface AddonItem {
  name: string;
  price: string;
}

export interface ProcessStep {
  num: string;
  delay: string;
  title: string;
  desc: string;
}

export interface DashboardTab {
  key: string;
  label: string;
  title: string;
  desc: string;
  image: string;
  width: number;
  height: number;
  alt: string;
}

const DEFAULT_TEMPLATE_ENTRIES: Array<Omit<TemplateCard, 'image' | 'hasVariants' | 'variants'>> = [
  { key: 'memoire', name: 'Memoire', category: 'pernikahan', price: 'Rp 450.000', promoPrice: 'Rp 300.000' },
  { key: 'serenade', name: 'Serenade', category: 'pernikahan', price: 'Rp 350.000', promoPrice: 'Rp 250.000' },
  { key: 'nocturne', name: 'Nocturne', category: 'pernikahan', price: 'Rp 350.000', promoPrice: 'Rp 250.000' },
  { key: 'allure', name: 'Allure', category: 'pernikahan', price: 'Rp 350.000', promoPrice: 'Rp 250.000' },
  { key: 'lumiere', name: 'Lumiere', category: 'pernikahan', price: 'Rp 450.000', promoPrice: 'Rp 300.000' },
  { key: 'lumiere-metatah', name: 'Lumiere', category: 'metatah', price: 'Rp 450.000', promoPrice: 'Rp 300.000' },
  { key: 'lumiere-metatah-v2', name: 'Lumiere v2', category: 'metatah', price: 'Rp 450.000', promoPrice: 'Rp 300.000' },
  { key: 'atelier', name: 'Atelier', category: 'pernikahan', price: 'Rp 450.000', promoPrice: 'Rp 300.000' },
  { key: 'editorial', name: 'Editorial', category: 'pernikahan', price: 'Rp 300.000', promoPrice: 'Rp 200.000' },
  { key: 'deauville', name: 'Deauville', category: 'pernikahan', price: 'Rp 300.000', promoPrice: 'Rp 200.000' },
  { key: 'terre', name: 'Terre', category: 'pernikahan', price: 'Rp 200.000', promoPrice: 'Rp 150.000' },
  { key: 'air', name: 'Air', category: 'pernikahan', price: 'Rp 200.000', promoPrice: 'Rp 150.000' },
  { key: 'noir', name: 'Noir', category: 'pernikahan', price: 'Rp 200.000', promoPrice: 'Rp 150.000' }
];

const REQUIRED_CARD_KEYS = ['terre', 'serenade', 'nocturne', 'allure', 'memoire'] as const;

export const LANDING_NAV_ITEMS: ReadonlyArray<readonly [string, string]> = [
  ['Koleksi', '#templates'],
  ['Alur', '#process'],
  ['Dashboard', '#dashboard'],
  ['Fitur', '#features'],
  ['FAQ', '#faq'],
  ['Konsultasi', '#booking']
];

export const LANDING_FEATURES: readonly string[] = [
  'Tamu Tanpa Batas',
  'RSVP & Ucapan',
  'Amplop Digital',
  'Navigasi Maps',
  'Total 15 Foto',
  'Musik Latar',
  'Hitung Mundur',
  'Kisah Cinta',
  'Total 1 Video',
  'Simpan Kalender',
  'Link Instagram',
  'Aktif 1 Bulan',
  'Dashboard Analytics',
  'Export Data Tamu'
];

export const LANDING_ADDONS: readonly AddonItem[] = [
  { name: 'Prioritas 24 jam', price: '+ 50.000' },
  { name: 'Tambah Foto', price: '+ 5.000 / foto' },
  { name: 'Tambah Video', price: '+ 20.000 / video' }
];

export const LANDING_PROCESS_STEPS: readonly ProcessStep[] = [
  {
    num: '01',
    delay: '100ms',
    title: 'Siapkan Data Acara',
    desc: 'Kirimkan detail acara dan foto Anda melalui WhatsApp atau formulir pemesanan.'
  },
  {
    num: '02',
    delay: '200ms',
    title: 'Kita Proses',
    desc: 'Tim kami merangkai dan menyesuaikan undangan Anda hingga rapi dan siap ditinjau.'
  },
  {
    num: '03',
    delay: '300ms',
    title: 'Undangan Siap Disebarkan',
    desc: 'Tautan undangan aktif dan siap Anda bagikan langsung ke keluarga serta para tamu.'
  }
];

export const LANDING_DASHBOARD_TABS: readonly DashboardTab[] = [
  {
    key: 'home',
    label: 'Dashboard',
    title: 'Pantau Semuanya',
    desc: 'Lihat ringkasan lengkap undangan: statistik RSVP, jumlah tamu, countdown hari H, rangkaian acara, dan ucapan terbaru dalam satu halaman.',
    image: '/images/dashboard/dashboard-home.webp',
    width: 1385,
    height: 967,
    alt: 'Dashboard Manajemen Undangan Digital Senadda'
  },
  {
    key: 'kirim',
    label: 'Kirim Undangan',
    title: 'Kirim dengan Mudah',
    desc: 'Pilih template pesan sesuai nada (Formal, Teman, Keluarga), kelola daftar tamu, dan kirim undangan langsung via WhatsApp. Satu klik, langsung terkirim.',
    image: '/images/dashboard/dashboard-kirim.webp',
    width: 1385,
    height: 970,
    alt: 'Kirim Undangan Digital WhatsApp - Senadda'
  },
  {
    key: 'rsvp',
    label: 'RSVP',
    title: 'Lacak Kehadiran',
    desc: 'Ringkasan RSVP real-time: siapa yang hadir, berapa total pax, filter berdasarkan status, dan export data tamu kapan saja.',
    image: '/images/dashboard/dashboard-rsvp.webp',
    width: 1384,
    height: 969,
    alt: 'Lacak RSVP & Buku Tamu Undangan Digital - Senadda'
  }
];

export const LANDING_FAQS: readonly FaqItem[] = [
  {
    q: 'Bagaimana cara mengisi nama tamu dan membagikan undangan?',
    a: 'Tambahkan <code>?to=Nama+Tamu</code> di akhir link undangan (ganti spasi dengan tanda +). Contoh: <code>senadda.id/rama-ayu?to=Putu+Putra</code>. Link langsung siap disalin dan dikirim.<br><br>Selain cara manual, Anda juga mendapat akses <strong>Dashboard Tamu</strong> jika ingin memasukkan daftar nama sekaligus agar sistem menghasilkan link unik tiap tamu secara otomatis.'
  },
  {
    q: 'Berapa lama proses pembuatan undangan digital?',
    a: 'Pembuatan standar memakan waktu <strong>1 hingga 3 hari kerja</strong> setelah data acara dan materi foto kami terima lengkap. Butuh mendesak? Tersedia fasilitas <strong>Prioritas 24 Jam</strong> agar undangan siap disebar keesokan harinya.'
  },
  {
    q: 'Bagaimana jika kami belum memiliki video prewedding?',
    a: 'Tidak masalah. Untuk tema yang memiliki latar video, kami dapat menggantinya dengan fitur <strong>galeri foto dinamis (photo slider)</strong> yang memutar foto-foto Anda secara bergantian dengan transisi yang halus.'
  },
  {
    q: 'Apakah ada batasan revisi jika ada kesalahan data atau perubahan?',
    a: 'Untuk perbaikan data teks (seperti ejaan nama, gelar adat, jam, penyesuaian lokasi, dan kutipan) maupun penyesuaian foto dan lagu latar, kami berikan <strong>revisi sepuasnya</strong>. Anda juga mendapatkan kesempatan merombak susunan section sebelum undangan disebarkan.'
  },
  {
    q: 'Berapa lama link undangan akan tetap aktif?',
    a: 'Tautan undangan akan tetap aktif hingga <strong>1 bulan setelah acara selesai</strong>. Seluruh rekapan doa restu, ucapan selamat, dan konfirmasi kehadiran dari para tamu tetap tersimpan aman dan dapat Anda akses kapan saja.'
  },
  {
    q: 'Bagaimana jika ada perubahan jadwal atau lokasi setelah undangan disebar?',
    a: 'Cukup kabari tim kami perubahannya. Data undangan akan langsung diperbarui di sistem secara <em>real-time</em>, sehingga tamu yang membuka tautan yang sudah disebar akan otomatis melihat informasi terbaru tanpa perlu mengganti link.'
  },
  {
    q: 'Bagaimana cara memantau konfirmasi kehadiran (RSVP) dan ucapan tamu?',
    a: 'Setiap tamu dapat mengisi form konfirmasi kehadiran dan doa restu langsung di halaman undangan. Seluruh respons terekap otomatis di dashboard Anda secara rapi untuk memudahkan perkiraan kehadiran tamu dan porsi katering.'
  },
  {
    q: 'Apakah Senadda melayani undangan untuk acara adat Bali seperti Metatah / Mepandes?',
    a: 'Ya, tentu. Selain Pawiwahan (pernikahan), kami menyediakan template khusus <strong>Upacara Metatah / Mepandes</strong> dengan tata susunan upacara adat Bali, teks doa/mantra, serta pilihan varian desain dengan foto maupun tanpa foto.'
  },
  {
    q: 'Apakah kami bisa menggunakan lagu pilihan sendiri sebagai musik latar?',
    a: 'Bisa. Anda bebas memilih lagu favorit, lagu pop romantis, instrumen akustik, maupun instrumen tradisional Bali sebagai musik latar otomatis saat undangan dibuka oleh tamu.'
  },
  {
    q: 'Bagaimana alur pemesanan dan pembayarannya?',
    a: 'Pilih tema favorit Anda di katalog, lalu hubungi kami via WhatsApp. Tim kami akan mengirimkan formulir data acara serta instruksi pembayaran. Begitu data lengkap, undangan langsung kami proses.'
  }
];

export const LANDING_PAGE_KEYWORDS =
  'undangan digital bali, senada undangan digital, senadda, senadda id, senadda.id, senada, undangan senada, undangan senada bali, undangan digital senada, jasa undangan digital bali, undangan pernikahan bali, undangan pernikahan digital, undangan pawiwahan bali, undangan metatah bali, undangan mepandes, undangan digital denpasar, platform undangan digital';

export function buildWhatsAppBookingUrl(
  baseUrl?: string | null,
  templateName?: string,
  promoPrice?: string | null,
  variant: 'default' | 'special-deal' = 'default'
): string {
  const defaultBase = variant === 'special-deal' ? 'https://wa.me/6288236262247' : 'https://wa.me/6281234567890';
  const base = baseUrl || defaultBase;
  const message =
    variant === 'special-deal'
      ? templateName
        ? `Halo Admin Senadda, saya tertarik untuk membuat undangan digital dengan tema *${templateName}* seharga promo *${promoPrice || ''}*. Boleh minta informasi mengenai cara pemesanannya?`
        : 'Halo Admin Senadda, saya tertarik untuk membuat undangan digital dengan harga promo. Boleh minta informasi mengenai cara pemesanannya?'
      : templateName
        ? `Halo Admin, saya tertarik untuk membuat undangan digital dengan tema *${templateName}*. Boleh minta informasi mengenai cara pemesanannya?`
        : 'Halo Admin, saya ingin bertanya lebih lanjut mengenai pembuatan undangan digital.';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}text=${encodeURIComponent(message)}`;
}

function resolveCategory(card: { category?: string | null; key?: string | null }): 'pernikahan' | 'metatah' {
  if (card.category && typeof card.category === 'string') {
    return card.category.toLowerCase().includes('metatah') ? 'metatah' : 'pernikahan';
  }
  return `${card.key || ''}`.toLowerCase().includes('metatah') ? 'metatah' : 'pernikahan';
}

function parsePrice(price?: string | null): number {
  return parseInt((price || '').replace(/\D/g, ''), 10) || 0;
}

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function normalizeCatalogCard(
  rawCard: Record<string, unknown>,
  imageMap: Record<string, string>,
  fallbackImage = ''
): TemplateCard {
  const key = String(rawCard.key || '');
  const isMetatahCard = key === 'lumiere-metatah' || key === 'lumiere-metatah-v2';
  const rawName = typeof rawCard.name === 'string' && rawCard.name.trim() ? rawCard.name.trim() : undefined;
  const name =
    key === 'lumiere-metatah'
      ? 'Lumiere'
      : key === 'lumiere-metatah-v2'
        ? rawName || 'Lumiere v2'
        : rawName || 'Lumiere';
  const defaultPreview = key === 'lumiere-metatah' ? '/preview/lumiere-metatah-v2' : `/preview/${key}`;

  return {
    key,
    name,
    category: resolveCategory({
      category: typeof rawCard.category === 'string' ? rawCard.category : null,
      key
    }),
    price: String(rawCard.price || ''),
    promoPrice:
      typeof rawCard.promo_price === 'string'
        ? rawCard.promo_price
        : typeof rawCard.promoPrice === 'string'
          ? rawCard.promoPrice
          : null,
    image: (typeof rawCard.image === 'string' && rawCard.image) || imageMap[key] || fallbackImage,
    hasVariants: isMetatahCard,
    variants: isMetatahCard
      ? [
          {
            label: 'Dengan Foto',
            previewUrl: defaultPreview,
            waTheme: `${name} (Dengan Foto)`,
            price: 'Rp 450.000',
            promoPrice: 'Rp 300.000'
          },
          {
            label: 'Tanpa Foto',
            previewUrl: '/preview/lumiere-metatah-tanpa-foto',
            waTheme: `${name} (Tanpa Foto)`,
            price: 'Rp 350.000',
            promoPrice: 'Rp 250.000'
          }
        ]
      : null
  };
}

function applyHalfPricePromo(card: TemplateCard): TemplateCard {
  const basePrice = card.promoPrice || card.price;
  const halfPromo = formatRupiah(Math.round(parsePrice(basePrice) / 2));
  return {
    ...card,
    price: basePrice,
    promoPrice: halfPromo,
    variants: card.variants
      ? card.variants.map((variant) => {
          const variantBasePrice = variant.promoPrice || variant.price;
          return {
            ...variant,
            price: variantBasePrice,
            promoPrice: formatRupiah(Math.round(parsePrice(variantBasePrice) / 2))
          };
        })
      : null
  };
}

/**
 * Normalizes platform template cards, guarantees fallback coverage for required
 * categories/keys, optionally applies special-deal half-price promos, and sorts
 * cards by price descending.
 */
export function buildHomeCatalog(
  settingsCards: Array<Record<string, unknown>> | undefined | null,
  imageMap: Record<string, string>,
  options?: { fallbackImage?: string; halfPricePromo?: boolean }
): TemplateCard[] {
  const fallbackImage = options?.fallbackImage || '';
  const defaultCards = DEFAULT_TEMPLATE_ENTRIES.map((entry) =>
    normalizeCatalogCard(entry, imageMap, fallbackImage)
  );
  const sourceCards =
    Array.isArray(settingsCards) && settingsCards.length > 0
      ? settingsCards.map((entry) => normalizeCatalogCard(entry, imageMap, fallbackImage))
      : defaultCards;

  let cards = [...sourceCards];

  if (!cards.some((card) => card.category === 'metatah')) {
    cards.push(...defaultCards.filter((card) => card.category === 'metatah'));
  }

  for (const requiredKey of REQUIRED_CARD_KEYS) {
    if (!cards.some((card) => card.key === requiredKey)) {
      const fallback = defaultCards.find((card) => card.key === requiredKey);
      if (fallback) cards.push(fallback);
    }
  }

  if (options?.halfPricePromo) {
    cards = cards.map(applyHalfPricePromo);
  }

  cards.sort(
    (a, b) =>
      parsePrice(b.price) - parsePrice(a.price) ||
      parsePrice(b.promoPrice) - parsePrice(a.promoPrice)
  );

  return cards;
}

export function buildHomeJsonLd(params: {
  siteSettings: PlatformSettings;
  pageTitle: string;
  pageDescription: string;
  pageUrl: string;
  pageImage: string;
  faqs: readonly FaqItem[];
}) {
  const { siteSettings, pageTitle, pageDescription, pageUrl, pageImage, faqs } = params;
  const brandAlternates = [
    'Senada',
    'Senada ID',
    'Senada.id',
    'Undangan Senada',
    'Senada Undangan Digital',
    'Undangan Digital Senada',
    'Senada Bali',
    'Senadda',
    'Senadda ID',
    'Senadda.id',
    'Undangan Senadda'
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://senadda.id/#website',
        url: pageUrl,
        name: pageTitle,
        alternateName: brandAlternates,
        description: pageDescription,
        inLanguage: 'id-ID',
        publisher: { '@id': 'https://senadda.id/#organization' }
      },
      {
        '@type': 'ImageObject',
        '@id': 'https://senadda.id/#primaryimage',
        url: pageImage,
        contentUrl: pageImage,
        width: 1200,
        height: 630,
        caption: pageTitle
      },
      {
        '@type': 'WebPage',
        '@id': 'https://senadda.id/#webpage',
        url: pageUrl,
        name: pageTitle,
        description: pageDescription,
        inLanguage: 'id-ID',
        isPartOf: { '@id': 'https://senadda.id/#website' },
        about: { '@id': 'https://senadda.id/#localbusiness' },
        primaryImageOfPage: { '@id': 'https://senadda.id/#primaryimage' },
        thumbnailUrl: pageImage
      },
      {
        '@type': 'Organization',
        '@id': 'https://senadda.id/#organization',
        name: 'Senadda',
        alternateName: brandAlternates.filter((name) => name !== 'Senadda' && name !== 'Senadda.id'),
        url: pageUrl,
        logo: 'https://senadda.id/logo.jpg',
        sameAs: [
          ...new Set(
            [
              'https://www.instagram.com/senadda.id',
              siteSettings.instagram_url,
              siteSettings.tiktok_url,
              siteSettings.facebook_url
            ].filter(Boolean)
          )
        ]
      },
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': 'https://senadda.id/#localbusiness',
        name: 'Senadda - Undangan Pernikahan Digital Bali',
        alternateName: [
          ...brandAlternates,
          'Undangan Senada Bali',
          'Senadda Undangan Bali',
          'Senadda Digital Invitation',
          'Undangan Digital Bali Senadda'
        ],
        url: pageUrl,
        logo: 'https://senadda.id/logo.jpg',
        image: pageImage,
        description:
          'Jasa dan platform pembuatan undangan digital simple, clean, dan minimalis di Bali untuk pernikahan, pawiwahan adat Bali, serta upacara metatah/mepandes.',
        telephone: siteSettings.whatsapp_url
          ? siteSettings.whatsapp_url.replace(/[^0-9+]/g, '')
          : '+6288236262247',
        priceRange: 'Rp 150.000 - Rp 450.000',
        currenciesAccepted: 'IDR',
        paymentAccepted: 'Bank Transfer, QRIS, Bank BPD Bali, BCA, Mandiri, BRI, BNI',
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '08:00',
            closes: '21:00'
          }
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Koleksi Layanan Undangan Digital Bali',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Undangan Pernikahan Digital Bali',
                description:
                  'Layanan pembuatan undangan pernikahan digital modern dan luxury dengan fitur RSVP WhatsApp dan musik latar.'
              }
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Undangan Pawiwahan Adat Hindu Bali',
                description:
                  'Undangan digital bernuansa adat Bali lengkap dengan salam Om Swastyastu, sloka Bhagawad Gita, peta pura/banjar, dan amplop Bank BPD Bali.'
              }
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Undangan Upacara Metatah / Mepandes Bali',
                description:
                  'Koleksi khusus upacara Manusa Yadnya potong gigi khas Bali yang sakral, clean, dan minimalis.'
              }
            }
          ]
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Denpasar',
          addressRegion: 'Bali',
          addressCountry: 'ID'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: -8.670458,
          longitude: 115.212629
        },
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Bali' },
          { '@type': 'AdministrativeArea', name: 'Denpasar' },
          { '@type': 'AdministrativeArea', name: 'Badung' },
          { '@type': 'AdministrativeArea', name: 'Gianyar' },
          { '@type': 'AdministrativeArea', name: 'Tabanan' },
          { '@type': 'Country', name: 'Indonesia' }
        ],
        knowsAbout: [
          'Senada',
          'Senada ID',
          'Undangan Senada',
          'Senada Undangan Digital',
          'Undangan Digital Senada',
          'Senada Bali',
          'Senadda',
          'Senadda ID',
          'Undangan Senadda',
          'Undangan Bali',
          'Undangan Digital Bali',
          'Jasa Undangan Digital Bali',
          'Undangan Digital Denpasar',
          'Undangan Digital Badung',
          'Undangan Digital Gianyar',
          'Senadda Undangan Digital',
          'Undangan Digital',
          'Undangan Pernikahan',
          'Undangan Pernikahan Bali',
          'Undangan Pawiwahan Bali',
          'Undangan Metatah Bali',
          'Undangan Mepandes Bali',
          'RSVP Online',
          'Website Pernikahan'
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://senadda.id/#faq',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a.replace(/<[^>]+>/g, '')
          }
        }))
      }
    ]
  };
}
