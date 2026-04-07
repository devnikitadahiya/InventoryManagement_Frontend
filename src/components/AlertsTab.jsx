import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

const SEVERITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

function AlertsTab({ token, userRole }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('unresolved');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setActionMessage('');
    try {
      await apiRequest(token, '/forecast/refresh-alerts?days=30', { method: 'POST' });

      const queryMap = {
        unread: '/alerts?unread=true&limit=50',
        unresolved: '/alerts?unresolved=true&limit=50',
        all: '/alerts?limit=50',
      };
      const query = queryMap[filter] || queryMap.all;

      const payload = await apiRequest(token, query);
      setAlerts(payload.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load alerts');
    } finally {
      setIsLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const markRead = async (alertId) => {
    try {
      await apiRequest(token, `/alerts/${alertId}/read`, { method: 'PUT' });
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === alertId ? { ...a, is_read: true } : a))
      );
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const resolve = async (alertId) => {
    try {
      await apiRequest(token, `/alerts/${alertId}/resolve`, { method: 'PUT' });
      setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
      setActionMessage('Alert resolved.');
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await apiRequest(token, `/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>
          Alerts{' '}
          {unreadCount > 0 && <span className="badge-count">{unreadCount} unread</span>}
        </h3>
        <div className="control-row">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Alert filter"
          >
            <option value="unresolved">Unresolved</option>
            <option value="unread">Unread</option>
            <option value="all">All</option>
          </select>
          <button type="button" onClick={loadAlerts}>
            Refresh
          </button>
        </div>
      </div>

      {isLoading && <p className="status-text">Loading alerts...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      {actionMessage && <p className="status-text">{actionMessage}</p>}

      {!isLoading && !errorMessage && (
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <article className="alert-card info">
              <strong>No alerts found</strong>
              <p>All products are currently within healthy stock and forecast ranges.</p>
            </article>
          ) : (
            alerts.map((alert) => (
              <article
                key={alert.alert_id}
                className={`alert-card ${alert.severity}${alert.is_read ? '' : ' unread'}`}
              >
                <div className="alert-top-row">
                  <strong>{alert.alert_type.replaceAll('_', ' ')}</strong>
                  <span className="alert-badge">
                    {SEVERITY_LABELS[alert.severity] || alert.severity}
                  </span>
                  {!alert.is_read && <span className="badge-new">New</span>}
                </div>
                <p>{alert.message}</p>
                {alert.product_name && (
                  <small>
                    Product: {alert.product_name} ({alert.sku})
                  </small>
                )}
                <small>{new Date(alert.created_at).toLocaleString()}</small>
                <div className="alert-actions">
                  {!alert.is_read && (
                    <button type="button" onClick={() => markRead(alert.alert_id)}>
                      Mark as Read
                    </button>
                  )}
                  {!alert.is_resolved &&
                    (userRole === 'admin' || userRole === 'manager') && (
                      <button type="button" onClick={() => resolve(alert.alert_id)}>
                        Resolve
                      </button>
                    )}
                  {userRole === 'admin' && (
                    <button type="button" onClick={() => deleteAlert(alert.alert_id)}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default AlertsTab;

