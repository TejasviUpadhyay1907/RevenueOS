import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';

export default function Experiment() {
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch latest experiment
    fetch('http://localhost:8000/api/v1/experiment/latest')
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            setExperiment(null);
            setLoading(false);
            return;
          }
          throw new Error(`Error ${res.status}`);
        }
        return res.json();
      })
      .then(data => setExperiment(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRunExperiment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/experiment/run', {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Failed to start experiment: ${res.status}`);
      // Poll for completion? For simplicity, we'll just refetch after a delay.
      setTimeout(async () => {
        const res2 = await fetch('http://localhost:8000/api/v1/experiment/latest');
        if (res2.ok) {
          const data = await res2.json();
          setExperiment(data);
        }
        setLoading(false);
      }, 5000); // wait 5 seconds for background task to finish
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  if (loading && !experiment) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Experiment Lab</h1>
          <p>Loading experiment results...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Experiment Lab</h1>
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        </div>
      </Layout>
    );
  }

  if (!experiment) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Experiment Lab</h1>
          <p>No experiment data available. Run an experiment to see results.</p>
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleRunExperiment} style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              Run Experiment
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Experiment Lab</h1>
        <p>
          <Link href="/" passHref>
            <a>← Back to Dashboard</a>
          </Link>
        </p>

        <div style={{ marginBottom: '30px' }}>
          <h2>Experiment Info</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Timestamp</h3>
              <p>{new Date(experiment.experiment_info.timestamp).toLocaleString()}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Seed</h3>
              <p>{experiment.experiment_info.seed}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h3>Sample Size</h3>
              <p>{experiment.experiment_info.sample_size}</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>Results Comparison</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
              <h3>Fixed Retry Baseline</h3>
              <div style={{ marginTop: '15px' }}>
                <p><strong>Total Recovered:</strong> ₹{experiment.baseline.total_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Recovery Rate:</strong> {(experiment.baseline.recovery_rate * 100).toFixed(2)}%</p>
                <p><strong>Total Attempts:</strong> {experiment.baseline.total_attempts}</p>
                <p><strong>Total Contacts:</strong> {experiment.baseline.total_contacts}</p>
                <p><strong>Total Cost:</strong> ₹{experiment.baseline.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Events Processed:</strong> {experiment.baseline.events_processed}</p>
              </div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
              <h3>RevenueOS Strategy</h3>
              <div style={{ marginTop: '15px' }}>
                <p><strong>Total Recovered:</strong> ₹{experiment.revenueos.total_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Recovery Rate:</strong> {(experiment.revenueos.recovery_rate * 100).toFixed(2)}%</p>
                <p><strong>Total Attempts:</strong> {experiment.revenueos.total_attempts}</p>
                <p><strong>Total Contacts:</strong> {experiment.revenueos.total_contacts}</p>
                <p><strong>Total Cost:</strong> ₹{experiment.revenueos.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Events Processed:</strong> {experiment.revenueos.events_processed}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>Comparison</h2>
          {experiment.comparison && (
            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
              <div style={{ marginTop: '15px' }}>
                <p><strong>Incremental Revenue Recovered:</strong>
                  ₹{experiment.comparison.incremental_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Incremental Recovery Rate:</strong>
                  {(experiment.comparison.incremental_recovery_rate * 100).toFixed(2)}%</p>
                {experiment.comparison.relative_improvement_recovered !== null && (
                  <p><strong>Relative Improvement in Revenue:</strong>
                    {(experiment.comparison.relative_improvement_recovered * 100).toFixed(2)}%</p>
                )}
                {experiment.comparison.relative_improvement_rate !== null && (
                  <p><strong>Relative Improvement in Rate:</strong>
                    {(experiment.comparison.relative_improvement_rate * 100).toFixed(2)}%</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '30px' }}>
          <button onClick={handleRunExperiment} style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '1.1rem',
            cursor: 'pointer'
          }}>
            Run New Experiment
          </button>
        </div>
      </div>
    </Layout>
  );
}