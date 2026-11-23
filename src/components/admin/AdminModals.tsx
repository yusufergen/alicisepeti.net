import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Save, X, XCircle } from 'lucide-react';
import { api, getProtectedDocUrl } from '../../api/client';
import { getDistrictsForCity, TURKEY_PROVINCES } from '../../data/turkeyLocations';
import type {
  AdminUserRow,
  BuyerRequest,
  PropertyType,
  RequestStatus,
  TransactionType,
  UserRole,
  UserStatus,
} from '../../types';
import { PROPERTY_TYPES, ROOM_COUNTS, TRANSACTION_TYPES } from '../../utils/domain';
import { AgentAvatar } from '../AgentAvatar';
import { LocationSelector } from '../LocationSelector';

interface AdminUserModalProps {
  mode: 'create' | 'edit';
  initialUser: AdminUserRow | null;
  currentUserId: number;
  onClose: () => void;
  onSaved: (user: AdminUserRow) => void;
}

export function AdminUserModal({
  mode,
  initialUser,
  currentUserId,
  onClose,
  onSaved,
}: AdminUserModalProps) {
  const [fullName, setFullName] = useState(initialUser?.full_name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [officeName, setOfficeName] = useState(initialUser?.office_name || '');
  const [city, setCity] = useState(initialUser?.city || 'İstanbul');
  const [district, setDistrict] = useState(initialUser?.district || '');
  const [mykNumber, setMykNumber] = useState(initialUser?.myk_number || '');
  const [ttbsNumber, setTtbsNumber] = useState(initialUser?.ttbs_number || '');
  const [bio, setBio] = useState(initialUser?.bio || '');
  const [role, setRole] = useState<UserRole>(initialUser?.role || 'agent');
  const [status, setStatus] = useState<UserStatus>(initialUser?.status || 'approved');
  const [rejectionReason, setRejectionReason] = useState(initialUser?.rejection_reason || '');
  const [password, setPassword] = useState('');

  const [provinces, setProvinces] = useState<string[]>(TURKEY_PROVINCES);
  const [districts, setDistricts] = useState<string[]>(() =>
    getDistrictsForCity(initialUser?.city || 'İstanbul')
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getProvinces()
      .then((res) => {
        if (!cancelled && res.provinces?.length) setProvinces(res.provinces);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    api
      .getDistricts(city)
      .then((res) => {
        if (!cancelled) {
          setDistricts(res.districts?.length ? res.districts : getDistrictsForCity(city));
        }
      })
      .catch(() => {
        if (!cancelled) setDistricts(getDistrictsForCity(city));
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') {
        const res = await api.createAdminUser({
          full_name: fullName,
          email,
          phone,
          password,
          office_name: officeName,
          city,
          district,
          myk_number: mykNumber,
          ttbs_number: ttbsNumber,
          bio,
          role,
          status,
        });
        onSaved(res.user);
      } else if (initialUser) {
        const res = await api.updateAdminUser(initialUser.id, {
          full_name: fullName,
          email,
          phone,
          office_name: officeName,
          city,
          district,
          myk_number: mykNumber,
          ttbs_number: ttbsNumber,
          bio,
          role,
          status,
          rejection_reason: status === 'rejected' ? rejectionReason : '',
          ...(password.trim() ? { new_password: password.trim() } : {}),
        });
        onSaved(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const isEditingSelf = mode === 'edit' && initialUser?.id === currentUserId;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="admin-user-modal-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              {mode === 'create'
                ? 'Yeni Kullanıcı / Emlakçı Oluştur'
                : `Kullanıcıyı Düzenle — ${initialUser?.full_name}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rol, MYK durumu, iletişim bilgileri ve şifre dahil tüm alanları yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="adm-user-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ad Soyad *
              </label>
              <input
                id="adm-user-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-office"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ofis / Kurum Adı *
              </label>
              <input
                id="adm-user-office"
                type="text"
                required
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                E-posta *
              </label>
              <input
                id="adm-user-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-phone"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cep Telefonu *
              </label>
              <input
                id="adm-user-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0532 111 22 33"
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-city"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                İl
              </label>
              <select
                id="adm-user-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setDistrict('');
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-user-district"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                İlçe
              </label>
              <select
                id="adm-user-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                <option value="">Seçilmedi</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-user-myk"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                MYK Belge No
              </label>
              <input
                id="adm-user-myk"
                type="text"
                value={mykNumber}
                onChange={(e) => setMykNumber(e.target.value)}
                className="w-full h-10 px-3 font-mono text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-ttbs"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                TTBS Yetki Belge No
              </label>
              <input
                id="adm-user-ttbs"
                type="text"
                value={ttbsNumber}
                onChange={(e) => setTtbsNumber(e.target.value)}
                className="w-full h-10 px-3 font-mono text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-role"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Sistem Rolü
              </label>
              <select
                id="adm-user-role"
                value={role}
                disabled={isEditingSelf}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:border-blue-700"
              >
                <option value="agent">Emlak Danışmanı (agent)</option>
                <option value="admin">Süper Admin (admin)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-user-status"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                MYK Onay Durumu
              </label>
              <select
                id="adm-user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                <option value="approved">Ön Onaylı (approved)</option>
                <option value="pending">Onay Bekliyor (pending)</option>
                <option value="rejected">Reddedildi (rejected)</option>
              </select>
            </div>
          </div>

          {status === 'rejected' && (
            <div>
              <label
                htmlFor="adm-user-reject-reason"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Reddetme Gerekçesi
              </label>
              <input
                id="adm-user-reject-reason"
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Danışmana gösterilecek gerekçe..."
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="adm-user-password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                {mode === 'create' ? 'Şifre (En az 6 karakter) *' : 'Yeni Şifre Sıfırla (Opsiyonel)'}
              </label>
              <input
                id="adm-user-password"
                type="password"
                required={mode === 'create'}
                minLength={password ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'create' ? 'En az 6 karakter' : 'Değiştirmek için yeni şifre girin'}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="adm-user-bio"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Uzmanlık / Not
              </label>
              <input
                id="adm-user-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{saving ? 'Kaydediliyor...' : mode === 'create' ? 'Kullanıcıyı Oluştur' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AdminMykInspectModalProps {
  agent: AdminUserRow;
  actionLoading: boolean;
  onClose: () => void;
  onDecision: (agentId: number, status: 'approved' | 'rejected', reason?: string) => void;
}

export function AdminMykInspectModal({
  agent,
  actionLoading,
  onClose,
  onDecision,
}: AdminMykInspectModalProps) {
  const [rejectionReason, setRejectionReason] = useState(agent.rejection_reason || '');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="myk-inspect-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AgentAvatar name={agent.full_name} avatarPath={agent.avatar_path} size="md" />
            <div>
              <h2 id="myk-inspect-title" className="font-display text-lg font-semibold text-slate-900">
                MYK Belge İnceleme — {agent.full_name}
              </h2>
              <p className="text-xs text-slate-500">
                {agent.office_name} · {agent.city}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="İnceleme penceresini kapat"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500">MYK Belge Numarası</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {agent.myk_number || 'Belge Yüklendi'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Yetki Belgesi (TTBS)</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {agent.ttbs_number || 'Girilmedi'}
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            {agent.myk_doc_mime.startsWith('image/') ||
            /\.(svg|png|jpg|jpeg|webp)$/i.test(agent.myk_doc_path) ? (
              <img
                src={getProtectedDocUrl(agent.myk_doc_path)}
                alt={`${agent.full_name} MYK Belgesi`}
                referrerPolicy="no-referrer"
                className="w-full max-h-72 object-contain bg-white border border-slate-200 rounded mb-2"
              />
            ) : (
              <div className="h-32 flex flex-col items-center justify-center bg-white border border-slate-200 rounded mb-2">
                <FileText className="w-8 h-8 text-blue-700 mb-1" />
                <span className="text-xs text-slate-600">{agent.myk_doc_name}</span>
              </div>
            )}
            <a
              href={getProtectedDocUrl(agent.myk_doc_path)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Belgeyi Tam Boyut Aç ({agent.myk_doc_name})
            </a>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div>
              <label
                htmlFor="admin-reject-reason"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Reddetme Gerekçesi (Yalnızca reddederken doldurun)
              </label>
              <input
                id="admin-reject-reason"
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Örn: Yüklenen belge okunaklı değil veya MYK belgesi eksik."
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onDecision(agent.id, 'rejected', rejectionReason)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg"
              >
                <XCircle className="w-4 h-4" />
                <span>Reddet</span>
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onDecision(agent.id, 'approved')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>MYK Ön Onayını Ver</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminRequestModalProps {
  request: BuyerRequest;
  onClose: () => void;
  onSaved: (updated: BuyerRequest) => void;
}

export function AdminRequestModal({ request, onClose, onSaved }: AdminRequestModalProps) {
  const [title, setTitle] = useState(request.title);
  const [transactionType, setTransactionType] = useState<TransactionType>(request.transaction_type);
  const [propertyType, setPropertyType] = useState<PropertyType>(request.property_type);
  const [city, setCity] = useState(request.city);
  const [district, setDistrict] = useState(request.district);
  const [neighborhood, setNeighborhood] = useState(request.neighborhood);
  const [roomCount, setRoomCount] = useState(request.room_count);
  const [minSqm, setMinSqm] = useState(String(request.min_sqm || 0));
  const [budgetMin, setBudgetMin] = useState(String(request.budget_min || 0));
  const [budgetMax, setBudgetMax] = useState(String(request.budget_max || 0));
  const [creditSuitable, setCreditSuitable] = useState(request.credit_suitable);
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [contactPhone, setContactPhone] = useState(request.contact_phone);
  const [buyerNote, setBuyerNote] = useState(request.buyer_note);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.updateAdminRequest(request.id, {
        title,
        transaction_type: transactionType,
        property_type: propertyType,
        city,
        district,
        neighborhood,
        room_count: roomCount,
        min_sqm: Number(minSqm || 0),
        budget_min: Number(budgetMin || 0),
        budget_max: Number(budgetMax || 0),
        credit_suitable: creditSuitable,
        status,
        contact_phone: contactPhone,
        buyer_note: buyerNote,
      });
      onSaved(res.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alıcı talebi güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-request-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="admin-request-modal-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Alıcı Talebini Düzenle (#{request.id})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danışman: {request.agent_name} · {request.agent_office}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="adm-req-title"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Talep Başlığı *
            </label>
            <input
              id="adm-req-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>

          <LocationSelector
            mode="form"
            idPrefix="adm-req"
            city={city}
            district={district}
            neighborhood={neighborhood}
            onChange={(next) => {
              setCity(next.city);
              setDistrict(next.district);
              setNeighborhood(next.neighborhood);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="adm-req-tx" className="block text-xs font-medium text-slate-700 mb-1">
                İşlem Türü
              </label>
              <select
                id="adm-req-tx"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-req-prop"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Emlak Tipi
              </label>
              <select
                id="adm-req-prop"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-req-status"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Talep Durumu
              </label>
              <select
                id="adm-req-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="active">Aktif</option>
                <option value="matched">Eşleşti</option>
                <option value="closed">Kapatıldı</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="adm-req-rooms"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Oda Sayısı
              </label>
              <select
                id="adm-req-rooms"
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {ROOM_COUNTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-req-sqm"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Min m²
              </label>
              <input
                id="adm-req-sqm"
                type="number"
                min={0}
                value={minSqm}
                onChange={(e) => setMinSqm(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="adm-req-bmin"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Min Bütçe (TL)
              </label>
              <input
                id="adm-req-bmin"
                type="number"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="adm-req-bmax"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Max Bütçe (TL) *
              </label>
              <input
                id="adm-req-bmax"
                type="number"
                min={1}
                required
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label
                htmlFor="adm-req-phone"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                İletişim Telefonu
              </label>
              <input
                id="adm-req-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={creditSuitable}
                onChange={(e) => setCreditSuitable(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700"
              />
              <span>Krediye uygun portföy aranıyor</span>
            </label>
          </div>

          <div>
            <label
              htmlFor="adm-req-note"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Alıcı Notu
            </label>
            <textarea
              id="adm-req-note"
              rows={3}
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
              className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{saving ? 'Kaydediliyor...' : 'Talebi Güncelle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
