import { useState } from 'react';
import Layout from '../components/Layout';

const SCENARIOS = [
  {
    id: 'disputed_payment',
    title: 'Disputed Payment',
    description: 'Payment flagged as disputed — all recovery actions should be blocked by policy.',
    expected: 'BLOCKED',
  },
  {
    id: 'amount_exceeded',
    title: 'High-Value Payment',
    description: 'Amount exceeds ₹10,000 — automatic recovery blocked, requires human approval.',
    expected: 'HUMAN APPROVAL',
  },
  {
    id: 'retry_limit',
    title: 'Retry Limit Reached',
    description: '3 retries already attempted — IMMEDIATE_RETRY should be blocked.',
    expected: 'BLOCKED',
  },
  {
    id: 'contact_limit',
    title: 'Contact Limit Reached',
    description: '3 contacts already made — NOTIFICATION should be blocked.',
    expected: 'BLOCKED',
  },
  {
    id: 'opt_out',
    title: 'Normal Payment',
    description: 'Standard ₹1,200 payment — should be eligible for recovery.',
    expected: 'ELIGIBLE',
  },
];

function OutcomeBadge({ approved, requiresHuman, isNew }) {
  if (requiresHuman) return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f59e0b]/10 text-[#f59e0b] text-[11px] font-semibold ${isNew ? 'animate-badge-scale' : ''}`}>
      Human Approval
    </span>
  );
  if (approved) return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-[11px] font-semibold ${isNew ? 'animate-badge-scale' : ''}`}>
      Approved
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-[11px] font-semibold ${isNew ? 'animate-badge-scale' : ''}`}>
      Blocked
    </span>
  );
}

