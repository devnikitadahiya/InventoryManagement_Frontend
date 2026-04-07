import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { TOKEN_KEY } from '../config';
import { apiRequest } from '../api';
import OverviewTab from './OverviewTab';
import ProductsTab from './ProductsTab';
import InventoryTab from './InventoryTab';
import TransactionsTab from './TransactionsTab';
import AnalyticsTab from './AnalyticsTab';
import AlertsTab from './AlertsTab';
import ReportsTab from './ReportsTab';
import UsersTab from './UsersTab';

function Dashboard({ token, user, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [forecastSummary, setForecastSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const role = user?.role || 'staff';

  const allTabs = [
    { key: 'overview', label: 'Overview', path: '/overview', roles: ['admin', 'manager', 'staff'] },
    { key: 'products', label: 'Products', path: '/products', roles: ['admin', 'manager', 'staff'] },
    { key: 'inventory', label: 'Inventory', path: '/inventory', roles: ['admin', 'manager', 'staff'] },
    { key: 'transactions', label: 'Transactions', path: '/transactions', roles: ['admin', 'manager', 'staff'] },
    { key: 'analytics', label: 'Analytics', path: '/analytics', roles: ['admin', 'manager', 'staff'] },
    { key: 'alerts', label: 'Alerts', path: '/alerts', roles: ['admin', 'manager', 'staff'] },
    { key: 'reports', label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
    { key: 'users', label: 'Users', path: '/users', roles: ['admin', 'manager'] },
  ];

  const visibleTabs = allTabs.filter((tab) => tab.roles.includes(role));
  const defaultPath = visibleTabs[0]?.path || '/overview';

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [dashboardPayload, salesPayload, forecastPayload] = await Promise.all([
          apiRequest(token, '/analytics/dashboard'),
          apiRequest(token, '/analytics/sales-trends?period=monthly'),
          apiRequest(token, '/forecast/summary?days=30'),
        ]);

        setDashboard(dashboardPayload.data);
        setSalesTrends(salesPayload.data || []);
        setForecastSummary(forecastPayload.data || []);
      } catch (error) {
        setErrorMessage(error.message || 'Something went wrong while loading data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
  };

  const renderTabByKey = (key) => {
    if (key === 'overview') {
      return (
        <OverviewTab
          dashboard={dashboard}
          salesTrends={salesTrends}
          forecastSummary={forecastSummary}
        />
      );
    }

    if (key === 'products') {
      return <ProductsTab token={token} role={role} />;
    }

    if (key === 'inventory') {
      return <InventoryTab token={token} />;
    }

    if (key === 'transactions') {
      return <TransactionsTab token={token} />;
    }

    if (key === 'analytics') {
      return <AnalyticsTab token={token} />;
    }

    if (key === 'alerts') {
      return <AlertsTab token={token} />;
    }

    if (key === 'reports') {
      return <ReportsTab token={token} />;
    }

    if (key === 'users') {
      return <UsersTab token={token} user={user} />;
    }

    return null;
  };

  return (
    <div className="dashboard-wrapper">
      <header className="topbar">
        <div>
          <h2>Inventory Dashboard</h2>
          <p className="sub-text">
            {user?.full_name ? `Welcome, ${user.full_name}` : 'Welcome'}
          </p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <nav className="tab-nav">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.path}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {isLoading && <p className="status-text">Loading dashboard...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <Routes>
          <Route path="/" element={<Navigate to={defaultPath} replace />} />
          {visibleTabs.map((tab) => (
            <Route
              key={tab.key}
              path={tab.path}
              element={renderTabByKey(tab.key)}
            />
          ))}
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      )}
    </div>
  );
}

export default Dashboard;
