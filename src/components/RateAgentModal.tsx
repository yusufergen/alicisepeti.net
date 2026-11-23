import { useState } from 'react';
import { Award, CheckCircle2, Star, X } from 'lucide-react';
import { api } from '../api/client';
import type { AgentReview, AgentTrustSummary } from '../types';
import { validateReviewInput } from '../utils/domain';

interface RateAgentModalProps {
  requestId: number;
  requestTitle: string;
  targetAgentId: number;
  targetAgentName: string;
  targetOffice?: string;
  onClose: () => void;
  onSubmitted: (payload: { review: AgentReview; targetSummary: AgentTrustSummary }) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 / 5 — İletişim ve süreç sorunlu geçti',
  2: '2 / 5 — Geliştirilmesi gereken yönler vardı',
  3: '3 / 5 — Standart, sorunsuz süreç',
  4: '4 / 5 — Güvenilir ve hızlı iş birliği',
  5: '5 / 5 — Örnek Güvenilir Danışman',
};

export function RateAgentModal({
  requestId,
  requestTitle,
  targetAgentId,
  targetAgentName,
  targetOffice,
  onClose,
  onSubmitted,
}: RateAgentModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [dealClosed, setDealClosed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeStar = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationErr = validateReviewInput({ rating, comment });
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createReview({
        request_id: requestId,
        target_agent_id: targetAgentId,
        rating,
        comment: comment.trim(),
        deal_closed: dealClosed,
      });
      onSubmitted({ review: res.review, targetSummary: res.target_summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Değerlendirme kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-agent-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Award className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="rate-agent-title"
                className="font-display text-base font-semibold text-slate-900 truncate"
              >
                Danışmanı Puanla
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {targetAgentName}
                {targetOffice ? ` · ${targetOffice}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Puanlama penceresini kapat"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <p className="font-medium text-slate-900 truncate">Talep #{requestId}: {requestTitle}</p>
            <p className="mt-0.5">
              Tamamlanan işlem puanları{' '}
              <strong className="text-emerald-800">Güvenilir Danışman</strong> rozetini ve ağ
              içi güven skorunu doğrudan günceller.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">
              İş Birliği ve Güven Puanınız <span className="text-red-600">*</span>
            </p>
            <div
              className="flex items-center gap-2"
              onMouseLeave={() => setHoverRating(0)}
              role="radiogroup"
              aria-label="Yıldız puanı"
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= activeStar;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`5 üzerinden ${value} yıldız`}
                    onMouseEnter={() => setHoverRating(value)}
                    onClick={() => setRating(value)}
                    className={`w-11 h-11 inline-flex items-center justify-center rounded-lg border transition-colors ${
                      filled
                        ? 'bg-amber-50 border-amber-300 text-amber-500'
                        : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 ${filled ? 'fill-amber-400 text-amber-500' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-700 tabular-nums">
              {RATING_LABELS[activeStar]}
            </p>
          </div>

          <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={dealClosed}
              onChange={(e) => setDealClosed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-700"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900">
                İşlem tapu devri veya kira kontratı ile sonuçlandı
              </strong>{' '}
              (Onaylı tamamlanan işlem sayacına eklenir)
            </span>
          </label>

          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Meslektaşınıza Değerlendirme Notu (Opsiyonel)
            </label>
            <textarea
              id="review-comment"
              rows={3}
              maxLength={400}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Örn: Doğru portföy sunumu, şeffaf komisyon paylaşımı ve zamanında tapu organizasyonu için teşekkürler."
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
            <p className="mt-1 text-[11px] text-slate-400 text-right tabular-nums">
              {comment.length} / 400
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg whitespace-nowrap shrink-0"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Kaydediliyor...' : 'Değerlendirmeyi Gönder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
