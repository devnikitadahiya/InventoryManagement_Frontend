import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

function AlertsTab({ token }) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest(token, '/inventory/low-stock?page=1&limit=20');
      const mappedAlerts = (payload.data || []).map((item) => ({
        id: item.product_id,
        severity: item.current_stock === 0 ? 'critical' : 'warning',
        title: item.current_stock === 0 ? 'Out of stock' : 'Low stock',
        message: `${item.product_name} (${item.sku}) is at ${item.current_stock} units. Reorder level is ${item.reorder_level}.`,
        createdAt: item.updated_at,
      }));

      setAlerts(mappedAlerts);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load alerts');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Alerts</h3>
        <button type="button" onClick={loadAlerts}>Refresh Alerts</button>
      </div>

      {isLoading && <p className="status-text">Loading alerts...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <article className="alert-card info">
              <strong>No active low-stock alerts</strong>
              <p>All products are currently above reorder level.</p>
            </article>
          ) : (
            alerts.map((alert) => (
              <article key={alert.id} className={`alert-card ${alert.severity}`}>
                <div className="alert-top-row">
                  <strong>{alert.title}</strong>
                  <span className="alert-badge">{alert.severity}</span>
                </div>
                <p>{alert.message}</p>
                <small>{new Date(alert.createdAt).toLocaleString()}</small>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default AlertsTab;
