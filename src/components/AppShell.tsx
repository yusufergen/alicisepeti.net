import { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FolderCheck,
  Handshake,
  LayoutGrid,
  LogOut,
  MailPlus,
  Megaphone,
  Menu,
  Plus,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import type { AgentUser } from '../types';
import { AgentAvatar } from './AgentAvatar';
import { BrandLogo } from './BrandLogo';

export interface AppToast {
  id: number;
  title: string;
  message: string;
}

interface AppShellProps {
  user: AgentUser;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  title: string;
  breadcrumb: string;
  announcement?: string;
  toast?: AppToast | null;
  onDismissToast?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  user,
  currentPath,
  onNavigate,
  onLogout,
  title,
  breadcrumb,
  announcement,
  toast,
  onDismissToast,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/panel', label: 'Alıcı Talepleri', icon: LayoutGrid },
    { path: '/panel/yeni-talep', label: 'Talep Oluştur', icon: Plus },
    { path: '/panel/taleplerim', label: 'Taleplerim ve Eşleşmeler', icon: FolderCheck },
    { path: '/panel/on-talep', label: 'Ön Talep Formu', icon: MailPlus },
    { path: '/panel/profil', label: 'Profil ve MYK', icon: UserCheck },
    ...(user.role === 'admin'
      ? [{ path: '/panel/yonetim', label: 'Süper Admin Paneli', icon: ShieldAlert }]
      : []),
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white border-r border-slate-200">
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
            className="whitespace-nowrap shrink-0"
          >
            <BrandLogo size="md" />
          </a>
        </div>

        <nav aria-label="Panel menüsü" className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="px-2 flex items-center gap-2.5">
            <AgentAvatar name={user.full_name} avatarPath={user.avatar_path} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.office_name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-emerald-700 truncate">
                {user.role === 'admin' ? 'MYK Onay Kurulu' : 'MYK Ön Onaylı Üye'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Menüyü kapat"
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobil panel menüsü" className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg text-left ${
                      isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">{user.full_name}</p>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menüyü aç"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                AlıcıSepeti / {breadcrumb}
              </p>
              <h1 className="font-display text-lg font-semibold text-slate-900 truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentPath !== '/panel/yeni-talep' && (
              <button
                type="button"
                onClick={() => handleNav('/panel/yeni-talep')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                <span>Alıcı Talebi Aç</span>
              </button>
            )}
          </div>
        </header>

        {/* Renkli Komisyon Uyarı Top Barı */}
        <div
          data-testid="commission-advisory-topbar"
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white px-4 sm:px-8 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs"
        >
          <Handshake className="w-4 h-4 shrink-0 text-amber-100" aria-hidden="true" />
          <p className="font-medium text-center">
            İletişime geçtiğiniz emlakçıyla önce komisyon oranında anlaşmanızı öneririz.
          </p>
        </div>

        {announcement && announcement.trim() && (
          <div
            data-testid="platform-announcement-banner"
            className="bg-blue-700 text-white px-4 sm:px-8 py-2.5 text-xs sm:text-sm flex items-center gap-2.5"
          >
            <Megaphone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{announcement}</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* Success Toaster / Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="success-toaster"
          className="fixed bottom-5 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-md bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="h-1 w-full bg-emerald-600" aria-hidden="true" />
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-slate-900">{toast.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            {onDismissToast && (
              <button
                type="button"
                onClick={onDismissToast}
                aria-label="Bildirimi kapat"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
