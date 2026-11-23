import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Lock, PhoneCall, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import type { AgentUser, PublicSummary } from '../types';
import { formatBudgetRange, formatRelativeDateTR } from '../utils/domain';

interface LandingPageProps {
  user: AgentUser | null;
  onNavigate: (path: string) => void;
}

function SafeImage({
  src,
  alt,
  className,
  fallbackTitle,
}: {
  src: string;
  alt: string;
  className: string;
  fallbackTitle: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6 text-center text-white`}
      >
        <Building2 className="w-10 h-10 text-blue-300 mb-3" aria-hidden="true" />
        <p className="font-display text-base font-medium">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function LandingPage({ user, onNavigate }: LandingPageProps) {
  const [summary, setSummary] = useState<PublicSummary | null>(null);

  useEffect(() => {
    api
      .getPublicSummary()
      .then(setSummary)
      .catch(() => {});
  }, []);

  const primaryActionPath = user
    ? user.status === 'approved' || user.role === 'admin'
      ? '/panel'
      : '/onay-bekleniyor'
    : '/kayit';

  return (
    <div className="bg-white text-slate-900">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-4">
                Sadece MYK Seviye 5 Belgeli Emlak Danışmanları İçin
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.1] mb-6"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Alıcı talebinizi paylaşın, portföyü hazır meslektaşınızla eşleştirin.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                Müşteriniz aradığı evi bulamıyorsa il, ilçe, mahalle, bütçe ve detaylı alıcı notuyla
                sistemde talep açın. Yalnızca MYK belgesi ön onaydan geçmiş emlakçılar talebi görsün
                ve uygun portföyü olan sizi doğrudan telefonla arasın.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate(primaryActionPath)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span>{user ? 'Emlakçı Paneline Geç' : 'MYK Belgenle Başvur'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/giris')}
                className="px-5 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {user ? 'Oturum Açık' : 'Üye Girişi Yap'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-slate-200">
              <SafeImage
                src="/src/assets/images/hero_architecture_istanbul_1795195847243.jpg"
                alt="İstanbul Boğazı manzaralı modern konut mimarisi"
                fallbackTitle="Türkiye Geneli Konut ve Ticari Gayrimenkul Ağı"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column KPI Strip */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums">
              {summary ? summary.totalActiveRequests : 8}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Yayındaki Aktif Alıcı Talebi
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums">
              {summary ? summary.totalApprovedAgents : 4}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              MYK Ön Onaylı Danışman Ofisi
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums">
              {summary ? summary.totalMatches : 3}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Bildirilen Portföy Eşleşmesi
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums">
              81 İl
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              İl, İlçe ve Mahalle Bazlı Arama
            </p>
          </div>
        </div>
      </section>

      {/* Mechanism Section */}
      <section id="nasil-calisir" className="bg-slate-50 border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium text-blue-700 mb-2">Çalışma Modeli</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Sosyal medya gruplarındaki dağınık mesajlara son veren yapısal talep ağı.
            </h2>
            <p className="text-base text-slate-600">
              WhatsApp gruplarında kaybolan alıcı mesajları yerine bütçesi, mahallesi ve kredi
              durumu netleşmiş talepler tek merkezde filtrelenir.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-8">
              <div className="pb-6 border-b border-slate-200">
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  01. MYK Seviye 5 Belgesi ile Ön Onaylı Üyelik
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Kayıt sırasında her danışman MYK Seviye 5 belgesini PDF veya görsel olarak
                  yükler. Ön onay kurulundan geçmeyen hiçbir hesap alıcı taleplerini ve telefon
                  numaralarını göremez.
                </p>
              </div>

              <div className="pb-6 border-b border-slate-200">
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  02. İl, İlçe, Mahalle ve Alıcı Notu ile Talep Girişi
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Müşterinizin aradığı şehir, ilçe, mahalle, minimum-maksimum bütçe, oda sayısı ve
                  satın alma koşullarını (nakit, kredi oranı, kat/bina yaşı tercihi) standart
                  alıcı talep formuna kaydedersiniz.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  03. Portföyü Uygun Meslektaşla Doğrudan Telefon Teması
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Elinde eşleşen yetkili portföy bulunan diğer emlakçı tek tıkla telefon numaranıza
                  ulaşır veya sistem üzerinden portföy kodunu paylaşarak ortak satış sürecini
                  başlatır.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                <SafeImage
                  src="/src/assets/images/broker_collaboration_1795195848803.jpg"
                  alt="İki emlak danışmanı ofiste kat planları ve portföy dosyalarını inceliyor"
                  fallbackTitle="Meslektaşlar Arası Ortak Satış İşbirliği"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Capabilities */}
      <section id="ozellikler" className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium text-blue-700 mb-2">Platform Yetenekleri</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hızlı eşleştirme için tasarlanmış net araçlar.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900 mb-2">
                Kademeli Türkiye Konum ve Bütçe Filtreleme
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Portföyünüzdeki bir daire veya arsa için alıcı ararken yalnızca ilgili il, ilçe ve
                mahalledeki talepleri filtreleyin. Bütçe aralığı, oda sayısı ve işlem tipine göre
                saniyeler içinde gerçek alıcıya ulaşın.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-mono font-semibold text-slate-900 tabular-nums">İl → İlçe → Mahalle</p>
                <p className="text-slate-500 mt-0.5">Kademeli lokasyon ağacı</p>
              </div>
              <div>
                <p className="font-mono font-semibold text-slate-900 tabular-nums">TRY Bütçe</p>
                <p className="text-slate-500 mt-0.5">Alt ve üst limit eşleşmesi</p>
              </div>
              <div>
                <p className="font-mono font-semibold text-slate-900 tabular-nums">Alıcı Notu</p>
                <p className="text-slate-500 mt-0.5">Nakit ve kredi detayı</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white border border-slate-900 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <PhoneCall className="w-6 h-6 text-blue-400 mb-4" aria-hidden="true" />
              <h3 className="font-display text-xl font-semibold mb-2">
                Aracısız Telefon İletişimi
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Platform içi komisyon kesintisi olmadan, doğrudan talep sahibi danışmanın onaylı
                cep telefonunu arayın veya WhatsApp ile portföy sunumu gönderin.
              </p>
            </div>
            <p className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
              Eşleşme kaydı ve durum takibi dahil
            </p>
          </div>
        </div>
      </section>

      {/* Live Anonymized Preview */}
      <section id="canli-talepler" className="bg-slate-50 border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-medium text-blue-700 mb-2">Ağdaki Güncel Hareketlilik</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Son girilen alıcı taleplerinden örnekler
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/giris')}
              className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Tüm talepleri ve telefonları gör →
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                    <th className="py-3.5 px-5">Talep Özeti</th>
                    <th className="py-3.5 px-5">İl / İlçe / Mahalle</th>
                    <th className="py-3.5 px-5">Tip ve Oda</th>
                    <th className="py-3.5 px-5 text-right">Bütçe Aralığı</th>
                    <th className="py-3.5 px-5 text-right">İletişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {(summary?.recentPreview || []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatRelativeDateTR(item.created_at)}
                        </p>
                      </td>
                      <td className="py-4 px-5 text-slate-700 whitespace-nowrap">
                        {item.city} / {item.district} / {item.neighborhood}
                      </td>
                      <td className="py-4 px-5 text-slate-600 whitespace-nowrap tabular-nums">
                        {item.transaction_type} · {item.property_type} · {item.room_count}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatBudgetRange(item.budget_min, item.budget_max)}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate(user ? '/panel' : '/giris')}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900"
                        >
                          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>MYK Girişi ile Gör</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!summary || summary.recentPreview.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        Aktif alıcı talepleri yükleniyor...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* MYK Verification & Proof Section */}
      <section id="myk-dogrulama" className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <SafeImage
                src="/src/assets/images/myk_verification_desk_1795195848997.jpg"
                alt="MYK belge doğrulama dosyası ve tablet"
                fallbackTitle="MYK Seviye 5 Belge Ön Onay Süreci"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 mb-2">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Yalnızca Yetkili Gayrimenkul Danışmanları</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                Sahte ilan ve yetkisiz aracılara kapalı mesleki ağ.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Sistemimize yalnızca Mesleki Yeterlilik Kurumu (MYK) Seviye 5 Sorumlu Emlak
                Danışmanı belgesini yükleyen profesyoneller kabul edilir. Başvurunuz ön onay
                ekibimiz tarafından incelendikten sonra tüm alıcı talepleri ve danışman telefonları
                erişiminize açılır.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-800 leading-relaxed mb-3">
                  “Suadiye’de 3+1 arayan nakit alıcım için açtığım talebe 2 saat içinde 3 farklı
                  yetkili ofisten telefon geldi; aynı hafta yer gösterip satışı kapattık.”
                </p>
                <p className="text-xs font-semibold text-slate-900">Ahmet Yılmaz</p>
                <p className="text-xs text-slate-500">Kuzey Sahil Gayrimenkul · Kadıköy</p>
              </div>
              <div>
                <p className="text-sm text-slate-800 leading-relaxed mb-3">
                  “WhatsApp gruplarında kaybolan mesajları taramak yerine doğrudan İncek ve Çayyolu
                  filtreleriyle bütçesi hazır müşterilere portföy sunuyoruz.”
                </p>
                <p className="text-xs font-semibold text-slate-900">Elif Kayaalp</p>
                <p className="text-xs text-slate-500">Başkent Konut Danışmanlık · Çankaya</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 text-white py-14">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">
              MYK belgenizle ağa katılın, müşteri taleplerini boşa çıkarmayın.
            </h2>
            <p className="text-sm text-slate-300">
              Belgenizi yükleyin, ön onay sonrası Türkiye genelindeki meslektaşlarınızla eşleşin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(primaryActionPath)}
            className="px-6 py-3 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Panele Git' : 'Ücretsiz Başvur'}
          </button>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span aria-hidden="true">·</span>
            <span>Emlakçıdan Emlakçıya Alıcı Talepleri Platformu</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('/giris')}
              className="hover:text-slate-900"
            >
              Emlakçı Girişi
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/kayit')}
              className="hover:text-slate-900"
            >
              MYK Kayıt Başvurusu
            </button>
            <span>© {new Date().getFullYear()} AlıcıSepeti</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
