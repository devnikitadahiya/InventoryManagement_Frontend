import { useState, useEffect } from 'react';
import { apiRequest } from '../api';

function UsersTab({ token, user }) {
  const role = user?.role || 'staff';
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff' });
  const [creating, setCreating] = useState(false);

  // Roles this caller is allowed to assign
  const assignableRoles = role === 'admin' ? ['admin', 'manager', 'staff'] : ['staff'];

  const loadUsers = async () => {
    setErrorMessage('');
    try {
      const payload = await apiRequest(token, '/auth/users');
      setUsers(payload.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load users');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setCreating(true);
    try {
      await apiRequest(token, '/auth/register', 'POST', form);
      setSuccessMessage(`User "${form.full_name}" created successfully`);
      setForm({ full_name: '', email: '', password: '', role: 'staff' });
      loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="module-section">
      <div className="module-header">
        <h3>Users</h3>
        <button type="button" onClick={loadUsers}>Refresh</button>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}
      {successMessage && <p className="status-text">{successMessage}</p>}

      <article className="panel">
        <h3>{role === 'admin' ? 'Create New User' : 'Create Staff Account'}</h3>
        <form className="grid-form" onSubmit={handleCreate}>
          <input
            placeholder="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {assignableRoles.length > 1 ? (
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          ) : (
            <input value="Staff" readOnly />
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </article>

      <article className="panel">
        <h3>All Users</h3>
        {users.length === 0 ? (
          <p className="status-text">No users found</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}

export default UsersTab;
