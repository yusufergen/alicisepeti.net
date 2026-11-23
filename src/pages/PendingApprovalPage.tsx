import { useState } from 'react';
import { Clock, FileText, LogOut, RefreshCw, ShieldAlert, Upload } from 'lucide-react';
import { api, getProtectedDocUrl } from '../api/client';
import { AgentAvatar } from '../components/AgentAvatar';
import type { AgentUser } from '../types';

interface PendingApprovalPageProps {
  user: AgentUser;
  onUserUpdated: (user: AgentUser) => void;
  onLogout: () => void;
}

export function PendingApprovalPage({
  user,
  onUserUpdated,
  onLogout,
}: PendingApprovalPageProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [mykNumber, setMykNumber] = useState(user.myk_number);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isRejected = user.status === 'rejected';
  const docUrl = getProtectedDocUrl(user.myk_doc_path);
  const isImageDoc =
    user.myk_doc_mime.startsWith('image/') || /\.(svg|png|jpg|jpeg|webp)$/i.test(user.myk_doc_path);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await api.me();
      onUserUpdated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum kontrol edilemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReupload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) {
      setError('Lütfen yeni MYK belgenizi seçin.');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('myk_number', mykNumber);
      fd.append('myk_document', newFile);
      const res = await api.reuploadMyk(fd);
      onUserUpdated(res.user);
      setNewFile(null);
      setSuccess('Yeni MYK belgeniz yüklendi ve yeniden ön onay sırasına alındı.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                  isRejected ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isRejected ? (
                  <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Clock className="w-6 h-6" aria-hidden="true" />
                )}
              </div>
              <div>
                <p
                  className={`text-xs font-semibold mb-1 ${
                    isRejected ? 'text-red-700' : 'text-amber-700'
                  }`}
                >
                  {isRejected ? 'MYK Başvurusu Reddedildi' : 'MYK Belgeniz Ön Onay Bekliyor'}
                </p>
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {isRejected
                    ? 'Belgenizi güncelleyip yeniden gönderebilirsiniz'
                    : 'Başvurunuz doğrulama kurulu incelemesinde'}
                </h1>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {isRejected
                    ? `Red Gerekçesi: ${user.rejection_reason}`
                    : 'Güvenli ve kapalı devre bir meslek ağı için alıcı talepleri ile danışman telefonları yalnızca MYK Seviye 5 ön onayı tamamlanan üyelere açılır.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Durumu Kontrol Et</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-5 p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-1">
                <AgentAvatar name={user.full_name} avatarPath={user.avatar_path} size="md" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    Başvuru Bilgileriniz
                  </h2>
                  <p className="text-xs text-slate-500">{user.office_name}</p>
                </div>
              </div>
              <div className="space-y-2 text-slate-600">
                <p>
                  <span className="text-slate-400">Ad Soyad: </span>
                  <span className="font-medium text-slate-900">{user.full_name}</span>
                </p>
                <p>
                  <span className="text-slate-400">Ofis: </span>
                  <span className="font-medium text-slate-900">{user.office_name}</span>
                </p>
                <p>
                  <span className="text-slate-400">Şehir: </span>
                  <span className="font-medium text-slate-900">
                    {user.city}
                    {user.district ? ` / ${user.district}` : ''}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Telefon: </span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {user.phone}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">MYK Belge No: </span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {user.myk_number || 'Belge Yüklendi'}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 mb-2">
                Yüklenen MYK Belgesi
              </h2>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                {isImageDoc ? (
                  <img
                    src={docUrl}
                    alt="Yüklenen MYK Belgesi"
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
                    Belgeyi Aç
                  </a>
                </div>
              </div>
            </div>
          </div>

          {isRejected && (
            <form onSubmit={handleReupload} className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                MYK Belgesini Yeniden Yükle
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reupload-myk-no"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    MYK Belge Numarası (Opsiyonel)
                  </label>
                  <input
                    id="reupload-myk-no"
                    type="text"
                    value={mykNumber}
                    onChange={(e) => setMykNumber(e.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full h-10 px-3 font-mono text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reupload-myk-file"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Yeni Belge (PDF / JPG / PNG)
                  </label>
                  <label
                    htmlFor="reupload-myk-file"
                    className="h-10 px-3 border border-slate-300 rounded-lg flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{newFile ? newFile.name : 'Dosya seçin'}</span>
                  </label>
                  <input
                    id="reupload-myk-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                {uploading ? 'Yükleniyor...' : 'Güncellenmiş Belgeyi Gönder'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
