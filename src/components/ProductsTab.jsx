import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

const defaultForm = {
  sku: '',
  product_name: '',
  unit_price: '',
  current_stock: '',
  reorder_level: '',
};

function ProductsTab({ token, role }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [activeEditId, setActiveEditId] = useState(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest(
        token,
        `/products?page=${page}&limit=10&search=${encodeURIComponent(search)}`
      );
      setProducts(payload.data || []);
      setPagination(payload.pagination || null);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      await apiRequest(token, '/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: form.sku,
          product_name: form.product_name,
          unit_price: Number(form.unit_price),
          current_stock: Number(form.current_stock || 0),
          reorder_level: Number(form.reorder_level || 10),
        }),
      });

      setForm(defaultForm);
      setPage(1);
      await loadProducts();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const startEdit = (product) => {
    setActiveEditId(product.product_id);
    setForm({
      sku: product.sku || '',
      product_name: product.product_name || '',
      unit_price: product.unit_price || '',
      current_stock: product.current_stock || '',
      reorder_level: product.reorder_level || '',
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      await apiRequest(token, `/products/${activeEditId}`, {
        method: 'PUT',
        body: JSON.stringify({
          sku: form.sku,
          product_name: form.product_name,
          unit_price: Number(form.unit_price),
          current_stock: Number(form.current_stock || 0),
          reorder_level: Number(form.reorder_level || 10),
        }),
      });

      setActiveEditId(null);
      setForm(defaultForm);
      await loadProducts();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    try {
      await apiRequest(token, `/products/${productId}`, { method: 'DELETE' });
      await loadProducts();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Products</h3>
        <form className="inline-form" onSubmit={handleSearch}>
          <input
            placeholder="Search by name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      <form className="grid-form" onSubmit={activeEditId ? handleUpdate : handleCreate}>
        <input
          placeholder="SKU"
          value={form.sku}
          onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
          required
        />
        <input
          placeholder="Product name"
          value={form.product_name}
          onChange={(event) => setForm((prev) => ({ ...prev, product_name: event.target.value }))}
          required
        />
        <input
          type="number"
          placeholder="Unit price"
          value={form.unit_price}
          onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))}
          required
        />
        <input
          type="number"
          placeholder="Current stock"
          value={form.current_stock}
          onChange={(event) => setForm((prev) => ({ ...prev, current_stock: event.target.value }))}
        />
        <input
          type="number"
          placeholder="Reorder level"
          value={form.reorder_level}
          onChange={(event) => setForm((prev) => ({ ...prev, reorder_level: event.target.value }))}
        />
        <button type="submit">{activeEditId ? 'Update Product' : 'Add Product'}</button>
      </form>

      {isLoading && <p className="status-text">Loading products...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td>₹ {Number(item.unit_price || 0).toLocaleString()}</td>
                  <td>{item.current_stock}</td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => startEdit(item)}>Edit</button>
                    {role !== 'staff' && (
                      <button type="button" onClick={() => handleDelete(item.product_id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-row">
        <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
          Prev
        </button>
        <span>
          Page {pagination?.page || page} / {pagination?.totalPages || 1}
        </span>
        <button
          type="button"
          disabled={pagination ? page >= pagination.totalPages : true}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default ProductsTab;
