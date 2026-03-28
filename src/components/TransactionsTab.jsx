import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

const initialForm = {
  product_id: '',
  quantity: '',
  unit_price: '',
  reference_number: '',
  notes: '',
};

function TransactionsTab({ token }) {
  const [mode, setMode] = useState('in');
  const [form, setForm] = useState(initialForm);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);

    try {
      const query = typeFilter ? `?type=${typeFilter}&page=1&limit=10` : '?page=1&limit=10';
      const payload = await apiRequest(token, `/transactions${query}`);
      setTransactions(payload.data || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const endpoint = mode === 'in' ? '/transactions/stock-in' : '/transactions/stock-out';

      await apiRequest(token, endpoint, {
        method: 'POST',
        body: JSON.stringify({
          product_id: Number(form.product_id),
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_price),
          reference_number: form.reference_number || null,
          notes: form.notes || null,
        }),
      });

      setForm(initialForm);
      await loadTransactions();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Transactions</h3>
        <div className="toggle-group">
          <button
            type="button"
            className={mode === 'in' ? 'active' : ''}
            onClick={() => setMode('in')}
          >
            Stock In
          </button>
          <button
            type="button"
            className={mode === 'out' ? 'active' : ''}
            onClick={() => setMode('out')}
          >
            Stock Out
          </button>
        </div>
      </div>

      <form className="grid-form" onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Product ID"
          value={form.product_id}
          onChange={(event) => setForm((prev) => ({ ...prev, product_id: event.target.value }))}
          required
        />
        <input
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
          required
        />
        <input
          type="number"
          placeholder="Unit Price"
          value={form.unit_price}
          onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))}
          required
        />
        <input
          placeholder="Reference Number"
          value={form.reference_number}
          onChange={(event) => setForm((prev) => ({ ...prev, reference_number: event.target.value }))}
        />
        <input
          placeholder="Notes"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
        <button type="submit">Record {mode === 'in' ? 'Stock In' : 'Stock Out'}</button>
      </form>

      <div className="module-header slim">
        <h3>History</h3>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">All</option>
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
      </div>

      {isLoading && <p className="status-text">Loading transactions...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && (
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
              {transactions.map((row) => (
                <tr key={row.transaction_id}>
                  <td>{new Date(row.transaction_date).toLocaleString()}</td>
                  <td>{row.product_name}</td>
                  <td>{row.transaction_type}</td>
                  <td>{row.quantity}</td>
                  <td>₹ {Number(row.total_amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TransactionsTab;
