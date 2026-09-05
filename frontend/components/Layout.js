import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const I = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  Opportunities: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 11.5L6 7.5L9 10.5L14 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 5H14V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  DNA: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 2C5 2 5 6 8 8C11 10 11 14 11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M11 2C11 2 11 6 8 8C5 10 5 14 5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Experiment: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2V7L2.5 12.5C2.2 13 2.5 13.8 3.1 13.9H12.9C13.5 13.8 13.8 13 13.5 12.5L10 7V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="5" y1="2" x2="11" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  ROI: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 10L7 8L9 9.5L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lab: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8H12M4 11H12M8 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2H2.5C2 2 1.5 2.5 1.5 3V11C1.5 11.5 2 12 2.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9.5 9.5L12.5 7L9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1V2.5M7.5 12.5V14M1 7.5H2.5M12.5 7.5H14M3.05 3.05L4.11 4.11M10.89 10.89L11.95 11.95M3.05 11.95L4.11 10.89M10.89 4.11L11.95 3.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Moon: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 9.5A6 6 0 015.5 2a6 6 0 000 11 6 6 0 007.5-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const NAV = [
  { label: 'Dashboard',     href: '/',             Icon: I.Dashboard },
  { label: 'Opportunities', href: '/opportunities', Icon: I.Opportunities },
  { label: 'Failure DNA',   href: '/failure-dna',  Icon: I.DNA },
  { label: 'Experiment',    href: '/experiment',   Icon: I.Experiment },
  { label: 'ROI Proof',     href: '/proof',        Icon: I.ROI },
  { label: 'Failure Lab',   href: '/failure-lab',  Icon: I.Lab },
];

