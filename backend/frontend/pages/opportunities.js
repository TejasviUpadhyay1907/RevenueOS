import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/opportunities?limit=100')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(data => setOpportunities(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Recovery Opportunities</h1>
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Recovery Opportunities</h1>
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Recovery Opportunities</h1>
        <p>
          <Link href="/" passHref>
            <a>← Back to Dashboard</a>
          </Link>
        </p>

        {opportunities.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Amount at Risk</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Recovery Probability</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Expected Value</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Suggested Action</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Policy Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, index) => (
                <tr key={opp.revenue_event_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{opp.rank}</td>
                  <td style={{ padding: '12px' }}>₹{opp.amount_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px' }}>{(opp.recovery_probability * 100).toFixed(1)}%</td>
                  <td style={{ padding: '12px' }}>₹{opp.expected_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px' }}>
                    <Link href={`/opportunities/${opp.revenue_event_id}/decision`} passHref>
                      <a style={{ color: '#007bff', textDecoration: 'none' }}>View Decision</a>
                    </Link>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {opp.policy_check?.approved ? (
                      <span style={{ color: '#4caf50' }}>Auto-approved</span>
                    ) : (
                      <span style={{ color: '#ff9800' }}>Requires Approval</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Link href={`/opportunities/${opp.revenue_event_id}/execute`} passHref>
                      <a style={{
                        backgroundColor: '#4caf50',
                        color: 'white',
                        padding: '6px 12px',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        Execute
                      </a>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No opportunities found.</p>
        )}
      </div>
    </Layout>
  );
}