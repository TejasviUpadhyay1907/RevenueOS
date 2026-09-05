import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';

function Sk({ h = 'h-5' }) {
  return <div className={`${h} w-full rounded-lg bg-[#0d1826] animate-pulse`} />;
}

// Count-up hook
function useCountUp(target, duration = 1500) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!target || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export default function Proof() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [monthly, setMonthly]     = useState(10000000); // ₹1 Cr default
  const [rerunning, setRerunning] = useState(false);
  const [message, setMessage]     = useState(null);

  useEffect(() => {
    fetch('http://localhost:8001/api/v1/experiment/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      await fetch('http://localhost:8001/api/v1/experiment/run', { method: 'POST' });
      setMessage('Experiment started — check back in ~60 seconds.');
    } catch {}
    finally { setRerunning(false); }
  };

  const c    = data?.comparison || {};
  const b    = data?.baseline   || {};
  const r    = data?.revenueos  || {};
  const info = data?.experiment_info || {};

  const incremental     = c.incremental_recovered || 0;
  const multiplier      = c.relative_improvement_recovered || 0;
  const incrRate        = c.incremental_recovery_rate || 0;
  const netROI          = r.total_cost > 0 ? Math.round(((incremental - r.total_cost) / r.total_cost) * 100) : null;
  const returnMultiple  = r.total_cost > 0 ? Math.round(r.total_recovered / r.total_cost) : null;
  const attemptSaving   = b.total_attempts > 0 ? ((b.total_attempts - r.total_attempts) / b.total_attempts * 100).toFixed(1) : null;
  const contactSaving   = b.total_contacts > 0 ? ((b.total_contacts - (r.total_contacts || 0)) / b.total_contacts * 100).toFixed(1) : null;

  // Calculator
  const annualProjection = Math.round(monthly * incrRate * 12);

  const animatedIncremental = useCountUp(incremental, 2000);
  const animatedROI         = useCountUp(netROI || 0, 1800);

  const fmt    = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtCr  = (n) => {
    const v = Number(n || 0);
    if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + ' Cr';
    if (v >= 100000)   return '₹' + (v / 100000).toFixed(1) + ' L';
    return fmt(v);
  };

  // Bar widths
  const maxBar = Math.max(b.total_recovered || 0, r.total_recovered || 1);
  const baselineW = Math.round(((b.total_recovered || 0) / maxBar) * 100);
  const revenueosW = Math.round(((r.total_recovered || 0) / maxBar) * 100);

  const PRESETS = [
    { label: '₹1 Cr',  value: 10000000 },
    { label: '₹5 Cr',  value: 50000000 },
    { label: '₹10 Cr', value: 100000000 },
    { label: '₹25 Cr', value: 250000000 },
    { label: '₹50 Cr', value: 500000000 },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">

        {loading ? (
          <div className="space-y-5"><Sk h="h-48" /><Sk h="h-64" /></div>
        ) : !data ? (
          <div className="text-center py-20">
            <p className="text-[#475569] text-sm mb-4">No experiment data yet.</p>
            <button onClick={handleRerun} className="text-[12px] text-[#10b981] hover:text-[#0ea472] font-medium">Run experiment →</button>
          </div>
        ) : (
          <div className="space-y-12">

            {/* ── Hero ── */}
            <div className="text-center space-y-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#475569] font-semibold">Additional Revenue Recovered</p>
              <div className="inline-flex flex-col items-center gap-3 px-12 py-9 rounded-2xl bg-[#071a10] border border-[#10b981]/25">
                <p className="text-[62px] font-extrabold font-mono text-[#10b981] leading-none tracking-tight">
                  {fmt(animatedIncremental)}
                </p>
                <p className="text-[14px] text-[#10b981]/70 font-medium">
                  {multiplier.toFixed(1)}× more than fixed-retry
                </p>
              </div>
              <p className="text-[13px] text-[#475569] leading-relaxed max-w-md mx-auto">
                Baseline recovered <span className="text-[#94a3b8] font-mono">{fmt(b.total_recovered)}</span> ·
                RevenueOS recovered <span className="text-[#10b981] font-mono">{fmt(r.total_recovered)}</span> ·
                Same <span className="text-[#94a3b8] font-mono">{Number(info.sample_size || 0).toLocaleString()}</span> payments
              </p>
            </div>

            {/* ── Visual bar comparison ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider">Recovery Comparison</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#475569] w-32 flex-shrink-0 text-right">Baseline</span>
                  <div className="flex-1 h-7 bg-[#0d1826] rounded-lg overflow-hidden relative">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#334155] rounded-lg flex items-center px-3 transition-all duration-1000"
                      style={{ width: `${baselineW}%`, minWidth: '60px' }}
                    >
                      <span className="text-[11px] font-mono text-[#94a3b8] font-semibold whitespace-nowrap">{fmt(b.total_recovered)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#10b981] w-32 flex-shrink-0 text-right font-semibold">RevenueOS</span>
                  <div className="flex-1 h-7 bg-[#0d1826] rounded-lg overflow-hidden relative">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#10b981] rounded-lg flex items-center px-3 transition-all duration-1000"
                      style={{ width: `${revenueosW}%`, minWidth: '80px' }}
                    >
                      <span className="text-[11px] font-mono text-[#071a10] font-bold whitespace-nowrap">{fmt(r.total_recovered)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Highlight chips ── */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[12px] font-semibold text-[#10b981]">
                {multiplier.toFixed(1)}× more revenue
              </span>
              {attemptSaving && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[12px] font-semibold text-[#3b82f6]">
                  −{attemptSaving}% retry attempts
                </span>
              )}
              {netROI && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[12px] font-semibold text-[#10b981]">
                  {animatedROI.toLocaleString()}% ROI
                </span>
              )}
            </div>

            {/* ── Recovery Economics ── */}
            {returnMultiple && (
              <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-6">
                <p className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider mb-5">Recovery Economics</p>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Intervention Cost</p>
                    <p className="text-[22px] font-bold font-mono text-[#64748b]">{fmt(r.total_cost)}</p>
                  </div>
                  <div className="text-[#334155] text-2xl flex-shrink-0">→</div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Revenue Recovered</p>
                    <p className="text-[22px] font-bold font-mono text-[#10b981]">{fmt(r.total_recovered)}</p>
                  </div>
                  <div className="text-[#334155] text-2xl flex-shrink-0">→</div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Return Multiple</p>
                    <p className="text-[32px] font-extrabold font-mono text-[#10b981]">{returnMultiple}×</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Annual Projection Calculator ── */}
            <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-6 space-y-5">
              <div>
                <p className="text-[13px] font-semibold text-[#f1f5f9] mb-0.5">Annual Revenue Projection</p>
                <p className="text-[11px] text-[#475569]">Projection based on simulation results — not guaranteed real-world revenue.</p>
              </div>

              {/* Presets */}
              <div>
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-2">Monthly failed payment volume</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESETS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setMonthly(value)}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${monthly === value ? 'bg-[#10b981] text-white' : 'bg-[#111d2e] border border-[#1e2d3d] text-[#64748b] hover:border-[#334155] hover:text-[#94a3b8]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={1000000}
                  max={500000000}
                  step={1000000}
                  value={monthly}
                  onChange={e => setMonthly(Number(e.target.value))}
                  className="w-full accent-[#10b981]"
                />
                <p className="text-[13px] font-mono text-[#94a3b8] mt-1">{fmtCr(monthly)} / month</p>
              </div>

              {/* Result */}
              <div className="rounded-lg bg-[#071a10] border border-[#10b981]/20 px-5 py-4">
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-2">Estimated additional annual recovery</p>
                <p className="text-[36px] font-extrabold font-mono text-[#10b981] leading-none">{fmtCr(annualProjection)}</p>
                <div className="mt-3 pt-3 border-t border-[#10b981]/10 space-y-1">
                  <p className="text-[10px] text-[#334155]">
                    {fmtCr(monthly)} × {(incrRate * 100).toFixed(2)}% incremental rate × 12 months = {fmtCr(annualProjection)}
                  </p>
                  <p className="text-[10px] text-[#334155]">
                    Incremental rate sourced from experiment: RevenueOS {((r.recovery_rate || 0) * 100).toFixed(2)}% − Baseline {((b.recovery_rate || 0) * 100).toFixed(2)}% = {(incrRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* ── Quote callout ── */}
            <div className="text-center py-8 border-y border-[#1e2d3d]">
              <p className="text-[18px] sm:text-[22px] font-semibold text-[#f1f5f9] leading-snug max-w-xl mx-auto">
                &ldquo;RevenueOS recovered <span className="text-[#10b981]">{multiplier.toFixed(1)}× more revenue</span>{attemptSaving ? ` using ${attemptSaving}% fewer retry attempts` : ''}.&rdquo;
              </p>
              <p className="text-[11px] text-[#334155] mt-3">Based on {Number(info.sample_size || 0).toLocaleString()} payment events · Seed {info.seed}</p>
            </div>

            {/* ── Why this matters ── */}
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[#f1f5f9]">Why this matters</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['More recovered revenue', 'Every failed payment is a revenue leak. RevenueOS plugs more of those leaks than fixed-retry.'],
                  ['Fewer unnecessary retries', 'Over-retrying frustrates customers and wastes gateway costs. RevenueOS retries only when ML predicts success.'],
                  ['Lower intervention cost', `₹${r.total_cost?.toLocaleString('en-IN') || '—'} in action costs to recover ${fmt(r.total_recovered)} — a ${returnMultiple || '—'}× return.`],
                  ['Policy-controlled safety', 'Disputed payments are never auto-recovered. High-value payments always require human approval.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-4">
                    <p className="text-[11px] font-semibold text-[#10b981] mb-1.5">{title}</p>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Re-run */}
            <div className="text-center space-y-3 pb-4">
              <button
                onClick={handleRerun}
                disabled={rerunning}
                className={`px-6 py-2.5 text-[12px] font-semibold rounded-lg border transition-all duration-150 active:scale-95 ${rerunning ? 'border-[#1e2d3d] text-[#475569] cursor-not-allowed bg-[#0d1826]' : 'border-[#1e2d3d] text-[#f1f5f9] hover:border-[#334155] bg-[#0d1826]'}`}
              >
                {rerunning ? 'Running...' : 'Re-run Experiment'}
              </button>
              {message && <p className="text-[11px] text-[#10b981]">{message}</p>}
              <p className="text-[10px] text-[#1e2d3d] italic">Screenshot this page to include in your demo deck</p>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
