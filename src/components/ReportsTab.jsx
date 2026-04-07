import { useCallback, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../api';

function downloadCsv(fileName, rows) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
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
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [forecastSummary, setForecastSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReportsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [dashboardPayload, txPayload, forecastPayload] = await Promise.all([
        apiRequest(token, '/analytics/dashboard'),
        apiRequest(token, '/transactions?page=1&limit=50'),
        apiRequest(token, '/forecast/summary?days=30'),
      ]);

      setDashboard(dashboardPayload.data || null);
      setTransactions(txPayload.data || []);
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

  const exportInventorySummary = () => {
    if (!dashboard) {
      return;
    }

    downloadCsv('inventory-summary.csv', [
      {
        total_products: dashboard.total_products,
        total_stock_value: dashboard.total_stock_value,
        low_stock_items: dashboard.low_stock_items,
        out_of_stock_items: dashboard.out_of_stock_items,
        recent_sales: dashboard.recent_sales,
        recent_sales_transactions: dashboard.recent_sales_transactions,
      },
    ]);
  };

  const exportTransactionHistory = () => {
    if (!transactions.length) {
      return;
    }

    const rows = transactions.map((item) => ({
      transaction_id: item.transaction_id,
      product_name: item.product_name,
      transaction_type: item.transaction_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      transaction_date: item.transaction_date,
      reference_number: item.reference_number,
    }));

    downloadCsv('transaction-history.csv', rows);
  };

  const exportForecastSummary = () => {
    if (!forecastSummary.length) {
      return;
    }

    const rows = forecastSummary.map((item) => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      current_stock: item.current_stock,
      total_predicted_demand: item.total_predicted_demand,
      average_daily_demand: item.average_daily_demand,
      model_accuracy: item.model_accuracy,
      at_risk: item.stockout_risk?.at_risk ? 'yes' : 'no',
      estimated_days_to_stockout: item.stockout_risk?.estimated_days_to_stockout ?? '',
      projected_stockout_date: item.stockout_risk?.projected_stockout_date ?? '',
    }));

    downloadCsv('forecast-summary.csv', rows);
  };

  const exportForecastSummaryPdf = () => {
    if (!forecastSummary.length) {
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('Forecast Summary Report', 14, 16);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

    let cursorY = 34;
    forecastSummary.slice(0, 20).forEach((item, index) => {
      const rowText = `${index + 1}. ${item.product_name} (${item.sku}) | Predicted: ${Number(item.total_predicted_demand || 0).toFixed(1)} | Accuracy: ${Number(item.model_accuracy || 0).toFixed(1)}% | Risk: ${item.stockout_risk?.at_risk ? 'At risk' : 'Stable'}`;
      const lines = pdf.splitTextToSize(rowText, 180);

      if (cursorY + lines.length * 6 > 280) {
        pdf.addPage();
        cursorY = 20;
      }

      pdf.text(lines, 14, cursorY);
      cursorY += lines.length * 6 + 2;
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
            <p className="sub-text">Download CSV reports generated from live dashboard and transactions data.</p>
            <div className="export-row">
              <button type="button" onClick={exportInventorySummary}>Export Inventory Summary (CSV)</button>
              <button type="button" onClick={exportTransactionHistory}>Export Transactions (CSV)</button>
              <button type="button" onClick={exportForecastSummary}>Export Forecast Summary (CSV)</button>
              <button type="button" onClick={exportForecastSummaryPdf}>Export Forecast Summary (PDF)</button>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((item) => (
                    <tr key={item.transaction_id}>
                      <td>{new Date(item.transaction_date).toLocaleString()}</td>
                      <td>{item.product_name}</td>
                      <td>{item.transaction_type}</td>
                      <td>{item.quantity}</td>
                      <td>₹ {Number(item.total_amount || 0).toLocaleString()}</td>
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
