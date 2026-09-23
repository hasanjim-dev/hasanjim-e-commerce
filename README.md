# 🛍️ HASAN JIM — Luxury E-Commerce Store

A full-stack e-commerce web application built with the MySQL-powered MERN stack (React, Express, Node.js, MySQL). Features a complete shopping experience with authentication, cart, wishlist, reviews, order tracking, and a dedicated admin dashboard.

**Live Site:** [hasanjim-e-commerce-alpha.vercel.app](https://hasanjim-e-commerce-alpha.vercel.app)
**Backend API:** [hasanjim-e-commerce-production.up.railway.app](https://hasanjim-e-commerce-production.up.railway.app)

---

## ✨ Features

### Customer
- Browse products with category filtering, search, and sorting (newest / price low-high / high-low)
- Pagination with skeleton loading states
- Product details with customer reviews & ratings
- Add to cart with persistent storage (localStorage)
- Wishlist (requires login)
- User authentication (JWT-based register/login)
- Checkout with stock validation and multiple payment method selection
- Order tracking by tracking number
- Terms & Conditions, Privacy Policy, and Refund Policy pages

### Admin
- Role-based access control (separate `/admin` route, protected)
- Dashboard overview: total revenue, total orders, total products, low-stock alerts
- Product management: add / delete products
- Order management: view all orders, update order status (Processing → Shipped → Delivered / Cancelled)

### Security & Performance
- JWT authentication with role-based middleware
- Rate limiting on auth routes (brute-force protection)
- Helmet.js for secure HTTP headers
- Input validation on all write endpoints
- Database indexing on frequently queried columns
- SEO metadata, `robots.txt`, and `sitemap.xml`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router, Axios, react-hot-toast |
| Backend | Node.js, Express |
| Database | MySQL (mysql2) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Hosting | Vercel (frontend), Railway (backend + MySQL) |


---

## 📁 Project Structure
hasanjim-e-commerce/
├── backend/
│ ├── server.js # Express API server
│ ├── setup-db.js # Database schema setup script
│ ├── db.js # (legacy) DB connection config
│ └── package.json
└── forntend/
├── src/
│ ├── main.jsx # App entry + Router setup
│ ├── App.jsx # Route definitions
│ ├── Storefront.jsx # Customer-facing store UI
│ └── AdminDashboard.jsx # Admin panel UI
└── package.json


---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Node.js 18+
- A MySQL database (local or hosted)

### 1. Clone the repository
```bash
git clone https://github.com/hasanjim-dev/hasanjim-e-commerce.git
cd hasanjim-e-commerce
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
DB_PORT=3306
JWT_SECRET=a_long_random_secret_string
PORT=5000


Run the database setup script (creates all required tables):
```bash
node setup-db.js
```

Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd ../forntend
npm install
```

Create a `.env` file in `forntend/`:
VITE_API_URL=http://localhost:5000


Start the dev server:
```bash
npm run dev
```

---

## 🔑 Creating an Admin Account

1. Register a normal account through the site.
2. Run this SQL against your database:
```sql
   UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```
3. Log out and log back in — the "Admin Dashboard" link will appear in the navbar.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/products` | List products (paginated, filterable) | No |
| GET | `/api/categories` | Category list with counts | No |
| POST | `/api/checkout` | Place an order | No |
| GET | `/api/orders/track/:trackingNumber` | Track an order | No |
| GET | `/api/wishlist` | Get user's wishlist | Yes |
| POST | `/api/products/admin` | Add product | Yes (Admin) |
| GET | `/api/admin/stats` | Dashboard statistics | Yes (Admin) |
| GET | `/api/admin/orders` | List all orders | Yes (Admin) |
| PATCH | `/api/admin/orders/:id/status` | Update order status | Yes (Admin) |

---

## 🗺️ Roadmap / Future Improvements

- [ ] Real payment gateway integration (Stripe / bKash / Nagad)
- [ ] Order confirmation emails
- [ ] Product image upload (Cloudinary integration)
- [ ] Sentry error monitoring
- [ ] Custom domain

---

## 📄 License

This project is for personal/portfolio use.

---

## 👤 Author

**Muntasir Hasan Jim**
Portfolio: [muntasirhasanjim.vercel.app](https://muntasirhasanjim.vercel.app)
