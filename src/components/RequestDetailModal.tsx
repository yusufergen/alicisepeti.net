import { useCallback, useEffect, useState } from 'react';
import { Award, Check, ChevronDown, ChevronUp, Copy, MessageSquare, Phone, ShieldCheck, Star, X } from 'lucide-react';
import { api } from '../api/client';
import type { AgentReview, AgentUser, BuyerRequest, ContactMatch } from '../types';
import {
  formatBudgetRange,
  formatRelativeDateTR,
  toTelHref,
  toWhatsAppHref,
} from '../utils/domain';
import { AgentAvatar } from './AgentAvatar';
import { RateAgentModal } from './RateAgentModal';
import { TrustBadge } from './TrustBadge';

interface RequestDetailModalProps {
  requestId: number | null;
  currentUser: AgentUser;
  onClose: () => void;
  onUpdated: () => void;
}

export function RequestDetailModal({
  requestId,
  currentUser,
  onClose,
  onUpdated,
}: RequestDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<BuyerRequest | null>(null);
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [copied, setCopied] = useState(false);

  const [message, setMessage] = useState('');
  const [portfolioRef, setPortfolioRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [agentReviews, setAgentReviews] = useState<AgentReview[]>([]);
  const [rateTarget, setRateTarget] = useState<{
    targetAgentId: number;
    targetAgentName: string;
    targetOffice?: string;
  } | null>(null);

  const fetchDetail = useCallback(async (id: number) => {
    const res = await api.getRequestDetail(id);
    setDetail(res.request);
    setMatches(res.matches);
  }, []);

  useEffect(() => {
    if (!requestId) {
      setDetail(null);
      setMatches([]);
      setReviewsOpen(false);
      setAgentReviews([]);
      setRateTarget(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setSubmitSuccess('');
    setSubmitError('');
    setReviewsOpen(false);
    setAgentReviews([]);

    api
      .getRequestDetail(requestId)
      .then((res) => {
        if (!cancelled) {
          setDetail(res.request);
          setMatches(res.matches);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Talep detayı yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const handleToggleReviews = async () => {
    if (!detail) return;
    if (reviewsOpen) {
      setReviewsOpen(false);
      return;
    }
    setReviewsOpen(true);
    if (agentReviews.length > 0) return;
    setReviewsLoading(true);
    try {
      const res = await api.getAgentReviews(detail.agent_id);
      setAgentReviews(res.reviews);
    } catch {
      // ignore silent review load errors
    } finally {
      setReviewsLoading(false);
    }
  };

  if (!requestId) return null;

  const isOwner = detail?.agent_id === currentUser.id;

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleSendMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    try {
      const res = await api.createMatch(detail.id, {
        message,
        portfolio_ref: portfolioRef,
      });
      setMatches((prev) => [res.match, ...prev]);
      setMessage('');
      setPortfolioRef('');
      setSubmitSuccess(
        'Portföy eşleşme bildiriminiz talep sahibine iletildi. Doğrudan telefon ile de arayabilirsiniz.'
      );
      onUpdated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Bildirim gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus: 'active' | 'matched' | 'closed') => {
    if (!detail) return;
    try {
      await api.updateRequest(detail.id, { status: nextStatus });
      setDetail({ ...detail, status: nextStatus });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-detail-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 z-10">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              Alıcı Talebi #{requestId}
              {detail ? ` · ${formatRelativeDateTR(detail.created_at)}` : ''}
            </p>
            <h2
              id="request-detail-title"
              className="font-display text-lg font-semibold text-slate-900 truncate"
            >
              {detail ? detail.title : 'Talep Detayı Yükleniyor'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Talep detay penceresini kapat"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="space-y-3 py-6">
              <div className="h-5 bg-slate-100 rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
              <div className="h-24 bg-slate-100 rounded animate-pulse" />
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {detail && !loading && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Aranan Lokasyon</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {detail.city} / {detail.district} / {detail.neighborhood}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Bütçe Aralığı</p>
                  <p className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {formatBudgetRange(detail.budget_min, detail.budget_max)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Mülk Özellikleri</p>
                  <p className="text-sm text-slate-800 tabular-nums">
                    {detail.transaction_type} · {detail.property_type} · {detail.room_count}
                    {detail.min_sqm > 0 ? ` · Min ${detail.min_sqm} m²` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Bina Yaşı, Kat ve Kredi</p>
                  <p className="text-sm text-slate-800">
                    {detail.building_age} · {detail.floor_pref} ·{' '}
                    {detail.credit_suitable ? 'Krediye Uygun' : 'Nakit / Peşin'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-slate-500 mb-2">
                  Alıcı Notu ve Müşteri Beklentisi
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">
                  {detail.buyer_note}
                </p>
                {detail.features.length > 0 && (
                  <p className="mt-2.5 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">Tercih edilen kriterler: </span>
                    {detail.features.join(' · ')}
                  </p>
                )}
              </div>

              <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AgentAvatar
                      name={detail.agent_name || 'Emlak Danışmanı'}
                      avatarPath={detail.agent_avatar}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-1">
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        <span>MYK Doğrulamalı Emlak Danışmanı</span>
                      </div>
                      <p className="font-display text-base font-semibold text-slate-900">
                        {detail.agent_name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {detail.agent_office} · {detail.agent_city}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                        MYK: {detail.agent_myk_number || 'Belge Doğrulandı'}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <TrustBadge
                          ratingAvg={detail.agent_rating_avg}
                          reviewCount={detail.agent_review_count}
                          completedDeals={detail.agent_completed_deals}
                          showUnrated
                        />
                        {(detail.agent_review_count || 0) > 0 && (
                          <button
                            type="button"
                            onClick={handleToggleReviews}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                          >
                            <span>
                              {reviewsOpen ? 'Yorumları Gizle' : `Meslektaş Yorumları (${detail.agent_review_count})`}
                            </span>
                            {reviewsOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500 mb-1">Doğrudan İletişim Telefonu</p>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mb-2">
                      {detail.contact_phone}
                    </p>
                    <div className="flex flex-wrap sm:justify-end gap-2">
                      <a
                        href={toTelHref(detail.contact_phone)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                        Hemen Ara
                      </a>
                      <a
                        href={toWhatsAppHref(
                          detail.contact_phone,
                          `Merhaba ${detail.agent_name}, AlıcıSepeti üzerindeki "${detail.title}" (#${detail.id}) alıcı talebiniz için uygun portföyüm var.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(detail.contact_phone)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            Kopyala
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {reviewsOpen && (
                  <div className="mt-4 pt-4 border-t border-blue-200/80 space-y-2.5">
                    {reviewsLoading ? (
                      <p className="text-xs text-slate-500">Değerlendirmeler yükleniyor...</p>
                    ) : agentReviews.length === 0 ? (
                      <p className="text-xs text-slate-500">Henüz yazılı meslektaş değerlendirmesi yok.</p>
                    ) : (
                      agentReviews.slice(0, 4).map((rev) => (
                        <div key={rev.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-slate-900">
                              {rev.reviewer_name} · {rev.reviewer_office}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-700 tabular-nums">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                              {rev.rating}/5
                            </span>
                          </div>
                          {rev.comment && <p className="text-slate-700 leading-relaxed">{rev.comment}</p>}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {rev.request_title} · {formatRelativeDateTR(rev.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {isOwner ? (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Talep Durumunu Güncelle
                      </h3>
                      <p className="text-xs text-slate-500">
                        Alıcı ihtiyacınız karşılandığında durumu Eşleşti veya Kapatıldı yapabilirsiniz.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                      {(
                        [
                          { id: 'active', label: 'Aktif' },
                          { id: 'matched', label: 'Eşleşti' },
                          { id: 'closed', label: 'Kapatıldı' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleStatusChange(opt.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            detail.status === opt.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 mb-2">
                      Gelen Portföy Bildirimleri ({matches.length})
                    </h3>
                    {matches.length === 0 ? (
                      <p className="text-sm text-slate-500 py-3">
                        Henüz başka bir emlakçıdan portföy eşleşme bildirimi gelmedi.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {matches.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 border border-slate-200 rounded-lg bg-white"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <AgentAvatar
                                  name={m.sender_name || 'Danışman'}
                                  avatarPath={m.sender_avatar}
                                  size="xs"
                                />
                                <span className="text-sm font-semibold text-slate-900">
                                  {m.sender_name} · {m.sender_office}
                                </span>
                                <TrustBadge
                                  compact
                                  ratingAvg={m.sender_rating_avg}
                                  reviewCount={m.sender_review_count}
                                  completedDeals={m.sender_completed_deals}
                                />
                              </div>
                              <a
                                href={toTelHref(m.sender_phone)}
                                className="font-mono text-xs font-medium text-blue-700 hover:underline tabular-nums"
                              >
                                {m.sender_phone}
                              </a>
                            </div>
                            <p className="text-sm text-slate-700">{m.message}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              {m.portfolio_ref ? (
                                <p className="font-mono text-xs text-slate-500">
                                  Portföy Kodu: {m.portfolio_ref}
                                </p>
                              ) : (
                                <span />
                              )}
                              {(detail.status === 'matched' || detail.status === 'closed') &&
                                (m.my_given_rating ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 tabular-nums">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                                    Puan Verildi ({m.my_given_rating}/5)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRateTarget({
                                        targetAgentId: m.sender_agent_id,
                                        targetAgentName: m.sender_name || 'Danışman',
                                        targetOffice: m.sender_office,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0"
                                  >
                                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Danışmanı Puanla</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMatch}
                  className="border-t border-slate-200 pt-5 space-y-3"
                >
                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      Portföyüm Uygun — Eşleşme Bildirimi Bırak
                    </h3>
                    <p className="text-xs text-slate-500">
                      Telefonla aramaya ek olarak meslektaşınıza portföy bilginizi sistem üzerinden de iletebilirsiniz.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                      {submitSuccess}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="match-portfolio-ref"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Portföy Kodu / İlan Referansı (Opsiyonel)
                    </label>
                    <input
                      id="match-portfolio-ref"
                      type="text"
                      value={portfolioRef}
                      onChange={(e) => setPortfolioRef(e.target.value)}
                      placeholder="Örn: SUA-402 veya Bağdat Cad. 3+1"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="match-message"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Meslektaşınıza Not <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="match-message"
                      rows={3}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Elimizde Suadiye’de net 135 m² kapalı otoparklı yetkili portföy mevcut. Ortak çalışma şartlarını görüşmek için arayabilirsiniz."
                      className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {submitting ? 'Gönderiliyor...' : 'Portföy Eşleşmesi Bildir'}
                    </button>
                  </div>

                  {(detail.status === 'matched' || detail.status === 'closed') &&
                    detail.already_contacted && (
                      <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-900">
                            Tamamlanan İşlem Güvenilir Danışman Değerlendirmesi
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Bu talep eşleştiği için talep sahibinin iş birliği sürecini puanlayabilirsiniz.
                          </p>
                        </div>
                        {detail.owner_reviewed_by_me ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 tabular-nums">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                            <span>Puanınız: {detail.my_review_for_owner}/5</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setRateTarget({
                                targetAgentId: detail.agent_id,
                                targetAgentName: detail.agent_name || 'Talep Sahibi',
                                targetOffice: detail.agent_office,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                          >
                            <Award className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Talep Sahibini Puanla</span>
                          </button>
                        )}
                      </div>
                    )}
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {rateTarget && detail && (
        <RateAgentModal
          requestId={detail.id}
          requestTitle={detail.title}
          targetAgentId={rateTarget.targetAgentId}
          targetAgentName={rateTarget.targetAgentName}
          targetOffice={rateTarget.targetOffice}
          onClose={() => setRateTarget(null)}
          onSubmitted={async () => {
            setRateTarget(null);
            setAgentReviews([]);
            await fetchDetail(detail.id);
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
