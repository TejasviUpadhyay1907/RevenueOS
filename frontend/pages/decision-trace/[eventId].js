import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/router';

const STEPS = [
  { key: 'rootCause', label: 'Root Cause Analysis', color: 'border-yellow-400' },
  { key: 'strategy',  label: 'Strategy Selection',  color: 'border-blue-400' },
  { key: 'policy',    label: 'Policy Check',         color: 'border-green-400' },
  { key: 'execute',   label: 'Execution',            color: 'border-indigo-400' },
  { key: 'verify',    label: 'Verification',         color: 'border-purple-400' },
  { key: 'oracle',    label: 'Stopping Oracle',      color: 'border-pink-400' },
  { key: 'audit',     label: 'Audit Logging',        color: 'border-gray-400' },
];

const STEP_INIT = {
  rootCause: 'pending', strategy: 'pending', policy: 'pending',
  execute: 'pending', verify: 'pending', oracle: 'pending', audit: 'pending'
};

function StatusBadge({ status, isNew }) {
  const map = {
    done:    'bg-green-900/30 text-green-300',
    running: 'bg-yellow-900/30 text-yellow-300 animate-pulse',
    failed:  'bg-red-900/30 text-red-300',
    pending: 'bg-gray-800 text-gray-500',
  };

  // Add animation classes for status changes
  let className = `text-xs font-mono px-2 py-0.5 rounded ${map[status] || map.pending}`;

  if (isNew && status === 'done') {
    className += ' animate-badge-done';
  } else if (isNew && status === 'failed') {
    className += ' animate-badge-failed';
  }

  return (
    <span className={className}>
      {status.toUpperCase()}
    </span>
  );
}

