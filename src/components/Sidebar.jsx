import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ role }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    navigate('/');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="material-icons text-gray-700">architecture</span>
          <div>
            <h1 className="font-bold text-gray-900">Executive Architect</h1>
            <p className="text-xs text-gray-500">CRM Engine</p>
          </div>
        </div>
      </div>

      {/* New Record Button */}
      <div className="p-4">
        <button className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition">
          <span className="material-icons text-sm">add</span>
          <span>New Record</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          <li>
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                isActive('/dashboard')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-xl">dashboard</span>
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard?tab=customers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                location.search.includes('customers')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-xl">group</span>
              <span>Customers</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard?tab=orders"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                location.search.includes('orders')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-xl">shopping_cart</span>
              <span>Orders</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard?tab=workflows"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                location.search.includes('workflows')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-xl">account_tree</span>
              <span>Workflows</span>
            </Link>
          </li>
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <span className="material-icons text-xl">settings</span>
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="material-icons text-gray-600">person</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">{role === 'admin' ? 'Marcus Sterling' : 'Team Member'}</p>
            <p className="text-xs text-gray-500">{role === 'admin' ? 'Lead Architect' : 'User'}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
            <span className="material-icons text-sm">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
