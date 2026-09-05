import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router   = useRouter();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [shake, setShake]             = useState(false);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); triggerShake(); return; }
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) { router.push('/'); }
      else { setError(res.error || 'Invalid credentials.'); triggerShake(); }
    } catch { setError('Network error. Is the backend running?'); triggerShake(); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#080f1a]">

      {/* ── Left panel — brand ────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-[#080f1a] border-r border-[#1e2d3d] px-16 py-12 relative overflow-hidden">

        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#10b981]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/6 w-48 h-48 bg-[#10b981]/8 rounded-full blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <div className="leading-none">
            <span className="text-[16px] font-bold text-[#f1f5f9]">Revenue</span>
            <span className="text-[16px] font-bold text-[#10b981]">OS</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-[42px] font-extrabold text-[#f1f5f9] leading-tight tracking-tight">
              Recover revenue.<br />
              <span className="text-[#10b981]">Automatically.</span>
            </h1>
            <p className="text-[16px] text-[#475569] leading-relaxed max-w-sm">
              AI-powered payment recovery that outperforms fixed-retry by 10× — with full audit trails and policy controls.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              'Recover failed payments automatically with ML',
              '10× more revenue than fixed-retry baseline',
              'Policy-controlled, audit-trailed decisions',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[14px] text-[#94a3b8]">{item}</span>
              </div>
            ))}
          </div>

          {/* Stat pill */}
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
            <span className="text-[22px] font-bold font-mono text-[#10b981]">₹8.6L</span>
            <span className="text-[13px] text-[#475569]">incremental revenue recovered in demo experiment</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-[#1e2d3d] relative z-10">© 2026 RevenueOS · Razorpay AI Buildathon</p>
      </div>

      {/* ── Right panel — form ────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#080f1a]">
        <div
          className="w-full max-w-md space-y-7"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease-out, transform 400ms ease-out',
          }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-[#10b981] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-bold text-[#f1f5f9]">Revenue<span className="text-[#10b981]">OS</span></span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-[28px] font-bold text-[#f1f5f9] tracking-tight">Welcome back</h2>
            <p className="text-[14px] text-[#475569] mt-1">Sign in to your RevenueOS account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#94a3b8]">Email address</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#334155] pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M1 3.5L7.5 8.5L14 3.5M1 3.5V11.5H14V3.5M1 3.5H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tejas@acme.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0d1826] border border-[#1e2d3d] text-[#f1f5f9] text-[14px] placeholder:text-[#334155] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-150"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#94a3b8]">Password</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#334155] pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="2" y="6" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-lg bg-[#0d1826] border border-[#1e2d3d] text-[#f1f5f9] text-[14px] placeholder:text-[#334155] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#64748b] transition-colors"
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M1 8C1 8 3 4 7.5 4S14 8 14 8S12 12 7.5 12S1 8 1 8Z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="7.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M2 2L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M1 8C1 8 3 4 7.5 4S14 8 14 8S12 12 7.5 12S1 8 1 8Z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="7.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-400"
                style={{ animation: shake ? 'shake 0.4s ease-in-out' : 'none' }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-[14px] font-semibold active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="px-4 py-3 rounded-lg bg-[#0d1826] border border-[#1e2d3d]">
            <p className="text-[11px] text-[#334155] font-mono">
              Demo: <span className="text-[#475569]">demo@revenueos.in</span> · <span className="text-[#475569]">Demo@2025</span>
            </p>
          </div>

          {/* Sign up link */}
          <p className="text-center text-[13px] text-[#475569]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#10b981] hover:text-[#0ea472] font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>

    </div>
  );
}
