import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

function AnalyticsTab({ token }) {
  const [period, setPeriod] = useState('monthly');
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest(
        token,
        `/analytics/sales-trends?period=${period}`
      );
      setTrends(payload.data || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [period, token]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Analytics</h3>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {isLoading && <p className="status-text">Loading analytics...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Total Quantity</th>
                <th>Total Revenue</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.total_quantity}</td>
                  <td>₹ {Number(row.total_revenue || 0).toLocaleString()}</td>
                  <td>{row.transactions_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AnalyticsTab;
