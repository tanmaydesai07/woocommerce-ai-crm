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
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCommForm, setShowCommForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '', address: '', status: 'lead' });
  const [orderForm, setOrderForm] = useState({ customer: '', orderNumber: '', totalAmount: '', status: 'pending', paymentStatus: 'pending', notes: '' });
  const [commForm, setCommForm] = useState({ customer: '', type: 'call', subject: '', notes: '', status: 'open', followUpDate: '' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
  const [selectedCustomerComms, setSelectedCustomerComms] = useState([]);
  const [customerModalLoading, setCustomerModalLoading] = useState(false);
  const [customerModalError, setCustomerModalError] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductOrder, setSelectedProductOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [aiAssistForm, setAiAssistForm] = useState({
    customerId: '',
    orderId: '',
    goal: 'Improve customer retention and close unresolved communication loops.'
  });
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Filtered data based on search and filters
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchQuery || 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);
    
    const matchesStatus = !statusFilter || c.status === statusFilter;
    
    const matchesRegion = !regionFilter || 
      c.address?.toLowerCase().includes(regionFilter.toLowerCase()) ||
      c.company?.toLowerCase().includes(regionFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    o.orderNumber?.includes(searchQuery) ||
    `${o.customer?.firstName} ${o.customer?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.totalAmount?.toString().includes(searchQuery)
  );

  const filteredCommunications = communications.filter(c =>
    !searchQuery ||
    c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${c.customer?.firstName} ${c.customer?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function loadStats() {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }

  async function loadOrders() {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }

  async function loadCommunications() {
    try {
      const res = await axios.get('/api/communications');
      setCommunications(res.data);
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  }

  async function checkWooStatus() {
    try {
      const res = await axios.get('/api/woocommerce/status');
      setWooStatus(res.data);
    } catch (error) {
      console.error('Failed to check WooCommerce status:', error);
      setWooStatus({ connected: false, message: 'Status check failed' });
    }
  }

  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await axios.get('/api/me');
        setRole(res.data.role);
        loadStats();
        loadCustomers();
        loadOrders();
        loadCommunications();
        checkWooStatus();
      } catch (error) {
        console.error('Session check failed:', error);
        navigate('/');
      }
    }

    void initDashboard();
  }, [navigate]);

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
    try {
      await axios.delete(`/api/customers/${id}`);
      loadCustomers();
      loadStats();
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/');
        return;
      }
      alert(error.response?.data?.error || 'Error deleting customer');
    }
  }

  async function addCustomer(e) {
    e.preventDefault();
    try {
      await axios.post('/api/customers', customerForm);
      setCustomerForm({ firstName: '', lastName: '', email: '', phone: '', company: '', address: '', status: 'lead' });
      setShowCustomerForm(false);
      loadCustomers();
      loadStats();
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/');
        return;
      }
      alert(error.response?.data?.error || 'Error adding customer');
    }
  }

  async function addOrder(e) {
    e.preventDefault();
    try {
      await axios.post('/api/orders', orderForm);
      setOrderForm({ customer: '', orderNumber: '', totalAmount: '', status: 'pending', paymentStatus: 'pending', notes: '' });
      setShowOrderForm(false);
      loadOrders();
      loadStats();
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/');
        return;
      }
      alert(error.response?.data?.error || 'Error adding order');
    }
  }

  async function addCommunication(e) {
    e.preventDefault();
    try {
      const payload = {
        ...commForm,
        followUpDate: commForm.followUpDate || null
      };
      await axios.post('/api/communications', payload);
      setCommForm({ customer: '', type: 'call', subject: '', notes: '', status: 'open', followUpDate: '' });
      setShowCommForm(false);
      loadCommunications();
      loadStats();
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/');
        return;
      }
      alert(error.response?.data?.error || 'Error adding communication');
    }
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Address', 'Status', 'Created At'];
    const rows = customers.map(c => [
      `${c.firstName} ${c.lastName}`,
      c.email,
      c.phone || '',
      c.company || '',
      c.address || '',
      c.status,
      new Date(c.createdAt).toLocaleDateString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    const report = `CRM REPORT - ${new Date().toLocaleDateString()}
========================================

STATISTICS
----------
Total Customers: ${stats.totalCustomers || 0}
Total Orders: ${stats.totalOrders || 0}
Total Revenue: ₹${(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)).toLocaleString('en-IN')}
Pending Orders: ${orders.filter(o => o.status === 'pending').length}
Processing Orders: ${orders.filter(o => o.status === 'processing').length}
Completed Orders: ${orders.filter(o => o.status === 'delivered').length}
Total Communications: ${stats.totalComms || 0}

TOP CUSTOMERS
-------------
${customers.slice(0, 5).map((c, i) => `${i+1}. ${c.firstName} ${c.lastName} - ${c.email} - ${c.status}`).join('\n')}

RECENT ORDERS
-------------
${orders.slice(0, 5).map(o => `#${o.orderNumber} - ${o.customer?.firstName} ${o.customer?.lastName} - ₹${o.totalAmount} - ${o.status}`).join('\n')}
`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function refreshData() {
    loadStats();
    loadCustomers();
    loadOrders();
    loadCommunications();
  }

  async function updateOrderStatus(id, status) {
    await axios.put(`/api/orders/${id}`, { status });
    loadOrders();
    loadStats();
  }

  async function updateCommStatus(id, status) {
    await axios.put(`/api/communications/${id}`, { status });
    loadCommunications();

    if (selectedCustomer?._id) {
      const customerComms = await axios.get(`/api/communications/customer/${selectedCustomer._id}`);
      setSelectedCustomerComms(customerComms.data);
    }
  }

  async function openCustomerModal(customerId) {
    try {
      setCustomerModalLoading(true);
      setCustomerModalError('');
      setShowCustomerModal(true);

      const [customerRes, orderRes, commRes] = await Promise.all([
        axios.get(`/api/customers/${customerId}`),
        axios.get(`/api/orders/customer/${customerId}`),
        axios.get(`/api/communications/customer/${customerId}`)
      ]);

      setSelectedCustomer(customerRes.data);
      setSelectedCustomerOrders(orderRes.data);
      setSelectedCustomerComms(commRes.data);
    } catch (error) {
      setCustomerModalError(error.response?.data?.error || 'Failed to load customer details');
    } finally {
      setCustomerModalLoading(false);
    }
  }

  function closeCustomerModal() {
    setShowCustomerModal(false);
    setSelectedCustomer(null);
    setSelectedCustomerOrders([]);
    setSelectedCustomerComms([]);
    setCustomerModalError('');
  }

  function openProductModal(product, order) {
    setSelectedProduct(product);
    setSelectedProductOrder(order);
    setShowProductModal(true);
  }

  function closeProductModal() {
    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedProductOrder(null);
  }

  function openOrderModal(order) {
    setSelectedOrder(order);
    setShowOrderModal(true);
  }

  function closeOrderModal() {
    setShowOrderModal(false);
    setSelectedOrder(null);
  }

  async function generateAiSuggestion() {
    try {
      setAiLoading(true);
      setAiError('');
      const res = await axios.post('/api/ai/suggest', aiAssistForm);
      setAiSuggestion(res.data);

      if (!aiAssistForm.customerId && res.data.customerId) {
        setAiAssistForm(prev => ({ ...prev, customerId: String(res.data.customerId) }));
      }
      if (!aiAssistForm.orderId && res.data.orderId) {
        setAiAssistForm(prev => ({ ...prev, orderId: String(res.data.orderId) }));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setAiError('Session expired. Please login again.');
        navigate('/');
        return;
      }
      setAiError(error.response?.data?.error || 'Unable to generate AI suggestion right now.');
    } finally {
      setAiLoading(false);
    }
  }

  function useAiDraftInCommunication() {
    if (!aiSuggestion?.draftMessage) return;

    setShowCommForm(true);
    setCommForm(prev => ({
      ...prev,
      customer: aiAssistForm.customerId || String(aiSuggestion.customerId || prev.customer || ''),
      type: aiSuggestion.recommendedType || 'email',
      subject: aiSuggestion.nextAction ? `AI: ${aiSuggestion.nextAction}` : prev.subject,
      notes: aiSuggestion.draftMessage,
      status: 'follow-up',
      followUpDate: aiSuggestion.followUpDate || prev.followUpDate
    }));
  }

  const aiOrdersForSelection = aiAssistForm.customerId
    ? orders.filter(o => o.customer?._id === aiAssistForm.customerId)
    : orders;

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          {(wooStatus || syncMessage) && (
            <div className="mb-6 space-y-2">
              {wooStatus && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${wooStatus.connected ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  WooCommerce: {wooStatus.connected ? `Connected to ${wooStatus.url || 'store'}` : wooStatus.message || 'Not connected'}
                </div>
              )}
              {syncMessage && (
                <div className="px-4 py-3 rounded-lg text-sm border bg-blue-50 text-blue-800 border-blue-200">
                  Sync status: {syncMessage}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">WooCommerce Intelligence</h1>
                <p className="text-gray-500">Real-time performance metrics for ExecutiveCRM</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <span className="material-icons text-sm">download</span>
                  Download Report
                </button>
                <button onClick={refreshData} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.slice(0, 5).map(o => (
                      <tr key={o._id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{o.customer?.firstName} {o.customer?.lastName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <button
                            onClick={() => openOrderModal(o)}
                            className="font-mono text-blue-600 hover:underline"
                          >
                            #{o.orderNumber}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          {o.products?.length ? (
                            <button
                              onClick={() => openProductModal(o.products[0], o)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {o.products[0].name}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No product</span>
                          )}
                        </td>
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
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <span className="material-icons text-sm">ios_share</span>
                  Export CSV
                </button>
                <button onClick={() => setShowCustomerForm(!showCustomerForm)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 cursor-pointer">
                  <span className="material-icons text-sm">person_add</span>
                  Add Customer
                </button>
                <button onClick={syncCustomers} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <span className="material-icons text-sm">sync</span>
                  Sync WooCommerce
                </button>
              </div>

              {/* Add Customer Form */}
              {showCustomerForm && (
                <form onSubmit={addCustomer} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Add New Customer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" value={customerForm.firstName} onChange={e => setCustomerForm({...customerForm, firstName: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required />
                    <input type="text" placeholder="Last Name" value={customerForm.lastName} onChange={e => setCustomerForm({...customerForm, lastName: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required />
                    <input type="email" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required />
                    <input type="text" placeholder="Phone" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" />
                    <input type="text" placeholder="Company" value={customerForm.company} onChange={e => setCustomerForm({...customerForm, company: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" />
                    <input type="text" placeholder="Address" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" />
                    <select value={customerForm.status} onChange={e => setCustomerForm({...customerForm, status: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="lead">Lead</option>
                      <option value="prospect">Prospect</option>
                      <option value="customer">Customer</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Save Customer</button>
                    <button type="button" onClick={() => setShowCustomerForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="customer">Customer</option>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select 
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
                >
                  <option value="">All Regions</option>
                  <option value="mumbai">Mumbai</option>
                  <option value="bangalore">Bangalore</option>
                  <option value="delhi">Delhi</option>
                  <option value="hyderabad">Hyderabad</option>
                  <option value="chennai">Chennai</option>
                  <option value="pune">Pune</option>
                </select>
                {(statusFilter || regionFilter) && (
                  <button 
                    onClick={() => { setStatusFilter(''); setRegionFilter(''); }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
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
                    {filteredCustomers.map(c => (
                      <tr key={c._id} className="cursor-pointer hover:bg-gray-50" onClick={() => openCustomerModal(c._id)}>
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
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openCustomerModal(c._id); }} className="text-blue-600 hover:text-blue-800" title="View details">
                              <span className="material-icons text-sm">visibility</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteCustomer(c._id); }} className="text-red-500 hover:text-red-700" title="Delete customer">
                              <span className="material-icons text-sm">delete</span>
                            </button>
                          </div>
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

              {/* Add Order Button */}
              <div className="flex gap-3 mb-6">
                <button onClick={() => setShowOrderForm(!showOrderForm)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 cursor-pointer">
                  <span className="material-icons text-sm">add_shopping_cart</span>
                  New Order
                </button>
              </div>

              {/* Add Order Form */}
              {showOrderForm && (
                <form onSubmit={addOrder} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Create New Order</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={orderForm.customer} onChange={e => setOrderForm({...orderForm, customer: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                    <input type="text" placeholder="Order Number" value={orderForm.orderNumber} onChange={e => setOrderForm({...orderForm, orderNumber: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required />
                    <input type="number" placeholder="Total Amount (₹)" value={orderForm.totalAmount} onChange={e => setOrderForm({...orderForm, totalAmount: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required />
                    <select value={orderForm.status} onChange={e => setOrderForm({...orderForm, status: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <select value={orderForm.paymentStatus} onChange={e => setOrderForm({...orderForm, paymentStatus: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                    <textarea placeholder="Notes" value={orderForm.notes} onChange={e => setOrderForm({...orderForm, notes: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg col-span-2" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Create Order</button>
                    <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}

              {/* Order Columns */}
              <div className="grid grid-cols-4 gap-4">
                {['pending', 'processing', 'shipped', 'delivered'].map(status => (
                  <div key={status} className="bg-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-700 capitalize">{status}</h3>
                      <span className="text-sm text-gray-500">{filteredOrders.filter(o => o.status === status).length}</span>
                    </div>
                    <div className="space-y-3">
                      {filteredOrders.filter(o => o.status === status).slice(0, 3).map(o => (
                        <div key={o._id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <button
                              onClick={() => openOrderModal(o)}
                              className="text-xs font-mono text-blue-600 hover:underline"
                            >
                              #{o.orderNumber}
                            </button>
                            <span className={`text-xs px-2 py-0.5 rounded ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {o.paymentStatus?.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{o.customer?.firstName} {o.customer?.lastName}</p>
                          <p className="text-sm font-bold text-gray-900 mt-2">₹{o.totalAmount?.toLocaleString('en-IN')}</p>
                          {o.products?.length > 0 && (
                            <button
                              onClick={() => openProductModal(o.products[0], o)}
                              className="mt-2 block text-xs text-indigo-600 hover:underline"
                            >
                              View Product: {o.products[0].name}
                            </button>
                          )}
                          {status !== 'delivered' && (
                            <button
                              onClick={() => {
                                const next = { pending: 'processing', processing: 'shipped', shipped: 'delivered' }[status];
                                updateOrderStatus(o._id, next);
                              }}
                              className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
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

              {/* AI Assistant */}
              <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-emerald-50 to-cyan-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-gray-900">AI Agent Assistant</h2>
                      <p className="text-sm text-gray-600">Generate next best action and communication draft using Gemini.</p>
                    </div>
                    {aiSuggestion?.source && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${aiSuggestion.source === 'gemini' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        Source: {aiSuggestion.source}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={aiAssistForm.customerId}
                      onChange={(e) => setAiAssistForm(prev => ({ ...prev, customerId: e.target.value, orderId: '' }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Auto-pick customer</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>

                    <select
                      value={aiAssistForm.orderId}
                      onChange={(e) => setAiAssistForm(prev => ({ ...prev, orderId: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Auto-pick recent order</option>
                      {aiOrdersForSelection.map(o => (
                        <option key={o._id} value={o._id}>#{o.orderNumber} • {o.status}</option>
                      ))}
                    </select>

                    <button
                      onClick={generateAiSuggestion}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-60"
                    >
                      {aiLoading ? 'Generating...' : 'Generate AI Suggestion'}
                    </button>
                  </div>

                  <textarea
                    value={aiAssistForm.goal}
                    onChange={(e) => setAiAssistForm(prev => ({ ...prev, goal: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="What should AI optimize for?"
                  />

                  {aiError && (
                    <div className="px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
                      {aiError}
                    </div>
                  )}

                  {aiSuggestion && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Next Best Action</p>
                          <p className="font-medium text-gray-900">{aiSuggestion.nextAction}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Priority</p>
                          <p className="font-medium text-gray-900 capitalize">{aiSuggestion.priority}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Follow-Up Date</p>
                          <p className="font-medium text-gray-900">{aiSuggestion.followUpDate || '-'}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase">Reason</p>
                        <p className="text-sm text-gray-700">{aiSuggestion.reason}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase">Draft Message</p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3 mt-1">{aiSuggestion.draftMessage}</pre>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={useAiDraftInCommunication}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Use As Communication Draft
                        </button>
                        <button
                          onClick={generateAiSuggestion}
                          disabled={aiLoading}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-60"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Communication Button */}
              <div className="flex gap-3 mb-6">
                <button onClick={() => setShowCommForm(!showCommForm)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 cursor-pointer">
                  <span className="material-icons text-sm">add</span>
                  Log Communication
                </button>
              </div>

              {/* Add Communication Form */}
              {showCommForm && (
                <form onSubmit={addCommunication} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Log New Communication</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={commForm.customer} onChange={e => setCommForm({...commForm, customer: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                    <select value={commForm.type} onChange={e => setCommForm({...commForm, type: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                      <option value="support">Support</option>
                    </select>
                    <input type="text" placeholder="Subject" value={commForm.subject} onChange={e => setCommForm({...commForm, subject: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg col-span-2" required />
                    <textarea placeholder="Notes / Details" value={commForm.notes} onChange={e => setCommForm({...commForm, notes: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg col-span-2" required />
                    <select value={commForm.status} onChange={e => setCommForm({...commForm, status: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="open">Open</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <input type="date" value={commForm.followUpDate} onChange={e => setCommForm({...commForm, followUpDate: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Save Communication</button>
                    <button type="button" onClick={() => setShowCommForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}

              {/* Communications List */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Recent Communications</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {filteredCommunications.map(c => (
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

        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCustomerModal}>
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
                <button onClick={closeCustomerModal} className="text-gray-500 hover:text-gray-700">
                  <span className="material-icons">close</span>
                </button>
              </div>

              {customerModalLoading && (
                <div className="px-6 py-8 text-gray-600">Loading customer details...</div>
              )}

              {!customerModalLoading && customerModalError && (
                <div className="px-6 py-8 text-red-600">{customerModalError}</div>
              )}

              {!customerModalLoading && !customerModalError && selectedCustomer && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Name</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Status</p>
                      <p className="font-medium text-gray-900 capitalize">{selectedCustomer.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Email</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Phone</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Company</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.company || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Address</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.address || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Orders ({selectedCustomerOrders.length})</h3>
                    {selectedCustomerOrders.length === 0 ? (
                      <p className="text-sm text-gray-500">No orders found for this customer.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCustomerOrders.map((o) => (
                          <div key={o._id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Order #{o.orderNumber}</p>
                              <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                              {o.products?.length > 0 && (
                                <button
                                  onClick={() => openProductModal(o.products[0], o)}
                                  className="text-xs text-indigo-600 hover:underline mt-1"
                                >
                                  View Product: {o.products[0].name}
                                </button>
                              )}
                              <button
                                onClick={() => openOrderModal(o)}
                                className="block text-xs text-blue-600 hover:underline mt-1"
                              >
                                View Order Details
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">₹{o.totalAmount?.toLocaleString('en-IN') || 0}</p>
                              <p className="text-xs text-gray-500 capitalize">{o.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Communications ({selectedCustomerComms.length})</h3>
                    {selectedCustomerComms.length === 0 ? (
                      <p className="text-sm text-gray-500">No communication history yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCustomerComms.map((comm) => (
                          <div key={comm._id} className="border border-gray-200 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{comm.subject}</p>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{comm.status}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Type: {comm.type}</p>
                            <p className="text-sm text-gray-700 mt-2">{comm.notes}</p>
                            {comm.followUpDate && (
                              <p className="text-xs text-gray-500 mt-2">Follow-up: {new Date(comm.followUpDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeProductModal}>
            <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
                <button onClick={closeProductModal} className="text-gray-500 hover:text-gray-700">
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Product Name</p>
                    <p className="font-medium text-gray-900">{selectedProduct.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order Number</p>
                    <p className="font-medium text-gray-900">#{selectedProductOrder?.orderNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Unit Price</p>
                    <p className="font-medium text-gray-900">₹{Number(selectedProduct.price || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Quantity</p>
                    <p className="font-medium text-gray-900">{selectedProduct.quantity || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Line Total</p>
                    <p className="font-semibold text-gray-900">
                      ₹{(Number(selectedProduct.price || 0) * Number(selectedProduct.quantity || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order Status</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedProductOrder?.status || '-'}</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase mb-2">Customer</p>
                  <p className="font-medium text-gray-900">
                    {selectedProductOrder?.customer?.firstName || '-'} {selectedProductOrder?.customer?.lastName || ''}
                  </p>
                </div>

                <div className="flex justify-end">
                  {selectedProductOrder && (
                    <button
                      onClick={() => {
                        closeProductModal();
                        openOrderModal(selectedProductOrder);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 mr-2"
                    >
                      Open Order
                    </button>
                  )}
                  <button onClick={closeProductModal} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeOrderModal}>
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
                <button onClick={closeOrderModal} className="text-gray-500 hover:text-gray-700">
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order Number</p>
                    <p className="font-medium text-gray-900">#{selectedOrder.orderNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total Amount</p>
                    <p className="font-semibold text-gray-900">₹{Number(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order Status</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedOrder.status || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Payment Status</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedOrder.paymentStatus || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Created On</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Updated On</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase mb-2">Customer</p>
                  <p className="font-medium text-gray-900">
                    {selectedOrder.customer?.firstName || '-'} {selectedOrder.customer?.lastName || ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{selectedOrder.customer?.email || '-'}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Products ({selectedOrder.products?.length || 0})</h3>
                  {!selectedOrder.products?.length ? (
                    <p className="text-sm text-gray-500">No products available for this order.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrder.products.map((product, index) => (
                        <div key={`${product.name || 'product'}-${index}`} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name || '-'}</p>
                            <p className="text-xs text-gray-500">Qty: {product.quantity || 0}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">₹{Number(product.price || 0).toLocaleString('en-IN')}</p>
                            <button
                              onClick={() => openProductModal(product, selectedOrder)}
                              className="text-xs text-indigo-600 hover:underline mt-1"
                            >
                              View Product Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Notes</p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700">
                    {selectedOrder.notes || 'No notes added for this order.'}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={closeOrderModal} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
