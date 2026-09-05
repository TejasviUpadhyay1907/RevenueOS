import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';

export default function DecisionTrace() {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState(null);
  const [decision, setDecision] = useState(null);
  const [execution, setExecution] = useState(null);
  const [verification, setVerification] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setError(new Error('Event ID is required'));
      setLoading(false);
      return;
    }

    // Fetch event details
    fetch(`http://localhost:8000/api/v1/revenue-events`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        return res.json();
      })
      .then(events => {
        const found = events.find(e => e.id === eventId);
        if (found) setEvent(found);
        else throw new Error('Event not found');
      })
      .catch(err => setError(err));

    // Fetch decision
    fetch(`http://localhost:8000/api/v1/opportunities/${eventId}/decision`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch decision: ${res.status}`);
        return res.json();
      })
      .then(data => setDecision(data))
      .catch(err => setError(err));

    // Fetch audit trail
    fetch(`http://localhost:8000/api/v1/audit-trail/${eventId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch audit trail: ${res.status}`);
        return res.json();
      })
      .then(data => setAudit(data))
      .catch(err => {/* audit optional */})
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Decision Trace</h1>
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Decision Trace</h1>
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        </div>
      </Layout>
    );
  }

  if (!event || !decision) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Decision Trace</h1>
          <p>Loading data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Decision Trace for Event {eventId}</h1>
        <p>
          <Link href="/" passHref>
            <a>← Back to Dashboard</a>
          </Link>
          <span> | </span>
          <Link href="/opportunities" passHref>
            <a>← Back to Opportunities</a>
          </Link>
        </p>

        <div style={{ marginBottom: '30px' }}>
          <h2>Event Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Event ID</h3>
              <p>{event.id}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Payment ID</h3>
              <p>{event.payment_id}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Amount at Risk</h3>
              <p>₹{event.amount_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Detected At</h3>
              <p>{new Date(event.detected_at).toLocaleString()}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Root Cause</h3>
              <p>{event.root_cause}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Status</h3>
              <p>{event.status}</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>AI Decision</h2>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
            <p><strong>Action:</strong> {decision.action}</p>
            <p><strong>Reason:</strong> {decision.reason}</p>
            <p><strong>Confidence:</strong> {(decision.confidence * 100).toFixed(2)}%</p>
            <p><strong>Expected Recovery:</strong> ₹{decision.expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>Policy Check</h2>
          {decision.policy_check && (
            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
              <p><strong>Approved:</strong> {decision.policy_check.approved ? 'Yes' : 'No'}</p>
              <p><strong>Reason:</strong> {decision.policy_check.reason}</p>
              <p><strong>Requires Human Approval:</strong> {decision.policy_check.requires_human_approval ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>

        {decision.action !== 'no_action' && (
          <>
            <div style={{ marginBottom: '30px' }}>
              <h2>Execution</h2>
              {execution ? (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
                  <p><strong>Action ID:</strong> {execution.action_id}</p>
                  <p><strong>Action Type:</strong> {execution.action_type}</p>
                  <p><strong>Success:</strong> {execution.success ? 'Yes' : 'No'}</p>
                  <p><strong>Actual Recovered:</strong> ₹{execution.actual_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Executed At:</strong> {new Date(execution.executed_at).toLocaleString()}</p>
                </div>
              ) : (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
                  <p>The action "{decision.action}" has not been executed yet.</p>
                  <Link href={`/opportunities/${eventId}/execute`} passHref method="POST">
                    <a style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      padding: '10px 20px',
                      textDecoration: 'none',
                      borderRadius: '4px'
                    }}>
                      Execute Action
                    </a>
                  </Link>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h2>Verification</h2>
              {verification ? (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
                  <p><strong>Success:</strong> {verification.success ? 'Yes' : 'No'}</p>
                  <p><strong>Actual Recovered:</strong> ₹{verification.actual_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Verified At:</strong> {new Date(verification.verified_at).toLocaleString()}</p>
                  <p><strong>Details:</strong> {JSON.stringify(verification.verification_details, null, 2)}</p>
                </div>
              ) : (
                <p>Verification will appear after execution.</p>
              )}
            </div>
          </>
        )}

        <div style={{ marginBottom: '30px' }}>
          <h2>Audit Trail</h2>
          {audit.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Event Type</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Actor</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{new Date(a.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{a.event_type}</td>
                    <td style={{ padding: '8px' }}>{a.actor}</td>
                    <td style={{ padding: '8px' }}>{a.action_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No audit records found.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}