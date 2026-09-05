import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';

export default function Home() {
  const [metrics, setMetrics] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch metrics
    fetch('http://localhost:8000/api/v1/dashboard/metrics')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Metrics error: ${res.status}`);
        return res.json();
      })
      .then(data => setMetrics(data))
      .catch(err => setError(err));

    // Fetch top 5 opportunities
    fetch('http://localhost:8000/api/v1/opportunities?limit=5')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Opportunities error: ${res.status}`);
        return res.json();
      })
      .then(data => setOpportunities(data))
      .catch(err => {
        if (!error) setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>RevenueOS Dashboard</h1>
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>RevenueOS Dashboard</h1>
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>RevenueOS Dashboard</h1>

        {metrics && (
          <div>
            <h2>Key Metrics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Total Revenue at Risk</h3>
                <p>₹{metrics.total_revenue_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Expected Recoverable</h3>
                <p>₹{metrics.expected_recoverable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Total Recovered</h3>
                <p>₹{metrics.total_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Incremental Revenue</h3>
                <p>₹{metrics.incremental_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Recovery Rate</h3>
                <p>{(metrics.recovery_rate * 100).toFixed(2)}%</p>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                <h3>Active Opportunities</h3>
                <p>{metrics.active_opportunities}</p>
              </div>
            </div>
          </div>
        )}

        <h2 style={{ marginTop: '40px' }}>Top Recovery Opportunities</h2>
        {opportunities.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Amount at Risk</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Recovery Probability</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Expected Value</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Suggested Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, index) => (
                <tr key={opp.revenue_event_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{opp.rank}</td>
                  <td style={{ padding: '10px' }}>₹{opp.amount_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px' }}>{(opp.recovery_probability * 100).toFixed(1)}%</td>
                  <td style={{ padding: '10px' }}>₹{opp.expected_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/opportunities/${opp.revenue_event_id}`} passHref>
                      <a style={{ color: '#007bff', textDecoration: 'none' }}>View Decision</a>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No opportunities found.</p>
        )}

        <div style={{ marginTop: '30px' }}>
          <Link href="/opportunities" passHref>
            <a style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px'
            }}>
              View All Opportunities
            </a>
          </Link>
        </div>
      </div>
    </Layout>
  );
}