// ── Theme CSS variables injected globally ─────────────────────────────────────
const THEME_STYLE = `
  :root,[data-theme="dark"] {
    --c-base:    #080f1a;
    --c-surface: #0d1826;
    --c-line:    #1e2d3d;
    --c-line2:   #253447;
    --c-primary: #f1f5f9;
    --c-secondary:#94a3b8;
    --c-muted:   #475569;
    --c-faint:   #334155;
    --c-brand:   #10b981;
    --c-brand-bg:#10b981;
    --c-hover:   #0d1826;
    --c-active-bg:rgba(16,185,129,0.1);
  }
  [data-theme="light"] {
    --c-base:    #f0f7f4;
    --c-surface: #ffffff;
    --c-line:    #d4e8e0;
    --c-line2:   #b8d4c8;
    --c-primary: #1a3329;
    --c-secondary:#4a7c65;
    --c-muted:   #7aaa92;
    --c-faint:   #aaccbb;
    --c-brand:   #059669;
    --c-brand-bg:#059669;
    --c-hover:   #e8f5f0;
    --c-active-bg:rgba(5,150,105,0.1);
  }
  * { transition: background-color 280ms cubic-bezier(.4,0,.2,1), border-color 280ms cubic-bezier(.4,0,.2,1); }
  .no-transition, .no-transition * { transition: none !important; }
`;

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [backendLive, setBackendLive] = useState(false);
  const [theme,       setTheme]       = useState('dark');

  // Inject theme CSS once
  useEffect(() => {
    if (!document.getElementById('rv-theme')) {
      const s = document.createElement('style');
      s.id = 'rv-theme';
      s.textContent = THEME_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('rv-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rv-theme', theme);
  }, [theme]);

  // Backend health
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:8001/health', { signal: AbortSignal.timeout(3000) });
        setBackendLive(r.ok);
      } catch { setBackendLive(false); }
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [router.pathname]);

  const currentPage = NAV.find(n =>
    n.href === '/' ? router.pathname === '/' : router.pathname.startsWith(n.href)
  );

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'T';
  const displayName = user?.name || 'Tejas';
  const merchantShort = user?.merchant
    ? user.merchant.length > 18 ? user.merchant.slice(0, 18) + '…' : user.merchant
    : 'Acme Payments';

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = ({ forceFull = false }) => {
    const full = forceFull || !collapsed;
    const w    = full ? 'w-[224px]' : 'w-[64px]';

    return (
      <div
        className={`flex flex-col h-full border-r transition-[width] duration-200 ease-out ${w}`}
        style={{ background: 'var(--c-base)', borderColor: 'var(--c-line)' }}
      >
        {/* Logo */}
        <div
          className={`flex items-center flex-shrink-0 border-b ${full ? 'px-5 py-5 gap-3' : 'justify-center py-5'}`}
          style={{ borderColor: 'var(--c-line)' }}
        >
          <div className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            style={{ background: 'var(--c-brand)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="white" opacity="0.35"/>
            </svg>
          </div>
          {full && (
            <div className="leading-none overflow-hidden">
              <div>
                <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--c-primary)' }}>Revenue</span>
                <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--c-brand)' }}>OS</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--c-faint)' }}>AI Recovery Platform</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV.map(({ label, href, Icon }) => {
            const active = href === '/'
              ? router.pathname === '/'
              : router.pathname.startsWith(href);
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={`flex items-center h-10 rounded-lg transition-colors duration-150 relative ${full ? 'gap-3 px-3' : 'justify-center'}`}
                  style={active
                    ? { background: 'var(--c-active-bg)', color: 'var(--c-brand)' }
                    : { color: 'var(--c-muted)' }
                  }
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.color = 'var(--c-secondary)'; }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--c-muted)'; } }}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--c-brand)' }} />}
                  <div className="flex-shrink-0"><Icon /></div>
                  {full && <span className="text-[13px] font-medium flex-1">{label}</span>}
                  {full && active && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" opacity="0.4">
                      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </Link>
                {/* Collapsed tooltip */}
                {!full && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                    style={{ background: 'var(--c-line2)', color: 'var(--c-primary)', border: '1px solid var(--c-line2)' }}>
                    {label}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: 'var(--c-line2)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--c-line)' }}>

          {full ? (
            <div className="px-4 py-3 space-y-2">

              {/* User card */}
              <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)' }}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-bold"
                  style={{ background: 'var(--c-active-bg)', color: 'var(--c-brand)', border: '1.5px solid var(--c-brand)', opacity: 0.9 }}>
                  {initial}
                </div>
                {/* Name + merchant */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'var(--c-primary)' }}>{displayName}</p>
                  <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: 'var(--c-muted)' }}>{merchantShort}</p>
                </div>
                {/* Logout button */}
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  title="Sign out"
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 group/logout"
                  style={{ border: '1px solid var(--c-line2)', color: 'var(--c-faint)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--c-faint)'; e.currentTarget.style.borderColor = 'var(--c-line2)'; }}
                >
                  <I.Logout />
                </button>
              </div>

              {/* Bottom row: API status + theme toggle */}
              <div className="flex items-center justify-between px-1">
                {/* API status */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${backendLive ? 'bg-[#10b981]' : 'bg-[#334155]'}`}
                    style={backendLive ? { boxShadow: '0 0 5px rgba(16,185,129,0.5)' } : {}} />
                  <span className="text-[10px]" style={{ color: 'var(--c-faint)' }}>
                    {backendLive ? 'API connected' : 'API offline'}
                  </span>
                </div>

                {/* Theme toggle */}
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--c-muted)' }}>
                    {theme === 'dark' ? <I.Sun /> : <I.Moon />}
                  </span>
                  <button
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    className="relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0"
                    style={{ background: theme === 'light' ? 'var(--c-brand)' : 'var(--c-line2)' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                      style={{ transform: theme === 'light' ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>

              {/* Version */}
              <p className="text-[10px] font-mono px-1" style={{ color: 'var(--c-line2)' }}>v1.0.0</p>

            </div>
          ) : (
            /* Collapsed footer */
            <div className="flex flex-col items-center gap-3 py-3">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold cursor-pointer"
                  style={{ background: 'var(--c-active-bg)', color: 'var(--c-brand)', border: '1.5px solid var(--c-brand)', opacity: 0.9 }}
                  onClick={() => { logout(); router.push('/login'); }}
                  title="Sign out"
                >
                  {initial}
                </div>
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                  style={{ background: 'var(--c-line2)', color: 'var(--c-primary)', border: '1px solid var(--c-line2)' }}>
                  {displayName} · Sign out
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: 'var(--c-line2)' }} />
                </div>
              </div>
              {/* Status dot */}
              <span className={`w-1.5 h-1.5 rounded-full ${backendLive ? 'bg-[#10b981]' : 'bg-[#334155]'}`} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--c-base)', color: 'var(--c-primary)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar forceFull />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center justify-between h-14 px-6 border-b"
          style={{ background: 'var(--c-base)', borderColor: 'var(--c-line)' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--c-muted)' }}
              onClick={() => setMobileOpen(!mobileOpen)}>
              <I.Menu />
            </button>
            <button
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150"
              style={{ color: 'var(--c-muted)' }}
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.color = 'var(--c-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--c-muted)'; }}
            >
              {collapsed ? <I.ChevronRight /> : <I.ChevronLeft />}
            </button>
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="font-medium" style={{ color: 'var(--c-faint)' }}>RevenueOS</span>
              <span style={{ color: 'var(--c-line2)' }}>/</span>
              <span className="font-medium" style={{ color: 'var(--c-secondary)' }}>{currentPage?.label ?? 'Page'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {backendLive ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--c-active-bg)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-brand)' }} />
                <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--c-brand)' }}>Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(51,65,85,0.1)', border: '1px solid rgba(51,65,85,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                <span className="text-[11px] font-semibold tracking-widest uppercase text-[#475569]">Offline</span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--c-base)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
