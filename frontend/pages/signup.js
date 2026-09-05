import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

function Field({ label, type = 'text', value, onChange, placeholder, icon, error, right }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-[#94a3b8]">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#334155] pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${right ? 'pr-11' : 'pr-4'} py-3 rounded-lg bg-[#0d1826] border text-[#f1f5f9] text-[14px] placeholder:text-[#334155] focus:outline-none focus:ring-2 transition-all duration-150 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-[#1e2d3d] focus:border-[#10b981] focus:ring-[#10b981]/20'}`}
        />
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const router     = useRouter();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [merchant, setMerchant]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [fieldErr, setFieldErr]   = useState({});
  const [shake, setShake]         = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const validate = () => {
    const e = {};
    if (!name.trim())       e.name     = 'Name is required.';
    if (!email.includes('@')) e.email  = 'Enter a valid email.';
    if (!merchant.trim())   e.merchant = 'Merchant name is required.';
    if (password.length < 8) e.password = 'Min 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    setFieldErr(e);
    return Object.keys(e).length === 0;
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) { triggerShake(); return; }
    setLoading(true);
    try {
      const res = await signup(name, email, password, merchant);
      if (res.success) { router.push('/'); }
      else { setError(res.error || 'Signup failed.'); triggerShake(); }
    } catch { setError('Network error. Is the backend running?'); triggerShake(); }
    finally { setLoading(false); }
  };

  const EyeIcon = ({ open }) => open ? (
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
  );

  return (
    <div className="min-h-screen w-full flex bg-[#080f1a]">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-[#080f1a] border-r border-[#1e2d3d] px-16 py-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#10b981]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/6 w-48 h-48 bg-[#10b981]/8 rounded-full blur-[60px] pointer-events-none" />

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

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-[42px] font-extrabold text-[#f1f5f9] leading-tight tracking-tight">
              Start recovering<br />
              <span className="text-[#10b981]">revenue today.</span>
            </h1>
            <p className="text-[16px] text-[#475569] leading-relaxed max-w-sm">
              Set up your account in 30 seconds and see your first recovery opportunities immediately.
            </p>
          </div>
          <div className="space-y-4">
            {['No credit card required for demo', 'Full access to all AI recovery features', 'See results in under 5 minutes'].map((item, i) => (
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
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
            <span className="text-[22px] font-bold font-mono text-[#10b981]">10×</span>
            <span className="text-[13px] text-[#475569]">better recovery than fixed-retry baseline</span>
          </div>
        </div>

        <p className="text-[11px] text-[#1e2d3d] relative z-10">© 2026 RevenueOS · Razorpay AI Buildathon</p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#080f1a] overflow-y-auto">
        <div
          className="w-full max-w-md space-y-6"
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

          <div>
            <h2 className="text-[28px] font-bold text-[#f1f5f9] tracking-tight">Create your account</h2>
            <p className="text-[14px] text-[#475569] mt-1">Start recovering failed payments today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name" value={name} onChange={setName} placeholder="Tejas Sharma" error={fieldErr.name}
              icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 13c0-3.314 2.462-5.5 5.5-5.5S13 9.686 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <Field label="Work email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" error={fieldErr.email}
              icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 3.5L7.5 8.5L14 3.5M1 3.5V11.5H14V3.5M1 3.5H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <Field label="Merchant / Company name" value={merchant} onChange={setMerchant} placeholder="Acme Payments Pvt Ltd" error={fieldErr.merchant}
              icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3.5V2.5a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <Field label="Password" type={showPwd ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Min 8 characters" error={fieldErr.password}
              icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="6" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              right={<button type="button" onClick={() => setShowPwd(p => !p)} className="text-[#334155] hover:text-[#64748b] transition-colors"><EyeIcon open={showPwd} /></button>}
            />
            <Field label="Confirm password" type={showCfm ? 'text' : 'password'} value={confirm} onChange={setConfirm} placeholder="••••••••" error={fieldErr.confirm}
              icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="6" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              right={<button type="button" onClick={() => setShowCfm(p => !p)} className="text-[#334155] hover:text-[#64748b] transition-colors"><EyeIcon open={showCfm} /></button>}
            />

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-400"
                style={{ animation: shake ? 'shake 0.4s ease-in-out' : 'none' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-[14px] font-semibold active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Creating account...</>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#475569]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#10b981] hover:text-[#0ea472] font-medium transition-colors">Sign in</Link>
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
