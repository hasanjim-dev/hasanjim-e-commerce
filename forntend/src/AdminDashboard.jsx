import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://hasanjim-e-commerce-production.up.railway.app';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('hj_user')) || null;

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({ title: '', category: '', price: '', image: '', description: '', stock: '' });

  const getAuthHeader = () => {
    const token = localStorage.getItem('hj_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/');
      return;
    }
    fetchStats();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/stats`, getAuthHeader());
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load stats');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/products/all`, getAuthHeader());
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/orders`, getAuthHeader());
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/products`, newProduct, getAuthHeader());
      toast.success('Product added!');
      setNewProduct({ title: '', category: '', price: '', image: '', description: '', stock: '' });
      fetchProducts();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/products/${id}`, getAuthHeader());
      toast.success('Product deleted');
      fetchProducts();
      fetchStats();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`${API_BASE}/api/admin/orders/${orderId}/status`, { status }, getAuthHeader());
      toast.success('Order status updated');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null; // navigate() already redirected
  }

  return (
    <div className="bg-[#0b0f19] text-slate-100 font-sans min-h-screen">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-white">HASAN JIM — Admin Dashboard</span>
        </div>
        <Link to="/" className="text-xs text-purple-400 hover:text-purple-300 underline">← Back to Store</Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* TABS */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-2">
          {['overview', 'products', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-2">Total Revenue</p>
                <p className="text-2xl font-black text-green-400">${Number(stats.totalRevenue).toFixed(2)}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-2">Total Orders</p>
                <p className="text-2xl font-black text-white">{stats.totalOrders}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-2">Total Products</p>
                <p className="text-2xl font-black text-white">{stats.totalProducts}</p>
              </div>
            </div>

            {stats.lowStock.length > 0 && (
              <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-red-400 mb-3">⚠️ Low Stock Alert (≤5 units)</h3>
                <div className="space-y-2">
                  {stats.lowStock.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-slate-300 bg-slate-950 p-2 rounded-lg">
                      <span>{p.title}</span>
                      <span className="font-bold text-red-400">{p.stock} left</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Add New Product</h3>
                <form onSubmit={handleAddProduct} className="space-y-3">
                  <input type="text" placeholder="Title" required value={newProduct.title} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
                  <input type="text" placeholder="Category" required value={newProduct.category} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
                  <input type="number" placeholder="Price ($)" required value={newProduct.price} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                  <input type="number" placeholder="Stock" value={newProduct.stock} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
                  <input type="text" placeholder="Image URL" required value={newProduct.image} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} />
                  <textarea placeholder="Description" rows="2" value={newProduct.description} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                  <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-xs font-bold">Add Product</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="text-left p-3">Title</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-left p-3">Price</th>
                        <th className="text-left p-3">Stock</th>
                        <th className="text-left p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-t border-slate-800">
                          <td className="p-3 text-white font-semibold truncate max-w-[150px]">{p.title}</td>
                          <td className="p-3 text-purple-400">{p.category}</td>
                          <td className="p-3 text-green-400 font-bold">${p.price}</td>
                          <td className={`p-3 font-bold ${p.stock <= 5 ? 'text-red-400' : 'text-slate-300'}`}>{p.stock}</td>
                          <td className="p-3">
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="max-h-[700px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="text-left p-3">Tracking No.</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-800">
                      <td className="p-3 text-purple-400 font-mono">{o.tracking_number}</td>
                      <td className="p-3 text-white">{o.customer_name}</td>
                      <td className="p-3 text-green-400 font-bold">${o.total_amount}</td>
                      <td className="p-3">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 text-white"
                        >
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}