import { useEffect, useState } from 'react';
import { Award, Camera, FileText, ShieldCheck, Star } from 'lucide-react';
import { api, getProtectedDocUrl } from '../api/client';
import { AgentAvatar } from '../components/AgentAvatar';
import { TrustBadge } from '../components/TrustBadge';
import { getDistrictsForCity, TURKEY_PROVINCES } from '../data/turkeyLocations';
import type { AgentReview, AgentTrustSummary, AgentUser } from '../types';
import { computeTrustSummary, formatRelativeDateTR } from '../utils/domain';

interface ProfilePageProps {
  user: AgentUser;
  onUserUpdated: (user: AgentUser) => void;
}

export function ProfilePage({ user, onUserUpdated }: ProfilePageProps) {
  const [phone, setPhone] = useState(user.phone);
  const [officeName, setOfficeName] = useState(user.office_name);
  const [city, setCity] = useState(user.city);
  const [district, setDistrict] = useState(user.district);
  const [ttbsNumber, setTtbsNumber] = useState(user.ttbs_number);
  const [bio, setBio] = useState(user.bio);

  const [provinces, setProvinces] = useState<string[]>(TURKEY_PROVINCES);
  const [districts, setDistricts] = useState<string[]>(() =>
    user.city ? getDistrictsForCity(user.city) : []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const [trustSummary, setTrustSummary] = useState<AgentTrustSummary>(() =>
    computeTrustSummary(user.rating_avg || 0, user.review_count || 0, user.completed_deals || 0)
  );
  const [receivedReviews, setReceivedReviews] = useState<AgentReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getProvinces()
      .then((res) => {
        if (!cancelled && res.provinces?.length > 0) setProvinces(res.provinces);
      })
      .catch(() => {});
    api
      .getMyReviews()
      .then((res) => {
        if (!cancelled) {
          setTrustSummary(res.summary);
          setReceivedReviews(res.received);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
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
          setDistricts(res.districts?.length > 0 ? res.districts : getDistrictsForCity(city));
        }
      })
      .catch(() => {
        if (!cancelled) setDistricts(getDistrictsForCity(city));
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const docUrl = getProtectedDocUrl(user.myk_doc_path);
  const isImageDoc =
    user.myk_doc_mime.startsWith('image/') || /\.(svg|png|jpg|jpeg|webp)$/i.test(user.myk_doc_path);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.updateProfile({
        phone,
        office_name: officeName,
        city,
        district,
        ttbs_number: ttbsNumber,
        bio,
      });
      onUserUpdated(res.user);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError('');
    setAvatarMsg('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.uploadAvatar(fd);
      onUserUpdated(res.user);
      setAvatarMsg('Profil fotoğrafınız güncellendi.');
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="pb-4 border-b border-slate-200">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Danışman ve Ofis Bilgileri
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Alıcı taleplerinde meslektaşlarınızın göreceği iletişim bilgilerinizi güncelleyin.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}
        {saved && (
          <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
            Profil bilgileriniz kaydedildi.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-slate-500 mb-1">
              Ad Soyad
            </label>
            <input
              id="prof-name"
              type="text"
              disabled
              value={user.full_name}
              className="w-full h-10 px-3 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
            />
          </div>
          <div>
            <label htmlFor="prof-email" className="block text-xs font-medium text-slate-500 mb-1">
              E-posta
            </label>
            <input
              id="prof-email"
              type="text"
              disabled
              value={user.email}
              className="w-full h-10 px-3 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-medium text-slate-700 mb-1">
              Cep Telefonu
            </label>
            <input
              id="prof-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700"
            />
          </div>
          <div>
            <label htmlFor="prof-office" className="block text-xs font-medium text-slate-700 mb-1">
              Emlak Ofisi
            </label>
            <input
              id="prof-office"
              type="text"
              required
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-city" className="block text-xs font-medium text-slate-700 mb-1">
              İl
            </label>
            <select
              id="prof-city"
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
              htmlFor="prof-district"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              İlçe
            </label>
            <select
              id="prof-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            >
              <option value="">İlçe seçin</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="prof-ttbs" className="block text-xs font-medium text-slate-700 mb-1">
            Taşınmaz Ticareti Yetki Belgesi No
          </label>
          <input
            id="prof-ttbs"
            type="text"
            value={ttbsNumber}
            onChange={(e) => setTtbsNumber(e.target.value)}
            className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
          />
        </div>

        <div>
          <label htmlFor="prof-bio" className="block text-xs font-medium text-slate-700 mb-1">
            Uzmanlık Alanı ve Çalışma Notu
          </label>
          <textarea
            id="prof-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
          >
            {saving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
          </button>
        </div>
      </form>

      <div className="lg:col-span-5 space-y-5">
        {/* Profil Fotoğrafı Kartı */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Camera className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Profil Fotoğrafım
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <AgentAvatar name={user.full_name} avatarPath={user.avatar_path} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.office_name}</p>
              <label
                htmlFor="profile-avatar-upload"
                className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {avatarUploading
                    ? 'Yükleniyor...'
                    : user.avatar_path
                      ? 'Fotoğrafı Değiştir'
                      : 'Fotoğraf Yükle'}
                </span>
              </label>
              <input
                id="profile-avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={avatarUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handleAvatarUpload(file);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </div>
          </div>

          {avatarError && (
            <div className="p-2.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {avatarError}
            </div>
          )}
          {avatarMsg && (
            <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {avatarMsg}
            </div>
          )}
        </div>

        {/* MYK Kayıt Kartı */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              MYK Seviye 5 Doğrulama Kaydı
            </h2>
          </div>

          <div className="text-sm space-y-1.5">
            <p className="text-slate-500">
              Belge Durumu:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {user.myk_number || 'Belge Yüklendi'}
              </span>
            </p>
            <p className="text-slate-500">
              Onay Durumu:{' '}
              <span className="font-medium text-emerald-700">
                {user.role === 'admin' ? 'Doğrulama Kurulu Yetkilisi' : 'Ön Onaylı Emlak Danışmanı'}
              </span>
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            {isImageDoc ? (
              <img
                src={docUrl}
                alt="Onaylı MYK Belgesi"
                className="w-full h-44 object-contain bg-white border border-slate-200 rounded mb-2"
              />
            ) : (
              <div className="h-28 flex items-center justify-center bg-white border border-slate-200 rounded mb-2">
                <FileText className="w-8 h-8 text-blue-700" aria-hidden="true" />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 truncate">{user.myk_doc_name}</span>
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 font-medium hover:underline whitespace-nowrap shrink-0"
              >
                Görüntüle
              </a>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Güvenilir Danışman Puanı ve Değerlendirmeler */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Award className="w-5 h-5" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Güvenilir Danışman Puanı ve İşlem Rozeti
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Tamamlanan alıcı eşleşmeleri sonrasında meslektaşlarınızın verdiği doğrulanmış
              puanlar burada toplanır.
            </p>
          </div>
          <TrustBadge
            ratingAvg={trustSummary.rating_avg}
            reviewCount={trustSummary.review_count}
            completedDeals={trustSummary.completed_deals}
            showUnrated
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Ortalama Güven Puanı</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {trustSummary.review_count > 0 ? `${trustSummary.rating_avg.toFixed(1)} / 5.0` : '—'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Onaylı Tamamlanan İşlem</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
              {trustSummary.completed_deals}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Alınan Meslektaş Yorumu</p>
            <p className="mt-1 font-display text-2xl font-bold text-blue-700 tabular-nums">
              {trustSummary.review_count}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Rozet Kriterleri:</span>{' '}
          <strong>Güvenilir Danışman</strong> rozeti için en az{' '}
          <span className="font-mono tabular-nums">2</span> tamamlanan işlem ve{' '}
          <span className="font-mono tabular-nums">4.5+</span> ortalama;{' '}
          <strong>Elit Güvenilir Danışman</strong> için en az{' '}
          <span className="font-mono tabular-nums">4</span> tamamlanan işlem,{' '}
          <span className="font-mono tabular-nums">5</span> değerlendirme ve{' '}
          <span className="font-mono tabular-nums">4.8+</span> ortalama puan gerekir.
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Aldığınız Değerlendirmeler ({receivedReviews.length})
          </h3>
          {reviewsLoading ? (
            <p className="text-xs text-slate-500">Değerlendirmeler yükleniyor...</p>
          ) : receivedReviews.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              Henüz değerlendirme almadınız. Tamamlanan eşleşmelerde meslektaşlarınız sizi
              puanladığında yorumlar burada görünecektir.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {receivedReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="p-4 border border-slate-200 rounded-xl bg-white space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rev.reviewer_name}</p>
                      <p className="text-xs text-slate-500">{rev.reviewer_office}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-700 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                      {rev.rating}/5
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {rev.request_title} · {formatRelativeDateTR(rev.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
