import { MapPin, Phone } from 'lucide-react';
import type { BuyerRequest } from '../types';
import { formatBudgetRange, formatRelativeDateTR } from '../utils/domain';
import { AgentAvatar } from './AgentAvatar';
import { TrustBadge } from './TrustBadge';

interface RequestCardProps {
  request: BuyerRequest;
  isOwn: boolean;
  onSelect: (req: BuyerRequest) => void;
}

export function RequestCard({ request, isOwn, onSelect }: RequestCardProps) {
  const isRental = request.transaction_type === 'Kiralık';

  const statusLabel =
    request.status === 'matched'
      ? 'Eşleşti'
      : request.status === 'closed'
        ? 'Kapatıldı'
        : 'Aktif Talep';

  const statusColor =
    request.status === 'matched'
      ? 'text-blue-700'
      : request.status === 'closed'
        ? 'text-slate-500'
        : 'text-emerald-700';

  const topAccentClass = isRental ? 'bg-teal-600' : 'bg-blue-600';
  const txTagClass = isRental
    ? 'bg-teal-50 text-teal-800 border-teal-200'
    : 'bg-blue-50 text-blue-800 border-blue-200';
  const budgetBoxClass = isRental
    ? 'bg-teal-50/50 border-teal-100'
    : 'bg-blue-50/50 border-blue-100';

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
      {/* Color-coded top bar */}
      <div className={`h-1 w-full ${topAccentClass}`} aria-hidden="true" />

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-600 mb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${txTagClass}`}
              >
                {request.transaction_type}
              </span>
              <span className="font-medium text-slate-700">{request.property_type}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-slate-800">{request.room_count}</span>
              {request.min_sqm > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Min {request.min_sqm} m²</span>
                </>
              )}
            </div>
            <span className={`font-semibold whitespace-nowrap shrink-0 ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug mb-1.5">
            {request.title}
          </h3>

          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-900 mb-3">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
            <span>
              {request.city} / {request.district} / {request.neighborhood}
            </span>
          </p>

          <div
            className={`px-3.5 py-2.5 rounded-lg border ${budgetBoxClass} flex items-baseline justify-between gap-3 mb-3`}
          >
            <span className="text-xs font-medium text-slate-600">Alıcı Bütçesi</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatBudgetRange(request.budget_min, request.budget_max)}
            </span>
          </div>

          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {request.buyer_note}
          </p>

          {request.features.length > 0 && (
            <p className="mt-2.5 text-xs text-slate-500 truncate">
              Kriterler: {request.features.join(' · ')}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AgentAvatar
              name={request.agent_name || 'Emlak Danışmanı'}
              avatarPath={request.agent_avatar}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-slate-900">
                <span className="truncate">{request.agent_name || 'Doğrulanmış Emlakçı'}</span>
                {isOwn && <span className="text-blue-700 font-medium">(Siz)</span>}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {request.agent_office} · {formatRelativeDateTR(request.created_at)}
                {typeof request.match_count === 'number' && request.match_count > 0
                  ? ` · ${request.match_count} bildirim`
                  : ''}
              </p>
              {(request.agent_review_count || 0) > 0 && (
                <div className="mt-1">
                  <TrustBadge
                    compact
                    ratingAvg={request.agent_rating_avg}
                    reviewCount={request.agent_review_count}
                    completedDeals={request.agent_completed_deals}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(request)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              isOwn ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isOwn ? 'Talebi Yönet' : 'Detay & İletişim'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function RequestListRow({ request, isOwn, onSelect }: RequestCardProps) {
  const isRental = request.transaction_type === 'Kiralık';
  const txTagClass = isRental
    ? 'bg-teal-50 text-teal-800 border-teal-200'
    : 'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <div className="p-4 sm:px-5 hover:bg-blue-50/25 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left: Location, Title & Specs */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${txTagClass}`}>
            {request.transaction_type}
          </span>
          <span className="font-semibold text-blue-900">
            {request.city} / {request.district} / {request.neighborhood}
          </span>
          <span className="text-slate-400" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-600 tabular-nums">
            {request.property_type} · {request.room_count}
            {request.min_sqm > 0 ? ` · Min ${request.min_sqm} m²` : ''}
          </span>
          <span className="text-slate-400" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-500">{formatRelativeDateTR(request.created_at)}</span>
        </div>

        <h3 className="font-display text-base font-semibold text-slate-900 truncate">
          {request.title}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-1">{request.buyer_note}</p>
      </div>

      {/* Middle: Budget */}
      <div className="lg:w-64 shrink-0 lg:text-right">
        <p className="text-[11px] font-medium text-slate-500">Alıcı Bütçesi</p>
        <p className="font-mono text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
          {formatBudgetRange(request.budget_min, request.budget_max)}
        </p>
      </div>

      {/* Right: Agent Avatar + Action */}
      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0 lg:w-52">
          <AgentAvatar
            name={request.agent_name || 'Emlak Danışmanı'}
            avatarPath={request.agent_avatar}
            size="xs"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {request.agent_name || 'Emlakçı'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{request.agent_office}</p>
            {(request.agent_review_count || 0) > 0 && (
              <div className="mt-0.5">
                <TrustBadge
                  compact
                  ratingAvg={request.agent_rating_avg}
                  reviewCount={request.agent_review_count}
                  completedDeals={request.agent_completed_deals}
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect(request)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isOwn ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-700 hover:bg-blue-800'
          }`}
        >
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isOwn ? 'Talebi Yönet' : 'Detay & Ara'}</span>
        </button>
      </div>
    </div>
  );
}
