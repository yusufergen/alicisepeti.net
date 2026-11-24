import { useState } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink, MailCheck } from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import type { PreRequest } from '../types';
import { validatePreRequestInput } from '../utils/domain';

interface PreRequestPageProps {
  standalone?: boolean;
  onNavigate: (path: string) => void;
}

export function PreRequestPage({ standalone = true, onNavigate }: PreRequestPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<PreRequest | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/on-talep` : '/on-talep';

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validatePreRequestInput({
      full_name: fullName,
      email,
      address,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createPreRequest({
        full_name: fullName.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      setSubmitted(res.pre_request);
      setFullName('');
      setEmail('');
      setAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ön talep kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={standalone ? 'min-h-[calc(100vh-4rem)] bg-slate-50 py-10 sm:py-16 px-4 sm:px-6' : 'space-y-6'}>
      <div className={standalone ? 'max-w-5xl mx-auto space-y-6' : 'max-w-5xl space-y-6'}>
        {!standalone && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Potansiyel Üyelerle Paylaşılabilir Ön Talep Bağlantısı
              </p>
              <p
                data-testid="pre-request-share-url"
                className="font-mono text-xs sm:text-sm text-slate-900 mt-1 truncate"
              >
                {shareUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span className="text-emerald-800">Link Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Linki Kopyala</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/on-talep')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ayrı Sayfada Aç</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Campaign & Launch Summary */}
          <div className="lg:col-span-5 space-y-5">
            {standalone && (
              <div>
                <BrandLogo size="lg" />
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-blue-700 tracking-wide">
                AlıcıSepeti · Erken Başvuru
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                Yakında hizmetinizde.
              </h1>
              <p className="font-display text-xl sm:text-2xl font-semibold text-emerald-700">
                İlk 3 ay tamamen ücretsiz.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Emlakçıdan emlakçıya doğrulanmış alıcı talepleri platformu AlıcıSepeti’nde yerinizi
                şimdiden ayırtın. Ön talep bırakın, lansman açıldığında ilk daveti doğrudan
                e-posta adresinize gönderelim.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-900">
                Ön Talep Bırakan Ofisler İçin Avantajlar
              </p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>İlk 3 ay tüm alıcı talebi paylaşımı ve eşleşme araçları ücretsiz.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>Bölgenizdeki MYK belgeli meslektaşlarla öncelikli ağ kurulumu.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>Sadece isim soyisim, e-posta ve adres ile 30 saniyede ön kayıt.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Form Surface */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            {submitted ? (
              <div
                data-testid="pre-request-success"
                className="py-6 text-center space-y-4"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <MailCheck className="w-6 h-6 text-emerald-700" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Ön Talebiniz Alındı
                  </h2>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Teşekkürler <strong className="text-slate-900">{submitted.full_name}</strong>.
                    İlk 3 ay ücretsiz erken erişim açıldığında{' '}
                    <span className="font-mono text-slate-800">{submitted.email}</span> adresine
                    bilgi vereceğiz.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmitted(null)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                  >
                    Yeni Ön Talep Gönder
                  </button>
                  {standalone && (
                    <button
                      type="button"
                      onClick={() => onNavigate('/')}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Ana Sayfaya Dön
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Ön Talep Formu
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    İlk 3 ay tamamen ücretsiz · Yakında hizmetinizde
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="pre-req-fullname"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    İsim Soyisim <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="pre-req-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pre-req-email"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    E-posta <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="pre-req-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@emlakofisi.com"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pre-req-address"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Adres <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="pre-req-address"
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="İl, ilçe, mahalle ve ofis adresi..."
                    className="w-full p-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {submitting ? 'Gönderiliyor...' : 'Ön Talebi Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
