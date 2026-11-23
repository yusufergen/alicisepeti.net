import { useEffect, useState } from 'react';
import { Camera, FileText, ShieldCheck, Upload } from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import { getDistrictsForCity, TURKEY_PROVINCES } from '../data/turkeyLocations';
import type { AgentUser } from '../types';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (path: string) => void;
  onAuthenticated: (user: AgentUser) => void;
}

export function AuthPage({ mode, onNavigate, onAuthenticated }: AuthPageProps) {
  // Login state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('');
  const [mykNumber, setMykNumber] = useState('');
  const [ttbsNumber, setTtbsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [mykFile, setMykFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [provinces, setProvinces] = useState<string[]>(TURKEY_PROVINCES);
  const [districts, setDistricts] = useState<string[]>(() => getDistrictsForCity('İstanbul'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allowRegistrations, setAllowRegistrations] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicConfig()
      .then((cfg) => {
        if (!cancelled) {
          setAllowRegistrations(cfg.allow_registrations);
        }
      })
      .catch(() => {});
    api
      .getProvinces()
      .then((res) => {
        if (!cancelled && res.provinces?.length > 0) {
          setProvinces(res.provinces);
        }
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
          setDistricts(
            res.districts?.length > 0 ? res.districts : getDistrictsForCity(city)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setDistricts(getDistrictsForCity(city));
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (file: File | null) => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(identifier, loginPassword);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const user = await api.login(demoEmail, demoPassword);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo girişi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mykFile) {
      setError('Lütfen MYK Seviye 5 belgenizi (PDF, JPG veya PNG) yükleyin.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('office_name', officeName);
      formData.append('city', city);
      formData.append('district', district);
      formData.append('myk_number', mykNumber);
      formData.append('ttbs_number', ttbsNumber);
      formData.append('password', password);
      formData.append('bio', bio);
      formData.append('myk_document', mykFile);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const user = await api.register(formData);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt tamamlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                <BrandLogo size="md" showText={false} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {mode === 'login' ? 'AlıcıSepeti Emlakçı Girişi' : 'MYK Belgeli Emlakçı Kaydı'}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {mode === 'login'
                    ? 'Onaylı danışman hesabınızla alıcı taleplerine erişin.'
                    : 'MYK belgenizi yüklemeniz yeterlidir; ön onay sonrası panele erişebilirsiniz.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onNavigate('/giris');
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onNavigate('/kayit');
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MYK ile Kayıt Ol
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <div className="space-y-6">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    E-posta veya Cep Telefonu
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ahmet@kuzeyemlak.com veya 0532 412 88 10"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Şifre
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <div className="pt-5 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-3">
                  Hızlı Test Hesapları (Tek Tıkla Giriş)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    aria-label="Hızlı Giriş: Onaylı Emlakçı Ahmet Yılmaz"
                    onClick={() => handleDemoLogin('ahmet@kuzeyemlak.com', 'Emlak123!')}
                    className="p-3 text-left border border-slate-200 hover:border-blue-700 hover:bg-blue-50/40 rounded-lg transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900">Onaylı Emlakçı</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ahmet Yılmaz · Kadıköy</p>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    aria-label="Hızlı Giriş: Ön Onay Bekleyen Zeynep Karahan"
                    onClick={() => handleDemoLogin('zeynep@kadikoykonut.com', 'Emlak123!')}
                    className="p-3 text-left border border-slate-200 hover:border-amber-600 hover:bg-amber-50/40 rounded-lg transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900">Ön Onay Bekleyen</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Zeynep Karahan · MYK</p>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    aria-label="Hızlı Giriş: MYK Onay Kurulu Merve Demirtaş"
                    onClick={() => handleDemoLogin('admin@talepagi.com', 'Admin123!')}
                    className="p-3 text-left border border-slate-200 hover:border-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900">MYK Onay Kurulu</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Merve Demirtaş · Yönetici</p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {!allowRegistrations && (
                <div
                  role="alert"
                  className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium"
                >
                  Yeni emlakçı kayıtları yönetici tarafından geçici olarak durdurulmuştur.
                </div>
              )}

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  AlıcıSepeti yalnızca yetkili gayrimenkul danışmanlarına açıktır. Başvuru için
                  MYK belgenizi dosya olarak yüklemeniz yeterlidir.
                </p>
              </div>

              {/* Profil Fotoğrafı Yükleme */}
              <div className="flex flex-wrap items-center gap-4 p-3.5 border border-slate-200 rounded-lg bg-slate-50/60">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profil fotoğrafı önizleme"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-semibold text-slate-900">
                    Profil Fotoğrafı (Opsiyonel)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alıcı taleplerinde ve profil kartınızda meslektaşlarınıza görünür.
                  </p>
                </div>
                <label
                  htmlFor="reg-avatar-file"
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  {avatarFile ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç'}
                </label>
                <input
                  id="reg-avatar-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Ad Soyad <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Örn: Caner Aktaş"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-office"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Emlak Ofisi / İşletme Adı <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reg-office"
                    type="text"
                    required
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="Örn: Aktaş Gayrimenkul"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Cep Telefonu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0532 555 44 33"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    E-posta <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="caner@aktasemlak.com"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-city"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    İl <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="reg-city"
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
                    htmlFor="reg-district"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    İlçe
                  </label>
                  <select
                    id="reg-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  >
                    <option value="">İlçe seçin (Opsiyonel)</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-myk-file"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  MYK Belgesi Yükle (PDF, JPG, PNG) <span className="text-red-600">*</span>
                </label>
                <label
                  htmlFor="reg-myk-file"
                  className="flex items-center justify-between gap-4 p-4 border border-dashed border-slate-300 hover:border-blue-700 rounded-lg bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {mykFile ? (
                      <FileText className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {mykFile ? mykFile.name : 'MYK Belgenizi Yükleyin (Belge yüklemeniz yeterlidir)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mykFile
                          ? `${Math.round(mykFile.size / 1024)} KB · Ön onay incelemesi için yüklenecek`
                          : 'Maksimum 8 MB · PDF, PNG, JPG veya WEBP'}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md whitespace-nowrap shrink-0">
                    Dosya Seç
                  </span>
                </label>
                <input
                  id="reg-myk-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.svg"
                  onChange={(e) => setMykFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-myk"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    MYK Belge Numarası (Opsiyonel)
                  </label>
                  <input
                    id="reg-myk"
                    type="text"
                    value={mykNumber}
                    onChange={(e) => setMykNumber(e.target.value)}
                    placeholder="Belge no opsiyoneldir"
                    className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-ttbs"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Taşınmaz Ticareti Yetki Belgesi No (Opsiyonel)
                  </label>
                  <input
                    id="reg-ttbs"
                    type="text"
                    value={ttbsNumber}
                    onChange={(e) => setTtbsNumber(e.target.value)}
                    placeholder="Örn: 3409912"
                    className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Şifre (En az 6 karakter) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-bio"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Uzmanlık Bölgesi (Opsiyonel)
                  </label>
                  <input
                    id="reg-bio"
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Örn: Kadıköy sahil bandı lüks konut"
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !allowRegistrations}
                className="w-full h-11 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loading ? 'Başvuru Gönderiliyor...' : 'MYK Belgemle Başvuruyu Tamamla'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
