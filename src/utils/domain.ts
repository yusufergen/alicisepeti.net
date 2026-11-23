import type {
  AdminUserRow,
  AgentTrustSummary,
  BuyerRequest,
  RequestFilters,
  TrustBadgeTier,
} from '../types';

export const TRANSACTION_TYPES = ['Satılık', 'Kiralık'] as const;

export const PROPERTY_TYPES = [
  'Daire',
  'Villa',
  'Müstakil Ev',
  'Residence',
  'Arsa',
  'İşyeri / Ofis',
] as const;

export const ROOM_COUNTS = [
  '1+0',
  '1+1',
  '2+1',
  '3+1',
  '4+1',
  '4+2',
  '5+1 ve üzeri',
  'Arsa / Ticari',
] as const;

export const BUILDING_AGE_OPTIONS = [
  'Fark Etmez',
  'Sıfır (0)',
  '1-5 Yıl',
  '6-10 Yıl',
  '11-20 Yıl',
  '20+ Yıl',
] as const;

export const FLOOR_PREF_OPTIONS = [
  'Fark Etmez',
  'Bahçe / Giriş Kat',
  'Ara Kat',
  'Yüksek Kat',
  'En Üst / Çatı Dubleks',
  'Müstakil',
] as const;

export const FEATURE_OPTIONS = [
  'Asansör',
  'Kapalı Otopark',
  'Site İçi / Güvenlik',
  'Balkon / Teras',
  'Ebeveyn Banyosu',
  'Deniz / Doğa Manzarası',
  'Metro / Ulaşıma Yakın',
  'Krediye Uygun',
  'Kat Mülkiyetli',
  'Yerden Isıtma',
] as const;

export function formatCurrencyTRY(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '0 ₺';
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(amount))} ₺`;
}

export function formatBudgetRange(min: number, max: number): string {
  if (min > 0 && max > 0) {
    if (min === max) return formatCurrencyTRY(max);
    return `${formatCurrencyTRY(min)} – ${formatCurrencyTRY(max)}`;
  }
  if (max > 0) return `En fazla ${formatCurrencyTRY(max)}`;
  if (min > 0) return `${formatCurrencyTRY(min)}+`;
  return 'Belirtilmedi';
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidTurkishPhone(phone: string): boolean {
  const normalized = normalizePhoneDigits(phone);
  return /^5\d{9}$/.test(normalized);
}

export function formatTurkishPhone(phone: string): string {
  const normalized = normalizePhoneDigits(phone);
  if (/^5\d{9}$/.test(normalized)) {
    return `0${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)}`;
  }
  return phone.trim();
}

export function toTelHref(phone: string): string {
  const normalized = normalizePhoneDigits(phone);
  if (/^5\d{9}$/.test(normalized)) {
    return `tel:+90${normalized}`;
  }
  return `tel:${phone.replace(/\s+/g, '')}`;
}

export function toWhatsAppHref(phone: string, text: string): string {
  const normalized = normalizePhoneDigits(phone);
  const waNum = /^5\d{9}$/.test(normalized) ? `90${normalized}` : normalized;
  return `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
}

export function isValidMykNumber(myk: string): boolean {
  const cleaned = myk.trim().toUpperCase();
  // Real Turkish MYK Seviye 5 numbers typically start with YB or 17UY or contain alphanumeric segments >= 6 chars
  return /^[A-Z0-9/\-]{6,32}$/.test(cleaned) && /\d/.test(cleaned);
}

export function normalizeTurkishSearch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

export interface BuyerRequestFormInput {
  title: string;
  transaction_type: string;
  property_type: string;
  city: string;
  district: string;
  neighborhood: string;
  budget_min: number;
  budget_max: number;
  room_count: string;
  min_sqm: number;
  buyer_note: string;
  contact_phone: string;
}

