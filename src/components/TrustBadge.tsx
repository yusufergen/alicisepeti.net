import { Award, ShieldCheck, Star } from 'lucide-react';
import { computeTrustSummary } from '../utils/domain';

interface TrustBadgeProps {
  ratingAvg?: number;
  reviewCount?: number;
  completedDeals?: number;
  compact?: boolean;
  showUnrated?: boolean;
}

export function TrustBadge({
  ratingAvg = 0,
  reviewCount = 0,
  completedDeals = 0,
  compact = false,
  showUnrated = false,
}: TrustBadgeProps) {
  const summary = computeTrustSummary(ratingAvg, reviewCount, completedDeals);

  if (summary.tier === 'none') {
    if (!showUnrated) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 whitespace-nowrap">
        Yeni Danışman
      </span>
    );
  }

  if (compact) {
    if (summary.tier === 'elite') {
      return (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 whitespace-nowrap"
          title="Elit Güvenilir Danışman"
        >
          <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
          <span>Elit Güvenilir</span>
          <span className="text-slate-400" aria-hidden="true">
            ·
          </span>
          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="font-mono tabular-nums text-slate-900">
            {summary.rating_avg.toFixed(1)}
          </span>
          <span className="text-slate-500 font-normal tabular-nums">({summary.review_count})</span>
        </span>
      );
    }

    if (summary.tier === 'trusted') {
      return (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 whitespace-nowrap"
          title="Güvenilir Danışman"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Güvenilir Danışman</span>
          <span className="text-slate-400" aria-hidden="true">
            ·
          </span>
          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="font-mono tabular-nums text-slate-900">
            {summary.rating_avg.toFixed(1)}
          </span>
          <span className="text-slate-500 font-normal tabular-nums">({summary.review_count})</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 whitespace-nowrap"
        title="Onaylı İşlem Puanlı"
      >
        <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
        <span className="font-mono font-semibold tabular-nums text-slate-900">
          {summary.rating_avg.toFixed(1)}
        </span>
        <span className="text-slate-500 tabular-nums">({summary.review_count} işlem)</span>
      </span>
    );
  }

  const tone =
    summary.tier === 'elite'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : summary.tier === 'trusted'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : 'bg-slate-50 border-slate-200 text-slate-800';

  const Icon =
    summary.tier === 'elite' ? Award : summary.tier === 'trusted' ? ShieldCheck : Star;
  const iconTone =
    summary.tier === 'elite'
      ? 'text-amber-600'
      : summary.tier === 'trusted'
        ? 'text-emerald-700'
        : 'text-amber-500 fill-amber-500';

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg border text-xs ${tone}`}
    >
      <span className="inline-flex items-center gap-1 font-semibold">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconTone}`} aria-hidden="true" />
        <span>{summary.badge_label}</span>
      </span>
      <span className="text-slate-400" aria-hidden="true">
        ·
      </span>
      <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
        <span>{summary.rating_avg.toFixed(1)}</span>
      </span>
      <span className="text-slate-600 tabular-nums">
        ({summary.review_count} değerlendirme · {summary.completed_deals} tamamlanan işlem)
      </span>
    </div>
  );
}
