import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';

function Sk({ h = 'h-5' }) {
  return <div className={`${h} w-full rounded-lg bg-[#0d1826] animate-pulse`} />;
}

function Row({ label, baseline, revenueos, highlight, explain }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border-b last:border-0 ${explain ? 'cursor-pointer' : ''}`}
      style={{
        borderColor: 'var(--c-line)',
        background: highlight ? 'rgba(16,185,129,0.06)' : 'transparent',
      }}
    >
      <div className="flex items-center py-3 px-5" onClick={() => explain && setOpen(!open)}>
        <span className="text-[11px] font-medium uppercase tracking-wider flex-1 flex items-center gap-1.5"
          style={{ color: 'var(--c-muted)' }}>
          {label}
          {explain && <span style={{ color: 'var(--c-faint)', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>}
        </span>
        <span className="text-[13px] font-mono w-36 text-right" style={{ color: 'var(--c-secondary)' }}>{baseline}</span>
        <span className="text-[13px] font-mono w-36 text-right font-semibold"
          style={{ color: highlight ? 'var(--c-brand)' : 'var(--c-primary)' }}>
          {revenueos}
        </span>
      </div>
      {open && explain && (
        <div className="px-5 pb-3">
          <p className="text-[11px] text-[#475569] leading-relaxed bg-[#080f1a] rounded-lg px-3 py-2">{explain}</p>
        </div>
      )}
    </div>
  );
}

const STATUS_MSGS = [
  'Loading 500 held-out test payments...',
  'Running fixed-retry baseline strategy...',
  'Running RevenueOS AI strategy...',
  'Computing recovery outcomes via simulator...',
  'Comparing results and computing uplift...',
  'Generating experiment report...',
];

const METHODOLOGY = [
  {
    title: 'Counterfactual Simulation',
    body: 'RevenueOS is evaluated using a counterfactual simulator that replays the same failed payment events under both strategies. The same payment, the same ground-truth outcome data — different decisions. This makes the comparison fair and eliminates confounding variables.',
  },
  {
    title: 'Temporal Test Split',
    body: 'The test set uses the last 20% of events ordered by timestamp — not a random split. This prevents temporal leakage where the model could learn from "future" data during training. It simulates real deployment conditions.',
  },
  {
    title: 'Baseline Strategy',
    body: 'The baseline always retries failed payments up to 3 times with no ML guidance, no utility scoring, and no policy gating. This represents a typical fixed-retry dunning system that most merchants use today.',
  },
  {
    title: 'Aggregate Evaluation',
    body: 'Results are computed over 500 held-out payments per seed. Metrics include total recovered revenue, recovery rate, attempts used, customer contacts made, and total action cost — giving a multi-dimensional view of performance.',
  },
];

const LIMITATIONS = [
  'Simulated environment — outcomes come from a counterfactual ground-truth dataset, not live Razorpay webhook events.',
  'Synthetic payment data — generated to match realistic distributions but not from real merchant transaction history.',
  'Assumed action costs — retry cost (₹1), payment link cost (₹2), notification cost (₹0.5) are configurable estimates.',
  'Single-seed experiment — current report uses seed 12345; multi-seed aggregation not yet exposed in the API.',
  'No real gateway execution — the Razorpay payment link creation is wired but not verified end-to-end in this test run.',
];

export default function Experiment() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [message, setMessage]     = useState(null);
  const ivRef = useRef(null);
  const mvRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    fetch('http://localhost:8001/api/v1/experiment/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRerun = async () => {
    setRerunning(true);
    setProgress(0);
    setStatusMsg(STATUS_MSGS[0]);
    setMessage(null);
    let mi = 0;
    ivRef.current = setInterval(() => setProgress(p => Math.min(p + 1.7, 95)), 1000);
    mvRef.current = setInterval(() => { mi = Math.min(mi + 1, STATUS_MSGS.length - 1); setStatusMsg(STATUS_MSGS[mi]); }, 10000);
    try {
      await fetch('http://localhost:8001/api/v1/experiment/run', { method: 'POST' });
      await new Promise(r => setTimeout(r, 62000));
      clearInterval(ivRef.current); clearInterval(mvRef.current);
      setProgress(100); setStatusMsg('Complete!');
      await new Promise(r => setTimeout(r, 800));
      fetchData(); setMessage('Results updated.');
    } catch {
      setMessage('Something went wrong.');
    } finally {
      clearInterval(ivRef.current); clearInterval(mvRef.current);
      setRerunning(false); setProgress(0); setStatusMsg('');
    }
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const pct = (n) => ((n || 0) * 100).toFixed(2) + '%';
  const num = (n) => Number(n || 0).toLocaleString('en-IN');
  const cpv = (rec, cost) => rec > 0 ? fmt(cost / rec * 100) + ' per ₹100' : '—';

  const b    = data?.baseline   || {};
  const r    = data?.revenueos  || {};
  const c    = data?.comparison || {};
  const info = data?.experiment_info || {};
  const netROI = r.total_cost > 0 ? Math.round(((c.incremental_recovered - r.total_cost) / r.total_cost) * 100) : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-[#f1f5f9] tracking-tight">Experiment</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider">
                Validated Simulation
              </span>
            </div>
            <p className="text-[13px] text-[#475569]">How we measured RevenueOS against a baseline</p>
          </div>
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className={`px-4 py-2 text-[12px] font-semibold rounded-lg border transition-all duration-150 active:scale-95 ${rerunning ? 'border-[#1e2d3d] text-[#475569] cursor-not-allowed bg-[#0d1826]' : 'border-[#1e2d3d] text-[#f1f5f9] hover:border-[#334155] bg-[#0d1826]'}`}
          >
            {rerunning ? 'Running...' : 'Re-run Experiment'}
          </button>
        </div>

        {/* Progress */}
        {rerunning && (
          <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] px-6 py-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
              </span>
              <span className="text-[13px] text-[#94a3b8] font-medium">{statusMsg}</span>
            </div>
            <div className="h-1 bg-[#1e2d3d] rounded-full overflow-hidden">
              <div className="h-full bg-[#10b981] rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-[#334155] font-mono">{progress.toFixed(0)}% complete</p>
          </div>
        )}

        {message && (
          <p className="text-[11px] text-[#10b981] bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg px-4 py-2">{message}</p>
        )}

        {loading ? (
          <div className="space-y-4"><Sk h="h-24" /><Sk h="h-48" /><Sk h="h-32" /></div>
        ) : !data ? (
          <div className="text-center py-16 rounded-xl bg-[#0d1826] border border-[#1e2d3d]">
            <p className="text-[13px] text-[#475569] mb-4">No experiment data yet.</p>
            <button onClick={handleRerun} className="text-[12px] text-[#10b981] hover:text-[#0ea472] font-medium transition-colors">
              Run first experiment →
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Experiment metadata */}
            <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2d3d] bg-[#080f1a]">
                <p className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider">Experiment Metadata</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#1e2d3d]">
                {[
                  ['Run Time', info.timestamp ? new Date(info.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'],
                  ['Seed', info.seed ?? '—'],
                  ['Sample Size', num(info.sample_size)],
                  ['Test Split', '20% temporal'],
                ].map(([label, val]) => (
                  <div key={label} className="px-5 py-4">
                    <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-[13px] font-mono text-[#f1f5f9]">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero delta */}
            <div className="rounded-xl bg-[#071a10] border border-[#10b981]/20 px-8 py-7">
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-[0.1em] mb-3">Incremental Revenue Recovered</p>
              <p className="text-[44px] font-extrabold font-mono text-[#10b981] leading-none tracking-tight">{fmt(c.incremental_recovered)}</p>
              <p className="text-[13px] text-[#475569] mt-3">
                That&apos;s <span className="text-[#f1f5f9] font-semibold">{(c.relative_improvement_recovered || 0).toFixed(1)}×</span> more revenue than the fixed-retry baseline on {num(info.sample_size)} payments
              </p>
            </div>

            {/* Comparison table */}
            <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1826] overflow-hidden">
              <div className="flex items-center px-5 py-3 border-b border-[#1e2d3d] bg-[#080f1a]">
                <span className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider flex-1">Metric <span className="text-[#1e2d3d] font-normal normal-case tracking-normal text-[10px]">click row for explanation</span></span>
                <span className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider w-36 text-right">Fixed Retry Baseline</span>
                <span className="text-[10px] font-semibold text-[#10b981] uppercase tracking-wider w-36 text-right">RevenueOS</span>
              </div>
              <Row label="Total Recovered"    baseline={fmt(b.total_recovered)}  revenueos={fmt(r.total_recovered)}  highlight explain="Money successfully recovered after the original payment failure." />
              <Row label="Recovery Rate"      baseline={pct(b.recovery_rate)}     revenueos={pct(r.recovery_rate)}     highlight explain="Percentage of eligible failed payments that eventually recovered." />
              <Row label="Total Attempts"     baseline={num(b.total_attempts)}    revenueos={num(r.total_attempts)}    explain="Total recovery attempts made across all payments. Fewer attempts = less retry spam." />
              <Row label="Total Contacts"     baseline={num(b.total_contacts)}    revenueos={num(r.total_contacts)}    explain="Customer-facing recovery interactions (payment links, notifications). Lower is better for customer experience." />
              <Row label="Total Cost"         baseline={fmt(b.total_cost)}        revenueos={fmt(r.total_cost)}        explain="Simulated cost of executing all recovery actions at assumed rates." />
              <Row label="Events Processed"   baseline={num(b.events_processed)}  revenueos={num(r.events_processed)} />
            </div>

            {/* Methodology */}
            <div>
              <h2 className="text-[13px] font-semibold text-[#f1f5f9] mb-4">How the experiment works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {METHODOLOGY.map(({ title, body }) => (
                  <div key={title} className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-5">
                    <p className="text-[11px] font-semibold text-[#10b981] uppercase tracking-wider mb-2">{title}</p>
                    <p className="text-[12px] text-[#64748b] leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What this means */}
            <div>
              <h2 className="text-[13px] font-semibold text-[#f1f5f9] mb-4">What each metric means</h2>
              <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] divide-y divide-[#1e2d3d]">
                {[
                  ['Recovered Revenue', 'Money successfully recovered after the original payment failure.'],
                  ['Recovery Rate', 'Percentage of eligible failed payments that eventually recover.'],
                  ['Attempts', 'Total recovery attempts required. Fewer attempts = lower retry spam.'],
                  ['Contacts', 'Customer-facing interactions. Lower is better for customer experience.'],
                  ['Action Cost', 'Simulated cost of recovery actions at assumed per-action rates.'],
                  ['Cost per ₹100 Recovered', `${cpv(r.total_recovered, r.total_cost)} for RevenueOS vs ${cpv(b.total_recovered, b.total_cost)} for baseline.`],
                ].map(([label, text]) => (
                  <div key={label} className="px-5 py-3 flex items-start gap-4">
                    <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider w-44 flex-shrink-0 mt-0.5">{label}</span>
                    <span className="text-[12px] text-[#64748b] leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom stats */}
            {netROI !== null && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-5">
                  <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Net ROI</p>
                  <p className="text-2xl font-bold font-mono text-[#10b981]">{netROI.toLocaleString()}%</p>
                </div>
                <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-5">
                  <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Rate Uplift</p>
                  <p className="text-2xl font-bold font-mono text-[#10b981]">+{((c.incremental_recovery_rate || 0) * 100).toFixed(2)}pp</p>
                </div>
                <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-5">
                  <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Sample / Seed</p>
                  <p className="text-2xl font-bold font-mono text-[#f1f5f9]">{num(info.sample_size)} / {info.seed}</p>
                </div>
              </div>
            )}

            {/* Limitations */}
            <div className="rounded-xl bg-[#0d1826] border border-[#1e2d3d] p-5">
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-3">Experiment Limitations</p>
              <ul className="space-y-1.5">
                {LIMITATIONS.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-[#475569] leading-relaxed">
                    <span className="text-[#334155] flex-shrink-0 mt-0.5">·</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
