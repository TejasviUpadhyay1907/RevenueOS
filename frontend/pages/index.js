import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';

function Sk({ w = 'w-full', h = 'h-5' }) {
  return <div className={`${w} ${h} rounded-md bg-[#0d1826] animate-pulse`} />;
}

function StatCard({ label, value, sub, accent = 'text-[#f1f5f9]', hero = false }) {
  return (
    <div className={`
      relative flex flex-col gap-3 p-5 rounded-xl border transition-colors duration-200
      ${hero
        ? 'border-[#10b981]/30 bg-[#071a10] hover:border-[#10b981]/50'
        : 'border-[#1e2d3d] bg-[#0d1826] hover:border-[#253447]'}
    `}>
      {hero && <div className="absolute inset-0 rounded-xl bg-[#10b981]/3 pointer-events-none" />}
      <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-[0.08em]">{label}</p>
      <p className={`font-mono font-bold leading-none tracking-tight ${hero ? 'text-[36px]' : 'text-[26px]'} ${accent}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#334155] font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [opps, setOpps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive]       = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    const b = 'http://localhost:8001';
    Promise.all([
      fetch(`${b}/api/v1/dashboard/metrics`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${b}/api/v1/opportunities?limit=6`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([m, o]) => {
      if (m) setMetrics(m);
      setOpps(Array.isArray(o) ? o : []);
    }).finally(() => setLoading(false));

    try {
      const ws = new WebSocket('ws://localhost:8001/ws');
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.event_type === 'payment_recovered')
            setLive(p => p + Number(d.data?.amount || 0));
        } catch {}
      };
      wsRef.current = ws;
    } catch {}
    return () => { try { wsRef.current?.close(); } catch {} };
  }, []);

  const inr = (n, dec = 0) =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <Layout>
      <div className="max-w-[1280px] mx-auto px-6 py-7 space-y-6">

        {/* Greeting header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#334155] uppercase tracking-widest mb-1">
              {(() => {
                const h = new Date().getHours();
                if (h >= 5  && h < 12) return '🌅 Good morning';
                if (h >= 12 && h < 17) return '☀️ Good afternoon';
                if (h >= 17 && h < 22) return '🌆 Good evening';
                return '🌙 Working late';
              })()}, Tejas
            </p>
            <h1 className="text-xl font-semibold text-[#f1f5f9] tracking-tight">Revenue Recovery Dashboard</h1>
            <p className="text-[13px] text-[#475569] mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/opportunities" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d1826] border border-[#1e2d3d] hover:border-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-[13px] font-medium rounded-lg transition-all duration-150">
            View Opportunities
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Live session banner */}
        <div className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-[#071a10] border border-[#10b981]/20">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
            </div>
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest">Recovered this session</span>
            <span className="font-mono text-[20px] font-bold text-[#10b981]">{inr(live, 2)}</span>
          </div>
          <span className="text-[11px] text-[#1e2d3d]">Live via WebSocket</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-12 gap-5">

          {/* Metrics */}
          <div className="col-span-12 xl:col-span-5">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`p-5 rounded-xl bg-[#0d1826] border border-[#1e2d3d] space-y-3 animate-pulse ${i === 5 ? 'col-span-2' : ''}`}>
                    <Sk w="w-24" h="h-3" />
                    <Sk w="w-32" h="h-7" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Revenue at Risk"      value={inr(metrics?.total_revenue_at_risk)}  accent="text-[#f59e0b]" />
                <StatCard label="Expected Recoverable" value={inr(metrics?.expected_recoverable)}   accent="text-[#3b82f6]" />
                <StatCard label="Recovery Rate"        value={`${((metrics?.recovery_rate||0)*100).toFixed(1)}%`} accent="text-[#94a3b8]" />
                <StatCard label="Active Opportunities" value={Number(metrics?.active_opportunities||0).toLocaleString('en-IN')} accent="text-[#f1f5f9]" />
                <div className="col-span-2">
                  <StatCard label="Incremental Revenue vs Baseline" value={inr(metrics?.incremental_revenue)} sub="RevenueOS outperforms fixed-retry baseline" accent="text-[#10b981]" />
                </div>
                <div className="col-span-2">
                  <StatCard label="Total Recovered" value={inr(metrics?.total_recovered, 2)} sub="Across all executed recovery actions" accent="text-[#10b981]" hero />
                </div>
              </div>
            )}
          </div>

          {/* Opportunities table */}
          <div className="col-span-12 xl:col-span-7">
            <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1826] overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d]">
                <div>
                  <p className="text-[13px] font-semibold text-[#f1f5f9]">Top Recovery Opportunities</p>
                  <p className="text-[11px] text-[#475569] mt-0.5">Ranked by expected recovery value</p>
                </div>
                <Link href="/opportunities" className="text-[12px] font-medium text-[#10b981] hover:text-[#0ea472] transition-colors">
                  See all →
                </Link>
              </div>

              {loading ? (
                <div className="p-5 space-y-3 flex-1">
                  {[...Array(5)].map((_, i) => <Sk key={i} h="h-11" />)}
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1e2d3d]">
                        {['#', 'Amount at Risk', 'Probability', 'Exp. Value', ''].map((h, i) => (
                          <th key={i} className={`px-5 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-[0.07em] ${i === 4 ? 'text-right' : 'text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {opps.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-[#334155]">No opportunities</td></tr>
                      ) : opps.map(opp => (
                        <tr key={opp.revenue_event_id}
                          className="border-b border-[#1e2d3d]/60 last:border-0 hover:bg-[#111d2e] transition-colors duration-100 group">
                          <td className="px-5 py-3.5 text-[12px] font-mono text-[#334155]">{opp.rank}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-[14px] font-semibold text-[#f1f5f9]">
                              ₹{Number(opp.amount_at_risk).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-16 h-1 bg-[#1e2d3d] rounded-full overflow-hidden">
                                <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${Math.min((opp.recovery_probability||0)*100,100)}%` }} />
                              </div>
                              <span className="text-[12px] font-mono text-[#64748b]">
                                {((opp.recovery_probability||0)*100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[13px] font-mono text-[#10b981]">
                              ₹{Number(opp.expected_value||0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link href={`/decision-trace/${opp.revenue_event_id}`}
                              className="text-[12px] font-medium text-[#3b82f6] hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-all duration-150">
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
