import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Railway live backend URL ba .env theke load korbe
const API_BASE = import.meta.env.VITE_API_URL || 'https://hasanjim-e-commerce-production.up.railway.app';

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hj_cart')) || [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('hj_user')) || null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const [newProduct, setNewProduct] = useState({ title: '', category: 'ELECTRONICS', price: '', image: '', description: '', badge: 'NEW' });

  const [paymentMethod, setPaymentMethod] = useState('Credit / Debit Card (Stripe)');
  const [trackingInput, setTrackingInput] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (currentUser) fetchWishlist();
  }, [selectedCategory, searchTerm, sortOption, currentUser]);

  useEffect(() => {
    localStorage.setItem('hj_cart', JSON.stringify(cart));
  }, [cart]);

  const getAuthHeader = () => {
    const token = localStorage.getItem('hj_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/products`, {
        params: { category: selectedCategory, search: searchTerm, sort: sortOption }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products. Please refresh.');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories.');
    }
  };

  const fetchWishlist = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/wishlist`, getAuthHeader());
      setWishlist(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!currentUser) return toast.error('Please login to save items to wishlist!');
    try {
      const res = await axios.post(`${API_BASE}/api/wishlist/toggle`, { productId }, getAuthHeader());
      if (res.data.added) {
        toast.success('Added to Wishlist! ❤️');
      } else {
        toast('Removed from Wishlist', { icon: '💔' });
      }
      fetchWishlist();
    } catch (err) {
      toast.error('Failed to update wishlist');
    }
  };

  const openProductDetails = async (product) => {
    setSelectedProduct(product);
    try {
      const res = await axios.get(`${API_BASE}/api/products/${product.id}/reviews`);
      setProductReviews(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!currentUser) return toast.error('Please login to post a review');
    try {
      await axios.post(`${API_BASE}/api/products/${selectedProduct.id}/reviews`, reviewForm, getAuthHeader());
      toast.success('Review posted successfully!');
      setReviewForm({ rating: 5, comment: '' });
      openProductDetails(selectedProduct);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post review');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await axios.post(`${API_BASE}${endpoint}`, authForm);
      localStorage.setItem('hj_user', JSON.stringify(res.data.user));
      localStorage.setItem('hj_token', res.data.token);
      setCurrentUser(res.data.user);
      setIsAuthOpen(false);
      toast.success(authMode === 'login' ? 'Successfully logged in!' : 'Account registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hj_user');
    localStorage.removeItem('hj_token');
    setCurrentUser(null);
    setWishlist([]);
    toast.success('Logged out successfully');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/products`, newProduct, getAuthHeader());
      toast.success('Product added successfully!');
      setIsAdminOpen(false);
      fetchProducts();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add product');
    }
  };

  const handleDeleteProduct = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/products/${id}`, getAuthHeader());
      toast.success('Product deleted!');
      fetchProducts();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const addToCart = (product, e) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.title} added to cart! 🛒`);
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      const res = await axios.post(`${API_BASE}/api/checkout`, {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: formData.address,
        paymentMethod,
        cartItems: cart,
        totalAmount
      });
      setOrderSuccess(res.data.trackingNumber);
      setCart([]);
      setIsCheckoutOpen(false);
      toast.success('Order placed successfully! 🎉');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed!');
    }
  };

  const trackOrder = async () => {
    if (!trackingInput) return;
    try {
      const res = await axios.get(`${API_BASE}/api/orders/track/${trackingInput.trim()}`);
      setTrackedOrder(res.data);
      toast.success('Order tracking details fetched');
    } catch (err) {
      toast.error('Invalid tracking code!');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="bg-[#0b0f19] text-slate-100 font-sans min-h-screen">
      <Toaster position="top-right" reverseOrder={false} />

      {/* ANNOUNCEMENT */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-xs py-2 px-4 text-center border-b border-purple-500/20 text-purple-200 font-medium">
        ✨ Free Express Shipping on Orders Over $200 | Code: <span className="text-white font-bold underline">LUXURY2026</span>
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0f19]/80 border-b border-slate-800/80 px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/30">
              HJ
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                HASAN JIM
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-purple-400 -mt-1">
                Luxury Store
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-lg relative hidden md:block">
            <input
              type="text"
              placeholder="Search luxury tech, fashion, gear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/60 rounded-full px-5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-300">Hi, {currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <button onClick={() => setIsAdminOpen(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    + Add Item
                  </button>
                )}
                <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline ml-1">Logout</button>
              </div>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200">
                Sign In
              </button>
            )}

            <button onClick={() => setIsWishlistOpen(true)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-rose-400">
              ❤️ ({wishlist.length})
            </button>

            <button onClick={() => setIsTrackingOpen(true)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300">
              📦 Track Order
            </button>

            <button onClick={() => setIsCartOpen(true)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
              🛒 Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative overflow-hidden my-6 max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-slate-900/80 border border-purple-500/20 rounded-3xl p-8 lg:p-12 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30 mb-4 inline-block">NEW ARRIVALS 2026</span>
            <h2 className="text-3xl lg:text-5xl font-black text-white leading-tight">Crafted For Distinction. Designed For Power.</h2>
            <p className="text-slate-400 text-xs mt-3">Explore handpicked premium electronics, minimalist leather craftsmanship, and high-performance lifestyle items.</p>
          </div>
        </div>
      </section>

      {/* MAIN PRODUCTS GRID */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-4 border-b border-slate-800">
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-xl text-xs font-bold ${selectedCategory === 'All' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'}`}>
              All Collection
            </button>
            {categories.map((c) => (
              <button key={c.category} onClick={() => setSelectedCategory(c.category)} className={`px-4 py-2 rounded-xl text-xs font-bold ${selectedCategory === c.category ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'}`}>
                {c.category} ({c.count})
              </button>
            ))}
          </div>

          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-4 py-2">
            <option value="newest">Newest Arrivals</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {/* PRODUCT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => {
            const isWishlisted = wishlist.some((item) => item.id === p.id);
            const outOfStock = p.stock !== undefined && p.stock <= 0;
            return (
              <div key={p.id} onClick={() => openProductDetails(p)} className="group bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition cursor-pointer relative">
                <div className="aspect-[4/3] bg-slate-950 relative overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" />

                  <button onClick={(e) => toggleWishlist(p.id, e)} className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-full border border-slate-700/60 hover:scale-110 transition">
                    {isWishlisted ? '❤️' : '🤍'}
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button onClick={(e) => handleDeleteProduct(p.id, e)} className="absolute top-2 right-2 bg-red-600/80 text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-red-600">
                      Delete
                    </button>
                  )}

                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-xs font-black text-red-400 border border-red-400 px-3 py-1 rounded-full">OUT OF STOCK</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{p.category}</span>
                  <h3 className="font-bold text-slate-100 text-sm truncate">{p.title}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-base font-black text-green-400">${p.price}</span>
                    <button
                      disabled={outOfStock}
                      onClick={(e) => addToCart(p, e)}
                      className="bg-slate-800 hover:bg-purple-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* WISHLIST DRAWER */}
      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h2 className="text-lg font-extrabold text-white">❤️ Your Wishlist</h2>
              <button onClick={() => setIsWishlistOpen(false)} className="text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {wishlist.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">Wishlist is empty.</p> : wishlist.map((item) => (
                <div key={item.id} className="flex gap-4 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-white truncate">{item.title}</h4>
                    <span className="text-xs font-bold text-green-400">${item.price}</span>
                  </div>
                  <button onClick={() => addToCart(item)} className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold">
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-slate-400 text-lg">✕</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-64 object-cover rounded-2xl border border-slate-800" />
              <div>
                <span className="text-xs font-bold text-purple-400">{selectedProduct.category}</span>
                <h2 className="text-xl font-black text-white mt-1">{selectedProduct.title}</h2>
                <div className="text-2xl font-black text-green-400 my-2">${selectedProduct.price}</div>
                <p className="text-xs text-slate-400 mb-4">{selectedProduct.description || 'Crafted with premium quality materials.'}</p>
                <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-bold">
                  Add To Cart
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4">Customer Reviews</h3>
              <form onSubmit={handleAddReview} className="mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300">Rating:</label>
                  <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-2 py-1 text-white">
                    <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ (4/5)</option>
                    <option value="3">⭐⭐⭐ (3/5)</option>
                  </select>
                </div>
                <textarea placeholder="Write your review..." required rows="2" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                <button type="submit" className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl font-bold">Submit Review</button>
              </form>

              <div className="space-y-3">
                {productReviews.length === 0 ? <p className="text-xs text-slate-500">No reviews yet.</p> : productReviews.map((r) => (
                  <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-purple-300">{r.user_name}</span>
                      <span className="text-amber-400">{'⭐'.repeat(r.rating)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-black text-white mb-4">Checkout & Payment Gateway</h2>
            <form onSubmit={handleCheckout} className="space-y-3">
              <input type="text" placeholder="Full Name" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <input type="email" placeholder="Email Address" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <input type="text" placeholder="Phone Number" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              <textarea placeholder="Shipping Address" required rows="2" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setFormData({ ...formData, address: e.target.value })} />

              <div className="pt-2">
                <label className="text-xs text-slate-300 font-bold block mb-2">Select Payment Method:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Card (Stripe)', 'bKash / Nagad', 'Cash on Delivery'].map((method) => (
                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-2 rounded-xl text-[11px] font-bold border ${paymentMethod === method ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl text-xs font-black mt-4">
                Confirm & Pay (${cartTotal.toFixed(2)})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {isTrackingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative">
            <button onClick={() => { setIsTrackingOpen(false); setTrackedOrder(null); }} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h2 className="text-lg font-black text-white mb-4">Track Order</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Tracking No. (e.g., HJ-123456)" value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" />
              <button onClick={trackOrder} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Search</button>
            </div>

            {trackedOrder && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                <p className="text-slate-300">Status: <span className="text-amber-400 font-bold">{trackedOrder.order.status}</span></p>
                <p className="text-slate-300">Customer: <span className="text-white font-bold">{trackedOrder.order.customer_name}</span></p>
                <p className="text-slate-300">Total: <span className="text-green-400 font-bold">${trackedOrder.order.total_amount}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h2 className="text-lg font-extrabold text-white">🛒 Shopping Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">Cart is empty.</p> : cart.map((item) => (
                <div key={item.id} className="flex gap-4 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-white truncate">{item.title}</h4>
                    <span className="text-xs font-bold text-green-400">${item.price}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-xs font-bold px-1">-</button>
                    <span className="text-xs font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-xs font-bold px-1">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex justify-between text-sm font-bold text-white">
                <span>Total:</span>
                <span className="text-green-400 text-lg">${cartTotal.toFixed(2)}</span>
              </div>
              <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-purple-600 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs">
                Proceed To Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <div className="flex gap-4 border-b border-slate-800 pb-3 mb-4">
              <button onClick={() => setAuthMode('login')} className={`text-xs font-bold ${authMode === 'login' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400'}`}>Sign In</button>
              <button onClick={() => setAuthMode('register')} className={`text-xs font-bold ${authMode === 'register' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400'}`}>Register</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <input type="text" placeholder="Full Name" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
              )}
              <input type="email" placeholder="Email Address" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
              <input type="password" placeholder="Password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-bold">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ADD ITEM */}
      {isAdminOpen && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative">
            <button onClick={() => setIsAdminOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h2 className="text-lg font-black text-white mb-4">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <input type="text" placeholder="Product Title" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
              <input type="text" placeholder="Category (ELECTRONICS / FASHION)" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value.toUpperCase() })} />
              <input type="number" placeholder="Price ($)" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
              <input type="text" placeholder="Image URL" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} />
              <textarea placeholder="Description" rows="2" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-xs font-bold">Add Product</button>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-black text-white">Order Placed!</h2>
            <p className="text-xs text-slate-400 mt-2">Your Tracking Code:</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-4 text-purple-400 font-mono font-bold text-lg">{orderSuccess}</div>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-purple-600 text-white py-2 rounded-xl text-xs font-bold">Close</button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 mt-16 py-8 text-center text-xs text-slate-500">
        © 2026 HASAN JIM Luxury Store. All rights reserved.
      </footer>
    </div>
  );
}