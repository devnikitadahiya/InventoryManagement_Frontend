import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

  const totalRevenue = trends.reduce(
    (accumulator, item) => accumulator + Number(item.total_revenue || 0),
    0
  );

  const totalQuantity = trends.reduce(
    (accumulator, item) => accumulator + Number(item.total_quantity || 0),
    0
  );

  const averageAccuracy = forecastSummary.length
    ? forecastSummary.reduce(
        (accumulator, item) => accumulator + Number(item.model_accuracy || 0),
        0
      ) / forecastSummary.length
    : 0;

  const riskSummary = forecastSummary.reduce(
    (accumulator, item) => {
      if (item.stockout_risk?.at_risk) {
        accumulator.atRisk += 1;
      } else {
        accumulator.stable += 1;
      }

      return accumulator;
    },
    { atRisk: 0, stable: 0 }
  );

  const trendChartData = trends.map((item, index) => ({
    label: `T${index + 1}`,
    period: item.period,
    revenue: Number(item.total_revenue || 0),
    quantity: Number(item.total_quantity || 0),
  }));

  const forecastChartData = forecastSummary.slice(0, 8).map((item, index) => ({
    label: `P${index + 1}`,
    name: item.product_name,
    demand: Number(item.total_predicted_demand || 0),
  }));

  const riskChartData = [
    { name: 'At Risk', value: riskSummary.atRisk, color: '#b91c1c' },
    { name: 'Stable', value: riskSummary.stable, color: '#166534' },
  ];

  return (
    <section className="module-section analytics-section">
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
          <section className="card-grid analytics-kpi-grid">
            <article className="metric-card">
              <p>Total Revenue ({period})</p>
              <h3>₹ {totalRevenue.toLocaleString()}</h3>
            </article>
            <article className="metric-card">
              <p>Total Quantity Moved</p>
              <h3>{totalQuantity.toLocaleString()}</h3>
            </article>
            <article className="metric-card">
              <p>Average Model Accuracy</p>
              <h3>{averageAccuracy.toFixed(1)}%</h3>
            </article>
            <article className="metric-card">
              <p>Stockout Risk (Products)</p>
              <h3>
                <span className="risk-chip danger">{riskSummary.atRisk} At Risk</span>
                <span className="risk-chip safe">{riskSummary.stable} Stable</span>
              </h3>
            </article>
          </section>

          <section className="panel-grid analytics-visual-grid">
            <article className="panel">
              <h3>Revenue Movement</h3>
              {trends.length ? (
                <div className="chart-box" aria-label="Revenue trend bars">
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={trendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe6cf" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value, name, item) => {
                          if (name === 'Revenue') {
                            return [`₹ ${Number(value).toLocaleString()}`, `Revenue (${item.payload.period})`];
                          }

                          return [value, name];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#1d4ed8"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="status-text">No trend data available</p>
              )}
            </article>

            <article className="panel">
              <h3>Forecast Risk Split</h3>
              <div className="forecast-risk-board" aria-label="Forecast risk summary">
                <div className="risk-card danger">
                  <p>At Risk</p>
                  <strong>{riskSummary.atRisk}</strong>
                </div>
                <div className="risk-card safe">
                  <p>Stable</p>
                  <strong>{riskSummary.stable}</strong>
                </div>
              </div>
              {forecastSummary.length > 0 && (
                <div className="chart-box compact">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={riskChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={44}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {riskChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="status-text">
                Forecast horizon is currently set to {forecastDays} days.
              </p>
            </article>
          </section>

          {forecastChartData.length > 0 && (
            <article className="panel">
              <h3>Top Predicted Demand Products</h3>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={forecastChartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe6cf" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value, _name, item) => [
                        `${Number(value).toFixed(1)} units`,
                        item.payload.name,
                      ]}
                    />
                    <Bar dataKey="demand" name="Predicted Demand" radius={[6, 6, 0, 0]} fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

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
                      <td>
                        <span className={`risk-pill ${item.stockout_risk?.at_risk ? 'danger' : 'safe'}`}>
                          {item.stockout_risk?.at_risk ? 'At risk' : 'Stable'}
                        </span>
                      </td>
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
