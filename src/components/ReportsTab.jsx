import { useCallback, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../api';

function downloadCsv(fileName, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReportsTab({ token }) {
  const [inventoryReport, setInventoryReport] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [forecastSummary, setForecastSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReportsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [invPayload, txPayload, lowPayload, catPayload, forecastPayload] = await Promise.all([
        apiRequest(token, '/reports/inventory'),
        apiRequest(token, '/reports/transactions?limit=50'),
        apiRequest(token, '/reports/low-stock'),
        apiRequest(token, '/reports/category-sales'),
        apiRequest(token, '/forecast/summary?days=30'),
      ]);
      setInventoryReport(invPayload.data || []);
      setTransactions(txPayload.data || []);
      setLowStock(lowPayload.data || []);
      setCategorySales(catPayload.data || []);
      setForecastSummary(forecastPayload.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  const exportInventoryReport = () => {
    downloadCsv(
      'inventory-report.csv',
      inventoryReport.map((r) => ({
        product_id: r.product_id,
        sku: r.sku,
        product_name: r.product_name,
        category: r.category_name,
        current_stock: r.current_stock,
        reorder_level: r.reorder_level,
        stock_status: r.stock_status,
        unit_price: r.unit_price,
        stock_value: r.stock_value,
      }))
    );
  };

  const exportTransactions = () => {
    downloadCsv(
      'transactions.csv',
      transactions.map((r) => ({
        transaction_id: r.transaction_id,
        product_name: r.product_name,
        sku: r.sku,
        type: r.transaction_type,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_amount: r.total_amount,
        reference_number: r.reference_number,
        date: r.transaction_date,
        recorded_by: r.created_by_name,
      }))
    );
  };

  const exportLowStock = () => {
    downloadCsv(
      'low-stock-report.csv',
      lowStock.map((r) => ({
        sku: r.sku,
        product_name: r.product_name,
        category: r.category_name,
        current_stock: r.current_stock,
        reorder_level: r.reorder_level,
        units_needed: r.units_needed,
        estimated_reorder_cost: r.estimated_reorder_cost,
        status: r.status,
      }))
    );
  };

  const exportForecastPdf = () => {
    if (!forecastSummary.length) return;
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('Forecast Summary Report', 14, 16);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
    let y = 34;
    forecastSummary.slice(0, 20).forEach((item, i) => {
      const line = `${i + 1}. ${item.product_name} (${item.sku}) | Predicted: ${Number(item.total_predicted_demand || 0).toFixed(1)} | Accuracy: ${Number(item.model_accuracy || 0).toFixed(1)}% | Risk: ${item.stockout_risk?.at_risk ? 'At risk' : 'Stable'}`;
      const lines = pdf.splitTextToSize(line, 180);
      if (y + lines.length * 6 > 280) { pdf.addPage(); y = 20; }
      pdf.text(lines, 14, y);
      y += lines.length * 6 + 2;
    });
    pdf.save('forecast-summary.pdf');
  };

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Reports</h3>
        <button type="button" onClick={loadReportsData}>Refresh Data</button>
      </div>

      {isLoading && <p className="status-text">Loading reports data...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <>
          <article className="panel">
            <h3>Export Reports</h3>
            <div className="export-row">
              <button type="button" onClick={exportInventoryReport}>Export Inventory (CSV)</button>
              <button type="button" onClick={exportTransactions}>Export Transactions (CSV)</button>
              <button type="button" onClick={exportLowStock}>Export Low Stock (CSV)</button>
              <button type="button" onClick={exportForecastPdf}>Export Forecast (PDF)</button>
            </div>
          </article>

          <article className="panel">
            <h3>Low Stock &amp; Out of Stock ({lowStock.length} items)</h3>
            {lowStock.length === 0 ? (
              <p>All products are sufficiently stocked.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Reorder At</th>
                      <th>Need</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((r) => (
                      <tr
                        key={r.product_id}
                        className={r.status === 'out_of_stock' ? 'row-critical' : 'row-warning'}
                      >
                        <td>{r.sku}</td>
                        <td>{r.product_name}</td>
                        <td>{r.category_name || '—'}</td>
                        <td>{r.current_stock}</td>
                        <td>{r.reorder_level}</td>
                        <td>{r.units_needed}</td>
                        <td>{r.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="panel">
            <h3>Category Sales Breakdown</h3>
            {categorySales.length === 0 ? (
              <p>No sales data available.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Products</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySales.map((r) => (
                      <tr key={r.category_name}>
                        <td>{r.category_name}</td>
                        <td>{r.products_count}</td>
                        <td>{r.total_quantity_sold}</td>
                        <td>₹ {Number(r.total_revenue).toLocaleString()}</td>
                        <td>{r.transaction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="panel">
            <h3>Recent Transactions Preview</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((r) => (
                    <tr key={r.transaction_id}>
                      <td>{new Date(r.transaction_date).toLocaleDateString()}</td>
                      <td>{r.product_name}</td>
                      <td>{r.transaction_type}</td>
                      <td>{r.quantity}</td>
                      <td>₹ {Number(r.total_amount || 0).toLocaleString()}</td>
                      <td>{r.reference_number || '—'}</td>
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

export default ReportsTab;
