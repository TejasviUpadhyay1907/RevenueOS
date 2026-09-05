import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';

function Skeleton({ className }) {
  return <div className={`bg-[#1e293b] animate-pulse rounded-sm ${className}`} />;
}

export default function FailureDNA() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded

  // What to do mapping for failure codes
  const failureActions = {
    insufficient_funds: "Wait 48h, then delayed retry",
    expired_card: "Send payment link for card update",
    issuer_decline: "Retry after 4 hours",
    gateway_timeout: "Immediate retry — transient error",
    transaction_not_allowed: "Send payment link or escalate",
    currency_not_supported: "Human escalation required"
  };

  useEffect(() => {
    fetch('http://localhost:8001/api/v1/failure-dna')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(e => setError(`${e}`))
      .finally(() => setLoading(false));
  }, []);

  // Calculate intro stats
  const introStats = {
    bestRecoveryRate: 0,
    mostCommonBestAction: '',
    failureCodesTracked: 0
  };

  if (data.length > 0) {
    // Best recovery rate (highest value)
    introStats.bestRecoveryRate = Math.max(...data.map(row => row.recovery_rate || 0)) * 100;

    // Most common best action
    const actionCounts = {};
    data.forEach(row => {
      const action = row.best_action || 'unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
    introStats.mostCommonBestAction = Object.keys(actionCounts).reduce((a, b) =>
      actionCounts[a] > actionCounts[b] ? a : b
    );

    // Failure codes tracked
    introStats.failureCodesTracked = data.length;
  }

  // Get "What to do" text for a failure code
  const getWhatToDo = (failureCode) => {
    return failureActions[failureCode] || "Check policy before acting";
  };

  // Get badge color based on recovery rate
  const getBadgeClass = (rate) => {
    if (rate >= 0.3) return 'bg-[#10b981]/10 text-[#10b981]';
    if (rate >= 0.1) return 'bg-[#f59e0b]/10 text-[#f59e0b]';
    return 'bg-red-500/10 text-red-400';
  };

  // Get bar color based on recovery rate
  const getBarClass = (rate) => {
    if (rate >= 0.3) return 'bg-[#10b981]';
    if (rate >= 0.1) return 'bg-[#f59e0b]';
    return 'bg-red-500';
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">Failure DNA</h1>
          <p className="text-[13px] text-[#475569] mt-1">
            Optimal recovery action per failure code, learned from historical outcomes
          </p>
        </div>

        {/* Page Intro Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-4">
            <p className="text-[11px] text-[#475569]">Best recovery rate</p>
            <p className="text-[20px] font-bold text-[#10b981]">
              {introStats.bestRecoveryRate.toFixed(0)}%
            </p>
          </div>
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-4">
            <p className="text-[11px] text-[#475569]">Most common best action</p>
            <p className="text-[14px] font-mono">{introStats.mostCommonBestAction}</p>
          </div>
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-4">
            <p className="text-[11px] text-[#475569]">Failure codes tracked</p>
            <p className="text-[20px] font-bold text-[#f1f5f9]">
              {introStats.failureCodesTracked}
            </p>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="flex items-center gap-6 text-[11px] text-[#475569]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#10b981]/20" />
            &gt;30% — High effectiveness
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f59e0b]/20" />
            10–30% — Moderate
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/20" />
            &lt;10% — Low
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1826] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-b border-[#1e2d3d]/50 last:border-0">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-24" />
                    <Skeleton className="w-24" />
                    <Skeleton className="w-24" />
                    <Skeleton className="w-24" />
                    <Skeleton className="w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-[11px] text-[#475569]">
              Failed to load failure DNA data
            </div>
          ) : (
            <div className="divide-y divide-[#1e2d3d]/50">
              {/* Column Headers */}
              <div className="bg-[#080f1a] px-5 py-3">
                <div className="grid grid-cols-5 text-[10px] font-semibold text-[#334155] uppercase tracking-[0.07em]">
                  <div>Failure Reason</div>
                  <div>Best Action</div>
                  <div>Recovery Rate</div>
                  <div>Sample</div>
                  <div>What to do</div>
                </div>
              </div>

              {/* Table Rows */}
              {data.map((row) => (
                <>
                  {/* Main Row */}
                  <div
                    className={`hover:bg-[#111d2e] transition-colors duration-100 px-5 py-4 cursor-pointer
                    ${expandedRow === row.failure_code ? 'bg-[#111d2e]' : ''}`}
                    onClick={() =>
                      setExpandedRow(prev => prev === row.failure_code ? null : row.failure_code)
                    }
                  >
                    <div className="grid grid-cols-5">
                      {/* Failure Reason */}
                      <div className="font-mono text-[13px] text-[#f1f5f9]">
                        {row.root_cause || 'Unknown'}
                      </div>

                      {/* Best Action */}
                      <div className="flex items-center">
                        <span className="inline-block text-[11px] font-mono px-2.5 py-1 rounded-md font-medium"
                          style={{
                            background: 'var(--c-line)',
                            color: 'var(--c-secondary)',
                            border: '1px solid var(--c-line2)',
                          }}>
                          {row.best_action || 'N/A'}
                        </span>
                      </div>

                      {/* Recovery Rate */}
                      <div className="flex items-center flex-col">
                        <div className="flex items-center">
                          {row.recovery_rate >= 0.3 ? (
                            <span className={`${getBadgeClass(row.recovery_rate)} text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md`}>
                              {Math.round(row.recovery_rate * 100)}%
                            </span>
                          ) : row.recovery_rate >= 0.1 ? (
                            <span className={`${getBadgeClass(row.recovery_rate)} text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md`}>
                              {Math.round(row.recovery_rate * 100)}%
                            </span>
                          ) : (
                            <span className={`${getBadgeClass(row.recovery_rate)} text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md`}>
                              {Math.round(row.recovery_rate * 100)}%
                            </span>
                          )}
                        </div>
                        {/* Recovery Rate Bar */}
                        <div className="w-24 h-1 bg-[#1e2d3d] mt-1">
                          <div className={`h-1 ${getBarClass(row.recovery_rate)}`}
                            style={{ width: `${Math.round(row.recovery_rate * 100)}%` }}></div>
                        </div>
                      </div>

                      {/* Sample */}
                      <div className="text-[11px] font-mono text-[#334155]">
                        {row.sample_size === 0 ? 'heuristic' : row.sample_size.toLocaleString()}
                      </div>

                      {/* What to do */}
                      <div className="text-[11px] text-[#475569] italic">
                        {getWhatToDo(row.failure_code || '')}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Row Content */}
                  {expandedRow === row.failure_code && row.all_actions && row.all_actions.length > 0 && (
                    <div className="border-t border-[#1e2d3d]/50 bg-[#0d1826]">
                      <div className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium text-[#64748b] mb-2">
                            All attempted actions:
                          </p>
                          <div className="overflow-hidden">
                            <style jsx>{`
                              @keyframes slideDown {
                                from { height: 0; opacity: 0; }
                                to { height: var(--content-height); opacity: 1; }
                              }
                              .animate-expand {
                                animation: slideDown 200ms ease-out forwards;
                              }
                            `}</style>
                            <div className="animate-expand"
                              style={{
                                height: row.all_actions.length * 20 + 'px',
                                overflow: 'hidden'
                              }}
                            >
                              <div className="space-y-1">
                                {row.all_actions.map((action, index) => (
                                  <div key={index} className="flex items-center">
                                    <div className="w-1/3 text-[11px] font-mono text-[#f1f5f9]">
                                      {action.action || 'N/A'}
                                    </div>
                                    <div className="w-1/3 text-[11px] font-mono text-[#94a3b8]">
                                      {(action.rate || 0).toFixed(0)}%
                                    </div>
                                    <div className="w-1/3 text-[11px] font-mono text-muted">
                                      {index === 0 && '(best action)'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