export default function DecisionTrace() {
  const router = useRouter();
  const { eventId } = router.query;

  const [event, setEvent]           = useState(null);
  const [decision, setDecision]     = useState(null);
  const [execution, setExecution]   = useState(null);
  const [audit, setAudit]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [executing, setExecuting]   = useState(false);
  const [trace, setTrace]           = useState(null);
  const [running, setRunning]       = useState(false);
  const [stepStatus, setStepStatus] = useState(STEP_INIT);
  const stepsRef = useRef(null);
  const [amountAnimated, setAmountAnimated] = useState(0);
  const hasAnimatedAmount = useRef(false);
  const [llmExplanationAnimated, setLlmExplanationAnimated] = useState(false);
  const llmExplanationRef = useRef('');
  const llmDisplayValue = useRef('');
  const [executionResultCard, setExecutionResultCard] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    const base = 'http://localhost:8000';

    fetch(`${base}/api/v1/revenue-events/${eventId}`)
      .then(r => { if (!r.ok) throw new Error(`Event not found: ${r.status}`); return r.json(); })
      .then(d => setEvent(d))
      .catch(e => setError(e));

    fetch(`${base}/api/v1/opportunities/${eventId}/decision`)
      .then(r => { if (!r.ok) throw new Error(`Decision failed: ${r.status}`); return r.json(); })
      .then(d => setDecision(d))
      .catch(e => setError(e));

    fetch(`${base}/api/v1/audit-trail/${eventId}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAudit(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    // Payment header amount count-up animation
    if (event && !hasAnimatedAmount.current) {
      hasAnimatedAmount.current = true;
      const targetValue = event.amount_at_risk;
      let startTime = null;

      const animateAmount = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / 1000, 1); // 1 second duration

        // Ease-out function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setAmountAnimated(Math.floor(easeOut * targetValue));

        if (progress < 1) {
          requestAnimationFrame(animateAmount);
        }
      };

      requestAnimationFrame(animateAmount);
    }
  }, [event]);

  useEffect(() => {
    // LLM explanation typewriter effect
    if (decision && decision.llm_explanation && !llmExplanationAnimated.current) {
      llmExplanationAnimated.current = true;
      const explanation = decision.llm_explanation;

      if (explanation.length <= 200) {
        // Typewriter effect for explanations under 200 characters
        llmExplanationRef.current = explanation;
        llmDisplayValue.current = '';
        let charIndex = 0;

        const typeWriter = () => {
          if (charIndex < explanation.length) {
            llmDisplayValue.current = explanation.substring(0, charIndex + 1);
            charIndex++;
            setTimeout(typeWriter, 15); // 15ms per character
          }
        };

        typeWriter();
      } else {
        // Just fade in for longer explanations
        setLlmExplanationAnimated(true);
      }
    }
  }, [decision]);

  useEffect(() => {
    // Agent Pipeline steps animate in sequentially
    if (trace && stepsRef.current) {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const items = stepsRef.current.querySelectorAll('.pipeline-step');
      items.forEach((item, index) => {
        // Reset animation
        item.style.animation = 'none';
        item.offsetHeight; // Trigger reflow
        // Apply animation with delay
        item.style.animation = `slideIn 0.4s ease-out forwards`;
        item.style.animationDelay = `${index * 150}ms`;
      });
    }
  }, [trace]);

  useEffect(() => {
    // Execute action button success state
    if (execution && execution.success) {
      // Create a temporary result card that animates in
      const resultCard = {
        success: true,
        actualRecovered: execution.actual_recovered || 0,
        paymentLinkUrl: execution.result_data?.payment_link_url
      };
      setExecutionResultCard(resultCard);

      // Clear it after animation completes
      setTimeout(() => {
        setExecutionResultCard(null);
      }, 300);
    }
  }, [execution]);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const r = await fetch(`http://localhost:8000/api/v1/opportunities/${eventId}/execute`, { method: 'POST' });
      if (!r.ok) throw new Error(`Execute failed: ${r.status}`);
      setExecution(await r.json());
    } catch (e) { setError(e); }
    finally { setExecuting(false); }
  };

  const handleOrchestrate = async () => {
    setRunning(true);
    setTrace(null);
    setStepStatus({ ...STEP_INIT, rootCause: 'running' });
    try {
      const r = await fetch(`http://localhost:8000/api/v1/opportunities/${eventId}/orchestrate`, { method: 'POST' });
      if (!r.ok) throw new Error(`Orchestrate failed: ${r.status}`);
      const data = await r.json();
      const keys = ['rootCause', 'strategy', 'policy', 'execute', 'verify', 'oracle', 'audit'];
      for (let i = 0; i < keys.length; i++) {
        setStepStatus(prev => ({ ...prev, [keys[i]]: 'done', ...(keys[i + 1] ? { [keys[i + 1]]: 'running' } : {}) }));
        await new Promise(res => setTimeout(res, 250));
      }
      setTrace(data);
      if (data.execution_result) setExecution(data.execution_result);
    } catch (e) {
      setError(e);
      setStepStatus(Object.fromEntries(Object.keys(STEP_INIT).map(k => [k, 'failed'])));
    } finally { setRunning(false); }
  };

  if (!eventId || loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid gap-4 animate-pulse">
            <div className="h-32 bg-[#1e293b] rounded-lg" />
            <div className="h-48 bg-[#1e293b] rounded-lg" />
            <div className="h-24 bg-[#1e293b] rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-red-400 font-medium mb-4">{error.message}</p>
          <Link href="/opportunities" className="text-sm text-[#3b82f6] hover:underline">Back to Opportunities</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes badgeDone {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }

          @keyframes badgeFailed {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-5px); }
            40% { transform: translateX(5px); }
            60% { transform: translateX(-5px); }
            80% { transform: translateX(5px); }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes resultCardIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .animate-badge-done {
            animation: badgeDone 0.5s ease-out;
          }

          .animate-badge-failed {
            animation: badgeFailed 0.5s ease-out;
          }

          .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
          }

          .animate-result-card {
            animation: resultCardIn 0.3s ease-out;
          }
        `}</style>

        <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#f8fafc] transition-colors duration-150">
          <span>←</span> Back to Opportunities
        </Link>

        {/* Payment header */}
        {event && (
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Amount at Risk</p>
                <p className="text-[32px] font-mono font-bold text-[#f59e0b]">
                  ₹{amountAnimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Failure Reason</p>
                <span className="inline-block px-3 py-1 bg-[#f59e0b]/10 text-[#f59e0b] text-[13px] font-mono">
                  {event.root_cause || 'unknown'}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Status</p>
                <span className="inline-block px-3 py-1 bg-[#1e2d3d] text-[#94a3b8] text-[13px]">
                  {event.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Decision */}
        {decision && (
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">AI DECISION</h2>
              <span className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] text-xs font-mono">{decision.action}</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Confidence</p>
                <div className="h-1.5 bg-[#1e2d3d] rounded-full overflow-hidden mb-1">
                  <div className="h-1.5 bg-[#10b981] rounded-full" style={{ width: `${(decision.confidence * 100).toFixed(0)}%` }} />
                </div>
                <p className="text-xs font-mono text-[#94a3b8]">{(decision.confidence * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Expected Recovery</p>
                <p className="text-[28px] font-mono text-[#10b981]">
                  ₹{Number(decision.expected_recovery).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Risk Level</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-sm ${decision.confidence > 0.8 ? 'bg-green-900/20 text-green-300' : decision.confidence > 0.5 ? 'bg-yellow-900/20 text-yellow-300' : 'bg-red-900/20 text-red-300'}`}>
                  {decision.confidence > 0.8 ? 'Low Risk' : decision.confidence > 0.5 ? 'Medium Risk' : 'High Risk'}
                </span>
              </div>
            </div>
            {decision.llm_explanation && (
              <div className="border-l-[3px] border-[#10b981] pl-4 py-1">
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">AI Explanation</p>
                <p className={`italic text-[#94a3b8] text-[13px] leading-relaxed ${llmExplanationAnimated.current ? 'animate-fade-in' : ''}`}>
                  {llmExplanationAnimated.current && decision.llm_explanation.length > 200
                    ? decision.llm_explanation
                    : llmDisplayValue.current || ''}
                </p>
              </div>
            )}
            {Array.isArray(decision.shap_explanation) && decision.shap_explanation.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-3">Top Features</p>
                <div className="space-y-2">
                  {decision.shap_explanation.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#94a3b8] w-44 truncate flex-shrink-0">{item.feature}</span>
                      <div className="flex-1 h-1.5 bg-[#1e2d3d] rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${item.direction === 'increases' ? 'bg-[#10b981]' : 'bg-[#3b82f6]'}`}
                          style={{ width: `${Math.min(item.shap_value * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-[#64748b] w-10 text-right flex-shrink-0">{item.shap_value.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execute */}
        {decision && decision.action !== 'no_action' && (
          <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Execute Action</h2>
            {!execution ? (
              <div>
                <p className="text-sm text-[#64748b] mb-4">
                  Action <span className="font-mono text-[#f8fafc]">{decision.action}</span> has not been executed yet.
                </p>
                <button
                  onClick={handleExecute}
                  disabled={executing}
                  className={`px-6 py-3 text-[14px] font-semibold bg-[#10b981] text-white rounded-lg ${executing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {executing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Executing...
                    </span>
                  ) : 'Execute Action'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${execution.success ? 'text-[#10b981]' : 'text-red-400'}`}>
                    {execution.success ? '✓ Recovered' : '✗ Not recovered'}
                  </span>
                  <span className="text-sm font-mono text-[#f8fafc]">
                    ₹{Number(execution.actual_recovered || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {execution.result_data && execution.result_data.payment_link_url && (
                  <a href={execution.result_data.payment_link_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-[#3b82f6]/10 text-[#3b82f6] text-sm font-medium rounded-sm hover:bg-[#3b82f6]/20 transition-colors duration-150">
                    Open Payment Link →
                  </a>
                )}

                {/* Success animation card */}
                {executionResultCard && executionResultCard.success && (
                  <div className="mt-4 p-4 bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg animate-result-card">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#10b981]">✓ Recovered</span>
                      <span className="text-sm font-mono text-[#f8fafc]">
                        ₹{Number(executionResultCard.actualRecovered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {executionResultCard.paymentLinkUrl && (
                      <a href={executionResultCard.paymentLinkUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-block px-3 py-1 bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium rounded-sm hover:bg-[#3b82f6]/20 transition-colors duration-150">
                        Open Payment Link →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agent Pipeline */}
        <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Agent Pipeline</h2>
            <button
              onClick={handleOrchestrate}
              disabled={running}
              className={`px-5 py-2.5 text-[14px] font-semibold bg-[#3b82f6] text-white rounded-lg ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {running ? 'Running...' : 'Run Full Agent Pipeline'}
            </button>
          </div>
          {(running || trace) && (
            <div ref={stepsRef} className="divide-y divide-[#1e2d3d]">
              {STEPS.map((step, index) => (
                <div
                  key={step.key}
                  className={`pipeline-step border-l-[3px] ${step.color} py-4 pl-5`}
                  data-index={index}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#f8fafc]">{step.label}</span>
                    <StatusBadge
                      status={stepStatus[step.key]}
                      isNew={trace && stepStatus[step.key] === 'done' &&
                        Object.keys(stepStatus).some(k =>
                          stepStatus[k] !== STEP_INIT[k] && k !== step.key
                        )
                      }
                    />
                  </div>
                  {trace && stepStatus[step.key] === 'done' && (
                    <div className="text-xs text-[#64748b] font-mono space-y-1">
                      {step.key === 'rootCause' && trace.explanation && (
                        <p className="text-[#94a3b8] italic">{trace.explanation}</p>
                      )}
                      {step.key === 'strategy' && trace.decision && (
                        <p>Action: <span className="text-[28px] font-mono text-[#10b981]">{trace.decision.action}</span> · Confidence: {(trace.decision.confidence * 100).toFixed(1)}%</p>
                      )}
                      {step.key === 'policy' && trace.policy_result && (
                        <p>
                          <span className={trace.policy_result.approved ? 'text-[#10b981]' : 'text-red-400'}>
                            {trace.policy_result.approved ? 'APPROVED' : 'BLOCKED'}
                          </span>
                          {' — '}{trace.policy_result.reason}
                        </p>
                      )}
                      {step.key === 'execute' && trace.execution_result && (
                        <p>
                          <span className={trace.execution_result.success ? 'text-[#10b981]' : 'text-red-400'}>
                            {trace.execution_result.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                          {' — '}₹{Number(trace.execution_result.actual_recovered || 0).toLocaleString()}
                        </p>
                      )}
                      {step.key === 'verify' && trace.verification_result && (
                        <p>
                          <span className={trace.verification_result.success ? 'text-[#10b981]' : 'text-red-400'}>
                            {trace.verification_result.success ? 'VERIFIED' : 'UNVERIFIED'}
                          </span>
                          {' — '}₹{Number(trace.verification_result.actual_recovered || 0).toLocaleString()}
                        </p>
                      )}
                      {step.key === 'oracle' && trace.oracle_decision && (
                        <p>
                          <span className={trace.oracle_decision.stop ? 'text-red-400' : 'text-[#10b981]'}>
                            {trace.oracle_decision.stop ? 'STOP' : 'CONTINUE'}
                          </span>
                          {' — '}{trace.oracle_decision.recommendation}
                          {' · '}P(recovery): {(trace.oracle_decision.p_recovery_remaining * 100).toFixed(0)}%
                        </p>
                      )}
                      {step.key === 'audit' && (
                        <p>{trace.steps?.length || 0} steps logged to audit trail</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="bg-[#0d1826] border border-[#1e2d3d] rounded-xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Audit Trail</h2>
          {audit.length > 0 ? (
            <div className="space-y-3">
              {audit.map((a, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-[#1e2d3d] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#64748b] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-[#64748b]">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                      </span>
                      <span className="text-xs font-mono text-[#94a3b8]">{a.event_type}</span>
                    </div>
                    <p className="text-sm text-[#f8fafc]">{a.action_taken}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748b]">No audit records yet. Execute an action to generate them.</p>
          )}
        </div>

      </div>
    </Layout>
  );
}