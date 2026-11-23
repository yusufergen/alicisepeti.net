import type {
  AdminAuditLog,
  AdminOverview,
  AdminSessionRow,
  AdminUserRow,
  AgentReview,
  AgentTrustSummary,
  AgentUser,
  BuyerRequest,
  ContactMatch,
  PlatformSettings,
  PublicPlatformConfig,
  PublicSummary,
  RequestStatus,
  UserRole,
  UserStatus,
} from '../types';

const TOKEN_KEY = 'talepagi_token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `İstek başarısız (${res.status})`);
  }
  return data as T;
}

export const api = {
  getPublicSummary: () => apiFetch<PublicSummary>('/api/public/summary'),

  getPublicConfig: () => apiFetch<PublicPlatformConfig>('/api/public/config'),

  login: async (identifier: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AgentUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(res.token);
    return res.user;
  },

  register: async (formData: FormData) => {
    const res = await apiFetch<{ token: string; user: AgentUser }>('/api/auth/register', {
      method: 'POST',
      body: formData,
    });
    setStoredToken(res.token);
    return res.user;
  },

  logout: async () => {
    await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setStoredToken(null);
  },

  me: () => apiFetch<{ user: AgentUser }>('/api/auth/me'),

  updateProfile: (payload: {
    phone: string;
    office_name: string;
    city: string;
    district: string;
    ttbs_number: string;
    bio: string;
  }) =>
    apiFetch<{ user: AgentUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  reuploadMyk: (formData: FormData) =>
    apiFetch<{ user: AgentUser }>('/api/auth/reupload-myk', {
      method: 'POST',
      body: formData,
    }),

  uploadAvatar: (formData: FormData) =>
    apiFetch<{ user: AgentUser }>('/api/auth/avatar', {
      method: 'POST',
      body: formData,
    }),

  getProvinces: () => apiFetch<{ provinces: string[] }>('/api/locations/provinces'),

  getDistricts: (city: string) =>
    apiFetch<{ districts: string[] }>(
      `/api/locations/districts?city=${encodeURIComponent(city)}`
    ),

  getNeighborhoods: (city: string, district: string) =>
    apiFetch<{ neighborhoods: string[]; source?: string }>(
      `/api/locations/neighborhoods?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`
    ),

  getRequests: (params?: { only_mine?: boolean; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.only_mine) qs.set('only_mine', '1');
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return apiFetch<{ requests: BuyerRequest[] }>(`/api/requests${query ? `?${query}` : ''}`);
  },

  getRequestDetail: (id: number) =>
    apiFetch<{ request: BuyerRequest; matches: ContactMatch[] }>(`/api/requests/${id}`),

  createRequest: (payload: {
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
    building_age: string;
    floor_pref: string;
    credit_suitable: boolean;
    features: string[];
    buyer_note: string;
    contact_phone: string;
  }) =>
    apiFetch<{ request: BuyerRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRequest: (
    id: number,
    payload: {
      status?: 'active' | 'matched' | 'closed';
      buyer_note?: string;
      budget_min?: number;
      budget_max?: number;
    }
  ) =>
    apiFetch<{ request: BuyerRequest }>(`/api/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteRequest: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/requests/${id}`, { method: 'DELETE' }),

  createMatch: (requestId: number, payload: { message: string; portfolio_ref: string }) =>
    apiFetch<{ match: ContactMatch; target_phone: string }>(
      `/api/requests/${requestId}/matches`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getMyMatches: () =>
    apiFetch<{ incoming: ContactMatch[]; outgoing: ContactMatch[] }>('/api/my-matches'),

  createReview: (payload: {
    request_id: number;
    target_agent_id: number;
    rating: number;
    comment: string;
    deal_closed: boolean;
  }) =>
    apiFetch<{ review: AgentReview; target_summary: AgentTrustSummary }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAgentReviews: (agentId: number) =>
    apiFetch<{
      agent: Pick<
        AgentUser,
        'id' | 'full_name' | 'office_name' | 'city' | 'district' | 'avatar_path' | 'myk_number'
      >;
      summary: AgentTrustSummary;
      reviews: AgentReview[];
    }>(`/api/agents/${agentId}/reviews`),

  getMyReviews: () =>
    apiFetch<{
      summary: AgentTrustSummary;
      received: AgentReview[];
      given: AgentReview[];
    }>('/api/my-reviews'),

  getAdminAgents: (status = 'all') =>
    apiFetch<{ agents: AgentUser[] }>(`/api/admin/agents?status=${encodeURIComponent(status)}`),

  updateAgentStatus: (
    agentId: number,
    payload: { status: 'approved' | 'rejected' | 'pending'; rejection_reason?: string }
  ) =>
    apiFetch<{ agent: AgentUser }>(`/api/admin/agents/${agentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Super Admin Control Center
  getAdminOverview: () => apiFetch<AdminOverview>('/api/admin/overview'),

  getAdminUsers: () => apiFetch<{ users: AdminUserRow[] }>('/api/admin/users'),

  createAdminUser: (payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    office_name: string;
    city: string;
    district: string;
    myk_number: string;
    ttbs_number: string;
    bio: string;
    role: UserRole;
    status: UserStatus;
  }) =>
    apiFetch<{ user: AdminUserRow }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminUser: (
    id: number,
    payload: Partial<{
      full_name: string;
      email: string;
      phone: string;
      office_name: string;
      city: string;
      district: string;
      myk_number: string;
      ttbs_number: string;
      bio: string;
      role: UserRole;
      status: UserStatus;
      rejection_reason: string;
      new_password: string;
    }>
  ) =>
    apiFetch<{ user: AdminUserRow }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAdminUser: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  getAdminRequests: () => apiFetch<{ requests: BuyerRequest[] }>('/api/admin/requests'),

  updateAdminRequest: (
    id: number,
    payload: Partial<{
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
      credit_suitable: boolean;
      buyer_note: string;
      contact_phone: string;
      status: RequestStatus;
    }>
  ) =>
    apiFetch<{ request: BuyerRequest }>(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAdminRequest: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/requests/${id}`, { method: 'DELETE' }),

  getAdminMatches: () => apiFetch<{ matches: ContactMatch[] }>('/api/admin/matches'),

  deleteAdminMatch: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/matches/${id}`, { method: 'DELETE' }),

  getAdminSessions: () => apiFetch<{ sessions: AdminSessionRow[] }>('/api/admin/sessions'),

  revokeAdminSession: (sessionId: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' }),

  revokeOtherAdminSessions: () =>
    apiFetch<{ ok: boolean; revoked: number }>('/api/admin/sessions/revoke-others', {
      method: 'POST',
    }),

  getAdminSettings: () => apiFetch<{ settings: PlatformSettings }>('/api/admin/settings'),

  updateAdminSettings: (payload: Partial<PlatformSettings>) =>
    apiFetch<{ settings: PlatformSettings }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getAdminAuditLogs: () => apiFetch<{ logs: AdminAuditLog[] }>('/api/admin/audit-logs'),

  clearLocationsCache: () =>
    apiFetch<{ ok: boolean; cleared: number }>('/api/admin/locations-cache', {
      method: 'DELETE',
    }),

  getAdminReviews: () => apiFetch<{ reviews: AgentReview[] }>('/api/admin/reviews'),

  deleteAdminReview: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
};

export function getProtectedDocUrl(docPath: string): string {
  const token = getStoredToken();
  if (!token) return docPath;
  const separator = docPath.includes('?') ? '&' : '?';
  return `${docPath}${separator}token=${encodeURIComponent(token)}`;
}