export function validateBuyerRequestInput(input: BuyerRequestFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.city.trim()) errors.city = 'İl seçimi zorunludur.';
  if (!input.district.trim()) errors.district = 'İlçe bilgisi zorunludur.';
  if (!input.neighborhood.trim()) errors.neighborhood = 'Mahalle bilgisi zorunludur.';

  if (!Number.isFinite(input.budget_min) || input.budget_min < 0) {
    errors.budget_min = 'Geçerli bir minimum bütçe girin.';
  }
  if (!Number.isFinite(input.budget_max) || input.budget_max <= 0) {
    errors.budget_max = 'Maksimum bütçe 0 TL’den büyük olmalıdır.';
  }
  if (
    Number.isFinite(input.budget_min) &&
    Number.isFinite(input.budget_max) &&
    input.budget_max > 0 &&
    input.budget_min > input.budget_max
  ) {
    errors.budget_max = 'Maksimum bütçe minimum bütçeden küçük olamaz.';
  }

  if (!input.room_count.trim()) errors.room_count = 'Oda sayısı seçilmelidir.';
  if (!Number.isFinite(input.min_sqm) || input.min_sqm < 0) {
    errors.min_sqm = 'Metrekare değeri geçersiz.';
  }

  if (!input.buyer_note.trim() || input.buyer_note.trim().length < 15) {
    errors.buyer_note = 'Alıcı notu en az 15 karakter olmalıdır (müşteri beklentisi, ödeme şekli vb.).';
  }

  if (!isValidTurkishPhone(input.contact_phone)) {
    errors.contact_phone = 'Geçerli bir cep telefonu girin (05XX XXX XX XX).';
  }

  return errors;
}

