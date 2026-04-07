import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

function AnalyticsTab({ token }) {
  const [period, setPeriod] = useState('monthly');
  const [forecastDays, setForecastDays] = useState('30');
  const [trends, setTrends] = useState([]);
  const [forecastSummary, setForecastSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [salesPayload, forecastPayload] = await Promise.all([
        apiRequest(token, `/analytics/sales-trends?period=${period}`),
        apiRequest(token, `/forecast/summary?days=${forecastDays}`),
      ]);

      setTrends(salesPayload.data || []);
      setForecastSummary(forecastPayload.data || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [forecastDays, period, token]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Analytics</h3>
        <div className="control-row">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Sales period"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={forecastDays}
            onChange={(event) => setForecastDays(event.target.value)}
            aria-label="Forecast horizon"
          >
            <option value="7">Forecast 7 days</option>
            <option value="15">Forecast 15 days</option>
            <option value="30">Forecast 30 days</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="status-text">Loading analytics...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <>
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
                {trends.map((row, index) => (
                  <tr key={`${row.period || 'period'}-${index}`}>
                    <td>{row.period}</td>
                    <td>{row.total_quantity}</td>
                    <td>₹ {Number(row.total_revenue || 0).toLocaleString()}</td>
                    <td>{row.transactions_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <article className="panel">
            <h3>Forecast Summary</h3>
            <p className="window-size-text">Window size: {forecastDays} days</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Predicted Demand</th>
                    <th>Model Accuracy</th>
                    <th>Stockout Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastSummary.slice(0, 12).map((item, index) => (
                    <tr key={`${item.product_id || 'forecast'}-${index}`}>
                      <td>{item.product_name}</td>
                      <td>{Number(item.total_predicted_demand || 0).toFixed(1)}</td>
                      <td>{Number(item.model_accuracy || 0).toFixed(1)}%</td>
                      <td>{item.stockout_risk?.at_risk ? 'At risk' : 'Stable'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}

export default AnalyticsTab;
