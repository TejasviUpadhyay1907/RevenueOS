import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

function Skeleton({ className }) {
  return <div className={`bg-[#1e293b] animate-pulse rounded-sm ${className}`} />;
}

export default function Opportunities() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(null);
  // New states for row-level execution tracking
  const [rowStates, setRowStates] = useState({}); // { [revenue_event_id]: 'idle'|'loading'|'success'|'failed' }
  const [rowResults, setRowResults] = useState({}); // { [revenue_event_id]: { recovered, action } }
  const [sessionRecovered, setSessionRecovered] = useState(0); // total recovered in this session
  const [toasts, setToasts] = useState([]); // for toast notifications

  useEffect(() => {
    fetch('http://localhost:8001/api/v1/opportunities?limit=100')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => setOpportunities(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExecute = async (eventId) => {
    // Set the specific row to loading state
    setRowStates(prev => ({ ...prev, [eventId]: 'loading' }));

    try {
      const r = await fetch(`http://localhost:8001/api/v1/opportunities/${eventId}/execute`, { method: 'POST' });
      if (!r.ok) throw new Error(`${r.status}`);

      const result = await r.json();
      const recoveredAmount = Number(result.amount_recovered || 0);
      const actionTaken = result.action_taken || 'unknown';

      // Update the row state to success and store the result
      setRowStates(prev => ({ ...prev, [eventId]: 'success' }));
      setRowResults(prev => ({ ...prev, [eventId]: { recovered: recoveredAmount, action: actionTaken } }));

      // Update session total
      setSessionRecovered(prev => prev + recoveredAmount);

      // Show success toast
      setToasts(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: `₹${recoveredAmount} recovered`,
          subtext: `via ${actionTaken}`,
          timestamp: Date.now()
        }
      ]);

    } catch (error) {
      // Set the row state to failed
      setRowStates(prev => ({ ...prev, [eventId]: 'failed' }));
    } finally {
      // Clear the global executing state (if used elsewhere) but we are using rowStates now
      setExecuting(null);
    }
  };

  // Auto-remove toasts after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4000);

    return () => clearTimeout(timer);
  }, [toasts]);

  // We don't need to clear row effects here because we are using rowStates for button and result,
  // and we are not adding a separate effect state. Instead, we will handle the row background
  // by using a temporary state for the row background effect.

  // However, to implement the temporary row background, we need additional state for the effect.
  // Let's add:
  const [rowEffects, setRowEffects] = useState({}); // { [revenue_event_id]: null | 'success' | 'failed' }

  // We'll update the effect state when a row succeeds or fails, and then set a timeout to clear it.
  useEffect(() => {
    // This effect runs whenever rowStates changes
    const successIds = Object.entries(rowStates)
      .filter(([, state]) => state === 'success')
      .map(([id]) => id);
    const failedIds = Object.entries(rowStates)
      .filter(([, state]) => state === 'failed')
      .map(([id]) => id);

    // Set effect for newly succeeded rows
    successIds.forEach(id => {
      if (!rowEffects[id]) {
        setRowEffects(prev => ({ ...prev, [id]: 'success' }));
        setTimeout(() => {
          setRowEffects(prev => {
            const newEffect = { ...prev };
            delete newEffect[id];
            return newEffect;
          });
        }, 3000); // 3 seconds for success
      }
    });

    // Set effect for newly failed rows
    failedIds.forEach(id => {
      if (!rowEffects[id]) {
        setRowEffects(prev => ({ ...prev, [id]: 'failed' }));
        setTimeout(() => {
          setRowEffects(prev => {
            const newEffect = { ...prev };
            delete newEffect[id];
            return newEffect;
          });
        }, 2000); // 2 seconds for failed
      }
    });
  }, [rowStates, rowEffects]);

  const inr = (n, dec = 0) =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">
            Recovery Opportunities
          </h1>
          <p className="text-[13px] text-[#475569] mt-1">
            Ranked by expected recovery value — highest impact first
          </p>
        </div>

        {/* Running total banner */}
        {sessionRecovered > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
            <p className="text-[#10b981] font-mono text-[14px]">
              ₹{sessionRecovered.toLocaleString()} recovered this session
            </p>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1826] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-[#1e2d3d]/50 last:border-0">
                  <td className="px-5 py-4 text-[12px] font-mono text-[#334155]">
                    <Skeleton className="w-8" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="w-24" />
                  </td>
                  <td className="px-5 py-4 flex items-center space-x-2">
                    <div className="w-28 h-1.5 bg-[#1e2d3d] rounded-full">
                      <Skeleton className="h-1.5 rounded-full w-1/2" />
                    </div>
                    <Skeleton className="w-10" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="w-20" />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Skeleton className="w-24" />
                    <Skeleton className="w-20 mt-1" />
                  </td>
                </tr>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-red-400">Failed to load: {error}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#080f1a] border-b border-[#1e2d3d]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em] w-12">#</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em]">Amount at Risk</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em]">Probability</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em]">Expected Value</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em]">Action</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[11px] text-[#334155]">
                      No opportunities found
                    </td>
                  </tr>
                ) : opportunities.map((opp) => {
                  const eventId = opp.revenue_event_id;
                  const rowState = rowStates[eventId] || 'idle';
                  const rowResult = rowResults[eventId];
                  const rowEffect = rowEffects[eventId]; // null, 'success', or 'failed'

                  // Determine row background - explicit rgba, NOT css var (avoids override issues)
                  const rowClass = "transition-colors duration-100 border-b border-[#1e2d3d]/50 last:border-0";
                  const rowStyle = rowEffect === 'success'
                    ? { backgroundColor: 'rgba(5, 150, 105, 0.07)' }
                    : rowEffect === 'failed'
                    ? { backgroundColor: 'rgba(239, 68, 68, 0.05)' }
                    : {};

                  return (
                    <tr
                      key={eventId}
                      className={rowClass}
                      style={rowStyle}
                    >
                      <td className="px-5 py-4 text-[12px] font-mono text-[#334155]">
                        {opp.rank}
                      </td>

                      <td className="px-5 py-4 text-[15px] font-mono font-bold text-[#f1f5f9]">
                        {inr(opp.amount_at_risk, 0)}
                      </td>

                      <td className="px-5 py-4 flex items-center space-x-2">
                        <div className="w-28 h-1.5 bg-[#1e2d3d] rounded-full overflow-hidden">
                          <div className={`h-1.5 bg-[#10b981] rounded-full w-${Math.min((opp.recovery_probability || 0) * 100, 100)}%`}></div>
                        </div>
                        <span className="text-[11px] font-mono text-[#6b7280]">
                          {Math.round((opp.recovery_probability || 0) * 100)}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[13px] font-mono text-[#10b981]">
                        {inr(opp.expected_value, 0)}
                      </td>

                      <td className="px-5 py-4 text-right space-x-3">
                        {/* Execute Button */}
                        {rowState === 'idle' ? (
                          <button
                            onClick={() => handleExecute(eventId)}
                            className="px-3 py-1.5 text-[11px] font-semibold bg-[#10b981] text-white rounded-md hover:bg-[#059669] active:scale-95"
                          >
                            Execute
                          </button>
                        ) : rowState === 'loading' ? (
                          <button
                            disabled
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-md cursor-not-allowed"
                            style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--c-muted)' }}
                          >
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Executing...
                            </span>
                          </button>
                        ) : rowState === 'success' ? (
                          <button
                            disabled
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-md"
                            style={{
                              backgroundColor: 'rgba(5, 150, 105, 0.1)',
                              border: '1px solid rgba(5, 150, 105, 0.4)',
                              color: '#059669',
                            }}
                          >
                            ✓ {inr(rowResult.recovered, 0)}
                          </button>
                        ) : /* rowState === 'failed' */ (
                          <button
                            disabled
                            className="px-3 py-1.5 text-[11px] font-semibold bg-red-500/5 border border-red-500/20 text-red-400 rounded-md"
                          >
                            ✗ Failed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toast Notification System */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-xl px-5 py-3 flex items-center space-x-3 mb-2 shadow-lg"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--c-line)',
              borderLeft: '3px solid var(--c-brand)',
              opacity: toasts.indexOf(toast) === 0 ? 1 : 0,
              transform: `translateX(${toasts.indexOf(toast) === 0 ? 0 : '100%'})`,
              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
            }}
          >
            <div className="flex-shrink-0">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--c-brand)' }} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--c-primary)' }}>{toast.message}</p>
              <p className="text-[12px] font-mono" style={{ color: 'var(--c-brand)' }}>{toast.subtext}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}