# ExecutiveCRM - WooCommerce Integration

A full-stack Customer Relationship Management system that integrates with WooCommerce for customer data management, order tracking, and communication workflows.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + MongoDB
- **WooCommerce:** REST API integration with webhook support

## Features

- **Customer Management:** CRUD operations, status tracking (lead/prospect/customer/inactive)
- **Order Tracking:** Kanban-style pipeline (pending → processing → shipped → delivered)
- **Communication Workflows:** Log calls, emails, meetings with follow-up dates
- **WooCommerce Integration:**
  - Pull-based sync via REST API
  - Push-based real-time updates via webhooks
  - Mock webhook test interface for demo
- **Dashboard Analytics:** Real-time statistics with Indian Rupee (₹) currency

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI
```

### Running the Application

**Terminal 1 - Backend API:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Default Login
- Admin: `admin` / `admin123`
- User: `user` / `user123`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/signup` - User registration (always creates user role)
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Communications
- `GET /api/communications` - List communications
- `POST /api/communications` - Create communication
- `PUT /api/communications/:id` - Update communication
- `DELETE /api/communications/:id` - Delete communication

### WooCommerce
- `POST /api/woocommerce/sync-customers` - Sync customers
- `POST /api/woocommerce/sync-orders` - Sync orders
- `GET /api/woocommerce/status` - Check connection

### Webhooks (Real-time)
- `POST /api/webhooks/order` - Receive order updates
- `POST /api/webhooks/customer` - Receive customer updates
- `POST /api/webhooks/test` - Test webhook (mock data)

### Analytics
- `GET /api/stats` - Dashboard statistics

## Project Structure

```
crm-woocommerce/
├── server.js              # Express API server
├── woocommerce.js         # WooCommerce service
├── vite.config.js         # Vite config with API proxy
├── package.json
├── .env                   # Environment variables (not in git)
├── models/
│   ├── User.js           # User model (admin/user roles)
│   ├── Customer.js       # Customer model
│   ├── Order.js          # Order model
│   └── Communication.js  # Communication model
└── src/
    ├── App.jsx           # React Router setup
    ├── main.jsx          # React entry point
    ├── index.css         # Tailwind CSS
    ├── pages/
    │   ├── Login.jsx     # Login page
    │   ├── Signup.jsx    # Signup page
    │   └── Dashboard.jsx # Main dashboard
    └── components/
        └── Sidebar.jsx   # Navigation sidebar
```

## WooCommerce Integration

### Method 1: REST API (Pull-based)
Configure WooCommerce API keys in `.env` to sync customers and orders.

### Method 2: Webhooks (Push-based, Real-time)
Configure WooCommerce webhooks to push updates to `/api/webhooks/order` and `/api/webhooks/customer`.

### Method 3: Mock Webhooks (Demo)
Use the test endpoint to simulate webhooks without a real WooCommerce store.

## Security Notes

- Signup always creates users with 'user' role (prevents privilege escalation)
- Session secret should be set via `SESSION_SECRET` environment variable
- `.env` is excluded from version control

---

Built for Kilowott Hack-AI-thon
