import { useCallback, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from './api/client';
import { AppShell, type AppToast } from './components/AppShell';
import { BrandLogo } from './components/BrandLogo';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { LandingPage } from './pages/LandingPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { PreRequestPage } from './pages/PreRequestPage';
import { ProfilePage } from './pages/ProfilePage';
import { RequestsFeedPage } from './pages/RequestsFeedPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import type { AgentUser, PublicPlatformConfig } from './types';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '') return '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export default function App() {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [user, setUser] = useState<AgentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState<AppToast | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicPlatformConfig>({
    platform_announcement: '',
    allow_registrations: true,
    support_phone: '0850 300 00 00',
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refreshPublicConfig = useCallback(() => {
    api
      .getPublicConfig()
      .then((cfg) => setPublicConfig(cfg))
      .catch(() => {});
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const clean = normalizePath(nextPath);
    if (window.location.pathname !== clean) {
      window.history.pushState({}, '', clean);
    }
    setPath(clean);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    refreshPublicConfig();
  }, [refreshPublicConfig]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setBooting(false);
      });
  }, []);

  const handleAuthenticated = (authedUser: AgentUser) => {
    setUser(authedUser);
    if (authedUser.status === 'approved' || authedUser.role === 'admin') {
      navigate('/panel');
    } else {
      navigate('/onay-bekleniyor');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/');
  };

  const handleUserUpdated = (updated: AgentUser) => {
    setUser(updated);
    if (
      (updated.status === 'approved' || updated.role === 'admin') &&
      path === '/onay-bekleniyor'
    ) {
      navigate('/panel');
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <BrandLogo size="lg" />
        <div className="text-sm text-slate-500">Yükleniyor...</div>
      </div>
    );
  }

  // Public / Marketing / Auth Routes
  if (path === '/') {
    return (
      <>
        <Navbar user={user} currentPath={path} onNavigate={navigate} />
        <LandingPage user={user} onNavigate={navigate} />
      </>
    );
  }

  if (path === '/on-talep') {
    return (
      <>
        <Navbar user={user} currentPath={path} onNavigate={navigate} />
        <PreRequestPage standalone onNavigate={navigate} />
      </>
    );
  }

  if (path === '/giris' || path === '/kayit') {
    if (user) {
      const target =
        user.status === 'approved' || user.role === 'admin' ? '/panel' : '/onay-bekleniyor';
      return (
        <>
          <Navbar user={user} currentPath={path} onNavigate={navigate} />
          <div className="max-w-lg mx-auto mt-16 p-6 bg-white border border-slate-200 rounded-xl text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-slate-900">
              Oturumunuz Açık ({user.full_name})
            </h1>
            <button
              type="button"
              onClick={() => navigate(target)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Devam Et
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <Navbar user={user} currentPath={path} onNavigate={navigate} />
        <AuthPage
          mode={path === '/kayit' ? 'register' : 'login'}
          onNavigate={navigate}
          onAuthenticated={handleAuthenticated}
        />
      </>
    );
  }

  // Require auth for all protected routes below
  if (!user) {
    return (
      <>
        <Navbar user={null} currentPath="/giris" onNavigate={navigate} />
        <AuthPage mode="login" onNavigate={navigate} onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  // Gate unapproved agents behind MYK Pending Approval screen
  if (user.status !== 'approved' && user.role !== 'admin') {
    return (
      <>
        <Navbar user={user} currentPath="/onay-bekleniyor" onNavigate={navigate} />
        <PendingApprovalPage
          user={user}
          onUserUpdated={handleUserUpdated}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // Authenticated & MYK Approved SaaS Workspace
  const activePanelPath = path.startsWith('/panel') ? path : '/panel';

  let pageTitle = 'Alıcı Talepleri Havuzu';
  let breadcrumb = 'Alıcı Talepleri';
  let content: React.ReactNode = <RequestsFeedPage user={user} onNavigate={navigate} />;

  if (activePanelPath === '/panel/yeni-talep') {
    pageTitle = 'Yeni Alıcı Talebi Oluştur';
    breadcrumb = 'Talep Oluştur';
    content = (
      <CreateRequestPage
        user={user}
        onCreated={(created) => {
          setToast({
            id: Date.now(),
            title: 'Alıcı talebi başarıyla oluşturuldu!',
            message: `"${created.title}" (#${created.id}) talebiniz yayına alındı ve MYK onaylı danışmanlarla paylaşıldı.`,
          });
          navigate('/panel');
        }}
        onCancel={() => navigate('/panel')}
      />
    );
  } else if (activePanelPath === '/panel/taleplerim') {
    pageTitle = 'Taleplerim ve Portföy Eşleşmeleri';
    breadcrumb = 'Taleplerim';
    content = <MyRequestsPage user={user} onNavigate={navigate} />;
  } else if (activePanelPath === '/panel/on-talep') {
    pageTitle = 'Ön Talep Formu';
    breadcrumb = 'Ön Talep Formu';
    content = <PreRequestPage standalone={false} onNavigate={navigate} />;
  } else if (activePanelPath === '/panel/profil') {
    pageTitle = 'Danışman Profili ve MYK Doğrulama';
    breadcrumb = 'Profil';
    content = <ProfilePage user={user} onUserUpdated={handleUserUpdated} />;
  } else if (activePanelPath === '/panel/yonetim' && user.role === 'admin') {
    pageTitle = 'Süper Admin Kontrol Merkezi';
    breadcrumb = 'Süper Admin';
    content = (
      <SuperAdminPage currentUserId={user.id} onConfigChanged={refreshPublicConfig} />
    );
  }

  return (
    <AppShell
      user={user}
      currentPath={activePanelPath}
      onNavigate={navigate}
      onLogout={handleLogout}
      title={pageTitle}
      breadcrumb={breadcrumb}
      announcement={publicConfig.platform_announcement}
      toast={toast}
      onDismissToast={() => setToast(null)}
    >
      {content}
    </AppShell>
  );
}
