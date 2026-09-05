import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';

export default function FailureLab() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    // Define the failure lab scenarios
    const failureScenarios = [
      {
        id: 'disputed-payment',
        label: 'Disputed Payment',
        description: 'A payment that has been marked as disputed by the customer or merchant.'
      },
      {
        id: 'high-amount',
        label: 'High Amount Payment',
        description: 'A payment with an amount greater than ₹10,000 (requires human approval).'
      },
      {
        id: 'retry-limit-exceeded',
        label: 'Retry Limit Exceeded',
        description: 'A payment that has already exceeded the maximum number of retry attempts.'
      },
      {
        id: 'contact-limit-exceeded',
        label: 'Contact Limit Exceeded',
        description: 'A payment that has already exceeded the maximum number of customer contacts.'
      },
      {
        id: 'unknown-failure-code',
        label: 'Unknown Failure Code',
        description: 'A payment with a failure code not recognized by the system.'
      }
    ];
    setScenarios(failureScenarios);
    setLoading(false);
  }, []);

  const handleRunScenario = async (scenarioId) => {
    setLoading(true);
    setError(null);
    // Set the result for this scenario to loading
    setResults(prev => ({ ...prev, [scenarioId]: { loading: true } }));
    try {
      // Call the failure lab endpoint
      const response = await fetch(`http://localhost:8000/api/v1/failure-lab/${scenarioId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to run scenario: ${response.statusText}`);
      }
      const result = await response.json();
      setResults(prev => ({ ...prev, [scenarioId]: { loading: false, result } }));
    } catch (err) {
      setError(err);
      setResults(prev => ({ ...prev, [scenarioId]: { loading: false, error: err.message } }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Failure Lab</h1>
          <p>Loading scenarios...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Failure Lab</h1>
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Failure Lab</h1>
        <p>Test how RevenueOS handles edge cases and failure scenarios.</p>

        {scenarios.length > 0 ? (
          <div style={{ marginTop: '20px' }}>
            {scenarios.map(scenario => (
              <div key={scenario.id} style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '20px', marginBottom: '20px' }}>
                <h2>{scenario.label}</h2>
                <p>{scenario.description}</p>
                <div style={{ marginTop: '15px' }}>
                  <button
                    onClick={() => handleRunScenario(scenario.id)}
                    disabled={results[scenario.id]?.loading}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '10px 20px',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: results[scenario.id]?.loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {results[scenario.id]?.loading ? 'Running...' : 'Run Scenario'}
                  </button>
                </div>
                {results[scenario.id] && !results[scenario.id].loading && (
                  <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    {results[scenario.id].error ? (
                      <p style={{ color: '#dc3545' }}>Error: {results[scenario.id].error}</p>
                    ) : (
                      <>
                        <h3>Result:</h3>
                        <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
                          {JSON.stringify(results[scenario.id].result, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No scenarios defined.</p>
        )}
      </div>
    </Layout>
  );
}