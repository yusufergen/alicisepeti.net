import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  Handshake,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentAvatar } from '../components/AgentAvatar';
import { TrustBadge } from '../components/TrustBadge';
import {
  AdminMykInspectModal,
  AdminRequestModal,
  AdminUserModal,
} from '../components/admin/AdminModals';
import type {
  AdminAuditLog,
  AdminOverview,
  AdminSessionRow,
  AdminUserRow,
  AgentReview,
  BuyerRequest,
  ContactMatch,
  PlatformSettings,
  RequestStatus,
} from '../types';
import {
  filterAdminRequests,
  filterAdminUsers,
  formatBudgetRange,
  formatCurrencyTRY,
  formatRelativeDateTR,
} from '../utils/domain';

type AdminTab = 'overview' | 'users' | 'requests' | 'matches' | 'reviews' | 'sessions' | 'settings';

interface SuperAdminPageProps {
  currentUserId: number;
  onConfigChanged?: () => void;
}

export function SuperAdminPage({ currentUserId, onConfigChanged }: SuperAdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Datasets
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_announcement: '',
    auto_approve_myk: false,
    allow_registrations: true,
    support_phone: '0850 300 00 00',
  });

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'agent' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | 'active' | 'matched' | 'closed'>(
    'all'
  );
  const [reqTxFilter, setReqTxFilter] = useState<'all' | 'Satılık' | 'Kiralık'>('all');
  const [reqCityFilter, setReqCityFilter] = useState('all');

  const [matchSearch, setMatchSearch] = useState('');

  // Modals & Inline Confirmation states (no window.confirm)
  const [userModalState, setUserModalState] = useState<{
    mode: 'create' | 'edit';
    user: AdminUserRow | null;
  } | null>(null);
  const [inspectingUser, setInspectingUser] = useState<AdminUserRow | null>(null);
  const [editingRequest, setEditingRequest] = useState<BuyerRequest | null>(null);

  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const [confirmDeleteRequestId, setConfirmDeleteRequestId] = useState<number | null>(null);
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<number | null>(null);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<number | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, usr, reqs, mtc, rev, ses, logs, st] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminRequests(),
        api.getAdminMatches(),
        api.getAdminReviews(),
        api.getAdminSessions(),
        api.getAdminAuditLogs(),
        api.getAdminSettings(),
      ]);
      setOverview(ov);
      setUsers(usr.users);
      setRequests(reqs.requests);
      setMatches(mtc.matches);
      setReviews(rev.reviews);
      setSessions(ses.sessions);
      setAuditLogs(logs.logs);
      setSettings(st.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yönetim verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshAuditAndOverview = async () => {
    try {
      const [ov, logs] = await Promise.all([api.getAdminOverview(), api.getAdminAuditLogs()]);
      setOverview(ov);
      setAuditLogs(logs.logs);
    } catch {
      // ignore silent refresh failures
    }
  };

  const filteredUsers = useMemo(
    () =>
      filterAdminUsers(users, {
        q: userSearch,
        status: userStatusFilter,
        role: userRoleFilter,
      }),
    [users, userSearch, userStatusFilter, userRoleFilter]
  );

  const availableRequestCities = useMemo(() => {
    const set = new Set(requests.map((r) => r.city).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [requests]);

  const filteredRequests = useMemo(
    () =>
      filterAdminRequests(requests, {
        q: reqSearch,
        status: reqStatusFilter,
        transaction_type: reqTxFilter,
        city: reqCityFilter,
      }),
    [requests, reqSearch, reqStatusFilter, reqTxFilter, reqCityFilter]
  );

  const filteredMatches = useMemo(() => {
    const q = matchSearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return matches;
    return matches.filter((m) =>
      [
        m.sender_name,
        m.sender_office,
        m.sender_phone,
        m.request_title,
        m.request_agent_name,
        m.portfolio_ref,
        m.message,
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(q)
    );
  }, [matches, matchSearch]);

  const pendingUsers = useMemo(() => users.filter((u) => u.status === 'pending'), [users]);

  const handleMykDecision = async (
    agentId: number,
    decision: 'approved' | 'rejected',
    reason = ''
  ) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.updateAgentStatus(agentId, {
        status: decision,
        rejection_reason: reason,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === agentId
            ? { ...res.agent, request_count: u.request_count, match_count: u.match_count }
            : u
        )
      );
      setInspectingUser(null);
      showToast(
        decision === 'approved' ? 'Emlakçı MYK ön onayı verildi.' : 'Başvuru reddedildi.'
      );
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MYK durumu güncellenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setActionLoading(true);
    setError('');
    try {
      await api.deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setRequests((prev) => prev.filter((r) => r.agent_id !== userId));
      setConfirmDeleteUserId(null);
      showToast('Kullanıcı ve bağlı kayıtları kalıcı olarak silindi.');
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı silinemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInlineRequestStatus = async (reqId: number, nextStatus: RequestStatus) => {
    setError('');
    try {
      const res = await api.updateAdminRequest(reqId, { status: nextStatus });
      setRequests((prev) => prev.map((r) => (r.id === reqId ? res.request : r)));
      showToast(`Talep #${reqId} durumu güncellendi.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Talep durumu güncellenemedi.');
    }
  };

  const handleDeleteRequest = async (reqId: number) => {
    setActionLoading(true);
    setError('');
    try {
      await api.deleteAdminRequest(reqId);
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      setMatches((prev) => prev.filter((m) => m.request_id !== reqId));
      setConfirmDeleteRequestId(null);
      showToast(`Talep #${reqId} silindi.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alıcı talebi silinemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    setActionLoading(true);
    setError('');
    try {
      await api.deleteAdminMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setConfirmDeleteMatchId(null);
      showToast(`Eşleşme #${matchId} silindi.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eşleşme kaydı silinemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    setActionLoading(true);
    setError('');
    try {
      await api.deleteAdminReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setConfirmDeleteReviewId(null);
      showToast(`Değerlendirme #${reviewId} silindi.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Değerlendirme silinemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    setActionLoading(true);
    setError('');
    try {
      await api.revokeAdminSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      showToast('Oturum sonlandırıldı.');
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oturum sonlandırılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.revokeOtherAdminSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      setConfirmRevokeAll(false);
      showToast(`${res.revoked} aktif oturum kapatıldı.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oturumlar kapatılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    try {
      const res = await api.updateAdminSettings(settings);
      setSettings(res.settings);
      showToast('Sistem ayarları kaydedildi ve anlık olarak devreye alındı.');
      onConfigChanged?.();
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sistem ayarları kaydedilemedi.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearLocationsCache = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.clearLocationsCache();
      showToast(`${res.cleared} ilçeye ait mahalle önbelleği temizlendi.`);
      refreshAuditAndOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Önbellek temizlenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { id: AdminTab; label: string; count?: number; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: Activity },
    { id: 'users', label: 'Kullanıcılar & MYK', count: users.length, icon: Users },
    { id: 'requests', label: 'Tüm Talepler', count: requests.length, icon: ClipboardList },
    { id: 'matches', label: 'Eşleşmeler', count: matches.length, icon: Handshake },
    { id: 'reviews', label: 'Güven Puanları', count: reviews.length, icon: Award },
    { id: 'sessions', label: 'Oturumlar & Kayıtlar', count: sessions.length, icon: KeyRound },
    { id: 'settings', label: 'Sistem Ayarları', icon: Settings },
  ];

  const maxCityCount = useMemo(() => {
    if (!overview?.topCities.length) return 1;
    return Math.max(...overview.topCities.map((c) => c.request_count), 1);
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Control Center Header & Tab Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-300 uppercase tracking-wider">
              AlıcıSepeti Süper Admin Kontrol Merkezi
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold mt-1">
              Tüm Platform, Kullanıcılar, Talepler ve Sistem Ayarları
            </h2>
          </div>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Verileri Yenile</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-800 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-center justify-between gap-3"
        >
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
          Süper Admin kontrol verileri yükleniyor...
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Toplam Üye / MYK</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
                    {overview.users.total}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {overview.users.approved} onaylı · {overview.users.pending} bekleyen ·{' '}
                    {overview.users.admins} yönetici
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Alıcı Talepleri</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
                    {overview.requests.total}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {overview.requests.active} aktif · {overview.requests.matched} eşleşti ·{' '}
                    {overview.requests.closed} kapalı
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Aktif Satılık Talep Hacmi</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-blue-700 tabular-nums">
                    {formatCurrencyTRY(overview.requests.active_sale_volume)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {overview.requests.for_sale} Satılık · {overview.requests.for_rent} Kiralık
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Eşleşmeler ve Oturumlar</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-emerald-700 tabular-nums">
                    {overview.totalMatches}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {overview.activeSessions} aktif oturum · {overview.cachedLocations} ilçe önbelleği
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Cities Breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      İllere Göre Talep Yoğunluğu
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('requests')}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Tüm Talepleri Yönet
                    </button>
                  </div>
                  {overview.topCities.length === 0 ? (
                    <p className="text-xs text-slate-500">Henüz talep kaydı bulunmuyor.</p>
                  ) : (
                    <div className="space-y-3">
                      {overview.topCities.map((c) => {
                        const pct = Math.max(8, Math.round((c.request_count / maxCityCount) * 100));
                        return (
                          <div key={c.city} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-800">{c.city}</span>
                              <span className="font-mono text-slate-600 tabular-nums">
                                {c.request_count} talep
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pending MYK Rapid Approval Queue */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Bekleyen MYK Başvuruları ({pendingUsers.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setUserStatusFilter('pending');
                        setActiveTab('users');
                      }}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Kullanıcı Listesinde Aç
                    </button>
                  </div>
                  {pendingUsers.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Onay bekleyen yeni MYK başvurusu bulunmuyor.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {pendingUsers.slice(0, 5).map((u) => (
                        <div
                          key={u.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AgentAvatar name={u.full_name} avatarPath={u.avatar_path} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {u.full_name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {u.office_name} · {u.city}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInspectingUser(u)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md"
                            >
                              İncele
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleMykDecision(u.id, 'approved')}
                              className="px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                            >
                              Onayla
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Audit Logs */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Son Yönetici İşlemleri
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Tüm Kayıtları Gör
                  </button>
                </div>
                {overview.recentLogs.length === 0 ? (
                  <p className="p-5 text-xs text-slate-500">Henüz kayıtlı yönetici işlemi yok.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-2.5 px-4">Yönetici</th>
                          <th className="py-2.5 px-4">İşlem</th>
                          <th className="py-2.5 px-4">Detay</th>
                          <th className="py-2.5 px-4 text-right">Zaman</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {overview.recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {log.admin_name}
                            </td>
                            <td className="py-2.5 px-4 text-blue-800 font-medium">{log.action}</td>
                            <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
                            <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums whitespace-nowrap">
                              {formatRelativeDateTR(log.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: USERS & MYK FULL CRUD */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Ad, ofis, e-posta, il, telefon..."
                      className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <select
                    aria-label="Rol filtresi"
                    value={userRoleFilter}
                    onChange={(e) =>
                      setUserRoleFilter(e.target.value as 'all' | 'agent' | 'admin')
                    }
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="all">Tüm Roller</option>
                    <option value="agent">Danışmanlar</option>
                    <option value="admin">Süper Adminler</option>
                  </select>

                  <select
                    aria-label="MYK durum filtresi"
                    value={userStatusFilter}
                    onChange={(e) =>
                      setUserStatusFilter(
                        e.target.value as 'all' | 'pending' | 'approved' | 'rejected'
                      )
                    }
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Onay Bekleyen ({pendingUsers.length})</option>
                    <option value="approved">Onaylı</option>
                    <option value="rejected">Reddedilen</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setUserModalState({ mode: 'create', user: null })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Yeni Kullanıcı Ekle</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-4">Kullanıcı / Ofis</th>
                        <th className="py-3 px-4">İletişim / Konum</th>
                        <th className="py-3 px-4">Rol & Durum</th>
                        <th className="py-3 px-4 text-center">Aktivite</th>
                        <th className="py-3 px-4 text-right">Yönetim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Filtreye uygun kullanıcı bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const statusColor =
                            u.status === 'approved'
                              ? 'text-emerald-700'
                              : u.status === 'rejected'
                                ? 'text-red-700'
                                : 'text-amber-700';
                          const statusLabel =
                            u.status === 'approved'
                              ? 'Onaylı'
                              : u.status === 'rejected'
                                ? 'Reddedildi'
                                : 'Bekliyor';

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/70">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <AgentAvatar
                                    name={u.full_name}
                                    avatarPath={u.avatar_path}
                                    size="sm"
                                  />
                                  <div>
                                    <p className="font-semibold text-slate-900">{u.full_name}</p>
                                    <p className="text-slate-500">
                                      {u.office_name} · {u.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-mono text-slate-800 tabular-nums whitespace-nowrap">
                                  {u.phone}
                                </p>
                                <p className="text-slate-500">
                                  {u.city}
                                  {u.district ? ` / ${u.district}` : ''}
                                </p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-medium text-slate-900">
                                  {u.role === 'admin' ? 'Süper Admin' : 'Danışman'}
                                </p>
                                <p className={`font-semibold ${statusColor}`}>
                                  {statusLabel}
                                  {u.myk_number ? ` · ${u.myk_number}` : ''}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-700 tabular-nums whitespace-nowrap">
                                <p>
                                  {u.request_count || 0} talep · {u.match_count || 0} eşleşme
                                </p>
                                {(u.review_count || 0) > 0 && (
                                  <div className="mt-1 flex justify-center">
                                    <TrustBadge
                                      compact
                                      ratingAvg={u.rating_avg}
                                      reviewCount={u.review_count}
                                      completedDeals={u.completed_deals}
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingUser(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-md"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>MYK</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUserModalState({ mode: 'edit', user: u })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Düzenle</span>
                                  </button>
                                  {u.status !== 'approved' && (
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() => handleMykDecision(u.id, 'approved')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Onayla</span>
                                    </button>
                                  )}
                                  {u.id !== currentUserId &&
                                    (confirmDeleteUserId === u.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={actionLoading}
                                          onClick={() => handleDeleteUser(u.id)}
                                          className="px-2.5 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                                        >
                                          Silmeyi Onayla
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteUserId(null)}
                                          className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                                        >
                                          İptal
                                        </button>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteUserId(u.id)}
                                        aria-label={`${u.full_name} kullanıcısını sil`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Sil</span>
                                      </button>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALL BUYER REQUESTS FULL CRUD */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reqSearch}
                    onChange={(e) => setReqSearch(e.target.value)}
                    placeholder="Başlık, konum, not, danışman ara..."
                    className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <select
                  aria-label="Talep ili"
                  value={reqCityFilter}
                  onChange={(e) => setReqCityFilter(e.target.value)}
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="all">Tüm İller</option>
                  {availableRequestCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="İşlem türü"
                  value={reqTxFilter}
                  onChange={(e) =>
                    setReqTxFilter(e.target.value as 'all' | 'Satılık' | 'Kiralık')
                  }
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="all">Satılık + Kiralık</option>
                  <option value="Satılık">Satılık</option>
                  <option value="Kiralık">Kiralık</option>
                </select>

                <select
                  aria-label="Talep durumu"
                  value={reqStatusFilter}
                  onChange={(e) =>
                    setReqStatusFilter(
                      e.target.value as 'all' | 'active' | 'matched' | 'closed'
                    )
                  }
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="matched">Eşleşti</option>
                  <option value="closed">Kapatıldı</option>
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-4">Talep & Konum</th>
                        <th className="py-3 px-4">Bütçe & Özellik</th>
                        <th className="py-3 px-4">Danışman</th>
                        <th className="py-3 px-4">Durum</th>
                        <th className="py-3 px-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Seçili filtrelere uygun alıcı talebi bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="font-semibold text-slate-900 truncate">
                                #{r.id} · {r.title}
                              </p>
                              <p className="text-slate-500 mt-0.5">
                                {r.city} / {r.district} / {r.neighborhood}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-semibold text-slate-900 tabular-nums">
                                {formatBudgetRange(r.budget_min, r.budget_max)}
                              </p>
                              <p className="text-slate-500 tabular-nums">
                                {r.transaction_type} · {r.property_type} · {r.room_count} ·{' '}
                                {r.min_sqm} m²+
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-slate-900">{r.agent_name}</p>
                              <p className="font-mono text-slate-500 tabular-nums">
                                {r.contact_phone} · {r.match_count || 0} dönüş
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                aria-label={`Talep #${r.id} durumu`}
                                value={r.status}
                                onChange={(e) =>
                                  handleInlineRequestStatus(r.id, e.target.value as RequestStatus)
                                }
                                className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-medium"
                              >
                                <option value="active">Aktif</option>
                                <option value="matched">Eşleşti</option>
                                <option value="closed">Kapatıldı</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingRequest(r)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Düzenle</span>
                                </button>
                                {confirmDeleteRequestId === r.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() => handleDeleteRequest(r.id)}
                                      className="px-2.5 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                                    >
                                      Sil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRequestId(null)}
                                      className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                                    >
                                      İptal
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRequestId(r.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Sil</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATCHES */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                    placeholder="Gönderen danışman, talep, portföy no ara..."
                    className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  Toplam {filteredMatches.length} eşleşme kaydı
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-4">Portföy Sunan Danışman</th>
                        <th className="py-3 px-4">Hedef Alıcı Talebi</th>
                        <th className="py-3 px-4">Portföy Ref & Mesaj</th>
                        <th className="py-3 px-4">Tarih</th>
                        <th className="py-3 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredMatches.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Eşleşme kaydı bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredMatches.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/70">
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-slate-900">{m.sender_name}</p>
                              <p className="text-slate-500 font-mono tabular-nums">
                                {m.sender_phone} · {m.sender_office}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-slate-900">{m.request_title}</p>
                              <p className="text-slate-500">
                                {m.request_agent_name} · {m.request_city} / {m.request_district}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="font-mono text-blue-700 font-medium">
                                {m.portfolio_ref || 'Ref Yok'}
                              </p>
                              <p className="text-slate-600 line-clamp-2">{m.message}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                              {formatRelativeDateTR(m.created_at)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {confirmDeleteMatchId === m.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleDeleteMatch(m.id)}
                                    className="px-2.5 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteMatchId(null)}
                                    className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                                  >
                                    İptal
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMatchId(m.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Sil</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4.5: TRUST REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Danışman Güven Puanları ve Yorum Moderasyonu ({reviews.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tamamlanan işlemler sonrası verilen tüm puan ve yorumları denetleyebilirsiniz.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="py-3 px-4">Değerlendiren</th>
                      <th className="py-3 px-4">Puanlanan Danışman</th>
                      <th className="py-3 px-4">Puan & Yorum</th>
                      <th className="py-3 px-4">İlgili Talep</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Henüz kayıtlı değerlendirme bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      reviews.map((rev) => (
                        <tr key={rev.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{rev.reviewer_name}</p>
                            <p className="text-slate-500">{rev.reviewer_office}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{rev.target_name}</p>
                            <p className="text-slate-500">{rev.target_office}</p>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-700 tabular-nums">
                                <Star
                                  className="w-3.5 h-3.5 fill-amber-400 text-amber-500"
                                  aria-hidden="true"
                                />
                                {rev.rating}/5
                              </span>
                              {rev.deal_closed && (
                                <span className="text-[11px] font-medium text-emerald-700">
                                  · İşlem Kapandı
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 line-clamp-2">
                              {rev.comment || 'Yorumsuz yıldız değerlendirmesi'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-800">{rev.request_title}</p>
                            <p className="text-slate-500 tabular-nums">
                              {rev.request_city} / {rev.request_district} ·{' '}
                              {formatRelativeDateTR(rev.created_at)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {confirmDeleteReviewId === rev.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="px-2.5 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                                >
                                  Sil
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteReviewId(null)}
                                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                                >
                                  İptal
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteReviewId(rev.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Sil</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SESSIONS & AUDIT LOGS */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Aktif Kullanıcı Oturumları ({sessions.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      İstediğiniz oturumu anında sonlandırabilir veya güvenlik için tüm diğer
                      oturumları kapatabilirsiniz.
                    </p>
                  </div>
                  {sessions.filter((s) => !s.is_current).length > 0 &&
                    (confirmRevokeAll ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleRevokeOtherSessions}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                          Evet, Diğerlerini Kapat
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeAll(false)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeAll(true)}
                        className="px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg whitespace-nowrap shrink-0"
                      >
                        Diğer Tüm Oturumları Kapat
                      </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-3 px-4">Kullanıcı</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Açılış</th>
                        <th className="py-3 px-4">Bitiş</th>
                        <th className="py-3 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sessions.map((s) => (
                        <tr key={s.session_id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">
                              {s.full_name}{' '}
                              {s.is_current && (
                                <span className="text-emerald-700 font-medium">(Bu Oturum)</span>
                              )}
                            </p>
                            <p className="text-slate-500">
                              {s.office_name} · {s.email}
                            </p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {s.role === 'admin' ? 'Süper Admin' : 'Danışman'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">
                            {formatRelativeDateTR(s.created_at)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">
                            {new Date(s.expires_at).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {s.is_current ? (
                              <span className="text-slate-400">Aktif</span>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRevokeSession(s.session_id)}
                                className="px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                              >
                                Sonlandır
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Yönetici İşlem Geçmişi (Audit Log · {auditLogs.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-4">ID</th>
                        <th className="py-2.5 px-4">Yönetici</th>
                        <th className="py-2.5 px-4">İşlem</th>
                        <th className="py-2.5 px-4">Hedef</th>
                        <th className="py-2.5 px-4">Detay</th>
                        <th className="py-2.5 px-4 text-right">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Henüz işlem kaydı oluşmadı.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                              #{log.id}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {log.admin_name}
                            </td>
                            <td className="py-2.5 px-4 text-blue-800 font-medium">{log.action}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {log.target_type}:{log.target_id}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">{log.details}</td>
                            <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums whitespace-nowrap">
                              {formatRelativeDateTR(log.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM SETTINGS & CACHE */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSaveSettings}
                className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
              >
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Global Platform Ayarları
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bu ayarlar tüm üyelerin gördüğü paneli ve kayıt akışını gerçek zamanlı olarak
                    yönetir.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="set-announcement"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Global Panel Duyuru Bandı (Boş bırakılırsa gizlenir)
                  </label>
                  <input
                    id="set-announcement"
                    type="text"
                    value={settings.platform_announcement}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        platform_announcement: e.target.value,
                      }))
                    }
                    placeholder="Örn: Hafta sonu İstanbul Kadıköy bölgesinde toplu portföy eşleştirme buluşması!"
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="set-support-phone"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Yönetim & Destek Hattı Telefonu
                  </label>
                  <input
                    id="set-support-phone"
                    type="text"
                    value={settings.support_phone}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, support_phone: e.target.value }))
                    }
                    className="w-full h-10 px-3 font-mono text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <label className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.allow_registrations}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          allow_registrations: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Yeni Emlakçı Kayıtlarına İzin Ver
                      </p>
                      <p className="text-xs text-slate-500">
                        Kapatıldığında /kayit ekranından yeni başvuru alımı durdurulur.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.auto_approve_myk}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          auto_approve_myk: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        MYK Belgesi Yükleyen Emlakçıları Otomatik Ön Onayla
                      </p>
                      <p className="text-xs text-slate-500">
                        Açık olduğunda MYK belgesini yükleyen yeni üyeler yönetici onayı beklemeden
                        anında aktif olur.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-blue-700" />
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Konum API & Önbellek
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  81 il, tüm ilçeler ve mahalleler TurkiyeAPI üzerinden çekilip SQLite üzerinde
                  önbelleklenir. Güncel mahalle listesini yeniden çekmek için önbelleği
                  temizleyebilirsiniz.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500">Önbellekteki İlçe Sayısı:</span>{' '}
                  <strong className="font-mono text-slate-900 tabular-nums">
                    {overview?.cachedLocations ?? 0}
                  </strong>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleClearLocationsCache}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Mahalle Önbelleğini Temizle</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {userModalState && (
        <AdminUserModal
          mode={userModalState.mode}
          initialUser={userModalState.user}
          currentUserId={currentUserId}
          onClose={() => setUserModalState(null)}
          onSaved={(saved) => {
            if (userModalState.mode === 'create') {
              setUsers((prev) => [saved, ...prev]);
              showToast(`${saved.full_name} başarıyla oluşturuldu.`);
            } else {
              setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
              showToast(`${saved.full_name} bilgileri güncellendi.`);
            }
            setUserModalState(null);
            refreshAuditAndOverview();
          }}
        />
      )}

      {inspectingUser && (
        <AdminMykInspectModal
          agent={inspectingUser}
          actionLoading={actionLoading}
          onClose={() => setInspectingUser(null)}
          onDecision={handleMykDecision}
        />
      )}

      {editingRequest && (
        <AdminRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSaved={(updated) => {
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditingRequest(null);
            showToast(`Alıcı talebi #${updated.id} güncellendi.`);
            refreshAuditAndOverview();
          }}
        />
      )}
    </div>
  );
}
