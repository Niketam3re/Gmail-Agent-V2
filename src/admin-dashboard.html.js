export function generateAdminDashboard(users, stats) {
  const recentUsers = users.slice(0, 10);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f7fa;
          min-height: 100vh;
        }
        .top-bar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .top-bar-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .top-bar h1 {
          font-size: 1.5rem;
        }
        .top-bar-links {
          display: flex;
          gap: 1rem;
        }
        .top-bar-links a {
          color: white;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .top-bar-links a:hover {
          background: rgba(255,255,255,0.2);
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #667eea;
        }
        .stat-card.green { border-left-color: #10b981; }
        .stat-card.blue { border-left-color: #3b82f6; }
        .stat-card.purple { border-left-color: #8b5cf6; }
        .stat-card .label {
          color: #666;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }
        .stat-card .value {
          color: #333;
          font-size: 2rem;
          font-weight: 700;
        }
        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .card-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .card-header h2 {
          font-size: 1.25rem;
          color: #333;
        }
        .table-container {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #f9fafb;
        }
        th {
          padding: 1rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          color: #333;
        }
        tr:hover {
          background: #f9fafb;
        }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .user-info .name {
          font-weight: 600;
          color: #333;
        }
        .user-info .email {
          font-size: 0.875rem;
          color: #666;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-active {
          background: #d1fae5;
          color: #059669;
        }
        .badge-inactive {
          background: #fee2e2;
          color: #dc2626;
        }
        .badge-new {
          background: #dbeafe;
          color: #2563eb;
        }
        .refresh-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .refresh-btn:hover {
          background: #5568d3;
        }
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="top-bar">
        <div class="top-bar-content">
          <h1>🛡️ Admin Dashboard</h1>
          <div class="top-bar-links">
            <a href="/dashboard">My Dashboard</a>
            <a href="/logout">Logout</a>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Total Users</div>
            <div class="value">${stats.totalUsers}</div>
          </div>
          <div class="stat-card green">
            <div class="label">New This Week</div>
            <div class="value">${stats.newThisWeek}</div>
          </div>
          <div class="stat-card blue">
            <div class="label">Active Users</div>
            <div class="value">${stats.activeUsers}</div>
          </div>
          <div class="stat-card purple">
            <div class="label">New Today</div>
            <div class="value">${stats.newToday}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2>All Users</h2>
              <button class="refresh-btn" onclick="location.reload()">Refresh</button>
            </div>
          </div>
          <div class="table-container">
            ${users.length === 0 ? `
              <div class="empty-state">
                <p>No users found</p>
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => {
                    const joinDate = new Date(user.created_at).toLocaleDateString();
                    const lastLogin = user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never';
                    const isNew = (new Date() - new Date(user.created_at)) < 86400000; // 24 hours

                    return `
                      <tr>
                        <td>
                          <div class="user-cell">
                            <img src="${user.picture}" alt="${user.name}" class="user-avatar">
                            <div class="user-info">
                              <div class="name">${user.name}</div>
                              <div class="email">${user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">
                            ${user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          ${isNew ? '<span class="badge badge-new" style="margin-left: 0.5rem;">New</span>' : ''}
                        </td>
                        <td>${joinDate}</td>
                        <td>${lastLogin}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
