import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

function InventoryTab({ token }) {
  const [statusData, setStatusData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [historyProductId, setHistoryProductId] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [statusPayload, lowStockPayload] = await Promise.all([
        apiRequest(token, '/inventory/status'),
        apiRequest(token, '/inventory/low-stock?page=1&limit=10'),
      ]);

      setStatusData(statusPayload.data || null);
      setLowStock(lowStockPayload.data || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const fetchHistory = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setHistoryData([]);

    if (!historyProductId) {
      return;
    }

    try {
      const payload = await apiRequest(token, `/inventory/history/${historyProductId}`);
      setHistoryData(payload.data?.history || []);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Inventory</h3>
        <button type="button" onClick={loadInventory}>Refresh</button>
      </div>

      {isLoading && <p className="status-text">Loading inventory...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && statusData?.summary && (
        <section className="card-grid inventory-cards">
          <article className="metric-card">
            <p>Total Units</p>
            <h3>{statusData.summary.total_stock_units}</h3>
          </article>
          <article className="metric-card">
            <p>Total Value</p>
            <h3>₹ {Number(statusData.summary.total_inventory_value || 0).toLocaleString()}</h3>
          </article>
          <article className="metric-card">
            <p>Low Stock</p>
            <h3>{statusData.summary.low_stock_items}</h3>
          </article>
          <article className="metric-card">
            <p>Out of Stock</p>
            <h3>{statusData.summary.out_of_stock_items}</h3>
          </article>
        </section>
      )}

      <article className="panel">
        <h3>Low Stock Items</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Stock</th>
                <th>Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td>{item.current_stock}</td>
                  <td>{item.reorder_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <h3>Stock History</h3>
        <form className="inline-form" onSubmit={fetchHistory}>
          <input
            type="number"
            placeholder="Enter product id"
            value={historyProductId}
            onChange={(event) => setHistoryProductId(event.target.value)}
          />
          <button type="submit">Fetch History</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opening</th>
                <th>In</th>
                <th>Out</th>
                <th>Closing</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((row) => (
                <tr key={row.history_id}>
                  <td>{row.date}</td>
                  <td>{row.opening_stock}</td>
                  <td>{row.stock_in}</td>
                  <td>{row.stock_out}</td>
                  <td>{row.closing_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default InventoryTab;
