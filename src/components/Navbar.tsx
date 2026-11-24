import type { AgentUser } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  user: AgentUser | null;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function Navbar({ user, onNavigate, currentPath }: NavbarProps) {
  const isLanding = currentPath === '/';

  const handleAnchorOrRoute = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    if (!isLanding) {
      onNavigate('/');
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <BrandLogo size="md" />
        </a>

        <nav
          aria-label="Ana gezinme"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
        >
          <a
            href="#nasil-calisir"
            onClick={(e) => handleAnchorOrRoute(e, 'nasil-calisir')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Nasıl Çalışır
          </a>
          <a
            href="#ozellikler"
            onClick={(e) => handleAnchorOrRoute(e, 'ozellikler')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Özellikler
          </a>
          <a
            href="#canli-talepler"
            onClick={(e) => handleAnchorOrRoute(e, 'canli-talepler')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Canlı Talepler
          </a>
          <a
            href="#myk-dogrulama"
            onClick={(e) => handleAnchorOrRoute(e, 'myk-dogrulama')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            MYK Doğrulama
          </a>
          <a
            href="/on-talep"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/on-talep');
            }}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentPath === '/on-talep' ? 'text-blue-700 font-semibold' : ''
            }`}
          >
            Ön Talep Formu
          </a>
        </nav>

        <div className="shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() =>
                onNavigate(user.status === 'approved' || user.role === 'admin' ? '/panel' : '/onay-bekleniyor')
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Panele Git
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/giris')}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Emlakçı Girişi
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
