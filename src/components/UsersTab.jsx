import { useState, useEffect } from 'react';
import { apiRequest } from '../api';

function UsersTab({ token, user }) {
  const role = user?.role || 'staff';
  const currentUserId = user?.user_id || user?.id || null;
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff' });
  const [creating, setCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  // Roles this caller is allowed to assign
  const assignableRoles = role === 'admin' ? ['admin', 'manager', 'staff'] : ['staff'];
  const canManageUsers = role === 'admin';

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
      await apiRequest(token, '/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccessMessage(`User "${form.full_name}" created successfully`);
      setForm({ full_name: '', email: '', password: '', role: 'staff' });
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    setErrorMessage('');
    setSuccessMessage('');
    setBusyUserId(userId);

    try {
      await apiRequest(token, `/auth/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole }),
      });
      setSuccessMessage('User role updated successfully');
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update role');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeactivate = async (userId) => {
    const confirmed = window.confirm('Deactivate this user account?');

    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setBusyUserId(userId);

    try {
      await apiRequest(token, `/auth/users/${userId}/deactivate`, {
        method: 'PUT',
      });
      setSuccessMessage('User deactivated successfully');
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to deactivate user');
    } finally {
      setBusyUserId(null);
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
                <th>Status</th>
                {canManageUsers && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    {canManageUsers ? (
                      <select
                        aria-label={`Role for ${u.email}`}
                        value={u.role}
                        disabled={busyUserId === u.user_id || !u.is_active || u.user_id === currentUserId}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      >
                        {assignableRoles.map((availableRole) => (
                          <option key={availableRole} value={availableRole}>
                            {availableRole.charAt(0).toUpperCase() + availableRole.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                  {canManageUsers && (
                    <td>
                      <button
                        type="button"
                        aria-label={`Deactivate ${u.email}`}
                        disabled={busyUserId === u.user_id || !u.is_active || u.user_id === currentUserId}
                        onClick={() => handleDeactivate(u.user_id)}
                      >
                        {busyUserId === u.user_id ? 'Working...' : 'Deactivate'}
                      </button>
                    </td>
                  )}
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
