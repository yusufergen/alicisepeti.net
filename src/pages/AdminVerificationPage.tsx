import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, FileText, X, XCircle } from 'lucide-react';
import { api, getProtectedDocUrl } from '../api/client';
import { AgentAvatar } from '../components/AgentAvatar';
import type { AgentUser } from '../types';
import { formatRelativeDateTR } from '../utils/domain';

export function AdminVerificationPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectingAgent, setInspectingAgent] = useState<AgentUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminAgents('all');
      setAgents(res.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const filteredAgents =
    statusFilter === 'all' ? agents : agents.filter((a) => a.status === statusFilter);

  const pendingCount = agents.filter((a) => a.status === 'pending').length;

  const handleDecision = async (
    agentId: number,
    decision: 'approved' | 'rejected',
    reason = ''
  ) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.updateAgentStatus(agentId, {
        status: decision,
        rejection_reason: reason,
      });
      setAgents((prev) => prev.map((a) => (a.id === agentId ? res.agent : a)));
      setInspectingAgent(null);
      setRejectionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onay durumu güncellenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: `Tümü (${agents.length})` },
              { id: 'pending', label: `Bekleyenler (${pendingCount})` },
              {
                id: 'approved',
                label: `Onaylı (${agents.filter((a) => a.status === 'approved').length})`,
              },
              {
                id: 'rejected',
                label: `Reddedilen (${agents.filter((a) => a.status === 'rejected').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-5 bg-slate-100 rounded w-1/4" />
          <div className="h-12 bg-slate-100 rounded" />
          <div className="h-12 bg-slate-100 rounded" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          Seçili kategoride MYK başvurusu bulunmuyor.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3.5 px-5">Emlakçı / Ofis</th>
                  <th className="py-3.5 px-5">MYK Belge No</th>
                  <th className="py-3.5 px-5">Telefon / İl</th>
                  <th className="py-3.5 px-5">Durum</th>
                  <th className="py-3.5 px-5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAgents.map((agent) => {
                  const statusText =
                    agent.status === 'approved'
                      ? 'Ön Onaylı'
                      : agent.status === 'rejected'
                        ? 'Reddedildi'
                        : 'Ön Onay Bekliyor';
                  const statusColor =
                    agent.status === 'approved'
                      ? 'text-emerald-700'
                      : agent.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-amber-700';

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/70">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <AgentAvatar
                            name={agent.full_name}
                            avatarPath={agent.avatar_path}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{agent.full_name}</p>
                            <p className="text-xs text-slate-500">
                              {agent.office_name} · {formatRelativeDateTR(agent.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-slate-800 tabular-nums">
                        {agent.myk_number || 'Belge Yüklendi'}
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-700">
                        <p className="font-mono tabular-nums">{agent.phone}</p>
                        <p className="text-slate-500">{agent.city}</p>
                      </td>
                      <td className={`py-4 px-5 text-xs font-semibold whitespace-nowrap ${statusColor}`}>
                        {statusText}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingAgent(agent);
                              setRejectionReason('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-md"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Belgeyi İncele</span>
                          </button>
                          {agent.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleDecision(agent.id, 'approved')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Onayla</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inspectingAgent && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="myk-inspect-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AgentAvatar
                  name={inspectingAgent.full_name}
                  avatarPath={inspectingAgent.avatar_path}
                  size="md"
                />
                <div>
                  <h2 id="myk-inspect-title" className="font-display text-lg font-semibold text-slate-900">
                    MYK Belge İnceleme — {inspectingAgent.full_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {inspectingAgent.office_name} · {inspectingAgent.city}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAgent(null)}
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
                    {inspectingAgent.myk_number || 'Belge Yüklendi'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Yetki Belgesi (TTBS)</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {inspectingAgent.ttbs_number || 'Girilmedi'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                {inspectingAgent.myk_doc_mime.startsWith('image/') ||
                /\.(svg|png|jpg|jpeg|webp)$/i.test(inspectingAgent.myk_doc_path) ? (
                  <img
                    src={getProtectedDocUrl(inspectingAgent.myk_doc_path)}
                    alt={`${inspectingAgent.full_name} MYK Belgesi`}
                    className="w-full max-h-72 object-contain bg-white border border-slate-200 rounded mb-2"
                  />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center bg-white border border-slate-200 rounded mb-2">
                    <FileText className="w-8 h-8 text-blue-700 mb-1" />
                    <span className="text-xs text-slate-600">{inspectingAgent.myk_doc_name}</span>
                  </div>
                )}
                <a
                  href={getProtectedDocUrl(inspectingAgent.myk_doc_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Belgeyi Tam Boyut Aç ({inspectingAgent.myk_doc_name})
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
                    placeholder="Örn: Yüklenen belge okunaklı değil veya MYK Seviye 5 numarası uyuşmuyor."
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDecision(inspectingAgent.id, 'rejected', rejectionReason)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reddet</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDecision(inspectingAgent.id, 'approved')}
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
      )}
    </div>
  );
}
