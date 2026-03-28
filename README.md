# ExecutiveCRM - WooCommerce CRM With AI Workflow Assistant

ExecutiveCRM is a full-stack CRM tailored for WooCommerce operations. It unifies customer records, order lifecycle tracking, communication workflows, and AI-assisted follow-up drafting in a single dashboard.

## Why This Project

Most teams split e-commerce data across store admin panels, spreadsheets, and messaging tools. This project centralizes those flows so sales, support, and operations can act quickly with shared context.

## Core Capabilities

- Customer management with status lifecycle (`lead`, `prospect`, `customer`, `inactive`)
- Kanban-style order pipeline (`pending` -> `processing` -> `shipped` -> `delivered`)
- Communication log with follow-up dates and status tracking
- WooCommerce integration:
  - Pull sync via REST API
  - Push updates via webhooks
  - Mock webhook endpoint for demo scenarios
- AI Agent Assistant in the Workflows tab:
  - Generates next-best action
  - Drafts customer follow-up text
  - Auto-fills communication form for fast execution
  - Falls back to built-in recommendation logic when external AI is unavailable

## Architecture

- Frontend: React + Vite + Tailwind CSS
- Backend: Express.js + MongoDB (Mongoose)
- Store Integration: WooCommerce REST + Webhooks
- AI Integration: Gemini `generateContent` API (server-side)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)

### Setup

```bash
npm install
cp .env.example .env
```

Then fill `.env` with your credentials.

### Run Locally

Terminal 1 (backend):

```bash
npm run server
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open the frontend URL shown by Vite in terminal output (usually `http://localhost:5173`, but it may auto-switch to another port like `5174` if occupied).

### Demo Credentials (Local Only)

Seeded on first backend run:

- Admin: `admin` / `admin123`
- User: `user` / `user123`

These credentials are for local demo only.

## Environment Variables

Use `.env.example` as a template.

- `MONGO_URI` (required)
- `SESSION_SECRET` (recommended)
- `WOO_URL` (optional, required for real Woo sync)
- `WOO_CONSUMER_KEY` (optional, required for real Woo sync)
- `WOO_CONSUMER_SECRET` (optional, required for real Woo sync)
- `GEMINI_API_KEY` (optional, enables live AI generation)
- `GEMINI_MODEL` (optional, defaults to `gemini-2.0-flash`)

## NPM Scripts

- `npm run dev` - start Vite frontend
- `npm run server` - start backend with nodemon
- `npm run start` - start backend (production-style)
- `npm run build` - build frontend
- `npm run lint` - run ESLint
- `npm test` - run tests

## API Overview

### Auth

- `POST /api/signup`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

### Customers

- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### Orders

- `GET /api/orders`
- `GET /api/orders/customer/:customerId`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`

### Communications

- `GET /api/communications`
- `GET /api/communications/customer/:customerId`
- `POST /api/communications`
- `PUT /api/communications/:id`
- `DELETE /api/communications/:id`

### WooCommerce

- `POST /api/woocommerce/sync-customers`
- `POST /api/woocommerce/sync-orders`
- `GET /api/woocommerce/status`

### AI

- `POST /api/ai/suggest`

### Webhooks

- `POST /api/webhooks/order`
- `POST /api/webhooks/customer`
- `POST /api/webhooks/test`

### Analytics

- `GET /api/stats`

## Project Structure

```
crm-woocommerce/
├── server.js
├── woocommerce.js
├── vite.config.js
├── package.json
├── .env.example
├── models/
│   ├── User.js
│   ├── Customer.js
│   ├── Order.js
│   └── Communication.js
├── tests/
│   ├── unit/
│   └── e2e/
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── components/
    │   └── Sidebar.jsx
    └── pages/
        ├── Login.jsx
        ├── Signup.jsx
        └── Dashboard.jsx
```

## Testing And Quality

- Lint: `npm run lint`
- Unit + integration-style checks: `npm test`

## Security And Production Notes

- `.env` is git-ignored; do not commit real credentials.
- Current authentication uses demo-grade seeded users and plain-text password matching.
- For production use, add password hashing, stricter session/cookie settings, and secret rotation.
- Rotate API keys immediately if they are exposed in commits, screenshots, or demos.

## Status

Built as a hackathon project and actively improved for production-style documentation and workflow quality.
