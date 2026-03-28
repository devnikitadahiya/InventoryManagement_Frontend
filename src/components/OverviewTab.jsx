function OverviewTab({ dashboard, salesTrends }) {
  const metricCards = dashboard
    ? [
        { label: 'Total Products', value: dashboard.total_products },
        {
          label: 'Total Stock Value',
          value: `₹ ${Number(dashboard.total_stock_value).toLocaleString()}`,
        },
        { label: 'Low Stock Items', value: dashboard.low_stock_items },
        { label: 'Out of Stock', value: dashboard.out_of_stock_items },
      ]
    : [];

  if (!dashboard) {
    return <p className="status-text">No overview data available</p>;
  }

  return (
    <>
      <section className="card-grid">
        {metricCards.map((card) => (
          <article key={card.label} className="metric-card">
            <p>{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h3>Top Selling Products</h3>
          {dashboard.top_selling_products?.length ? (
            <ul>
              {dashboard.top_selling_products.map((item) => (
                <li key={item.product_id}>
                  <span>
                    {item.product_name} ({item.sku})
                  </span>
                  <strong>{item.quantity_sold} units</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No sales data available</p>
          )}
        </article>

        <article className="panel">
          <h3>Sales Trends</h3>
          {salesTrends.length ? (
            <ul>
              {salesTrends.slice(-6).map((trend) => (
                <li key={trend.period}>
                  <span>{trend.period}</span>
                  <strong>
                    ₹ {Number(trend.total_revenue || 0).toLocaleString()}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No trend data available</p>
          )}
        </article>
      </section>
    </>
  );
}

export default OverviewTab;
