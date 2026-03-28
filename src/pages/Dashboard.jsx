import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [role, setRole] = useState('');
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [wooStatus, setWooStatus] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const res = await axios.get('/api/me');
      setRole(res.data.role);
      loadStats();
      loadCustomers();
      loadOrders();
      loadCommunications();
      if (res.data.role === 'admin') checkWooStatus();
    } catch {
      navigate('/');
    }
  }

  async function loadStats() {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch {}
  }

  async function loadCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch {}
  }

  async function loadOrders() {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data);
    } catch {}
  }

  async function loadCommunications() {
    try {
      const res = await axios.get('/api/communications');
      setCommunications(res.data);
    } catch {}
  }

  async function checkWooStatus() {
    try {
      const res = await axios.get('/api/woocommerce/status');
      setWooStatus(res.data);
    } catch {}
  }

  async function syncCustomers() {
    try {
      setSyncMessage('Syncing...');
      const res = await axios.post('/api/woocommerce/sync-customers');
      setSyncMessage(res.data.message);
      loadCustomers();
      loadStats();
    } catch (e) {
      setSyncMessage('Failed: ' + (e.response?.data?.error || e.message));
    }
  }

  async function syncOrders() {
    try {
      setSyncMessage('Syncing...');
      const res = await axios.post('/api/woocommerce/sync-orders');
      setSyncMessage(res.data.message);
      loadOrders();
      loadStats();
    } catch (e) {
      setSyncMessage('Failed: ' + (e.response?.data?.error || e.message));
    }
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete customer?')) return;
    await axios.delete(`/api/customers/${id}`);
    loadCustomers();
    loadStats();
  }

  async function updateOrderStatus(id, status) {
    await axios.put(`/api/orders/${id}`, { status });
    loadOrders();
    loadStats();
  }

  async function updateCommStatus(id, status) {
    await axios.put(`/api/communications/${id}`, { status });
    loadCommunications();
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <span className="material-icons">notifications</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <span className="material-icons">settings</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="material-icons text-sm text-gray-600">person</span>
              </div>
              <span className="text-sm font-medium text-gray-700">PRO</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">WooCommerce Intelligence</h1>
                <p className="text-gray-500">Real-time performance metrics for ExecutiveCRM</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <span className="material-icons text-sm">download</span>
                  Download Report
                </button>
                <button onClick={syncOrders} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <span className="material-icons text-sm">sync</span>
                  Refresh Data
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-icons text-blue-500">payments</span>
                    <span className="text-green-500 text-sm font-medium">↑ 12.5%</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹{(stats.totalOrders * 5999 || 0).toLocaleString('en-IN')}</p>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-icons text-green-500">group</span>
                    <span className="text-green-500 text-sm font-medium">↑ 4.2%</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers || 0}</p>
                  <p className="text-sm text-gray-500">Active Customers</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-icons text-purple-500">shopping_bag</span>
                    <span className="text-red-500 text-sm font-medium">↓ 1.8%</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
                  <p className="text-sm text-gray-500">New Orders</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-icons text-yellow-500">analytics</span>
                    <span className="text-green-500 text-sm font-medium">↑ 8.4%</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹5,999</p>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl border border-gray-200 mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                  <a href="/dashboard?tab=orders" className="text-sm text-blue-600 hover:underline">View All Orders</a>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.slice(0, 5).map(o => (
                      <tr key={o._id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{o.customer?.firstName} {o.customer?.lastName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">#{o.orderNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-blue-600">person_add</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add New Customer</p>
                    <p className="text-sm text-gray-500">Create a manual record</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-green-600">add_shopping_cart</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Draft New Order</p>
                    <p className="text-sm text-gray-500">Quick draft for invoice</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-purple-600">campaign</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Blast Campaign</p>
                    <p className="text-sm text-gray-500">Target recent customers</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                <p className="text-gray-500">Manage relationships and track lifetime value across your enterprise.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <span className="material-icons text-sm">ios_share</span>
                  Export CSV
                </button>
                <button onClick={syncCustomers} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  <span className="material-icons text-sm">sync</span>
                  Sync WooCommerce
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>Filter by Status</option>
                  <option>Active</option>
                  <option>Lead</option>
                  <option>Inactive</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>All Regions</option>
                  <option>North America</option>
                  <option>Europe</option>
                  <option>Asia Pacific</option>
                </select>
              </div>

              {/* Customer Table */}
              <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.map(c => (
                      <tr key={c._id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">{c.firstName?.[0]}{c.lastName?.[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-gray-500">UID: {c.wooCustomerId || c._id.slice(-6)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{c.email}</p>
                          <p className="text-xs text-gray-500">{c.address || c.company}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{orders.filter(o => o.customer?._id === c._id).length}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'customer' ? 'bg-green-100 text-green-700' : c.status === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          {role === 'admin' && (
                            <button onClick={() => deleteCustomer(c._id)} className="text-red-500 hover:text-red-700">
                              <span className="material-icons text-sm">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Order Pipeline</h1>
                <p className="text-gray-500">Manage your global fulfillment logistics with real-time WooCommerce sync.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Total Revenue (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)).toLocaleString('en-IN')}</p>
                  <p className="text-sm text-green-500">+14.2%</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Processing Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'processing').length}</p>
                  <p className="text-sm text-gray-400">{stats.pendingOrders || 0} flagged for review</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Pending Sync</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders || 0}</p>
                  <p className="text-sm text-gray-400">Updated just now</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-sm text-green-500">Target: all delivered</p>
                </div>
              </div>

              {/* Order Columns */}
              <div className="grid grid-cols-4 gap-4">
                {['pending', 'processing', 'shipped', 'delivered'].map(status => (
                  <div key={status} className="bg-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-700 capitalize">{status}</h3>
                      <span className="text-sm text-gray-500">{orders.filter(o => o.status === status).length}</span>
                    </div>
                    <div className="space-y-3">
                      {orders.filter(o => o.status === status).slice(0, 3).map(o => (
                        <div key={o._id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-gray-500">#{o.orderNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {o.paymentStatus?.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{o.customer?.firstName} {o.customer?.lastName}</p>
                          <p className="text-sm font-bold text-gray-900 mt-2">₹{o.totalAmount?.toLocaleString('en-IN')}</p>
                          {role === 'admin' && status !== 'delivered' && (
                            <button
                              onClick={() => {
                                const next = { pending: 'processing', processing: 'shipped', shipped: 'delivered' }[status];
                                updateOrderStatus(o._id, next);
                              }}
                              className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                              Move to {status === 'pending' ? 'Processing' : status === 'processing' ? 'Shipped' : 'Delivered'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Communication Workflows</h1>
                <p className="text-gray-500">Orchestrate your customer journey with intelligent automation.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Total Communications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalComms || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Open</p>
                  <p className="text-2xl font-bold text-gray-900">{communications.filter(c => c.status === 'open').length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900">{communications.filter(c => c.status === 'resolved').length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Closed</p>
                  <p className="text-2xl font-bold text-gray-900">{communications.filter(c => c.status === 'closed').length}</p>
                </div>
              </div>

              {/* Communications List */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Recent Communications</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {communications.map(c => (
                    <div key={c._id} className="px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.type === 'call' ? 'bg-blue-100' : c.type === 'email' ? 'bg-green-100' : 'bg-purple-100'}`}>
                          <span className={`material-icons text-sm ${c.type === 'call' ? 'text-blue-600' : c.type === 'email' ? 'text-green-600' : 'text-purple-600'}`}>
                            {c.type === 'call' ? 'phone' : c.type === 'email' ? 'email' : 'event'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.subject}</p>
                          <p className="text-sm text-gray-500">{c.customer?.firstName} {c.customer?.lastName} • {c.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'open' ? 'bg-yellow-100 text-yellow-700' : c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                        {c.status === 'open' && (
                          <button onClick={() => updateCommStatus(c._id, 'resolved')} className="text-sm text-blue-600 hover:underline">Resolve</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