export function filterBuyerRequests(
  requests: BuyerRequest[],
  filters: RequestFilters,
  currentUserId?: number
): BuyerRequest[] {
  const search = normalizeTurkishSearch(filters.q || '');
  const minBudgetFilter = filters.min_budget ? Number(filters.min_budget) : 0;
  const maxBudgetFilter = filters.max_budget ? Number(filters.max_budget) : 0;
  const selectedNeighborhoods = (filters.neighborhoods || [])
    .map((n) => normalizeTurkishSearch(n))
    .filter(Boolean);

  const filtered = requests.filter((req) => {
    if (filters.only_mine && currentUserId && req.agent_id !== currentUserId) {
      return false;
    }
    if (filters.city && req.city !== filters.city) {
      return false;
    }
    if (filters.district && req.district !== filters.district) {
      return false;
    }
    if (selectedNeighborhoods.length > 0) {
      if (!selectedNeighborhoods.includes(normalizeTurkishSearch(req.neighborhood))) {
        return false;
      }
    } else if (
      filters.neighborhood &&
      normalizeTurkishSearch(req.neighborhood) !== normalizeTurkishSearch(filters.neighborhood)
    ) {
      return false;
    }
    if (filters.transaction_type && req.transaction_type !== filters.transaction_type) {
      return false;
    }
    if (filters.property_type && req.property_type !== filters.property_type) {
      return false;
    }
    if (filters.room_count && req.room_count !== filters.room_count) {
      return false;
    }
    if (filters.credit_only && !req.credit_suitable) {
      return false;
    }
    if (minBudgetFilter > 0 && req.budget_max < minBudgetFilter) {
      return false;
    }
    if (maxBudgetFilter > 0 && req.budget_min > maxBudgetFilter) {
      return false;
    }
    if (search) {
      const haystack = normalizeTurkishSearch(
        [
          req.title,
          req.city,
          req.district,
          req.neighborhood,
          req.buyer_note,
          req.property_type,
          req.agent_name || '',
          req.agent_office || '',
        ].join(' ')
      );
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  return sortBuyerRequests(filtered, filters.sort_by || 'newest');
}

export function sortBuyerRequests(
  requests: BuyerRequest[],
  sortBy: 'newest' | 'budget_desc' | 'budget_asc' = 'newest'
): BuyerRequest[] {
  const copy = [...requests];
  if (sortBy === 'budget_desc') {
    return copy.sort((a, b) => b.budget_max - a.budget_max);
  }
  if (sortBy === 'budget_asc') {
    return copy.sort((a, b) => (a.budget_min || a.budget_max) - (b.budget_min || b.budget_max));
  }
  return copy.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export interface LocationFacetCount {
  name: string;
  count: number;
}

export function computeLocationFacetCounts(
  requests: BuyerRequest[],
  selectedCity: string,
  selectedDistrict: string
): {
  cities: LocationFacetCount[];
  districts: LocationFacetCount[];
  neighborhoods: LocationFacetCount[];
} {
  const cityMap = new Map<string, number>();
  const districtMap = new Map<string, number>();
  const neighborhoodMap = new Map<string, number>();

  for (const req of requests) {
    cityMap.set(req.city, (cityMap.get(req.city) || 0) + 1);
    if (selectedCity && req.city === selectedCity) {
      districtMap.set(req.district, (districtMap.get(req.district) || 0) + 1);
      if (selectedDistrict && req.district === selectedDistrict) {
        neighborhoodMap.set(req.neighborhood, (neighborhoodMap.get(req.neighborhood) || 0) + 1);
      }
    }
  }

  const sortFacets = (map: Map<string, number>): LocationFacetCount[] =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr-TR'));

  return {
    cities: sortFacets(cityMap),
    districts: sortFacets(districtMap),
    neighborhoods: sortFacets(neighborhoodMap),
  };
}

export function formatRelativeDateTR(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function filterAdminUsers(
  users: AdminUserRow[],
  filters: { q: string; status: string; role: string }
): AdminUserRow[] {
  const search = normalizeTurkishSearch(filters.q || '');
  return users.filter((u) => {
    if (filters.status && filters.status !== 'all' && u.status !== filters.status) {
      return false;
    }
    if (filters.role && filters.role !== 'all' && u.role !== filters.role) {
      return false;
    }
    if (search) {
      const haystack = normalizeTurkishSearch(
        [u.full_name, u.email, u.phone, u.office_name, u.city, u.district, u.myk_number].join(' ')
      );
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function filterAdminRequests(
  requests: BuyerRequest[],
  filters: { q: string; status: string; transaction_type: string; city: string }
): BuyerRequest[] {
  const search = normalizeTurkishSearch(filters.q || '');
  return requests.filter((r) => {
    if (filters.status && filters.status !== 'all' && r.status !== filters.status) {
      return false;
    }
    if (
      filters.transaction_type &&
      filters.transaction_type !== 'all' &&
      r.transaction_type !== filters.transaction_type
    ) {
      return false;
    }
    if (filters.city && filters.city !== 'all' && r.city !== filters.city) {
      return false;
    }
    if (search) {
      const haystack = normalizeTurkishSearch(
        [
          r.title,
          r.city,
          r.district,
          r.neighborhood,
          r.buyer_note,
          r.contact_phone,
          r.agent_name || '',
          r.agent_office || '',
        ].join(' ')
      );
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function computeTrustSummary(
  ratingAvg: number,
  reviewCount: number,
  completedDeals = 0
): AgentTrustSummary {
  const safeCount = Math.max(0, Math.floor(Number(reviewCount) || 0));
  const safeAvg = safeCount > 0 ? Math.round((Number(ratingAvg) || 0) * 10) / 10 : 0;
  const safeDeals = Math.max(0, Math.floor(Number(completedDeals) || 0));

  let tier: TrustBadgeTier = 'none';
  let badgeLabel = '';

  if (safeCount >= 5 && safeAvg >= 4.8 && safeDeals >= 4) {
    tier = 'elite';
    badgeLabel = 'Elit Güvenilir Danışman';
  } else if (safeCount >= 2 && safeAvg >= 4.5 && safeDeals >= 2) {
    tier = 'trusted';
    badgeLabel = 'Güvenilir Danışman';
  } else if (safeCount >= 1 && safeAvg >= 4.0) {
    tier = 'rated';
    badgeLabel = 'Onaylı İşlem Puanlı';
  }

  return {
    rating_avg: safeAvg,
    review_count: safeCount,
    completed_deals: safeDeals,
    tier,
    badge_label: badgeLabel,
  };
}

export function validateReviewInput(input: {
  rating: number;
  comment: string;
}): string | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return 'Lütfen 1 ile 5 arasında bir yıldız puanı seçin.';
  }
  const trimmed = (input.comment || '').trim();
  if (trimmed.length > 0 && trimmed.length < 5) {
    return 'Yorum yazarsanız en az 5 karakter olmalıdır.';
  }
  if (trimmed.length > 400) {
    return 'Değerlendirme yorumu en fazla 400 karakter olabilir.';
  }
  return null;
}