export default function FailureLab() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [runAllRunning, setRunAllRunning] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);
  const [summary, setSummary] = useState({ blocked: 0, approved: 0, human: 0 });
  const [showSummary, setShowSummary] = useState(false);

  const runScenario = async (id) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const r = await fetch(`http://localhost:8001/api/v1/failure-lab/${id}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setResults(prev => ({ ...prev, [id]: d }));
    } catch (e) {
      setResults(prev => ({ ...prev, [id]: { error: e.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const runAllScenarios = async () => {
    setRunAllRunning(true);
    setRunAllProgress(0);
    setSummary({ blocked: 0, approved: 0, human: 0 });
    setShowSummary(false);

    // Reset results
    setResults({});

    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];

      // Update progress
      setRunAllProgress(i + 1);

      // Run the scenario
      await runScenario(scenario.id);

      // Wait 500ms between scenarios (except after the last one)
      if (i < SCENARIOS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate summary after all scenarios complete
    const newSummary = { blocked: 0, approved: 0, human: 0 };
    Object.values(results).forEach(result => {
      if (result.error) return;
      if (result.policy_decision) {
        if (result.policy_decision.requires_human_approval) {
          newSummary.human += 1;
        } else if (result.policy_decision.approved) {
          newSummary.approved += 1;
        } else {
          newSummary.blocked += 1;
        }
      }
    });

    setSummary(newSummary);
    setShowSummary(true);
    setRunAllRunning(false);
  };

  // Highlight key words in policy reason
  const highlightPolicyReason = (reason) => {
    if (!reason) return '';

    // Replace key words with highlighted versions
    let highlighted = reason
      .replace(/disputed/g, '<span className="text-red-400 font-semibold">disputed</span>')
      .replace(/limit exceeded/g, '<span className="text-[#f59e0b] font-semibold">limit exceeded</span>')
      .replace(/human approval/g, '<span className="text-[#f59e0b] font-semibold">human approval</span>')
      .replace(/within policy/g, '<span className="text-[#10b981] font-semibold">within policy</span>');

    return highlighted;
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">Failure Lab</h1>
          <p className="text-[13px] text-[#475569] mt-1">
            Test the policy engine against edge-case scenarios
          </p>
        </div>

        {/* Run All Scenarios Button */}
        <div className="mb-6">
          <button
            onClick={runAllScenarios}
            disabled={runAllRunning}
            className={`
              w-full px-6 py-3 text-[14px] font-semibold bg-[#10b981] text-white rounded-lg
              ${runAllRunning ? 'opacity-90' : 'hover:bg-[#059669]'}
              transition-all duration-200
              ${runAllRunning ? 'animate-pulse' : ''}
            `}
          >
            {runAllRunning ? `Running ${runAllProgress}/5...` : 'Run All Scenarios'}
          </button>
        </div>

        {/* Policy Summary Bar */}
        {showSummary && (
          <div className="mb-6 animate-fade-in">
            <div className="px-5 py-3 rounded-xl bg-[#0d1826] border border-[#1e2d3d]">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#475569]">
                    Policy Summary
                  </span>
                  <span className="text-[12px] font-medium">
                    {summary.blocked} blocked · {summary.approved} approved · {summary.human} require human review
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scenario grid */}
        <div className="grid grid-cols-1 gap-3">
          {SCENARIOS.map((scenario) => {
            const result = results[scenario.id];
            const isLoading = loading[scenario.id];
            const isNew = result && !loading[scenario.id] && Object.keys(results).length === SCENARIOS.length && !showSummary;

            return (
              <div
                key={scenario.id}
                className={`
                  bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-5
                  transition-colors duration-500
                  ${result?.policy_decision?.approved === true
                    ? 'border-[#10b981]/30 bg-[#071a10/20}'
                    : result?.policy_decision?.approved === false && result?.policy_decision?.requires_human_approval === true
                      ? 'border-[#f59e0b]/30 bg-[#0d1826]'
                      : result?.policy_decision?.approved === false
                        ? 'border-red-500/30 bg-[#0d1826]'
                        : ''}
                `}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 space-y-1">
                    <h2 className="text-[14px] font-semibold text-[#f1f5f9]">
                      {scenario.title}
                    </h2>
                    {result?.policy_decision && (
                      <OutcomeBadge
                        approved={result.policy_decision.approved}
                        requiresHuman={result.policy_decision.requires_human_approval}
                        isNew={isNew}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => runScenario(scenario.id)}
                    disabled={isLoading || runAllRunning}
                    className={`
                      px-4 py-2 text-[11px] font-semibold rounded-md active:scale-95
                      ${isLoading || runAllRunning
                        ? 'bg-[#334155] text-[#64748b] cursor-not-allowed'
                        : 'bg-[#3b82f6] text-white hover:bg-blue-500'}
                      transition-all duration-200
                    `}
                  >
                    {isLoading || runAllRunning ? 'Running...' : 'Run Scenario'}
                  </button>
                </div>

                {/* Middle: scenario description */}
                <p className="text-[12px] text-[#475569] leading-relaxed">
                  {scenario.description}
                </p>

                {/* Expected outcome */}
                <div className="flex items-center mt-2">
                  <span className="bg-[#1e2d3d] text-[#475569] text-[10px] font-mono px-2 py-0.5 rounded">
                    Expected: {scenario.expected}
                  </span>
                </div>

                {/* Result section (shown after running) */}
                {result && !result.error && result.policy_decision && (
                  <div className="mt-4 pt-4 border-t border-[#1e2d3d]/50">
                    <div className="flex items-center mb-2">
                      <span className="text-[12px] text-[#475569]">Policy reason:</span>
                      <span className="text-[12px] ml-2">
                        {/* Use dangerouslySetInnerHTML for the highlighted text - in a real app, you'd want to sanitize this */}
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightPolicyReason(result.policy_decision.reason || 'N/A')
                          }}
                        />
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[11px] font-mono">Action:</span>
                      <span className="font-mono text-[11px] ml-2">
                        {result.action_attempted || 'N/A'}
                      </span>
                      <span className="mx-2 text-[11px] font-mono">·</span>
                      <span className="text-[11px] font-mono">Amount:</span>
                      <span className="font-mono text-[11px] ml-2">
                        ₹{Number(result.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Result section animation wrapper */}
                {!(!result || result.error || !result.policy_decision) && (
                  <style jsx>{`
                    @keyframes slideDown {
                      from {
                        opacity: 0;
                        max-height: 0;
                      }
                      to {
                        opacity: 1;
                        max-height: 40px;
                      }
                    }

                    @keyframes badgeScale {
                      0% { transform: scale(0); }
                      50% { transform: scale(1.1); }
                      100% { transform: scale(1); }
                    }

                    .animate-slide-down {
                      animation: slideDown 300ms ease-out forwards;
                      overflow-hidden;
                    }

                    .animate-badge-scale {
                      animation: badgeScale 400ms ease-out forwards;
                    }

                    .animate-fade-in {
                      animation: fadeIn 300ms ease-out forwards;
                    }

                    @keyframes fadeIn {
                      from { opacity: 0; }
                      to { opacity: 1; }
                    }
                  `}</style>
                )}

                {result?.error && (
                  <p className="mt-3 text-xs text-red-400">Error: {result.error}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}