export type UserRole = 'agent' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export type TrustBadgeTier = 'none' | 'rated' | 'trusted' | 'elite';

export interface AgentTrustSummary {
  rating_avg: number;
  review_count: number;
  completed_deals: number;
  tier: TrustBadgeTier;
  badge_label: string;
}

export interface AgentReview {
  id: number;
  request_id: number;
  reviewer_agent_id: number;
  target_agent_id: number;
  rating: number;
  comment: string;
  deal_closed: boolean;
  created_at: string;
  reviewer_name?: string;
  reviewer_office?: string;
  reviewer_avatar?: string;
  target_name?: string;
  target_office?: string;
  target_avatar?: string;
  request_title?: string;
  request_city?: string;
  request_district?: string;
}

export interface AgentUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  office_name: string;
  city: string;
  district: string;
  myk_number: string;
  ttbs_number: string;
  myk_doc_path: string;
  myk_doc_name: string;
  myk_doc_mime: string;
  avatar_path: string;
  role: UserRole;
  status: UserStatus;
  rejection_reason: string;
  bio: string;
  created_at: string;
  approved_at: string | null;
  rating_avg?: number;
  review_count?: number;
  completed_deals?: number;
}

export type TransactionType = 'Satılık' | 'Kiralık';
export type PropertyType =
  | 'Daire'
  | 'Villa'
  | 'Müstakil Ev'
  | 'Residence'
  | 'Arsa'
  | 'İşyeri / Ofis';

export type RequestStatus = 'active' | 'matched' | 'closed';

export interface BuyerRequest {
  id: number;
  agent_id: number;
  title: string;
  transaction_type: TransactionType;
  property_type: PropertyType;
  city: string;
  district: string;
  neighborhood: string;
  budget_min: number;
  budget_max: number;
  room_count: string;
  min_sqm: number;
  building_age: string;
  floor_pref: string;
  credit_suitable: boolean;
  features: string[];
  buyer_note: string;
  contact_phone: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Joined agent details
  agent_name?: string;
  agent_office?: string;
  agent_city?: string;
  agent_myk_number?: string;
  agent_avatar?: string;
  agent_rating_avg?: number;
  agent_review_count?: number;
  agent_completed_deals?: number;
  match_count?: number;
  already_contacted?: boolean;
  owner_reviewed_by_me?: boolean;
  my_review_for_owner?: number | null;
}

export interface ContactMatch {
  id: number;
  request_id: number;
  sender_agent_id: number;
  message: string;
  portfolio_ref: string;
  sender_phone: string;
  created_at: string;
  sender_name?: string;
  sender_office?: string;
  sender_city?: string;
  sender_myk_number?: string;
  sender_avatar?: string;
  sender_rating_avg?: number;
  sender_review_count?: number;
  sender_completed_deals?: number;
  request_title?: string;
  request_city?: string;
  request_district?: string;
  request_neighborhood?: string;
  request_budget_max?: number;
  request_status?: RequestStatus;
  request_agent_id?: number;
  request_agent_name?: string;
  request_agent_phone?: string;
  request_agent_rating_avg?: number;
  request_agent_review_count?: number;
  request_agent_completed_deals?: number;
  my_given_rating?: number | null;
}

export type RequestSortOption = 'newest' | 'budget_desc' | 'budget_asc';

export interface RequestFilters {
  city: string;
  district: string;
  neighborhood: string;
  neighborhoods?: string[];
  transaction_type: string;
  property_type: string;
  room_count: string;
  min_budget: string;
  max_budget: string;
  credit_only?: boolean;
  sort_by?: RequestSortOption;
  q: string;
  only_mine?: boolean;
}

export interface PublicSummary {
  totalApprovedAgents: number;
  totalActiveRequests: number;
  totalMatches: number;
  topCities: { city: string; count: number }[];
  recentPreview: {
    id: number;
    title: string;
    transaction_type: TransactionType;
    property_type: PropertyType;
    city: string;
    district: string;
    neighborhood: string;
    budget_min: number;
    budget_max: number;
    room_count: string;
    min_sqm: number;
    created_at: string;
  }[];
}

export interface AdminUserRow extends AgentUser {
  request_count?: number;
  match_count?: number;
}

export interface PublicPlatformConfig {
  platform_announcement: string;
  allow_registrations: boolean;
  support_phone: string;
}

export interface PlatformSettings extends PublicPlatformConfig {
  auto_approve_myk: boolean;
}

export interface AdminSessionRow {
  session_id: number;
  user_id: number;
  full_name: string;
  email: string;
  office_name: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface AdminAuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface AdminOverview {
  users: {
    total: number;
    admins: number;
    agents: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  requests: {
    total: number;
    active: number;
    matched: number;
    closed: number;
    for_sale: number;
    for_rent: number;
    active_sale_volume: number;
  };
  totalMatches: number;
  activeSessions: number;
  cachedLocations: number;
  topCities: { city: string; request_count: number }[];
  recentLogs: AdminAuditLog[];
  settings: PlatformSettings;
}

export interface PreRequest {
  id: number;
  full_name: string;
  email: string;
  address: string;
  created_at: string;
}
