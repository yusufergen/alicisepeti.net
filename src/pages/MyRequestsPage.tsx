import { useEffect, useState } from 'react';
import { Award, Phone, Star, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { RateAgentModal } from '../components/RateAgentModal';
import { RequestDetailModal } from '../components/RequestDetailModal';
import { TrustBadge } from '../components/TrustBadge';
import type { AgentUser, BuyerRequest, ContactMatch } from '../types';
import { formatBudgetRange, formatRelativeDateTR, toTelHref } from '../utils/domain';

interface MyRequestsPageProps {
  user: AgentUser;
  onNavigate: (path: string) => void;
}

export function MyRequestsPage({ user, onNavigate }: MyRequestsPageProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'incoming' | 'outgoing'>('requests');
  const [myRequests, setMyRequests] = useState<BuyerRequest[]>([]);
  const [incoming, setIncoming] = useState<ContactMatch[]>([]);
  const [outgoing, setOutgoing] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [rateTarget, setRateTarget] = useState<{
    requestId: number;
    requestTitle: string;
    targetAgentId: number;
    targetAgentName: string;
    targetOffice?: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, matchRes] = await Promise.all([
        api.getRequests({ only_mine: true, status: 'all' }),
        api.getMyMatches(),
      ]);
      setMyRequests(reqRes.requests);
      setIncoming(matchRes.incoming);
      setOutgoing(matchRes.outgoing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (id: number, status: 'active' | 'matched' | 'closed') => {
    try {
      await api.updateRequest(id, { status });
      setMyRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setIncoming((prev) =>
        prev.map((m) => (m.request_id === id ? { ...m, request_status: status } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi.');
    }
  };

  const handleMarkMatchedAndRate = async (match: ContactMatch) => {
    await handleStatusUpdate(match.request_id, 'matched');
    setRateTarget({
      requestId: match.request_id,
      requestTitle: match.request_title || `Talep #${match.request_id}`,
      targetAgentId: match.sender_agent_id,
      targetAgentName: match.sender_name || 'Danışman',
      targetOffice: match.sender_office,
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteRequest(id);
      setMyRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Talep silinemedi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'requests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Açtığım Talepler ({myRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'incoming'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gelen Portföy Eşleşmeleri ({incoming.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'outgoing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gönderdiğim Eşleşmeler ({outgoing.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-5 bg-slate-100 rounded w-1/3" />
          <div className="h-14 bg-slate-100 rounded" />
          <div className="h-14 bg-slate-100 rounded" />
        </div>
      ) : activeTab === 'requests' ? (
        myRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-1">
              Henüz alıcı talebi oluşturmadınız
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              Müşterilerinizin aradığı mülk özelliklerini sisteme girerek portföy sahibi
              meslektaşlarınızdan teklif alabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/panel/yeni-talep')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              İlk Alıcı Talebini Oluştur
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3.5 px-5">Talep ve Lokasyon</th>
                    <th className="py-3.5 px-5">Bütçe</th>
                    <th className="py-3.5 px-5">Durum</th>
                    <th className="py-3.5 px-5 text-right">Bildirim</th>
                    <th className="py-3.5 px-5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70">
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(req.id)}
                          className="font-medium text-slate-900 hover:text-blue-700 text-left"
                        >
                          {req.title}
                        </button>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.city} / {req.district} / {req.neighborhood} ·{' '}
                          {formatRelativeDateTR(req.created_at)}
                        </p>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatBudgetRange(req.budget_min, req.budget_max)}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <select
                          aria-label={`${req.title} durumu`}
                          value={req.status}
                          onChange={(e) =>
                            handleStatusUpdate(
                              req.id,
                              e.target.value as 'active' | 'matched' | 'closed'
                            )
                          }
                          className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        >
                          <option value="active">Aktif</option>
                          <option value="matched">Eşleşti</option>
                          <option value="closed">Kapatıldı</option>
                        </select>
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {req.match_count || 0}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(req.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100"
                          >
                            Detay
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
                            aria-label={`'${req.title}' talebini sil`}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
            Henüz taleplerinize meslektaşlarınızdan gelen portföy eşleşme bildirimi yok.
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((m) => {
              const isCompleted = m.request_status === 'matched' || m.request_status === 'closed';
              return (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">
                      Talep: <span className="font-medium text-slate-800">{m.request_title}</span> (
                      {m.request_city} / {m.request_district}) · {formatRelativeDateTR(m.created_at)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold text-slate-900">
                        {m.sender_name} · {m.sender_office}
                      </p>
                      <TrustBadge
                        compact
                        ratingAvg={m.sender_rating_avg}
                        reviewCount={m.sender_review_count}
                        completedDeals={m.sender_completed_deals}
                      />
                    </div>
                    <p className="text-sm text-slate-700">{m.message}</p>
                    {m.portfolio_ref && (
                      <p className="font-mono text-xs text-slate-500">
                        Portföy Kodu: {m.portfolio_ref}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <a
                      href={toTelHref(m.sender_phone)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{m.sender_phone}</span>
                    </a>

                    {isCompleted ? (
                      m.my_given_rating ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                          Puan Verildi ({m.my_given_rating}/5)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setRateTarget({
                              requestId: m.request_id,
                              requestTitle: m.request_title || `Talep #${m.request_id}`,
                              targetAgentId: m.sender_agent_id,
                              targetAgentName: m.sender_name || 'Danışman',
                              targetOffice: m.sender_office,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0"
                        >
                          <Award className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Danışmanı Puanla</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkMatchedAndRate(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg whitespace-nowrap shrink-0"
                      >
                        <Award className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Eşleşti İşaretle & Puanla</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(m.request_id)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Talebi İncele
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          Henüz başka bir meslektaşınızın alıcı talebine portföy bildirimi göndermediniz.
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.map((m) => {
            const isCompleted = m.request_status === 'matched' || m.request_status === 'closed';
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500">
                    {m.request_city} / {m.request_district} / {m.request_neighborhood} ·{' '}
                    {formatRelativeDateTR(m.created_at)}
                  </p>
                  <p className="font-display text-base font-semibold text-slate-900">
                    {m.request_title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>Talep Sahibi: {m.request_agent_name}</span>
                    <TrustBadge
                      compact
                      ratingAvg={m.request_agent_rating_avg}
                      reviewCount={m.request_agent_review_count}
                      completedDeals={m.request_agent_completed_deals}
                    />
                  </div>
                  <p className="text-sm text-slate-700 pt-1">{m.message}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  {m.request_agent_phone && (
                    <a
                      href={toTelHref(m.request_agent_phone)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{m.request_agent_phone}</span>
                    </a>
                  )}
                  {isCompleted && m.request_agent_id && (
                    m.my_given_rating ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                        Puan Verildi ({m.my_given_rating}/5)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setRateTarget({
                            requestId: m.request_id,
                            requestTitle: m.request_title || `Talep #${m.request_id}`,
                            targetAgentId: m.request_agent_id!,
                            targetAgentName: m.request_agent_name || 'Talep Sahibi',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0"
                      >
                        <Award className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Talep Sahibini Puanla</span>
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedRequestId(m.request_id)}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Talebi Gör
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RequestDetailModal
        requestId={selectedRequestId}
        currentUser={user}
        onClose={() => setSelectedRequestId(null)}
        onUpdated={loadData}
      />

      {rateTarget && (
        <RateAgentModal
          requestId={rateTarget.requestId}
          requestTitle={rateTarget.requestTitle}
          targetAgentId={rateTarget.targetAgentId}
          targetAgentName={rateTarget.targetAgentName}
          targetOffice={rateTarget.targetOffice}
          onClose={() => setRateTarget(null)}
          onSubmitted={async () => {
            setRateTarget(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
