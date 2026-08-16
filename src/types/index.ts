export type WeddingStatus = 'draft' | 'published' | 'archived';

export interface LoveStoryItem {
  year?: string;
  title: string;
  description: string;
}

export interface Wedding {
  id: string;
  slug: string;
  bride_name: string;
  groom_name: string;
  bride_full_name: string;
  groom_full_name: string;
  wedding_date: string; // ISO string
  venue_name: string;
  venue_address: string;
  maps_url: string;
  story: LoveStoryItem[]; // Parsed from JSONB
  music_url: string | null;
  template: string;
  status: WeddingStatus;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThemeConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    bgColor: string;
    fontHeading: string;
    fontBody: string;
  };
  layout: {
    heroStyle: 'centered' | 'split';
    galleryColumns: number;
  };
  assets?: {
    coverImage?: string;
    heroImage?: string;
    heroImageTwo?: string;
    heroImageThree?: string;
    brideImage?: string;
    groomImage?: string;
    videoUrl?: string;
    heroVideo?: string;
    videoPoster?: string;
    posterImage?: string;
    closingImage?: string;
    eventImage?: string;
    rsvpImage?: string;
    countdownImage?: string;
  };
  content?: {
    instagramUrl?: string;
    groomInstagramUrl?: string;
    brideInstagramUrl?: string;
    groomFatherName?: string;
    groomMotherName?: string;
    brideFatherName?: string;
    brideMotherName?: string;
    groomAddress?: string;
    brideAddress?: string;
    [key: string]: string | undefined;
  };
}

export interface SectionToggles {
  hero: boolean;
  countdown: boolean;
  coupleInfo: boolean;
  eventDetails: boolean;
  story: boolean;
  gallery: boolean;
  rsvp: boolean;
  wishes: boolean;
  gift: boolean;
  music: boolean;
  share: boolean;
  video?: boolean;
  livestream?: boolean;
  introAnimation?: boolean;
}

export interface InvitationSettings {
  id: string;
  wedding_id: string;
  rsvp_enabled: boolean;
  music_enabled: boolean;
  music_autoplay: boolean;
  countdown_enabled: boolean;
  gallery_enabled: boolean;
  wishes_enabled: boolean;
  gift_enabled: boolean;
  share_enabled: boolean;
  view_counter_enabled: boolean;
  maintenance_mode: boolean;
  expiration_date: string | null;
  password_protection_enabled: boolean;
  access_password: string | null;
  sections: SectionToggles;
  theme_config: ThemeConfig;
  created_at: string;
  updated_at: string;
}

export interface WeddingEvent {
  id: string;
  wedding_id: string;
  event_name: string; // Ceremony, Reception, Engagement, Tea Ceremony
  event_date: string; // ISO string
  start_time: string; // '09:00'
  end_time: string;   // '12:00' or 'Finished'
  venue_name: string;
  venue_address: string;
  maps_url: string;
  sort_order: number;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  wedding_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface GiftAccount {
  id: string;
  wedding_id: string;
  bank_name: string; // e.g. BCA, Mandiri, QRIS
  bank_logo?: string; // Optional URL for bank logo
  account_number: string;
  account_name: string;
  qris_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface RSVP {
  id: string;
  wedding_id: string;
  guest_name: string;
  attendance_status: 'attending' | 'declined';
  guest_count: number;
  message: string | null;
  created_at: string;
}

export interface InvitationView {
  id: string;
  wedding_id: string;
  ip_hash: string;
  user_agent: string;
  created_at: string;
}

export interface CustomDomain {
  id: string;
  wedding_id: string;
  domain: string;
  status: string;
  ssl_status: string;
  created_at: string;
}

// Unified payload returned by the database resolver service
export interface FullInvitationData {
  wedding: Wedding;
  settings: InvitationSettings;
  events: WeddingEvent[];
  gallery: GalleryImage[];
  gifts: GiftAccount[];
  wishes: RSVP[]; // Attending RSVPs with messages
}
